import { useMemo } from 'react';
import { Picture, Skia } from '@shopify/react-native-skia';
import { DungeonTileRenderer } from './DungeonTileRenderer';
import type { DungeonSceneMap } from './DungeonScenery';

type SceneMap = DungeonSceneMap & { theme?: 'town' | 'interior' };

export function TileRenderer({ map }: { map: SceneMap }) {
  return map.theme ? <ClassicTileRenderer map={map} /> : <DungeonTileRenderer map={map} />;
}

/** Record the entire static map once; it remains one canvas draw node. */
function ClassicTileRenderer({ map }: { map: SceneMap }) {
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(
      Skia.XYWHRect(0, 0, map.width * map.tileSize, map.height * map.tileSize),
    );
    const paint = Skia.Paint();
    const palette =
      map.theme === 'town'
        ? ['#806f54', '#493d32', '#34513c']
        : map.theme === 'interior'
          ? ['#5b4937', '#2c3434', '#584936']
          : ['#242e32', '#141d24', '#2b3536'];
    map.tiles.forEach((tile, index) => {
      const x = (index % map.width) * map.tileSize;
      const y = Math.floor(index / map.width) * map.tileSize;
      paint.setColor(Skia.Color(palette[tile]));
      canvas.drawRect(Skia.XYWHRect(x, y, map.tileSize, map.tileSize), paint);
      paint.setColor(
        Skia.Color(
          map.theme
            ? tile === 1
              ? '#78604b'
              : map.theme === 'town' && tile === 2
                ? '#416249'
                : '#76634b'
            : tile === 1
              ? '#30383d'
              : '#364144',
        ),
      );
      canvas.drawRect(Skia.XYWHRect(x + 1, y + 1, map.tileSize - 2, 1), paint);
      if (tile === 1) {
        paint.setColor(
          Skia.Color(
            map.theme === 'interior' ? '#78604b' : map.theme === 'town' ? '#645240' : '#253037',
          ),
        );
        canvas.drawRect(Skia.XYWHRect(x + 2, y + 4, map.tileSize - 4, map.tileSize - 8), paint);
      }
    });
    return recorder.finishRecordingAsPicture();
  }, [map.tiles, map.width, map.height, map.tileSize, map.theme]);
  return <Picture picture={picture} />;
}
