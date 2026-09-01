/**
 * Bakes the static map layer into a Skia picture once per snapshot, so the
 * per-frame render cost is a single picture draw plus the animated actors.
 * Tiles are drawn with nearest-neighbor sampling so the picture stays crisp
 * when the camera group scales it up.
 */

import {
  FilterMode,
  MipmapMode,
  SkImage,
  Skia,
  type SkPicture,
} from '@shopify/react-native-skia';

import type { SceneSnapshot } from '../scene/scene-snapshot';

export function bakeMapPicture(
  tileAtlas: SkImage,
  snapshot: SceneSnapshot,
  tileSize: number,
  atlasColumns: number,
): SkPicture {
  const mapWidth = snapshot.mapWidthTiles * tileSize;
  const mapHeight = snapshot.mapHeightTiles * tileSize;

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(0, 0, mapWidth, mapHeight),
  );
  const paint = Skia.Paint();

  snapshot.tiles.forEach((tileId, index) => {
    const tx = (index % snapshot.mapWidthTiles) * tileSize;
    const ty = Math.floor(index / snapshot.mapWidthTiles) * tileSize;
    const sx = (tileId % atlasColumns) * tileSize;
    const sy = Math.floor(tileId / atlasColumns) * tileSize;
    canvas.drawImageRectOptions(
      tileAtlas,
      Skia.XYWHRect(sx, sy, tileSize, tileSize),
      Skia.XYWHRect(tx, ty, tileSize, tileSize),
      FilterMode.Nearest,
      MipmapMode.None,
      paint,
    );
  });

  return recorder.finishRecordingAsPicture();
}
