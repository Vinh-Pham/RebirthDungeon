/**
 * Shared test support: builds runs from the bundled content and manipulates
 * run state for white-box scenario setup.
 */

import { Core } from '@esengine/ecs-framework';

import { BundledContentRepository } from '@/data/content/bundled-content-repository';
import type { ContentCatalog } from '@/domain/content/catalog';
import { GridPosition } from '@/game/ecs/components';
import { createRunScene, type RunScene } from '@/game/ecs/run-scene';
import type { RunContext } from '@/game/ecs/run-context';
import { startRun, type RunController } from '@/application/run/run-controller';
import { cellIndex } from '@/game/grid/dungeon-grid';

export async function loadTestContent(): Promise<ContentCatalog> {
  const repository = new BundledContentRepository();
  return repository.loadCatalog();
}

export async function startTestRun(
  seed: number,
  content?: ContentCatalog,
): Promise<RunController> {
  return startRun({ seed, content: content ?? (await loadTestContent()) });
}

export async function createTestScene(
  seed: number,
  content?: ContentCatalog,
): Promise<RunScene> {
  return createRunScene({
    seed,
    content: content ?? (await loadTestContent()),
  });
}

export function heroCell(context: RunContext): { x: number; y: number } {
  const hero = context.actorsByName.get('hero');
  const position = hero?.getComponent(GridPosition);
  if (!position) throw new Error('hero has no position');
  return { x: position.x, y: position.y };
}

/** Test setup helper: moves an entity to a cell, updating occupancy. */
export function teleportEntity(
  context: RunContext,
  entityId: string,
  x: number,
  y: number,
): void {
  const entity = context.actorsByName.get(entityId);
  const position = entity?.getComponent(GridPosition);
  if (!entity || !position) throw new Error(`unknown entity '${entityId}'`);
  context.occupancy.vacate(cellIndex(context.grid, position.x, position.y));
  position.x = x;
  position.y = y;
  context.occupancy.occupy(cellIndex(context.grid, x, y), entityId);
}

/** Clears the per-command event buffer so assertions start fresh. */
export function clearEvents(context: RunContext): void {
  context.commandEvents = [];
}

/** Any live Core from a previous test file would break component wiring. */
export function destroyCore(): void {
  Core.destroy();
}
