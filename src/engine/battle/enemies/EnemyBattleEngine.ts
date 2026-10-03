import type { GameEngine } from '../../GameEngine';
import type { ContentRegistry } from '../../data/ContentRegistry';
import type { CombatSystem } from '../../ecs/systems/CombatSystem';
import type { Entity } from '../../ecs/Entity';
import type { BattleAction } from '../BattleMachine';
import type { EnemyTurnDecision } from './EnemyBattleBehavior';
import { enemyActorView, prepareEnemyActions } from './shared/EnemyActions';

/** One encounter's decision coordinator. Family plugins never receive mutable ECS or RNG. */
export class EnemyBattleEngine {
  private readonly history = new Map<string, Readonly<BattleAction>>();
  constructor(private readonly content: ContentRegistry) {}
  decide(engine: GameEngine, combat: CombatSystem, source: Entity): EnemyTurnDecision {
    if (!source.enemy || source.player) throw new Error('Enemy engine requires an enemy actor');
    const ai = source.battleAI ?? { engineId: 'generic', config: Object.freeze({}) };
    const prepared = prepareEnemyActions(engine, combat, this.content, source);
    const context = Object.freeze({
      ...prepared,
      source: enemyActorView(source),
      config: ai.config,
      lastAction: this.history.get(source.id),
    });
    const weights = this.content.enemyBattleRegistry.get(ai.engineId).score(context);
    if (
      weights.length !== prepared.candidates.length ||
      weights.some((w) => !Number.isSafeInteger(w) || w < 0)
    )
      throw new Error('Invalid enemy action weights');
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (!Number.isSafeInteger(total) || total <= 0)
      throw new Error('Enemy behavior must select a legal action');
    const positive = weights.flatMap((w, i) => (w > 0 ? [i] : []));
    let selected = positive[0];
    if (positive.length > 1) {
      let draw = engine.random.int(1, total);
      for (const index of positive) {
        draw -= weights[index];
        if (draw <= 0) {
          selected = index;
          break;
        }
      }
    }
    const candidate = prepared.candidates[selected];
    return Object.freeze({ action: candidate.action, targetId: candidate.targetId });
  }
  recordAcceptedAction(id: string, action: BattleAction) {
    this.history.set(id, Object.freeze({ ...action }));
  }
  forget(id: string) {
    this.history.delete(id);
  }
  dispose() {
    this.history.clear();
  }
}
