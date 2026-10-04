import { QueryObserver, type QueryClient, type QueryObserverResult } from '@tanstack/react-query';
import {
  CommandSchema,
  BattleActionSchema,
  type OnlineCommand,
} from '@rebirth/game-core/online/Contracts';
import type {
  GameplayHost,
  GameplayHostView,
  GameplayJourney,
  GameplayBattle,
  JourneyObservation,
  PreviewSelection,
  GameplayProgressionCommand,
} from '../game/Gameplay';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { GameCommand } from '../engine/commands';
import { EventBus } from '../engine/EventBus';
import { LogEngine } from '../engine/logging/LogEngine';
import { immutableData } from '../engine/immutableState';
import type { OnlineAccess } from './Access';
import type { GameAPI } from './API';
import { APIError } from './API';
import type { CommandCoordinator, CommandResult } from './CommandCoordinator';
import {
  characterOptions,
  featureOptions,
  cachedFeature,
  coherentCharacter,
  refreshFeatures,
  gameKeys,
  type CoreView,
  type CachedCharacter,
} from './queries';
import {
  FeaturePreviewResponseSchema,
  GAME_FEATURES,
  type GameFeature,
} from '@rebirth/game-core/online/Features';
import { previewRequest } from '@rebirth/game-core/online/Actions';
import { worldObjectSprite } from '../renderer/WorldObjectArt';
import type { Immutable } from '../engine/immutableState';
import type { WorldMap } from '../data/schemas/world';
import { RemoteBattle } from './RemoteBattle';

