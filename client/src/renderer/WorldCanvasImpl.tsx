import { useEffect, useSyncExternalStore } from 'react';
import {
  Atlas,
  Canvas,
  Group,
  Rect,
  Text as SkiaText,
  useFont,
  useImage,
  Skia,
  FilterMode,
  MipmapMode,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { GameplayJourney as JourneySession } from '../game/Gameplay';
import RestingIndicator from './RestingIndicator';
import { atlasAssets } from './AtlasAssets';
import { TileRenderer } from './TileRenderer';
import { DecorationRenderer } from './DecorationRenderer';
import { spriteRect } from './Atlas';
import type { GameCommand } from '../engine/commands';
import { followCamera, screenToWorld } from './Camera';
import type { SpriteAtlas } from '../data/schemas/content';
export interface WorldCanvasProps {
  session: JourneySession;
  width: number;
  dispatch(command: GameCommand): void;
  onObjectPress?(objectId: string): void;
}
export default function WorldCanvas({ session, width, dispatch, onObjectPress }: WorldCanvasProps) {
  const { state, map, resting } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const follows = !!state.dungeon || map.theme === 'town';
  const scale = follows ? 1 : width / (map.width * map.tileSize);
  const height = follows ? Math.min(width, 420) : (width * map.height) / map.width;
  const camera = followCamera(
    { x: (state.position.x + 0.5) * map.tileSize, y: (state.position.y + 0.5) * map.tileSize },
    { width: map.width * map.tileSize, height: map.height * map.tileSize },
    { width, height },
    scale,
  );
  const sprite = session.playerSprite();
  const atlas = session.content.data.atlases.find((entry) => entry.id === sprite.atlas)!;
  const source = atlasAssets[sprite.atlas];
  if (!source) throw new Error(`No bundled image registered for atlas: ${sprite.atlas}`);
  const image = useImage(source);
  const font = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 12);
  const x = useSharedValue(state.position.x * map.tileSize);
  const y = useSharedValue(state.position.y * map.tileSize);
  const opacity = useSharedValue(0);
  const cameraX = useSharedValue(camera.x);
  const cameraY = useSharedValue(camera.y);
  const cameraTransform = useDerivedValue(() => [
    { translateX: -cameraX.get() * scale },
    { translateY: -cameraY.get() * scale },
    { scale },
  ]);
  const transform = useDerivedValue(() => [{ translateX: x.get() }, { translateY: y.get() }]);
  useEffect(() => {
    x.set(withTiming(state.position.x * map.tileSize, { duration: 160 }));
    y.set(withTiming(state.position.y * map.tileSize, { duration: 160 }));
  }, [state.position.x, state.position.y, map.tileSize, x, y]);
  useEffect(() => {
    cameraX.set(withTiming(camera.x, { duration: 160 }));
    cameraY.set(withTiming(camera.y, { duration: 160 }));
  }, [camera.x, camera.y, cameraX, cameraY]);
  useEffect(() => {
    opacity.set(withTiming(1, { duration: 260 }));
    return () => {
      [x, y, opacity].forEach(cancelAnimation);
    };
  }, [x, y, opacity]);
  useEffect(
    () => () => {
      [cameraX, cameraY].forEach(cancelAnimation);
    },
    [cameraX, cameraY],
  );
  const tap = Gesture.Tap()
    .enabled(!resting)
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const point = screenToWorld(event, { x: cameraX.get(), y: cameraY.get(), zoom: scale });
      const tile = { x: Math.floor(point.x / map.tileSize), y: Math.floor(point.y / map.tileSize) };
      const object = map.objects.find((obj) => obj.x === tile.x && obj.y === tile.y);
      if (object && onObjectPress) onObjectPress(object.id);
      else dispatch({ type: 'TRAVEL_TO', ...tile });
    });
  const glyph = {
    npc: 'K',
    chest: 'C',
    rest: '*',
    portal: '>',
    encounter: '!',
    dungeonEntrance: 'G',
    statue: 'G',
    mimic: 'C',
    fountain: 'F',
    gate: 'B',
    key: 'k',
    finalChest: 'C',
    merchant: '$',
    healer: '+',
    altar: 'G',
  };
  return (
    <GestureDetector gesture={tap}>
      <Canvas
        style={{ width, height }}
        accessibilityLabel={
          resting
            ? 'Exploration map. Your character is sleeping. Stop resting before moving.'
            : 'Exploration map. Tap objects or use the movement and interaction buttons below.'
        }
      >
        <Group transform={cameraTransform} opacity={opacity}>
          <TileRenderer map={map} />
          <DecorationRenderer
            map={map}
            atlases={session.content.data.atlases}
            playerY={state.position.y}
            foreground={false}
          />
          {map.objects.map((obj) => {
            if (map.decorations.some((decoration) => decoration.objectId === obj.id)) return null;
            const cleared = session.isClaimed(obj.id);
            const objectSprite = session.objectSprite(obj);
            return (
              <Group key={obj.id} opacity={cleared ? 0.25 : 1}>
                {objectSprite ? (
                  <WorldObjectSprite
                    sprite={objectSprite}
                    atlas={session.content.data.atlases.find(
                      (entry) => entry.id === objectSprite.atlas,
                    )!}
                    x={obj.x * map.tileSize}
                    y={obj.y * map.tileSize}
                  />
                ) : obj.kind === 'altar' ? (
                  <>
                    <Rect
                      x={obj.x * map.tileSize + 2}
                      y={obj.y * map.tileSize + 22}
                      width={28}
                      height={8}
                      color="#ac9667"
                    />
                    <Rect
                      x={obj.x * map.tileSize + 8}
                      y={obj.y * map.tileSize + 4}
                      width={16}
                      height={20}
                      color="#ded4b9"
                    />
                  </>
                ) : (
                  <Rect
                    x={obj.x * map.tileSize + 7}
                    y={obj.y * map.tileSize + 7}
                    width={18}
                    height={18}
                    color={
                      obj.kind === 'encounter' || obj.blocked
                        ? '#76483d'
                        : obj.kind === 'key' || obj.kind === 'finalChest'
                          ? '#876d38'
                          : obj.kind === 'fountain'
                            ? '#416b7b'
                            : obj.kind === 'healer'
                              ? '#4c7574'
                              : '#586157'
                    }
                  />
                )}
                {font && !objectSprite ? (
                  <SkiaText
                    x={obj.x * map.tileSize + 12}
                    y={obj.y * map.tileSize + 21}
                    font={font}
                    text={obj.kind === 'gate' ? (obj.blocked ? 'B' : '>') : glyph[obj.kind]}
                    color={obj.kind === 'altar' ? '#534735' : '#ead5ab'}
                  />
                ) : null}
              </Group>
            );
          })}
          {image ? (
            <Group transform={transform}>
              <Atlas
                image={image}
                sprites={[spriteRect(atlas, sprite.frame)]}
                transforms={[Skia.RSXform(1, 0, 0, 0)]}
                sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
              />
            </Group>
          ) : null}
          <DecorationRenderer
            map={map}
            atlases={session.content.data.atlases}
            playerY={state.position.y}
            foreground
          />
          {resting && font ? (
            <Group transform={transform}>
              <RestingIndicator font={font} />
            </Group>
          ) : null}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

function WorldObjectSprite({
  sprite,
  atlas,
  x,
  y,
}: {
  sprite: { atlas: string; frame: number };
  atlas: SpriteAtlas;
  x: number;
  y: number;
}) {
  const source = atlasAssets[sprite.atlas];
  if (!source) throw new Error(`No bundled image registered for atlas: ${sprite.atlas}`);
  const image = useImage(source);
  return image ? (
    <Atlas
      image={image}
      sprites={[spriteRect(atlas, sprite.frame)]}
      transforms={[Skia.RSXform(1, 0, x, y)]}
      sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
    />
  ) : null;
}
