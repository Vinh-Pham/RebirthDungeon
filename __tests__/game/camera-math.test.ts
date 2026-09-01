import {
  computeCameraTransform,
  lerpFactor,
  shakeOffset,
} from '@/game/camera/camera-math';

describe('computeCameraTransform', () => {
  const mapW = 320;
  const mapH = 384;

  it('clamps to the map edges when the map is larger than the viewport', () => {
    // viewport 240x320 device px at scale 1; focus far left → clamped to 0
    const left = computeCameraTransform(-50, 160, mapW, mapH, 240, 320, 1);
    expect(left.translateX).toBe(0);

    // focus far right → clamped so the right map edge is flush
    const right = computeCameraTransform(999, 160, mapW, mapH, 240, 320, 1);
    expect(right.translateX).toBe(-(mapW - 240));

    // focus far top → clamped to 0
    const top = computeCameraTransform(160, -10, mapW, mapH, 240, 320, 1);
    expect(top.translateY).toBe(0);

    // focus far bottom → clamped to bottom edge
    const bottom = computeCameraTransform(160, 999, mapW, mapH, 240, 320, 1);
    expect(bottom.translateY).toBe(-(mapH - 320));
  });

  it('centers the map on the axis where it is smaller than the viewport', () => {
    // map is 320 tall, viewport is 320 → no vertical freedom
    const result = computeCameraTransform(160, 160, mapW, mapH, 240, 320, 1);
    expect(result.translateY).toBe(0);

    const smaller = computeCameraTransform(0, 0, mapW, 100, 240, 320, 1);
    expect(smaller.translateY).toBe(-((100 - 320) / 2)); // centered: +110 offset
  });

  it('snaps translations to whole device pixels', () => {
    const result = computeCameraTransform(123.4, 77.7, mapW, mapH, 240, 320, 3);
    expect(Number.isInteger(result.translateX)).toBe(true);
    expect(Number.isInteger(result.translateY)).toBe(true);
  });

  it('follows the focus point when free to move', () => {
    const result = computeCameraTransform(160, 200, mapW, mapH, 240, 320, 1);
    // focus is centered: translateX = -(160 - 120)
    expect(result.translateX).toBe(-40);
  });
});

describe('shakeOffset', () => {
  it('is zero before and after the shake window', () => {
    expect(shakeOffset(-1, 400, 3)).toEqual({ x: 0, y: 0 });
    expect(shakeOffset(0, 400, 3)).toEqual({ x: 0, y: 0 });
    expect(shakeOffset(400, 400, 3)).toEqual({ x: 0, y: 0 });
    expect(shakeOffset(1000, 400, 3)).toEqual({ x: 0, y: 0 });
  });

  it('decays within a time-bounded envelope', () => {
    for (let t = 0; t < 400; t += 20) {
      const { x, y } = shakeOffset(t, 400, 3);
      const envelope = 3 * 10 * (1 - t / 400) + 0.001;
      expect(Math.abs(x)).toBeLessThanOrEqual(envelope);
      expect(Math.abs(y)).toBeLessThanOrEqual(3 * 8 * (1 - t / 400) + 0.001);
    }
    // late in the impulse the offset is small
    const late = shakeOffset(390, 400, 3);
    expect(Math.hypot(late.x, late.y)).toBeLessThan(1);
  });

  it('is deterministic', () => {
    expect(shakeOffset(120, 400, 3)).toEqual(shakeOffset(120, 400, 3));
  });
});

describe('lerpFactor', () => {
  it('is zero for non-positive deltas', () => {
    expect(lerpFactor(0, 6)).toBe(0);
    expect(lerpFactor(-5, 6)).toBe(0);
  });

  it('produces the exact exponential factor', () => {
    expect(lerpFactor(1000, 6)).toBeCloseTo(1 - Math.exp(-6), 10);
    expect(lerpFactor(16, 6)).toBeCloseTo(1 - Math.exp(-0.096), 10);
  });

  it('approaches 1 without overshooting', () => {
    expect(lerpFactor(2000, 6)).toBeLessThan(1);
    expect(lerpFactor(2000, 6)).toBeGreaterThan(0.99);
  });
});
