/**
 * Project-owned dungeon grid: a compact typed-array tile map with O(1)
 * indexing. Tile IDs are simulation-owned constants; the presentation asset
 * manifest must list tile names in the same order (see
 * `__tests__/presentation/asset-manifest.test.ts` for the contract check).
 *
 * Floor tiles are never entities: walkability and opacity come from these
 * IDs, while dynamic blocking (actors, closed doors) lives in ECS components.
 */

export const TileId = {
  Floor: 0,
  FloorAlt: 1,
  Wall: 2,
  WallTop: 3,
  Door: 4,
  Stairs: 5,
  Crack: 6,
  Rubble: 7,
} as const;

export type TileIdValue = (typeof TileId)[keyof typeof TileId];

/** Tile names in TileId order — must match `assets/atlases/manifest.json`. */
export const TILE_ID_NAMES: readonly string[] = [
  'floor',
  'floor-alt',
  'wall',
  'wall-top',
  'door',
  'stairs',
  'crack',
  'rubble',
];

export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

export interface DungeonGrid {
  readonly width: number;
  readonly height: number;
  /** Row-major `width * height` tiles of `TileId`. */
  readonly tiles: Uint16Array;
}

export function tileAt(grid: DungeonGrid, x: number, y: number): TileIdValue {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return TileId.Wall;
  }
  return grid.tiles[y * grid.width + x] as TileIdValue;
}

const WALKABLE: ReadonlySet<number> = new Set([
  TileId.Floor,
  TileId.FloorAlt,
  TileId.Door,
  TileId.Stairs,
  TileId.Crack,
  TileId.Rubble,
]);

export function isWalkable(grid: DungeonGrid, x: number, y: number): boolean {
  return WALKABLE.has(tileAt(grid, x, y));
}

/** Breadth-first reachability over cardinal moves — O(tiles), no allocation per step. */
export function isReachable(
  grid: DungeonGrid,
  from: GridPoint,
  to: GridPoint,
): boolean {
  if (!isWalkable(grid, from.x, from.y) || !isWalkable(grid, to.x, to.y)) {
    return false;
  }
  const seen = new Uint8Array(grid.width * grid.height);
  const queue: number[] = [from.y * grid.width + from.x];
  seen[queue[0]] = 1;
  const goal = to.y * grid.width + to.x;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    if (index === goal) return true;
    const x = index % grid.width;
    const y = (index - x) / grid.width;
    if (x > 0 && !seen[index - 1] && isWalkable(grid, x - 1, y)) {
      seen[index - 1] = 1;
      queue.push(index - 1);
    }
    if (x + 1 < grid.width && !seen[index + 1] && isWalkable(grid, x + 1, y)) {
      seen[index + 1] = 1;
      queue.push(index + 1);
    }
    if (y > 0 && !seen[index - grid.width] && isWalkable(grid, x, y - 1)) {
      seen[index - grid.width] = 1;
      queue.push(index - grid.width);
    }
    if (
      y + 1 < grid.height &&
      !seen[index + grid.width] &&
      isWalkable(grid, x, y + 1)
    ) {
      seen[index + grid.width] = 1;
      queue.push(index + grid.width);
    }
  }
  return false;
}
