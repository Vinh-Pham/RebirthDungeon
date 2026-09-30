import { uniformFloat64 } from 'pure-rand/distribution/uniformFloat64';
import { uniformInt } from 'pure-rand/distribution/uniformInt';
import { xoroshiro128plus, xoroshiro128plusFromState } from 'pure-rand/generator/xoroshiro128plus';

export interface GameRandom {
  int(min: number, max: number): number;
  float(): number;
  chance(probability: number): boolean;
  pick<T>(values: readonly T[]): T;
}

export interface SerializableRandom extends GameRandom { snapshot(): number[]; restore(state: readonly number[]): void }
export function createGameRandom(seed: number): SerializableRandom {
  if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647) {
    throw new RangeError('Seed must be a signed 32-bit integer');
  }
  let generator = xoroshiro128plus(seed);
  const random: SerializableRandom = {
    snapshot: () => [...generator.getState()],
    restore(state) {
      if (state.length !== 4 || state.every((v) => v === 0) || state.some((v) => !Number.isInteger(v) || v < -2147483648 || v > 2147483647)) throw new Error('Invalid RNG state');
      generator = xoroshiro128plusFromState(state);
    },
    int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
        throw new RangeError('Random bounds must be ordered safe integers');
      }
      return uniformInt(generator, min, max);
    },
    float: () => uniformFloat64(generator),
    chance(probability) {
      if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
        throw new RangeError('Probability must be between 0 and 1');
      }
      return random.float() < probability;
    },
    pick(values) {
      if (values.length === 0) throw new RangeError('Cannot pick from an empty collection');
      return values[random.int(0, values.length - 1)];
    },
  };
  return random;
}
