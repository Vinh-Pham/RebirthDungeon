/**
 * The spike ECS run: one `Core` + `Scene` whose lifecycle is owned by the
 * React route that creates it. `step()` advances one logical tick through the
 * ordered systems; `dispose()` tears the scene and Core down cleanly so a
 * route unmount never leaks ECS state.
 *
 * Positions are grid cells stepped once per tick — outcomes depend on the
 * step count, never on wall-clock time.
 */

import { Core, type Entity, Scene } from '@esengine/ecs-framework';

import type { DungeonGrid, GridPoint } from '@/game/grid/dungeon-grid';
import type { RoomSnapshot } from '@/game/rot/rot-dungeon-generator';

import { GridPosition, PatrolRoute, Sprite } from './spike-components';
import {
  initSystemOrderLog,
  PatrolSystem,
  SpriteSystem,
} from './spike-systems';

/**
 * The ECS Core is an application-wide singleton owning exactly one active
 * scene — one run, one Scene, per the architecture. Only one SpikeRun may be
 * alive at a time; dispose it before creating the next (the route guarantees
 * this via its unmount cleanup).
 */
/** Fixed logical step length in seconds; gameplay never reads the clock. */
const FIXED_STEP_SECONDS = 1 / 60;

export interface SpikeActor {
  readonly entity: Entity;
  readonly kind: 'hero' | 'monster';
}

export interface SpikeRun {
  readonly grid: DungeonGrid;
  readonly scene: Scene;
  readonly actors: readonly SpikeActor[];
  /** Advances exactly one logical tick through every system in order. */
  step(): void;
  /** Ends the scene and destroys the Core — safe to call from route cleanup. */
  dispose(): void;
}

export function createSpikeRun(
  grid: DungeonGrid,
  rooms: readonly RoomSnapshot[],
  spawn: GridPoint,
): SpikeRun {
  // Initializes the Core singleton (or returns the existing, healthy one).
  Core.create();
  const scene = new Scene({ name: 'SpikeScene' });
  initSystemOrderLog(scene);

  scene.addSystem(new PatrolSystem());
  scene.addSystem(new SpriteSystem());

  const actors: SpikeActor[] = [];

  const hero = scene.createEntity('hero');
  hero.addComponent(new GridPosition(spawn.x, spawn.y));
  hero.addComponent(new Sprite('hero/idle', 'hero'));
  actors.push({ entity: hero, kind: 'hero' });

  // One patrolling slime per additional room (bounded), routed around the
  // room's inner perimeter. Spawned in room order so runs are reproducible.
  let slimeCount = 0;
  for (let i = 1; i < rooms.length && slimeCount < 3; i++) {
    const route = perimeterRoute(rooms[i]);
    if (!route) continue;
    const slime = scene.createEntity(`slime-${slimeCount}`);
    slime.addComponent(new GridPosition(route[0].x, route[0].y));
    slime.addComponent(new PatrolRoute(route));
    slime.addComponent(new Sprite('slime/idle', 'monster'));
    actors.push({ entity: slime, kind: 'monster' });
    slimeCount++;
  }

  Core.setScene(scene);
  scene.begin();

  return {
    grid,
    scene,
    actors,
    step() {
      Core.update(FIXED_STEP_SECONDS);
    },
    dispose() {
      scene.end();
      Core.destroy();
    },
  };
}

function perimeterRoute(room: RoomSnapshot): GridPoint[] | null {
  if (room.width < 2 || room.height < 2) return null;
  const left = room.x;
  const top = room.y;
  const right = room.x + room.width - 1;
  const bottom = room.y + room.height - 1;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}
