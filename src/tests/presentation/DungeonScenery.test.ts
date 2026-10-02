import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { createDungeonRun, generateDungeon, projectDungeonMap } from '../../engine/dungeon/Dungeon';
import { dungeonScenery, type DungeonSceneMap } from '../../renderer/DungeonScenery';

const content = loadGameContent().data;

describe('spider dungeon scenery', () => {
  it('decorates room corners while keeping spawns and interactive objects visible', () => {
    const map: DungeonSceneMap = { width: 6, height: 6, tileSize: 32,
      tiles: Array.from({ length: 36 }, (_, i) => i < 6 || i >= 30 || i % 6 === 0 || i % 6 === 5 ? 1 : 0),
      spawns: [{ x: 1, y: 4 }], objects: [{ x: 4, y: 4 }] };
    const batches = dungeonScenery(map);
    expect(batches.find((batch) => batch.id === 'dungeon-cobweb-corner')?.positions).toContainEqual({ x: 1, y: 1 });
    expect(batches.find((batch) => batch.id === 'dungeon-hanging-web')?.positions).toContainEqual({ x: 4, y: 1 });
    for (const batch of batches.filter((entry) => !['dungeon-stone-wall', 'dungeon-stone-floor', 'dungeon-cracked-floor'].includes(entry.id))) {
      expect(batch.positions).not.toContainEqual({ x: 1, y: 4 });
      expect(batch.positions).not.toContainEqual({ x: 4, y: 4 });
    }
  });

  it('covers generated maps and battles without changing saved geometry or progression', () => {
    const used = new Set<string>();
    for (let seed = 0; seed < 10; seed++) {
      const run = createDungeonRun(generateDungeon(content.dungeons[0], seed), { worldId: 'refuge', position: { x: 7, y: 5 } });
      const before = structuredClone(run);
      for (const map of [projectDungeonMap(run), ...run.blueprint.encounters.map((entry) => entry.map)]) {
        const batches = dungeonScenery(map);
        expect(dungeonScenery(map)).toEqual(batches);
        const terrain = batches.filter((batch) => ['dungeon-stone-wall', 'dungeon-stone-floor', 'dungeon-cracked-floor'].includes(batch.id));
        expect(terrain.flatMap((batch) => batch.positions)).toHaveLength(map.width * map.height);
        for (const batch of batches) {
          used.add(batch.id);
          expect(content.atlases.find((atlas) => atlas.id === batch.id)).toMatchObject({ frameWidth: 32, frameHeight: 32 });
          for (const { x, y } of batch.positions) {
            expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(map.width);
            expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(map.height);
          }
        }
      }
      expect(run).toEqual(before);
    }
    expect(used.size).toBe(8);
  });
});
