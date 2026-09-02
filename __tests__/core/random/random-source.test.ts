import fc from 'fast-check';

import {
  SeededRandomSource,
  createSeededRandomSource,
} from '@/core/random/seeded-random-source';
import { SequenceRandomSource } from '@/core/random/sequence-random-source';

function drawFloats(source: SeededRandomSource, count: number): number[] {
  return Array.from({ length: count }, () => source.nextFloat());
}

describe('SeededRandomSource', () => {
  it('produces floats in [0, 1)', () => {
    const source = createSeededRandomSource(42);
    for (let i = 0; i < 1000; i++) {
      const value = source.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(drawFloats(createSeededRandomSource(123), 50)).toEqual(
      drawFloats(createSeededRandomSource(123), 50),
    );
  });

  it('differs across seeds', () => {
    expect(drawFloats(createSeededRandomSource(1), 10)).not.toEqual(
      drawFloats(createSeededRandomSource(2), 10),
    );
  });

  it('bounds nextInt to [0, maxExclusive)', () => {
    const source = createSeededRandomSource(7);
    for (let i = 0; i < 500; i++) {
      const value = source.nextInt(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('rejects invalid nextInt bounds', () => {
    const source = createSeededRandomSource(1);
    expect(() => source.nextInt(0)).toThrow();
    expect(() => source.nextInt(1.5)).toThrow();
  });

  it('intBetween covers both inclusive endpoints', () => {
    const source = createSeededRandomSource(99);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(source.intBetween(2, 3));
    expect(seen.has(2)).toBe(true);
    expect(seen.has(3)).toBe(true);
  });

  it('chance(1) is always true and chance(0) is always false', () => {
    const source = createSeededRandomSource(5);
    for (let i = 0; i < 50; i++) {
      expect(source.chance(1)).toBe(true);
      expect(source.chance(0)).toBe(false);
    }
  });

  it('weightedPick never chooses zero-weight items', () => {
    const source = createSeededRandomSource(11);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 200; i++) {
      expect(
        source.weightedPick([...items], (item) => (item === 'a' ? 0 : 1)),
      ).not.toBe('a');
    }
  });

  it('weightedPick returns the only positive-weight item', () => {
    const source = createSeededRandomSource(3);
    for (let i = 0; i < 20; i++) {
      expect(
        source.weightedPick(['x', 'y'], (item) => (item === 'x' ? 5 : 0)),
      ).toBe('x');
    }
  });

  it('weightedPick with no positive weight returns undefined', () => {
    const source = createSeededRandomSource(3);
    expect(source.weightedPick(['x'], () => 0)).toBeUndefined();
  });

  it('shuffle preserves the multiset and does not touch the input', () => {
    const source = createSeededRandomSource(21);
    const input = [1, 2, 3, 4, 5];
    const shuffled = source.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
  });

  it('counts every draw exactly once', () => {
    const source = createSeededRandomSource(8);
    source.nextFloat();
    source.nextInt(4);
    source.intBetween(0, 9);
    source.chance(0.5);
    source.pick(['a']);
    source.weightedPick(['a', 'b'], () => 1);
    source.shuffle([1, 2, 3]); // n - 1 = 2 draws
    expect(source.drawCount).toBe(1 + 1 + 1 + 1 + 1 + 1 + 2);
  });

  it('rejects non-finite seeds', () => {
    expect(() => new SeededRandomSource(Number.NaN)).toThrow();
  });
});

describe('SeededRandomSource snapshot/restore (exit criterion)', () => {
  it('reproduces the same sequence after restoring a snapshot', () => {
    const original = createSeededRandomSource(777);
    for (let i = 0; i < 37; i++) original.nextFloat();
    const snapshot = original.snapshot();

    const restored = createSeededRandomSource(777);
    restored.restore(snapshot);

    expect(drawFloats(restored, 25)).toEqual(drawFloats(original, 25));
    expect(restored.drawCount).toBe(original.drawCount);
  });

  it('keeps state identical when restoring the current snapshot', () => {
    const source = createSeededRandomSource(9);
    for (let i = 0; i < 5; i++) source.nextInt(100);
    const snapshot = source.snapshot();
    source.restore(snapshot);
    expect(source.snapshot()).toEqual(snapshot);
  });

  it('rejects malformed snapshots', () => {
    const source = createSeededRandomSource(9);
    expect(() => source.restore({ state: 1.5, draws: 0 })).toThrow();
    expect(() => source.restore({ state: -1, draws: 0 })).toThrow();
    expect(() => source.restore(undefined as never)).toThrow();
  });
});

describe('SeededRandomSource properties', () => {
  it('same seed and draw plan always produce the same numbers', () => {
    const seedAndDraws = fc.tuple(fc.integer(), fc.nat(200));
    fc.assert(
      fc.property(seedAndDraws, ([seed, draws]) => {
        const expected = drawFloats(createSeededRandomSource(seed), draws);
        const actual = drawFloats(createSeededRandomSource(seed), draws);
        expect(actual).toEqual(expected);
      }),
    );
  });

  it('restoring a snapshot taken after k draws reproduces the continuation', () => {
    fc.assert(
      fc.property(fc.integer(), fc.nat(30), fc.nat(30), (seed, skip, tail) => {
        const original = createSeededRandomSource(seed);
        for (let i = 0; i < skip; i++) original.nextFloat();
        const snapshot = original.snapshot();

        const restored = createSeededRandomSource(seed);
        restored.restore(snapshot);

        const expected = drawFloats(original, tail);
        expect(drawFloats(restored, tail)).toEqual(expected);
      }),
    );
  });

  it('nextInt stays within bounds for arbitrary bounds and seeds', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 1, max: 64 }),
        (seed, bound) => {
          const source = createSeededRandomSource(seed);
          for (let i = 0; i < 25; i++) {
            const value = source.nextInt(bound);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(bound);
          }
        },
      ),
    );
  });
});

describe('SequenceRandomSource', () => {
  it('yields the scripted floats in order', () => {
    const source = new SequenceRandomSource([0.1, 0.9, 0.5]);
    expect(source.nextFloat()).toBeCloseTo(0.1);
    expect(source.nextFloat()).toBeCloseTo(0.9);
    expect(source.nextFloat()).toBeCloseTo(0.5);
    expect(source.drawCount).toBe(3);
  });

  it('throws a DomainError when exhausted', () => {
    const source = new SequenceRandomSource([0.5]);
    source.nextFloat();
    expect(() => source.nextFloat()).toThrow('exhausted');
  });

  it('maps floats through intBetween predictably', () => {
    expect(new SequenceRandomSource([0.0]).intBetween(2, 4)).toBe(2);
    expect(new SequenceRandomSource([0.99]).intBetween(2, 4)).toBe(4);
  });

  it('restores to a cursor position and continues identically', () => {
    const original = new SequenceRandomSource([0.1, 0.2, 0.9, 0.4, 0.7]);
    original.nextFloat();
    original.nextFloat();
    const snapshot = original.snapshot();

    const restored = new SequenceRandomSource([0.1, 0.2, 0.9, 0.4, 0.7]);
    restored.restore(snapshot);

    expect(restored.nextFloat()).toBe(original.nextFloat());
    expect(restored.nextFloat()).toBe(original.nextFloat());
  });

  it('rejects snapshots beyond the sequence length', () => {
    const source = new SequenceRandomSource([0.1]);
    expect(() => source.restore({ state: 5, draws: 5 })).toThrow();
  });

  it('rejects out-of-range scripted values', () => {
    expect(() => new SequenceRandomSource([1.0])).toThrow();
    expect(() => new SequenceRandomSource([-0.1])).toThrow();
  });
});
