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
