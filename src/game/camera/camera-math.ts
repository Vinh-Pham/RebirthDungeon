/**
 * Pure camera and screen-shake math. No imports: these functions run both on
 * the JavaScript thread (tests, camera state setup) and on the UI thread
 * inside Reanimated frame callbacks/derived values.
 */

export interface CameraTransform {
  /** Device-pixel X translation for the world transform (already snapped). */
  readonly translateX: number;
  /** Device-pixel Y translation for the world transform (already snapped). */
  readonly translateY: number;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Computes the world transform so the camera (centered on `centerX/Y` world
 * logical pixels) stays inside the map when the map is larger than the
 * viewport and centers the map otherwise. The translation is snapped to whole
 * device pixels to keep texel edges aligned while following a target.
 */
export function computeCameraTransform(
  centerX: number,
  centerY: number,
  mapPixelWidth: number,
  mapPixelHeight: number,
  viewportDeviceWidth: number,
  viewportDeviceHeight: number,
  scale: number,
): CameraTransform {
  'worklet';
  const viewportWidth = viewportDeviceWidth / scale;
  const viewportHeight = viewportDeviceHeight / scale;

  const freeX = mapPixelWidth - viewportWidth;
  const freeY = mapPixelHeight - viewportHeight;
  const left =
    freeX > 0 ? clamp(centerX - viewportWidth / 2, 0, freeX) : freeX / 2;
  const top =
    freeY > 0 ? clamp(centerY - viewportHeight / 2, 0, freeY) : freeY / 2;

  // `+ 0` normalizes -0 to +0 so equality checks stay sane.
  return {
    translateX: Math.round(-left * scale) + 0,
    translateY: Math.round(-top * scale) + 0,
  };
}

export interface ShakeOffset {
  readonly x: number;
  readonly y: number;
}

/**
 * Deterministic decaying shake offset for an impulse that started
 * `elapsedMs` ago. Sine mixture keeps it smooth; decay brings it to zero.
 */
export function shakeOffset(
  elapsedMs: number,
  durationMs: number,
  magnitudePx: number,
): ShakeOffset {
  'worklet';
  if (elapsedMs <= 0 || elapsedMs >= durationMs) return { x: 0, y: 0 };
  const decay = 1 - elapsedMs / durationMs;
  const x =
    Math.sin(elapsedMs * 0.09) * 6 + Math.sin(elapsedMs * 0.023 + 1.7) * 4;
  const y =
    Math.sin(elapsedMs * 0.075 + 0.9) * 5 + Math.cos(elapsedMs * 0.021) * 3;
  return { x: x * decay * magnitudePx, y: y * decay * magnitudePx };
}

/** Exponential smoothing factor for a frame of `dtMs` at `ratePerSecond`. */
export function lerpFactor(dtMs: number, ratePerSecond: number): number {
  'worklet';
  if (dtMs <= 0) return 0;
  return 1 - Math.exp(-ratePerSecond * (dtMs / 1000));
}
