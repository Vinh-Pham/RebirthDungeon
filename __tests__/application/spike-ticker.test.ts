import { startTicker } from '@/bootstrap/effect-runtime';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls until `predicate` holds, with a generous timeout so slow CI never flakes. */
async function waitFor(predicate: () => boolean, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await sleep(10);
  }
}

describe('startTicker (Effect fiber on the app runtime)', () => {
  it('ticks immediately and then on the interval until interrupted', async () => {
    let count = 0;
    const fiber = startTicker(() => {
      count += 1;
    }, 20);

    // The first tick runs synchronously when the fiber starts.
    await waitFor(() => count >= 1);
    const firstCount = count;

    // It keeps ticking on the interval…
    await waitFor(() => count >= firstCount + 3);

    // …and stops permanently once the owning route interrupts it.
    fiber.interruptUnsafe();
    const atInterrupt = count;
    await sleep(150);
    expect(count).toBe(atInterrupt);
  });

  it('stops ticking when interrupted right after the first tick', async () => {
    let count = 0;
    const fiber = startTicker(() => {
      count += 1;
    }, 5000);

    await waitFor(() => count >= 1);
    fiber.interruptUnsafe();

    await sleep(200);
    // 5000ms interval: any additional tick would prove interruption failed.
    expect(count).toBe(1);
  });
});