export function onlineIntent(command: GameCommand | GameplayProgressionCommand): OnlineCommand {
  if (command.type === 'MOVE') {
    if (command.entityId !== 'player') throw new Error('Only your character may move.');
    return CommandSchema.parse({ type: command.type, dx: command.dx, dy: command.dy });
  }
  if (command.type === 'USE_ITEM') {
    if (command.sourceId !== 'player' || command.targetId !== 'player')
      throw new Error('Exploration items are used on your character.');
    return CommandSchema.parse({ type: command.type, itemId: command.itemId });
  }
  if (command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT') {
    return CommandSchema.parse({
      type: command.type,
      objectId: command.objectId,
      target: command.target,
      ...('scrollId' in command ? { scrollId: command.scrollId, powderId: command.powderId } : {}),
    });
  }
  return CommandSchema.parse(command);
}
class RemoteJourney implements GameplayJourney {
  readonly source = 'online';
  readonly events = new EventBus();
  private previous?: CoreView;
  private previousHost?: GameplayHostView;
  private snapshot!: JourneyObservation;
  constructor(
    private host: OnlineGameplayHost,
    readonly characterId: string,
  ) {}
  getFeature: NonNullable<GameplayJourney['getFeature']> = (feature) =>
    this.host.getFeature(feature);
  loadFeatures = (features: readonly GameFeature[]) => this.host.loadFeatures(features);
  get characterName() {
    return this.host.current().character.name;
  }
  get content() {
    return this.host.content;
  }
  subscribe = (listener: () => void) => this.host.subscribe(listener);
  getSnapshot = (): JourneyObservation => {
    const current = this.host.current();
    const hosted = this.host.getSnapshot();
    if (current === this.previous && hosted === this.previousHost) return this.snapshot;
    this.previousHost = hosted;
    this.previous = current;
    const view = immutableData(current);
    return (this.snapshot = {
      state: {
        hero: view.hero,
        worldId: view.worldId,
        position: view.position,
        opened: view.opened,
        cleared: view.cleared,
        inEncounter: !!view.encounter,
        dungeon: view.dungeon,
      },
      map: view.map,
      revision: view.character.revision,
      message: this.host.getSnapshot().notice ?? '',
      activeService: view.activeService,
      resting: view.resting,
      statReview: view.statReview,
      availableFeatures: GAME_FEATURES.filter(
        (feature) => this.host.getFeature(feature) !== undefined,
      ),
    });
  };
  dispatch = (command: GameCommand) => {
    this.host.begin(onlineIntent(command));
  };
  isClaimed = (id: string) => this.host.current().claimedObjectIds.includes(id);
  objectSprite(object: Immutable<WorldMap['objects'][number]>) {
    return worldObjectSprite(object, this.content.data, undefined, this.isClaimed(object.id));
  }
  playerSprite() {
    return this.content.data.classes.find((c) => c.id === this.host.current().hero.classId)!.sprite;
  }
  async preview(selection: PreviewSelection, revision: number, signal?: AbortSignal) {
    return this.host.preview(selection, revision, signal);
  }
  previewKey(selection: PreviewSelection) {
    return this.host.previewKey(selection);
  }
  previewVictoryLoot(_battle: GameplayBattle) {
    const rewards = this.host.current().encounter?.rewards;
    if (!rewards) throw new Error('Victory rewards are unavailable.');
    return rewards;
  }
}
export interface OnlineHostOptions {
  activity?: import('./ActivityOutbox').ActivityOutbox;
  characterId: string;
  userId: string;
  api: GameAPI;
  access: OnlineAccess;
  queries: QueryClient;
  commands: CommandCoordinator;
  content: ContentRegistry;
  mutate(
    action: { kind: 'submit'; revision: number; command: OnlineCommand } | { kind: 'retry' },
  ): Promise<CommandResult>;
}
export class OnlineGameplayHost implements GameplayHost {
  readonly source = 'online';
  readonly logs = new LogEngine(Date.now);
  readonly content: ContentRegistry;
  private snapshot: GameplayHostView = {
    revision: 0,
    busy: true,
    storageAvailable: false,
    slots: [],
  };
  private listeners = new Set<() => void>();
  private observer: QueryObserver<
    CachedCharacter,
    Error,
    CachedCharacter,
    CachedCharacter,
    ReturnType<typeof gameKeys.character>
  >;
  private disconnectQuery?: () => void;
  private disconnectAccess?: () => void;
  private cached?: CachedCharacter;
  private journey: RemoteJourney;
  private battle?: RemoteBattle;
  private inFlight = false;
  private journalLoaded = false;
  private readError?: string;
  private generation = 0;
  private restRequested = false;
  private restTimer?: ReturnType<typeof setTimeout>;
  constructor(private options: OnlineHostOptions) {
    this.content = options.content;
    this.journey = new RemoteJourney(this, options.characterId);
    this.observer = new QueryObserver(options.queries, {
      ...characterOptions(
        options.api,
        options.access,
        options.userId,
        options.characterId,
        options.queries,
      ),
      enabled: options.access.ready(),
      refetchOnMount: 'always',
    });
  }
  current() {
    if (!this.cached) throw new Error('The character has not loaded.');
    return this.cached.view;
  }
  getFeature: NonNullable<GameplayJourney['getFeature']> = (feature) => {
    const row = cachedFeature(
      this.options.queries,
      this.options.api,
      this.options.userId,
      this.options.characterId,
      feature,
    );
    return row &&
      row.revision === this.cached?.view.character.revision &&
      row.connectionGeneration === this.options.access.getSnapshot().connectionGeneration
      ? immutableData(row.data)
      : undefined;
  };
  async loadFeatures(features: readonly GameFeature[]) {
    const revision = this.current().character.revision;
    try {
      await Promise.all(
        features
          .filter((feature) => this.getFeature(feature) === undefined)
          .map((feature) =>
            this.options.queries.fetchQuery({
              ...featureOptions(
                this.options.api,
                this.options.access,
                this.options.userId,
                this.options.characterId,
                feature,
                revision,
              ),
              staleTime: 0,
            }),
          ),
      );
    } catch (error) {
      if (!(error instanceof APIError && error.status === 409)) throw error;
      await refreshFeatures(
        this.options.queries,
        this.options.api,
        this.options.access,
        this.options.userId,
        this.options.characterId,
        [...features],
      );
    }
    this.publish();
  }
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.start();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.stop();
    };
  };
  private start() {
    const generation = ++this.generation;
    this.journalLoaded = false;
    this.disconnectQuery = this.observer.subscribe((result) => this.observe(result));
    this.observe(this.observer.getCurrentResult());
    this.disconnectAccess = this.options.access.subscribe(() => {
      const connection = this.options.access.getSnapshot();
      this.recordLog(
        'system',
        'CONNECTION_CHANGED',
        `Connection ${connection.online ? 'online' : 'offline'}; app ${connection.foreground ? 'foreground' : 'background'}; session ${connection.verified ? 'verified' : 'unverified'}.`,
      );
      if (!this.options.access.ready()) {
        this.pauseRest();
        this.battle?.presentation.clear();
      }
      this.observer.setOptions({
        ...characterOptions(
          this.options.api,
          this.options.access,
          this.options.userId,
          this.options.characterId,
          this.options.queries,
        ),
        enabled: this.options.access.ready(),
      });
      if (
        this.options.access.ready() &&
        this.cached?.connectionGeneration !== this.options.access.getSnapshot().connectionGeneration
      )
        void this.observer.refetch();
      this.publish();
    });
    void this.options.commands
      .pending(this.options.characterId)
      .then((pending) => {
        if (generation !== this.generation) return;
        this.journalLoaded = true;
        if (pending)
          this.snapshot = {
            ...this.snapshot,
            retryAvailable: true,
            pendingResult:
              pending.kind === 'command' ? pending.request.command.type : 'Character creation',
            error: 'An earlier action needs recovery. Retry checks the same request.',
          };
        this.publish();
      })
      .catch((error) => {
        if (generation !== this.generation) return;
        this.snapshot = {
          ...this.snapshot,
          retryAvailable: true,
          error:
            error instanceof Error ? error.message : 'Command recovery storage is unavailable.',
        };
        this.publish();
      });
  }
  private stop() {
    this.generation++;
    this.disconnectQuery?.();
    this.disconnectAccess?.();
    this.disconnectQuery = this.disconnectAccess = undefined;
    this.pauseRest();
    this.battle?.dispose();
    this.battle = undefined;
  }
  private observe(result: QueryObserverResult<CachedCharacter>) {
    if (
      result.data &&
      result.data.view.character.id === this.options.characterId &&
      (!this.cached || result.data.view.character.revision >= this.cached.view.character.revision)
    ) {
      this.cached = result.data;
      const encounter = result.data.view.encounter;
      if (encounter) {
        if (!this.battle || this.battle.encounterId !== encounter.id) {
          this.battle?.dispose();
          this.battle = new RemoteBattle(
            result.data.view,
            this.content,
            () => this.canInput(),
            (action, targetId) =>
              this.begin({
                type: 'BATTLE_ACTION',
                action: BattleActionSchema.parse(action),
                targetId,
              }),
            (type, message) => this.recordLog('user', type, message),
          );
        } else this.battle.update(result.data.view);
      } else {
        this.battle?.dispose();
        this.battle = undefined;
      }
    }
    if (result.error) {
      this.readError = result.error.message;
      this.snapshot = { ...this.snapshot, error: this.readError };
    } else if (result.isSuccess && this.readError) {
      if (this.snapshot.error === this.readError && !this.snapshot.retryAvailable)
        this.snapshot = { ...this.snapshot, error: undefined };
      this.readError = undefined;
    }
    this.publish();
  }
  private canInput() {
    return (
      this.options.access.ready() &&
      this.options.access.getSnapshot().userId === this.options.userId &&
      this.cached?.connectionGeneration ===
        this.options.access.getSnapshot().connectionGeneration &&
      coherentCharacter(
        this.options.queries,
        this.options.api,
        this.options.userId,
        this.options.characterId,
      )?.view.character.revision === this.cached?.view.character.revision &&
      this.journalLoaded &&
      !this.inFlight &&
      !this.snapshot.retryAvailable
    );
  }
  private publish() {
    const connected =
      this.options.access.ready() &&
      this.cached?.connectionGeneration === this.options.access.getSnapshot().connectionGeneration;
    this.snapshot = {
      ...this.snapshot,
      session: this.cached ? this.journey : undefined,
      battle: this.battle,
      storageAvailable: this.journalLoaded,
      revision: this.cached?.view.character.revision ?? 0,
      busy: this.inFlight || (!this.journalLoaded && !this.snapshot.error) || !connected,
      restPaused: !!this.cached?.view.resting && !this.restRequested,
    };
    this.listeners.forEach((listener) => listener());
    this.scheduleRest();
  }
  begin(command: OnlineCommand) {
    if (!this.canInput() || this.battle?.presentation.getSnapshot().busy)
      throw new Error('Wait for the pending action or reconnect before continuing.');
    void this.resolve({ kind: 'submit', revision: this.current().character.revision, command });
  }
  private async resolve(action: Parameters<OnlineHostOptions['mutate']>[0]): Promise<boolean> {
    if (!this.canInput() && action.kind !== 'retry') return false;
    if (this.inFlight || !this.options.access.ready()) return false;
    const generation = this.generation;
    const previousRevision = this.cached?.view.character.revision ?? 0;
    this.inFlight = true;
    this.snapshot = { ...this.snapshot, error: undefined, notice: undefined };
    this.publish();
    try {
      const result = await this.options.mutate(action);
      if (!('updates' in result)) throw new Error('Unexpected character creation response');
      if (generation !== this.generation) return true;
      this.snapshot = {
        ...this.snapshot,
        retryAvailable: false,
        pendingResult: undefined,
        notice: result.receipt.outcome.message,
        error: undefined,
      };
      void this.options.queries.invalidateQueries({
        queryKey: [
          'game',
          this.options.api.origin,
          this.options.userId,
          'logs',
          this.options.characterId,
        ],
      });
      this.battle?.present(result, previousRevision);
      if (result.receipt.outcome.events.includes('WORLD_MOVED')) {
        try {
          this.journey.events.emit({
            type: 'WORLD_MOVED',
            entityId: 'player',
            ...this.current().position,
          });
        } catch {
          /* Resolved observers never authorize replay. */
        }
      }
      if (action.kind === 'submit' && ['START_REST', 'REST_PULSE'].includes(action.command.type))
        this.restRequested = true;
      if (!this.current().resting) this.pauseRest();
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      this.pauseRest();
      const message =
        error instanceof Error ? error.message : 'The request could not be completed.';
      let pending = false;
      try {
        pending = !!(await this.options.commands.pending(this.options.characterId));
      } catch {
        pending = action.kind === 'retry' || !(error instanceof APIError);
      }
      this.snapshot = {
        ...this.snapshot,
        error: message,
        retryAvailable: pending,
        pendingResult: pending
          ? action.kind === 'submit'
            ? action.command.type
            : this.snapshot.pendingResult
          : undefined,
      };
      if (error instanceof APIError && [409, 422].includes(error.status)) {
        void this.options.queries.invalidateQueries({
          queryKey: gameKeys.character(
            this.options.api.origin,
            this.options.userId,
            this.options.characterId,
          ),
        });
      } else if (action.kind === 'submit' && action.command.type === 'REST_PULSE')
        void this.observer.refetch();
      return false;
    } finally {
      this.inFlight = false;
      if (generation === this.generation) this.publish();
    }
  }
  previewKey(selection: PreviewSelection) {
    return [
      ...gameKeys.character(this.options.api.origin, this.options.userId, this.options.characterId),
      'preview',
      this.current().character.revision,
      selection,
    ];
  }
  async preview(selection: PreviewSelection, revision: number, signal?: AbortSignal) {
    if (!this.canInput() || revision !== this.current().character.revision)
      throw new Error('Refresh the character before requesting a preview.');
    const request = previewRequest(this.options.characterId, {
      expectedRevision: revision,
      selection,
    });
    return this.options.api.request(
      request.path,
      FeaturePreviewResponseSchema,
      request.body,
      signal,
    );
  }
  progress = async (command: GameplayProgressionCommand) => {
    if (command.type === 'USE_LIFE_SKILL') {
      this.toggleRest();
      return true;
    }
    return this.resolve({
      kind: 'submit',
      revision: this.current().character.revision,
      command: onlineIntent(command),
    });
  };
  returnFromBattle = async (selectedItemIds?: readonly string[]) =>
    this.resolve({
      kind: 'submit',
      revision: this.current().character.revision,
      command: {
        type: 'SETTLE_ENCOUNTER',
        selectedItemIds: selectedItemIds ? [...selectedItemIds] : undefined,
      },
    });
  retryProgression = async () => {
    if (this.journalLoaded) return this.resolve({ kind: 'retry' });
    if (this.inFlight || !this.options.access.ready()) return false;
    const generation = this.generation;
    this.inFlight = true;
    this.publish();
    try {
      const pending = await this.options.commands.pending(this.options.characterId);
      if (generation !== this.generation) return false;
      this.journalLoaded = true;
      this.snapshot = {
        ...this.snapshot,
        retryAvailable: !!pending,
        pendingResult: pending?.kind === 'command' ? pending.request.command.type : undefined,
        error: pending ? 'Recover the original pending action before continuing.' : undefined,
      };
      return true;
    } catch (error) {
      if (generation === this.generation)
        this.snapshot = {
          ...this.snapshot,
          error: error instanceof Error ? error.message : 'Recovery storage is unavailable.',
        };
      return false;
    } finally {
      this.inFlight = false;
      if (generation === this.generation) this.publish();
    }
  };
  toggleRest = () => {
    if (!this.canInput()) return false;
    const command: OnlineCommand = this.current().resting
      ? this.restRequested
        ? { type: 'STOP_REST' }
        : { type: 'REST_PULSE' }
      : { type: 'START_REST' };
    if (command.type === 'STOP_REST') this.pauseRest();
    this.begin(command);
    return true;
  };
  private pauseRest() {
    this.restRequested = false;
    if (this.restTimer) clearTimeout(this.restTimer);
    this.restTimer = undefined;
  }
  private scheduleRest() {
    if (this.restTimer) return;
    if (!this.restRequested || !this.cached?.view.resting || !this.canInput()) return;
    this.restTimer = setTimeout(() => {
      this.restTimer = undefined;
      if (this.restRequested && this.canInput()) this.begin({ type: 'REST_PULSE' });
    }, 1000);
  }
  stopRest = () => {
    this.pauseRest();
  };
  recordLog: GameplayHost['recordLog'] = (_category, type, message) => {
    this.options.activity?.record(
      this.options.userId,
      this.options.characterId,
      type,
      message,
      this.cached?.view.character.revision,
    );
  };
  flush = async () => true;
  flushForExit = async () => !this.inFlight;
  save: GameplayHost['save'] = async () => {
    throw new Error('Online progress is saved by the server.');
  };
  load: GameplayHost['load'] = async () => {
    throw new Error('Online characters have one current state.');
  };
}
