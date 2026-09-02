/**
 * App-scoped Effect runtime (composition root). Route-scoped work — like the
 * spike's simulation ticker — runs as fibers on this runtime and must be
 * interrupted by the owning route on unmount, never left dangling.
 */

import { Duration, Effect, type Fiber, Layer, ManagedRuntime } from 'effect';

export const appRuntime = ManagedRuntime.make(Layer.empty);

/**
 * Runs `onTick` immediately, then on a fixed wall-clock interval, as a fiber
 * on the app runtime. The caller owns the fiber: invoke `interrupt()` when
 * the owning route unmounts and the ticking stops at the next boundary.
 */
export function startTicker(
  onTick: () => void,
  intervalMs: number,
): Fiber.Fiber<never, never> {
  const program = Effect.sync(onTick).pipe(
    Effect.andThen(Effect.sleep(Duration.millis(intervalMs))),
    Effect.forever,
  );
  return appRuntime.runFork(program);
}
