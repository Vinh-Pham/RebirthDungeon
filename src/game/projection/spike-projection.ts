/**
 * Projects the live spike scene into one immutable snapshot for presentation.
 * Everything is frozen; Skia and Reanimated objects can only ever hold copies
 * of committed state.
 */

import { TILE_SIZE } from '@/game/config';
import type { SpikeRun } from '@/game/ecs/spike-run';
import { GridPosition, Sprite } from '@/game/ecs/spike-components';

import type { ActorSnapshot, SceneSnapshot } from './scene-snapshot';

export function projectSpikeRun(run: SpikeRun): SceneSnapshot {
  const actors: ActorSnapshot[] = run.actors.map(({ entity }) => {
    const position = entity.getComponent(GridPosition);
    const sprite = entity.getComponent(Sprite);
    if (!position || !sprite) {
      throw new Error(`spike actor '${entity.name}' is missing its components`);
    }
    return Object.freeze({
      id: entity.name,
      kind: sprite.kind,
      x: position.x * TILE_SIZE + TILE_SIZE / 2,
      y: position.y * TILE_SIZE + TILE_SIZE / 2,
      facing: sprite.facing,
      animation: sprite.animation,
    });
  });

  return Object.freeze({
    mapWidthTiles: run.grid.width,
    mapHeightTiles: run.grid.height,
    tiles: Object.freeze(Array.from(run.grid.tiles)),
    actors: Object.freeze(actors),
    cameraTargetActorId: 'hero',
  });
}
