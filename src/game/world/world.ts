import * as ROT from "rot-js";
import { World } from "miniplex";

export { createLdtkTown as createTown } from "./ldtk-town";

export interface Point {
  x: number;
  y: number;
}
export interface Landmark extends Point {
  id: string;
  name: string;
  sprite?: string;
  family?: string;
}
export interface MapEnemy extends Point {
  id: string;
  name: string;
  sprite: string;
  speed: number;
  due?: number;
  room?: number;
}
export type WolfKind = "gray_wolf" | "white_wolf";
export interface WolfSpawn extends Point {
  id: string;
  kind: WolfKind;
}
export type LargeTreeKind = "town_tree_pine" | "town_tree_canopy" | "town_tree_crystal" | "town_tree_apple";
export interface LargeTree extends Point {
  id: string;
  kind: LargeTreeKind;
  width: number;
  height: number;
}
export interface TownResident extends Point {
  id: string;
}
export interface Door extends Point {
  target: number;
  arrival: Point;
}
export interface WorldMap {
  id: string;
  width: number;
  height: number;
  tiles: number[];
  landmarks: Landmark[];
  enemies: MapEnemy[];
  largeTrees?: LargeTree[];
  wolfSpawns?: WolfSpawn[];
  residentSpawns?: TownResident[];
  entry: Point;
  exit: Point;
  generator: string;
  subtitle?: string;
  doors?: Door[];
  rooms?: DungeonRoom[];
  gates?: Array<Point & { room: number }>;
}
export interface DungeonRoom extends Point {
  id: number;
  width: number;
  height: number;
}
export const CLOSED_DUNGEON_GATE = 4;
export const WATER = 5;
export const GRASS = 6;
export const BUSH = 7;
export const DIRT_PATH = 8;
export const key = (x: number, y: number) => `${x},${y}`;
export const walkable = (map: WorldMap, x: number, y: number) =>
  x >= 0 &&
  y >= 0 &&
  x < map.width &&
  y < map.height &&
  map.tiles[y * map.width + x] !== 1 &&
  map.tiles[y * map.width + x] !== CLOSED_DUNGEON_GATE &&
  map.tiles[y * map.width + x] !== WATER &&
  map.tiles[y * map.width + x] !== BUSH &&
  !(map.largeTrees ?? []).some(
    (tree) => x >= tree.x && x < tree.x + tree.width && y >= tree.y && y < tree.y + tree.height,
  );
