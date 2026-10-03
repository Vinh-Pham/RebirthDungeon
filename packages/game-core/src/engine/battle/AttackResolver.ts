import type { Entity } from '../ecs/Entity';
import type { Health } from '../ecs/components/Health';
import { validateHealth } from '../ecs/components/Health';
import type { CombatStats } from '../ecs/components/CombatStats';
import { validateCombatStats } from '../ecs/components/CombatStats';
import type { GameRandom } from '../Random';
import { calculateDamage } from './DamageCalculator';
import { calculateHitChance, rollHit } from './HitCalculator';
import { rollCritical } from './CriticalCalculator';
import { protectionReduction } from '../rpg/Stats';
import { validateResources } from '../rpg/Resources';
export type CombatEntity = Entity & { health: Health; combatant: CombatStats };
export interface AttackResult {
  hit: boolean;
  critical: boolean;
  damage: number;
  injury?: number;
}
export function validateCombatEntity(entity: Entity | undefined): asserts entity is CombatEntity {
  if (!entity?.health || !entity.combatant)
    throw new Error('Entity must have health and combat stats');
  validateHealth(entity.health);
  validateCombatStats(entity.combatant);
  validateResources(entity);
  if (entity.dead || entity.health.current === 0)
    throw new Error('Dead entities cannot attack or be targeted');
}
/** Seeded triangular approximation, with balance defining the distribution's peak. */
export function sampleDamage(random: GameRandom, min: number, max: number, balance: number) {
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max < min ||
    !Number.isFinite(balance) ||
    balance < 0 ||
    balance > 1
  )
    throw new RangeError('Invalid damage range');
  if (min === max) return min;
  const u = random.float();
  const fraction = u < balance ? Math.sqrt(u * balance) : 1 - Math.sqrt((1 - u) * (1 - balance));
  return Math.floor(min + (max - min) * fraction);
}
export function effectiveCriticalChance(stats: CombatStats, target: CombatStats, magical = false) {
  if (stats.minDamage === undefined) return stats.criticalChance ?? 0.1;
  const reduction = protectionReduction(
    (magical ? target.magicProtection : target.protection) ?? 0,
  );
  const rating = magical
    ? (stats.magicCriticalChance ?? stats.criticalChance ?? 0.1)
    : (stats.criticalRating ?? stats.criticalChance ?? 0.1);
  return Math.max(0, Math.min(0.3, rating - reduction * 2));
}
function attackInputs(attacker: Entity, target: Entity, magical = false) {
  validateCombatEntity(attacker);
  validateCombatEntity(target);
  const stats = attacker.combatant,
    ranged = stats.minDamage !== undefined;
  return {
    ranged,
    min: stats.minDamage ?? stats.attack,
    max: stats.maxDamage ?? stats.attack,
    reduction: ranged
      ? protectionReduction(
          (magical ? target.combatant.magicProtection : target.combatant.protection) ?? 0,
        )
      : 0,
    defense: ranged
      ? Math.max(
          0,
          (magical
            ? (target.combatant.magicDefense ?? target.combatant.defense)
            : target.combatant.defense) - (magical ? 0 : (stats.armorPierce ?? 0)),
        )
      : target.combatant.defense,
    multiplier: stats.criticalMultiplier ?? 1.5,
    hitChance: calculateHitChance(stats.hitChance, target.combatant.evasion),
    criticalChance: effectiveCriticalChance(stats, target.combatant, magical),
  };
}
function attackDamage(attack: number, input: ReturnType<typeof attackInputs>, critical: boolean) {
  return input.ranged
    ? Math.max(
        1,
        Math.floor(
          Math.max(1, attack * (critical ? input.multiplier : 1) - input.defense) *
            (1 - input.reduction),
        ),
      )
    : calculateDamage({
        attack,
        defense: input.defense,
        critical,
        criticalMultiplier: input.multiplier,
      });
}
export function previewAttack(attacker: Entity, target: Entity, magical = false) {
  const inputs = attackInputs(attacker, target, magical);
  return {
    hitChance: inputs.hitChance,
    criticalChance: inputs.criticalChance,
    min: attackDamage(inputs.min, inputs, false),
    max: attackDamage(inputs.max, inputs, false),
    criticalMin: attackDamage(inputs.min, inputs, true),
    criticalMax: attackDamage(inputs.max, inputs, true),
  };
}
export function prepareAttack({
  attacker,
  target,
  random,
  magical = false,
}: {
  attacker: Entity;
  target: Entity;
  random: GameRandom;
  magical?: boolean;
}): (sharedCritical?: boolean) => AttackResult {
  validateCombatEntity(attacker);
  validateCombatEntity(target);
  if (attacker.id === target.id) throw new Error('Cannot attack self');
  const stats = attacker.combatant;
  const inputs = attackInputs(attacker, target, magical);
  const {
    ranged,
    min,
    max,
    reduction,
    defense,
    multiplier,
    hitChance,
    criticalChance: chance,
  } = inputs;
  // Validate both possible paths before any random roll.
  calculateDamage({ attack: max, defense, critical: true, criticalMultiplier: multiplier });
  return (sharedCritical) => {
    if (!rollHit(random, hitChance)) return { hit: false, critical: false, damage: 0 };
    const critical = sharedCritical ?? rollCritical(random, chance);
    const attack = ranged
      ? sampleDamage(random, min, max, (magical ? stats.magicBalance : stats.balance) ?? 0.5)
      : stats.attack;
    const damage = attackDamage(attack, inputs, critical);
    const injury =
      magical || !ranged
        ? 0
        : Math.max(
            0,
            (stats.minInjury ?? 0) +
              random.float() * ((stats.maxInjury ?? 0) - (stats.minInjury ?? 0)) -
              reduction,
          );
    return { hit: true, critical, damage, ...(ranged ? { injury } : {}) };
  };
}
export function resolveAttack(input: {
  attacker: Entity;
  target: Entity;
  random: GameRandom;
}): AttackResult {
  return prepareAttack(input)();
}
