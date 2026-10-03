import type { GameRandom } from '../Random';
import { validateProbability } from '../ecs/components/CombatStats';

export function calculateHitChance(hitChance = 0.95, evasion = 0): number {
  validateProbability(hitChance);
  validateProbability(evasion);
  return Math.max(0, hitChance - evasion);
}

export function rollHit(random: GameRandom, hitChance: number): boolean {
  validateProbability(hitChance);
  return random.chance(hitChance);
}
