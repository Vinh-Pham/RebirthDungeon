import {
  AttackIntent,
  Door,
  GridPosition,
  MoveIntent,
  Pickup,
  PendingAction,
  PreviousGridPosition,
  Trap,
} from '@/game/ecs/components';
import { PLAYER_STABLE_ID } from '@/game/ai/enemy-ai';
import { cellIndex } from '@/game/grid/dungeon-grid';
import {
  clearEvents,
  createTestScene,
  destroyCore,
  heroCell,
  teleportEntity,
} from './support/run-test-support';

const SEED = 20260903;

let scene: Awaited<ReturnType<typeof createTestScene>>;

beforeEach(async () => {
  destroyCore();
  scene = await createTestScene(SEED);
});

afterEach(() => {
  scene.dispose();
});

/**
 * Drives one player turn through the pipeline with an explicit pending
 * action (white-box: the controller test covers the public command API).
 */
function act(action: PendingAction): void {
  const hero = scene.context.actorsByName.get(PLAYER_STABLE_ID)!;
  const runState = scene.context.currentRunState!;
  runState.phase = 'awaitingInput';
  runState.currentActorId = PLAYER_STABLE_ID;
  hero.addComponent(action);
  scene.context.lastActionRejected = action.kind === 'rejected';
  runState.phase = 'resolving';
  // Like the controller: resolve until the schedule returns to the player.
  let guard = 0;
  const phase = () => scene.context.currentRunState!.phase;
  while (phase() !== 'awaitingInput') {
    scene.step();
    guard += 1;
    if (guard > 64) throw new Error('scheduler never returned to the player');
  }
}

/** Drives one player turn from a raw move intent (the real input path). */
function actMove(dx: number, dy: number): void {
  const hero = scene.context.actorsByName.get(PLAYER_STABLE_ID)!;
  const runState = scene.context.currentRunState!;
  runState.phase = 'awaitingInput';
  runState.currentActorId = PLAYER_STABLE_ID;
  scene.context.lastActionRejected = false;
  hero.addComponent(new MoveIntent(dx, dy));
  runState.phase = 'resolving';
  let guard = 0;
  const phase = () => scene.context.currentRunState!.phase;
  while (phase() !== 'awaitingInput') {
    scene.step();
    guard += 1;
    if (guard > 64) throw new Error('scheduler never returned to the player');
  }
}

function heroPosition(): { x: number; y: number } {
  return heroCell(scene.context);
}

/** Finds a free adjacent floor cell for the hero. */
function freeNeighbor(): { x: number; y: number; dx: number; dy: number } {
  const { x, y } = heroPosition();
  const context = scene.context;
  const candidates = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const { dx, dy } of candidates) {
    const cell = cellIndex(context.grid, x + dx, y + dy);
    if (
      context.rules.walkable[context.grid.tiles[cell]] === 1 &&
      context.occupancy.occupantAt(cell) === undefined
    ) {
      return { x: x + dx, y: y + dy, dx, dy };
    }
  }
  throw new Error('no free neighbor around the hero');
}

