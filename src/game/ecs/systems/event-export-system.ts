/**
 * Event-export system (order 800): drains the ordered event queue into the
 * command batch. Nothing runs after it in a tick, so the batch reflects the
 * final committed state of the turn.
 */

import { ECSSystem, EntitySystem, Matcher } from '@esengine/ecs-framework';

import type { RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('EventExportSystem', { updateOrder: SYSTEM_ORDER.eventExport })
export class EventExportSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    super(Matcher.empty());
    this.context = context;
  }

  protected process(
    _entities: readonly import('@esengine/ecs-framework').Entity[],
  ): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'EventExportSystem');
    for (const event of this.context.events.drain()) {
      this.context.commandEvents.push(event);
    }
  }
}
