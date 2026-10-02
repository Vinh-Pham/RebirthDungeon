import { current } from 'immer';
import {
  immutableData,
  produceState,
  readPlain,
  type Draft,
  type Immutable,
} from '../engine/immutableState';
import type { SerializableRandom } from '../engine/Random';
import {
  mergeTitleEncounter,
  reconcileTitles,
  recordTitleEvidence,
  selectTitleDraft,
  unlockTitleCouponDraft,
} from '../engine/rpg/Titles';
import { applyEnchantDraft, burnEquipmentDraft, operationReceipt } from '../engine/rpg/Enchants';
import {
  learnSkillDraft,
  readSkillBookDraft,
  insertSkillPageDraft,
  rankUpSkillDraft,
  mergeTraining,
} from '../engine/rpg/Skills';
import {
  acceptQuestDraft,
  claimQuestDraft,
  mergeQuestEncounter,
  reconcileQuests,
  recordQuestWorldEvidence,
  trackObjective,
} from '../engine/rpg/Quests';
import { cloneData } from '../engine/cloneData';
import { createGameEngine } from '../engine/GameEngine';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import {
  isProgressionCommand,
  type ProgressionCommand,
  type GameCommand,
} from '../engine/commands';
import type { GameEvent } from '../engine/events';
import {
  addItem,
  clampHeroResources,
  ownedEquipment,
  createHero,
  consumeItem,
  grantExperience,
  heroStats,
  applyHero,
  ownedDefinition,
  removeOwnedItem,
  dropOwnedItem,
  repairPrice,
  restoreHero,
  tickHero,
} from '../engine/rpg/Character';
import { rollVictoryLoot, selectedVictoryItems } from './VictoryLoot';
import type { GrowthTalent } from '../engine/rpg/Stats';
import { consumableRecovery } from '../engine/rpg/Consumables';
import { setItemHotbar } from '../engine/rpg/Inventory';
import { createGameRandom } from '../engine/Random';
import { distance, findPath, isWalkable, projectWorldMap } from '../engine/world/TileMap';
import { purchasePrice } from '../engine/world/Shop';
import type { WorldMap } from '../data/schemas/world';
import {
  validateCampaign,
  type CampaignState,
  type CampaignSnapshot,
} from '../persistence/SaveSchema';
import { BattleSession } from './BattleSession';
import { validateDebugCommand, type DebugCommand } from './DebugCommands';
import {
  bossCleared,
  createDungeonRun,
  dungeonObjectClaimed,
  freezeDungeonBlueprint,
  generateDungeon,
  inRoom,
  projectDungeonMap,
  remainingEnemies,
  validateDungeon,
} from '../engine/dungeon/Dungeon';

interface CampaignTransition {
  random: SerializableRandom;
  message: string;
  activeService?: string;
  events: GameEvent[];
  respawn: boolean;
}

