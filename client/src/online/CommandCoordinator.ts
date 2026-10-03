import type { QueryClient } from '@tanstack/react-query';
import {
  CommandRequestSchema,
  CreationRequestSchema,
  CommandResponseSchema,
  type OnlineCommand,
  type CommandResponseSchema as ResponseSchema,
} from '@rebirth/game-core/online/Contracts';
import type { z } from 'zod';
import type { OnlineAccess } from './Access';
import { APIError, StaleAccessError, type GameAPI } from './API';
import { journalKey, type CommandJournal, type PendingCommand } from './CommandJournal';
import { gameKeys, mergeCharacter, type CachedCharacter } from './queries';
export type CommandResult = z.infer<typeof ResponseSchema>;
export class CommandCoordinator {
  private locks = new Set<string>();
  private blockedUntil = 0;
  constructor(
    private options: {
      api: GameAPI;
      access: OnlineAccess;
      queries: QueryClient;
      journal: () => Promise<CommandJournal>;
      uuid: () => string;
      now?: () => number;
    },
  ) {}
  private now() {
    return this.options.now?.() ?? Date.now();
  }
  private scope(characterId?: string) {
    const lease = this.options.access.getSnapshot();
    if (!this.options.access.ready() || !lease.userId) throw new StaleAccessError();
    return {
      lease,
      userId: lease.userId,
      key: journalKey(this.options.api.origin, lease.userId, characterId),
    };
  }
  async pending(characterId?: string) {
    const { key } = this.scope(characterId);
    return (await this.options.journal()).read(key);
  }
  async submit(
    characterId: string,
    revision: number,
    command: OnlineCommand,
  ): Promise<CommandResult> {
    const request = CommandRequestSchema.parse({
      commandId: this.options.uuid(),
      expectedRevision: revision,
      command,
    });
    return this.run(
      characterId,
      { kind: 'command', request, createdAt: this.now() },
      false,
      command.type === 'REST_PULSE',
    );
  }
  async create(details: z.infer<typeof CreationRequestSchema>): Promise<CommandResult> {
    return this.run(
      undefined,
      { kind: 'create', request: CreationRequestSchema.parse(details), createdAt: this.now() },
      false,
    );
  }
  async retry(characterId?: string): Promise<CommandResult> {
    return this.run(characterId, undefined, true);
  }
  private async run(
    characterId: string | undefined,
    fresh: PendingCommand | undefined,
    retry: boolean,
    ephemeral = false,
  ): Promise<CommandResult> {
    const { lease, userId, key } = this.scope(characterId);
    if (this.locks.has(key)) throw new APIError(409, 'Another action is still pending.');
    if (this.now() < this.blockedUntil)
      throw new APIError(429, 'Please wait before retrying.', this.blockedUntil - this.now());
    this.locks.add(key);
    let journal: CommandJournal | undefined;
    let operation: PendingCommand | undefined;
    let sent = false;
    try {
      journal = await this.options.journal();
      const previous = await journal.read(key);
      if (previous && !retry)
        throw new APIError(409, 'Recover the pending action before taking another.');
      operation = retry ? previous : fresh;
      if (!operation) throw new APIError(409, 'There is no pending action to recover.');
      if (!this.options.access.matches(lease) || !this.options.access.ready())
        throw new StaleAccessError();
      // Never persist rest pulses: they are renewable foreground ticks, not recoverable player choices.
      if (!ephemeral && !previous) await journal.write(key, operation);
      const queryKey = characterId
        ? gameKeys.character(this.options.api.origin, userId, characterId)
        : undefined;
      if (queryKey) await this.options.queries.cancelQueries({ queryKey, exact: true });
      if (!this.options.access.matches(lease) || !this.options.access.ready())
        throw new StaleAccessError();
      sent = true;
      const result = await this.options.api.request(
        operation.kind === 'create'
          ? '/api/game/characters'
          : '/api/game/characters/' + encodeURIComponent(characterId!) + '/commands',
        CommandResponseSchema,
        operation.request,
      );
      if (!this.options.access.matches(lease)) throw new StaleAccessError();
      const expectedRevision = operation.kind === 'create' ? 0 : operation.request.expectedRevision;
      if (
        result.receipt.commandId !== operation.request.commandId ||
        result.receipt.baseRevision !== expectedRevision ||
        result.receipt.committedRevision !== expectedRevision + 1 ||
        result.view.character.revision < result.receipt.committedRevision ||
        result.receipt.characterId !== result.view.character.id ||
        (characterId && result.view.character.id !== characterId)
      )
        throw new Error(
          'The server returned an inconsistent command receipt. Recover the original request.',
        );
      const characterKey = gameKeys.character(
        this.options.api.origin,
        userId,
        result.view.character.id,
      );
      this.options.queries.setQueryData<CachedCharacter>(characterKey, (old) =>
        mergeCharacter(old, {
          view: result.view,
          connectionGeneration: lease.connectionGeneration,
        }),
      );
      if (!ephemeral) await journal.clear(key, operation.request.commandId);
      if (operation.kind === 'create')
        await this.options.queries.invalidateQueries({
          queryKey: gameKeys.characters(this.options.api.origin, userId),
        });
      return result;
    } catch (error) {
      if (error instanceof APIError && error.status === 429)
        this.blockedUntil = this.now() + error.retryAfterMs;
      // Only authoritative rejections prove the submitted operation did not commit.
      if (
        sent &&
        operation &&
        journal &&
        !ephemeral &&
        error instanceof APIError &&
        [400, 403, 404, 409, 413, 415, 422].includes(error.status)
      )
        await journal.clear(key, operation.request.commandId);
      throw error;
    } finally {
      this.locks.delete(key);
    }
  }
}
