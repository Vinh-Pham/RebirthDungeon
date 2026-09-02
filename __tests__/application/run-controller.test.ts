import { PLAYER_STABLE_ID } from '@/game/ai/enemy-ai';
import type { RunSnapshot } from '@/game/projection/run-snapshot';
import type { RunController } from '@/application/run/run-controller';
import { destroyCore, startTestRun } from '../game/support/run-test-support';

const SEED = 20260903;

// TileId values the content marks walkable (floor family + stairs/door).
const WALKABLE_TILES = new Set([0, 1, 4, 5, 6, 7]);

let controller: RunController;

beforeEach(async () => {
  destroyCore();
  controller = await startTestRun(SEED);
});

afterEach(() => {
  controller.dispose();
});

/** A direction the hero can actually walk, found in a fixed scan order. */
function freeDirection(snapshot: RunSnapshot): { dx: number; dy: number } {
  const hero = snapshot.actors.find((actor) => actor.id === PLAYER_STABLE_ID)!;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const tileIndex = (hero.y + dy) * snapshot.map.width + (hero.x + dx);
    const occupant = snapshot.actors.find(
      (actor) => actor.x === hero.x + dx && actor.y === hero.y + dy,
    );
    const walkable = WALKABLE_TILES.has(snapshot.map.tiles[tileIndex]);
    if (walkable && !occupant) {
      return { dx, dy };
    }
  }
  return { dx: 0, dy: 0 }; // wait-ish fallback for sealed-in seeds
}

describe('RunController', () => {
  it('starts awaiting player input at turn zero', () => {
    const snapshot = controller.snapshot();
    expect(snapshot.phase).toBe('awaitingInput');
    expect(snapshot.currentActorId).toBe(PLAYER_STABLE_ID);
    expect(snapshot.turn).toBe(0);
    expect(snapshot.batchId).toBe(0);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.events)).toBe(true);
  });

  it('rejects invalid directions without touching the run', () => {
    const before = controller.snapshot();
    for (const [dx, dy] of [
      [0, 0],
      [2, 0],
      [1, 1],
      [0.5, 0.5],
    ]) {
      const result = controller.submitMove(dx, dy);
      expect(result.status).toBe('rejected');
      expect(result.reason).toBe('invalid-direction');
    }
    const after = controller.snapshot();
    expect(after.turn).toBe(before.turn);
    expect(after.batchId).toBe(before.batchId);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it('accepts a move, advances the turn, and comes back to the player', () => {
    const before = controller.snapshot();
    const direction = freeDirection(before);

    const result = controller.submitMove(direction.dx, direction.dy);

    expect(result.status).toBe('accepted');
    const after = controller.snapshot();
    expect(after.phase).toBe('awaitingInput');
    expect(after.currentActorId).toBe(PLAYER_STABLE_ID);
    expect(after.turn).toBeGreaterThan(before.turn);
    expect(after.batchId).toBe(before.batchId + 1);
    // The hero's committed position moved (or the seed sealed the hero in —
    // excluded by freeDirection for every real dungeon).
    const hero = after.actors.find((actor) => actor.id === PLAYER_STABLE_ID)!;
    const heroBefore = before.actors.find(
      (actor) => actor.id === PLAYER_STABLE_ID,
    )!;
    expect({ x: hero.x, y: hero.y }).not.toEqual({
      x: heroBefore.x,
      y: heroBefore.y,
    });
  });

  it('spends a turn on wait', () => {
    const before = controller.snapshot();
    const result = controller.submitWait();
    expect(result.status).toBe('accepted');
    expect(controller.snapshot().turn).toBeGreaterThan(before.turn);
  });

  it('tap-to-walk produces the same command as the equivalent move', async () => {
    // One run at a time (the ECS Core is a singleton): play the same command
    // through the move path, then replay it through tap-to-walk.
    const snapshot = controller.snapshot();
    const hero = snapshot.actors.find(
      (actor) => actor.id === PLAYER_STABLE_ID,
    )!;
    const direction = freeDirection(snapshot);
    const viaMove = JSON.stringify(
      controller.submitMove(direction.dx, direction.dy),
    );
    const stateA = controller.snapshot();
    controller.dispose();

    const viaTapRun = await startTestRun(SEED);
    const viaTap = JSON.stringify(
      viaTapRun.submitTapMove(hero.x + direction.dx, hero.y + direction.dy),
    );
    const stateB = viaTapRun.snapshot();
    viaTapRun.dispose();

    expect(viaTap).toBe(viaMove);
    expect(stateB.batchId).toBe(stateA.batchId);
    expect(stateB.turn).toBe(stateA.turn);
    expect(JSON.stringify(stateB)).toBe(JSON.stringify(stateA));
    // Keep the suite's afterEach contract intact.
    controller = viaTapRun;
  });

  it('rejects taps onto the hero cell and out of bounds', async () => {
    const snapshot = controller.snapshot();
    const hero = snapshot.actors.find(
      (actor) => actor.id === PLAYER_STABLE_ID,
    )!;
    expect(controller.submitTapMove(hero.x, hero.y).status).toBe('rejected');
    expect(controller.submitTapMove(-1, 0).status).toBe('rejected');
    expect(
      controller.submitTapMove(snapshot.map.width, snapshot.map.height).status,
    ).toBe('rejected');
  });

  it('replays identically from the same seed and command sequence', async () => {
    const commands: Array<
      { kind: 'move'; dx: number; dy: number } | { kind: 'wait' }
    > = [
      { kind: 'wait' },
      { kind: 'move', dx: 1, dy: 0 },
      { kind: 'move', dx: 0, dy: 1 },
      { kind: 'wait' },
      { kind: 'move', dx: -1, dy: 0 },
      { kind: 'move', dx: 0, dy: -1 },
      { kind: 'wait' },
      { kind: 'move', dx: 1, dy: 0 },
    ];

    const play = async (): Promise<RunSnapshot[]> => {
      const run = await startTestRun(SEED);
      const snapshots: RunSnapshot[] = [];
      for (const command of commands) {
        if (command.kind === 'wait') {
          run.submitWait();
        } else {
          run.submitMove(command.dx, command.dy);
        }
        snapshots.push(run.snapshot());
      }
      run.dispose();
      return snapshots;
    };

    const first = await play();
    const second = await play();

    expect(first.map((snapshot) => JSON.stringify(snapshot))).toEqual(
      second.map((snapshot) => JSON.stringify(snapshot)),
    );
  });

  it('different seeds generate different floors', async () => {
    const tilesA = JSON.stringify(controller.snapshot().map.tiles);
    controller.dispose();

    const other = await startTestRun(SEED + 1);
    const tilesB = JSON.stringify(other.snapshot().map.tiles);
    other.dispose();

    expect(tilesA).not.toBe(tilesB);
  });
});
