import { Core } from '@esengine/ecs-framework';

import { PLAYER_STABLE_ID } from '@/game/ai/enemy-ai';
import { GridPosition, PendingAction } from '@/game/ecs/components';
import { createRunScene, type RunScene } from '@/game/ecs/run-scene';
import { systemOrderLog, SYSTEM_ORDER } from '@/game/ecs/system-order';
import { createTestScene, destroyCore } from './support/run-test-support';

const SEED = 20260903;

beforeEach(() => {
  destroyCore();
});

describe('createRunScene', () => {
  it('starts on the player awaiting input with visible spawn FOV', async () => {
    const run = await createTestScene(SEED);
    const runState = run.context.currentRunState!;

    expect(runState.phase).toBe('awaitingInput');
    expect(runState.currentActorId).toBe(PLAYER_STABLE_ID);
    expect(runState.turnNumber).toBe(0);

    const heroCell = run.context.actorsByName
      .get(PLAYER_STABLE_ID)!
      .getComponent(GridPosition)!;
    const heroIndex = heroCell.y * run.floor.grid.width + heroCell.x;
    expect(run.context.fov.visible[heroIndex]).toBe(1);
    expect(run.context.fov.explored[heroIndex]).toBe(1);
    // Spawn room interior is lit immediately.
    expect(run.context.fov.visible.some((value) => value === 1)).toBe(true);

    run.dispose();
  });

  it('executes every system in declared order on each step', async () => {
    const run = await createTestScene(SEED);
    const before = systemOrderLog(run.scene).length;

    run.step();

    const executed = systemOrderLog(run.scene).slice(before);
    expect(executed).toEqual([
      'InputIntentSystem',
      'EnemyIntentSystem',
      'MovementSystem',
      'InteractionSystem',
      'VisibilitySystem',
      'TurnFinalizationSystem',
      'CleanupSystem',
      'EventExportSystem',
    ]);
    expect(SYSTEM_ORDER.eventExport).toBe(800);

    run.dispose();
  });

  it('resolves enemy turns automatically until the player acts again', async () => {
    const run = await createTestScene(SEED);
    const runState = run.context.currentRunState!;

    // Drive several player commands; after each accepted command the run must
    // always come back to the player's input phase. The controller's resolve
    // loop is mirrored here (white-box): step until awaitingInput.
    for (let i = 0; i < 6; i++) {
      runState.phase = 'awaitingInput';
      runState.currentActorId = PLAYER_STABLE_ID;
      const hero = run.context.actorsByName.get(PLAYER_STABLE_ID)!;
      hero.addComponent(new PendingAction('wait'));
      runState.phase = 'resolving';
      let guard = 0;
      const phase = () => run.context.currentRunState!.phase;
      while (phase() !== 'awaitingInput') {
        run.step();
        guard += 1;
        if (guard > 64) {
          throw new Error('scheduler never returned to the player');
        }
      }
      expect(runState.currentActorId).toBe(PLAYER_STABLE_ID);
      expect(runState.turnNumber).toBeGreaterThanOrEqual(i + 1);
    }

    run.dispose();
  });

  it('reproduces identical scenes from the same seed', async () => {
    const cellsOf = (run: RunScene) =>
      [...run.context.actorsByName.entries()]
        .filter(([id]) => id.startsWith('monster_'))
        .map(([id, entity]) => {
          const position = entity.getComponent(GridPosition)!;
          return `${id}:${position.x},${position.y}`;
        })
        .sort();

    const first = await createTestScene(SEED);
    // Capture the first run's spawn layout BEFORE creating the second: the
    // ECS Core is a singleton, so the second scene retires the first's
    // entities.
    const firstTiles = Array.from(first.floor.grid.tiles);
    const firstSpawn = { ...first.floor.spawn };
    const firstExit = { ...first.floor.exit };
    const cellsA = cellsOf(first);
    first.dispose();

    const second = await createTestScene(SEED);
    const cellsB = cellsOf(second);
    expect(cellsB).toEqual(cellsA);
    expect(second.floor.spawn).toEqual(firstSpawn);
    expect(second.floor.exit).toEqual(firstExit);
    expect(Array.from(second.floor.grid.tiles)).toEqual(firstTiles);

    second.dispose();
  });

  it('disposes the Core cleanly and allows a fresh run afterwards', async () => {
    const run = await createTestScene(SEED);
    run.step();
    run.dispose();
    expect(Core.Instance).toBeNull();

    const next = await createTestScene(SEED);
    expect(Core.Instance).not.toBeNull();
    next.step();
    next.dispose();
    expect(Core.Instance).toBeNull();
  });
});
