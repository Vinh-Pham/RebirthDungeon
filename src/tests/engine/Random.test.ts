import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { createGameRandom } from '../../engine';

describe('seeded random', () => {
  it('repeats mixed calls for a seed and isolates engine RNG instances', () => {
    const sample = (seed: number) => {
      const random = createGameRandom(seed);
      return Array.from({ length: 20 }, () => [
        random.int(-5, 5),
        random.float(),
        random.chance(0.4),
        random.pick(['a', 'b']),
      ]);
    };
    expect(sample(12345)).toEqual(sample(12345));
    expect(sample(12345)).not.toEqual(sample(12346));
  });

  it('keeps integer and float outputs within their contracts', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), fc.integer(), (seed, a, b) => {
        const random = createGameRandom(seed);
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        const value = random.int(min, max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(random.float()).toBeGreaterThanOrEqual(0);
        expect(random.float()).toBeLessThan(1);
        expect(random.chance(0)).toBe(false);
        expect(random.chance(1)).toBe(true);
        expect(random.pick([value])).toBe(value);
      }),
      { seed: 20260929, numRuns: 100 },
    );
  });

  it('rejects invalid inputs without consuming the sequence', () => {
    const random = createGameRandom(1);
    for (const seed of [NaN, Infinity, 1.5, 2147483648, -2147483649]) {
      expect(() => createGameRandom(seed)).toThrow(RangeError);
    }
    for (const [min, max] of [
      [2, 1],
      [1.5, 2],
      [0, Infinity],
      [0, Number.MAX_SAFE_INTEGER + 1],
    ]) {
      expect(() => random.int(min, max)).toThrow(RangeError);
    }
    for (const probability of [-1, 2, NaN, Infinity])
      expect(() => random.chance(probability)).toThrow(RangeError);
    expect(() => random.pick([])).toThrow(RangeError);
    expect(random.int(1, 100)).toBe(createGameRandom(1).int(1, 100));
  });
});
