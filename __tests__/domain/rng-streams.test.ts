import fc from 'fast-check';

import {
  RNG_STREAM_NAMES,
  deriveRngStreams,
  deriveStreamSeed,
  snapshotRngStreams,
} from '@/domain/shared/rng-streams';
import { createSeededRandomSource } from '@/core/random/seeded-random-source';

describe('deriveStreamSeed', () => {
  it('is deterministic', () => {
    expect(deriveStreamSeed(1234, 'combat')).toBe(
      deriveStreamSeed(1234, 'combat'),
    );
  });

  it('differs across labels for the same master seed', () => {
    const seeds = RNG_STREAM_NAMES.map((name) => deriveStreamSeed(42, name));
    expect(new Set(seeds).size).toBe(RNG_STREAM_NAMES.length);
  });

  it('rejects non-finite master seeds', () => {
    expect(() => deriveStreamSeed(Number.NaN, 'combat')).toThrow();
  });
});

describe('deriveRngStreams', () => {
  it('exposes exactly the five planned streams', () => {
    const streams = deriveRngStreams(1);
    expect(Object.keys(streams).sort()).toEqual([
      'combat',
      'cosmetics',
      'dungeon',
      'gacha',
      'loot',
    ]);
  });

  it('each stream reproduces the same sequence from the same master seed', () => {
    for (const name of RNG_STREAM_NAMES) {
      const a = deriveRngStreams(2024)[name];
      const b = deriveRngStreams(2024)[name];
      const drawsA = Array.from({ length: 32 }, () => a.nextFloat());
      const drawsB = Array.from({ length: 32 }, () => b.nextFloat());
      expect(drawsA).toEqual(drawsB);
    }
  });

  it('streams are independent: draws on one never shift another', () => {
    const streams = deriveRngStreams(555);
    // Burn a wildly different number of draws on dungeon vs combat.
    for (let i = 0; i < 50; i++) streams.dungeon.nextFloat();

    const fresh = deriveRngStreams(555);
    for (let i = 0; i < 50; i++) fresh.dungeon.nextFloat();

    const combatExpected = Array.from({ length: 10 }, () =>
      streams.combat.nextFloat(),
    );
    const combatActual = Array.from({ length: 10 }, () =>
      fresh.combat.nextFloat(),
    );
    expect(combatActual).toEqual(combatExpected);
  });

  it('snapshotRngStreams + restore reproduces every stream', () => {
    const streams = deriveRngStreams(31337);
    streams.dungeon.nextInt(100);
    streams.loot.nextFloat();
    const snapshot = snapshotRngStreams(streams);

    const restored = deriveRngStreams(31337);
    for (const name of RNG_STREAM_NAMES) restored[name].restore(snapshot[name]);

    for (const name of RNG_STREAM_NAMES) {
      const expected = Array.from({ length: 8 }, () =>
        streams[name].nextFloat(),
      );
      const actual = Array.from({ length: 8 }, () =>
        restored[name].nextFloat(),
      );
      expect(actual).toEqual(expected);
    }
  });
});

describe('stream properties', () => {
  it('derivation is a pure function of the master seed', () => {
    fc.assert(
      fc.property(fc.integer(), (masterSeed) => {
        const a = deriveRngStreams(masterSeed);
        const b = deriveRngStreams(masterSeed);
        for (const name of RNG_STREAM_NAMES) {
          expect(a[name].nextFloat()).toBe(b[name].nextFloat());
        }
      }),
    );
  });

  it('each stream matches a directly seeded generator built from its derived seed', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.constantFrom(...RNG_STREAM_NAMES),
        (masterSeed, name) => {
          const stream = deriveRngStreams(masterSeed)[name];
          const direct = createSeededRandomSource(
            deriveStreamSeed(masterSeed, name),
          );
          expect(stream.nextFloat()).toBe(direct.nextFloat());
        },
      ),
    );
  });

  it('different master seeds produce different combat sequences', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (seedA, seedB) => {
        fc.pre(seedA !== seedB);
        const a = deriveRngStreams(seedA).combat;
        const b = deriveRngStreams(seedB).combat;
        const drawsA = Array.from({ length: 4 }, () => a.nextFloat());
        const drawsB = Array.from({ length: 4 }, () => b.nextFloat());
        expect(drawsA).not.toEqual(drawsB);
      }),
      { numRuns: 200 },
    );
  });
});
