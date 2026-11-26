import * as ROT from "rot-js";
import type { Point, WorldMap } from "./world";

const connections: Record<number, number[]> = {
  1: [2],
  2: [1, 3, 4],
  3: [2, 5],
  4: [2, 7],
  5: [3, 6, 7],
  6: [5, 8],
  7: [5, 4],
  8: [6, 9],
  9: [8],
};

function doorPosition(room: number, index: number): Point {
  return [
    { x: 2, y: 12 },
    { x: 38, y: 12 },
    { x: 20, y: 5 },
    { x: 20, y: 19 },
  ][room === 1 ? 1 : index];
}

export function createLegacyDungeon(
  seed: number,
  index = 1,
  variant: "digger" | "uniform" | "cellular" = "digger",
): WorldMap {
  const state = ROT.RNG.getState();
  const previousSeed = ROT.RNG.getSeed();
  try {
    ROT.RNG.setSeed(seed + index * 1031 || 1);
    const map: WorldMap = {
      id: `threshold-${index}`,
      width: 41,
      height: 25,
      tiles: Array(41 * 25).fill(1),
      landmarks: [],
      enemies: [],
      entry: { x: 2, y: 12 },
      exit: { x: 38, y: 12 },
      generator: "rot-web-v1",
    };
    const output = (x: number, y: number, value: number) => {
      map.tiles[y * map.width + x] = value;
    };
    if (variant === "cellular") {
      const generator = new ROT.Map.Cellular(map.width, map.height, { topology: 4 });
      generator.randomize(0.45);
      for (let step = 0; step < 4; step++) generator.create();
      generator.connect(output, 0);
    } else if (variant === "uniform") {
      const generator = new ROT.Map.Uniform(map.width, map.height, { timeLimit: Infinity });
      let attempts = 0;
      const generateRooms = generator._generateRooms.bind(generator);
      generator._generateRooms = () => {
        if (++attempts > 32) throw new Error("Generation budget reached");
        generateRooms();
      };
      let created = false;
      try {
        created = Boolean(generator.create(output));
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "Generation budget reached") throw error;
      }
      if (!created) new ROT.Map.Digger(map.width, map.height, { timeLimit: Infinity }).create(output);
    } else {
      new ROT.Map.Digger(map.width, map.height, { timeLimit: Infinity }).create(output);
    }
    for (let x = 1; x < map.width - 1; x++) {
      for (let y = 11; y <= 13; y++) map.tiles[y * map.width + x] = 0;
    }
    map.landmarks = [
      { id: "return", name: index === 1 ? "Dungeon Entrance" : "Return passage", ...map.entry },
      { id: index === 9 ? "treasure" : "exit", name: index === 9 ? "Signal Cache" : "Passage onward", ...map.exit },
    ];
    if (index === 1) {
      map.landmarks.push({ id: "practice", name: "Practice Post", x: 8, y: 12 });
      for (const [offset, family] of ["light", "rapier", "heavy", "piercing"].entries()) {
        const x = 5 + offset * 2;
        map.tiles[10 * map.width + x] = 0;
        map.landmarks.push({
          id: "rack",
          name: `${family[0].toUpperCase()}${family.slice(1)} Weapon Rack`,
          family,
          x,
          y: 10,
        });
      }
    }
    if (index > 1 && index < 9) {
      map.enemies.push({
        id: `room-${index}`,
        name: index === 8 ? "Vault Warden" : "Glass Mite",
        sprite: index === 8 ? "vault_warden" : "glass_mite",
        x: 24,
        y: 12,
        speed: index === 8 ? 1.2 : 1,
      });
    }
    if (index === 1) {
      map.enemies.push({ id: "room-1", name: "Glass Mite", sprite: "glass_mite", x: 24, y: 12, speed: 1 });
    }
    if (index > 2 && index < 8) {
      const kind = index % 2 ? "cinder_crawler" : "shale_stalker";
      map.enemies.push({
        id: `room-${index}-2`,
        name: kind === "cinder_crawler" ? "Cinder Crawler" : "Shale Stalker",
        sprite: kind,
        x: 27,
        y: 12,
        speed: 0.9,
      });
      if (index > 4) {
        map.enemies.push({
          id: `room-${index}-3`,
          name: "Coil Sentinel",
          sprite: "coil_sentinel",
          x: 29,
          y: 12,
          speed: 1.1,
        });
      }
    }
    map.doors = connections[index].map((target, doorIndex) => {
      const point = doorPosition(index, doorIndex);
      const arrivalIndex = connections[target].indexOf(index);
      const arrival = doorPosition(target, arrivalIndex);
      for (let x = 2; x <= 38; x++) map.tiles[point.y * map.width + x] = 0;
      for (let y = 5; y <= 19; y++) map.tiles[y * map.width + point.x] = 0;
      return { ...point, target, arrival };
    });
    if (index === 9) {
      for (let i = 0; i < 5; i++) {
        map.landmarks.push({ id: `chest_${i}`, name: "Signal Cache", x: 16 + i * 3, y: 12 });
      }
    }
    return map;
  } finally {
    ROT.RNG.setSeed(previousSeed).setState(state);
  }
}

export function legacyDoorBlocked(source: number, target: number, cleared: number[], exploredLinks: string[]) {
  if (target === 8 && [1, 2, 3, 4, 5, 6, 7].some((room) => !cleared.includes(room))) return true;
  if (target === 9 && !cleared.includes(8)) return true;
  const link = [source, target].sort((a, b) => a - b).join(":");
  return source < 9 && !cleared.includes(source) && !exploredLinks.includes(link);
}