let nextViewRevision = 0;
export interface JourneyView {
  readonly state: CampaignSnapshot;
  readonly map: Immutable<WorldMap>;
  readonly message: string;
  readonly revision: number;
  readonly activeService?: string;
}
/** Owns immutable campaign checkpoints; ECS and presentation are independent observers. */
export class JourneySession {
  readonly engine;
  private state: CampaignSnapshot;
  private resolving = false;
  private snapshot!: JourneyView;
  private listeners = new Set<() => void>();
  private message =
    'Collect supplies, visit the town shops, and offer an item at the goddess altar. The eastern passage leads to the training halls.';
  private disposed = false;
  private dispatching = false;
  private mutationsLocked = false;
  private hostManaged = false;
  private staging = false;
  private committedEvents: GameEvent[] = [];
  private projectedMap?: Immutable<WorldMap>;
  private activeService?: string;
  constructor(
    readonly content: ContentRegistry,
    restored?: CampaignState,
    seed = 12345,
    readonly characterName?: string,
    growthTalent: GrowthTalent = 'warrior',
  ) {
    this.engine = createGameEngine({ seed: restored?.seed ?? seed });
    const first = content.data.worlds[0];
    if (!first) throw new Error('No exploration map defined');
    this.state = restored
      ? validateCampaign(restored, content)
      : {
          seed,
          randomState: this.engine.random.snapshot(),
          hero: createHero(content, growthTalent, seed),
          worldId: first.id,
          position: { ...first.entry },
          opened: [],
          cleared: [],
          encounterCount: 0,
          audio: { music: 0.3, sfx: 0.7, enabled: false },
        };
    if (restored) this.message = 'Your journey has been restored.';
    this.state = produceState(this.state, (draft) => reconcileQuests(draft.hero, content));
    this.engine.random.restore(this.state.randomState);
    this.spawnWorld();
    this.registerCommand('MOVE', ({ entityId, dx, dy }, state, tx) => {
      this.requireExploring(state);
      if (
        entityId !== 'player' ||
        !Number.isInteger(dx) ||
        !Number.isInteger(dy) ||
        Math.abs(dx) + Math.abs(dy) !== 1
      )
        throw new Error('Move one tile at a time');
      const position = { x: state.position.x + dx, y: state.position.y + dy };
      if (!isWalkable(this.mapFor(state), position)) throw new Error('The way is blocked');
      tx.activeService = undefined;
      state.position = position;
      tx.message = '';
      tickHero(state.hero, content);
      const run = state.dungeon && readPlain(state.dungeon);
      const boss = run?.blueprint.encounters.find((entry) => entry.kind === 'boss');
      const bossRoom = run?.blueprint.rooms.find((room) => room.kind === 'boss');
      const encounter =
        boss && bossRoom && !run!.cleared.includes(boss.objectId) && inRoom(bossRoom, position)
          ? this.mapFor(state).objects.find((obj) => obj.id === boss.objectId)
          : this.mapFor(state).objects.find(
              (obj) =>
                obj.kind === 'encounter' &&
                distance(obj, position) === 0 &&
                !this.isClaimed(obj.id, state),
            );
      if (encounter) {
        this.beginEncounter(state, tx, encounter.id);
      } else this.commit(state, tx, { type: 'WORLD_MOVED', entityId: 'player', ...position });
    });
    this.registerCommand('REST', ({ entityId }, state, tx) => {
      this.requireExploring(state);
      if (entityId !== 'player' || tx.activeService)
        throw new Error('Rest on the town or dungeon map');
      tickHero(state.hero, content, true);
      tx.message = 'You rest and recover stamina. Wounds require healer treatment.';
      this.commit(state, tx, { type: 'RESTED', entityId });
    });
    this.engine.commands.register('TRAVEL_TO', ({ x, y }) => {
      this.requireExploring();
      if (distance(this.state.position, { x, y }) === 0) return;
      const path = findPath(this.map, this.state.position, { x, y });
      if (!path.length) throw new Error('No reachable path to that tile');
      for (const point of path) {
        this.engine.dispatch({
          type: 'MOVE',
          entityId: 'player',
          dx: point.x - this.state.position.x,
          dy: point.y - this.state.position.y,
        });
        if (this.state.pending) break;
      }
    });
    this.registerCommand('INTERACT', ({ objectId }, state, tx) => {
      this.requireExploring(state);
      const visible = this.mapFor(state).objects.find((obj) => obj.id === objectId);
      if (!visible || distance(visible, state.position) > 1)
        throw new Error('Move next to this object first');
      const run = state.dungeon;
      const obj = run?.blueprint.world.objects.find((entry) => entry.id === objectId) ?? visible;
      tx.activeService = undefined;
      switch (obj.kind) {
        case 'npc':
          for (const lesson of obj.lessons)
            if (!state.hero.discoveredSkills.includes(lesson.skillId))
              state.hero.discoveredSkills.push(lesson.skillId);
          if (!run && this.mapFor(state).theme) tx.activeService = obj.id;
          tx.message = obj.dialogue;
          break;
        case 'chest':
          if (this.isClaimed(obj.id, state)) throw new Error('This chest is empty');
          addItem(state.hero, obj.itemId!, obj.quantity, content);
          if (run) run.opened.push(obj.id);
          else state.opened.push(this.key(obj.id, state));
          tx.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}.`;
          break;
        case 'merchant':
        case 'healer':
        case 'altar':
        case 'dungeonEntrance':
          if (run) throw new Error('Town services are unavailable inside a dungeon');
          tx.activeService = obj.id;
          tx.message =
            obj.kind === 'altar' || obj.kind === 'dungeonEntrance'
              ? 'Offer one unequipped item to enter the moss depths. The offering is consumed.'
              : `Welcome to ${obj.name}.`;
          break;
        case 'statue':
          this.leaveDungeon(state, tx);
          return;
        case 'mimic':
          if (!run || this.isClaimed(obj.id, state)) throw new Error('This chest is empty');
          run.revealedMimics.push(obj.id);

          tx.message = state.dungeon
            ? 'Spiders spring from the chest!'
            : 'The chest opens its jaws. A mimic attacks!';
          this.beginEncounter(state, tx, obj.id);
          return;
        case 'fountain': {
          if (!run || this.isClaimed(obj.id, state)) throw new Error('This fountain has run dry');
          const fountain = run.blueprint.fountains.find(
            (fountain) => fountain.objectId === obj.id,
          )!;
          const status = content.status(fountain.statusId);
          const effect = run.effects.find((effect) => effect.statusId === status.id);
          if (effect) effect.stacks = Math.min(10, effect.stacks + 1);
          else run.effects.push({ statusId: status.id, stacks: 1 });
          run.usedFountains.push(obj.id);
          tx.message =
            status.name +
            ' · ' +
            (status.modifier > 0 ? '+' : '') +
            status.modifier +
            ' ' +
            status.stat +
            ' per stack until you leave. ' +
            (effect?.stacks ?? 1) +
            '/10 stacks.';
          break;
        }
        case 'gate':
          if (!run) throw new Error('This gate is unavailable');
          if (obj.gateType === 'boss') {
            if (run.bossDoorOpened) throw new Error('The boss room door is already open');
            if (remainingEnemies(run) > 0)
              throw new Error(
                'Defeat every enemy, including hidden mimics, before opening this door',
              );
            if (run.bossKey.status !== 'held')
              throw new Error('Pick up the dropped boss room key first');
            run.bossKey = { status: 'spent' };
            run.bossDoorOpened = true;
            tx.message = 'The boss room key turns. The door is open.';
          } else {
            if (!bossCleared(run)) throw new Error('Defeat the boss and all its companions first');
            tx.message = 'The treasure room passage is open.';
          }
          break;
        case 'key': {
          if (!run) throw new Error('This key is unavailable');
          const key = obj.keyType === 'boss' ? run.bossKey : run.treasureKey;
          if (key.status !== 'dropped') throw new Error('This key has already been collected');
          if (obj.keyType === 'boss') run.bossKey = { status: 'held' };
          else run.treasureKey = { status: 'held' };
          tx.message =
            'Collected the ' + (obj.keyType === 'boss' ? 'boss room' : 'treasure chest') + ' key.';
          break;
        }
        case 'finalChest':
          if (!run || run.selectedChest) throw new Error('You may open only one final chest');
          if (!bossCleared(run) || run.treasureKey.status !== 'held')
            throw new Error('Pick up the boss’s treasure chest key first');
          addItem(state.hero, obj.itemId!, obj.quantity, content);
          run.opened.push(obj.id);
          run.selectedChest = obj.id;
          run.treasureKey = { status: 'spent' };
          tx.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}. The other four chests are sealed. You can now return to the refuge.`;
          break;
        case 'rest': {
          restoreHero(state.hero, content);
          tx.message = 'The ember restores your health and mana.';
          break;
        }
        case 'portal': {
          if (visible.blocked) throw new Error('Defeat both guardians to open the eastern passage');
          const destination = content.data.worlds.find((map) => map.id === obj.destination)!;
          if (obj.dungeonId) {
            if (run) throw new Error('Leave this dungeon before entering another');
            // A dungeon portal's destination is the safe return map for the run.
            this.enterDungeon(
              state,
              tx,
              obj.dungeonId,
              `You descend into the moss depths. Explore the chambers, defeat every enemy, and face the giant black spider.`,
              {
                worldId: destination.id,
                position: { ...(obj.destinationPosition ?? destination.entry) },
              },
            );
            return;
          }
          recordQuestWorldEvidence(
            state.hero,
            { kind: 'interact', worldId: state.worldId, objectId },
            content,
          );
          state.worldId = destination.id;
          state.position = { ...(obj.destinationPosition ?? destination.entry) };

          tx.respawn = true;
          tx.message = `Entered ${destination.name}.`;
          this.commit(state, tx, { type: 'MAP_CHANGED', mapId: destination.id });
          return;
        }
        case 'encounter':
          throw new Error('Step onto the guardian tile to begin the encounter');
      }

      recordQuestWorldEvidence(
        state.hero,
        { kind: 'interact', worldId: state.worldId, objectId },
        content,
      );
      this.commit(state, tx, { type: 'WORLD_INTERACTED', objectId, message: tx.message });
    });
    this.registerCommand('EXIT_DUNGEON', (_command, state, tx) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(state);
      const run = state.dungeon;
      const room = run?.blueprint.rooms.find((room) => room.kind === 'treasure');
      if (!run?.selectedChest || !room || !inRoom(room, state.position))
        throw new Error('Claim a final chest in the treasure room before returning');
      this.leaveDungeon(state, tx, true);
    });
    this.registerCommand('EQUIP_ARMOR', ({ armorId }, state, tx) => {
      this.requireExploring(state);
      const armor = state.hero.armors[armorId];
      if (!armor) throw new Error('This armor is not in your pack');
      state.hero.equipment.armor = armorId;
      clampHeroResources(state.hero, content);
      tx.message = `Equipped ${content.item(armor.itemId).name}.`;
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED', itemId: armor.itemId });
    });
    this.registerCommand('EQUIP_WEAPON', ({ weaponId }, state, tx) => {
      this.requireExploring(state);
      const weapon = state.hero.weapons[weaponId];
      if (!weapon) throw new Error('This weapon is not in your pack');
      if (
        content.item(weapon.itemId).weaponTags.includes('sword') &&
        !state.hero.discoveredSkills.includes('sword-mastery')
      )
        state.hero.discoveredSkills.push('sword-mastery');
      state.hero.equipment.weapon = weaponId;
      if (!content.item(weapon.itemId).weaponTags.includes('bow'))
        delete state.hero.equipment.secondaryHand;
      clampHeroResources(state.hero, content);
      tx.message = `Equipped ${content.item(weapon.itemId).name}.`;
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED', itemId: weapon.itemId });
    });
    this.registerCommand('EQUIP_AMMUNITION', ({ itemId }, state, tx) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(state);
      const weapon = state.hero.equipment.weapon
        ? state.hero.weapons[state.hero.equipment.weapon]
        : undefined;
      if (
        !state.hero.inventory[itemId] ||
        content.item(itemId).kind !== 'ammunition' ||
        !weapon ||
        !content.item(weapon.itemId).weaponTags.includes('bow')
      )
        throw new Error('Equip a bow and own arrows before equipping the secondary hand');
      state.hero.equipment.secondaryHand = itemId;
      clampHeroResources(state.hero, content);
      tx.message = `Equipped ${content.item(itemId).name} in the secondary hand.`;
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED', itemId });
    });
    this.registerCommand('UNEQUIP_ITEM', ({ slot }, state, tx) => {
      this.requireExploring(state);
      delete state.hero.equipment[slot];
      if (slot === 'weapon') delete state.hero.equipment.secondaryHand;
      clampHeroResources(state.hero, content);
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED' });
    });
    this.registerCommand('USE_ITEM', ({ sourceId, targetId, itemId }, state, tx) => {
      this.requireExploring(state);
      const item = content.item(itemId);
      if (sourceId !== 'player' || targetId !== 'player' || item.kind !== 'consumable')
        throw new Error('Invalid item target');
      const recovery = consumableRecovery(item, this.engine.getEntity('player')!);
      consumeItem(state.hero.inventory, itemId);
      state.hero[recovery.resource] += recovery.amount;
      state.hero.stamina += recovery.staminaBonus;
      state.hero.fullness = recovery.fullnessAfter;
      tx.message = `Used ${item.name}.`;
      this.commit(state, tx, { type: 'ITEM_USED', sourceId, itemId });
    });
    this.registerCommand('SET_ITEM_HOTBAR', ({ itemId, assigned }, state, tx) => {
      setItemHotbar(state.hero, itemId, assigned, content);
      tx.message = `${content.item(itemId).name} ${assigned ? 'added to' : 'removed from'} the Items hotbar.`;
      this.commit(state, tx, { type: 'ITEM_HOTBAR_CHANGED', itemId, assigned });
    });
    this.registerCommand('DROP_ITEM', ({ item, quantity }, state, tx) => {
      this.requireExploring(state);
      const definition = ownedDefinition(state.hero, item, content);
      dropOwnedItem(state.hero, item, quantity, content);
      tx.message = `Dropped ${definition.name} ×${quantity}.`;
      this.commit(state, tx, { type: 'ITEM_DROPPED', itemId: definition.id, quantity });
    });
    this.registerServices();
    this.registerEnchanting();
    this.registerProgression();
    this.registerQuests();
    this.registerTitles();
    this.refresh();
  }
  private registerCommand<K extends GameCommand['type']>(
    type: K,
    handler: (
      command: Extract<GameCommand, { type: K }>,
      state: Draft<CampaignState>,
      tx: CampaignTransition,
    ) => void,
  ) {
    this.engine.commands.register(type, (command) =>
      this.transition((state, tx) => handler(command, state, tx)),
    );
  }
  private transition(operation: (state: Draft<CampaignState>, tx: CampaignTransition) => void) {
    if (this.disposed || this.resolving)
      throw new Error('Journey is disposed or a command is already resolving');
    const random = createGameRandom(this.state.seed);
    random.restore(this.engine.random.snapshot());
    const tx: CampaignTransition = {
      random,
      message: this.message,
      activeService: this.activeService,
      events: [],
      respawn: false,
    };
    this.resolving = true;
    try {
      const previous = this.state;
      const next = produceState(previous, (state) => {
        operation(state, tx);
        reconcileQuests(
          state.hero,
          this.content,
          tx.activeService && !state.dungeon && !state.pending
            ? { worldId: state.worldId, objectId: tx.activeService }
            : undefined,
        );
        const words = random.snapshot();
        if (words.some((word, index) => word !== state.randomState[index]))
          state.randomState = words;
      });
      this.state = next;
      this.engine.random.restore(next.randomState);
      this.message = tx.message;
      this.activeService = tx.activeService;
      if (mapChanged(previous, next)) this.projectedMap = undefined;
      if (tx.respawn) this.spawnWorld();
      this.refresh();
      const failures: unknown[] = [];
      for (const listener of [...this.listeners]) {
        if (!this.listeners.has(listener)) continue;
        try {
          listener();
        } catch (error) {
          failures.push(error);
        }
      }
      for (const event of tx.events) {
        if (this.staging) this.committedEvents.push(event);
        else
          try {
            this.engine.events.emit(event);
          } catch (error) {
            failures.push(error);
          }
      }
      if (failures.length)
        throw new AggregateError(failures, 'Campaign committed; notification delivery failed');
    } finally {
      this.resolving = false;
    }
  }
  private forkCandidate() {
    const candidate = new JourneySession(
      this.content,
      undefined,
      this.state.seed,
      this.characterName,
      this.state.hero.growthTalent,
    );
    candidate.state = this.state;
    candidate.engine.random.restore(this.state.randomState);
    candidate.activeService = this.activeService;
    candidate.projectedMap = this.map;
    candidate.staging = true;
    candidate.spawnWorld();
    candidate.refresh();
    return candidate;
  }
  private mapFor(state: CampaignSnapshot) {
    const plain = {
      worldId: state.worldId,
      cleared: readPlain(state.cleared),
      dungeon: state.dungeon && readPlain(state.dungeon),
    };
    if (!mapChanged(this.state, plain)) return this.map;
    return plain.dungeon
      ? projectDungeonMap(plain.dungeon)
      : projectWorldMap(
          this.content.data.worlds.find((map) => map.id === plain.worldId)!,
          plain.cleared,
        );
  }
  get map() {
    return (this.projectedMap ??= this.state.dungeon
      ? projectDungeonMap(this.state.dungeon)
      : projectWorldMap(
          this.content.data.worlds.find((map) => map.id === this.state.worldId)!,
          this.state.cleared,
        ));
  }
  isClaimed(objectId: string, state: CampaignSnapshot = this.state) {
    return state.dungeon
      ? dungeonObjectClaimed(state.dungeon, objectId)
      : state.opened.includes(this.key(objectId, state)) ||
          state.cleared.includes(this.key(objectId, state));
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  toSave(): CampaignState {
    return cloneData(this.snapshot.state);
  }
  dispatch(command: GameCommand) {
    if (this.mutationsLocked) throw new Error('Save pending. Retry before continuing.');
    if (this.hostManaged && isProgressionCommand(command))
      throw new Error('Use the host durable progression operation');
    if (this.disposed || this.dispatching)
      throw new Error('Journey is disposed or a command is already resolving');
    this.dispatching = true;
    try {
      this.engine.dispatch(command);
    } finally {
      this.dispatching = false;
    }
  }
  manageDurability() {
    this.hostManaged = true;
  }
  lockMutations() {
    this.mutationsLocked = true;
  }
  progressionCandidate(command: ProgressionCommand) {
    if (
      (command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT') &&
      !operationReceipt(this.state.hero, command.operationId) &&
      command.revision !== this.snapshot.revision
    )
      throw new Error('The campaign changed. Preview this enchant operation again.');
    const candidate = this.forkCandidate();
    if (command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT')
      command = { ...command, revision: candidate.getSnapshot().revision };
    candidate.activeService = this.activeService;
    candidate.staging = true;
    try {
      candidate.dispatch(command);
      validateCampaign(candidate.state, this.content);
      if (candidate.state.hero.ap !== this.state.hero.ap)
        candidate.committedEvents.push({ type: 'AP_CHANGED', ap: candidate.state.hero.ap });
      return candidate;
    } catch (error) {
      candidate.dispose();
      throw error;
    }
  }
  /** A debug change updates the saved entry hero, never the live encounter copy. */
  debugCandidate(command: DebugCommand) {
    if (this.disposed || this.resolving || this.mutationsLocked)
      throw new Error('Journey is unavailable or a save is pending.');
    validateDebugCommand(command, this.state.hero.gold);
    const candidate = this.forkCandidate();
    try {
      candidate.transition((state, tx) => {
        validateDebugCommand(command, state.hero.gold);
        state.hero.gold += command.amount;
        tx.message = `Added ${command.amount.toLocaleString()} debug gold. Total: ${state.hero.gold.toLocaleString()} gold.`;
      });
      validateCampaign(candidate.state, this.content);
      return candidate;
    } catch (error) {
      candidate.dispose();
      throw error;
    }
  }
  battleCandidate(battle: BattleSession, selectedItemIds?: readonly string[]) {
    const candidate = this.forkCandidate();
    candidate.staging = true;
    try {
      candidate.finishBattle(battle, selectedItemIds);
      validateCampaign(candidate.state, this.content);
      const training = battle.training.snapshot();
      if (Object.keys(training).length)
        candidate.committedEvents.push({ type: 'SKILL_TRAINING_BANKED', training });
      if (candidate.state.hero.ap !== this.state.hero.ap)
        candidate.committedEvents.push({ type: 'AP_CHANGED', ap: candidate.state.hero.ap });
      return candidate;
    } catch (error) {
      candidate.dispose();
      throw error;
    }
  }
  publishCommittedEvents() {
    const events = this.committedEvents;
    this.committedEvents = [];
    this.staging = false;
    const failures: unknown[] = [];
    for (const event of events)
      try {
        this.engine.events.emit(event);
      } catch (error) {
        failures.push(error);
      }
    if (failures.length)
      throw new AggregateError(failures, 'Progress saved; notification delivery failed');
  }
  get encounterIdentity() {
    const p = this.state.pending;
    return p ? `${p.worldId}/${p.objectId}/${this.state.encounterCount}/${p.seed}` : undefined;
  }
  createBattle(): BattleSession {
    if (!this.state.pending) throw new Error('No pending encounter');
    const encounter = this.state.dungeon?.blueprint.encounters.find(
      (entry) => entry.objectId === this.state.pending!.objectId,
    );
    return new BattleSession(
      this.content,
      this.state.pending.seed,
      encounter?.map ?? this.state.pending.mapId,
      this.state.hero,
      this.state.dungeon?.effects,
      this.characterName,
      this.encounterIdentity,
      true,
    );
  }
  private requireFinishedBattle(battle: BattleSession) {
    const pending = this.state.pending,
      result = battle.combat.result;
    if (
      this.disposed ||
      !pending ||
      !result ||
      battle.engine.seed !== pending.seed ||
      battle.map.id !== pending.mapId ||
      battle.encounterId !== this.encounterIdentity
    )
      throw new Error('Encounter is not ready to finish');
    return { pending, result };
  }
  private victoryRoll(battle: BattleSession) {
    this.requireFinishedBattle(battle);
    if (battle.combat.result !== 'victory') throw new Error('Loot is available after victory');
    // Preview and confirmation start from the same checkpoint, without spending live RNG.
    const random = createGameRandom(this.state.seed);
    random.restore(this.engine.random.snapshot());
    const hero = {
      ...this.state.hero,
      inventory: { ...battle.engine.world.entities.find((entity) => entity.player)!.inventory! },
    };
    const loot = rollVictoryLoot(
      battle.map.spawns
        .filter((spawn) => spawn.kind === 'enemy')
        .map((spawn) => spawn.definitionId),
      hero,
      this.content,
      random,
    );
    return { loot, randomState: random.snapshot() };
  }
  previewVictoryLoot(battle: BattleSession) {
    return this.victoryRoll(battle).loot;
  }
  finishBattle(battle: BattleSession, selectedItemIds?: readonly string[]) {
    this.transition((state, tx) => this.finishBattleDraft(state, tx, battle, selectedItemIds));
  }
  private finishBattleDraft(
    state: Draft<CampaignState>,
    tx: CampaignTransition,
    battle: BattleSession,
    selectedItemIds?: readonly string[],
  ) {
    if (this.hostManaged) throw new Error('Use the host durable battle operation');
    const { pending, result } = this.requireFinishedBattle(battle);
    const hero = state.hero;
    const runEncounter = state.dungeon?.blueprint.encounters.find(
      (e) => e.objectId === pending.objectId,
    );
    const guardian =
      runEncounter?.kind === 'boss'
        ? {
            dungeonId: state.dungeon!.blueprint.definitionId,
            enemyId: this.content.data.dungeons.find(
              (d) => d.id === state.dungeon!.blueprint.definitionId,
            )!.bossId,
          }
        : undefined;
    const evidence = battle.titles.snapshot();
    if (evidence.encounterId !== this.encounterIdentity)
      throw new Error('Title evidence belongs to another encounter');
    mergeTitleEncounter(hero, evidence, result, battle.map.id, this.content, guardian);
    mergeTraining(hero, battle.training.snapshot(), this.content);
    mergeQuestEncounter(hero, battle.quests.snapshot(), result, battle.map.id, this.content);
    const entity = battle.engine.world.entities.find((entity) => entity.player)!;
    hero.health = Math.max(1, entity.health!.current);
    hero.mana = entity.mana!.current;
    hero.stamina = entity.stamina!.current;
    hero.wounds = entity.wounds!;
    hero.fullness = entity.fullness!;
    hero.inventory = { ...entity.inventory! };
    if (entity.ammunitionItemId) hero.equipment.secondaryHand = entity.ammunitionItemId;
    else delete hero.equipment.secondaryHand;
    if (entity.weapon)
      hero.weapons[entity.weapon.id] = {
        ...hero.weapons[entity.weapon.id],
        durability: entity.weapon.durability,
      };
    clampHeroResources(hero, this.content);
    if (result === 'victory') {
      const { loot, randomState } = this.victoryRoll(battle);
      const items = selectedVictoryItems(loot, selectedItemIds);
      for (const item of items) addItem(hero, item.itemId, item.collectable, this.content);
      const { gold, experience } = loot;
      hero.gold = Math.min(1000000, hero.gold + gold);
      grantExperience(hero, experience, this.content);
      tx.random.restore(randomState);
      const objectId = pending.objectId;
      const run = state.dungeon;
      if (run) run.cleared.push(objectId);
      else state.cleared.push(this.key(objectId, state));

      state.pending = undefined;
      tx.message = `Victory · +${experience} XP · +${gold} gold · ${items.length ? 'selected loot added to your pack' : 'no items taken'}.`;
      if (
        !run &&
        this.mapFor(state).objects.some(
          (object) => object.dungeonId && object.kind === 'portal' && !object.blocked,
        )
      ) {
        tx.message += ' The eastern passage is open. Continue into the moss depths.';
      }
      if (run) {
        const position = run.blueprint.world.objects.find((obj) => obj.id === objectId)!;
        if (remainingEnemies(run) === 0 && run.bossKey.status === 'absent') {
          run.bossKey = { status: 'dropped', position: { x: position.x, y: position.y } };
          tx.message += ' The last enemy dropped the boss room key. Pick it up.';
        }
        if (bossCleared(run) && run.treasureKey.status === 'absent') {
          run.treasureKey = { status: 'dropped', position: { x: position.x, y: position.y } };
          tx.message +=
            ' The boss dropped the treasure chest key. Pick it up before choosing your reward.';
        }

        tx.respawn = true;
      }
      this.commit(state, tx, { type: 'LOOT_RECEIVED', gold, experience });
    } else {
      hero.gold = Math.floor(hero.gold / 2);
      restoreHero(hero, this.content);
      state.pending = undefined;
      state.dungeon = undefined;

      state.worldId = this.content.data.worlds[0].id;
      state.position = { ...this.mapFor(state).entry };
      tx.respawn = true;
      tx.message =
        'Recovered at the refuge. Half your gold was lost; levels, skills and equipment are preserved.';
      this.commit(state, tx, { type: 'MAP_CHANGED', mapId: this.mapFor(state).id });
    }
  }
  setAudio(audio: CampaignState['audio']) {
    if (this.disposed) throw new Error('Journey is disposed');
    const adopted = validateCampaign({ ...this.state, audio }, this.content).audio;
    this.transition((state) => {
      if (
        state.audio.music !== adopted.music ||
        state.audio.sfx !== adopted.sfx ||
        state.audio.enabled !== adopted.enabled
      )
        state.audio = adopted;
    });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.engine.dispose();
    this.listeners.clear();
  }
  private key(id: string, state: CampaignSnapshot = this.state) {
    return `${state.worldId}/${id}`;
  }
  private beginEncounter(state: Draft<CampaignState>, tx: CampaignTransition, objectId: string) {
    const obj =
      state.dungeon?.blueprint.world.objects.find((obj) => obj.id === objectId) ??
      this.mapFor(state).objects.find((obj) => obj.id === objectId)!;
    const encounter = state.dungeon?.blueprint.encounters.find(
      (entry) => entry.objectId === objectId,
    );
    state.pending = {
      objectId,
      worldId: this.mapFor(state).id,
      mapId: obj.encounterMap!,
      seed: encounter?.seed ?? tx.random.int(-2147483648, 2147483647),
    };
    if (encounter?.kind === 'boss' && state.dungeon) {
      const dungeon = this.content.data.dungeons.find(
        (d) => d.id === state.dungeon!.blueprint.definitionId,
      )!;
      recordTitleEvidence(state.hero, `guardian/${dungeon.id}/${dungeon.bossId}`);
    }
    state.encounterCount++;
    this.commit(state, tx, { type: 'ENCOUNTER_STARTED', objectId });
  }
  private enterDungeon(
    state: Draft<CampaignState>,
    tx: CampaignTransition,
    definitionId: string,
    message: string,
    returnTo = { worldId: state.worldId, position: { ...state.position } },
  ) {
    const definition = this.content.data.dungeons.find((entry) => entry.id === definitionId);
    if (!definition) throw new Error('This dungeon is unavailable');
    // Stage generation, validation and RNG before committing any campaign changes.
    const random = createGameRandom(state.seed);
    random.restore(tx.random.snapshot());
    const blueprint = generateDungeon(
      definition,
      random.int(-2147483648, 2147483647),
      state.hero.classId,
    );
    const dungeon = createDungeonRun(blueprint, returnTo);
    validateDungeon(dungeon, this.content);
    const staged = {
      ...current(state),
      dungeon,
      randomState: random.snapshot(),
      worldId: blueprint.world.id,
      position: { ...blueprint.world.entry },
    };
    validateCampaign(staged, this.content);
    freezeDungeonBlueprint(dungeon.blueprint);
    state.dungeon = dungeon;
    state.worldId = staged.worldId;
    state.position = staged.position;
    state.randomState = staged.randomState;
    tx.random.restore(staged.randomState);
    tx.activeService = undefined;

    tx.respawn = true;
    tx.message = message;
    this.commit(state, tx, { type: 'MAP_CHANGED', mapId: this.mapFor(state).id });
  }
  private leaveDungeon(state: Draft<CampaignState>, tx: CampaignTransition, completed = false) {
    const run = state.dungeon;
    if (!run) throw new Error('You are not inside a dungeon');
    if (completed) recordTitleEvidence(state.hero, `clear/${run.blueprint.definitionId}`);
    if (completed)
      recordQuestWorldEvidence(
        state.hero,
        { kind: 'clearDungeon', dungeonId: run.blueprint.definitionId },
        this.content,
      );
    state.worldId = run.returnTo.worldId;
    state.position = { ...run.returnTo.position };
    state.dungeon = undefined;

    tx.respawn = true;
    tx.message =
      'Returned to the refuge. Your earned loot is safe; dungeon effects and keys have faded.';
    this.commit(state, tx, { type: 'MAP_CHANGED', mapId: this.mapFor(state).id });
  }
  private requireExploring(state: CampaignSnapshot = this.state) {
    if (this.mutationsLocked) throw new Error('Save pending. Retry before continuing.');
    if (state.pending) throw new Error('Finish the encounter before exploring');
  }
  private requireService(
    state: CampaignSnapshot,
    activeService: string | undefined,
    objectId: string,
    kinds: readonly WorldMap['objects'][number]['kind'][],
  ) {
    if (this.hostManaged) throw new Error('Use the host durable progression operation');
    this.requireExploring(state);
    const object = this.mapFor(state).objects.find((entry) => entry.id === objectId);
    if (
      state.dungeon ||
      !this.mapFor(state).theme ||
      activeService !== objectId ||
      !object ||
      !kinds.includes(object.kind) ||
      distance(object, state.position) > 1
    )
      throw new Error('Approach and speak to this service first');
    return object;
  }
  private registerServices() {
    const content = this.content;
    const changed = (
      state: Draft<CampaignState>,
      tx: CampaignTransition,
      objectId: string,
      message: string,
    ) => {
      tx.message = message;
      this.commit(state, tx, { type: 'WORLD_INTERACTED', objectId, message });
    };
    this.registerCommand('CLOSE_SERVICE', (_command, state, tx) => {
      this.requireExploring(state);
      tx.activeService = undefined;
    });
    this.registerCommand('BUY_ITEM', ({ objectId, itemId, quantity, bundleSize }, state, tx) => {
      const object = this.requireService(state, tx.activeService, objectId, ['merchant']);
      const shop = content.data.shops.find((shop) => shop.id === object.shopId)!;
      const item = content.item(itemId);
      const total = purchasePrice(shop, content, itemId, quantity, bundleSize);
      if (state.hero.gold < total) throw new Error('Not enough gold');
      const hero = state.hero;
      addItem(hero, itemId, quantity, content);
      hero.gold -= total;
      changed(state, tx, objectId, `Bought ${item.name} ×${quantity} for ${total} gold.`);
    });
    this.registerCommand('SELL_ITEM', ({ objectId, item: reference, quantity }, state, tx) => {
      const object = this.requireService(state, tx.activeService, objectId, ['merchant']);
      if (!content.data.shops.find((shop) => shop.id === object.shopId)!.buysItems)
        throw new Error('This merchant does not buy items');
      const item = ownedDefinition(state.hero, reference, content);
      if (item.kind === 'armor' && 'itemId' in reference)
        throw new Error('Choose an individual armor copy');
      if (item.kind === 'titleCoupon')
        throw new Error('Keep title coupons for town redemption; they cannot be sold');
      if (item.kind === 'incompleteBook') throw new Error('Unfinished books cannot be sold');
      const total = Math.floor(item.price / 2) * quantity;
      if (state.hero.gold + total > 1000000) throw new Error('Your gold purse is full');
      const hero = state.hero;
      removeOwnedItem(hero, reference, quantity);
      hero.gold += total;
      changed(state, tx, objectId, `Sold ${item.name} ×${quantity} for ${total} gold.`);
    });
    this.registerCommand('REPAIR_WEAPON', ({ objectId, weaponId }, state, tx) => {
      const object = this.requireService(state, tx.activeService, objectId, ['merchant']);
      if (content.data.shops.find((shop) => shop.id === object.shopId)!.kind !== 'blacksmith')
        throw new Error('Visit the blacksmith for repairs');
      const weapon = state.hero.weapons[weaponId];
      if (!weapon) throw new Error('This weapon is not in your pack');
      const item = content.item(weapon.itemId);
      const cost = repairPrice(weapon, content);
      if (weapon.durability === item.maxDurability) throw new Error('This weapon needs no repairs');
      if (state.hero.gold < cost) throw new Error('Not enough gold');
      weapon.durability = item.maxDurability!;
      state.hero.gold -= cost;
      changed(state, tx, objectId, `Repaired ${item.name} for ${cost} gold.`);
    });
    this.registerCommand('HEAL', ({ objectId }, state, tx) => {
      const object = this.requireService(state, tx.activeService, objectId, ['healer']);
      const hero = state.hero;
      const stats = heroStats(hero, content);
      if (
        hero.health === stats.maxHealth &&
        hero.mana === stats.maxMana &&
        hero.stamina === stats.maxStamina &&
        hero.wounds === 0 &&
        hero.fullness === 100
      )
        throw new Error('You are already fully recovered');
      if (hero.gold < object.healingCost!) throw new Error('Not enough gold');
      hero.gold -= object.healingCost!;
      restoreHero(hero, content);
      changed(
        state,
        tx,
        objectId,
        `The healer restores your resources, wounds and fullness for ${object.healingCost} gold.`,
      );
    });
    this.registerCommand('OFFER_ITEM', ({ objectId, item: reference }, state, tx) => {
      const object = this.requireService(state, tx.activeService, objectId, [
        'altar',
        'dungeonEntrance',
      ]);
      const definition = content.data.dungeons.find((entry) => entry.id === object.dungeonId);
      if (!definition) throw new Error('This dungeon is unavailable');
      const hero = state.hero;
      const item = ownedDefinition(hero, reference, content);
      if (item.kind === 'armor' && 'itemId' in reference)
        throw new Error('Choose an individual armor copy');
      if (item.kind === 'titleCoupon')
        throw new Error('Keep title coupons for town redemption; they cannot be offered');
      if (item.kind === 'incompleteBook')
        throw new Error('Keep the unfinished book for its collection');
      removeOwnedItem(hero, reference, 1);
      this.enterDungeon(
        state,
        tx,
        definition.id,
        `The goddess accepts ${item.name}. Her sanctuary statue can return you to town.`,
      );
    });
  }
  private registerEnchanting() {
    this.registerCommand('LOCK_EQUIPMENT', ({ target, locked }, state, tx) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(state);
      const hero = state.hero;
      ownedEquipment(hero, target).locked = locked;
      tx.message = locked
        ? 'Equipment locked. It cannot be sold, offered, enchanted or burned.'
        : 'Equipment unlocked.';
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED' });
    });
    const operation = (
      command: Extract<GameCommand, { type: 'APPLY_ENCHANT' | 'BURN_EQUIPMENT' }>,
      state: Draft<CampaignState>,
      tx: CampaignTransition,
    ) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(state);
      const receipt = operationReceipt(state.hero, command.operationId);
      if (receipt) {
        if (receipt.kind !== (command.type === 'APPLY_ENCHANT' ? 'apply' : 'burn'))
          throw new Error('Operation ID belongs to another action');
        tx.message = `This operation was already saved. ${receipt.message}`;

        return;
      }
      if (command.revision !== this.snapshot.revision)
        throw new Error('The campaign changed. Preview this enchant operation again.');
      const object = this.requireService(state, tx.activeService, command.objectId, [
        'merchant',
        'npc',
      ]);
      if (!object.enchanting) throw new Error('This town service does not offer enchanting');
      const result =
        command.type === 'APPLY_ENCHANT'
          ? applyEnchantDraft(state.hero, command, this.content)
          : burnEquipmentDraft(state.hero, command, this.content);
      tx.message = result.message;
      this.commit(state, tx, {
        type: 'WORLD_INTERACTED',
        objectId: object.id,
        message: tx.message,
      });
    };
    this.registerCommand('APPLY_ENCHANT', operation);
    this.registerCommand('BURN_EQUIPMENT', operation);
  }
  private registerProgression() {
    const town = () => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      if (this.state.dungeon || !this.map.theme)
        throw new Error('Return to town to rank up or learn skills');
    };
    this.registerCommand('LEARN_SKILL', ({ objectId, skillId }, state, tx) => {
      town();
      const object = this.requireService(state, tx.activeService, objectId, ['npc']);
      const offer = object?.lessons.find((o) => o.skillId === skillId);
      if (!object || !offer || distance(object, state.position) > 1)
        throw new Error('Approach the instructor for this lesson');
      if (state.hero.gold < offer.fee) throw new Error('Not enough gold for this lesson');
      learnSkillDraft(state.hero, skillId, this.content);
      const hero = state.hero;
      hero.gold -= offer.fee;
      const introductoryReward =
        object.id === 'combat-instructor' &&
        skillId === 'smash' &&
        !hero.claimedMilestones.includes('intro-melee-lesson');
      if (introductoryReward) {
        hero.claimedMilestones.push('intro-melee-lesson');
        hero.ap = Math.min(1000000, hero.ap + 3);
      }
      tx.message = `Learned ${this.content.skill(skillId).name} · Rank F. ${introductoryReward ? 'Introductory lesson awards 3 AP once.' : 'Training starts at zero.'}`;
      this.commit(state, tx, { type: 'SKILL_LEARNED', skillId, rank: 'F' });
    });
    this.registerCommand('READ_SKILL_BOOK', ({ itemId }, state, tx) => {
      town();
      readSkillBookDraft(state.hero, itemId, this.content);
      const skillId = this.content.item(itemId).skillId!;
      tx.message = `Learned ${this.content.skill(skillId).name} · Rank F.`;
      this.commit(state, tx, { type: 'SKILL_LEARNED', skillId, rank: 'F' });
    });
    this.registerCommand('INSERT_SKILL_PAGE', ({ recipeId, pageId }, state, tx) => {
      town();
      insertSkillPageDraft(state.hero, recipeId, pageId, this.content);
      tx.message = state.hero.bookCollections[recipeId].completed
        ? 'The manual is complete. Read it to learn the skill.'
        : 'Page inserted into your manual.';
      this.commit(state, tx, { type: 'SKILL_PAGE_INSERTED', recipeId, pageId });
    });
    this.registerCommand('RANK_UP_SKILL', ({ skillId }, state, tx) => {
      town();
      rankUpSkillDraft(state.hero, skillId, this.content);
      tx.message = `${this.content.skill(skillId).name} advanced to Rank ${state.hero.learnedSkills[skillId].rank}.`;
      this.commit(state, tx, {
        type: 'SKILL_RANKED_UP',
        skillId,
        rank: state.hero.learnedSkills[skillId].rank,
      });
    });
  }
  private spawnWorld() {
    this.engine.world.clear();
    const hero = this.content.spawn(
      this.state.hero.classId,
      'player',
      'player',
      this.state.position.x,
      this.state.position.y,
    );
    if (this.characterName) hero.name = this.characterName;
    applyHero(hero, this.state.hero, this.content, this.state.dungeon?.effects);
    this.engine.spawn(hero);
    this.map.objects.forEach((obj) =>
      this.engine.spawn({ id: obj.id, name: obj.name, position: { x: obj.x, y: obj.y } }),
    );
  }
  private commit(state: Draft<CampaignState>, tx: CampaignTransition, event: GameEvent) {
    if (event.type === 'MAP_CHANGED')
      recordQuestWorldEvidence(state.hero, { kind: 'visit', worldId: event.mapId }, this.content);
    if (state.dungeon) recordEnteredDungeon(state.hero, state.dungeon.blueprint.definitionId);
    reconcileQuests(state.hero, this.content);
    const previousTitles = { ...state.hero.titleCollection.selected };
    const awarded = reconcileTitles(
      state.hero,
      this.content,
      event.type === 'QUEST_CLAIMED'
        ? `quest/${event.questId}/once`
        : event.type === 'LOOT_RECEIVED'
          ? `encounter/${state.encounterCount}`
          : `progression/${event.type}`,
      this.staging || !this.hostManaged,
    );
    tx.message += clearedTitleMessage(previousTitles, state.hero);
    if (awarded.length)
      tx.message += ` Earned: ${awarded.map((id) => this.content.data.titles.find((t) => t.id === id)!.name).join(', ')}.`;
    tx.events.push(event);
  }
  /** Projection only: observation never reconciles or advances gameplay. */
  private refresh() {
    const player = this.engine.getEntity('player');
    if (player) {
      player.position = { ...this.state.position };
      applyHero(player, this.state.hero, this.content, this.state.dungeon?.effects);
    }
    this.snapshot = immutableData({
      state: this.state,
      map: this.map,
      message: this.message,
      revision: ++nextViewRevision,
      activeService: this.activeService,
    });
  }
  titleCatchupCandidate() {
    const candidate = this.forkCandidate();
    candidate.staging = true;
    candidate.transition((state, tx) => {
      if (state.dungeon) recordEnteredDungeon(state.hero, state.dungeon.blueprint.definitionId);
      const awards = reconcileTitles(state.hero, this.content, 'load/progression');
      tx.message =
        (awards.length
          ? 'Earned: ' +
            awards.map((id) => this.content.data.titles.find((t) => t.id === id)!.name).join(', ') +
            '.'
          : 'Title collection restored.') +
        clearedTitleMessage(this.state.hero.titleCollection.selected, state.hero);
    });
    if (
      JSON.stringify(candidate.state.hero.titleCollection) ===
        JSON.stringify(this.state.hero.titleCollection) &&
      JSON.stringify(candidate.state.hero.earnedTitles) ===
        JSON.stringify(this.state.hero.earnedTitles)
    ) {
      candidate.dispose();
      return undefined;
    }
    validateCampaign(candidate.state, this.content);
    return candidate;
  }
  private registerTitles() {
    const town = () => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      if (this.state.dungeon || !this.map.theme) throw new Error('Change titles in town');
    };
    this.registerCommand('SELECT_TITLE', ({ slot, titleId }, state, tx) => {
      town();
      selectTitleDraft(state.hero, slot, titleId, this.content);
      tx.message = titleId
        ? `Selected ${this.content.data.titles.find((t) => t.id === titleId)!.name}.`
        : `Cleared ${slot === 'first' ? 'First' : 'Second'} Title.`;
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED' });
    });
    this.registerCommand('UNLOCK_TITLE_COUPON', ({ itemId }, state, tx) => {
      town();
      unlockTitleCouponDraft(state.hero, itemId, this.content);
      tx.message = `Earned ${this.content.data.titles.find((t) => t.id === this.content.item(itemId).titleId)!.name}. Choose it in the title collection.`;
      this.commit(state, tx, { type: 'EQUIPMENT_CHANGED' });
    });
  }
  private registerQuests() {
    const quest = (id: string) => {
      const definition = this.content.data.quests.find((q) => q.id === id);
      if (!definition) throw new Error('Unknown quest');
      return definition;
    };
    const town = () => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      if (this.state.dungeon || !this.map.theme)
        throw new Error('Return to town for quest acceptance and claims');
    };
    const atNpc = (
      state: CampaignSnapshot,
      activeService: string | undefined,
      npc: { worldId: string; objectId: string },
      objectId?: string,
    ) => {
      if (npc.worldId !== state.worldId || objectId !== npc.objectId)
        throw new Error('Return to the quest’s named NPC');
      this.requireService(state, activeService, npc.objectId, ['npc', 'healer', 'merchant']);
    };
    this.registerCommand('ACCEPT_QUEST', ({ questId, objectId }, state, tx) => {
      town();
      const definition = quest(questId);
      if (definition.offerNpc) atNpc(state, tx.activeService, definition.offerNpc, objectId);
      acceptQuestDraft(state.hero, definition, this.content);
      tx.message = `Accepted ${definition.name}.`;
      this.commit(state, tx, { type: 'QUEST_ACCEPTED', questId });
    });
    this.registerCommand('CLAIM_QUEST', ({ questId, objectId }, state, tx) => {
      town();
      const definition = quest(questId);
      if (definition.claimNpc) atNpc(state, tx.activeService, definition.claimNpc, objectId);
      claimQuestDraft(state.hero, definition, this.content);
      tx.message = `Completed ${definition.name}. Rewards saved.${definition.rewards.titles.length ? ` Earned: ${definition.rewards.titles.map((id) => this.content.data.titles.find((t) => t.id === id)!.name).join(', ')}.` : ''}`;
      this.commit(state, tx, { type: 'QUEST_CLAIMED', questId });
    });
    this.registerCommand('TRACK_QUEST_OBJECTIVE', ({ questId, objectiveId }, state, tx) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(state);
      trackObjective(state.hero, quest(questId), objectiveId);
      tx.message = 'Quest tracker updated.';
      this.commit(state, tx, { type: 'QUEST_TRACKING_CHANGED' });
    });
  }
}

