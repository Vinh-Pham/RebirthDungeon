import { createActor } from 'xstate';
import type { GameEngine } from '../GameEngine';
import type { GameSystem } from '../GameSystem';
import type { Unsubscribe } from '../EventBus';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { CombatSystem } from '../ecs/systems/CombatSystem';
import { validateCombatEntity } from './AttackResolver';
import { createBattleMachine, type BattleAction } from './BattleMachine';

export type BattlePhase = 'initializing' | 'selectingAction' | 'selectingTarget' | 'executing' | 'enemyTurn' | 'victory' | 'defeat';

export class BattleController implements GameSystem {
  private actor = createActor(createBattleMachine());
  private engine?: GameEngine;
  constructor(readonly combat: CombatSystem, readonly content: ContentRegistry) {}

  get phase(): BattlePhase {
    const snapshot = this.actor.getSnapshot();
    if (snapshot.matches('victory')) return 'victory';
    if (snapshot.matches('defeat')) return 'defeat';
    if (snapshot.matches('initializing')) return 'initializing';
    if (snapshot.matches({ playerTurn: 'selectingAction' })) return 'selectingAction';
    if (snapshot.matches({ playerTurn: 'selectingTarget' })) return 'selectingTarget';
    if (snapshot.matches({ enemyTurn: 'selectingAction' })) return 'enemyTurn';
    return 'executing';
  }
  get context() { return this.actor.getSnapshot().context; }
  get isResolving() {
    return this.actor.getSnapshot().matches({ playerTurn: 'executing' }) || this.actor.getSnapshot().matches({ enemyTurn: 'executing' });
  }
  subscribe(listener: () => void): Unsubscribe {
    const subscription = this.actor.subscribe(listener);
    return () => subscription.unsubscribe();
  }

  initialize(engine: GameEngine): Unsubscribe {
    if (this.engine) throw new Error('Battle controller already attached');
    this.engine = engine;
    this.actor = createActor(createBattleMachine());
    this.actor.start();
    const cleanups: Unsubscribe[] = [];
    try {
      cleanups.push(engine.commands.register('START_BATTLE', () => {
        this.requirePhase('initializing');
        this.actor.send({ type: 'START', ...this.summary() });
      }));
      cleanups.push(engine.commands.register('SELECT_ACTION', ({ action, skillId, itemId }) => {
        this.requirePhase('selectingAction', 'selectingTarget');
        const source = engine.getEntity(this.combat.currentTurn()!);
        validateCombatEntity(source);
        if (action === 'skill') {
          const skill = this.content.skill(skillId!);
          if (skill.battleUsable === false || !source.skills?.includes(skill.id) || !source.mana || source.mana.current < skill.manaCost) {
            throw new Error('Skill is unavailable or mana is insufficient');
          }
        }
        if (action === 'item' && (this.content.item(itemId!).kind !== 'consumable' || !source.inventory?.[itemId!])) throw new Error('Item is unavailable');
        this.actor.send({ type: 'SELECT_ACTION', action: { action, skillId, itemId } });
      }));
      cleanups.push(engine.commands.register('SELECT_TARGET', ({ targetId }) => {
        this.requirePhase('selectingTarget');
        if (!this.validTargetIds().includes(targetId)) throw new Error('Invalid selected target');
        this.actor.send({ type: 'SELECT_TARGET', targetId });
      }));
      cleanups.push(engine.commands.register('CANCEL_ACTION', () => {
        this.requirePhase('selectingTarget'); this.actor.send({ type: 'CANCEL' });
      }));
      cleanups.push(engine.commands.register('CONFIRM_ACTION', () => {
        this.requirePhase('selectingTarget');
        const { action, targetId } = this.context;
        if (!action || !targetId || !this.validTargetIds().includes(targetId)) throw new Error('Select a living target before confirming');
        this.actor.send({ type: 'CONFIRM' });
        this.resolve(action, targetId);
      }));
      cleanups.push(engine.commands.register('ADVANCE_ENEMY_TURN', () => {
        this.requirePhase('enemyTurn');
        const source = engine.getEntity(this.combat.currentTurn()!);
        validateCombatEntity(source);
        const target = this.combat.turnOrder.map((id) => engine.getEntity(id)!).find((entity) => entity.player && !entity.dead);
        if (!target) throw new Error('No living player target');
        this.actor.send({ type: 'ENEMY_EXECUTE' });
        this.resolve({ action: 'attack' }, target.id);
      }));
      cleanups.push(engine.events.on('ENTITY_REMOVED', () => {
        this.actor.send({ type: 'SYNC', ...this.summary() });
      }));
    } catch (error) {
      cleanups.reverse().forEach((cleanup) => cleanup()); this.actor.stop(); this.engine = undefined; throw error;
    }
    return () => { cleanups.reverse().forEach((cleanup) => cleanup()); this.actor.stop(); this.engine = undefined; };
  }

  validTargetIds(): string[] {
    if (!this.engine || !this.context.action) return [];
    const source = this.engine.getEntity(this.combat.currentTurn()!);
    if (!source) return [];
    const action = this.context.action;
    const mode = action.action === 'item' ? 'self' : action.action === 'skill' ? this.content.skill(action.skillId!).target : 'enemy';
    return this.combat.turnOrder.filter((id) => {
      const target = this.engine!.getEntity(id);
      if (!target?.health?.current || target.dead) return false;
      if (mode === 'self') return target.id === source.id;
      const allied = !!source.player === !!target.player;
      return mode === 'ally' ? allied : !allied;
    });
  }

  update(): void {}
  private requirePhase(...phases: BattlePhase[]) {
    if (!phases.includes(this.phase)) throw new Error(`Command is unavailable during ${this.phase}`);
  }
  private summary() {
    const turnId = this.combat.currentTurn();
    return { turnId, side: turnId && this.engine?.getEntity(turnId)?.player ? 'player' as const : 'enemy' as const,
      result: this.combat.result };
  }
  private resolve(action: BattleAction, targetId: string) {
    const sourceId = this.combat.currentTurn()!;
    try {
      this.engine!.dispatch(action.action === 'attack'
        ? { type: 'ATTACK', attackerId: sourceId, targetId }
        : action.action === 'skill' ? { type: 'USE_SKILL', sourceId, targetId, skillId: action.skillId! }
        : { type: 'USE_ITEM', sourceId, targetId, itemId: action.itemId! });
    } catch (error) {
      if (this.combat.result || this.combat.currentTurn() !== sourceId) this.actor.send({ type: 'RESOLVED', ...this.summary() });
      else this.actor.send({ type: 'FAILED', error: error instanceof Error ? error.message : 'Action failed' });
      throw error;
    }
    this.actor.send({ type: 'RESOLVED', ...this.summary() });
  }
}
