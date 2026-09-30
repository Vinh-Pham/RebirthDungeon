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
  constructor(readonly content: ContentRegistry, restored?: CampaignState, seed = 12345) {
    this.engine = createGameEngine({ seed: restored?.seed ?? seed });
    const first = content.data.worlds[0];
    if (!first) throw new Error('No exploration map defined');
    this.state = restored ? validateCampaign(restored, content) : { seed, randomState: this.engine.random.snapshot(),
      hero: createHero(content), worldId: first.id, position: { ...first.entry }, opened: [], cleared: [], encounterCount: 0,
      audio: { music: 0.3, sfx: 0.7, enabled: false } };
    if (restored) this.message = 'Your journey has been restored.';
    this.engine.random.restore(this.state.randomState);
    this.spawnWorld();
    this.engine.commands.register('MOVE', ({ entityId, dx, dy }) => {
      this.requireExploring();
      if (entityId !== 'player' || !Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('Move one tile at a time');
      const position = { x: this.state.position.x + dx, y: this.state.position.y + dy };
      if (!isWalkable(this.map, position)) throw new Error('The way is blocked');
      this.state.position = position; this.engine.getEntity('player')!.position = { ...position };
      this.message = '';
      const encounter = this.map.objects.find((obj) => obj.kind === 'encounter' && distance(obj, position) === 0 && !this.state.cleared.includes(this.key(obj.id)));
      if (encounter) {
        this.state.pending = { objectId: encounter.id, worldId: this.map.id, mapId: encounter.encounterMap!, seed: this.engine.random.int(-2147483648, 2147483647) };
        this.state.encounterCount++; this.commit({ type: 'ENCOUNTER_STARTED', objectId: encounter.id });
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
      const obj = this.map.objects.find((obj) => obj.id === objectId);
      if (!obj || distance(obj, this.state.position) > 1) throw new Error('Move next to this object first');
      switch (obj.kind) {
        case 'npc': this.message = obj.dialogue; break;
        case 'chest':
          if (this.state.opened.includes(this.key(obj.id))) throw new Error('This chest is empty');
          addItem(this.state.hero, obj.itemId!, obj.quantity); this.state.opened.push(this.key(obj.id));
          this.message = `Found ${this.content.item(obj.itemId!).name} ×${obj.quantity}.`; break;
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
      this.commit({ type: 'WORLD_INTERACTED', objectId, message: this.message });
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
  get map() { return this.content.data.worlds.find((map) => map.id === this.state.worldId)!; }
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
    return new BattleSession(this.content, this.state.pending.seed, this.state.pending.mapId, cloneData(this.state.hero));
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
      this.state.hero = hero; this.state.cleared.push(this.key(this.state.pending.objectId)); this.state.pending = undefined;
      this.message = `Victory · +${experience} XP · +${gold} gold · loot added to your pack.`;
      this.commit({ type: 'LOOT_RECEIVED', gold, experience });
    } else {
      hero.gold = Math.floor(hero.gold / 2);
      const stats = heroStats(hero, this.content); hero.health = stats.maxHealth; hero.mana = stats.maxMana;
      this.state.hero = hero; this.state.pending = undefined; this.state.worldId = this.content.data.worlds[0].id;
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
  private requireExploring() { if (this.state.pending) throw new Error('Finish the encounter before exploring'); }
  private spawnWorld() {
    this.engine.world.clear();
    const hero = this.content.spawn(this.state.hero.classId, 'player', 'player', this.state.position.x, this.state.position.y);
    applyHero(hero, this.state.hero, this.content); this.engine.spawn(hero);
    this.map.objects.forEach((obj) => this.engine.spawn({ id: obj.id, name: obj.name, position: { x: obj.x, y: obj.y } }));
  }
  private commit(event: GameEvent) { this.state.randomState = this.engine.random.snapshot(); this.refresh(); this.engine.events.emit(event); }
  private refresh() {
    const player = this.engine.getEntity('player');
    if (player) applyHero(player, this.state.hero, this.content);
    this.snapshot = { state: cloneData(this.state), map: this.map, message: this.message, revision: ++this.revision };
    this.listeners.forEach((listener) => listener());
  }
}
