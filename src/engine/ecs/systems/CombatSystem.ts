import {
  gameRank,
  skillForEntity,
  skillEquipmentReason,
  type ActionOutcome,
} from '../../rpg/Skills';
import type { GameEngine } from '../../GameEngine';
import type { GameSystem } from '../../GameSystem';
import type { GameEvent } from '../../events';
import type { Entity, EntityId } from '../Entity';
import { applyDamage } from '../components/Health';
import { effectiveEntity, applyStatus, tickStatuses } from '../../rpg/StatusEffects';
import { resolveAttack, previewAttack, validateCombatEntity } from '../../battle/AttackResolver';
import { prepareSkill } from '../../battle/SkillResolver';
import type { ContentRegistry } from '../../data/ContentRegistry';
import { calculateCharacterStats } from '../../rpg/Stats';
import { prepareBasicAttack } from '../../battle/BasicAttack';
import { healableHealth, resourceTick } from '../../rpg/Resources';
import { TurnQueue } from '../../battle/TurnQueue';
import { handleDeath } from './DeathSystem';
import { prepareBattleItem } from '../../rpg/Consumables';
import { consumeItem } from '../../rpg/Inventory';

export type BattleResult = 'victory' | 'defeat';

/** Basic attack/turn coordination. Higher-level action phases belong to Phase 3. */
export class CombatSystem implements GameSystem {
  private readonly participantIds: readonly EntityId[];
  private readonly turns = new TurnQueue();
  private readonly defending = new Set<EntityId>();
  private engine?: GameEngine;
  private resolving = false;
  private outcome?: BattleResult;
  private actionSequence = 0;

  constructor(
    participantIds: readonly EntityId[],
    private readonly options: {
      content?: ContentRegistry;
      canAct?: () => boolean;
      encounterId?: string;
      onOutcome?: (outcome: ActionOutcome) => void;
    } = {},
  ) {
    if (new Set(participantIds).size !== participantIds.length)
      throw new Error('Duplicate battle participant');
    this.participantIds = [...participantIds];
  }

  get completedActions() {
    return this.actionSequence;
  }
  get result(): BattleResult | undefined {
    return this.outcome;
  }
  currentTurn(): EntityId | undefined {
    return this.engine && !this.outcome ? this.turns.current() : undefined;
  }
  get turnOrder(): readonly EntityId[] {
    return this.turns.order;
  }

