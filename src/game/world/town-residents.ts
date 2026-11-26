import Alea from "alea";
import { occupied, type Point, type TownResident, type WorldMap } from "./world";

export const residentRoamSeconds = 0.8;

const roamRadius = 7;
const interiorFloor = 3;
const directions = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function roamTownResidents(
  map: WorldMap,
  residents: readonly TownResident[],
  player: Point,
  seed: number,
  step: number,
): readonly TownResident[] {
  const random = Alea(`town-residents:${map.id}:${seed}:${step}`);
  let moved: TownResident[] | undefined;
  for (const [index, home] of (map.residentSpawns ?? []).entries()) {
    const current = moved ?? residents;
    const resident = current[index];
    if (!resident || random() < 0.45) continue;
    const candidates = directions
      .map(({ x, y }) => ({ x: resident.x + x, y: resident.y + y }))
      .filter(
        (point) =>
          distance(point, home) <= roamRadius &&
          distance(point, player) > 0 &&
          !occupied(map, point) &&
          map.tiles[point.y * map.width + point.x] !== interiorFloor &&
          !current.some((other) => distance(point, other) === 0),
      );
    const next = candidates[Math.floor(random() * candidates.length)];
    if (next) (moved ??= residents.slice())[index] = { ...resident, ...next };
  }
  return moved ?? residents;
}
