/**
 * The Skia renderer for the spike. Consumes an immutable scene snapshot plus
 * the presentation shared values and draws the map and actors; it never
 * mutates gameplay state.
 *
 * Drawing units are CSS pixels (the Canvas scales to device pixels
 * internally), so the integer device-pixel zoom is divided by the pixel
 * density, and camera translations produced in device pixels are converted
 * back to CSS pixels — keeping every texel edge on a whole device pixel.
 */

import { useMemo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Atlas,
  Group,
  Picture,
  Skia,
  type Transforms3d,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import {
  REFERENCE_VIEWPORT_HEIGHT,
  REFERENCE_VIEWPORT_WIDTH,
  SHAKE_DURATION_MS,
  SHAKE_MAGNITUDE_PX,
  TILE_SIZE,
} from '@/game/config';
import { computeCameraTransform, shakeOffset } from '@/game/camera/camera-math';
import { frameIndex } from '@/game/sprites/frames';
import type { SceneSnapshot } from '@/game/projection/scene-snapshot';

import { bakeMapPicture } from './bake-map-picture';
import type { LoadedGameAssets } from './load-game-assets';
import type { SpikePresentation } from './use-spike-presentation';

export function computeDeviceScale(widthPx: number, heightPx: number): number {
  return Math.max(
    1,
    Math.floor(
      Math.min(
        widthPx / REFERENCE_VIEWPORT_WIDTH,
        heightPx / REFERENCE_VIEWPORT_HEIGHT,
      ),
    ),
  );
}

export interface GameCanvasProps {
  assets: LoadedGameAssets;
  snapshot: SceneSnapshot;
  presentation: SpikePresentation;
}

export function GameCanvas({
  assets,
  snapshot,
  presentation,
}: GameCanvasProps) {
  const { width, height } = useWindowDimensions();
  const density = PixelRatio.get();

  const deviceWidth = Math.round(width * density);
  const deviceHeight = Math.round(height * density);

  const mapPixelWidth = snapshot.mapWidthTiles * TILE_SIZE;
  const mapPixelHeight = snapshot.mapHeightTiles * TILE_SIZE;

  const tilesAtlas = assets.images['dungeon-tiles'];
  const actorsAtlas = assets.images['actors'];
  const tileAtlasEntry = assets.manifest.atlases['dungeon-tiles'];

  const mapPicture = useMemo(() => {
    if (!tilesAtlas || !tileAtlasEntry) return null;
    return bakeMapPicture(
      tilesAtlas,
      snapshot,
      TILE_SIZE,
      tileAtlasEntry.columns,
    );
  }, [tilesAtlas, tileAtlasEntry, snapshot]);

  // One derived transform keeps the type contract simple: the array itself is
  // the animated value.
  const worldTransform = useDerivedValue<Transforms3d>(() => {
    const transform = computeCameraTransform(
      presentation.focusX.value,
      presentation.focusY.value,
      mapPixelWidth,
      mapPixelHeight,
      deviceWidth,
      deviceHeight,
      presentation.zoom.value,
    );
    const shake = shakeOffset(
      presentation.clock.value - presentation.shakeStart.value,
      SHAKE_DURATION_MS,
      SHAKE_MAGNITUDE_PX * presentation.zoom.value,
    );
    return [
      { translateX: (transform.translateX + Math.round(shake.x)) / density },
      { translateY: (transform.translateY + Math.round(shake.y)) / density },
      { scale: presentation.zoom.value / density },
    ];
  });

  // NOTE: no inner closures (Array.map) in these worklets — plain loops keep
  // every iteration on the UI runtime.
  const actorSprites = useDerivedValue(() => {
    const clockMs = presentation.clock.value;
    const actors = presentation.actorRender.value;
    const sprites = [];
    for (let i = 0; i < actors.length; i++) {
      const animation = assets.manifest.animations[actors[i].animation];
      const frame = animation
        ? frameIndex(
            clockMs,
            animation.fps,
            animation.frameCount,
            animation.loop,
          )
        : 0;
      const sx = ((animation?.startFrame ?? 0) + frame) * TILE_SIZE;
      const sy = (animation?.row ?? 0) * TILE_SIZE;
      sprites.push(Skia.XYWHRect(sx, sy, TILE_SIZE, TILE_SIZE));
    }
    return sprites;
  });

  const actorTransforms = useDerivedValue(() => {
    const actors = presentation.actorRender.value;
    const transforms = [];
    const half = TILE_SIZE / 2;
    for (let i = 0; i < actors.length; i++) {
      const actor = actors[i];
      transforms.push(
        Skia.RSXform(
          actor.facing,
          0,
          actor.facing === 1 ? actor.x - half : actor.x + half,
          actor.y - half,
        ),
      );
    }
    return transforms;
  });

  if (!mapPicture || !actorsAtlas || !tileAtlasEntry) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group transform={worldTransform}>
        <Picture picture={mapPicture} />
        <Atlas
          image={actorsAtlas}
          sprites={actorSprites}
          transforms={actorTransforms}
          sampling={assets.nearestSampling}
        />
      </Group>
    </Canvas>
  );
}
