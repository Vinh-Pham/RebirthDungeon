/**
 * The authoritative run scene (game plan §4/§8): one `Core` + `Scene` that is
 * the single source of truth for an active dungeon floor. The React route owns
 * its lifecycle via the run controller; `Core.update(0)` resolves exactly one
 * actor's turn through the ordered system pipeline.
 *
 * Only one run scene may be alive at a time (the ECS Core is an app-wide
 * singleton).
 */

import { Core, type Entity, Scene } from '@esengine/ecs-framework';

import { PLAYER_STABLE_ID } from '@/game/ai/enemy-ai';
import { deriveRngStreams, type RngStreams } from '@/domain/shared/rng-streams';
import type { ContentCatalog } from '@/domain/content/catalog';
import type { GenerationProfileDefinition } from '@/domain/content/schemas';
import { cellIndex } from '@/game/grid/dungeon-grid';
import {
  generateDungeon,
  type GeneratedFloor,
} from '@/game/rot/rot-dungeon-generator';
import { createOccupancyIndex } from '@/game/grid/occupancy-index';
import { buildTileRules, type TileRules } from '@/game/grid/tile-rules';
import { RunEventQueue } from '@/game/events/domain-events';
import { createTurnScheduler } from '@/game/rot/rot-turn-scheduler';

import {
  Actor,
  BlocksMovement,
  BlocksVision,
  Door,
  EnemyBrain,
  GridPosition,
  Health,
  Pickup,
  PlayerControlled,
  PreviousGridPosition,
  PendingRemoval,
  Speed,
  StableId,
  Stats,
  StatusSet,
  Sprite,
  Trap,
  Vision,
} from './components';
import type { RunContext } from './run-context';
import { RunStateComponent } from './run-state';
import { initSystemOrderLog } from './system-order';
import { CleanupSystem } from './systems/cleanup-system';
import { EnemyIntentSystem } from './systems/enemy-intent-system';
import { EventExportSystem } from './systems/event-export-system';
import { InputIntentSystem } from './systems/input-intent-system';
import { InteractionSystem } from './systems/interaction-system';
import { MovementSystem } from './systems/movement-system';
import { TurnFinalizationSystem } from './systems/turn-finalization-system';
import {
  computeInitialFov,
  VisibilitySystem,
} from './systems/visibility-system';

export const MAX_MONSTERS = 4;
export const MAX_TRAPS = 2;
export const MAX_PICKUPS = 2;

export interface CreateRunSceneOptions {
  readonly seed: number;
  readonly content: ContentCatalog;
  readonly profile?: GenerationProfileDefinition;
  readonly runId?: string;
  readonly dungeonId?: string;
}

export interface RunScene {
  readonly floor: GeneratedFloor;
  readonly context: RunContext;
  readonly scene: Scene;
  /** Resolves exactly one actor turn through the ordered pipeline. */
  step(): void;
  /** Ends the scene and destroys the Core — call from route cleanup. */
  dispose(): void;
}

