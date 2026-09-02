/**
 * Turn-finalization system (order 600): consumes the resolved action.
 * Rejected player intents do not consume the turn (the scheduler stays on the
 * player and the run returns to `awaitingInput`); every other action advances
 * the turn counter and hands the schedule to the next actor.
 */

import { ECSSystem, EntitySystem, Matcher } from '@esengine/ecs-framework';

import { PLAYER_STABLE_ID } from '@/game/ai/enemy-ai';
import { PendingAction } from '../components';
import type { RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';

@ECSSystem('TurnFinalizationSystem', {
  updateOrder: SYSTEM_ORDER.turnFinalization,
})
export class TurnFinalizationSystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    // The action component is the resolution record.
    super(Matcher.all(PendingAction));
    this.context = context;
  }

  protected process(
    entities: readonly import('@esengine/ecs-framework').Entity[],
  ): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'TurnFinalizationSystem');
    const runState = this.context.currentRunState;
    if (!runState) return;

    // Remove the consumed action from the current actor.
    for (const entity of entities) {
      entity.removeComponentByType(PendingAction);
    }

    const rejected = this.context.lastActionRejected;
    this.context.lastActionRejected = false;

    if (rejected) {
      // Invalid player input: no turn consumed, still the player's move.
      runState.phase = 'awaitingInput';
      return;
    }

    runState.turnNumber += 1;
    const nextActorId = this.context.scheduler.next();
    runState.currentActorId = nextActorId ?? runState.currentActorId;
    runState.phase =
      runState.currentActorId === PLAYER_STABLE_ID
        ? 'awaitingInput'
        : 'resolving';
  }
}
