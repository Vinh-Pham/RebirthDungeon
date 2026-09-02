/**
 * Visibility system (order 500): recomputes the player's FOV through the
 * PreciseShadowcasting adapter only when the player moved or opacity changed
 * (a door opened), then ORs the result into the persistent `explored` bitset.
 */

import { ECSSystem, EntitySystem, Matcher } from '@esengine/ecs-framework';

import { GridPosition, PlayerControlled, Vision } from '../components';
import { cellIndexOf, isOpaqueAt, type RunContext } from '../run-context';
import { recordSystemTick, SYSTEM_ORDER } from '../system-order';
import { computeFovCells } from '@/game/rot/rot-fov';

@ECSSystem('VisibilitySystem', { updateOrder: SYSTEM_ORDER.visibility })
export class VisibilitySystem extends EntitySystem {
  private readonly context: RunContext;

  constructor(context: RunContext) {
    // The player is the only light source.
    super(Matcher.all(GridPosition, PlayerControlled));
    this.context = context;
  }

  protected process(
    entities: readonly import('@esengine/ecs-framework').Entity[],
  ): void {
    if (!this.scene) return;
    recordSystemTick(this.scene, 'VisibilitySystem');
    const { fov } = this.context;

    const player = entities[0];
    const position = player?.getComponent(GridPosition);
    const vision = player?.getComponent(Vision);
    if (!position || !vision) return;

    const movedSinceLastFov =
      position.x !== fov.originX || position.y !== fov.originY;
    if (!movedSinceLastFov && !fov.opacityDirty) return;

    fov.visible.fill(0);
    const cells = computeFovCells({
      originX: position.x,
      originY: position.y,
      radius: vision.radius,
      isOpaque: (x, y) => isOpaqueAt(this.context, x, y),
    });
    for (const cell of cells) {
      const index = cellIndexOf(this.context, cell.x, cell.y);
      fov.visible[index] = 1;
      fov.explored[index] = 1;
    }
    fov.originX = position.x;
    fov.originY = position.y;
    fov.opacityDirty = false;
  }
}

/** Initial FOV pass at run start, before the first command resolves. */
export function computeInitialFov(context: RunContext): void {
  const player = context.actorsByName.get('hero');
  const position = player?.getComponent(GridPosition);
  const vision = player?.getComponent(Vision);
  if (!position || !vision) return;
  const { fov } = context;
  fov.visible.fill(0);
  const cells = computeFovCells({
    originX: position.x,
    originY: position.y,
    radius: vision.radius,
    isOpaque: (x, y) => isOpaqueAt(context, x, y),
  });
  for (const cell of cells) {
    const index = cellIndexOf(context, cell.x, cell.y);
    fov.visible[index] = 1;
    fov.explored[index] = 1;
  }
  fov.originX = position.x;
  fov.originY = position.y;
  fov.opacityDirty = false;
}
