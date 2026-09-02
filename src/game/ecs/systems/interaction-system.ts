/**
 * Interaction system (order 400): resolves what the current actor stands on
 * after a successful move — armed traps trigger and disarm, pickups collect
 * (entity marked for cleanup), and the player reaching the stairs emits
 * `STAIRS_REACHED` (floor transitions arrive in Phase 6).
 */

import {
  ECSSystem,
  type Entity,
  EntitySystem,
  Matcher,
} from '@esengine/ecs-framework';

import { TileId } from '@/game/grid/dungeon-grid';
import {
  GridPosition,
  PendingAction,
  PendingRemoval,
  Pickup,
  PreviousGridPosition,
  StableId,
  Trap,
} from '../components';
import { cellIndexOf, type RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('InteractionSystem', { updateOrder: SYSTEM_ORDER.interaction })
export class InteractionSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    super(Matcher.all(GridPosition, StableId));
    this.context = context;
  }

  protected process(entities: readonly Entity[]): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'InteractionSystem');
    const runState = this.context.currentRunState;
    if (!runState) return;

    for (const entity of entities) {
      const stableId = entity.getComponent(StableId);
      if (!stableId || stableId.value !== runState.currentActorId) continue;
      const position = entity.getComponent(GridPosition);
      if (!position) continue;

      // Only an actor that just moved interacts with its new cell.
      const action = entity.getComponent(PendingAction);
      const previous = entity.getComponent(PreviousGridPosition);
      const justMoved =
        action?.kind === 'move' &&
        !!previous &&
        (previous.x !== position.x || previous.y !== position.y);
      if (!justMoved) continue;

      // Traps: an armed trap under the actor triggers and disarms.
      for (const [trapId, trapEntity] of this.context.traps) {
        const trapPosition = trapEntity.getComponent(GridPosition);
        const trap = trapEntity.getComponent(Trap);
        if (
          trap?.armed &&
          trapPosition &&
          trapPosition.x === position.x &&
          trapPosition.y === position.y
        ) {
          trap.armed = false;
          this.context.events.emit({
            type: 'TRAP_TRIGGERED',
            actorId: stableId.value,
            trapId,
            x: position.x,
            y: position.y,
          });
        }
      }

      // Pickups: collect whatever shares the actor's cell.
      for (const [pickupId, pickupEntity] of this.context.pickups) {
        const pickupPosition = pickupEntity.getComponent(GridPosition);
        if (
          pickupPosition &&
          pickupPosition.x === position.x &&
          pickupPosition.y === position.y
        ) {
          const pickup = pickupEntity.getComponent(Pickup);
          this.context.events.emit({
            type: 'PICKUP_COLLECTED',
            actorId: stableId.value,
            itemId: pickup?.itemId ?? pickupId,
            x: position.x,
            y: position.y,
          });
          pickupEntity.addComponent(new PendingRemoval());
        }
      }

      // Stairs: the player standing on the exit tile (Phase 6 transitions).
      if (
        stableId.value === 'hero' &&
        this.context.grid.tiles[
          cellIndexOf(this.context, position.x, position.y)
        ] === TileId.Stairs
      ) {
        this.context.events.emit({
          type: 'STAIRS_REACHED',
          actorId: stableId.value,
          x: position.x,
          y: position.y,
        });
      }
    }
  }
}
