/**
 * `ROT.FOV.PreciseShadowcasting` adapter (topology 4). The caller supplies an
 * opacity predicate (static tile rules plus dynamic `BlocksVision`, e.g.
 * closed doors); the adapter returns every visible cell including the origin.
 */

import { FOV } from 'rot-js';

import type { GridPoint } from '@/game/grid/dungeon-grid';

export interface ComputeFovRequest {
  readonly originX: number;
  readonly originY: number;
  readonly radius: number;
  readonly isOpaque: (x: number, y: number) => boolean;
}

export function computeFovCells(
  request: ComputeFovRequest,
): readonly GridPoint[] {
  const { originX, originY, radius, isOpaque } = request;
  const fov = new FOV.PreciseShadowcasting((x, y) => !isOpaque(x, y));
  const cells: GridPoint[] = [];
  fov.compute(originX, originY, radius, (x, y, _r, visibility) => {
    if (visibility > 0) cells.push({ x, y });
  });
  if (!cells.some((cell) => cell.x === originX && cell.y === originY)) {
    cells.push({ x: originX, y: originY });
  }
  return cells;
}
