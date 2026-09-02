/**
 * Test fake: yields a fixed sequence of floats. Deterministic and loud —
 * exhausting the sequence throws instead of silently drifting, so tests fail
 * the moment outcomes diverge from the scripted scenario.
 */

import { DomainError } from '../errors/domain-error';
import { FloatBackedRandomSource } from './float-backed-random-source';

export class SequenceRandomSource extends FloatBackedRandomSource {
  private cursor = 0;

  constructor(private readonly values: readonly number[]) {
    super();
    for (const value of values) {
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new Error(
          `SequenceRandomSource values must be floats in [0, 1), got ${value}`,
        );
      }
    }
  }

  protected produceFloat(): number {
    if (this.cursor >= this.values.length) {
      throw new DomainError(
        `SequenceRandomSource exhausted after ${this.cursor} draws`,
      );
    }
    const value = this.values[this.cursor];
    this.cursor += 1;
    return value;
  }

  protected snapshotState(): number {
    return this.cursor;
  }

  protected restoreState(state: number): void {
    if (!Number.isInteger(state) || state < 0 || state > this.values.length) {
      throw new Error(`Invalid sequence RNG state: ${state}`);
    }
    this.cursor = state;
  }
}
