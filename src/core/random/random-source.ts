/**
 * Randomness abstraction (game plan §6). Engines receive a RandomSource —
 * never `Math.random()` — so any system can be replayed from a seed plus
 * generator state, and tests can pin outcomes with a sequence-backed fake.
 */

export interface RngSnapshot {
  /** Opaque generator state (implementation-defined integer). */
  readonly state: number;
  /** Number of draws consumed so far; stored alongside state for audits. */
  readonly draws: number;
}

export interface RandomSource {
  /** Uniform float in [0, 1). */
  nextFloat(): number;
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
  /** Uniform integer in [min, maxInclusive]. */
  intBetween(min: number, maxInclusive: number): number;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** Uniform pick; undefined only for an empty list. */
  pick<T>(items: readonly T[]): T | undefined;
  /** Weighted pick; zero-weight items are never chosen. Undefined for an empty list or nonpositive total weight. */
  weightedPick<T>(
    items: readonly T[],
    weight: (item: T) => number,
  ): T | undefined;
  /** Returns a shuffled copy; the input is untouched. */
  shuffle<T>(items: readonly T[]): T[];
  /** How many draws this source has produced. */
  readonly drawCount: number;
}

export interface StatefulRandomSource extends RandomSource {
  snapshot(): RngSnapshot;
  restore(snapshot: RngSnapshot): void;
}
