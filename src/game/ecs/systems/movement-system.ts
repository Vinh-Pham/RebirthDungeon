/**
 * Movement system (order 300): executes the current actor's `PendingAction`.
 * A move re-validates passability, commits `PreviousGridPosition` →
 * `GridPosition`, updates the occupancy index, and emits `ACTOR_MOVED`. A
 * bump emits `ATTACK_BUMP` (the Phase 4 combat slot consumes the intent); a
 * door action opens the door without moving. Rejections only emit — turn
 * finalization decides turn consumption.
 */

import {
  ECSSystem,
  type Entity,
  EntitySystem,
  Matcher,
} from '@esengine/ecs-framework';

import {
  Door,
  GridPosition,
  PendingAction,
  PlayerControlled,
  PreviousGridPosition,
  StableId,
} from '../components';
import { cellIndexOf, isPassableStatic, type RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('MovementSystem', { updateOrder: SYSTEM_ORDER.movement })
export class MovementSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    super(Matcher.all(GridPosition, PendingAction));
    this.context = context;
  }

  protected process(entities: readonly Entity[]): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'MovementSystem');
    const runState = this.context.currentRunState;
    if (!runState) return;

    for (const entity of entities) {
      const stableId = entity.getComponent(StableId);
      if (!stableId || stableId.value !== runState.currentActorId) continue;

      const action = entity.getComponent(PendingAction);
      const position = entity.getComponent(GridPosition);
      if (!action || !position) continue;

      switch (action.kind) {
        case 'move': {
          if (!isPassableStatic(this.context, action.toX, action.toY)) {
            if (entity.getComponent(PlayerControlled)) {
              // Player intent invalidated between validation and execution:
              // no turn consumed.
              this.context.events.emit({
                type: 'INPUT_REJECTED',
                actorId: stableId.value,
                reason: 'blocked',
              });
              action.kind = 'rejected';
              action.reason = 'blocked';
              this.context.lastActionRejected = true;
            } else {
              // An enemy's blocked move degrades to a spent turn so the
              // schedule always advances.
              action.kind = 'wait';
            }
            continue;
          }
          const previous = entity.getComponent(PreviousGridPosition);
          const fromX = position.x;
          const fromY = position.y;
          if (previous) {
            previous.x = fromX;
            previous.y = fromY;
          }
          this.context.occupancy.move(
            cellIndexOf(this.context, fromX, fromY),
            cellIndexOf(this.context, action.toX, action.toY),
            stableId.value,
          );
          position.x = action.toX;
          position.y = action.toY;
          this.context.events.emit({
            type: 'ACTOR_MOVED',
            actorId: stableId.value,
            fromX,
            fromY,
            toX: action.toX,
            toY: action.toY,
          });
          break;
        }
        case 'bump': {
          if (action.targetId) {
            this.context.events.emit({
              type: 'ATTACK_BUMP',
              actorId: stableId.value,
              targetId: action.targetId,
              x: action.toX,
              y: action.toY,
            });
          }
          break;
        }
        case 'openDoor': {
          const occupantId = this.context.occupancy.occupantAt(
            cellIndexOf(this.context, action.toX, action.toY),
          );
          const occupant = occupantId
            ? this.context.actorsByName.get(occupantId)
            : undefined;
          const door = occupant?.getComponent(Door);
          if (door && !door.open) {
            door.open = true;
            // An open door stops occupying the cell: passable and transparent.
            this.context.occupancy.vacate(
              cellIndexOf(this.context, action.toX, action.toY),
            );
            this.context.fov.opacityDirty = true;
            this.context.events.emit({
              type: 'DOOR_OPENED',
              actorId: stableId.value,
              x: action.toX,
              y: action.toY,
            });
          }
          break;
        }
        case 'wait':
        case 'rejected':
          break;
      }
    }
  }
}
