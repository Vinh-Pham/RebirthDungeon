import type { SpriteAtlas } from '../data/schemas/content';

export function spriteRect(atlas: SpriteAtlas, frame: number) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= atlas.columns * atlas.rows)
    throw new RangeError('Sprite frame is out of bounds');
  return {
    x: (frame % atlas.columns) * atlas.frameWidth,
    y: Math.floor(frame / atlas.columns) * atlas.frameHeight,
    width: atlas.frameWidth,
    height: atlas.frameHeight,
  };
}
