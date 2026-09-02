/**
 * Ordered run domain events (game plan §4/§8). Systems emit in resolution
 * order; after each `Core.update(0)` the event-export system drains the queue
 * into the command's immutable event batch. Presentation maps events to
 * instructions and never subscribes to the ECS directly.
 */

export type RunEvent =
  | {
      readonly type: 'ACTOR_MOVED';
      readonly actorId: string;
      readonly fromX: number;
      readonly fromY: number;
      readonly toX: number;
      readonly toY: number;
    }
  | {
      readonly type: 'ATTACK_BUMP';
      readonly actorId: string;
      readonly targetId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'DOOR_OPENED';
      readonly actorId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'TRAP_TRIGGERED';
      readonly actorId: string;
      readonly trapId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'PICKUP_COLLECTED';
      readonly actorId: string;
      readonly itemId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'STAIRS_REACHED';
      readonly actorId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'INPUT_REJECTED';
      readonly actorId: string;
      readonly reason: string;
    };

export class RunEventQueue {
  private items: RunEvent[] = [];

  emit(event: RunEvent): void {
    this.items.push(event);
  }

  /** Returns everything queued so far and empties the queue. */
  drain(): readonly RunEvent[] {
    const drained = this.items;
    this.items = [];
    return drained;
  }
}