export function createRunScene(options: CreateRunSceneOptions): RunScene {
  const { seed, content } = options;
  const streams: RngStreams = deriveRngStreams(seed);
  const rules: TileRules = buildTileRules(
    Object.values(content.tileDefinitions),
  );

  // The dungeon stream draws the floor seed, keeping floor layout and spawn
  // placement inside one serializable stream (per-floor derivation in Phase 6).
  const floorSeed = streams.dungeon.nextInt(0x7fffffff);
  const floor = generateDungeon({
    seed: floorSeed,
    rules,
    profile: options.profile,
  });

  Core.create();
  const scene = new Scene({ name: 'RunScene' });
  initSystemOrderLog(scene);

  const context: RunContext = {
    grid: floor.grid,
    rules,
    occupancy: createOccupancyIndex(),
    scheduler: createTurnScheduler(),
    events: new RunEventQueue(),
    fov: {
      visible: new Uint8Array(floor.grid.width * floor.grid.height),
      explored: new Uint8Array(floor.grid.width * floor.grid.height),
      originX: -1,
      originY: -1,
      opacityDirty: false,
    },
    streams,
    content,
    actorsByName: new Map<string, Entity>(),
    traps: new Map<string, Entity>(),
    pickups: new Map<string, Entity>(),
    currentRunState: null,
    lastActionRejected: false,
    commandEvents: [],
    exportedEvents: [],
  };

  scene.addSystem(new InputIntentSystem(context));
  scene.addSystem(new EnemyIntentSystem(context));
  scene.addSystem(new MovementSystem(context));
  scene.addSystem(new InteractionSystem(context));
  scene.addSystem(new VisibilitySystem(context));
  scene.addSystem(new TurnFinalizationSystem(context));
  scene.addSystem(new CleanupSystem(context));
  scene.addSystem(new EventExportSystem(context));

  // --- run-state singleton ---------------------------------------------------
  const runStateEntity = scene.createEntity('runState');
  const runState = new RunStateComponent(
    options.runId ?? `run_${seed}`,
    options.dungeonId ?? firstDungeonId(content),
    0,
  );
  runStateEntity.addComponent(runState);
  context.currentRunState = runState;

  // --- player ------------------------------------------------------------------
  const heroDefinition = firstHero(content);
  const hero = scene.createEntity(PLAYER_STABLE_ID);
  hero.addComponent(new StableId(PLAYER_STABLE_ID));
  hero.addComponent(new GridPosition(floor.spawn.x, floor.spawn.y));
  hero.addComponent(new PreviousGridPosition(floor.spawn.x, floor.spawn.y));
  hero.addComponent(new Actor());
  hero.addComponent(new PlayerControlled());
  hero.addComponent(new BlocksMovement());
  hero.addComponent(new Speed(100));
  hero.addComponent(new Vision(8));
  hero.addComponent(new Health(heroDefinition.maxHp));
  hero.addComponent(
    new Stats(heroDefinition.baseAttack, heroDefinition.baseDefense),
  );
  hero.addComponent(new StatusSet());
  hero.addComponent(new Sprite('hero/idle', 'hero'));
  context.actorsByName.set(PLAYER_STABLE_ID, hero);
  context.occupancy.occupy(
    cellIndex(floor.grid, floor.spawn.x, floor.spawn.y),
    PLAYER_STABLE_ID,
  );
  context.scheduler.add(PLAYER_STABLE_ID, 100);

  // --- doors ---------------------------------------------------------------------
  // Digger can report the same doorway for two adjacent rooms; a cell hosts
  // at most one door entity, and never the spawn/exit cell.
  const claimedCells = new Set<number>([
    cellIndex(floor.grid, floor.spawn.x, floor.spawn.y),
    cellIndex(floor.grid, floor.exit.x, floor.exit.y),
  ]);
  let doorIndex = 0;
  for (const room of floor.rooms) {
    for (const doorPoint of room.doors) {
      const cell = cellIndex(floor.grid, doorPoint.x, doorPoint.y);
      if (claimedCells.has(cell)) continue;
      claimedCells.add(cell);
      const doorId = `door_${doorIndex}`;
      doorIndex += 1;
      const doorEntity = scene.createEntity(doorId);
      doorEntity.addComponent(new StableId(doorId));
      doorEntity.addComponent(new GridPosition(doorPoint.x, doorPoint.y));
      doorEntity.addComponent(new Door());
      doorEntity.addComponent(new BlocksMovement());
      doorEntity.addComponent(new BlocksVision());
      context.actorsByName.set(doorId, doorEntity);
      context.occupancy.occupy(cell, doorId);
    }
  }

  // --- monsters (deterministic placement from the dungeon stream) ---------------
  const monsterDefinitions = Object.values(content.monsters);
  const monsterRooms = floor.rooms.slice(1, 1 + MAX_MONSTERS);
  let monsterIndex = 0;
  for (const room of monsterRooms) {
    const definition =
      monsterDefinitions[streams.dungeon.nextInt(monsterDefinitions.length)];
    const center = roomCenter(room);
    if (sameCell(center, floor.exit)) continue;
    const position =
      spawnCellIsFree(context, center) && !sameCell(center, floor.spawn)
        ? center
        : freeCellNear(context, streams);
    if (!position || sameCell(position, floor.spawn)) {
      continue;
    }
    const monsterId = `monster_${monsterIndex}`;
    monsterIndex += 1;
    const monster = scene.createEntity(monsterId);
    monster.addComponent(new StableId(monsterId));
    monster.addComponent(new GridPosition(position.x, position.y));
    monster.addComponent(new PreviousGridPosition(position.x, position.y));
    monster.addComponent(new Actor());
    monster.addComponent(new EnemyBrain());
    monster.addComponent(new BlocksMovement());
    monster.addComponent(new Speed(100));
    monster.addComponent(new Vision(6));
    monster.addComponent(new Health(definition.hp));
    monster.addComponent(new Stats(definition.attack, definition.defense));
    monster.addComponent(new StatusSet());
    monster.addComponent(new Sprite('slime/idle', 'monster'));
    context.actorsByName.set(monsterId, monster);
    context.occupancy.occupy(
      cellIndex(floor.grid, position.x, position.y),
      monsterId,
    );
    context.scheduler.add(monsterId, 100);
  }

  // --- traps and pickups ----------------------------------------------------------
  const spawnRoom = floor.rooms[0];
  for (let i = 0; i < MAX_TRAPS; i++) {
    const position = freeCellNear(context, streams, spawnRoom);
    if (
      !position ||
      sameCell(position, floor.spawn) ||
      sameCell(position, floor.exit)
    ) {
      continue;
    }
    const trapId = `trap_${i}`;
    const trap = scene.createEntity(trapId);
    trap.addComponent(new StableId(trapId));
    trap.addComponent(new GridPosition(position.x, position.y));
    trap.addComponent(new Trap('spike'));
    context.actorsByName.set(trapId, trap);
    context.traps.set(trapId, trap);
  }
  const pickupItems = Object.values(content.items).filter(
    (item) => item.kind === 'consumable',
  );
  for (let i = 0; i < MAX_PICKUPS && pickupItems.length > 0; i++) {
    const item = pickupItems[streams.dungeon.nextInt(pickupItems.length)];
    const position = freeCellNear(context, streams, spawnRoom);
    if (
      !position ||
      sameCell(position, floor.spawn) ||
      sameCell(position, floor.exit)
    ) {
      continue;
    }
    const pickupId = `pickup_${i}`;
    const pickup = scene.createEntity(pickupId);
    pickup.addComponent(new StableId(pickupId));
    pickup.addComponent(new GridPosition(position.x, position.y));
    pickup.addComponent(new Pickup(item.id));
    context.actorsByName.set(pickupId, pickup);
    context.pickups.set(pickupId, pickup);
  }

  // The scheduler's first actor leads; the controller loop resolves enemy
  // turns until the run reaches `awaitingInput` for the player.
  runState.currentActorId = context.scheduler.next();
  runState.phase =
    runState.currentActorId === PLAYER_STABLE_ID
      ? 'awaitingInput'
      : 'resolving';

  Core.setScene(scene);
  scene.begin();
  computeInitialFov(context);

  return {
    floor,
    context,
    scene,
    step() {
      Core.update(0);
    },
    dispose() {
      scene.end();
      Core.destroy();
    },
  };
}

