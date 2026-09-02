/**
 * Enemy-intent system (order 200): for the current actor with an
 * `EnemyBrain`, computes a pure AI decision (sight, memory, A* chase, seeded
 * wander from the `enemyAi` stream) and writes its `PendingAction`. Enemy
 * decisions never emit `rejected` — a wasted decision is a spent turn.
 */

import {
  ECSSystem,
  type Entity,
  EntitySystem,
  Matcher,
} from '@esengine/ecs-framework';

import { decideEnemyTurn } from '@/game/ai/enemy-ai';
import {
  AttackIntent,
  EnemyBrain,
  GridPosition,
  PendingAction,
  StableId,
  Vision,
} from '../components';
import type { RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('EnemyIntentSystem', { updateOrder: SYSTEM_ORDER.enemyIntent })
export class EnemyIntentSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    super(Matcher.all(GridPosition, EnemyBrain));
    this.context = context;
  }

  protected process(entities: readonly Entity[]): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'EnemyIntentSystem');
    const runState = this.context.currentRunState;
    if (!runState) return;

    for (const entity of entities) {
      const stableId = entity.getComponent(StableId);
      if (!stableId || stableId.value !== runState.currentActorId) continue;

      const position = entity.getComponent(GridPosition);
      const brain = entity.getComponent(EnemyBrain);
      const vision = entity.getComponent(Vision);
      if (!position || !brain) continue;

      const decision = decideEnemyTurn(
        this.context,
        position,
        brain,
        vision?.radius ?? 6,
        this.context.streams.enemyAi,
      );

      switch (decision.kind) {
        case 'move': {
          // Only cardinal single-cell moves are executable; a broken AI
          // decision degrades to a spent turn, never a shortcut.
          if (
            Math.abs(decision.dx) + Math.abs(decision.dy) !== 1 ||
            (decision.dx !== 0 && decision.dy !== 0)
          ) {
            entity.addComponent(new PendingAction('wait'));
            break;
          }
          entity.addComponent(
            new PendingAction(
              'move',
              position.x + decision.dx,
              position.y + decision.dy,
            ),
          );
          break;
        }
        case 'attack':
          entity.addComponent(
            new PendingAction(
              'bump',
              position.x,
              position.y,
              decision.targetId,
            ),
          );
          entity.addComponent(new AttackIntent(decision.targetId));
          break;
        case 'wait':
          entity.addComponent(new PendingAction('wait'));
          break;
      }
      return;
    }
  }
}
