import type { JourneySession } from './JourneySession';
import type {
  GameplayJourney,
  GameplayBattle,
  GameplayHost,
  GameplayHostView,
  JourneyObservation,
  PreviewSelection,
  GameplayProgressionCommand,
} from './Gameplay';
import { BattleSession } from '@rebirth/game-core/game/BattleSession';
import { worldObjectSprite } from '../renderer/WorldObjectArt';
import type { Immutable } from '../engine/immutableState';
import type { WorldMap } from '../data/schemas/world';
import { JourneyHost } from './JourneyHost';
import { previewEquipment } from '../engine/rpg/Character';
import { previewEnchant, previewBurn } from '../engine/rpg/Enchants';
import { bossCleared, remainingEnemies, inRoom } from '../engine/dungeon/Dungeon';

class LocalJourney implements GameplayJourney {
  readonly source = 'local';
  private previous?: ReturnType<JourneySession['getSnapshot']>;
  private snapshot!: JourneyObservation;
  constructor(
    readonly session: JourneySession,
    readonly characterId: string,
  ) {}
  get content() {
    return this.session.content;
  }
  get characterName() {
    return this.session.characterName;
  }
  get events() {
    return this.session.engine.events;
  }
  subscribe = (listener: () => void) => this.session.subscribe(listener);
  getSnapshot = (): JourneyObservation => {
    const view = this.session.getSnapshot();
    if (view === this.previous) return this.snapshot;
    this.previous = view;
    const state = view.state,
      run = state.dungeon;
    this.snapshot = {
      ...view,
      state: {
        hero: state.hero,
        worldId: state.worldId,
        position: state.position,
        opened: state.opened,
        cleared: state.cleared,
        inEncounter: !!state.pending,
        dungeon: run
          ? {
              definitionId: run.blueprint.definitionId,
              effects: run.effects.map((e) => ({ ...e })),
              selectedChest: run.selectedChest,
              bossDoorOpened: run.bossDoorOpened,
              bossKey: run.bossKey.status,
              treasureKey: run.treasureKey.status,
              currentRoomKind:
                run.blueprint.rooms.find((r) => inRoom(r, state.position))?.kind ?? 'corridor',
              bossCleared: bossCleared(run),
              remainingEnemies: remainingEnemies(run),
            }
          : undefined,
      },
    };
    return this.snapshot;
  };
  dispatch = (command: Parameters<JourneySession['dispatch']>[0]) => this.session.dispatch(command);
  isClaimed = (id: string) => this.session.isClaimed(id);
  objectSprite(object: Immutable<WorldMap['objects'][number]>) {
    return worldObjectSprite(
      object,
      this.content.data,
      this.session.getSnapshot().state.dungeon,
      this.isClaimed(object.id),
    );
  }
  playerSprite() {
    return this.session.engine.getEntity('player')!.sprite!;
  }
  previewKey(selection: PreviewSelection) {
    return ['local-preview', this.characterId, this.getSnapshot().revision, selection];
  }
  setAudio = (settings: Parameters<JourneySession['setAudio']>[0]) => {
    const current = this.session.getSnapshot().state.audio;
    if (
      current.enabled !== settings.enabled ||
      current.music !== settings.music ||
      current.sfx !== settings.sfx
    )
      this.session.setAudio(settings);
  };
  async preview(selection: PreviewSelection, revision: number) {
    if (revision !== this.getSnapshot().revision) throw new Error('This preview is out of date.');
    const state = this.session.getSnapshot().state;
    if (selection.type === 'EQUIPMENT')
      return {
        revision,
        preview: {
          type: selection.type,
          ...previewEquipment(state.hero, selection.item, this.content, state.dungeon?.effects),
        },
      };
    if (selection.type === 'ENCHANT')
      return {
        revision,
        preview: { type: selection.type, ...previewEnchant(state.hero, selection, this.content) },
      };
    return {
      revision,
      preview: { type: selection.type, ...previewBurn(state.hero, selection.target, this.content) },
    };
  }
  previewVictoryLoot(battle: GameplayBattle) {
    // Only this adapter can access the simulation-backed encounter.
    if (!(battle instanceof BattleSession))
      throw new Error('Local loot requires a local encounter.');
    return this.session.previewVictoryLoot(battle);
  }
}
export class LocalGameplayHost implements GameplayHost {
  readonly source = 'local';
  private journeys = new WeakMap<JourneySession, LocalJourney>();
  private previous?: ReturnType<JourneyHost['getSnapshot']>;
  private snapshot!: GameplayHostView;
  constructor(
    readonly localHost: JourneyHost,
    readonly characterId: string,
  ) {}
  get content() {
    return this.localHost.content;
  }
  get logs() {
    return this.localHost.logs;
  }
  subscribe = (listener: () => void) => this.localHost.subscribe(listener);
  getSnapshot = (): GameplayHostView => {
    const view = this.localHost.getSnapshot();
    if (view === this.previous) return this.snapshot;
    this.previous = view;
    let session: LocalJourney | undefined;
    if (view.session) {
      session = this.journeys.get(view.session);
      if (!session) {
        session = new LocalJourney(view.session, this.characterId);
        this.journeys.set(view.session, session);
      }
    }
    return (this.snapshot = { ...view, session });
  };
  getServerSnapshot = () => this.getSnapshot();
  recordLog: JourneyHost['recordLog'] = (...args) => this.localHost.recordLog(...args);
  progress = (command: GameplayProgressionCommand) => {
    if (command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT') {
      const view = this.localHost.getSnapshot().session!.getSnapshot();
      return this.localHost.progress({
        ...command,
        revision: view.revision,
        operationId: `enchant-${view.state.hero.enchanting.nextOperationId}`,
      });
    }
    return this.localHost.progress(command);
  };
  returnFromBattle: JourneyHost['returnFromBattle'] = (...args) =>
    this.localHost.returnFromBattle(...args);
  retryProgression: JourneyHost['retryProgression'] = (...args) =>
    this.localHost.retryProgression(...args);
  save: JourneyHost['save'] = (...args) => this.localHost.save(...args);
  load: JourneyHost['load'] = (...args) => this.localHost.load(...args);
  flush: JourneyHost['flush'] = (...args) => this.localHost.flush(...args);
  flushForExit: JourneyHost['flushForExit'] = (...args) => this.localHost.flushForExit(...args);
  toggleRest = () => this.localHost.toggleRest();
  stopRest = () => this.localHost.stopRest();
}
