import { skillForEntity, skillEquipmentReason } from '../rpg/Skills';
import { EnemyBattleEngine } from './enemies/EnemyBattleEngine';
import { createActor } from 'xstate';
import type { GameEngine } from '../GameEngine';
import type { GameSystem } from '../GameSystem';
import type { Unsubscribe } from '../EventBus';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { CombatSystem } from '../ecs/systems/CombatSystem';
import { validateCombatEntity } from './AttackResolver';
import { staminaCost } from '../rpg/Resources';
import { prepareBattleItem } from '../rpg/Consumables';
import { createBattleMachine, type BattleAction } from './BattleMachine';

export type BattlePhase =
  | 'initializing'
  | 'selectingAction'
  | 'selectingTarget'
  | 'executing'
  | 'enemyTurn'
  | 'victory'
  | 'defeat';

export class BattleController implements GameSystem {
  private actor = createActor(createBattleMachine());
  private engine?: GameEngine;
  private readonly enemyBattle: EnemyBattleEngine;
  constructor(
    readonly combat: CombatSystem,
    readonly content: ContentRegistry,
  ) {
    this.enemyBattle = new EnemyBattleEngine(content);
  }

  exportState() {
    return this.enemyBattle.exportState();
  }
  restoreState(state: ReturnType<EnemyBattleEngine['exportState']>) {
    this.enemyBattle.restoreState(state);
    this.actor.send({ type: 'SYNC', ...this.summary() });
  }
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
  get context() {
    return this.actor.getSnapshot().context;
  }
  get isResolving() {
    return (
      this.actor.getSnapshot().matches({ playerTurn: 'executing' }) ||
      this.actor.getSnapshot().matches({ enemyTurn: 'executing' })
    );
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
      cleanups.push(
        engine.commands.register('START_BATTLE', () => {
          this.requirePhase('initializing');
          this.actor.send({ type: 'START', ...this.summary() });
        }),
      );
      cleanups.push(
        engine.commands.register('SELECT_ACTION', ({ action, skillId, itemId }) => {
          this.requirePhase('selectingAction', 'selectingTarget');
          const source = engine.getEntity(this.combat.currentTurn()!);
          validateCombatEntity(source);
          if (action === 'item') prepareBattleItem(source, itemId!, this.content);
          if (action === 'skill') {
            const skill = skillForEntity(this.content, source, skillId!);
            const reason = skillEquipmentReason(source, skill, this.content);
            if (reason) throw new Error(reason);
            if ((source.cooldowns?.[skill.id] ?? 0) > 0) throw new Error('Skill is on cooldown');
            if (
              skill.battleUsable === false ||
              !source.skills?.includes(skill.id) ||
              !source.mana ||
              source.mana.current < skill.manaCost
            ) {
              throw new Error('Skill is unavailable or mana is insufficient');
            }
            const cost =
              skill.effect === 'heal' && skill.target === 'ally'
                ? 0
                : staminaCost(source, skill.staminaCost);
            if (source.stamina && source.stamina.current < cost)
              throw new Error('Insufficient stamina');
          }
          this.actor.send({ type: 'SELECT_ACTION', action: { action, skillId, itemId } });
        }),
      );
      cleanups.push(
        engine.commands.register('SELECT_TARGET', ({ targetId }) => {
          this.requirePhase('selectingTarget');
          if (!this.validTargetIds().includes(targetId)) throw new Error('Invalid selected target');
          this.actor.send({ type: 'SELECT_TARGET', targetId });
        }),
      );
      cleanups.push(
        engine.commands.register('CANCEL_ACTION', () => {
          this.requirePhase('selectingTarget');
          this.actor.send({ type: 'CANCEL' });
        }),
      );
      cleanups.push(
        engine.commands.register('CONFIRM_ACTION', () => {
          this.requirePhase('selectingTarget');
          const { action, targetId } = this.context;
          if (!action || !targetId || !this.validTargetIds().includes(targetId))
            throw new Error('Select a living target before confirming');
          this.actor.send({ type: 'CONFIRM' });
          this.resolve(action, targetId);
        }),
      );
      cleanups.push(
        engine.commands.register('ADVANCE_ENEMY_TURN', () => {
          this.requirePhase('enemyTurn');
          const source = engine.getEntity(this.combat.currentTurn()!);
          validateCombatEntity(source);
          const randomState = engine.random.snapshot();
          const completed = this.combat.completedActions;
          try {
            const decision = this.enemyBattle.decide(engine, this.combat, source);
            if (!this.validTargetIds(decision.action).includes(decision.targetId))
              throw new Error('Invalid enemy target');
            this.actor.send({ type: 'ENEMY_EXECUTE' });
            this.resolve(decision.action, decision.targetId);
          } catch (error) {
            if (this.combat.completedActions === completed) engine.random.restore(randomState);
            throw error;
          }
        }),
      );
      cleanups.push(
        engine.events.on('ENTITY_REMOVED', ({ entityId }) => {
          this.enemyBattle.forget(entityId);
          this.actor.send({ type: 'SYNC', ...this.summary() });
        }),
      );
    } catch (error) {
      cleanups.reverse().forEach((cleanup) => cleanup());
      this.actor.stop();
      this.enemyBattle.dispose();
      this.engine = undefined;
      throw error;
    }
    return () => {
      cleanups.reverse().forEach((cleanup) => cleanup());
      this.actor.stop();
      this.enemyBattle.dispose();
      this.engine = undefined;
    };
  }

  validTargetIds(action = this.context.action): string[] {
    if (!this.engine || !action) return [];
    const source = this.engine.getEntity(this.combat.currentTurn()!);
    if (!source) return [];
    const mode = ['rest', 'defend', 'item'].includes(action.action)
      ? 'self'
      : action.action === 'skill'
        ? this.content.skill(action.skillId!).target
        : 'enemy';
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
    if (!phases.includes(this.phase))
      throw new Error(`Command is unavailable during ${this.phase}`);
  }
  private summary() {
    const turnId = this.combat.currentTurn();
    return {
      turnId,
      side:
        turnId && this.engine?.getEntity(turnId)?.player ? ('player' as const) : ('enemy' as const),
      result: this.combat.result,
    };
  }
  private resolve(action: BattleAction, targetId: string) {
    const sourceId = this.combat.currentTurn()!;
    const completedActions = this.combat.completedActions;
    try {
      this.engine!.dispatch(
        action.action === 'defend'
          ? { type: 'DEFEND', entityId: sourceId }
          : action.action === 'rest'
            ? { type: 'REST', entityId: sourceId }
            : action.action === 'attack'
              ? { type: 'ATTACK', attackerId: sourceId, targetId }
              : action.action === 'item'
                ? { type: 'USE_ITEM', sourceId, targetId, itemId: action.itemId! }
                : { type: 'USE_SKILL', sourceId, targetId, skillId: action.skillId! },
      );
    } catch (error) {
      if (
        this.engine!.getEntity(sourceId)?.enemy &&
        this.combat.completedActions !== completedActions
      )
        this.enemyBattle.recordAcceptedAction(sourceId, action);
      if (
        this.combat.completedActions !== completedActions ||
        this.combat.result ||
        this.combat.currentTurn() !== sourceId
      )
        this.actor.send({ type: 'RESOLVED', ...this.summary() });
      else
        this.actor.send({
          type: 'FAILED',
          error: error instanceof Error ? error.message : 'Action failed',
        });
      throw error;
    }
    if (this.engine!.getEntity(sourceId)?.enemy)
      this.enemyBattle.recordAcceptedAction(sourceId, action);
    this.actor.send({ type: 'RESOLVED', ...this.summary() });
  }
}
