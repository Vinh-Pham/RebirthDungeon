/**
 * rot.js `Map.Digger` adapter: produces a plain, project-owned `DungeonGrid`
 * snapshot with rooms, corridors, spawn, and exit. All rot.js types stay
 * inside this file.
 *
 * Every attempt runs synchronously through `runWithRotRng` so the module RNG
 * is always restored — including when generation throws. Failed attempts are
 * retried with a deterministically derived seed; exhausting the limit throws
 * a typed `GenerationError` with the problems that disqualified each attempt.
 */

import { Map as RotMap } from 'rot-js';

import {
  DungeonGrid,
  GridPoint,
  TileId,
  isReachable,
  isWalkable,
} from '@/game/grid/dungeon-grid';
import type { TileRules } from '@/game/grid/tile-rules';
import type { GenerationProfileDefinition } from '@/domain/content/schemas';

import { runWithRotRng } from './rot-random';

export interface RoomSnapshot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly doors: readonly GridPoint[];
}

export interface CorridorSnapshot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GeneratedFloor {
  /** The derived attempt seed that finally produced this floor. */
  readonly attemptSeed: number;
  readonly grid: DungeonGrid;
  readonly rooms: readonly RoomSnapshot[];
  readonly corridors: readonly CorridorSnapshot[];
  readonly spawn: GridPoint;
  readonly exit: GridPoint;
  /** Module RNG state after generation — captured for saves/replays. */
  readonly rngState: readonly number[];
}

export class GenerationError extends Error {
  readonly seed: number;
  readonly attempts: number;
  readonly problems: readonly string[];

  constructor(seed: number, attempts: number, problems: readonly string[]) {
    super(
      `Dungeon generation failed for seed ${seed} after ${attempts} attempt(s):\n- ` +
        problems.join('\n- '),
    );
    this.name = 'GenerationError';
    this.seed = seed;
    this.attempts = attempts;
    this.problems = problems;
  }
}

export interface GenerateDungeonOptions {
  seed: number;
  /** Content-driven tile semantics (walkability) for validation. */
  rules: TileRules;
  /** Content-driven generation profile; defaults mirror the starter profile. */
  profile?: GenerationProfileDefinition;
  minRooms?: number;
}

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 22;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_MIN_ROOMS = 3;
const DEFAULT_ROOM_WIDTH: [number, number] = [3, 9];
const DEFAULT_ROOM_HEIGHT: [number, number] = [3, 7];
const DEFAULT_CORRIDOR_LENGTH: [number, number] = [2, 10];

/** Golden-ratio step so attempt seeds diverge far apart for any base seed. */
function deriveAttemptSeed(seed: number, attempt: number): number {
  return (seed ^ Math.imul(0x9e3779b9, attempt + 1)) >>> 0;
}

function roomCenter(room: RoomSnapshot): GridPoint {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

export function generateDungeon(
  options: GenerateDungeonOptions,
): GeneratedFloor {
  const { seed, rules, profile, minRooms = DEFAULT_MIN_ROOMS } = options;
  const width = profile?.width ?? DEFAULT_WIDTH;
  const height = profile?.height ?? DEFAULT_HEIGHT;
  const maxAttempts = profile?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const roomWidth = profile?.roomWidth ?? DEFAULT_ROOM_WIDTH;
  const roomHeight = profile?.roomHeight ?? DEFAULT_ROOM_HEIGHT;
  const corridorLength = profile?.corridorLength ?? DEFAULT_CORRIDOR_LENGTH;

  const problems: string[] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = deriveAttemptSeed(seed, attempt);
    try {
      return generateOnce({
        attemptSeed,
        width,
        height,
        minRooms,
        rules,
        diggerOptions: { roomWidth, roomHeight, corridorLength },
      });
    } catch (error) {
      if (error instanceof GenerationAttemptError) {
        problems.push(
          `attempt ${attempt} (seed ${attemptSeed}): ${error.reason}`,
        );
      } else {
        problems.push(
          `attempt ${attempt} (seed ${attemptSeed}): ${String(error)}`,
        );
      }
    }
  }
  throw new GenerationError(seed, maxAttempts, problems);
}

