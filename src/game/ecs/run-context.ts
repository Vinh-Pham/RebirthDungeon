/**
 * Typed scene services for the run (the plan's "typed scene service"): the
 * shared, mutable infrastructure every system reads through its constructor —
 * grid, tile rules, occupancy, scheduler, event queue, FOV bitsets, RNG
 * streams, and the stable-id→entity map. Gameplay state itself lives in
 * components (run state in its singleton component).
 */

import type { Entity } from '@esengine/ecs-framework';

import type { ContentCatalog } from '@/domain/content/catalog';
import type { RngStreams } from '@/domain/shared/rng-streams';
import type { DungeonGrid } from '@/game/grid/dungeon-grid';
import type { OccupancyIndex } from '@/game/grid/occupancy-index';
import type { TileRules } from '@/game/grid/tile-rules';
import type { RunEvent, RunEventQueue } from '@/game/events/domain-events';
import type { TurnScheduler } from '@/game/rot/rot-turn-scheduler';
import { Door, GridPosition } from './components';
import type { RunStateComponent } from './run-state';

export interface FovState {
  /** 1 = currently visible, indexed by cell. */
  readonly visible: Uint8Array;
  /** Persistent OR of every visible result, indexed by cell. */
  readonly explored: Uint8Array;
  /** Player cell the current FOV was computed from. */
  originX: number;
  originY: number;
  /** Set when opacity changed (e.g. a door opened) since the last compute. */
  opacityDirty: boolean;
}

export interface RunContext {
  readonly grid: DungeonGrid;
  readonly rules: TileRules;
  readonly occupancy: OccupancyIndex;
  readonly scheduler: TurnScheduler;
  readonly events: RunEventQueue;
  readonly fov: FovState;
  readonly streams: RngStreams;
  readonly content: ContentCatalog;
  readonly actorsByName: Map<string, Entity>;
  /** Interactive entity registries keyed by stable id (small, fixed sets). */
  readonly traps: Map<string, Entity>;
  readonly pickups: Map<string, Entity>;
  /** The run's singleton run-state component (one entity carries it). */
  currentRunState: RunStateComponent | null;
  /** True when the current action was rejected (no turn consumed). */
  lastActionRejected: boolean;
  /** Events accumulated during the current command resolution. */
  commandEvents: RunEvent[];
  /** The ordered batch exported by the event-export system this tick. */
  exportedEvents: RunEvent[];
}

export function cellIndexOf(context: RunContext, x: number, y: number): number {
  return y * context.grid.width + x;
}

export function isInBounds(context: RunContext, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < context.grid.width && y < context.grid.height;
}

export function tileIdAt(context: RunContext, x: number, y: number): number {
  return context.grid.tiles[y * context.grid.width + x];
}

/** Static walkability + dynamic occupancy, both content/actor driven. */
export function isPassableStatic(
  context: RunContext,
  x: number,
  y: number,
): boolean {
  return isWalkableCell(context, x, y) && occupantAtIsAbsent(context, x, y);
}

/** Bounds + content tile rules only — occupancy is decided separately. */
export function isWalkableCell(
  context: RunContext,
  x: number,
  y: number,
): boolean {
  if (!isInBounds(context, x, y)) return false;
  return context.rules.walkable[tileIdAt(context, x, y)] === 1;
}

function occupantAtIsAbsent(
  context: RunContext,
  x: number,
  y: number,
): boolean {
  return context.occupancy.occupantAt(cellIndexOf(context, x, y)) === undefined;
}

/** Static opacity + dynamic `BlocksVision` (closed doors occupy cells). */
export function isOpaqueAt(context: RunContext, x: number, y: number): boolean {
  if (!isInBounds(context, x, y)) return true;
  if (context.rules.blocksVision[tileIdAt(context, x, y)] === 1) return true;
  const occupantId = context.occupancy.occupantAt(cellIndexOf(context, x, y));
  if (occupantId === undefined) return false;
  const occupant = context.actorsByName.get(occupantId);
  const door: Door | null = occupant?.getComponent(Door) ?? null;
  return door ? !door.open : false;
}

export function getEntityPosition(
  context: RunContext,
  entityId: string,
): GridPosition | null {
  return context.actorsByName.get(entityId)?.getComponent(GridPosition) ?? null;
}
