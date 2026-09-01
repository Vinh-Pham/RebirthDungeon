/**
 * Sprite animation timing. Pure and worklet-safe (used inside Reanimated
 * frame callbacks to pick atlas frames from a presentation clock).
 */

export function frameIndex(
  clockMs: number,
  fps: number,
  frameCount: number,
  loop: boolean = true,
): number {
  'worklet';
  if (frameCount <= 0 || fps <= 0) return 0;
  const frames = Math.floor((clockMs / 1000) * fps);
  if (loop) return frames % frameCount;
  return Math.min(frames, frameCount - 1);
}