describe('movement contract', () => {
  it('moves the hero one cardinal cell and emits ACTOR_MOVED', () => {
    const before = heroPosition();
    const target = freeNeighbor();

    act(new PendingAction('move', target.x, target.y));

    expect(heroPosition()).toEqual({ x: target.x, y: target.y });
    const moved = scene.context.commandEvents.find(
      (event) => event.type === 'ACTOR_MOVED',
    );
    expect(moved).toMatchObject({
      type: 'ACTOR_MOVED',
      actorId: PLAYER_STABLE_ID,
      fromX: before.x,
      fromY: before.y,
      toX: target.x,
      toY: target.y,
    });
    // Turn consumed: counter advanced (the player's action plus each enemy
    // acting until the schedule returned to the player).
    const runState = scene.context.currentRunState!;
    expect(runState.phase).toBe('awaitingInput');
    expect(runState.currentActorId).toBe(PLAYER_STABLE_ID);
    expect(runState.turnNumber).toBeGreaterThanOrEqual(1);
    // PreviousGridPosition tracks the interpolation source.
    const hero = scene.context.actorsByName.get(PLAYER_STABLE_ID)!;
    const previous = hero.getComponent(PreviousGridPosition)!;
    expect(previous).toMatchObject({ x: before.x, y: before.y });
  });

  it('does not move into walls and does not consume the turn', () => {
    const context = scene.context;
    // Find a wall direction by scanning neighbors.
    const { x, y } = heroPosition();
    let wallDx = 0;
    let wallDy = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const cell = cellIndex(context.grid, x + dx, y + dy);
      if (context.rules.walkable[context.grid.tiles[cell]] === 0) {
        wallDx = dx;
        wallDy = dy;
        break;
      }
    }
    if (wallDx === 0 && wallDy === 0) {
      return; // Seed layout has no adjacent wall; covered by other seeds.
    }

    const before = heroPosition();
    const turnBefore = context.currentRunState!.turnNumber;
    actMove(wallDx, wallDy);

    expect(heroPosition()).toEqual(before);
    expect(context.currentRunState!.turnNumber).toBe(turnBefore);
    expect(context.currentRunState!.phase).toBe('awaitingInput');
    expect(
      context.commandEvents.some(
        (event) =>
          event.type === 'INPUT_REJECTED' && event.reason === 'blocked',
      ),
    ).toBe(true);
  });

  it('converts a hostile-occupied cell into a bump without moving', () => {
    const context = scene.context;
    const target = freeNeighbor();
    // Put a monster in the target cell (white-box setup).
    const monsterId = context.actorsByName.has('monster_0')
      ? 'monster_0'
      : [...context.actorsByName.keys()].find((id) =>
          id.startsWith('monster_'),
        )!;
    teleportEntity(context, monsterId, target.x, target.y);
    const before = heroPosition();
    const turnBefore = context.currentRunState!.turnNumber;

    // Walk toward the monster: input-intent converts it to a bump.
    actMove(target.x - before.x, target.y - before.y);

    expect(heroPosition()).toEqual(before); // never overlaps
    expect(
      context.commandEvents.some(
        (event) =>
          event.type === 'ATTACK_BUMP' &&
          event.targetId === monsterId &&
          event.actorId === PLAYER_STABLE_ID,
      ),
    ).toBe(true);
    // The bump intent is recorded for the Phase 4 combat slot.
    const hero = context.actorsByName.get(PLAYER_STABLE_ID)!;
    expect(hero.getComponent(AttackIntent)?.targetId).toBe(monsterId);
    // A bump is an in-world attempt: the turn is consumed (plus any enemy
    // turns until the schedule returns to the player).
    expect(context.currentRunState!.turnNumber).toBeGreaterThan(turnBefore);
  });

  it('opens a closed door without moving, then passes through', () => {
    const context = scene.context;
    const doorId = [...context.actorsByName.keys()].find((id) =>
      id.startsWith('door_'),
    )!;
    expect(doorId).toBeDefined();
    const doorEntity = context.actorsByName.get(doorId)!;
    const doorPosition = doorEntity.getComponent(GridPosition)!;
    const { x, y } = doorPosition;

    // Park the hero next to the door.
    const adjacent = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ].find(
      (cell) =>
        context.rules.walkable[
          context.grid.tiles[cellIndex(context.grid, cell.x, cell.y)]
        ] === 1 &&
        context.occupancy.occupantAt(
          cellIndex(context.grid, cell.x, cell.y),
        ) === undefined,
    )!;
    teleportEntity(context, PLAYER_STABLE_ID, adjacent.x, adjacent.y);
    const door = doorEntity.getComponent(Door)!;
    expect(door.open).toBe(false);
    const turnBefore = context.currentRunState!.turnNumber;

    // Walking into the door opens it; the hero stays put.
    actMove(x - adjacent.x, y - adjacent.y);
    expect(door.open).toBe(true);
    expect(heroPosition()).toEqual(adjacent);
    expect(
      context.commandEvents.some(
        (event) =>
          event.type === 'DOOR_OPENED' && event.x === x && event.y === y,
      ),
    ).toBe(true);
    expect(context.currentRunState!.turnNumber).toBeGreaterThan(turnBefore);

    // An open door no longer blocks: the hero can step into the cell.
    clearEvents(context);
    act(new PendingAction('move', x, y));
    expect(heroPosition()).toEqual({ x, y });
  });

  it('triggers an armed trap and disarms it', () => {
    const context = scene.context;
    const trapId = [...context.traps.keys()][0];
    expect(trapId).toBeDefined();
    const trapEntity = context.traps.get(trapId)!;
    const trapPosition = trapEntity.getComponent(GridPosition)!;
    const trap = trapEntity.getComponent(Trap)!;
    expect(trap.armed).toBe(true);

    // Park the hero next to the trap and walk onto it.
    const adjacent = [
      { x: trapPosition.x + 1, y: trapPosition.y },
      { x: trapPosition.x - 1, y: trapPosition.y },
      { x: trapPosition.x, y: trapPosition.y + 1 },
      { x: trapPosition.x, y: trapPosition.y - 1 },
    ].find(
      (cell) =>
        context.rules.walkable[
          context.grid.tiles[cellIndex(context.grid, cell.x, cell.y)]
        ] === 1 &&
        context.occupancy.occupantAt(
          cellIndex(context.grid, cell.x, cell.y),
        ) === undefined,
    )!;
    teleportEntity(context, PLAYER_STABLE_ID, adjacent.x, adjacent.y);

    act(new PendingAction('move', trapPosition.x, trapPosition.y));
    expect(heroPosition()).toEqual({
      x: trapPosition.x,
      y: trapPosition.y,
    });
    expect(trap.armed).toBe(false);
    expect(
      context.commandEvents.some(
        (event) => event.type === 'TRAP_TRIGGERED' && event.trapId === trapId,
      ),
    ).toBe(true);
  });

  it('collects a pickup onto the hero cell and destroys it', () => {
    const context = scene.context;
    const pickupId = [...context.pickups.keys()][0];
    expect(pickupId).toBeDefined();
    const pickupEntity = context.pickups.get(pickupId)!;
    const pickupPosition = pickupEntity.getComponent(GridPosition)!;
    const itemId = pickupEntity.getComponent(Pickup)!.itemId;

    const adjacent = [
      { x: pickupPosition.x + 1, y: pickupPosition.y },
      { x: pickupPosition.x - 1, y: pickupPosition.y },
      { x: pickupPosition.x, y: pickupPosition.y + 1 },
      { x: pickupPosition.x, y: pickupPosition.y - 1 },
    ].find(
      (cell) =>
        context.rules.walkable[
          context.grid.tiles[cellIndex(context.grid, cell.x, cell.y)]
        ] === 1 &&
        context.occupancy.occupantAt(
          cellIndex(context.grid, cell.x, cell.y),
        ) === undefined,
    )!;
    teleportEntity(context, PLAYER_STABLE_ID, adjacent.x, adjacent.y);

    act(new PendingAction('move', pickupPosition.x, pickupPosition.y));
    expect(heroPosition()).toEqual({
      x: pickupPosition.x,
      y: pickupPosition.y,
    });
    expect(
      context.commandEvents.some(
        (event) => event.type === 'PICKUP_COLLECTED' && event.itemId === itemId,
      ),
    ).toBe(true);
    // Cleanup destroyed the pickup at end of turn.
    expect(pickupEntity.isDestroyed).toBe(true);
    expect(context.pickups.has(pickupId)).toBe(false);
  });

  it('emits STAIRS_REACHED when the player steps onto the exit tile', () => {
    const context = scene.context;
    const exit = scene.floor.exit;
    const adjacent = [
      { x: exit.x + 1, y: exit.y },
      { x: exit.x - 1, y: exit.y },
      { x: exit.x, y: exit.y + 1 },
      { x: exit.x, y: exit.y - 1 },
    ].find(
      (cell) =>
        context.rules.walkable[
          context.grid.tiles[cellIndex(context.grid, cell.x, cell.y)]
        ] === 1 &&
        context.occupancy.occupantAt(
          cellIndex(context.grid, cell.x, cell.y),
        ) === undefined,
    )!;
    teleportEntity(context, PLAYER_STABLE_ID, adjacent.x, adjacent.y);

    act(new PendingAction('move', exit.x, exit.y));
    expect(
      context.commandEvents.some(
        (event) =>
          event.type === 'STAIRS_REACHED' &&
          event.x === exit.x &&
          event.y === exit.y,
      ),
    ).toBe(true);
  });

  it('updates the FOV after the player moves', () => {
    const context = scene.context;
    const target = freeNeighbor();
    const beforeExplored = [...context.fov.explored];

    act(new PendingAction('move', target.x, target.y));

    const hero = heroPosition();
    const heroIndex = cellIndex(context.grid, hero.x, hero.y);
    expect(context.fov.visible[heroIndex]).toBe(1);
    // Explored is persistent and grows monotonically.
    for (let i = 0; i < beforeExplored.length; i++) {
      if (beforeExplored[i] === 1) {
        expect(context.fov.explored[i]).toBe(1);
      }
    }
  });
});
