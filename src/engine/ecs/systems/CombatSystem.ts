import type { GameEngine } from '../../GameEngine';
import type { GameSystem } from '../../GameSystem';
import type { GameEvent } from '../../events';
import type { EntityId } from '../Entity';
import { applyDamage } from '../components/Health';
import { effectiveEntity, applyStatus, tickStatuses } from '../../rpg/StatusEffects';
import { consumeItem } from '../../rpg/Character';
import { resolveAttack, validateCombatEntity } from '../../battle/AttackResolver';
import { prepareSkill } from '../../battle/SkillResolver';
import type { ContentRegistry } from '../../data/ContentRegistry';
import { TurnQueue } from '../../battle/TurnQueue';
import { handleDeath } from './DeathSystem';

export type BattleResult = 'victory' | 'defeat';

/** Basic attack/turn coordination. Higher-level action phases belong to Phase 3. */
export class CombatSystem implements GameSystem {
  private readonly participantIds: readonly EntityId[];
  private readonly turns = new TurnQueue();
  private engine?: GameEngine;
  private resolving = false;
  private outcome?: BattleResult;

  constructor(participantIds: readonly EntityId[], private readonly options: { content?: ContentRegistry; canAct?: () => boolean } = {}) {
    if (new Set(participantIds).size !== participantIds.length) throw new Error('Duplicate battle participant');
    this.participantIds = [...participantIds];
  }

  get result(): BattleResult | undefined { return this.outcome; }
  currentTurn(): EntityId | undefined { return this.engine && !this.outcome ? this.turns.current() : undefined; }
  get turnOrder(): readonly EntityId[] { return this.turns.order; }

  initialize(engine: GameEngine): () => void {
    if (this.engine) throw new Error('Combat system already attached');
    const participants = this.participantIds.map((id) => {
      const entity = engine.getEntity(id);
      validateCombatEntity(entity);
      if (!!entity.player === !!entity.enemy) throw new Error('Participants must belong to exactly one side');
      return entity;
    });
    if (!participants.some((entity) => entity?.player) || !participants.some((entity) => entity?.enemy)) {
      throw new Error('Battle requires player and enemy participants');
    }
    // Register first so an occupied ATTACK handler cannot partially attach this system.
    const unregister = engine.commands.register('ATTACK', ({ attackerId, targetId }) => {
      this.attack(engine, attackerId, targetId);
    });
    const extraCleanups: (() => void)[] = [];
    try {
      if (this.options.content) {
        extraCleanups.push(engine.commands.register('USE_SKILL', ({ sourceId, targetId, skillId }) => this.attack(engine, sourceId, targetId, skillId)));
        extraCleanups.push(engine.commands.register('USE_ITEM', ({ sourceId, targetId, itemId }) => this.attack(engine, sourceId, targetId, undefined, itemId)));
      }
    } catch (error) { extraCleanups.forEach((cleanup) => cleanup()); unregister(); throw error; }
    this.engine = engine;
    this.outcome = undefined;
    this.turns.initialize(participants);
    const unsubscribe = engine.events.on('ENTITY_REMOVED', ({ entityId }) => {
      if (!this.participantIds.includes(entityId)) return;
      const previous = this.turns.current();
      this.turns.remove(entityId);
      if (this.outcome) return;
      const events: GameEvent[] = [];
      this.checkOutcome(engine, events);
      const next = this.currentTurn();
      if (!this.outcome && previous !== next && next) events.push({ type: 'TURN_STARTED', entityId: next });
      this.publish(engine, events);
    });
    const cleanup = () => {
      unregister();
      extraCleanups.forEach((cleanup) => cleanup());
      unsubscribe();
      this.engine = undefined;
      this.turns.initialize([]);
    };
    try {
      this.publish(engine, [{ type: 'TURN_STARTED', entityId: this.turns.current()! }]);
    } catch (error) {
      cleanup();
      throw error;
    }
    return cleanup;
  }

  update(): void { /* Combat resolves on commands, never on frame ticks. */ }