function scoped<T>(seed: number, run: () => T): T {
  const state = ROT.RNG.getState();
  const previousSeed = ROT.RNG.getSeed();
  try {
    ROT.RNG.setSeed(seed || 1);
    return run();
  } finally {
    ROT.RNG.setSeed(previousSeed).setState(state);
  }
}
function base(id: string, width: number, height: number): WorldMap {
  return {
    id,
    width,
    height,
    tiles: Array(width * height).fill(1),
    landmarks: [],
    enemies: [],
    entry: { x: 3, y: 12 },
    exit: { x: width - 3, y: 12 },
    generator: "rot-web-v1",
  };
}
export function createDungeon(seed: number, index = 1): WorldMap {
  return scoped(seed + index * 1031, () => {
    const map = base(`threshold-${index}`, 21, 15);
    const output = (x: number, y: number, value: number) => {
      map.tiles[y * map.width + x] = value;
    };
    new ROT.Map.Arena(map.width, map.height).create(output);
    map.generator = THRESHOLD_GENERATOR;
    map.entry = { x: 2, y: 7 };
    map.exit = { x: 18, y: 7 };
    map.landmarks = index === 1 ? [{ id: "return", name: "Dungeon Entrance", ...map.entry }] : [];
    if (index === THRESHOLD_ROOM_COUNT) {
      map.landmarks.push(
        { id: "treasure", name: "Signal Cache", x: 15, y: 5 },
        { id: "far-exit", name: "Settlement Passage", ...map.exit },
      );
    }
    if (index === 1) {
      map.landmarks.push({
        id: "practice",
        name: "Practice Post",
        x: 8,
        y: 9,
      });
      for (const [offset, family] of ["light", "rapier", "heavy", "piercing"].entries()) {
        const x = 5 + offset * 2;
        map.tiles[4 * map.width + x] = 0;
        map.landmarks.push({
          id: "rack",
          name: `${family[0].toUpperCase()}${family.slice(1)} Weapon Rack`,
          family,
          x,
          y: 4,
        });
      }
    }
    const vault = index === THRESHOLD_ROOM_COUNT;
    map.enemies.push({
      id: `room-${index}`,
      name: vault ? "Vault Warden" : "Glass Mite",
      sprite: vault ? "vault_warden" : "glass_mite",
      x: 13,
      y: 7,
      speed: vault ? 1.2 : 1,
    });
    if (index > 2 && index < THRESHOLD_ROOM_COUNT) {
      const kind = ROT.RNG.getUniform() < 0.5 ? "cinder_crawler" : "shale_stalker";
      map.enemies.push({
        id: `room-${index}-2`,
        name: kind === "cinder_crawler" ? "Cinder Crawler" : "Shale Stalker",
        sprite: kind,
        x: 15,
        y: 7,
        speed: 0.9,
      });
      if (index > 4)
        map.enemies.push({
          id: `room-${index}-3`,
          name: "Coil Sentinel",
          sprite: "coil_sentinel",
          x: 16,
          y: 7,
          speed: 1.1,
        });
    }
    map.doors = thresholdConnections[index].map((target, doorIndex) => {
      const point = doorPosition(index, doorIndex);
      const arrivalIndex = thresholdConnections[target].indexOf(index);
      const arrival = doorPosition(target, arrivalIndex);
      return { ...point, target, arrival };
    });
    return map;
  });
}
export function findPath(map: WorldMap, from: Point, to: Point): Point[] {
  const path: Point[] = [];
  new ROT.Path.AStar(
    to.x,
    to.y,
    (x, y) =>
      walkable(map, x, y) && ((x === from.x && y === from.y) || (x === to.x && y === to.y) || !occupied(map, { x, y })),
    { topology: 4 },
  ).compute(from.x, from.y, (x, y) => path.push({ x, y }));
  return path.slice(1);
}
export function pursuitPath(map: WorldMap, from: Point, to: Point): Point[] {
  const path: Point[] = [];
  new ROT.Path.Dijkstra(
    to.x,
    to.y,
    (x, y) =>
      walkable(map, x, y) && ((x === from.x && y === from.y) || (x === to.x && y === to.y) || !occupied(map, { x, y })),
    { topology: 4 },
  ).compute(from.x, from.y, (x, y) => path.push({ x, y }));
  return path.slice(1);
}
export function visibleCells(map: WorldMap, origin: Point, radius = 9): Set<string> {
  const cells = new Set<string>();
  new ROT.FOV.PreciseShadowcasting((x, y) => walkable(map, x, y), {
    topology: 8,
  }).compute(origin.x, origin.y, radius, (x, y) => {
    if (x >= 0 && y >= 0 && x < map.width && y < map.height) cells.add(key(x, y));
  });
  return cells;
}
export function lightCells(map: WorldMap, origin: Point): Map<string, number[]> {
  const values = new Map<string, number[]>();
  const fov = new ROT.FOV.PreciseShadowcasting((x, y) => walkable(map, x, y));
  new ROT.Lighting(() => 0.15, { range: 9, passes: 1 })
    .setFOV(fov)
    .setLight(origin.x, origin.y, [180, 205, 160])
    .compute((x, y, color) => {
      if (x >= 0 && y >= 0 && x < map.width && y < map.height) values.set(key(x, y), color);
    });
  return values;
}
export function generateName(seed: number): string {
  return scoped(seed, () => {
    const generator = new ROT.StringGenerator({});
    ["Lantern", "Spindle", "Cinder", "Threshold", "Ilex", "Nera", "Venn"].forEach((name) => generator.observe(name));
    return generator.generate().slice(0, 24);
  });
}
export interface WorldEntity {
  id: string;
  position: Point;
  landmark?: Landmark;
  enemy?: MapEnemy;
}
export function createEntities(map: WorldMap): World<WorldEntity> {
  const world = new World<WorldEntity>();
  map.landmarks.forEach((landmark, i) =>
    world.add({
      id: `${landmark.id}-${i}`,
      position: { x: landmark.x, y: landmark.y },
      landmark,
    }),
  );
  map.enemies.forEach((enemy) => world.add({ id: enemy.id, position: { x: enemy.x, y: enemy.y }, enemy }));
  return world;
}
export const THRESHOLD_ROOM_COUNT = 6;
export const THRESHOLD_GENERATOR = "arena-six-room-v1";
export const thresholdConnections: Record<number, number[]> = {
  1: [2],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4, 6],
  6: [5],
};

