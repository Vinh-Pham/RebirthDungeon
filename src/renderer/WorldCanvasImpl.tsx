import { useEffect, useSyncExternalStore } from 'react';
import { Atlas, Canvas, Group, Rect, Text as SkiaText, useFont, useImage, Skia, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { cancelAnimation, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import type { JourneySession } from '../game/JourneySession';
import { atlasAssets } from './AtlasAssets';
import { TileRenderer } from './TileRenderer';
import { spriteRect } from './Atlas';
import type { GameCommand } from '../engine/commands';
export interface WorldCanvasProps { session: JourneySession; width: number; dispatch(command: GameCommand): void }
export default function WorldCanvas({ session, width, dispatch }: WorldCanvasProps) {
  const { state, map } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const scale = width / (map.width * map.tileSize);
  const sprite = session.engine.getEntity('player')!.sprite!;
  const atlas = session.content.data.atlases.find((entry) => entry.id === sprite.atlas)!;
  const source = atlasAssets[sprite.atlas];
  if (!source) throw new Error(`No bundled image registered for atlas: ${sprite.atlas}`);
  const image = useImage(source);
  const font = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 12);
  const x = useSharedValue(state.position.x * map.tileSize); const y = useSharedValue(state.position.y * map.tileSize);
  const opacity = useSharedValue(0);
  const transform = useDerivedValue(() => [{ translateX: x.get() }, { translateY: y.get() }]);
  useEffect(() => { x.set(withTiming(state.position.x * map.tileSize, { duration: 160 })); y.set(withTiming(state.position.y * map.tileSize, { duration: 160 })); }, [state.position.x, state.position.y, map.tileSize, x, y]);
  useEffect(() => { opacity.set(withTiming(1, { duration: 260 })); return () => { [x, y, opacity].forEach(cancelAnimation); }; }, [x, y, opacity]);
  const tap = Gesture.Tap().runOnJS(true).onEnd((event, success) => {
    if (success) dispatch({ type: 'TRAVEL_TO', x: Math.floor(event.x / scale / map.tileSize), y: Math.floor(event.y / scale / map.tileSize) });
  });
  const glyph = { npc: 'K', chest: 'C', rest: '*', portal: '>', encounter: '!' };
  return <GestureDetector gesture={tap}><Canvas style={{ width, height: width * map.height / map.width }} accessibilityLabel="Exploration map. Use the movement and interaction buttons below.">
    <Group transform={[{ scale }]} opacity={opacity}>
      <TileRenderer map={map} />
      {map.objects.map((obj) => {
        const cleared = state.cleared.includes(`${map.id}/${obj.id}`) || state.opened.includes(`${map.id}/${obj.id}`);
        return <Group key={obj.id} opacity={cleared ? 0.25 : 1}>
          <Rect x={obj.x * map.tileSize + 7} y={obj.y * map.tileSize + 7} width={18} height={18} color={obj.kind === 'encounter' ? '#76483d' : '#586157'} />
          {font ? <SkiaText x={obj.x * map.tileSize + 12} y={obj.y * map.tileSize + 21} font={font} text={glyph[obj.kind]} color="#ead5ab" /> : null}
        </Group>;
      })}
      {image ? <Group transform={transform}><Atlas image={image} sprites={[spriteRect(atlas, sprite.frame)]}
        transforms={[Skia.RSXform(1, 0, 0, 0)]} sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }} /></Group> : null}
    </Group>
  </Canvas></GestureDetector>;
}
