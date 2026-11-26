import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createLegacyDungeon, legacyDoorBlocked } from "../../src/game/world/legacy-threshold";
import {
  createDungeon,
  createDungeonFloor,
  createTown,
  openDungeonGates,
  roomAt,
  THRESHOLD_ROOM_COUNT,
  thresholdConnections,
  findPath,
  visibleCells,
  walkable,
} from "../../src/game/world/world";
describe("world generation", () => {
  it("uses six rooms joined in order with open rectangular interiors", () => {
    expect(THRESHOLD_ROOM_COUNT).toBe(6);
    expect(Object.keys(thresholdConnections)).toHaveLength(6);
    for (let room = 1; room <= THRESHOLD_ROOM_COUNT; room++) {
      const map = createDungeon(812, room);
      expect(map.generator).toBe("arena-six-room-v1");
      expect(map.doors?.every((door) => Math.abs(door.target - room) === 1)).toBe(true);
      for (let y = 1; y < map.height - 1; y++) {
        for (let x = 1; x < map.width - 1; x++) expect(walkable(map, x, y)).toBe(true);
      }
    }
  });
  it("keeps the dungeon entrance and exit connected across seeds", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), (seed) => {
        const map = createDungeon(seed);
        map.enemies = [];
        map.landmarks = [];
        const route = findPath(map, map.entry, map.exit);
        expect(route.length).toBeGreaterThan(0);
        expect(route.at(-1)).toEqual(map.exit);
        expect(route.every((point) => walkable(map, point.x, point.y))).toBe(true);
      }),
      { numRuns: 30 },
    );
  });
  it("retains monster-free towns and reachable services", () => {
    const map = createTown("lantern_rest");
    expect(map.enemies).toHaveLength(0);
    for (const landmark of map.landmarks) expect(findPath(map, map.entry, landmark).length).toBeGreaterThan(0);
  });
  it("includes the origin in field of vision", () => {
    const map = createDungeon(123);
    expect(visibleCells(map, map.entry).has(`${map.entry.x},${map.entry.y}`)).toBe(true);
  });
});

describe("town identity and repeatability", () => {
  it("preserves Spindle Hollow's town identity and warden service", () => {
    const map = createTown("spindle_hollow");
    expect(map.id).toBe("spindle_hollow");
    expect(map.landmarks.some((item) => item.id === "warden")).toBe(true);
  });
  it("repeats the simplified rectangular rooms deterministically", () => {
    expect(createDungeon(812, 3)).toEqual(createDungeon(812, 3));
  });
});

it("gives every branch a unique reciprocal door", () => {
  for (let index = 1; index <= 6; index++) {
    const map = createDungeon(12, index);
    expect(new Set(map.doors!.map((door) => `${door.x},${door.y}`)).size).toBe(map.doors!.length);
    for (const door of map.doors!) {
      const target = createDungeon(12, door.target);
      const reciprocal = target.doors!.find((candidate) => candidate.target === index)!;
      expect(door.arrival).toEqual({ x: reciprocal.x, y: reciprocal.y });
    }
  }
});

it("keeps pathfinding from stepping through an occupied service tile", () => {
  const map = createTown("spindle_hollow");
  const from = { x: 14, y: 8 };
  const to = { x: 16, y: 8 };
  expect(findPath(map, from, to).some((point) => point.x === 15 && point.y === 8)).toBe(false);
});

it("keeps legacy chamber generation and progression available for saved runs", () => {
  for (const variant of ["digger", "uniform", "cellular"] as const) {
    const map = createLegacyDungeon(812, 3, variant);
    expect(map).toEqual(createLegacyDungeon(812, 3, variant));
    expect([map.width, map.height]).toEqual([41, 25]);
    expect(map.doors?.map((door) => door.target)).toEqual([2, 5]);
  }
  expect(createLegacyDungeon(812, 9).landmarks.some((landmark) => landmark.id === "treasure")).toBe(true);
  expect(legacyDoorBlocked(6, 8, [6], [])).toBe(true);
  expect(legacyDoorBlocked(6, 8, [1, 2, 3, 4, 5, 6, 7], [])).toBe(false);
});

it("opens the continuous floor one cleared room at a time", () => {
  const map = createDungeonFloor(412);
  expect(map.rooms).toHaveLength(6);
  expect(map.doors).toBeUndefined();
  expect(roomAt(map, map.entry)).toBe(1);
  expect(roomAt(map, map.exit)).toBe(6);
  map.enemies = [];
  map.landmarks = [];
  expect(findPath(map, map.entry, map.exit)).toEqual([]);
  const approach = { x: 9, y: 6 };
  expect(visibleCells(map, approach).has("10,6")).toBe(true);
  expect(visibleCells(map, approach).has("14,6")).toBe(false);
  openDungeonGates(map, [1]);
  expect(visibleCells(map, approach).has("14,6")).toBe(true);
  openDungeonGates(map, [1, 2, 3, 4]);
  expect(findPath(map, map.entry, map.exit)).toEqual([]);
  openDungeonGates(map, [1, 2, 3, 4, 5, 6]);
  const route = findPath(map, map.entry, map.exit);
  expect(route.at(-1)).toEqual(map.exit);
  expect(map.gates?.every((gate) => walkable(map, gate.x, gate.y))).toBe(true);
});
