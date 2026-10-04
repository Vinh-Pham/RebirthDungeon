import { encodeState } from './codec.js';
import { HTTPException } from 'hono/http-exception';
import {
  CreationRequestSchema,
  ReceiptSchema,
  type CharacterMetadata,
  type CommandRequestSchema,
  type PreviewRequestSchema,
} from '@rebirth/game-core/online/Contracts';
import {
  type MutationResponse,
  CreationResponseSchema,
  MutationResponseSchema,
} from '@rebirth/game-core/online/Features';
import { createOnlineRuntime } from '@rebirth/game-core/online/Runtime';
import {
  AuditCollectionError,
  creationAudit,
} from '@rebirth/game-core/online/Audit';
import type { z } from 'zod';
import { GameRepository, requestHash } from './repository.js';
import { projectAll, changedFeatures, selectedUpdates } from './projections.js';

function gameplay<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof AuditCollectionError) {
      console.error(JSON.stringify({ event: 'audit_collection_failed' }));
      throw new HTTPException(503, { message: 'Gameplay audit unavailable' });
    }
    throw new HTTPException(422, {
      message:
        error instanceof Error ? error.message : 'Illegal gameplay action',
    });
  }
}
export class GameExecution {
  constructor(
    readonly repository: GameRepository,
    readonly requestId: string,
  ) {}
  private async duplicate(commandId: string, hash: string) {
    const prior = await this.repository.receipt(commandId);
    if (prior && prior.hash !== hash)
      throw new HTTPException(409, {
        message: 'Command ID was already used with different input',
      });
    return prior;
  }
  async create(input: z.output<typeof CreationRequestSchema>) {
    const hash = await requestHash({ operation: 'CREATE_CHARACTER', input });
    const prior = await this.duplicate(input.commandId, hash);
    if (prior) {
      const current = await this.repository.feature(
        prior.receipt.characterId,
        'character',
      );
      return {
        replayed: true,
        response: CreationResponseSchema.parse({
          apiVersion: 2,
          receipt: prior.receipt,
          character: current.data,
        }),
      };
    }
    const release = await this.repository.catalogs.release();
    const content = await this.repository.catalogs.load(
      release.content_version,
    );
    const runtime = createOnlineRuntime(content);
    const now = Date.now(),
      id = crypto.randomUUID();
    const character: CharacterMetadata = {
      id,
      name: input.name,
      talent: input.talent,
      age: input.age,
      revision: 1,
      contentVersion: release.content_version,
      createdAt: now,
      updatedAt: now,
    };
    const seed = new Int32Array(
      crypto.getRandomValues(new Uint32Array(1)).buffer,
    )[0];
    const state = runtime.newOnlineState(
      seed,
      character.name,
      character.talent,
    );
    const receipt = ReceiptSchema.parse({
      commandId: input.commandId,
      characterId: id,
      baseRevision: 0,
      committedRevision: 1,
      createdAt: now,
      outcome: { message: 'Character created', events: ['CHARACTER_CREATED'] },
    });
    const committed = await this.repository.commit(
      character,
      undefined,
      state,
      receipt,
      hash,
      {
        requestId: this.requestId,
        command: {
          type: 'CREATE_CHARACTER',
          name: input.name,
          talent: input.talent,
          age: input.age,
        },
        audit: creationAudit(state),
      },
      ['character'],
    );
    const metadata = committed.replayed
      ? (
          await this.repository.feature(
            committed.receipt.characterId,
            'character',
          )
        ).data
      : character;
    return {
      replayed: !!committed.replayed,
      response: CreationResponseSchema.parse({
        apiVersion: 2,
        receipt: committed.receipt,
        character: metadata,
      }),
    };
  }
  async action(
    id: string,
    input: z.output<typeof CommandRequestSchema>,
  ): Promise<{ replayed: boolean; response: MutationResponse }> {
    const hash = await requestHash({
      operation: 'COMMAND',
      characterId: id,
      input,
    });
    const prior = await this.duplicate(input.commandId, hash);
    if (prior) {
      const current = await this.repository.load(id);
      return {
        replayed: true,
        response: MutationResponseSchema.parse({
          apiVersion: 2,
          receipt: prior.receipt,
          snapshotRevision: current.character.revision,
          updates: selectedUpdates(
            projectAll(
              current.state,
              current.character,
              current.runtime,
              current.content,
            ),
            prior.features,
          ),
        }),
      };
    }
    const current = await this.repository.load(id);
    if (current.character.revision !== input.expectedRevision)
      throw new HTTPException(409, { message: 'Character revision changed' });
    const now = Date.now();
    const candidate = gameplay(() =>
      current.runtime.execute(
        current.state,
        current.character.name,
        input.command,
        now,
      ),
    );
    const character = {
      ...current.character,
      revision: input.expectedRevision + 1,
      updatedAt: now,
    };
    const before = projectAll(
        current.state,
        current.character,
        current.runtime,
        current.content,
      ),
      after = projectAll(
        candidate.state,
        character,
        current.runtime,
        current.content,
      );
    const candidateRows = encodeState(
      id,
      candidate.state,
      current.character.contentVersion,
    );
    const features = changedFeatures(
      before,
      after,
      current.rows,
      candidateRows,
    );
    const receipt = ReceiptSchema.parse({
      commandId: input.commandId,
      characterId: id,
      baseRevision: input.expectedRevision,
      committedRevision: character.revision,
      createdAt: now,
      outcome: candidate.outcome,
    });
    const committed = await this.repository.commit(
      current.character,
      current.rows,
      candidate.state,
      receipt,
      hash,
      {
        requestId: this.requestId,
        command: input.command,
        audit: candidate.audit,
      },
      features,
      candidateRows,
    );
    if (committed.replayed) return this.action(id, input);
    return {
      replayed: false,
      response: MutationResponseSchema.parse({
        apiVersion: 2,
        receipt: committed.receipt,
        snapshotRevision: character.revision,
        updates: selectedUpdates(after, features),
      }),
    };
  }
  async preview(id: string, input: z.output<typeof PreviewRequestSchema>) {
    const current = await this.repository.load(id);
    if (current.character.revision !== input.expectedRevision)
      throw new HTTPException(409, { message: 'Character revision changed' });
    return {
      apiVersion: 2 as const,
      characterId: id,
      revision: current.character.revision,
      preview: gameplay(() =>
        current.runtime.preview(current.state, input.selection),
      ),
    };
  }
}
