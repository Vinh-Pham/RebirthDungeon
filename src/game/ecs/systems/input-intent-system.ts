/**
 * Input-intent system (order 100): validates the current actor's `MoveIntent`
 * against the world — bounds, tile rules, occupancy, doors, hostiles — and
 * writes the authoritative `PendingAction` for later systems to execute.
 *
 * An invalid player intent writes `rejected`, which turn finalization treats
 * as NOT consuming the turn (game plan §6 default). Enemy intents are written
 * by the enemy-intent system; their failures become `wait` (a spent turn).
 */

import {
  ECSSystem,
  type Entity,
  EntitySystem,
  Matcher,
} from '@esengine/ecs-framework';

import {
  AttackIntent,
  Door,
  GridPosition,
  MoveIntent,
  PendingAction,
  StableId,
} from '../components';
import { cellIndexOf, isWalkableCell, type RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('InputIntentSystem', { updateOrder: SYSTEM_ORDER.inputIntent })
export class InputIntentSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    super(Matcher.all(GridPosition, MoveIntent));
    this.context = context;
  }

  protected process(entities: readonly Entity[]): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'InputIntentSystem');
    const runState = this.context.currentRunState;
    if (!runState) return;

    for (const entity of entities) {
      const stableId = entity.getComponent(StableId);
      if (!stableId || stableId.value !== runState.currentActorId) continue;

      const intent = entity.getComponent(MoveIntent);
      const position = entity.getComponent(GridPosition);
      if (!intent || !position) continue;
      entity.removeComponentByType(MoveIntent);

      // Cardinal single-cell shape (game plan §6 step 2).
      if (Math.abs(intent.dx) + Math.abs(intent.dy) !== 1) {
        this.reject(entity, stableId.value, 'invalid-direction');
        continue;
      }

      const toX = position.x + intent.dx;
      const toY = position.y + intent.dy;

      if (!isWalkableCell(this.context, toX, toY)) {
        // Out of bounds or a wall: invalid input, no turn consumed.
        this.reject(entity, stableId.value, 'blocked');
        continue;
      }

      const occupantId = this.context.occupancy.occupantAt(
        cellIndexOf(this.context, toX, toY),
      );
      if (occupantId !== undefined) {
        const occupant = this.context.actorsByName.get(occupantId);
        const door = occupant?.getComponent(Door);
        if (door && !door.open) {
          // Walking into a closed door is an in-world attempt that consumes
          // the turn and opens the door; the actor stays put.
          entity.addComponent(new PendingAction('openDoor', toX, toY));
        } else {
          // Any blocking actor → bump attack; actors never overlap.
          entity.addComponent(new PendingAction('bump', toX, toY, occupantId));
          entity.addComponent(new AttackIntent(occupantId));
        }
        continue;
      }

      entity.addComponent(new PendingAction('move', toX, toY));
    }
  }

  private reject(entity: Entity, actorId: string, reason: string): void {
    entity.addComponent(new PendingAction('rejected', 0, 0, null, reason));
    this.context.lastActionRejected = true;
    this.context.events.emit({ type: 'INPUT_REJECTED', actorId, reason });
  }
}
