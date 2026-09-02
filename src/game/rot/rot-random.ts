/**
 * Synchronous save/seed/run/capture/restore wrapper around the module-level
 * `ROT.RNG`, which every rot.js map generator shares as mutable global state.
 *
 * The contract: save the module state, set the floor state, generate
 * synchronously with no `await`, capture the new state, and restore the prior
 * state in `finally` — so a failed generation can never poison later draws.
 * Because `run` must not await, two generations can never interleave against
 * the shared RNG (nested calls unwind correctly: inner restores the outer's
 * seeded state, outer finally restores the original).
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
