/**
 * RunController (game plan §8): the application boundary over the run scene.
 * One command resolution runs at a time — the controller validates the
 * command, sets the player intent, steps the ECS until the schedule returns
 * to the player (bounded by a maximum automatic-actor-step guard), and hands
 * back the committed snapshot with its ordered event batch.
 *
 * Command resolution is fully synchronous: no `await`, timers, or async I/O
 * happens inside a turn.
 */

import { PLAYER_STABLE_ID } from '@/game/ai/enemy-ai';
import type { ContentCatalog } from '@/domain/content/catalog';
import type { GenerationProfileDefinition } from '@/domain/content/schemas';
import { GridPosition, MoveIntent, PendingAction } from '@/game/ecs/components';
import { createRunScene, type RunScene } from '@/game/ecs/run-scene';
import { isPassableStatic, type RunContext } from '@/game/ecs/run-context';
import {
  projectRunScene,
  type RunSnapshot,
} from '@/game/projection/run-snapshot';
import { findPathAStar } from '@/game/rot/rot-pathfinder';

export interface RunCommandResult {
  readonly status: 'accepted' | 'rejected';
  readonly reason?: string;
}

/** Defect guard: the scheduler failed to return to the player in time. */
export class RunControllerDefect extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunControllerDefect';
  }
}

const MAX_AUTOMATIC_ACTOR_STEPS = 64;

export interface RunController {
  readonly seed: number;
  submitMove(dx: number, dy: number): RunCommandResult;
  submitWait(): RunCommandResult;
  /** Tap-to-walk: one step toward the target cell, revalidated per command. */
  submitTapMove(targetX: number, targetY: number): RunCommandResult;
  snapshot(): RunSnapshot;
  dispose(): void;
}

export interface StartRunOptions {
  readonly seed: number;
  readonly content: ContentCatalog;
  readonly profile?: GenerationProfileDefinition;
}

export function startRun(options: StartRunOptions): RunController {
  const runScene: RunScene = createRunScene(options);

  const context: RunContext = runScene.context;
  const runState = () => {
    const state = context.currentRunState;
    if (!state) throw new RunControllerDefect('run state missing');
    return state;
  };

  const playerEntity = context.actorsByName.get(PLAYER_STABLE_ID);
  if (!playerEntity) {
    throw new RunControllerDefect('player entity missing after run start');
  }

  function awaitingPlayerInput(): boolean {
    return (
      runState().phase === 'awaitingInput' &&
      runState().currentActorId === PLAYER_STABLE_ID
    );
  }

  function resolveUntilPlayerInput(): void {
    let steps = 0;
    do {
      runScene.step();
      steps += 1;
      if (steps > MAX_AUTOMATIC_ACTOR_STEPS) {
        throw new RunControllerDefect(
          `scheduler did not reach the player within ${MAX_AUTOMATIC_ACTOR_STEPS} automatic steps`,
        );
      }
    } while (!awaitingPlayerInput());
  }

  function reject(reason: string): RunCommandResult {
    return { status: 'rejected', reason };
  }

  function applyIntent(setIntent: () => void): RunCommandResult {
    if (!awaitingPlayerInput()) {
      return reject('busy');
    }
    context.commandEvents = [];
    runState().batchId += 1;
    setIntent();
    runState().phase = 'resolving';
    resolveUntilPlayerInput();
    const rejectedEvent = context.commandEvents.find(
      (event) => event.type === 'INPUT_REJECTED',
    );
    return rejectedEvent
      ? reject(rejectedEvent.reason)
      : { status: 'accepted' };
  }

  function firstStepToward(
    targetX: number,
    targetY: number,
  ): { dx: number; dy: number } | null {
    const playerPosition = playerEntity?.getComponent(GridPosition);
    if (!playerPosition) return null;
    const path = findPathAStar({
      fromX: playerPosition.x,
      fromY: playerPosition.y,
      toX: targetX,
      toY: targetY,
      // The origin cell holds this actor and the tapped cell is allowed even
      // if occupied — movement validation makes the final ruling.
      isPassable: (x, y) =>
        (x === playerPosition.x && y === playerPosition.y) ||
        isPassableStatic(context, x, y) ||
        (x === targetX && y === targetY),
    });
    if (!path || path.length === 0) return null;
    const step = path[0];
    return { dx: step.x - playerPosition.x, dy: step.y - playerPosition.y };
  }

  return {
    seed: options.seed,

    submitMove(dx, dy) {
      if (!Number.isInteger(dx) || !Number.isInteger(dy)) {
        return reject('invalid-direction');
      }
      if (Math.abs(dx) + Math.abs(dy) !== 1) {
        return reject('invalid-direction');
      }
      return applyIntent(() => {
        playerEntity.addComponent(new MoveIntent(dx, dy));
      });
    },

    submitWait() {
      return applyIntent(() => {
        playerEntity.addComponent(new PendingAction('wait'));
      });
    },

    submitTapMove(targetX, targetY) {
      if (
        !Number.isInteger(targetX) ||
        !Number.isInteger(targetY) ||
        targetX < 0 ||
        targetY < 0 ||
        targetX >= context.grid.width ||
        targetY >= context.grid.height
      ) {
        return reject('out-of-bounds');
      }
      const playerPosition = playerEntity.getComponent(GridPosition);
      if (
        playerPosition &&
        playerPosition.x === targetX &&
        playerPosition.y === targetY
      ) {
        return reject('same-cell');
      }
      const step = firstStepToward(targetX, targetY);
      if (!step) return reject('no-path');
      return this.submitMove(step.dx, step.dy);
    },

    snapshot() {
      return projectRunScene(context);
    },

    dispose() {
      runScene.dispose();
    },
  };
}
