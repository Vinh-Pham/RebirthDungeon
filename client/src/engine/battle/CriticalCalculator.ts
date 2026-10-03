import type { GameRandom } from '../Random';
import { validateProbability } from '../ecs/components/CombatStats';

export function rollCritical(random: GameRandom, criticalChance = 0.1): boolean {
  validateProbability(criticalChance);
  return random.chance(criticalChance);
}