  previewSkill(sourceId: string, targetId: string, skillId: string) {
    const engine = this.engine,
      content = this.options.content;
    if (!engine || !content) throw new Error('Battle is unavailable');
    const source = engine.getEntity(sourceId)!;
    const skill = skillForEntity(content, source, skillId);
    const targets =
      skill.target === 'allEnemies'
        ? this.turns.order
            .map((id) => engine.getEntity(id)!)
            .filter((e) => !!e.player !== !!source.player)
        : [engine.getEntity(targetId)!];
    const plan = prepareSkill({
      source: effectiveEntity(source, content),
      targets: targets.map((e) => effectiveEntity(e, content)),
      skill,
      random: engine.random,
      selectedTargetId: targetId,
    });
    return {
      healing: skill.effect === 'heal',
      area: skill.target === 'allEnemies',
      manaCost: plan.manaCost,
      staminaCost: plan.staminaCost,
      targets: plan.preview.map((p) =>
        this.defending.has(p.targetId) && skill.effect === 'damage' && !skill.bypassDefend
          ? {
              ...p,
              min: Math.max(1, Math.floor(p.min / 2)),
              max: Math.max(1, Math.floor(p.max / 2)),
              criticalMin: Math.max(1, Math.floor(p.criticalMin / 2)),
              criticalMax: Math.max(1, Math.floor(p.criticalMax / 2)),
            }
          : p,
      ),
    };
  }
  previewBasic(sourceId: string, targetId: string) {
    const source = this.engine!.getEntity(sourceId)!,
      target = this.engine!.getEntity(targetId)!;
    const content = this.options.content;
    const basicPlan = prepareBasicAttack(source, content);
    const { attacker, cost } = basicPlan;
    const preview = previewAttack(attacker, effectiveEntity(target, content));
    return {
      healing: false,
      area: false,
      manaCost: 0,
      staminaCost: cost,
      ammunitionCost: basicPlan.ammunitionItemId ? 1 : 0,
      fallbackReason: basicPlan.fallbackReason,
      targets: [
        {
          targetId,
          ...preview,
          ...(this.defending.has(targetId)
            ? {
                min: Math.max(1, Math.floor(preview.min / 2)),
                max: Math.max(1, Math.floor(preview.max / 2)),
                criticalMin: Math.max(1, Math.floor(preview.criticalMin / 2)),
                criticalMax: Math.max(1, Math.floor(preview.criticalMax / 2)),
              }
            : {}),
        },
      ],
    };
  }
  initialize(engine: GameEngine): () => void {
    if (this.engine) throw new Error('Combat system already attached');
    const participants = this.participantIds.map((id) => {
      const entity = engine.getEntity(id);
      validateCombatEntity(entity);
      if (!!entity.player === !!entity.enemy)
        throw new Error('Participants must belong to exactly one side');
      return entity;
    });
    if (
      !participants.some((entity) => entity?.player) ||
      !participants.some((entity) => entity?.enemy)
    ) {
      throw new Error('Battle requires player and enemy participants');
    }
    // Register first so an occupied ATTACK handler cannot partially attach this system.
    const unregister = engine.commands.register('ATTACK', ({ attackerId, targetId }) => {
      this.attack(engine, attackerId, targetId);
    });
    const extraCleanups: (() => void)[] = [];
    try {
      extraCleanups.push(
        engine.commands.register('DEFEND', ({ entityId }) =>
          this.attack(engine, entityId, entityId, undefined, 'defend'),
        ),
      );
      if (this.options.content) {
        extraCleanups.push(
          engine.commands.register('REST', ({ entityId }) =>
            this.attack(engine, entityId, entityId, undefined, 'rest'),
          ),
        );
        extraCleanups.push(
          engine.commands.register('USE_SKILL', ({ sourceId, targetId, skillId }) =>
            this.attack(engine, sourceId, targetId, skillId),
          ),
        );
        extraCleanups.push(
          engine.commands.register('USE_ITEM', ({ sourceId, targetId, itemId }) =>
            this.attack(engine, sourceId, targetId, undefined, undefined, itemId),
          ),
        );
      }
    } catch (error) {
      extraCleanups.forEach((cleanup) => cleanup());
      unregister();
      throw error;
    }
    this.engine = engine;
    this.outcome = undefined;
    this.actionSequence = 0;
    this.defending.clear();
    this.turns.initialize(participants);
    const unsubscribe = engine.events.on('ENTITY_REMOVED', ({ entityId }) => {
      if (!this.participantIds.includes(entityId)) return;
      const previous = this.turns.current();
      this.turns.remove(entityId);
      this.defending.delete(entityId);
      if (this.outcome) return;
      const events: GameEvent[] = [];
      this.checkOutcome(engine, events);
      const next = this.currentTurn();
      if (!this.outcome && previous !== next && next) {
        this.defending.delete(next);
        events.push({ type: 'TURN_STARTED', entityId: next });
      }
      this.publish(engine, events);
    });
    const cleanup = () => {
      unregister();
      extraCleanups.forEach((cleanup) => cleanup());
      unsubscribe();
      this.engine = undefined;
      this.turns.initialize([]);
      this.defending.clear();
    };
    try {
      this.publish(engine, [{ type: 'TURN_STARTED', entityId: this.turns.current()! }]);
    } catch (error) {
      cleanup();
      throw error;
    }
    return cleanup;
  }

  update(): void {
    /* Combat resolves on commands, never on frame ticks. */
  }

  private refreshCharacterStats(attacker: Entity, content: ContentRegistry) {
    const stats = calculateCharacterStats(attacker.statSource!, content);
    attacker.combatant = stats.combatant;
    attacker.health!.max = stats.maxHealth;
    attacker.wounds = Math.min(attacker.wounds ?? 0, stats.maxHealth - 1);
    attacker.health!.current = Math.min(
      attacker.health!.current,
      stats.maxHealth - attacker.wounds,
    );
    for (const [key, max] of [
      ['mana', stats.maxMana],
      ['stamina', stats.maxStamina],
    ] as const) {
      if (attacker[key]) {
        attacker[key].max = max;
        attacker[key].current = Math.min(attacker[key].current, max);
      }
    }
  }

