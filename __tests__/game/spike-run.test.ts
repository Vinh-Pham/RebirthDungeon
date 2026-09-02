import { Core } from '@esengine/ecs-framework';

import { projectSpikeRun } from '@/game/projection/spike-projection';
import { generateDungeon } from '@/game/rot/rot-dungeon-generator';
import { createSpikeRun } from '@/game/ecs/spike-run';
import { systemOrderLog } from '@/game/ecs/spike-systems';

// The ECS framework keeps its Core singleton on globalThis, which outlives a
// jest file's module registry — a stale instance from another file would be
// returned by Core.create() and break component wiring.
beforeEach(() => {
  Core.destroy();
});

describe('createSpikeRun', () => {
  it('spawns a hero at the dungeon spawn plus patrolling slimes', () => {
    const floor = generateDungeon({ seed: 1234 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    expect(run.actors.length).toBeGreaterThanOrEqual(2);
    expect(run.actors[0].entity.name).toBe('hero');
    expect(run.actors.filter((actor) => actor.kind === 'monster').length).toBe(
      Math.min(3, floor.rooms.length - 1),
    );
    expect(floor.rooms.length - 1).toBeGreaterThanOrEqual(
      run.actors.length - 1,
    );

    run.dispose();
  });

  it('advances systems in declared updateOrder every step', () => {
    const floor = generateDungeon({ seed: 1234 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    run.step();
    run.step();
    expect(systemOrderLog(run.scene)).toEqual([
      'PatrolSystem',
      'SpriteSystem',
      'PatrolSystem',
      'SpriteSystem',
    ]);

    run.dispose();
  });

  it('moves patrolling slimes one cell per step while the hero stays put', () => {
    const floor = generateDungeon({ seed: 1234 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    const before = projectSpikeRun(run);
    const slimeBefore = before.actors.find((a) => a.kind === 'monster');
    expect(slimeBefore).toBeDefined();

    run.step();
    run.step();
    run.step();

    const after = projectSpikeRun(run);
    const heroAfter = after.actors.find((a) => a.kind === 'hero');
    expect(heroAfter?.x).toBe(before.actors[0].x);
    const slimeAfter = after.actors.find((a) => a.kind === 'monster');
    expect(slimeAfter?.x).not.toBe(slimeBefore?.x);

    run.dispose();
  });

  it('eventually flips a slime to face left on its return leg', () => {
    const floor = generateDungeon({ seed: 1234 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);

    let sawLeftFacing = false;
    for (let i = 0; i < 400 && !sawLeftFacing; i++) {
      run.step();
      const snapshot = projectSpikeRun(run);
      sawLeftFacing = snapshot.actors.some(
        (actor) => actor.kind === 'monster' && actor.facing === -1,
      );
    }
    expect(sawLeftFacing).toBe(true);

    run.dispose();
  });

  it('reproduces identical runs for the same seed and step count', () => {
    // The ECS Core owns exactly one active scene at a time (one run = one
    // Scene), so the two runs are stepped sequentially, not concurrently.
    const floorA = generateDungeon({ seed: 777 });
    const runA = createSpikeRun(floorA.grid, floorA.rooms, floorA.spawn);
    for (let i = 0; i < 25; i++) runA.step();
    const snapshotA = JSON.stringify(projectSpikeRun(runA));
    runA.dispose();

    const floorB = generateDungeon({ seed: 777 });
    const runB = createSpikeRun(floorB.grid, floorB.rooms, floorB.spawn);
    for (let i = 0; i < 25; i++) runB.step();
    const snapshotB = JSON.stringify(projectSpikeRun(runB));
    runB.dispose();

    expect(snapshotB).toBe(snapshotA);
  });

  it('disposes the Core cleanly and allows a fresh run afterwards', () => {
    const floor = generateDungeon({ seed: 1234 });
    const run = createSpikeRun(floor.grid, floor.rooms, floor.spawn);
    expect(Core.Instance).not.toBeNull();

    run.step();
    run.dispose();
    expect(Core.Instance).toBeNull();

    // Route remount: a new Core + Scene must work after the old one died.
    const next = createSpikeRun(floor.grid, floor.rooms, floor.spawn);
    expect(Core.Instance).not.toBeNull();
    next.step();
    next.dispose();
    expect(Core.Instance).toBeNull();
  });
});
