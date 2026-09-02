/**
 * Application controller for the Phase 1 spike. Composes the rot.js dungeon
 * adapter with the ECS spike run and exposes the small surface the route
 * needs: step, project, dispose. Fallsible generation failures surface as the
 * typed `GenerationError` for the presentation boundary to map to UI.
 */

import { createSpikeRun, type SpikeRun } from '@/game/ecs/spike-run';
import type { SceneSnapshot } from '@/game/projection/scene-snapshot';
import { projectSpikeRun } from '@/game/projection/spike-projection';
import {
  generateDungeon,
  type GeneratedFloor,
} from '@/game/rot/rot-dungeon-generator';

export interface SpikeController {
  /** The generated floor (rooms, spawn/exit, captured RNG state). */
  readonly floor: GeneratedFloor;
  /** Advances one logical simulation tick. */
  step(): void;
  /** Builds an immutable snapshot of the committed scene state. */
  project(): SceneSnapshot;
  /** Tears down the ECS Core + Scene (route unmount). */
  dispose(): void;
}

export function startSpikeRun(options: { seed: number }): SpikeController {
  const floor = generateDungeon({ seed: options.seed });
  const run: SpikeRun = createSpikeRun(floor.grid, floor.rooms, floor.spawn);
  return {
    floor,
    step: () => run.step(),
    project: () => projectSpikeRun(run),
    dispose: () => run.dispose(),
  };
}
