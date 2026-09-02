/**
 * `ROT.Path.AStar` adapter (topology 4). Callers pass a passability predicate
 * combining static tile rules and dynamic occupancy; the intended target cell
 * may be allowed by the caller (e.g. path into the player's cell for a bump).
 * Returns the path excluding the origin, ordered origin→target, or null.
 */

import { Path } from 'rot-js';

import type { GridPoint } from '@/game/grid/dungeon-grid';

export interface FindPathRequest {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly isPassable: (x: number, y: number) => boolean;
}

export function findPathAStar(
  request: FindPathRequest,
): readonly GridPoint[] | null {
  const { fromX, fromY, toX, toY, isPassable } = request;
  // The caller's predicate MUST bounds-check: without bounds, an unreachable
  // target makes A* explore an infinite lattice of out-of-bounds cells.
  const astar = new Path.AStar(toX, toY, (x, y) => isPassable(x, y), {
    topology: 4,
  });
  const path: GridPoint[] = [];
  // rot.js emits origin→target (inclusive of both).
  astar.compute(fromX, fromY, (x, y) => {
    path.push({ x, y });
  });
  if (path.length <= 1) return null;
  path.shift(); // drop the origin; the caller knows where it stands
  return path;
}
