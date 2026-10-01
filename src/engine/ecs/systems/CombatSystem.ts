import type { GameEngine } from '../../GameEngine';
import type { GameSystem } from '../../GameSystem';
import type { GameEvent } from '../../events';
import type { EntityId } from '../Entity';
import { applyDamage } from '../components/Health';
import { effectiveEntity, applyStatus, tickStatuses } from '../../rpg/StatusEffects';
import { consumeItem } from '../../rpg/Character';
import { consumableRecovery } from '../../rpg/Consumables';
import { resolveAttack, validateCombatEntity } from '../../battle/AttackResolver';
import { prepareSkill } from '../../battle/SkillResolver';
import type { ContentRegistry } from '../../data/ContentRegistry';
import { calculateCharacterStats } from '../../rpg/Stats';
import { healableHealth, resourceTick, staminaCost } from '../../rpg/Resources';
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
        extraCleanups.push(engine.commands.register('REST', ({ entityId }) => this.attack(engine, entityId, entityId, undefined, undefined, true)));
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

  private attack(engine: GameEngine, attackerId: EntityId, targetId: EntityId, skillId?: string, itemId?: string, rest = false): void {
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
    if (itemId && (!item || item.kind !== 'consumable' || !item.battleUsable || !attacker.inventory?.[itemId] || attackerId !== targetId)) throw new Error('Invalid or unavailable item');
    const recovery = item ? consumableRecovery(item, target) : undefined;
    if (!rest && !skill && !item && !!attacker.player === !!target.player) throw new Error('Cannot attack an ally');
    if (skill?.target === 'allEnemies' && !!attacker.player === !!target.player) throw new Error('Invalid skill target');
    if (rest && (attackerId !== targetId || !attacker.stamina)) throw new Error('Invalid rest target');
    const cost = !skill && !item && !rest && attacker.stamina ? staminaCost(attacker, 2) : 0;
    const exhausted = !skill && !item && !rest && attacker.stamina && attacker.stamina.current < cost;
    let basic = effectiveEntity(attacker, this.options.content);
    if (exhausted && attacker.statSource && this.options.content) basic = effectiveEntity({ ...attacker, combatant: calculateCharacterStats({ ...attacker.statSource, weaponItemId: undefined }, this.options.content).combatant }, this.options.content);
    const targets = skill?.target === 'allEnemies'
      ? this.turns.order.map((id) => engine.getEntity(id)!).filter((entity) => !!entity.player !== !!attacker.player) : [target];
    const skillPlan = skill ? prepareSkill({ source: effectiveEntity(attacker, this.options.content), targets: targets.map((entity) => effectiveEntity(entity, this.options.content)), skill, random: engine.random, selectedTargetId: targetId }) : undefined;
    this.resolving = true;
    try {
      const effects = skillPlan ? skillPlan.resolve().map((effect) => ({ ...effect, target: engine.getEntity(effect.target.id)! }))
        : item || rest ? [{ target, result: { hit: true, critical: false, damage: 0 }, healing: recovery?.amount ?? 0 }]
        : [{ target, result: resolveAttack({ attacker: basic, target: effectiveEntity(target, this.options.content), random: engine.random }), healing: 0 }];
      const events: GameEvent[] = [{ type: 'ANIMATION_REQUESTED', sourceId: attackerId, targetId,
        animation: skill || item ? 'skill' : 'attack', skillId }];
      if (rest) events.push({ type: 'RESTED', entityId: attackerId });
      if (cost && attacker.stamina) attacker.stamina.current = Math.max(0, attacker.stamina.current - cost);
      if (skillPlan) {
        attacker.mana!.current = skillPlan.manaAfter;
        if (attacker.stamina && skillPlan.staminaAfter !== undefined) attacker.stamina.current = skillPlan.staminaAfter;
        events.push({ type: 'SKILL_USED', sourceId: attackerId, skillId: skill!.id });
      }
      if (item) {
        if (attacker.stamina) attacker.stamina.current += recovery!.staminaBonus;
        if (attacker.fullness !== undefined) attacker.fullness = recovery!.fullnessAfter;
        consumeItem(attacker.inventory!, item.id); events.push({ type: 'ITEM_USED', sourceId: attackerId, itemId: item.id }); }
      for (const effect of effects) {
        if (rest) continue;
        if (skill?.effect === 'heal' || item) {
          const resource = recovery?.resource ?? 'health';
          effect.target[resource]!.current += effect.healing;
          if (resource !== 'stamina') events.push({ type: resource === 'mana' ? 'MANA_RESTORED' : 'HEALTH_RESTORED', sourceId: attackerId, targetId: effect.target.id, amount: effect.healing });
        } else if (effect.result.hit && skill?.effect !== 'buff') {
          const amount = applyDamage(effect.target.health!, effect.result.damage);
          events.push({ type: 'DAMAGE_DEALT', sourceId: attackerId, targetId: effect.target.id, amount, critical: effect.result.critical });
          const wounds = Math.floor(amount * (effect.result.injury ?? 0));
          if (wounds && effect.target.stamina) {
            const before = effect.target.wounds ?? 0; effect.target.wounds = Math.min(effect.target.health!.max, before + wounds);
            effect.target.health!.current = Math.min(effect.target.health!.current, healableHealth(effect.target));
            events.push({ type: 'WOUNDS_RECEIVED', entityId: effect.target.id, amount: effect.target.wounds - before });
          }
          const death = handleDeath(engine, effect.target);
          if (death) { this.turns.remove(effect.target.id); events.push(death); }
        } else if (!effect.result.hit) {
          events.push({ type: 'ATTACK_MISSED', sourceId: attackerId, targetId: effect.target.id });
        }
        if (effect.result.hit && !effect.target.dead && skill && this.options.content) {
          for (const statusId of skill.statuses) applyStatus(effect.target, statusId, attackerId, this.options.content, events);
        }
      }
      const weapon = attacker.weapon;
      if (weapon && weapon.durability > 0 && this.options.content && !item && !rest && !exhausted &&
          (!skill || (skill.effect === 'damage' && skill.element === 'physical')) && effects.some((effect) => effect.result.hit)) {
        weapon.durability--;
        if (weapon.durability === 0) {
          if (attacker.statSource) {
            attacker.statSource = { ...attacker.statSource, weaponItemId: undefined };
            attacker.combatant = calculateCharacterStats(attacker.statSource, this.options.content).combatant;
          } else {
            const definition = this.options.content.item(weapon.itemId); const stat = definition.stat ?? 'attack';
            attacker.combatant[stat] = Math.max(0, attacker.combatant[stat] - definition.power);
            if (stat === 'attack' && attacker.combatant.minDamage !== undefined) {
              attacker.combatant.minDamage = Math.max(0, attacker.combatant.minDamage - (definition.weaponStats?.minDamage ?? definition.power));
              attacker.combatant.maxDamage = attacker.combatant.attack;
            }
          }
        }
        events.push({ type: 'WEAPON_WORN', entityId: attacker.id, weaponId: weapon.id, itemId: weapon.itemId, durability: weapon.durability });
      }
      this.tick(engine, attackerId, 'turnEnd', events);
      events.push(...resourceTick(attacker, rest));
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