export function doorBlocked(source: number, target: number, cleared: number[], exploredLinks: string[]): boolean {
  const link = [source, target].sort((a, b) => a - b).join(":");
  return !cleared.includes(source) && !exploredLinks.includes(link);
}
export function occupied(map: WorldMap, point: Point): boolean {
  return (
    !walkable(map, point.x, point.y) ||
    map.landmarks.some((item) => item.x === point.x && item.y === point.y) ||
    (map.largeTrees ?? []).some(
      (tree) => point.x >= tree.x && point.x < tree.x + tree.width && point.y >= tree.y && point.y < tree.y + tree.height,
    ) ||
    map.enemies.some((item) => item.x === point.x && item.y === point.y)
  );
}
export function advanceWorldActors(map: WorldMap, target: Point, room?: number): MapEnemy[] {
  const result = map.enemies.map((enemy) => ({ ...enemy }));
  const activeEnemies = room === undefined ? result : result.filter((enemy) => enemy.room === room);
  if (!activeEnemies.length) return result;
  const action = new ROT.Scheduler.Action<string>();
  action.add("player-step", true, 1);
  action.next();
  const elapsedBeforeStep = action.getTime();
  const terrain = map.tiles[target.y * map.width + target.x];
  action.setDuration(terrain === 2 ? 1.5 : 1);
  action.next();
  const elapsed = action.getTime() - elapsedBeforeStep;

  const live = { ...map, enemies: result };
  const speed = new ROT.Scheduler.Speed<{
    enemy: MapEnemy;
    getSpeed: () => number;
  }>();
  const actors = activeEnemies.map((enemy) => ({
    enemy,
    getSpeed: () => Math.min(3, Math.max(0.2, enemy.speed)),
  }));
  for (const actor of actors) speed.add(actor, false, actor.enemy.due);
  for (;;) {
    const ready = actors.some((actor) => {
      const due = speed.getTimeOf(actor);
      return due !== undefined && speed.getTime() + due <= elapsed + 1e-10;
    });
    if (!ready) break;
    const actor = speed.next();
    if (!actor) break;
    const enemy = actor.enemy;
    speed.add(actor, false);
    if (Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y) <= 1) continue;
    const route = actors.length === 1 ? findPath(live, enemy, target) : pursuitPath(live, enemy, target);
    const next = route[0];
    if (next && !(next.x === target.x && next.y === target.y) && !occupied(live, next)) Object.assign(enemy, next);
  }
  for (const actor of actors)
    actor.enemy.due = Math.max(1e-8, speed.getTime() + (speed.getTimeOf(actor) ?? 1) - elapsed);
  return result;
}

function doorPosition(room: number, index: number): Point {
  return { x: room === 1 || index === 1 ? 18 : 2, y: 7 };
}

export const DUNGEON_FLOOR_GENERATOR = "continuous-six-room-v1";

export function roomAt(map: WorldMap, point: Point): number | undefined {
  return map.rooms?.find(
    (room) => point.x >= room.x && point.x < room.x + room.width && point.y >= room.y && point.y < room.y + room.height,
  )?.id;
}

