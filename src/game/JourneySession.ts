import { mergeTitleEncounter, reconcileTitles, recordTitleEvidence, selectTitle, unlockTitleCoupon } from '../engine/rpg/Titles';
import { applyEnchant, burnEquipment, operationReceipt } from '../engine/rpg/Enchants';
import { learnSkill, readSkillBook, insertSkillPage, rankUpSkill, mergeTraining } from '../engine/rpg/Skills';
import { acceptQuest, claimQuest, mergeQuestEncounter, reconcileQuests, recordQuestWorldEvidence, trackObjective } from '../engine/rpg/Quests';
import { cloneData } from '../engine/cloneData';
import { createGameEngine } from '../engine/GameEngine';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { isProgressionCommand, type ProgressionCommand, type GameCommand } from '../engine/commands';
import type { GameEvent } from '../engine/events';
import { addItem, clampHeroResources, ownedEquipment, createHero, consumeItem, grantExperience, heroStats, rollLoot, applyHero, itemCount, ownedDefinition, removeOwnedItem, repairPrice, restoreHero, tickHero } from '../engine/rpg/Character';
import type { GrowthTalent } from '../engine/rpg/Stats';
import { consumableRecovery } from '../engine/rpg/Consumables';
import { createGameRandom } from '../engine/Random';
import { distance, findPath, isWalkable } from '../engine/world/TileMap';
import type { WorldMap } from '../data/schemas/world';
import { validateCampaign, type CampaignState } from '../persistence/SaveSchema';
import { BattleSession } from './BattleSession';
import { bossCleared, createDungeonRun, dungeonObjectClaimed, freezeDungeonBlueprint, generateDungeon, inRoom, projectDungeonMap, remainingEnemies, validateDungeon } from '../engine/dungeon/Dungeon';