function recordEnteredDungeon(hero: CampaignState['hero'], id: string) {
  hero.titleCollection.evidence[`entered/${id}`] = 1;
}

function clearedTitleMessage(
  previous: CampaignSnapshot['hero']['titleCollection']['selected'],
  hero: CampaignSnapshot['hero'],
) {
  return (['first', 'second'] as const)
    .filter((slot) => previous[slot] && !hero.titleCollection.selected[slot])
    .map(
      (slot) =>
        ` Cleared ${slot === 'first' ? 'First' : 'Second'} Title: its required skill rank is no longer eligible. The earned achievement is preserved.`,
    )
    .join('');
}

/** Only physical map projection inputs invalidate its cache. */
function mapChanged(
  before: Pick<CampaignSnapshot, 'worldId' | 'cleared' | 'dungeon'>,
  after: Pick<CampaignSnapshot, 'worldId' | 'cleared' | 'dungeon'>,
) {
  const a = before.dungeon,
    b = after.dungeon;
  return (
    before.worldId !== after.worldId ||
    before.cleared !== after.cleared ||
    a?.blueprint !== b?.blueprint ||
    a?.cleared !== b?.cleared ||
    a?.revealedMimics !== b?.revealedMimics ||
    a?.bossDoorOpened !== b?.bossDoorOpened ||
    a?.bossKey !== b?.bossKey ||
    a?.treasureKey !== b?.treasureKey
  );
}
