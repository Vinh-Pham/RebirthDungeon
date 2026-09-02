import tileDefinitionsJson from '@/assets/data/tile-definitions.json';
import { RNG } from 'rot-js';

import {
  TileId,
  isReachable,
  isWalkable,
  tileAt,
} from '@/game/grid/dungeon-grid';
import { buildTileRules } from '@/game/grid/tile-rules';
import {
  GenerationError,
  generateDungeon,
} from '@/game/rot/rot-dungeon-generator';
import { tileDefinitionsFileSchema } from '@/domain/content/schemas';
import type { GenerationProfileId } from '@/domain/content/ids';

const rules = buildTileRules(
  tileDefinitionsFileSchema.parse(tileDefinitionsJson).tileDefinitions,
);

describe('generateDungeon', () => {
  it('is deterministic for a given seed', () => {
    const first = generateDungeon({ seed: 1234, rules });
    const second = generateDungeon({ seed: 1234, rules });
    expect(first.attemptSeed).toBe(second.attemptSeed);
    expect(Array.from(first.grid.tiles)).toEqual(Array.from(second.grid.tiles));
    expect(first.spawn).toEqual(second.spawn);
    expect(first.exit).toEqual(second.exit);
    expect(first.rooms).toEqual(second.rooms);
    expect(first.corridors).toEqual(second.corridors);
    expect(first.rngState).toEqual(second.rngState);
  });

  it('produces a walkable, connected spawn→exit path', () => {
    const floor = generateDungeon({ seed: 42, rules });
    expect(isWalkable(floor.grid, rules, floor.spawn.x, floor.spawn.y)).toBe(
      true,
    );
    expect(isWalkable(floor.grid, rules, floor.exit.x, floor.exit.y)).toBe(
      true,
    );
    expect(isReachable(floor.grid, rules, floor.spawn, floor.exit)).toBe(true);
    expect(floor.exit).not.toEqual(floor.spawn);
  });

  it('meets the minimum room count and paints the exit stairs', () => {
    const floor = generateDungeon({ seed: 7, rules, minRooms: 3 });
    expect(floor.rooms.length).toBeGreaterThanOrEqual(3);
    expect(floor.corridors.length).toBeGreaterThanOrEqual(1);
    expect(tileAt(floor.grid, floor.exit.x, floor.exit.y)).toBe(TileId.Stairs);
  });

  it('marks room doorways as door tiles', () => {
    const floor = generateDungeon({ seed: 11, rules });
    const doorTiles = floor.rooms.flatMap((room) => room.doors);
    expect(doorTiles.length).toBeGreaterThan(0);
    for (const door of doorTiles) {
      expect(tileAt(floor.grid, door.x, door.y)).toBe(TileId.Door);
    }
  });

  it('honors a content generation profile', () => {
    const floor = generateDungeon({
      seed: 3,
      rules,
      profile: {
        id: 'profile_test' as GenerationProfileId,
        name: 'Test Profile',
        floorStyle: 'digger',
        width: 24,
        height: 18,
        maxAttempts: 3,
        minRooms: 3,
        roomWidth: [3, 7],
        roomHeight: [3, 5],
        corridorLength: [2, 8],
      },
    });
    expect(floor.grid.width).toBe(24);
    expect(floor.grid.height).toBe(18);
    expect(floor.grid.tiles).toHaveLength(24 * 18);
  });

  it('restores the module RNG state after generation', () => {
    RNG.setSeed(5);
    RNG.getUniform();
    const before = RNG.getState();

    generateDungeon({ seed: 42, rules });

    expect(RNG.getState()).toEqual(before);
  });

  it('throws a typed GenerationError when the attempt limit is exhausted', () => {
    RNG.setSeed(5);
    const before = RNG.getState();

    try {
      generateDungeon({ seed: 42, rules, minRooms: 100 });
      throw new Error('expected GenerationError');
    } catch (error) {
      expect(error).toBeInstanceOf(GenerationError);
      const generationError = error as GenerationError;
      expect(generationError.attempts).toBe(5);
      expect(generationError.problems).toHaveLength(5);
      expect(generationError.message).toContain('seed 42');
    }

    // Even a fully failed generation must leave the shared RNG untouched.
    expect(RNG.getState()).toEqual(before);
  });
});
