import { cloneData } from '../engine/cloneData';
import { createGameEngine } from '../engine/GameEngine';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { GameCommand } from '../engine/commands';
import type { GameEvent } from '../engine/events';
import { addItem, createHero, consumeItem, grantExperience, heroStats, rollLoot, applyHero } from '../engine/rpg/Character';
import { distance, findPath, isWalkable } from '../engine/world/TileMap';
import type { WorldMap } from '../data/schemas/world';
import { validateCampaign, type CampaignState } from '../persistence/SaveSchema';
import { BattleSession } from './BattleSession';
import { bossCleared, createDungeonRun, dungeonObjectClaimed, freezeDungeonBlueprint, generateDungeon, inRoom, projectDungeonMap, remainingEnemies, validateDungeon } from '../engine/dungeon/Dungeon';

export interface JourneyView { state: CampaignState; map: WorldMap; message: string; revision: number }
/** Owns exploration state. React sends commands and reads detached projections. */
export class JourneySession {
  readonly engine;
  private state: CampaignState;
  private snapshot!: JourneyView;
  private listeners = new Set<() => void>();
  private revision = 0;
  private message = 'Speak to the keeper, collect supplies, then travel east.';
  private disposed = false;
  private dispatching = false;
  private dungeonMap?: WorldMap;
  constructor(readonly content: ContentRegistry, restored?: CampaignState, seed = 12345, readonly characterName?: string) {
    this.engine = createGameEngine({ seed: restored?.seed ?? seed });
    const first = content.data.worlds[0];
    if (!first) throw new Error('No exploration map defined');
    this.state = restored ? validateCampaign(restored, content) : { seed, randomState: this.engine.random.snapshot(),
      hero: createHero(content), worldId: first.id, position: { ...first.entry }, opened: [], cleared: [], encounterCount: 0,
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
      this.state.position = position; this.engine.getEntity('player')!.position = { ...position };
      this.message = '';
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
      switch (obj.kind) {
        case 'npc': this.message = obj.dialogue; break;
        case 'chest':
          if (this.isClaimed(obj.id)) throw new Error('This chest is empty');
          addItem(this.state.hero, obj.itemId!, obj.quantity);
          if (run) run.opened.push(obj.id); else this.state.opened.push(this.key(obj.id));
          this.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}.`; break;
        case 'dungeonEntrance': {
          const definition = content.data.dungeons.find((definition) => definition.id === obj.dungeonId);
          if (run || !definition) throw new Error('This dungeon is unavailable');
          const blueprint = generateDungeon(definition, this.engine.random.int(-2147483648, 2147483647), this.state.hero.classId);
          const dungeon = createDungeonRun(blueprint, { worldId: this.state.worldId, position: { ...this.state.position } });
          validateDungeon(dungeon, content);
          freezeDungeonBlueprint(blueprint);
          this.state.dungeon = dungeon; this.state.worldId = blueprint.world.id; this.state.position = { ...blueprint.world.entry };
          this.dungeonMap = undefined; this.spawnWorld();
          this.message = 'The goddess watches over your arrival. Her statue can return you to the refuge.';
          this.commit({ type: 'MAP_CHANGED', mapId: this.map.id }); return;
        }
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
          addItem(this.state.hero, obj.itemId!, obj.quantity);
          run.opened.push(obj.id); run.selectedChest = obj.id; run.treasureKey = { status: 'spent' };
          this.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}. The other four chests are sealed. You can now return to the refuge.`; break;
        case 'rest': {
          const stats = heroStats(this.state.hero, content); this.state.hero.health = stats.maxHealth; this.state.hero.mana = stats.maxMana;
          this.message = 'The ember restores your health and mana.'; break;
        }
        case 'portal': {
          const destination = content.data.worlds.find((map) => map.id === obj.destination)!;
          this.state.worldId = destination.id; this.state.position = { ...destination.entry }; this.spawnWorld();
          this.message = `Entered ${destination.name}.`; this.commit({ type: 'MAP_CHANGED', mapId: destination.id }); return;
        }
        case 'encounter': throw new Error('Step onto the guardian tile to begin the encounter');
      }
      this.dungeonMap = undefined;
      this.commit({ type: 'WORLD_INTERACTED', objectId, message: this.message });
    });
    this.engine.commands.register('EXIT_DUNGEON', () => {
      this.requireExploring();
      const run = this.state.dungeon; const room = run?.blueprint.rooms.find((room) => room.kind === 'treasure');
      if (!run?.selectedChest || !room || !inRoom(room, this.state.position)) throw new Error('Claim a final chest in the treasure room before returning');
      this.leaveDungeon();
    });
    this.engine.commands.register('EQUIP_ITEM', ({ itemId }) => {
      this.requireExploring(); const item = content.item(itemId);
      if (item.kind === 'consumable' || !this.state.hero.inventory[itemId]) throw new Error('This item cannot be equipped');
      this.state.hero.equipment[item.kind] = itemId; this.message = `Equipped ${item.name}.`;
      this.commit({ type: 'EQUIPMENT_CHANGED', itemId });
    });
    this.engine.commands.register('UNEQUIP_ITEM', ({ slot }) => {
      this.requireExploring(); delete this.state.hero.equipment[slot]; this.commit({ type: 'EQUIPMENT_CHANGED' });
    });
    this.engine.commands.register('USE_ITEM', ({ sourceId, targetId, itemId }) => {
      this.requireExploring(); const item = content.item(itemId);
      if (sourceId !== 'player' || targetId !== 'player' || item.kind !== 'consumable') throw new Error('Invalid item target');
      consumeItem(this.state.hero.inventory, itemId);
      this.state.hero.health = Math.min(heroStats(this.state.hero, content).maxHealth, this.state.hero.health + item.power);
      this.message = `Used ${item.name}.`; this.commit({ type: 'ITEM_USED', sourceId, itemId });
    });
    this.refresh();
  }
  get map() { return this.state.dungeon ? this.dungeonMap ??= projectDungeonMap(this.state.dungeon) : this.content.data.worlds.find((map) => map.id === this.state.worldId)!; }
  isClaimed(objectId: string) { return this.state.dungeon ? dungeonObjectClaimed(this.state.dungeon, objectId) : this.state.opened.includes(this.key(objectId)) || this.state.cleared.includes(this.key(objectId)); }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  toSave(): CampaignState { return cloneData(this.snapshot.state); }
  dispatch(command: GameCommand) {
    if (this.disposed || this.dispatching) throw new Error('Journey is disposed or a command is already resolving');
    this.dispatching = true;
    try { this.engine.dispatch(command); } finally { this.dispatching = false; }
  }
  createBattle(): BattleSession {
    if (!this.state.pending) throw new Error('No pending encounter');
    const encounter = this.state.dungeon?.blueprint.encounters.find((entry) => entry.objectId === this.state.pending!.objectId);
    return new BattleSession(this.content, this.state.pending.seed, encounter?.map ?? this.state.pending.mapId, cloneData(this.state.hero), this.state.dungeon?.effects, this.characterName);
  }
  finishBattle(battle: BattleSession) {
    if (this.disposed || !this.state.pending || !battle.combat.result || battle.engine.seed !== this.state.pending.seed || battle.map.id !== this.state.pending.mapId) throw new Error('Encounter is not ready to finish');
    const hero = cloneData(this.state.hero);
    const entity = battle.engine.world.entities.find((entity) => entity.player)!;
    hero.health = Math.max(1, entity.health!.current); hero.mana = entity.mana!.current;
    hero.inventory = { ...entity.inventory! };
    if (battle.combat.result === 'victory') {
      let gold = 0; let experience = 0;
      const drops = battle.map.spawns.filter((spawn) => spawn.kind === 'enemy').map((spawn) => rollLoot(spawn.definitionId, this.content, this.engine.random));
      for (const drop of drops) {
        gold += drop.gold; experience += drop.experience;
        for (const item of drop.items) hero.inventory[item.itemId] = Math.min(999, (hero.inventory[item.itemId] ?? 0) + item.quantity);
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
      const stats = heroStats(hero, this.content); hero.health = stats.maxHealth; hero.mana = stats.maxMana;
      this.state.hero = hero; this.state.pending = undefined; this.state.dungeon = undefined; this.dungeonMap = undefined; this.state.worldId = this.content.data.worlds[0].id;
      this.state.position = { ...this.map.entry }; this.spawnWorld();
      this.message = 'Reborn at the refuge. Half your gold was lost.';
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
    this.state.encounterCount++; this.commit({ type: 'ENCOUNTER_STARTED', objectId });
  }
  private leaveDungeon() {
    const run = this.state.dungeon;
    if (!run) throw new Error('You are not inside a dungeon');
    this.state.worldId = run.returnTo.worldId; this.state.position = { ...run.returnTo.position }; this.state.dungeon = undefined;
    this.dungeonMap = undefined; this.spawnWorld(); this.message = 'Returned to the refuge. Your earned loot is safe; dungeon effects and keys have faded.';
    this.commit({ type: 'MAP_CHANGED', mapId: this.map.id });
  }
  private requireExploring() { if (this.state.pending) throw new Error('Finish the encounter before exploring'); }
  private spawnWorld() {
    this.engine.world.clear();
    const hero = this.content.spawn(this.state.hero.classId, 'player', 'player', this.state.position.x, this.state.position.y);
    if (this.characterName) hero.name = this.characterName;
    applyHero(hero, this.state.hero, this.content, this.state.dungeon?.effects); this.engine.spawn(hero);
    this.map.objects.forEach((obj) => this.engine.spawn({ id: obj.id, name: obj.name, position: { x: obj.x, y: obj.y } }));
  }
  private commit(event: GameEvent) { this.state.randomState = this.engine.random.snapshot(); this.refresh(); this.engine.events.emit(event); }
  private refresh() {
    const player = this.engine.getEntity('player');
    if (player) applyHero(player, this.state.hero, this.content, this.state.dungeon?.effects);
    this.snapshot = { state: cloneData(this.state), map: this.map, message: this.message, revision: ++this.revision };
    this.listeners.forEach((listener) => listener());
  }
}