  private attack(
    engine: GameEngine,
    attackerId: EntityId,
    targetId: EntityId,
    skillId?: string,
    recoveryAction?: 'rest' | 'defend',
    itemId?: string,
  ): void {
    if (this.resolving)
      throw new Error('Cannot dispatch combat commands during combat event delivery');
    if (this.outcome) throw new Error('Battle has ended');
    if (this.options.canAct && !this.options.canAct())
      throw new Error('Select and confirm an action through battle flow');
    if (!this.participantIds.includes(attackerId) || !this.participantIds.includes(targetId)) {
      throw new Error('Attack entities must be battle participants');
    }
    if (this.turns.current() !== attackerId) throw new Error('Attacker is not the current turn');
    const attacker = engine.getEntity(attackerId);
    const target = engine.getEntity(targetId);
    validateCombatEntity(attacker);
    validateCombatEntity(target);
    if (itemId && attackerId !== targetId) throw new Error('Items can only target yourself');
    const itemPlan =
      itemId && this.options.content
        ? prepareBattleItem(attacker, itemId, this.options.content)
        : undefined;
    const rest = recoveryAction === 'rest';
    const defend = recoveryAction === 'defend';
    const skill = skillId
      ? this.options.content
        ? skillForEntity(this.options.content, attacker, skillId)
        : undefined
      : undefined;
    if (skillId && !skill) throw new Error('Skill content is unavailable');
    if (skill && this.options.content) {
      const reason = skillEquipmentReason(attacker, skill, this.options.content);
      if (reason) throw new Error(reason);
      if ((attacker.cooldowns?.[skill.id] ?? 0) > 0) throw new Error('Skill is on cooldown');
    }
    if (!recoveryAction && !itemPlan && !skill && !!attacker.player === !!target.player)
      throw new Error('Cannot attack an ally');
    if (skill?.target === 'allEnemies' && !!attacker.player === !!target.player)
      throw new Error('Invalid skill target');
    if (rest && (attackerId !== targetId || !attacker.stamina))
      throw new Error('Invalid rest target');
    const basicPlan = prepareBasicAttack(attacker, this.options.content);
    const basicAction = !skill && !recoveryAction && !itemPlan;
    const cost = basicAction ? basicPlan.cost : 0;
    const basic = basicPlan.attacker;
    const targets =
      skill?.target === 'allEnemies'
        ? this.turns.order
            .map((id) => engine.getEntity(id)!)
            .filter((entity) => !!entity.player !== !!attacker.player)
        : [target];
    const skillPlan = skill
      ? prepareSkill({
          source: effectiveEntity(attacker, this.options.content),
          targets: targets.map((entity) => effectiveEntity(entity, this.options.content)),
          skill,
          random: engine.random,
          selectedTargetId: targetId,
        })
      : undefined;
    const physicalAction =
      !recoveryAction &&
      !itemPlan &&
      (!skill || (skill.effect === 'damage' && skill.element === 'physical'));
    const tags = physicalAction
      ? [
          ...(basicAction && basicPlan.ammunitionItemId ? ['ranged'] : ['melee']),
          ...((!basicAction || basicPlan.usesWeapon) &&
          attacker.weapon &&
          attacker.weapon.durability > 0 &&
          this.options.content
            ? this.options.content.item(attacker.weapon.itemId).weaponTags
            : []),
        ]
      : [];
    const cooldown = skill?.gameRanks && skill.rank ? gameRank(skill, skill.rank).cooldown : 0;
    this.resolving = true;
    try {
      const directTargets: ActionOutcome['targets'] = [];
      const effects = skillPlan
        ? skillPlan
            .resolve()
            .map((effect) => ({ ...effect, target: engine.getEntity(effect.target.id)! }))
        : recoveryAction || itemPlan
          ? [{ target, result: { hit: true, critical: false, damage: 0 }, healing: 0 }]
          : [
              {
                target,
                result: resolveAttack({
                  attacker: basic,
                  target: effectiveEntity(target, this.options.content),
                  random: engine.random,
                }),
                healing: 0,
              },
            ];
      const events: GameEvent[] = [
        {
          type: 'ANIMATION_REQUESTED',
          sourceId: attackerId,
          targetId,
          animation: defend ? 'defend' : skill || itemPlan ? 'skill' : 'attack',
          skillId,
        },
      ];
      if (rest) events.push({ type: 'RESTED', entityId: attackerId });
      if (defend) {
        this.defending.add(attackerId);
        events.push({ type: 'DEFENDED', entityId: attackerId });
      }
      if (itemPlan) {
        const { recovery } = itemPlan;
        consumeItem(attacker.inventory!, itemId!);
        attacker[recovery.resource]!.current += recovery.amount;
        if (attacker.stamina) attacker.stamina.current += recovery.staminaBonus;
        attacker.fullness = recovery.fullnessAfter;
        events.push({ type: 'ITEM_USED', sourceId: attackerId, itemId: itemId! });
        if (recovery.resource === 'health' || recovery.resource === 'mana')
          events.push({
            type: recovery.resource === 'health' ? 'HEALTH_RESTORED' : 'MANA_RESTORED',
            sourceId: attackerId,
            targetId,
            amount: recovery.amount,
          });
      }
      if (basicAction && basicPlan.ammunitionItemId) {
        consumeItem(attacker.inventory!, basicPlan.ammunitionItemId);
        if (!attacker.inventory![basicPlan.ammunitionItemId]) {
          attacker.ammunitionItemId = undefined;
          if (attacker.statSource && this.options.content) {
            attacker.statSource = { ...attacker.statSource, ammunitionItemId: undefined };
            this.refreshCharacterStats(attacker, this.options.content);
          }
        }
      }
      if (cost && attacker.stamina)
        attacker.stamina.current = Math.max(0, attacker.stamina.current - cost);
      if (skillPlan) {
        attacker.mana!.current = skillPlan.manaAfter;
        if (attacker.stamina && skillPlan.staminaAfter !== undefined)
          attacker.stamina.current = skillPlan.staminaAfter;
        events.push({ type: 'SKILL_USED', sourceId: attackerId, skillId: skill!.id });
      }
      for (const effect of effects) {
        const outcomeTarget = {
          targetId: effect.target.id,
          hostile: !!effect.target.player !== !!attacker.player,
          hit: effect.result.hit,
          critical: effect.result.critical,
          damage: 0,
          healing: 0,
          defeated: false,
        };
        directTargets.push(outcomeTarget);
        if (recoveryAction || itemPlan) {
          if (itemPlan?.recovery.resource === 'health')
            outcomeTarget.healing = itemPlan.recovery.amount;
          continue;
        }
        if (skill?.effect === 'heal') {
          effect.target.health!.current += effect.healing;
          outcomeTarget.healing = effect.healing;
          events.push({
            type: 'HEALTH_RESTORED',
            sourceId: attackerId,
            targetId: effect.target.id,
            amount: effect.healing,
          });
        } else if (effect.result.hit && skill?.effect !== 'buff') {
          const damage =
            this.defending.has(effect.target.id) && !skill?.bypassDefend
              ? Math.max(1, Math.floor(effect.result.damage / 2))
              : effect.result.damage;
          const amount = applyDamage(effect.target.health!, damage);
          outcomeTarget.damage = amount;
          events.push({
            type: 'DAMAGE_DEALT',
            sourceId: attackerId,
            targetId: effect.target.id,
            amount,
            critical: effect.result.critical,
          });
          const wounds = Math.floor(amount * (effect.result.injury ?? 0));
          if (wounds && effect.target.stamina) {
            const before = effect.target.wounds ?? 0;
            effect.target.wounds = Math.min(effect.target.health!.max, before + wounds);
            effect.target.health!.current = Math.min(
              effect.target.health!.current,
              healableHealth(effect.target),
            );
            events.push({
              type: 'WOUNDS_RECEIVED',
              entityId: effect.target.id,
              amount: effect.target.wounds - before,
            });
          }
          const death = handleDeath(engine, effect.target);
          if (death) {
            outcomeTarget.defeated = true;
            this.turns.remove(effect.target.id);
            events.push(death);
          }
        } else if (!effect.result.hit) {
          events.push({ type: 'ATTACK_MISSED', sourceId: attackerId, targetId: effect.target.id });
        }
        if (
          physicalAction &&
          tags.includes('melee') &&
          effect.result.hit &&
          !effect.target.dead &&
          outcomeTarget.hostile &&
          !(this.defending.has(effect.target.id) && !skill?.bypassDefend) &&
          this.options.content
        ) {
          for (const id of attacker.skills ?? []) {
            const passive = this.options.content.skill(id);
            const adapter = passive.enemyUse;
            if (
              adapter?.type === 'onMeleeHit' &&
              (!passive.enemyOnly || attacker.enemy) &&
              engine.random.chance(adapter.chance)
            )
              applyStatus(
                effect.target,
                adapter.statusId,
                attackerId,
                this.options.content,
                events,
              );
          }
        }
        if (effect.result.hit && !effect.target.dead && skill && this.options.content) {
          for (const statusId of skill.statuses)
            applyStatus(effect.target, statusId, attackerId, this.options.content, events);
        }
      }
      const weapon = attacker.weapon;
      if (
        weapon &&
        weapon.durability > 0 &&
        this.options.content &&
        !recoveryAction &&
        !itemPlan &&
        (!basicAction || basicPlan.usesWeapon) &&
        (!skill || (skill.effect === 'damage' && skill.element === 'physical')) &&
        effects.some((effect) => effect.result.hit)
      ) {
        weapon.durability--;
        if (weapon.durability === 0) {
          if (attacker.statSource) {
            attacker.statSource = {
              ...attacker.statSource,
              weaponItemId: undefined,
              enchantments: attacker.statSource.enchantments?.filter(
                (e) => !e.sourceId.startsWith('weapon-'),
              ),
            };
            this.refreshCharacterStats(attacker, this.options.content);
          } else {
            const definition = this.options.content.item(weapon.itemId);
            const stat = definition.stat ?? 'attack';
            attacker.combatant[stat] = Math.max(0, attacker.combatant[stat] - definition.power);
            if (stat === 'attack' && attacker.combatant.minDamage !== undefined) {
              attacker.combatant.minDamage = Math.max(
                0,
                attacker.combatant.minDamage -
                  (definition.weaponStats?.minDamage ?? definition.power),
              );
              attacker.combatant.maxDamage = attacker.combatant.attack;
            }
          }
        }
        events.push({
          type: 'WEAPON_WORN',
          entityId: attacker.id,
          weaponId: weapon.id,
          itemId: weapon.itemId,
          durability: weapon.durability,
        });
      }
      for (const id of Object.keys(attacker.cooldowns ?? {})) {
        if (--attacker.cooldowns![id] <= 0) delete attacker.cooldowns![id];
      }
      if (skill && cooldown) (attacker.cooldowns ??= {})[skill.id] = cooldown;
      this.tick(engine, attackerId, 'turnEnd', events);
      events.push(...resourceTick(attacker, !!recoveryAction));
      this.checkOutcome(engine, events);
      if (!this.outcome) {
        let next = this.turns.order.includes(attackerId)
          ? this.turns.advance()
          : this.turns.current();
        while (next && !this.outcome) {
          this.tick(engine, next, 'turnStart', events);
          this.checkOutcome(engine, events);
          if (this.turns.order.includes(next)) break;
          next = this.turns.current();
        }
        events.push({ type: 'TURN_ENDED', entityId: attackerId });
        if (next && !this.outcome) events.push({ type: 'TURN_STARTED', entityId: next });
      }
      if (!events.some((event) => event.type === 'TURN_ENDED'))
        events.push({ type: 'TURN_ENDED', entityId: attackerId });
      const resultEvent = events.find((event) => event.type === 'BATTLE_ENDED');
      if (resultEvent) {
        const index = events.indexOf(resultEvent);
        events.splice(index, 1);
        events.push(resultEvent);
      }
      const outcome: ActionOutcome = {
        encounterId: this.options.encounterId ?? 'standalone',
        actionId: ++this.actionSequence,
        sourceId: attackerId,
        skillId: skillId ?? (basicAction ? basicPlan.skillId : undefined),
        rank: skill?.rank ?? (basicAction ? basicPlan.rank : undefined),
        action: itemPlan ? 'item' : skill ? 'skill' : (recoveryAction ?? 'attack'),
        origin: 'direct',
        tags: [...new Set(tags)],
        targets: directTargets,
      };
      // Internal training commits before any fallible external notification.
      this.options.onOutcome?.(outcome);
      events.unshift({ type: 'ACTION_RESOLVED', outcome });
      engine.commands.markCommitted();
      // Commit HP, death, turn and outcome before notifying presentation consumers.
      this.publish(engine, events);
    } finally {
      this.resolving = false;
    }
  }

  private tick(
    engine: GameEngine,
    id: string,
    timing: 'turnStart' | 'turnEnd',
    events: GameEvent[],
  ) {
    if (timing === 'turnStart') this.defending.delete(id);
    if (!this.options.content) return;
    const entity = engine.getEntity(id);
    if (!entity || entity.dead) return;
    tickStatuses(entity, timing, this.options.content, events);
    const death = handleDeath(engine, entity);
    if (death) {
      this.turns.remove(id);
      events.push(death);
    }
  }

  private checkOutcome(engine: GameEngine, events: GameEvent[]): void {
    const living = this.turns.order
      .map((id) => engine.getEntity(id))
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
        try {
          engine.events.emit(event);
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      this.resolving = wasResolving;
    }
    if (errors.length)
      throw new AggregateError(
        errors,
        'Combat event delivery failed; simulation is already committed',
      );
  }
}
