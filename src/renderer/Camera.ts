export interface Camera { x: number; y: number; zoom: number }
export interface Point { x: number; y: number }

function validate(camera: Camera) {
  if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y) || !Number.isFinite(camera.zoom) || camera.zoom <= 0) {
    throw new RangeError('Camera requires finite coordinates and positive zoom');
  }
}
export function worldToScreen(point: Point, camera: Camera): Point {
  validate(camera); return { x: (point.x - camera.x) * camera.zoom, y: (point.y - camera.y) * camera.zoom };
}
export function screenToWorld(point: Point, camera: Camera): Point {
  validate(camera); return { x: point.x / camera.zoom + camera.x, y: point.y / camera.zoom + camera.y };
}

/** Follow a world-space point while keeping the viewport inside the map. */
export function followCamera(point: Point, world: { width: number; height: number }, viewport: { width: number; height: number }, zoom = 1): Camera {
  validate({ x: point.x, y: point.y, zoom });
  if ([world.width, world.height, viewport.width, viewport.height].some((value) => !Number.isFinite(value) || value <= 0)) throw new RangeError('Invalid camera bounds');
  return { x: Math.max(0, Math.min(world.width - viewport.width / zoom, point.x - viewport.width / zoom / 2)),
    y: Math.max(0, Math.min(world.height - viewport.height / zoom, point.y - viewport.height / zoom / 2)), zoom };
}
