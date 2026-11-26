import Alea from "alea";
import { wolves } from "../content/enemies";
import { GRASS, occupied, type Point, type WorldMap } from "./world";

export const wolfRespawnMs = 120_000;
export const wolfRoamSeconds = 2;

const roamRadius = 5;
const steps = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function spawnTownWolves(map: WorldMap, player: Point, respawns: Record<string, number>, now: number) {
  let enemies = map.enemies;
  for (const spawn of map.wolfSpawns ?? []) {
    if ((respawns[spawn.id] ?? 0) > now || enemies.some((enemy) => enemy.id === spawn.id)) continue;
    if (distance(spawn, player) === 0 || occupied({ ...map, enemies }, spawn)) continue;
    const { id, kind, x, y } = spawn;
    enemies = [...enemies, { id, x, y, name: wolves[kind].name, sprite: kind, speed: 1 }];
  }
  return enemies;
}

export function roamTownWolves(map: WorldMap, player: Point, seed: number) {
  const random = Alea(seed);
  let enemies = map.enemies;
  for (const spawn of map.wolfSpawns ?? []) {
    const index = enemies.findIndex((enemy) => enemy.id === spawn.id);
    if (index === -1) continue;
    const enemy = enemies[index];
    const start = Math.floor(random() * steps.length);
    const direction = random() < 0.5 ? 1 : -1;
    for (let offset = 0; offset < steps.length; offset++) {
      const step = steps[(start + direction * offset + steps.length) % steps.length];
      const next = { x: enemy.x + step.x, y: enemy.y + step.y };
      if (
        distance(next, spawn) <= roamRadius &&
        distance(next, player) > 0 &&
        !occupied({ ...map, enemies }, next) &&
        map.tiles[next.y * map.width + next.x] === GRASS
      ) {
        if (enemies === map.enemies) enemies = enemies.slice();
        enemies[index] = { ...enemy, ...next };
        break;
      }
    }
  }
  return enemies;
}
