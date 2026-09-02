/**
 * Projects the live run scene into one immutable snapshot plus the ordered
 * domain-event batch of the last command resolution. Presentation receives
 * only frozen data and can never mutate gameplay state.
 */

import { TILE_SIZE } from '@/game/config';
import { GridPosition, Health, Sprite } from '@/game/ecs/components';
import type { RunContext } from '@/game/ecs/run-context';
import type { RunEvent } from '@/game/events/domain-events';

export interface ActorHp {
  readonly current: number;
  readonly max: number;
}

export interface ActorView {
  readonly id: string;
  readonly kind: 'hero' | 'monster';
  /** Grid cell (authoritative); presentation interpolates for drawing. */
  readonly x: number;
  readonly y: number;
  /** Logical pixel center, ready for the renderer. */
  readonly pxX: number;
  readonly pxY: number;
  readonly facing: 1 | -1;
  readonly animation: string;
  readonly hp: ActorHp | null;
}

export interface RunSnapshot {
  readonly batchId: number;
  readonly turn: number;
  readonly phase: 'awaitingInput' | 'resolving';
  readonly currentActorId: string | null;
  readonly map: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly number[];
  };
  readonly actors: readonly ActorView[];
  /** Cell indexes the player currently sees. */
  readonly visible: readonly number[];
  /** Cell indexes the player has ever seen. */
  readonly explored: readonly number[];
  /** Ordered domain events from the last command resolution. */
  readonly events: readonly RunEvent[];
}

export function projectRunScene(context: RunContext): RunSnapshot {
  const runState = context.currentRunState;

  const actors: ActorView[] = [];
  for (const [id, entity] of context.actorsByName) {
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(GridPosition);
    if (!sprite || !position) continue; // doors/traps/pickups are not drawn as actors
    const health = entity.getComponent(Health);
    actors.push(
      Object.freeze({
        id,
        kind: sprite.kind,
        x: position.x,
        y: position.y,
        pxX: position.x * TILE_SIZE + TILE_SIZE / 2,
        pxY: position.y * TILE_SIZE + TILE_SIZE / 2,
        facing: sprite.facing,
        animation: sprite.animation,
        hp: health
          ? Object.freeze({ current: health.current, max: health.max })
          : null,
      }),
    );
  }

  const visible: number[] = [];
  const explored: number[] = [];
  for (let index = 0; index < context.fov.visible.length; index++) {
    if (context.fov.visible[index] === 1) visible.push(index);
    if (context.fov.explored[index] === 1) explored.push(index);
  }

  return Object.freeze({
    batchId: runState?.batchId ?? 0,
    turn: runState?.turnNumber ?? 0,
    phase: runState?.phase ?? 'resolving',
    currentActorId: runState?.currentActorId ?? null,
    map: Object.freeze({
      width: context.grid.width,
      height: context.grid.height,
      tiles: Object.freeze(Array.from(context.grid.tiles)),
    }),
    actors: Object.freeze(actors),
    visible: Object.freeze(visible),
    explored: Object.freeze(explored),
    events: Object.freeze([...context.commandEvents]),
  });
}
