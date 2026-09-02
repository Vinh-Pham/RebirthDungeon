/**
 * Shared machinery for random sources that reduce every draw to a uniform
 * float in [0, 1). Subclasses produce the float stream and expose their
 * serializable internal state; the base class derives all other draws and
 * counts every draw exactly once.
 */

import type { RngSnapshot, StatefulRandomSource } from './random-source';

export abstract class FloatBackedRandomSource implements StatefulRandomSource {
  private draws = 0;

  get drawCount(): number {
    return this.draws;
  }

  /** Uniform float in [0, 1); counted like every other draw. */
  nextFloat(): number {
    const value = this.produceFloat();
    this.draws += 1;
    return value;
  }

  /** Produces the next uniform float WITHOUT counting a draw. */
  protected abstract produceFloat(): number;

  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(
        `nextInt requires a positive integer bound, got ${maxExclusive}`,
      );
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  intBetween(min: number, maxInclusive: number): number {
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(maxInclusive) ||
      maxInclusive < min
    ) {
      throw new Error(
        `intBetween requires integers min <= max, got ${min}..${maxInclusive}`,
      );
    }
    return min + this.nextInt(maxInclusive - min + 1);
  }

  chance(probability: number): boolean {
    if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
      throw new Error(
        `chance requires a probability in [0, 1], got ${probability}`,
      );
    }
    return this.nextFloat() < probability;
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[this.nextInt(items.length)];
  }

  weightedPick<T>(
    items: readonly T[],
    weight: (item: T) => number,
  ): T | undefined {
    if (items.length === 0) return undefined;
    let total = 0;
    for (const item of items) {
      const w = weight(item);
      if (!Number.isFinite(w) || w < 0) {
        throw new Error(`weights must be finite and nonnegative, got ${w}`);
      }
      total += w;
    }
    if (total <= 0) return undefined;
    let roll = this.nextFloat() * total;
    for (const item of items) {
      roll -= weight(item);
      if (roll < 0) return item;
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  snapshot(): RngSnapshot {
    return { state: this.snapshotState(), draws: this.draws };
  }

  restore(snapshot: RngSnapshot): void {
    if (
      !snapshot ||
      !Number.isInteger(snapshot.state) ||
      !Number.isInteger(snapshot.draws)
    ) {
      throw new Error(`Invalid RNG snapshot: ${JSON.stringify(snapshot)}`);
    }
    this.restoreState(snapshot.state);
    this.draws = snapshot.draws;
  }

  /** Current serializable generator state (already advanced by produceFloat). */
  protected abstract snapshotState(): number;

  /** Restores the generator state; throw if the value is not acceptable. */
  protected abstract restoreState(state: number): void;
}
