import { Core } from '@esengine/ecs-framework';

import { TILE_SIZE } from '@/game/config';
import type { SceneSnapshot } from '@/game/projection/scene-snapshot';
import { projectSpikeRun } from '@/game/projection/spike-projection';
import { generateDungeon } from '@/game/rot/rot-dungeon-generator';
import { createSpikeRun } from '@/game/ecs/spike-run';

// The ECS Core singleton lives on globalThis and outlives jest module
// registries; clear any stale instance from another test file.
beforeEach(() => {
  Core.destroy();
});

describe('projectSpikeRun', () => {
  it('returns a fully frozen snapshot', () => {
    const floor = generateDungeon({ seed: 5 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    const snapshot: SceneSnapshot = projectSpikeRun(run);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.actors)).toBe(true);
    expect(Object.isFrozen(snapshot.tiles)).toBe(true);
    for (const actor of snapshot.actors) {
      expect(Object.isFrozen(actor)).toBe(true);
    }

    run.dispose();
  });

  it('places actor centers on tile centers in logical pixels', () => {
    const floor = generateDungeon({ seed: 5 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    const snapshot = projectSpikeRun(run);
    const hero = snapshot.actors.find((actor) => actor.id === 'hero');
    expect(hero).toBeDefined();
    expect(hero?.x).toBe(floor.spawn.x * TILE_SIZE + TILE_SIZE / 2);
    expect(hero?.y).toBe(floor.spawn.y * TILE_SIZE + TILE_SIZE / 2);

    run.dispose();
  });

  it('copies tiles so renderer mutation cannot reach the grid', () => {
    const floor = generateDungeon({ seed: 5 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    const snapshot = projectSpikeRun(run);
    expect(snapshot.tiles).not.toBe(run.grid.tiles);
    expect(Array.from(snapshot.tiles)).toEqual(Array.from(run.grid.tiles));

    run.dispose();
  });

  it('targets the camera at the hero', () => {
    const floor = generateDungeon({ seed: 5 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);
    expect(projectSpikeRun(run).cameraTargetActorId).toBe('hero');
    run.dispose();
  });
});
