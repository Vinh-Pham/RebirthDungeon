/**
 * Run-level state as a singleton component (Phase 3): one dedicated entity
 * carries the whole run/floor/turn/phase state so it round-trips through ECS
 * serialization later (Phase 7). `sceneData` remains infrastructure-only
 * (system order log, event batch).
 */

import { Component, ECSComponent } from '@esengine/ecs-framework';

export type RunPhase = 'awaitingInput' | 'resolving';

@ECSComponent('RunState')
export class RunStateComponent extends Component {
  readonly runId: string;
  readonly dungeonId: string;
  readonly floorIndex: number;
  turnNumber: number;
  /** Stable id of the actor the scheduler currently points at. */
  currentActorId: string | null;
  phase: RunPhase;
  /** Increments once per accepted command batch — presentation cursor. */
  batchId: number;

  constructor(runId: string, dungeonId: string, floorIndex: number) {
    super();
    this.runId = runId;
    this.dungeonId = dungeonId;
    this.floorIndex = floorIndex;
    this.turnNumber = 0;
    this.currentActorId = null;
    this.phase = 'resolving';
    this.batchId = 0;
  }
}

export const RUN_STATE_ENTITY_NAME = 'runState';

/** Names of the run-level singleton entity; only `runState` carries RunState. */
export function isRunStateEntity(name: string): boolean {
  return name === RUN_STATE_ENTITY_NAME;
}
