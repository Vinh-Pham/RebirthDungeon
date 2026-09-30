import { useMemo } from 'react';
import { Picture, Skia } from '@shopify/react-native-skia';
import type { TileMap } from '../data/schemas/content';

/** Record the entire static map once; it remains one canvas draw node. */
export function TileRenderer({ map }: { map: Pick<TileMap, 'width' | 'height' | 'tileSize' | 'tiles'> }) {
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, map.width * map.tileSize, map.height * map.tileSize));
    const paint = Skia.Paint();
    const palette = ['#242e32', '#141d24', '#2b3536'];
    map.tiles.forEach((tile, index) => {
      const x = (index % map.width) * map.tileSize;
      const y = Math.floor(index / map.width) * map.tileSize;
      paint.setColor(Skia.Color(palette[tile]));
      canvas.drawRect(Skia.XYWHRect(x, y, map.tileSize, map.tileSize), paint);
      paint.setColor(Skia.Color(tile === 1 ? '#30383d' : '#364144'));
      canvas.drawRect(Skia.XYWHRect(x + 1, y + 1, map.tileSize - 2, 1), paint);
      if (tile === 1) {
        paint.setColor(Skia.Color('#253037'));
        canvas.drawRect(Skia.XYWHRect(x + 2, y + 4, map.tileSize - 4, map.tileSize - 8), paint);
      }
    });
    return recorder.finishRecordingAsPicture();
  }, [map.tiles, map.width, map.height, map.tileSize]);
  return <Picture picture={picture} />;
}
