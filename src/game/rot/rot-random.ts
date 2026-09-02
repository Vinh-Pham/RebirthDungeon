/**
 * Synchronous save/seed/run/capture/restore wrapper around the module-level
 * `ROT.RNG`, which every rot.js map generator shares as mutable global state.
 *
 * Generation must never `await` inside `run`, and two generations must never
 * run concurrently: the wrapper guarantees the previous module state is
 * restored in `finally` even when `run` throws, so a failed generation can
 * never poison later draws.
 */

import { RNG } from 'rot-js';

export interface RotRngOutcome<T> {
  readonly value: T;
  /** The module RNG state after `run` finished — captured for saves/replays. */
  readonly rngState: readonly number[];
}

export function runWithRotRng<T>(seed: number, run: () => T): RotRngOutcome<T> {
  const previousState = RNG.getState();
  try {
    RNG.setSeed(seed);
    const value = run();
    return { value, rngState: RNG.getState() };
  } finally {
    RNG.setState(previousState);
  }
}