  private attack(engine: GameEngine, attackerId: EntityId, targetId: EntityId, skillId?: string, itemId?: string): void {
    if (this.resolving) throw new Error('Cannot dispatch combat commands during combat event delivery');
    if (this.outcome) throw new Error('Battle has ended');
    if (this.options.canAct && !this.options.canAct()) throw new Error('Select and confirm an action through battle flow');
    if (!this.participantIds.includes(attackerId) || !this.participantIds.includes(targetId)) {
      throw new Error('Attack entities must be battle participants');
    }
    if (this.turns.current() !== attackerId) throw new Error('Attacker is not the current turn');
    const attacker = engine.getEntity(attackerId);
    const target = engine.getEntity(targetId);
    validateCombatEntity(attacker);
    validateCombatEntity(target);
    const skill = skillId ? this.options.content?.skill(skillId) : undefined;
    if (skillId && !skill) throw new Error('Skill content is unavailable');
    const item = itemId ? this.options.content?.item(itemId) : undefined;
    if (itemId && (!item || item.kind !== 'consumable' || !attacker.inventory?.[itemId] || attackerId !== targetId)) throw new Error('Invalid or unavailable item');
    if (!skill && !item && !!attacker.player === !!target.player) throw new Error('Cannot attack an ally');
    if (skill?.target === 'allEnemies' && !!attacker.player === !!target.player) throw new Error('Invalid skill target');
    const targets = skill?.target === 'allEnemies'
      ? this.turns.order.map((id) => engine.getEntity(id)!).filter((entity) => !!entity.player !== !!attacker.player) : [target];
    const skillPlan = skill ? prepareSkill({ source: effectiveEntity(attacker, this.options.content), targets: targets.map((entity) => effectiveEntity(entity, this.options.content)), skill, random: engine.random }) : undefined;
    this.resolving = true;
    try {
      const effects = skillPlan ? skillPlan.resolve().map((effect) => ({ ...effect, target: engine.getEntity(effect.target.id)! }))
        : item ? [{ target, result: { hit: true, critical: false, damage: 0 }, healing: Math.min(item.power, target.health.max - target.health.current) }]
        : [{ target, result: resolveAttack({ attacker: effectiveEntity(attacker, this.options.content), target: effectiveEntity(target, this.options.content), random: engine.random }), healing: 0 }];
      const events: GameEvent[] = [{ type: 'ANIMATION_REQUESTED', sourceId: attackerId, targetId,
        animation: skill || item ? 'skill' : 'attack', skillId }];
      if (skillPlan) {
        attacker.mana!.current = skillPlan.manaAfter;
        events.push({ type: 'SKILL_USED', sourceId: attackerId, skillId: skill!.id });
      }
      if (item) { consumeItem(attacker.inventory!, item.id); events.push({ type: 'ITEM_USED', sourceId: attackerId, itemId: item.id }); }
      for (const effect of effects) {
        if (skill?.effect === 'heal' || item) {
          effect.target.health!.current += effect.healing;
          events.push({ type: 'HEALTH_RESTORED', sourceId: attackerId, targetId: effect.target.id, amount: effect.healing });
        } else if (effect.result.hit && skill?.effect !== 'buff') {
          const amount = applyDamage(effect.target.health!, effect.result.damage);
          events.push({ type: 'DAMAGE_DEALT', sourceId: attackerId, targetId: effect.target.id, amount, critical: effect.result.critical });
          const death = handleDeath(engine, effect.target);
          if (death) { this.turns.remove(effect.target.id); events.push(death); }
        } else if (!effect.result.hit) {
          events.push({ type: 'ATTACK_MISSED', sourceId: attackerId, targetId: effect.target.id });
        }
        if (effect.result.hit && !effect.target.dead && skill && this.options.content) {
          for (const statusId of skill.statuses) applyStatus(effect.target, statusId, attackerId, this.options.content, events);
        }
      }
      this.tick(engine, attackerId, 'turnEnd', events);
      this.checkOutcome(engine, events);
      if (!this.outcome) {
        let next = this.turns.order.includes(attackerId) ? this.turns.advance() : this.turns.current();
        while (next && !this.outcome) {
          this.tick(engine, next, 'turnStart', events);
          this.checkOutcome(engine, events);
          if (this.turns.order.includes(next)) break;
          next = this.turns.current();
        }
        events.push({ type: 'TURN_ENDED', entityId: attackerId });
        if (next && !this.outcome) events.push({ type: 'TURN_STARTED', entityId: next });
      }
      if (!events.some((event) => event.type === 'TURN_ENDED')) events.push({ type: 'TURN_ENDED', entityId: attackerId });
      const resultEvent = events.find((event) => event.type === 'BATTLE_ENDED');
      if (resultEvent) { const index = events.indexOf(resultEvent); events.splice(index, 1); events.push(resultEvent); }
      // Commit HP, death, turn and outcome before notifying presentation consumers.
      this.publish(engine, events);
    } finally {
      this.resolving = false;
    }
  }

  private tick(engine: GameEngine, id: string, timing: 'turnStart' | 'turnEnd', events: GameEvent[]) {
    if (!this.options.content) return;
    const entity = engine.getEntity(id);
    if (!entity || entity.dead) return;
    tickStatuses(entity, timing, this.options.content, events);
    const death = handleDeath(engine, entity);
    if (death) { this.turns.remove(id); events.push(death); }
  }

  private checkOutcome(engine: GameEngine, events: GameEvent[]): void {
    const living = this.turns.order.map((id) => engine.getEntity(id))
      .filter((entity) => entity?.health && entity.health.current > 0 && !entity.dead);
    // If both sides disappear, defeat takes precedence.
    if (!living.some((entity) => entity?.player)) this.outcome = 'defeat';
    else if (!living.some((entity) => entity?.enemy)) this.outcome = 'victory';
    if (this.outcome) events.push({ type: 'BATTLE_ENDED', result: this.outcome });
  }

  private publish(engine: GameEngine, events: readonly GameEvent[]): void {
    const wasResolving = this.resolving;
    this.resolving = true;
    const errors: unknown[] = [];
    try {
      for (const event of events) {
        try { engine.events.emit(event); } catch (error) { errors.push(error); }
      }
    } finally {
      this.resolving = wasResolving;
    }
    if (errors.length) throw new AggregateError(errors, 'Combat event delivery failed; simulation is already committed');
  }
}
