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
export interface AttackResult { hit: boolean; critical: boolean; damage: number; injury?: number }
export function validateCombatEntity(entity: Entity | undefined): asserts entity is CombatEntity {
  if (!entity?.health || !entity.combatant) throw new Error('Entity must have health and combat stats');
  validateHealth(entity.health); validateCombatStats(entity.combatant); validateResources(entity);
  if (entity.dead || entity.health.current === 0) throw new Error('Dead entities cannot attack or be targeted');
}
/** Seeded triangular approximation, with balance defining the distribution's peak. */
export function sampleDamage(random: GameRandom, min: number, max: number, balance: number) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < min || !Number.isFinite(balance) || balance < 0 || balance > 1) throw new RangeError('Invalid damage range');
  if (min === max) return min;
  const u = random.float();
  const fraction = u < balance ? Math.sqrt(u * balance) : 1 - Math.sqrt((1 - u) * (1 - balance));
  return Math.floor(min + (max - min) * fraction);
}
export function effectiveCriticalChance(stats: CombatStats, target: CombatStats, magical = false) {
  if (stats.minDamage === undefined) return stats.criticalChance ?? .1;
  const reduction = protectionReduction((magical ? target.magicProtection : target.protection) ?? 0);
  const rating = magical ? stats.magicCriticalChance ?? stats.criticalChance ?? .1 : stats.criticalRating ?? stats.criticalChance ?? .1;
  return Math.max(0, Math.min(.3, rating - reduction * 2));
}
export function prepareAttack({ attacker, target, random, magical = false }: {
  attacker: Entity; target: Entity; random: GameRandom; magical?: boolean;
}): (sharedCritical?: boolean) => AttackResult {
  validateCombatEntity(attacker); validateCombatEntity(target);
  if (attacker.id === target.id) throw new Error('Cannot attack self');
  const stats = attacker.combatant;
  const ranged = stats.minDamage !== undefined && stats.maxDamage !== undefined;
  const min = stats.minDamage ?? stats.attack, max = stats.maxDamage ?? stats.attack;
  const reduction = ranged ? protectionReduction((magical ? target.combatant.magicProtection : target.combatant.protection) ?? 0) : 0;
  const defense = ranged ? Math.max(0, (magical ? target.combatant.magicDefense ?? target.combatant.defense : target.combatant.defense) - (magical ? 0 : stats.armorPierce ?? 0)) : target.combatant.defense;
  const multiplier = stats.criticalMultiplier ?? 1.5;
  // Validate both possible paths before any random roll.
  calculateDamage({ attack: max, defense, critical: true, criticalMultiplier: multiplier });
  const hitChance = calculateHitChance(stats.hitChance, target.combatant.evasion);
  const chance = effectiveCriticalChance(stats, target.combatant, magical);
  return (sharedCritical) => {
    if (!rollHit(random, hitChance)) return { hit: false, critical: false, damage: 0 };
    const critical = sharedCritical ?? rollCritical(random, chance);
    const attack = ranged ? sampleDamage(random, min, max, (magical ? stats.magicBalance : stats.balance) ?? .5) : stats.attack;
    const damage = ranged ? Math.max(1, Math.floor(Math.max(1, attack * (critical ? multiplier : 1) - defense) * (1 - reduction)))
      : calculateDamage({ attack, defense, critical, criticalMultiplier: multiplier });
    const injury = magical || !ranged ? 0 : Math.max(0, ((stats.minInjury ?? 0) + random.float() * ((stats.maxInjury ?? 0) - (stats.minInjury ?? 0))) - reduction);
    return { hit: true, critical, damage, ...(ranged ? { injury } : {}) };
  };
}
export function resolveAttack(input: { attacker: Entity; target: Entity; random: GameRandom }): AttackResult { return prepareAttack(input)(); }
