/**
 * Immutable scene snapshot consumed by the renderer.
 *
 * The renderer receives these snapshots and must never mutate gameplay state:
 * everything is readonly, and gameplay code hands over a fresh object when
 * something changes.
 */

export type TileId = number;

export type Facing = 1 | -1;

export interface ActorSnapshot {
  readonly id: string;
  readonly kind: 'hero' | 'monster';
  /** Logical pixel coordinates of the actor's center in the world. */
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** Animation key resolved through the asset manifest. */
  readonly animation: string;
}

export interface SceneSnapshot {
  readonly mapWidthTiles: number;
  readonly mapHeightTiles: number;
  /** Row-major tile ids; length = mapWidthTiles * mapHeightTiles. */
  readonly tiles: readonly TileId[];
  readonly actors: readonly ActorSnapshot[];
  /** The actor the camera should follow. */
  readonly cameraTargetActorId: string;
}
