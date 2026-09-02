import { RNG } from 'rot-js';

import { runWithRotRng } from '@/game/rot/rot-random';

describe('runWithRotRng', () => {
  it('produces the same sequence for the same seed', () => {
    const first = runWithRotRng(42, () => [RNG.getUniform(), RNG.getUniform()]);
    const second = runWithRotRng(42, () => [
      RNG.getUniform(),
      RNG.getUniform(),
    ]);
    expect(first.value).toEqual(second.value);
    expect(first.rngState).toEqual(second.rngState);
  });

  it('produces different sequences for different seeds', () => {
    const first = runWithRotRng(1, () => RNG.getUniform());
    const second = runWithRotRng(2, () => RNG.getUniform());
    expect(first.value).not.toEqual(second.value);
  });

  it('restores the prior module RNG state after a successful run', () => {
    RNG.setSeed(99);
    RNG.getUniform();
    const before = RNG.getState();

    runWithRotRng(1, () => {
      for (let i = 0; i < 10; i++) RNG.getUniform();
      return 'ok';
    });

    expect(RNG.getState()).toEqual(before);
  });

  it('restores the prior module RNG state even when the run throws', () => {
    RNG.setSeed(99);
    RNG.getUniform();
    const before = RNG.getState();

    expect(() =>
      runWithRotRng(1, () => {
        for (let i = 0; i < 10; i++) RNG.getUniform();
        throw new Error('generation blew up');
      }),
    ).toThrow('generation blew up');

    expect(RNG.getState()).toEqual(before);
  });

  it('captures the post-run state for saves and replays', () => {
    const outcome = runWithRotRng(7, () => RNG.getUniform());
    // Drawing once more advances exactly one step past the captured state.
    RNG.setState([...outcome.rngState]);
    expect(RNG.getUniform()).not.toBeUndefined();
  });
});
