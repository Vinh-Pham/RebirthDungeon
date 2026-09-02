/**
 * Pure input mappings for the run screen. Every input method — D-pad, swipe,
 * tap-to-walk, and keyboard — reduces to the same cardinal move command
 * (game plan §6), so these mappers are the single tested surface that
 * guarantees identical commands across input methods.
 */

export interface Direction {
  readonly dx: -1 | 0 | 1;
  readonly dy: -1 | 0 | 1;
}

export const DIRECTIONS = {
  up: { dx: 0, dy: -1 } as Direction,
  down: { dx: 0, dy: 1 } as Direction,
  left: { dx: -1, dy: 0 } as Direction,
  right: { dx: 1, dy: 0 } as Direction,
} as const;

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right,
  w: DIRECTIONS.up,
  W: DIRECTIONS.up,
  s: DIRECTIONS.down,
  S: DIRECTIONS.down,
  a: DIRECTIONS.left,
  A: DIRECTIONS.left,
  d: DIRECTIONS.right,
  D: DIRECTIONS.right,
};

/** Arrows and WASD → the shared cardinal direction; null for other keys. */
export function directionFromKey(key: string): Direction | null {
  return KEY_DIRECTIONS[key] ?? null;
}

/**
 * Swipe vector → dominant-axis direction once the gesture passes the
 * threshold; short/ambiguous swipes yield null (no command).
 */
export function directionFromSwipe(
  deltaX: number,
  deltaY: number,
  threshold: number = 24,
): Direction | null {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) return null;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX > 0 ? DIRECTIONS.right : DIRECTIONS.left;
  }
  return deltaY > 0 ? DIRECTIONS.down : DIRECTIONS.up;
}

/** Cardinal step from one cell toward an adjacent cell; null if not adjacent. */
export function directionBetween(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Direction | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  return { dx: dx as -1 | 0 | 1, dy: dy as -1 | 0 | 1 };
}
