import { BattleAISchema, type BattleAI } from '../../../data/schemas/content';
import type { EnemyBattleBehavior } from './EnemyBattleBehavior';
import { GenericEnemyBattleEngine } from './generic/GenericEnemyBattleEngine';
import { SpiderEnemyBattleEngine } from './spiders/SpiderEnemyBattleEngine';

export class EnemyBattleRegistry {
  private readonly behaviors = new Map<string, EnemyBattleBehavior>();
  register(behavior: EnemyBattleBehavior): this {
    if (!behavior.id.trim() || this.behaviors.has(behavior.id))
      throw new Error(`Duplicate or invalid enemy engine: ${behavior.id}`);
    this.behaviors.set(behavior.id, behavior);
    return this;
  }
  get(id: string): EnemyBattleBehavior {
    const behavior = this.behaviors.get(id);
    if (!behavior) throw new Error(`Unknown enemy battle engine: ${id}`);
    return behavior;
  }
  validate(ai?: BattleAI): BattleAI {
    const engineId = ai?.engineId ?? 'generic';
    const config = this.get(engineId).configSchema.parse(ai?.config ?? {});
    return BattleAISchema.parse({ engineId, config });
  }
}
export function createEnemyBattleRegistry() {
  return new EnemyBattleRegistry()
    .register(new GenericEnemyBattleEngine())
    .register(new SpiderEnemyBattleEngine());
}
