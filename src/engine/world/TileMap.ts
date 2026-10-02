import type { WorldMap } from '../../data/schemas/world';
import { decorationContains } from '../../data/schemas/world';
export interface GridPoint { x: number; y: number }
export function isWalkable(map: WorldMap, point: GridPoint): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 &&
    point.x < map.width && point.y < map.height && map.tiles[point.y * map.width + point.x] !== 1 &&
    !map.decorations.some((decoration) => decoration.blocking && decorationContains(decoration, point)) &&
    !map.objects.some((obj) => obj.x === point.x && obj.y === point.y &&
      (obj.blocked || ['npc', 'chest', 'mimic', 'fountain', 'statue', 'finalChest', 'merchant', 'healer'].includes(obj.kind)));
}
export const distance = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
/** Breadth-first shortest path for these small, uniform-cost maps. No native dependency. */
export function findPath(map: WorldMap, start: GridPoint, goal: GridPoint): GridPoint[] {
  if (!isWalkable(map, start) || !isWalkable(map, goal)) return [];
  const key = (point: GridPoint) => `${point.x},${point.y}`;
  const queue = [start]; const parents = new Map<string, GridPoint | undefined>([[key(start), undefined]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    if (key(current) === key(goal)) {
      const path: GridPoint[] = []; let point: GridPoint | undefined = current;
      while (point && key(point) !== key(start)) { path.unshift(point); point = parents.get(key(point)); }
      return path;
    }
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (isWalkable(map, next) && !parents.has(key(next))) { parents.set(key(next), current); queue.push(next); }
    }
  }
  return [];
}
