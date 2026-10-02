import { worldToScreen, type Camera, type Point } from './Camera';
import type { RenderEntity } from './types';

/** Screen-space hit areas stay usable when the arena is scaled down on phones. */
export function hitTestBattleTarget(
  point: Point,
  entities: readonly RenderEntity[],
  targetIds: readonly string[],
  camera: Camera,
): string | undefined {
  const halfSize = Math.max(44, 32 * camera.zoom) / 2;
  const candidates = entities
    .filter((entity) => !entity.dead && entity.health > 0 && targetIds.includes(entity.id))
    .map((entity) => {
      const center = worldToScreen({ x: entity.x + 16, y: entity.y + 16 }, camera);
      return { id: entity.id, dx: point.x - center.x, dy: point.y - center.y };
    })
    .filter(({ dx, dy }) => Math.abs(dx) <= halfSize && Math.abs(dy) <= halfSize)
    .sort(
      (a, b) => a.dx * a.dx + a.dy * a.dy - (b.dx * b.dx + b.dy * b.dy) || a.id.localeCompare(b.id),
    );
  return candidates[0]?.id;
}
