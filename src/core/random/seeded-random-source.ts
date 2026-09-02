/**
 * Deterministic mulberry32 PRNG (32-bit state). Small, fast, good-enough
 * statistical quality for game content, and fully serializable: the snapshot
 * is just the internal state plus the draw count.
 */

import { FloatBackedRandomSource } from './float-backed-random-source';

function advance(state: number): { state: number; value: number } {
  state = (state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state, value };
}

export class SeededRandomSource extends FloatBackedRandomSource {
  private internalState: number;

  constructor(seed: number) {
    super();
    if (!Number.isFinite(seed)) {
      throw new Error(`RNG seed must be finite, got ${seed}`);
    }
    // Avoid the degenerate all-zero state; mix the seed first.
    this.internalState = Math.imul(seed | 0, 0x9e3779b9) >>> 0 || 0x9e3779b9;
  }

  protected produceFloat(): number {
    const { state, value } = advance(this.internalState);
    this.internalState = state;
    return value;
  }

  protected snapshotState(): number {
    return this.internalState >>> 0;
  }

  protected restoreState(state: number): void {
    if (!Number.isInteger(state) || state < 0) {
      throw new Error(`Invalid seeded RNG state: ${state}`);
    }
    this.internalState = state >>> 0;
  }
}

export function createSeededRandomSource(seed: number): SeededRandomSource {
  return new SeededRandomSource(seed);
}
