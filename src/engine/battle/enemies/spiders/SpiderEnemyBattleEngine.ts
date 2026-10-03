import { z } from 'zod';
import type { EnemyBattleBehavior, EnemyBattleContext } from '../EnemyBattleBehavior';
import { scoreEnemyActions } from '../generic/GenericEnemyBattleEngine';

const configSchema = z.strictObject({
  temperament: z.enum(['defensive', 'balanced', 'aggressive', 'survival']),
});
const weights = {
  defensive: [60, 40],
  balanced: [80, 20],
  aggressive: [90, 10],
  survival: [80, 20],
} as const;
export class SpiderEnemyBattleEngine implements EnemyBattleBehavior {
  readonly id = 'spider';
  readonly configSchema = configSchema;
  score(context: EnemyBattleContext) {
    const { temperament } = context.config as z.infer<typeof configSchema>;
    const [attack, defense] = weights[temperament];
    const source = context.source;
    const hostile = context.participants.find(
      (p) => p.id === context.candidates.find((c) => c.kind === 'attack')?.targetId,
    );
    const multiplier =
      temperament === 'survival' && source.health <= source.maxHealth * 0.5
        ? 6
        : source.health <= source.maxHealth * 0.35 ||
            source.stamina <= source.maxStamina * 0.25 ||
            hostile?.statuses.includes('poison')
          ? 3
          : 1;
    return scoreEnemyActions(context, attack, defense * multiplier);
  }
}