let nextViewRevision = 0;
export interface JourneyView { state: CampaignState; map: WorldMap; message: string; revision: number; activeService?: string }
/** Owns exploration state. React sends commands and reads detached projections. */
export class JourneySession {
  readonly engine;
  private state: CampaignState;
  private snapshot!: JourneyView;
  private listeners = new Set<() => void>();
  private message = 'Collect supplies, visit the town shops, and offer an item at the goddess altar. The eastern passage leads to the training halls.';
  private disposed = false;
  private dispatching = false;
  private mutationsLocked = false;
  private hostManaged = false;
  private staging = false;
  private committedEvents: GameEvent[] = [];
  private dungeonMap?: WorldMap;
  private activeService?: string;
  constructor(readonly content: ContentRegistry, restored?: CampaignState, seed = 12345, readonly characterName?: string, growthTalent: GrowthTalent = 'warrior') {
    this.engine = createGameEngine({ seed: restored?.seed ?? seed });
    const first = content.data.worlds[0];
    if (!first) throw new Error('No exploration map defined');
    this.state = restored ? validateCampaign(restored, content) : { seed, randomState: this.engine.random.snapshot(),
      hero: createHero(content, growthTalent, seed), worldId: first.id, position: { ...first.entry }, opened: [], cleared: [], encounterCount: 0,
      audio: { music: 0.3, sfx: 0.7, enabled: false } };
    if (restored) this.message = 'Your journey has been restored.';
    if (this.state.dungeon) freezeDungeonBlueprint(this.state.dungeon.blueprint);
    this.engine.random.restore(this.state.randomState);
    this.spawnWorld();
    this.engine.commands.register('MOVE', ({ entityId, dx, dy }) => {
      this.requireExploring();
      if (entityId !== 'player' || !Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('Move one tile at a time');
      const position = { x: this.state.position.x + dx, y: this.state.position.y + dy };
      if (!isWalkable(this.map, position)) throw new Error('The way is blocked');
      this.activeService = undefined;
      this.state.position = position; this.engine.getEntity('player')!.position = { ...position };
      this.message = '';
      tickHero(this.state.hero, content);
      const run = this.state.dungeon;
      const boss = run?.blueprint.encounters.find((entry) => entry.kind === 'boss');
      const bossRoom = run?.blueprint.rooms.find((room) => room.kind === 'boss');
      const encounter = boss && bossRoom && !run!.cleared.includes(boss.objectId) && inRoom(bossRoom, position)
        ? this.map.objects.find((obj) => obj.id === boss.objectId)
        : this.map.objects.find((obj) => obj.kind === 'encounter' && distance(obj, position) === 0 && !this.isClaimed(obj.id));
      if (encounter) {
        this.beginEncounter(encounter.id);
      } else this.commit({ type: 'WORLD_MOVED', entityId: 'player', ...position });
    });
    this.engine.commands.register('REST', ({ entityId }) => {
      this.requireExploring(); if (entityId !== 'player' || this.activeService) throw new Error('Rest on the town or dungeon map');
      tickHero(this.state.hero, content, true); this.message = 'You rest and recover stamina. Wounds require healer treatment.';
      this.commit({ type: 'RESTED', entityId });
    });
    this.engine.commands.register('TRAVEL_TO', ({ x, y }) => {
      this.requireExploring();
      if (distance(this.state.position, { x, y }) === 0) return;
      const path = findPath(this.map, this.state.position, { x, y });
      if (!path.length) throw new Error('No reachable path to that tile');
      for (const point of path) {
        this.engine.dispatch({ type: 'MOVE', entityId: 'player', dx: point.x - this.state.position.x, dy: point.y - this.state.position.y });
        if (this.state.pending) break;
      }
    });
    this.engine.commands.register('INTERACT', ({ objectId }) => {
      this.requireExploring();
      const visible = this.map.objects.find((obj) => obj.id === objectId);
      if (!visible || distance(visible, this.state.position) > 1) throw new Error('Move next to this object first');
      const run = this.state.dungeon;
      const obj = run?.blueprint.world.objects.find((entry) => entry.id === objectId) ?? visible;
      this.activeService = undefined;
      switch (obj.kind) {
        case 'npc':
          for (const lesson of obj.lessons) if (!this.state.hero.discoveredSkills.includes(lesson.skillId)) this.state.hero.discoveredSkills.push(lesson.skillId);
          if (!run && this.map.theme) this.activeService = obj.id;
          this.message = obj.dialogue; break;
        case 'chest':
          if (this.isClaimed(obj.id)) throw new Error('This chest is empty');
          addItem(this.state.hero, obj.itemId!, obj.quantity, content);
          if (run) run.opened.push(obj.id); else this.state.opened.push(this.key(obj.id));
          this.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}.`; break;
        case 'merchant':
        case 'healer':
        case 'altar':
        case 'dungeonEntrance':
          if (run) throw new Error('Town services are unavailable inside a dungeon');
          this.activeService = obj.id;
          this.message = obj.kind === 'altar' || obj.kind === 'dungeonEntrance'
            ? 'Offer one unequipped item to enter the moss depths. The offering is consumed.' : `Welcome to ${obj.name}.`; break;
        case 'statue': this.leaveDungeon(); return;
        case 'mimic':
          if (!run || this.isClaimed(obj.id)) throw new Error('This chest is empty');
          run.revealedMimics.push(obj.id); this.dungeonMap = undefined;
          this.message = 'The chest opens its jaws. A mimic attacks!'; this.beginEncounter(obj.id); return;
        case 'fountain': {
          if (!run || this.isClaimed(obj.id)) throw new Error('This fountain has run dry');
          const fountain = run.blueprint.fountains.find((fountain) => fountain.objectId === obj.id)!;
          const status = content.status(fountain.statusId); const effect = run.effects.find((effect) => effect.statusId === status.id);
          if (effect) effect.stacks = Math.min(10, effect.stacks + 1); else run.effects.push({ statusId: status.id, stacks: 1 });
          run.usedFountains.push(obj.id);
          this.message = status.name + ' · ' + (status.modifier > 0 ? '+' : '') + status.modifier + ' ' + status.stat + ' per stack until you leave. ' + (effect?.stacks ?? 1) + '/10 stacks.'; break;
        }
        case 'gate':
          if (!run) throw new Error('This gate is unavailable');
          if (obj.gateType === 'boss') {
            if (run.bossDoorOpened) throw new Error('The boss room door is already open');
            if (remainingEnemies(run) > 0) throw new Error('Defeat every enemy, including hidden mimics, before opening this door');
            if (run.bossKey.status !== 'held') throw new Error('Pick up the dropped boss room key first');
            run.bossKey = { status: 'spent' }; run.bossDoorOpened = true; this.message = 'The boss room key turns. The door is open.';
          } else {
            if (!bossCleared(run)) throw new Error('Defeat the boss and all its companions first');
            this.message = 'The treasure room passage is open.';
          }
          break;
        case 'key': {
          if (!run) throw new Error('This key is unavailable');
          const key = obj.keyType === 'boss' ? run.bossKey : run.treasureKey;
          if (key.status !== 'dropped') throw new Error('This key has already been collected');
          if (obj.keyType === 'boss') run.bossKey = { status: 'held' }; else run.treasureKey = { status: 'held' };
          this.message = 'Collected the ' + (obj.keyType === 'boss' ? 'boss room' : 'treasure chest') + ' key.'; break;
        }
        case 'finalChest':
          if (!run || run.selectedChest) throw new Error('You may open only one final chest');
          if (!bossCleared(run) || run.treasureKey.status !== 'held') throw new Error('Pick up the boss’s treasure chest key first');
          addItem(this.state.hero, obj.itemId!, obj.quantity, content);
          run.opened.push(obj.id); run.selectedChest = obj.id; run.treasureKey = { status: 'spent' };
          this.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}. The other four chests are sealed. You can now return to the refuge.`; break;
        case 'rest': {
          restoreHero(this.state.hero, content);
          this.message = 'The ember restores your health and mana.'; break;
        }
        case 'portal': {
          const destination = content.data.worlds.find((map) => map.id === obj.destination)!;
          recordQuestWorldEvidence(this.state.hero, { kind: 'interact', worldId: this.state.worldId, objectId }, content);
          this.state.worldId = destination.id; this.state.position = { ...(obj.destinationPosition ?? destination.entry) }; this.spawnWorld();
          this.message = `Entered ${destination.name}.`; this.commit({ type: 'MAP_CHANGED', mapId: destination.id }); return;
        }
        case 'encounter': throw new Error('Step onto the guardian tile to begin the encounter');
      }
      this.dungeonMap = undefined;
      recordQuestWorldEvidence(this.state.hero, { kind: 'interact', worldId: this.state.worldId, objectId }, content);
      this.commit({ type: 'WORLD_INTERACTED', objectId, message: this.message });
    });
    this.engine.commands.register('EXIT_DUNGEON', () => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      const run = this.state.dungeon; const room = run?.blueprint.rooms.find((room) => room.kind === 'treasure');
      if (!run?.selectedChest || !room || !inRoom(room, this.state.position)) throw new Error('Claim a final chest in the treasure room before returning');
      this.leaveDungeon(true);
    });
    this.engine.commands.register('EQUIP_ARMOR', ({ armorId }) => {
      this.requireExploring(); const armor = this.state.hero.armors[armorId];
      if (!armor) throw new Error('This armor is not in your pack');
      this.state.hero.equipment.armor = armorId; clampHeroResources(this.state.hero, content); this.message = `Equipped ${content.item(armor.itemId).name}.`;
      this.commit({ type: 'EQUIPMENT_CHANGED', itemId: armor.itemId });
    });
    this.engine.commands.register('EQUIP_WEAPON', ({ weaponId }) => {
      this.requireExploring(); const weapon = this.state.hero.weapons[weaponId];
      if (!weapon) throw new Error('This weapon is not in your pack');
      if (content.item(weapon.itemId).weaponTags.includes('sword') && !this.state.hero.discoveredSkills.includes('sword-mastery')) this.state.hero.discoveredSkills.push('sword-mastery');
      this.state.hero.equipment.weapon = weaponId; clampHeroResources(this.state.hero, content); this.message = `Equipped ${content.item(weapon.itemId).name}.`;
      this.commit({ type: 'EQUIPMENT_CHANGED', itemId: weapon.itemId });
    });
    this.engine.commands.register('UNEQUIP_ITEM', ({ slot }) => {
      this.requireExploring(); delete this.state.hero.equipment[slot]; clampHeroResources(this.state.hero, content); this.commit({ type: 'EQUIPMENT_CHANGED' });
    });
    this.engine.commands.register('USE_ITEM', ({ sourceId, targetId, itemId }) => {
      this.requireExploring(); const item = content.item(itemId);
      if (sourceId !== 'player' || targetId !== 'player' || item.kind !== 'consumable') throw new Error('Invalid item target');
      const recovery = consumableRecovery(item, this.engine.getEntity('player')!);
      consumeItem(this.state.hero.inventory, itemId);
      this.state.hero[recovery.resource] += recovery.amount;
      this.state.hero.stamina += recovery.staminaBonus; this.state.hero.fullness = recovery.fullnessAfter;
      this.message = `Used ${item.name}.`; this.commit({ type: 'ITEM_USED', sourceId, itemId });
    });
    this.registerServices();
    this.registerEnchanting();
    this.registerProgression();
    this.registerQuests();
    this.registerTitles();
    this.refresh();
  }
  get map() { return this.state.dungeon ? this.dungeonMap ??= projectDungeonMap(this.state.dungeon) : this.content.data.worlds.find((map) => map.id === this.state.worldId)!; }
  isClaimed(objectId: string) { return this.state.dungeon ? dungeonObjectClaimed(this.state.dungeon, objectId) : this.state.opened.includes(this.key(objectId)) || this.state.cleared.includes(this.key(objectId)); }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  toSave(): CampaignState { return cloneData(this.snapshot.state); }
  dispatch(command: GameCommand) {
    if (this.mutationsLocked) throw new Error('Save pending. Retry before continuing.');
    if (this.hostManaged && isProgressionCommand(command)) throw new Error('Use the host durable progression operation');
    if (this.disposed || this.dispatching) throw new Error('Journey is disposed or a command is already resolving');
    this.dispatching = true;
    try { this.engine.dispatch(command); } finally { this.dispatching = false; }
  }
  manageDurability() { this.hostManaged = true; }
  lockMutations() { this.mutationsLocked = true; }
  progressionCandidate(command: ProgressionCommand) {
    if ((command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT') && !operationReceipt(this.state.hero, command.operationId) && command.revision !== this.snapshot.revision) throw new Error('The campaign changed. Preview this enchant operation again.');
    const candidate = new JourneySession(this.content, this.toSave(), undefined, this.characterName);
    if (command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT') command = { ...command, revision: candidate.getSnapshot().revision };
    candidate.activeService = this.activeService; candidate.staging = true;
    try { candidate.dispatch(command);
      validateCampaign(candidate.toSave(), this.content);
      if (candidate.state.hero.ap !== this.state.hero.ap) candidate.committedEvents.push({ type: 'AP_CHANGED', ap: candidate.state.hero.ap });
      return candidate; } catch (error) { candidate.dispose(); throw error; }
  }
  battleCandidate(battle: BattleSession) {
    const candidate = new JourneySession(this.content, this.toSave(), undefined, this.characterName);
    candidate.staging = true;
    try { candidate.finishBattle(battle);
      const training = battle.training.snapshot();
      if (Object.keys(training).length) candidate.committedEvents.push({ type: 'SKILL_TRAINING_BANKED', training });
      if (candidate.state.hero.ap !== this.state.hero.ap) candidate.committedEvents.push({ type: 'AP_CHANGED', ap: candidate.state.hero.ap });
      return candidate; } catch (error) { candidate.dispose(); throw error; }
  }
  publishCommittedEvents() {
    const events = this.committedEvents; this.committedEvents = []; this.staging = false;
    const failures: unknown[] = [];
    for (const event of events) try { this.engine.events.emit(event); } catch (error) { failures.push(error); }
    if (failures.length) throw new AggregateError(failures, 'Progress saved; notification delivery failed');
  }
  get encounterIdentity() {
    const p = this.state.pending; return p ? `${p.worldId}/${p.objectId}/${this.state.encounterCount}/${p.seed}` : undefined;
  }
  createBattle(): BattleSession {
    if (!this.state.pending) throw new Error('No pending encounter');
    const encounter = this.state.dungeon?.blueprint.encounters.find((entry) => entry.objectId === this.state.pending!.objectId);
    return new BattleSession(this.content, this.state.pending.seed, encounter?.map ?? this.state.pending.mapId, cloneData(this.state.hero), this.state.dungeon?.effects, this.characterName, this.encounterIdentity, true);
  }
  finishBattle(battle: BattleSession) {
    if (this.hostManaged) throw new Error('Use the host durable battle operation');
    if (this.disposed || !this.state.pending || !battle.combat.result || battle.engine.seed !== this.state.pending.seed || battle.map.id !== this.state.pending.mapId || battle.encounterId !== this.encounterIdentity) throw new Error('Encounter is not ready to finish');
    const hero = cloneData(this.state.hero);
    const runEncounter = this.state.dungeon?.blueprint.encounters.find((e) => e.objectId === this.state.pending!.objectId);
    const guardian = runEncounter?.kind === 'boss' ? { dungeonId: this.state.dungeon!.blueprint.definitionId, enemyId: this.content.data.dungeons.find((d) => d.id === this.state.dungeon!.blueprint.definitionId)!.bossId } : undefined;
    const evidence = battle.titles.snapshot();
    if (evidence.encounterId !== this.encounterIdentity) throw new Error('Title evidence belongs to another encounter');
    mergeTitleEncounter(hero, evidence, battle.combat.result, battle.map.id, this.content, guardian);
    mergeTraining(hero, battle.training.snapshot(), this.content);
    mergeQuestEncounter(hero, battle.quests.snapshot(), battle.combat.result, battle.map.id, this.content);
    const entity = battle.engine.world.entities.find((entity) => entity.player)!;
    hero.health = Math.max(1, entity.health!.current); hero.mana = entity.mana!.current;
    hero.stamina = entity.stamina!.current; hero.wounds = entity.wounds!; hero.fullness = entity.fullness!;
    hero.inventory = { ...entity.inventory! };
    if (entity.weapon) hero.weapons[entity.weapon.id] = { ...hero.weapons[entity.weapon.id], durability: entity.weapon.durability };
    clampHeroResources(hero, this.content);
    if (battle.combat.result === 'victory') {
      let gold = 0; let experience = 0;
      const drops = battle.map.spawns.filter((spawn) => spawn.kind === 'enemy').map((spawn) => rollLoot(spawn.definitionId, this.content, this.engine.random));
      for (const drop of drops) {
        gold += drop.gold; experience += drop.experience;
        for (const item of drop.items) {
          const quantity = Math.min(999 - itemCount(hero, item.itemId), item.quantity);
          if (quantity) addItem(hero, item.itemId, quantity, this.content);
        }
      }
      hero.gold = Math.min(1000000, hero.gold + gold); grantExperience(hero, experience, this.content);
      const objectId = this.state.pending.objectId;
      this.state.hero = hero;
      const run = this.state.dungeon;
      if (run) run.cleared.push(objectId); else this.state.cleared.push(this.key(objectId));
      this.state.pending = undefined;
      this.message = `Victory · +${experience} XP · +${gold} gold · loot added to your pack.`;
      if (run) {
        const position = run.blueprint.world.objects.find((obj) => obj.id === objectId)!;
        if (remainingEnemies(run) === 0 && run.bossKey.status === 'absent') {
          run.bossKey = { status: 'dropped', position: { x: position.x, y: position.y } };
          this.message += ' The last enemy dropped the boss room key. Pick it up.';
        }
        if (bossCleared(run) && run.treasureKey.status === 'absent') {
          run.treasureKey = { status: 'dropped', position: { x: position.x, y: position.y } };
          this.message += ' The boss dropped the treasure chest key. Pick it up before choosing your reward.';
        }
        this.dungeonMap = undefined; this.spawnWorld();
      }
      this.commit({ type: 'LOOT_RECEIVED', gold, experience });
    } else {
      hero.gold = Math.floor(hero.gold / 2);
      restoreHero(hero, this.content);
      this.state.hero = hero; this.state.pending = undefined; this.state.dungeon = undefined; this.dungeonMap = undefined; this.state.worldId = this.content.data.worlds[0].id;
      this.state.position = { ...this.map.entry }; this.spawnWorld();
      this.message = 'Recovered at the refuge. Half your gold was lost; levels, skills and equipment are preserved.';
      this.commit({ type: 'MAP_CHANGED', mapId: this.map.id });
    }
  }
  setAudio(audio: CampaignState['audio']) {
    if (this.disposed) throw new Error('Journey is disposed');
    this.state.audio = validateCampaign({ ...this.state, audio }, this.content).audio; this.refresh();
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.engine.dispose(); this.listeners.clear(); }
  private key(id: string) { return `${this.state.worldId}/${id}`; }
  private beginEncounter(objectId: string) {
    const obj = this.state.dungeon?.blueprint.world.objects.find((obj) => obj.id === objectId) ?? this.map.objects.find((obj) => obj.id === objectId)!;
    const encounter = this.state.dungeon?.blueprint.encounters.find((entry) => entry.objectId === objectId);
    this.state.pending = { objectId, worldId: this.map.id, mapId: obj.encounterMap!, seed: encounter?.seed ?? this.engine.random.int(-2147483648, 2147483647) };
    if (encounter?.kind === 'boss' && this.state.dungeon) {
      const dungeon = this.content.data.dungeons.find((d) => d.id === this.state.dungeon!.blueprint.definitionId)!;
      recordTitleEvidence(this.state.hero, `guardian/${dungeon.id}/${dungeon.bossId}`);
    }
    this.state.encounterCount++; this.commit({ type: 'ENCOUNTER_STARTED', objectId });
  }
  private leaveDungeon(completed = false) {
    const run = this.state.dungeon;
    if (!run) throw new Error('You are not inside a dungeon');
    if (completed) recordTitleEvidence(this.state.hero, `clear/${run.blueprint.definitionId}`);
    if (completed) recordQuestWorldEvidence(this.state.hero, { kind: 'clearDungeon', dungeonId: run.blueprint.definitionId }, this.content);
    this.state.worldId = run.returnTo.worldId; this.state.position = { ...run.returnTo.position }; this.state.dungeon = undefined;
    this.dungeonMap = undefined; this.spawnWorld(); this.message = 'Returned to the refuge. Your earned loot is safe; dungeon effects and keys have faded.';
    this.commit({ type: 'MAP_CHANGED', mapId: this.map.id });
  }
  private requireExploring() { if (this.mutationsLocked) throw new Error('Save pending. Retry before continuing.'); if (this.state.pending) throw new Error('Finish the encounter before exploring'); }
  private requireService(objectId: string, kinds: readonly WorldMap['objects'][number]['kind'][]) {
    if (this.hostManaged) throw new Error('Use the host durable progression operation');
    this.requireExploring();
    const object = this.map.objects.find((entry) => entry.id === objectId);
    if (this.state.dungeon || !this.map.theme || this.activeService !== objectId || !object || !kinds.includes(object.kind) || distance(object, this.state.position) > 1) throw new Error('Approach and speak to this service first');
    return object;
  }
  private registerServices() {
    const content = this.content;
    const changed = (objectId: string, message: string) => { this.message = message; this.commit({ type: 'WORLD_INTERACTED', objectId, message }); };
    this.engine.commands.register('CLOSE_SERVICE', () => { this.requireExploring(); this.activeService = undefined; this.refresh(); });
    this.engine.commands.register('BUY_ITEM', ({ objectId, itemId, quantity }) => {
      const object = this.requireService(objectId, ['merchant']);
      const shop = content.data.shops.find((shop) => shop.id === object.shopId)!;
      if (!shop.items.includes(itemId)) throw new Error('This merchant does not sell that item');
      const item = content.item(itemId); const total = item.price * quantity;
      if (this.state.hero.gold < total) throw new Error('Not enough gold');
      const hero = cloneData(this.state.hero); addItem(hero, itemId, quantity, content); hero.gold -= total;
      this.state.hero = hero; changed(objectId, `Bought ${item.name} ×${quantity} for ${total} gold.`);
    });
    this.engine.commands.register('SELL_ITEM', ({ objectId, item: reference, quantity }) => {
      const object = this.requireService(objectId, ['merchant']);
      if (!content.data.shops.find((shop) => shop.id === object.shopId)!.buysItems) throw new Error('This merchant does not buy items');
      const item = ownedDefinition(this.state.hero, reference, content);
      if (item.kind === 'armor' && 'itemId' in reference) throw new Error('Choose an individual armor copy');
      if (item.kind === 'titleCoupon') throw new Error('Keep title coupons for town redemption; they cannot be sold');
      if (item.kind === 'incompleteBook') throw new Error('Unfinished books cannot be sold');
      const total = Math.floor(item.price / 2) * quantity;
      if (this.state.hero.gold + total > 1000000) throw new Error('Your gold purse is full');
      const hero = cloneData(this.state.hero); removeOwnedItem(hero, reference, quantity); hero.gold += total;
      this.state.hero = hero; changed(objectId, `Sold ${item.name} ×${quantity} for ${total} gold.`);
    });
    this.engine.commands.register('REPAIR_WEAPON', ({ objectId, weaponId }) => {
      const object = this.requireService(objectId, ['merchant']);
      if (content.data.shops.find((shop) => shop.id === object.shopId)!.kind !== 'blacksmith') throw new Error('Visit the blacksmith for repairs');
      const weapon = this.state.hero.weapons[weaponId];
      if (!weapon) throw new Error('This weapon is not in your pack');
      const item = content.item(weapon.itemId); const cost = repairPrice(weapon, content);
      if (weapon.durability === item.maxDurability) throw new Error('This weapon needs no repairs');
      if (this.state.hero.gold < cost) throw new Error('Not enough gold');
      weapon.durability = item.maxDurability!; this.state.hero.gold -= cost;
      changed(objectId, `Repaired ${item.name} for ${cost} gold.`);
    });
    this.engine.commands.register('HEAL', ({ objectId }) => {
      const object = this.requireService(objectId, ['healer']); const hero = this.state.hero;
      const stats = heroStats(hero, content);
      if (hero.health === stats.maxHealth && hero.mana === stats.maxMana && hero.stamina === stats.maxStamina && hero.wounds === 0 && hero.fullness === 100) throw new Error('You are already fully recovered');
      if (hero.gold < object.healingCost!) throw new Error('Not enough gold');
      hero.gold -= object.healingCost!; restoreHero(hero, content);
      changed(objectId, `The healer restores your resources, wounds and fullness for ${object.healingCost} gold.`);
    });
    this.engine.commands.register('OFFER_ITEM', ({ objectId, item: reference }) => {
      const object = this.requireService(objectId, ['altar', 'dungeonEntrance']);
      const definition = content.data.dungeons.find((entry) => entry.id === object.dungeonId);
      if (!definition) throw new Error('This dungeon is unavailable');
      const hero = cloneData(this.state.hero); const item = ownedDefinition(hero, reference, content);
      if (item.kind === 'armor' && 'itemId' in reference) throw new Error('Choose an individual armor copy');
      if (item.kind === 'titleCoupon') throw new Error('Keep title coupons for town redemption; they cannot be offered');
      if (item.kind === 'incompleteBook') throw new Error('Keep the unfinished book for its collection');
      removeOwnedItem(hero, reference, 1);
      // Stage RNG and the entire run before spending the offering or changing the live campaign.
      const random = createGameRandom(this.state.seed); random.restore(this.engine.random.snapshot());
      const blueprint = generateDungeon(definition, random.int(-2147483648, 2147483647), hero.classId);
      const dungeon = createDungeonRun(blueprint, { worldId: this.state.worldId, position: { ...this.state.position } });
      validateDungeon(dungeon, content);
      const staged = validateCampaign({ ...this.state, hero, dungeon, randomState: random.snapshot(), worldId: blueprint.world.id, position: { ...blueprint.world.entry } }, content);
      freezeDungeonBlueprint(staged.dungeon!.blueprint);
      this.state = staged; this.engine.random.restore(staged.randomState); this.activeService = undefined;
      this.dungeonMap = undefined; this.spawnWorld();
      this.message = `The goddess accepts ${item.name}. Her sanctuary statue can return you to town.`;
      this.commit({ type: 'MAP_CHANGED', mapId: this.map.id });
    });
  }
  private registerEnchanting() {
    this.engine.commands.register('LOCK_EQUIPMENT', ({ target, locked }) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(); const hero = cloneData(this.state.hero); ownedEquipment(hero, target).locked = locked;
      this.state.hero = hero; this.message = locked ? 'Equipment locked. It cannot be sold, offered, enchanted or burned.' : 'Equipment unlocked.';
      this.commit({ type: 'EQUIPMENT_CHANGED' });
    });
    const operation = (command: Extract<GameCommand, { type: 'APPLY_ENCHANT' | 'BURN_EQUIPMENT' }>) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      const receipt = operationReceipt(this.state.hero, command.operationId);
      if (receipt) { if (receipt.kind !== (command.type === 'APPLY_ENCHANT' ? 'apply' : 'burn')) throw new Error('Operation ID belongs to another action'); this.message = `This operation was already saved. ${receipt.message}`; this.refresh(); return; }
      if (command.revision !== this.snapshot.revision) throw new Error('The campaign changed. Preview this enchant operation again.');
      const object = this.requireService(command.objectId, ['merchant', 'npc']);
      if (!object.enchanting) throw new Error('This town service does not offer enchanting');
      const result = command.type === 'APPLY_ENCHANT' ? applyEnchant(this.state.hero, command, this.content) : burnEquipment(this.state.hero, command, this.content);
      this.state.hero = result.hero; this.message = result.receipt.message;
      this.commit({ type: 'WORLD_INTERACTED', objectId: object.id, message: this.message });
    };
    this.engine.commands.register('APPLY_ENCHANT', operation); this.engine.commands.register('BURN_EQUIPMENT', operation);
  }
  private registerProgression() {
    const town = () => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      if (this.state.dungeon || !this.map.theme) throw new Error('Return to town to rank up or learn skills');
    };
    this.engine.commands.register('LEARN_SKILL', ({ objectId, skillId }) => {
      town();
      const object = this.requireService(objectId, ['npc']);
      const offer = object?.lessons.find((o) => o.skillId === skillId);
      if (!object || !offer || distance(object, this.state.position) > 1) throw new Error('Approach the instructor for this lesson');
      if (this.state.hero.gold < offer.fee) throw new Error('Not enough gold for this lesson');
      const hero = learnSkill(this.state.hero, skillId, this.content); hero.gold -= offer.fee;
      if (object.id === 'keeper' && skillId === 'smash' && !hero.claimedMilestones.includes('intro-melee-lesson')) {
        hero.claimedMilestones.push('intro-melee-lesson'); hero.ap = Math.min(1000000, hero.ap + 3);
      }
      this.state.hero = hero; this.message = `Learned ${this.content.skill(skillId).name} · Rank F. ${skillId === 'smash' && object.id === 'keeper' ? 'Introductory lesson awards 3 AP once.' : 'Training starts at zero.'}`;
      this.commit({ type: 'SKILL_LEARNED', skillId, rank: 'F' });
    });
    this.engine.commands.register('READ_SKILL_BOOK', ({ itemId }) => {
      town(); this.state.hero = readSkillBook(this.state.hero, itemId, this.content);
      const skillId = this.content.item(itemId).skillId!; this.message = `Learned ${this.content.skill(skillId).name} · Rank F.`;
      this.commit({ type: 'SKILL_LEARNED', skillId, rank: 'F' });
    });
    this.engine.commands.register('INSERT_SKILL_PAGE', ({ recipeId, pageId }) => {
      town(); this.state.hero = insertSkillPage(this.state.hero, recipeId, pageId, this.content);
      this.message = this.state.hero.bookCollections[recipeId].completed ? 'The manual is complete. Read it to learn the skill.' : 'Page inserted into your manual.';
      this.commit({ type: 'SKILL_PAGE_INSERTED', recipeId, pageId });
    });
    this.engine.commands.register('RANK_UP_SKILL', ({ skillId }) => {
      town(); this.state.hero = rankUpSkill(this.state.hero, skillId, this.content);
      this.message = `${this.content.skill(skillId).name} advanced to Rank ${this.state.hero.learnedSkills[skillId].rank}.`;
      this.commit({ type: 'SKILL_RANKED_UP', skillId, rank: this.state.hero.learnedSkills[skillId].rank });
    });
  }
  private spawnWorld() {
    this.engine.world.clear();
    const hero = this.content.spawn(this.state.hero.classId, 'player', 'player', this.state.position.x, this.state.position.y);
    if (this.characterName) hero.name = this.characterName;
    applyHero(hero, this.state.hero, this.content, this.state.dungeon?.effects); this.engine.spawn(hero);
    this.map.objects.forEach((obj) => this.engine.spawn({ id: obj.id, name: obj.name, position: { x: obj.x, y: obj.y } }));
  }
  private commit(event: GameEvent) {
    if (event.type === 'MAP_CHANGED') recordQuestWorldEvidence(this.state.hero, { kind: 'visit', worldId: event.mapId }, this.content);
    if (this.state.dungeon) recordEnteredDungeon(this.state.hero, this.state.dungeon.blueprint.definitionId);
    reconcileQuests(this.state.hero, this.content);
    const previousTitles = { ...this.state.hero.titleCollection.selected };
    const awarded = reconcileTitles(this.state.hero, this.content, event.type === 'QUEST_CLAIMED' ? `quest/${event.questId}/once` : event.type === 'LOOT_RECEIVED' ? `encounter/${this.state.encounterCount}` : `progression/${event.type}`, this.staging || !this.hostManaged);
    this.message += clearedTitleMessage(previousTitles, this.state.hero);
    if (awarded.length) this.message += ` Earned: ${awarded.map((id) => this.content.data.titles.find((t) => t.id === id)!.name).join(', ')}.`;
    this.state.randomState = this.engine.random.snapshot(); this.refresh();
    if (this.staging) this.committedEvents.push(event); else this.engine.events.emit(event);
  }
  private refresh() {
    reconcileQuests(this.state.hero, this.content, this.activeService && !this.state.dungeon && !this.state.pending
      ? { worldId: this.state.worldId, objectId: this.activeService } : undefined);
    const player = this.engine.getEntity('player');
    if (player) applyHero(player, this.state.hero, this.content, this.state.dungeon?.effects);
    this.snapshot = { state: cloneData(this.state), map: this.map, message: this.message, revision: ++nextViewRevision, activeService: this.activeService };
    this.listeners.forEach((listener) => listener());
  }
  titleCatchupCandidate() {
    const candidate = new JourneySession(this.content, this.toSave(), undefined, this.characterName);
    candidate.staging = true;
    if (candidate.state.dungeon) recordEnteredDungeon(candidate.state.hero, candidate.state.dungeon.blueprint.definitionId);
    const awards = reconcileTitles(candidate.state.hero, this.content, 'load/progression');
    candidate.message = (awards.length ? `Earned: ${awards.map((id) => this.content.data.titles.find((t) => t.id === id)!.name).join(', ')}.` : 'Title collection restored.') + clearedTitleMessage(this.state.hero.titleCollection.selected, candidate.state.hero);
    candidate.refresh();
    if (JSON.stringify(candidate.state.hero.titleCollection) === JSON.stringify(this.state.hero.titleCollection) && JSON.stringify(candidate.state.hero.earnedTitles) === JSON.stringify(this.state.hero.earnedTitles)) { candidate.dispose(); return undefined; }
    validateCampaign(candidate.toSave(), this.content); return candidate;
  }
  private registerTitles() {
    const town = () => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring();
      if (this.state.dungeon || !this.map.theme) throw new Error('Change titles in town');
    };
    this.engine.commands.register('SELECT_TITLE', ({ slot, titleId }) => {
      town(); this.state.hero = selectTitle(this.state.hero, slot, titleId, this.content);
      this.message = titleId ? `Selected ${this.content.data.titles.find((t) => t.id === titleId)!.name}.` : `Cleared ${slot === 'first' ? 'First' : 'Second'} Title.`;
      this.commit({ type: 'EQUIPMENT_CHANGED' });
    });
    this.engine.commands.register('UNLOCK_TITLE_COUPON', ({ itemId }) => {
      town(); this.state.hero = unlockTitleCoupon(this.state.hero, itemId, this.content);
      this.message = `Earned ${this.content.data.titles.find((t) => t.id === this.content.item(itemId).titleId)!.name}. Choose it in the title collection.`;
      this.commit({ type: 'EQUIPMENT_CHANGED' });
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
      if (this.state.dungeon || !this.map.theme) throw new Error('Return to town for quest acceptance and claims');
    };
    const atNpc = (npc: { worldId: string; objectId: string }, objectId?: string) => {
      if (npc.worldId !== this.state.worldId || objectId !== npc.objectId) throw new Error('Return to the quest’s named NPC');
      this.requireService(npc.objectId, ['npc', 'healer', 'merchant']);
    };
    this.engine.commands.register('ACCEPT_QUEST', ({ questId, objectId }) => {
      town(); const definition = quest(questId);
      if (definition.offerNpc) atNpc(definition.offerNpc, objectId);
      this.state.hero = acceptQuest(this.state.hero, definition, this.content);
      this.message = `Accepted ${definition.name}.`;
      this.commit({ type: 'QUEST_ACCEPTED', questId });
    });
    this.engine.commands.register('CLAIM_QUEST', ({ questId, objectId }) => {
      town(); const definition = quest(questId);
      if (definition.claimNpc) atNpc(definition.claimNpc, objectId);
      this.state.hero = claimQuest(this.state.hero, definition, this.content);
      this.message = `Completed ${definition.name}. Rewards saved.${definition.rewards.titles.length ? ` Earned: ${definition.rewards.titles.map((id) => this.content.data.titles.find((t) => t.id === id)!.name).join(', ')}.` : ''}`;
      this.commit({ type: 'QUEST_CLAIMED', questId });
    });
    this.engine.commands.register('TRACK_QUEST_OBJECTIVE', ({ questId, objectiveId }) => {
      if (this.hostManaged) throw new Error('Use the host durable progression operation');
      this.requireExploring(); trackObjective(this.state.hero, quest(questId), objectiveId);
      this.message = 'Quest tracker updated.';
      this.commit({ type: 'QUEST_TRACKING_CHANGED' });
    });
  }
}

function recordEnteredDungeon(hero: CampaignState['hero'], id: string) { hero.titleCollection.evidence[`entered/${id}`] = 1; }

function clearedTitleMessage(previous: CampaignState['hero']['titleCollection']['selected'], hero: CampaignState['hero']) {
  return (['first', 'second'] as const).filter((slot) => previous[slot] && !hero.titleCollection.selected[slot]).map((slot) => ` Cleared ${slot === 'first' ? 'First' : 'Second'} Title: its required skill rank is no longer eligible. The earned achievement is preserved.`).join('');
}
