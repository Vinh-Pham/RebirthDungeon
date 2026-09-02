/**
 * Cleanup system (order 700): destroys entities marked `PendingRemoval`
 * through the framework's deferred command buffer (structural changes never
 * happen mid-iteration) and drops them from the scheduler and occupancy.
 */

import {
  ECSSystem,
  type Entity,
  EntitySystem,
  Matcher,
} from '@esengine/ecs-framework';

import { GridPosition, PendingRemoval, StableId } from '../components';
import { cellIndexOf, type RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('CleanupSystem', { updateOrder: SYSTEM_ORDER.cleanup })
export class CleanupSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    super(Matcher.all(PendingRemoval));
    this.context = context;
  }

  protected process(entities: readonly Entity[]): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'CleanupSystem');

    for (const entity of entities) {
      const stableId = entity.getComponent(StableId);
      const position = entity.getComponent(GridPosition);
      if (stableId) {
        this.context.scheduler.remove(stableId.value);
        this.context.traps.delete(stableId.value);
        this.context.pickups.delete(stableId.value);
      }
      if (position) {
        this.context.occupancy.vacate(
          cellIndexOf(this.context, position.x, position.y),
        );
      }
      // Deferred: executed by the scene at end of tick.
      this.commands.destroyEntity(entity);
    }
  }
}
