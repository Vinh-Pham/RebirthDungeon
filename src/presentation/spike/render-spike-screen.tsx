/**
 * Phase 1 render spike screen: preloads the game assets through the manifest,
 * runs the authoritative demo scene on the JavaScript thread, and layers the
 * accessible HUD over the Skia canvas.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { DEMO_TICK_INTERVAL_MS } from '@/game/config';
import { computeDeviceScale, GameCanvas } from '@/game/render/game-canvas';
import { useSpikePresentation } from '@/game/render/use-spike-presentation';
import {
  AssetLoadingError,
  loadGameAssets,
  type LoadedGameAssets,
} from '@/game/assets/load-game-assets';
import {
  createDemoScene,
  getSceneSnapshot,
  setCameraTarget,
  tickDemoScene,
} from '@/game/scene/demo-scene';

import { SpikeHud } from './spike-hud';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; problems: readonly string[] }
  | { status: 'ready'; assets: LoadedGameAssets };

const toRenderActor = ({
  id,
  x,
  y,
  facing,
  animation,
}: {
  id: string;
  x: number;
  y: number;
  facing: 1 | -1;
  animation: string;
}) => ({ id, x, y, facing, animation });

export function RenderSpikeScreen() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [followMonster, setFollowMonster] = useState(false);
  const [stats, setStats] = useState({ fps: 0, worstFrameMs: 0 });

  const { width, height } = useWindowDimensions();
  const density = PixelRatio.get();

  const zoomSteps = useMemo(() => {
    const max = computeDeviceScale(
      Math.round(width * density),
      Math.round(height * density),
    );
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [width, height, density]);
  // Start fully zoomed in (chunky pixels, camera clamping visible).
  const [zoomIndex, setZoomIndex] = useState(zoomSteps.length - 1);

  // Created once; the authoritative simulation state for the spike.
  const [scene] = useState(() => createDemoScene());
  const snapshot = useMemo(() => getSceneSnapshot(scene), [scene]);

  const presentation = useSpikePresentation({
    actors: snapshot.actors.map(toRenderActor),
    followId: snapshot.cameraTargetActorId,
    zoom: 1,
  });

  const zoom = zoomSteps[Math.min(zoomIndex, zoomSteps.length - 1)] ?? 1;

  useEffect(() => {
    let cancelled = false;
    loadGameAssets().then(
      (assets) => {
        if (!cancelled) setLoadState({ status: 'ready', assets });
      },
      (error: unknown) => {
        if (cancelled) return;
        const problems =
          error instanceof AssetLoadingError
            ? error.problems
            : [`Unexpected asset error: ${String(error)}`];
        setLoadState({ status: 'error', problems });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Authoritative simulation tick (JS thread). Shared values only ever
  // receive copies of the resulting positions.
  useEffect(() => {
    const interval = setInterval(() => {
      tickDemoScene(scene, DEMO_TICK_INTERVAL_MS);
      presentation.pushActorTargets(scene.actors.map(toRenderActor));
    }, DEMO_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [scene, presentation]);

  const followId = followMonster ? 'slime-north' : 'hero';
  useEffect(() => {
    setCameraTarget(scene, followId);
    presentation.setFollowId(followId);
  }, [followId, scene, presentation]);

  useEffect(() => {
    presentation.clampZoom(zoomSteps.length);
    presentation.setZoom(zoom);
  }, [zoom, zoomSteps.length, presentation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        fps: presentation.fps.value,
        worstFrameMs: presentation.worstFrameMs.value,
      });
    }, 500);
    return () => clearInterval(interval);
  }, [presentation]);

  if (loadState.status !== 'ready') {
    return (
      <View style={[styles.container, styles.center]} accessible>
        {loadState.status === 'loading' ? (
          <Text style={styles.message}>Loading assets…</Text>
        ) : (
          <>
            <Text style={[styles.message, styles.errorTitle]}>
              Assets failed to load
            </Text>
            {loadState.problems.map((problem) => (
              <Text key={problem} style={styles.errorText}>
                {problem}
              </Text>
            ))}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameCanvas
        assets={loadState.assets}
        snapshot={snapshot}
        presentation={presentation}
      />
      <SpikeHud
        fps={stats.fps}
        worstFrameMs={stats.worstFrameMs}
        zoom={zoom}
        followMonster={followMonster}
        onShake={presentation.triggerShake}
        onCycleZoom={() =>
          setZoomIndex((index) => (index + 1) % zoomSteps.length)
        }
        onToggleFollow={() => setFollowMonster((value) => !value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    color: '#e8e6e3',
    fontSize: 16,
  },
  errorTitle: {
    color: '#ff8a80',
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    color: '#ffb4ae',
    fontSize: 13,
    marginBottom: 4,
  },
});
