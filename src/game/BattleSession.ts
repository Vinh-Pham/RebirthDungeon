import { applyHero, type Hero } from '../engine/rpg/Character';
import { createGameEngine } from '../engine/GameEngine';
import { CombatSystem } from '../engine/ecs/systems/CombatSystem';
import { BattleController, type BattlePhase } from '../engine/battle/BattleController';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { GameCommand } from '../engine/commands';
import type { GameEvent } from '../engine/events';
import type { Unsubscribe } from '../engine/EventBus';
import type { TileMap } from '../data/schemas/content';
import { MapSchema } from '../data/schemas/content';
import { PresentationQueue } from '../renderer/animations/PresentationQueue';
import type { RenderEntity } from '../renderer/types';
import { createUIStore } from '../state/uiStore';

export interface BattleView {
  phase: BattlePhase;
  turnId?: string;
  selectedTargetId?: string;
  selectedAction?: { action: 'attack' | 'skill' | 'item'; skillId?: string; itemId?: string };
  entities: readonly RenderEntity[];
  targets: readonly string[];
  log: readonly string[];
}

/** An event-driven, read-only projection for UI; ECS remains authoritative. */
export class BattleSession {
  readonly engine;
  readonly combat: CombatSystem;
  readonly battle: BattleController;
  readonly presentation;
  readonly ui = createUIStore();
  readonly map: TileMap;
  readonly initialEntities: readonly RenderEntity[];
  private snapshot!: BattleView;
  private listeners = new Set<() => void>();
  private cleanup: Unsubscribe[] = [];
  private log: string[] = [];
  private disposed = false;

  constructor(readonly content: ContentRegistry, seed = 12345, mapId: string | TileMap = 'chamber', hero?: Hero, effects: readonly { statusId: string; stacks: number }[] = [], characterName?: string) {
    const map = typeof mapId === 'string' ? content.data.maps.find((entry) => entry.id === mapId) : MapSchema.parse(mapId);
    if (!map) throw new Error(`Unknown map: ${mapId}`);
    this.map = map;
    this.engine = createGameEngine({ seed });
    for (const spawn of map.spawns) this.engine.spawn(content.spawn(spawn.kind === 'player' && hero ? hero.classId : spawn.definitionId, spawn.entityId, spawn.kind,
      spawn.x * map.tileSize, spawn.y * map.tileSize));
    if (hero) for (const entity of this.engine.world.entities) if (entity.player) applyHero(entity, hero, content, effects);
    if (characterName) for (const entity of this.engine.world.entities) if (entity.player) entity.name = characterName;
    this.combat = new CombatSystem(map.spawns.map((spawn) => spawn.entityId), { content,
      canAct: () => this.battle.isResolving });
    this.battle = new BattleController(this.combat, content);
    this.presentation = new PresentationQueue(this.engine);
    this.initialEntities = this.projectEntities();
    this.refresh();
    try {
      this.cleanup.push(this.engine.events.subscribe((event) => { this.record(event); this.refresh(); }));
      this.engine.addSystem(this.combat);
      this.engine.addSystem(this.battle);
      this.cleanup.push(this.battle.subscribe(() => this.refresh()));
      this.engine.dispatch({ type: 'START_BATTLE' });
      this.refresh();
    } catch (error) { this.dispose(); throw error; }
  }
  getSnapshot = (): BattleView => this.snapshot;
  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  };
  dispatch(command: GameCommand): void {
    if (this.disposed) throw new Error('Battle session has been disposed');
    this.engine.dispatch(command);
  }
  advanceEnemyTurns(): void {
    // Consecutive enemies resolve immediately; presentation plays separately.
    while (this.battle.phase === 'enemyTurn') this.dispatch({ type: 'ADVANCE_ENEMY_TURN' });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanup.forEach((cleanup) => cleanup());
    this.presentation.dispose(); this.engine.dispose(); this.listeners.clear();
  }

  private projectEntities(): RenderEntity[] {
    return this.engine.world.entities.filter((entity) => entity.sprite && entity.position && entity.health)
      .map((entity) => ({ id: entity.id, name: entity.name ?? entity.id, side: entity.player ? 'player' : 'enemy',
        x: entity.position!.x, y: entity.position!.y, sprite: { ...entity.sprite!, idleFrames: entity.sprite!.idleFrames ? [...entity.sprite!.idleFrames] : undefined }, health: entity.health!.current,
        maxHealth: entity.health!.max, mana: entity.mana?.current ?? 0, maxMana: entity.mana?.max ?? 0, dead: !!entity.dead }));
  }
  private refresh() {
    this.snapshot = { phase: this.battle.phase, turnId: this.combat.currentTurn(),
      selectedAction: this.battle.context.action ? { ...this.battle.context.action } : undefined, selectedTargetId: this.battle.context.targetId,
      entities: this.projectEntities(), targets: this.battle.validTargetIds(), log: [...this.log] };
    this.listeners.forEach((listener) => listener());
  }
  private record(event: GameEvent) {
    const name = (id: string) => this.engine.getEntity(id)?.name ?? id;
    let line: string | undefined;
    if (event.type === 'DAMAGE_DEALT') line = `${name(event.targetId)} loses ${event.amount} HP${event.critical ? ' · critical' : ''}.`;
    if (event.type === 'ATTACK_MISSED') line = `${name(event.sourceId)} misses.`;
    if (event.type === 'HEALTH_RESTORED') line = `${name(event.targetId)} recovers ${event.amount} HP.`;
    if (event.type === 'SKILL_USED') line = `${name(event.sourceId)} casts ${this.content.skill(event.skillId).name}.`;
    if (event.type === 'ITEM_USED') line = `${name(event.sourceId)} uses ${this.content.item(event.itemId).name}.`;
    if (event.type === 'STATUS_APPLIED') line = `${name(event.entityId)} gains ${this.content.status(event.statusId).name}.`;
    if (event.type === 'STATUS_EXPIRED') line = `${this.content.status(event.statusId).name} fades from ${name(event.entityId)}.`;
    if (event.type === 'ENTITY_DIED') line = `${name(event.entityId)} falls.`;
    if (event.type === 'BATTLE_ENDED') line = event.result === 'victory' ? 'The chamber is clear.' : 'The dungeon claims another warden.';
    if (line) this.log = [...this.log.slice(-7), line];
  }
}
