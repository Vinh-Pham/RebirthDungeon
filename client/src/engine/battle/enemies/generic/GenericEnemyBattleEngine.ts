import { z } from 'zod';
import type { EnemyBattleBehavior, EnemyBattleContext } from '../EnemyBattleBehavior';

export function scoreEnemyActions(context: EnemyBattleContext, attack = 80, defense = 20) {
  const { source, candidates, lastAction } = context;
  const attackCost = candidates.find((c) => c.kind === 'attack')?.staminaCost ?? 0;
  const recover = source.stamina < attackCost && source.maxStamina >= attackCost;
  const hasDefense = candidates.some((c) => c.kind === 'defend');
  return candidates.map((candidate) => {
    if (recover && hasDefense) return candidate.kind === 'defend' ? 1 : 0;
    switch (candidate.kind) {
      case 'attack':
        return attack;
      case 'defend':
        return lastAction?.action === 'defend' ? 0 : defense;
      case 'damage':
        return 100;
      case 'heal':
        return 120;
      case 'buff':
        return 40;
    }
  });
}
export class GenericEnemyBattleEngine implements EnemyBattleBehavior {
  readonly id = 'generic';
  readonly configSchema = z.strictObject({});
  score(context: EnemyBattleContext) {
    return scoreEnemyActions(context);
  }
}
