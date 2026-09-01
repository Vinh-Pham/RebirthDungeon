import { frameIndex } from '@/game/sprites/frames';

describe('frameIndex', () => {
  it('starts at frame 0', () => {
    expect(frameIndex(0, 5, 4)).toBe(0);
  });

  it('advances with the clock at the given fps', () => {
    // 5 fps → one frame every 200ms
    expect(frameIndex(150, 5, 4)).toBe(0);
    expect(frameIndex(200, 5, 4)).toBe(1);
    expect(frameIndex(850, 5, 4)).toBe(0); // 4.25 frames → wraps to 0
  });

  it('loops back to the first frame', () => {
    // 5 fps, 4 frames → cycle is 800ms
    expect(frameIndex(800, 5, 4)).toBe(0);
    expect(frameIndex(1000, 5, 4)).toBe(1);
    expect(frameIndex(3200, 5, 4)).toBe(0);
  });

  it('clamps on the last frame when not looping', () => {
    expect(frameIndex(1000, 5, 4, false)).toBe(3);
    expect(frameIndex(9999, 5, 4, false)).toBe(3);
  });

  it('returns 0 for degenerate configurations', () => {
    expect(frameIndex(100, 0, 4)).toBe(0);
    expect(frameIndex(100, 5, 0)).toBe(0);
  });
});
