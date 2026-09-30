import type { Entity } from '../ecs/Entity';
import type { Health } from '../ecs/components/Health';
import { validateHealth } from '../ecs/components/Health';
import type { CombatStats } from '../ecs/components/CombatStats';
import { validateCombatStats } from '../ecs/components/CombatStats';
import type { GameRandom } from '../Random';
import { calculateDamage } from './DamageCalculator';
import { calculateHitChance, rollHit } from './HitCalculator';
import { rollCritical } from './CriticalCalculator';

export type CombatEntity = Entity & { health: Health; combatant: CombatStats };
export interface AttackResult { hit: boolean; critical: boolean; damage: number }

export function validateCombatEntity(entity: Entity | undefined): asserts entity is CombatEntity {
  if (!entity?.health || !entity.combatant) throw new Error('Entity must have health and combat stats');
  validateHealth(entity.health);
  validateCombatStats(entity.combatant);
  if (entity.dead || entity.health.current === 0) throw new Error('Dead entities cannot attack or be targeted');
}

/** Resolves without mutating entities; all validation precedes RNG consumption. */
export function prepareAttack({ attacker, target, random }: {
  attacker: Entity;
  target: Entity;
  random: GameRandom;
}): () => AttackResult {
  validateCombatEntity(attacker);
  validateCombatEntity(target);
  if (attacker.id === target.id) throw new Error('Cannot attack self');
  const stats = attacker.combatant;
  const damageInput = { attack: stats.attack, defense: target.combatant.defense, criticalMultiplier: stats.criticalMultiplier };
  // Precompute both paths so overflow is rejected even if the random roll would miss.
  const normalDamage = calculateDamage(damageInput);
  const criticalDamage = calculateDamage({ ...damageInput, critical: true });
  const hitChance = calculateHitChance(stats.hitChance, target.combatant.evasion);
  return () => {
    if (!rollHit(random, hitChance)) return { hit: false, critical: false, damage: 0 };
    const critical = rollCritical(random, stats.criticalChance);
    return { hit: true, critical, damage: critical ? criticalDamage : normalDamage };
  };
}

export function resolveAttack(input: { attacker: Entity; target: Entity; random: GameRandom }): AttackResult {
  return prepareAttack(input)();
}