export function openDungeonGates(map: WorldMap, cleared: readonly number[]) {
  for (const gate of map.gates ?? [])
    map.tiles[gate.y * map.width + gate.x] = cleared.includes(gate.room) ? 0 : CLOSED_DUNGEON_GATE;
}

export function createDungeonFloor(seed: number): WorldMap {
  return scoped(seed, () => {
    const map = base("threshold-floor", 38, 25);
    map.generator = DUNGEON_FLOOR_GENERATOR;
    map.rooms = [
      { id: 1, x: 2, y: 3, width: 8, height: 7 },
      { id: 2, x: 14, y: 3, width: 8, height: 7 },
      { id: 3, x: 27, y: 3, width: 8, height: 7 },
      { id: 4, x: 27, y: 16, width: 8, height: 7 },
      { id: 5, x: 14, y: 16, width: 8, height: 7 },
      { id: 6, x: 2, y: 16, width: 8, height: 7 },
    ];
    for (const room of map.rooms) {
      new ROT.Map.Arena(room.width + 2, room.height + 2).create((x, y, value) => {
        if (!value) map.tiles[(room.y + y - 1) * map.width + room.x + x - 1] = 0;
      });
    }
    const carve = (from: Point, to: Point) => {
      const dx = Math.sign(to.x - from.x);
      const dy = Math.sign(to.y - from.y);
      const count = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
      for (let step = 0; step <= count; step++) map.tiles[(from.y + dy * step) * map.width + from.x + dx * step] = 0;
    };
    carve({ x: 9, y: 6 }, { x: 14, y: 6 });
    carve({ x: 21, y: 6 }, { x: 27, y: 6 });
    carve({ x: 31, y: 9 }, { x: 31, y: 16 });
    carve({ x: 27, y: 19 }, { x: 21, y: 19 });
    carve({ x: 14, y: 19 }, { x: 9, y: 19 });
    map.gates = [
      { x: 10, y: 6, room: 1 },
      { x: 22, y: 6, room: 2 },
      { x: 31, y: 10, room: 3 },
      { x: 26, y: 19, room: 4 },
      { x: 13, y: 19, room: 5 },
    ];
    map.entry = { x: 3, y: 6 };
    map.exit = { x: 3, y: 20 };
    map.landmarks = [
      { id: "return", name: "Dungeon Entrance", ...map.entry },
      { id: "far-exit", name: "Settlement Passage", ...map.exit },
      { id: "treasure", name: "Signal Cache", x: 6, y: 21 },
      { id: "practice", name: "Practice Post", x: 5, y: 8 },
    ];
    for (const [offset, family] of ["light", "rapier", "heavy", "piercing"].entries()) {
      map.landmarks.push({
        id: "rack",
        name: `${family[0].toUpperCase()}${family.slice(1)} Weapon Rack`,
        family,
        x: 3 + offset * 2,
        y: 4,
      });
    }
    for (const room of map.rooms) {
      const boss = room.id === 6;
      map.enemies.push({
        id: `room-${room.id}`,
        room: room.id,
        name: boss ? "Vault Warden" : "Glass Mite",
        sprite: boss ? "vault_warden" : "glass_mite",
        x: room.x + room.width - 3,
        y: room.y + 3,
        speed: boss ? 1.2 : 1,
      });
      if (room.id > 2 && !boss) {
        const kind = ROT.RNG.getUniform() < 0.5 ? "cinder_crawler" : "shale_stalker";
        map.enemies.push({
          id: `room-${room.id}-2`,
          room: room.id,
          name: kind === "cinder_crawler" ? "Cinder Crawler" : "Shale Stalker",
          sprite: kind,
          x: room.x + room.width - 2,
          y: room.y + 4,
          speed: 0.9,
        });
        if (room.id > 4)
          map.enemies.push({
            id: `room-${room.id}-3`,
            room: room.id,
            name: "Coil Sentinel",
            sprite: "coil_sentinel",
            x: room.x + room.width - 3,
            y: room.y + 5,
            speed: 1.1,
          });
      }
    }
    openDungeonGates(map, []);
    return map;
  });
}