class GenerationAttemptError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}

interface GenerateOnceArgs {
  readonly attemptSeed: number;
  readonly width: number;
  readonly height: number;
  readonly minRooms: number;
  readonly rules: TileRules;
  readonly diggerOptions: {
    roomWidth: [number, number];
    roomHeight: [number, number];
    corridorLength: [number, number];
  };
}

function generateOnce(args: GenerateOnceArgs): GeneratedFloor {
  const { attemptSeed, width, height, minRooms, rules, diggerOptions } = args;

  // rot.js cell values: 1 = wall, 0 = dug floor. Everything rot.js touches
  // (construction, create, getRooms) happens inside the wrapper.
  const outcome = runWithRotRng(attemptSeed, () => {
    const digger = new RotMap.Digger(width, height, {
      roomWidth: diggerOptions.roomWidth,
      roomHeight: diggerOptions.roomHeight,
      corridorLength: diggerOptions.corridorLength,
    });
    const cells = new Uint16Array(width * height).fill(1);
    digger.create((x, y, wall) => {
      cells[y * width + x] = wall ? 1 : 0;
    });
    const rooms: RoomSnapshot[] = digger.getRooms().map((room) => {
      const doors: GridPoint[] = [];
      room.getDoors((x, y) => doors.push({ x, y }));
      return {
        x: room._x1,
        y: room._y1,
        width: room._x2 - room._x1 + 1,
        height: room._y2 - room._y1 + 1,
        doors,
      };
    });
    const corridors: CorridorSnapshot[] = digger
      .getCorridors()
      .map((corridor) => ({
        x: Math.min(corridor._startX, corridor._endX),
        y: Math.min(corridor._startY, corridor._endY),
        width: Math.abs(corridor._endX - corridor._startX) + 1,
        height: Math.abs(corridor._endY - corridor._startY) + 1,
      }));
    return { cells, rooms, corridors };
  });

  const { cells, rooms, corridors } = outcome.value;
  if (rooms.length < minRooms) {
    throw new GenerationAttemptError(
      `only ${rooms.length} room(s) generated, need ${minRooms}`,
    );
  }

  const grid = paintTiles(width, height, cells, rooms);
  const spawn = roomCenter(rooms[0]);
  const exit = roomCenter(rooms[rooms.length - 1]);

  if (
    !isWalkable(grid, rules, spawn.x, spawn.y) ||
    !isWalkable(grid, rules, exit.x, exit.y)
  ) {
    throw new GenerationAttemptError('spawn or exit landed on a wall tile');
  }
  if (!isReachable(grid, rules, spawn, exit)) {
    throw new GenerationAttemptError('spawn and exit are not connected');
  }

  return {
    attemptSeed,
    grid,
    rooms,
    corridors,
    spawn,
    exit,
    rngState: outcome.rngState,
  };
}

/**
 * Translates rot.js cells into project tile IDs. Decorations are a pure
 * function of coordinates, so reproducibility depends only on the seed.
 */
function paintTiles(
  width: number,
  height: number,
  cells: Uint16Array,
  rooms: readonly RoomSnapshot[],
): DungeonGrid {
  const tiles = new Uint16Array(width * height);
  const rotAt = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 1 : cells[y * width + x];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (rotAt(x, y) === 1) {
        // Wall faces show their "top" sprite when floor lies below them.
        tiles[index] = rotAt(x, y + 1) === 0 ? TileId.WallTop : TileId.Wall;
        continue;
      }
      const hash = Math.imul(x, 7) + Math.imul(y, 13);
      tiles[index] =
        hash % 11 === 0
          ? TileId.Crack
          : hash % 11 === 1
            ? TileId.Rubble
            : hash % 3 === 0
              ? TileId.FloorAlt
              : TileId.Floor;
    }
  }

  // Doors sit where corridors meet rooms; the exit gets the stairs sprite.
  for (const room of rooms) {
    for (const door of room.doors) {
      tiles[door.y * width + door.x] = TileId.Door;
    }
  }
  const exit = roomCenter(rooms[rooms.length - 1]);
  tiles[exit.y * width + exit.x] = TileId.Stairs;

  return { width, height, tiles };
}
