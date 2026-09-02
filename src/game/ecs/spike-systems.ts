/**
 * The two spike systems. They prove that a logical step advances systems in
 * declared `updateOrder` (PatrolSystem 100 → SpriteSystem 200): SpriteSystem
 * derives facing from the movement PatrolSystem just committed, so a swapped
 * order would make facing lag one step behind.
 *
 * Systems stay synchronous and deterministic — no `await`, timers, or
 * presentation access. Each tick appends to an order log kept in
 * `sceneData` (infrastructure-only), which tests assert against.
 */

import {
  ECSSystem,
  type Entity,
  EntitySystem,
  type Scene,
  Matcher,
} from '@esengine/ecs-framework';

import { GridPosition, PatrolRoute, Sprite } from './spike-components';

const SYSTEM_ORDER_LOG_KEY = 'spikeSystemOrderLog';

/** Installs the ordered execution record — called when the scene is built. */
export function initSystemOrderLog(scene: Scene): void {
  scene.sceneData.set(SYSTEM_ORDER_LOG_KEY, []);
}

/** Ordered record of every system execution — test infrastructure. */
export function systemOrderLog(scene: Scene): readonly string[] {
  const log = scene.sceneData.get(SYSTEM_ORDER_LOG_KEY);
  return Array.isArray(log) ? (log as string[]) : [];
}

function recordTick(scene: Scene, systemName: string): void {
  let log = scene.sceneData.get(SYSTEM_ORDER_LOG_KEY);
  if (!Array.isArray(log)) {
    log = [];
    scene.sceneData.set(SYSTEM_ORDER_LOG_KEY, log);
  }
  (log as string[]).push(systemName);
}

@ECSSystem('PatrolSystem', { updateOrder: 100 })
export class PatrolSystem extends EntitySystem {
  constructor() {
    super(Matcher.all(GridPosition, PatrolRoute));
  }

  protected process(entities: readonly Entity[]): void {
    if (this.scene) recordTick(this.scene, 'PatrolSystem');
    for (const entity of entities) {
      const position = entity.getComponent(GridPosition);
      const patrol = entity.getComponent(PatrolRoute);
      if (!position || !patrol || patrol.points.length === 0) continue;

      const target = patrol.points[patrol.index];
      const dx = Math.sign(target.x - position.x);
      const dy = Math.sign(target.y - position.y);
      if (dx === 0 && dy === 0) {
        patrol.index = (patrol.index + 1) % patrol.points.length;
        continue;
      }
      if (dx !== 0) {
        position.x += dx;
        patrol.lastDx = dx;
      } else {
        position.y += dy;
      }
      patrol.movedThisStep = true;
    }
  }
}

@ECSSystem('SpriteSystem', { updateOrder: 200 })
export class SpriteSystem extends EntitySystem {
  constructor() {
    super(Matcher.all(GridPosition, PatrolRoute, Sprite));
  }

  protected process(entities: readonly Entity[]): void {
    if (this.scene) recordTick(this.scene, 'SpriteSystem');
    for (const entity of entities) {
      const sprite = entity.getComponent(Sprite);
      const patrol = entity.getComponent(PatrolRoute);
      if (!sprite || !patrol) continue;

      if (patrol.movedThisStep && patrol.lastDx !== 0) {
        sprite.facing = patrol.lastDx > 0 ? 1 : -1;
      }
      patrol.movedThisStep = false;
    }
  }
}