/** Destroys the pickup/trap entity for the cleanup system (Phase 6+ use). */
export function markForRemoval(context: RunContext, entityId: string): void {
  const entity = context.actorsByName.get(entityId);
  entity?.addComponent(new PendingRemoval());
}

function firstDungeonId(content: ContentCatalog): string {
  const ids = Object.keys(content.dungeons);
  return ids[0] ?? 'dungeon_unnamed';
}

function firstHero(content: ContentCatalog): {
  maxHp: number;
  baseAttack: number;
  baseDefense: number;
} {
  const heroes = Object.values(content.heroes);
  if (heroes.length === 0) {
    throw new Error('content catalog has no heroes');
  }
  return heroes[0];
}

function roomCenter(room: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): { x: number; y: number } {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

function sameCell(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Draws candidate cells from the dungeon stream until it finds a walkable,
 * unoccupied floor tile outside `excludeRoom` (bounded tries; deterministic
 * per stream state).
 */
function freeCellNear(
  context: RunContext,
  streams: RngStreams,
  excludeRoom?: { x: number; y: number; width: number; height: number },
): { x: number; y: number } | null {
  const { grid } = context;
  for (let tries = 0; tries < 32; tries++) {
    const x = streams.dungeon.nextInt(grid.width);
    const y = streams.dungeon.nextInt(grid.height);
    const index = cellIndex(grid, x, y);
    if (
      context.rules.walkable[grid.tiles[index]] === 1 &&
      context.occupancy.occupantAt(index) === undefined &&
      !inRoom(x, y, excludeRoom)
    ) {
      return { x, y };
    }
  }
  return null;
}

function inRoom(
  x: number,
  y: number,
  room?: { x: number; y: number; width: number; height: number },
): boolean {
  if (!room) return false;
  return (
    x >= room.x &&
    y >= room.y &&
    x < room.x + room.width &&
    y < room.y + room.height
  );
}

function spawnCellIsFree(
  context: RunContext,
  cell: { x: number; y: number },
): boolean {
  const index = cellIndex(context.grid, cell.x, cell.y);
  return (
    context.rules.walkable[context.grid.tiles[index]] === 1 &&
    context.occupancy.occupantAt(index) === undefined
  );
}

/** Convenience for tests: the current actor entity, if any. */
export function currentActorEntity(context: RunContext): Entity | null {
  const id = context.currentRunState?.currentActorId;
  return id ? (context.actorsByName.get(id) ?? null) : null;
}
