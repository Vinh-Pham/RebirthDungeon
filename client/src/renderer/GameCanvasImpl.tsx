import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Canvas, Fill, Group, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SpriteAtlas } from '../data/schemas/content';
import type { PresentationBatch } from './animations/PresentationQueue';
import type { GameplayBattle as BattleSession } from '../game/Gameplay';
import { TileRenderer } from './TileRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { ParticleRenderer } from './ParticleRenderer';
import { EffectRenderer } from './EffectRenderer';
import { atlasAssets } from './AtlasAssets';
import { hitTestBattleTarget } from './BattleTargeting';

export interface GameCanvasProps {
  session: BattleSession;
  width: number;
  targetIds: readonly string[];
  inputEnabled: boolean;
  onTargetPress(id: string, expectedActionCount: number): void;
}

export default function GameCanvas({
  session,
  width,
  targetIds,
  inputEnabled,
  onTargetPress,
}: GameCanvasProps) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const presentation = useSyncExternalStore(
    session.presentation.subscribe,
    session.presentation.getSnapshot,
    session.presentation.getSnapshot,
  );
  const mapWidth = session.map.width * session.map.tileSize;
  const mapHeight = session.map.height * session.map.tileSize;
  const height = (width * mapHeight) / mapWidth;
  const fit = width / mapWidth;
  const zoom = useSharedValue(fit);
  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const shake = useSharedValue(0);
  const gestureCount = useSharedValue(-1);
  const gestureAction = useSharedValue('');
  const actionKey = JSON.stringify(view.selectedAction ?? { action: 'attack' });
  const targetKey = targetIds.join('|');
  useEffect(() => {
    gestureCount.set(-1);
  }, [inputEnabled, actionKey, targetKey, gestureCount]);
  const transform = useDerivedValue(() => [
    { translateX: -cameraX.get() * zoom.get() + shake.get() },
    { translateY: -cameraY.get() * zoom.get() },
    { scale: zoom.get() },
  ]);
  useEffect(() => {
    zoom.set(fit);
    cameraX.set(0);
    cameraY.set(0);
  }, [fit, zoom, cameraX, cameraY]);
  useEffect(() => {
    if (presentation.active?.impacts.some((impact) => !impact.healing)) {
      shake.set(
        withDelay(
          350,
          withSequence(
            withTiming(-3, { duration: 40 }),
            withTiming(3, { duration: 40 }),
            withTiming(-2, { duration: 40 }),
            withTiming(2, { duration: 40 }),
            withTiming(0, { duration: 40 }),
          ),
        ),
      );
    }
  }, [presentation.active, shake]);
  useEffect(
    () => () => {
      [zoom, cameraX, cameraY, shake].forEach(cancelAnimation);
    },
    [zoom, cameraX, cameraY, shake],
  );
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(11)
        .runOnJS(true)
        .onBegin(() => {
          const count = session.getSnapshot().actionCount;
          gestureCount.set(inputEnabled && session.canAcceptPlayerInput(count) ? count : -1);
          gestureAction.set(actionKey);
        })
        .onEnd((event, success) => {
          const count = gestureCount.get();
          gestureCount.set(-1);
          if (
            !success ||
            !inputEnabled ||
            count < 0 ||
            !session.canAcceptPlayerInput(count) ||
            gestureAction.get() !==
              JSON.stringify(session.getSnapshot().selectedAction ?? { action: 'attack' })
          )
            return;
          const targetId = hitTestBattleTarget(
            { x: event.x - shake.get(), y: event.y },
            session.getSnapshot().entities,
            targetIds,
            { x: cameraX.get(), y: cameraY.get(), zoom: zoom.get() },
          );
          if (targetId) onTargetPress(targetId, count);
        })
        .onFinalize(() => {
          gestureCount.set(-1);
        }),
    [
      session,
      inputEnabled,
      actionKey,
      gestureCount,
      gestureAction,
      cameraX,
      cameraY,
      zoom,
      shake,
      targetIds,
      onTargetPress,
    ],
  );
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(12)
        .onChange((event) => {
          cameraX.set(
            Math.max(
              0,
              Math.min(mapWidth - width / zoom.get(), cameraX.get() - event.changeX / zoom.get()),
            ),
          );
          cameraY.set(
            Math.max(
              0,
              Math.min(mapHeight - height / zoom.get(), cameraY.get() - event.changeY / zoom.get()),
            ),
          );
        }),
    [cameraX, cameraY, height, mapHeight, mapWidth, width, zoom],
  );
  const gesture = useMemo(() => Gesture.Race(tap, pan), [tap, pan]);
  function zoomTo(multiplier: number) {
    const next = fit * multiplier;
    zoom.set(withTiming(next, { duration: 240 }));
    cameraX.set(withTiming((mapWidth - width / next) / 2, { duration: 240 }));
    cameraY.set(withTiming((mapHeight - height / next) / 2, { duration: 240 }));
  }
  return (
    <View>
      <GestureDetector gesture={gesture}>
        <Canvas
          style={{ width, height }}
          accessibilityLabel="Battle arena. Tap a highlighted target to act immediately, or expand Targets below for accessible buttons."
        >
          <Fill color="#101820" />
          <Group transform={transform}>
            <TileRenderer map={session.map} />
            {session.content.data.atlases
              .filter((atlas) =>
                session.initialEntities.some((entity) => entity.sprite.atlas === atlas.id),
              )
              .map((atlas) => (
                <AtlasLayer
                  key={atlas.id}
                  atlas={atlas}
                  session={session}
                  active={presentation.active}
                  selectedTargetId={view.selectedTargetId}
                  targetIds={inputEnabled ? targetIds : []}
                />
              ))}
            <ParticleRenderer active={presentation.active} entities={session.initialEntities} />
            <EffectRenderer
              active={presentation.active}
              entities={session.initialEntities}
              element={
                presentation.active?.skillId
                  ? session.content.skill(presentation.active.skillId).element
                  : undefined
              }
            />
          </Group>
        </Canvas>
      </GestureDetector>
      <View style={styles.tools}>
        <Text style={styles.hint}>
          {inputEnabled ? 'Tap a target to act' : 'Targeting paused'} · drag to pan
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in on arena"
          onPress={() => zoomTo(1.4)}
          style={styles.tool}
        >
          <Text style={styles.toolText}>＋</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset arena camera"
          onPress={() => zoomTo(1)}
          style={styles.tool}
        >
          <Text style={styles.toolText}>↺</Text>
        </Pressable>
      </View>
    </View>
  );
}
function AtlasLayer({
  atlas,
  session,
  active,
  selectedTargetId,
  targetIds,
}: {
  atlas: SpriteAtlas;
  session: BattleSession;
  active?: PresentationBatch;
  selectedTargetId?: string;
  targetIds: readonly string[];
}) {
  const source = atlasAssets[atlas.id];
  if (!source) throw new Error(`No bundled image registered for atlas: ${atlas.id}`);
  const image = useImage(source);
  return (
    <Group>
      {image
        ? session.initialEntities
            .filter((entity) => entity.sprite.atlas === atlas.id)
            .map((entity) => (
              <SpriteRenderer
                key={entity.id}
                entity={entity}
                image={image}
                atlas={atlas}
                active={active}
                selected={selectedTargetId === entity.id}
                targetable={targetIds.includes(entity.id)}
              />
            ))
        : null}
    </Group>
  );
}

const styles = StyleSheet.create({
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#192126',
    paddingLeft: 12,
  },
  hint: { color: '#849295', fontSize: 11, flex: 1 },
  tool: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  toolText: { color: '#d8c49d', fontSize: 20 },
});
