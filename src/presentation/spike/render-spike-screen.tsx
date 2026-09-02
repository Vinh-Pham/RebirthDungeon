/**
 * Phase 1 compatibility-and-rendering spike screen. The route owns every
 * lifecycle:
 *
 * - mount: generates a seeded dungeon through the rot.js adapter, creates the
 *   ECS `Core` + `Scene`, and launches the simulation ticker as a fiber on
 *   the app-scoped Effect runtime;
 * - unmount: interrupts the fiber (verified interruption) and disposes the
 *   ECS scene.
 *
 * Presentation never touches authoritative state — the ticker pushes copies
 * of committed positions into Reanimated shared values, and the Skia canvas
 * renders the immutable map snapshot.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { startTicker } from '@/bootstrap/effect-runtime';
import {
  startSpikeRun,
  type SpikeController,
} from '@/application/spike/spike-controller';
import { SPIKE_TICK_INTERVAL_MS } from '@/game/config';
import type { ActorSnapshot } from '@/game/projection/scene-snapshot';
import { GenerationError } from '@/game/rot/rot-dungeon-generator';
import {
  computeDeviceScale,
  GameCanvas,
} from '@/presentation/canvas/game-canvas';
import { useSpikePresentation } from '@/presentation/canvas/use-spike-presentation';
import {
  AssetLoadingError,
  loadGameAssets,
  type LoadedGameAssets,
} from '@/presentation/canvas/load-game-assets';

import { SpikeHud } from './spike-hud';

/** Any fixed seed reproduces the same dungeon, patrols, and facing. */
const SPIKE_SEED = 20260901;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; problems: readonly string[] }
  | { status: 'ready'; assets: LoadedGameAssets };

type StartState =
  | { status: 'failed'; problems: readonly string[] }
  | { status: 'ready'; controller: SpikeController };

const toRenderActor = ({ id, x, y, facing, animation }: ActorSnapshot) => ({
  id,
  x,
  y,
  facing,
  animation,
});

/** Synchronous dungeon generation + scene creation, captured as state. */
function startSpikeRunSafe(seed: number): StartState {
  try {
    return { status: 'ready', controller: startSpikeRun({ seed }) };
  } catch (error) {
    return {
      status: 'failed',
      problems:
        error instanceof GenerationError
          ? error.problems
          : [`Unexpected generation error: ${String(error)}`],
    };
  }
}

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

  // Created once per mount; the route owns the ECS lifecycle end to end.
  const [started] = useState<StartState>(() => startSpikeRunSafe(SPIKE_SEED));
  const controller = started.status === 'ready' ? started.controller : null;

  const snapshot = useMemo(
    () => (controller ? controller.project() : null),
    [controller],
  );

  const presentation = useSpikePresentation({
    actors: (snapshot?.actors ?? []).map(toRenderActor),
    followId: snapshot?.cameraTargetActorId ?? 'hero',
    zoom: 1,
  });
  // Latest presentation handle for the ticker closure. The lifecycle effect
  // below must depend only on `controller`: its cleanup is the only place the
  // ECS scene is disposed, so a re-arming dependency (React may drop a
  // useMemo identity at any time) would otherwise tear down a live run while
  // the restarted ticker keeps stepping the destroyed Core.
  const presentationRef = useRef(presentation);
  useEffect(() => {
    presentationRef.current = presentation;
  }, [presentation]);

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

  // Simulation ticker: an Effect fiber on the app-scoped runtime. Unmount
  // interrupts the fiber and disposes the ECS scene — nothing survives the
  // route.
  useEffect(() => {
    if (!controller) return;
    const fiber = startTicker(() => {
      controller.step();
      presentationRef.current.pushActorTargets(
        controller.project().actors.map(toRenderActor),
      );
    }, SPIKE_TICK_INTERVAL_MS);
    return () => {
      fiber.interruptUnsafe();
      controller.dispose();
    };
  }, [controller]);

  const followId = followMonster ? 'slime-0' : 'hero';
  useEffect(() => {
    presentation.setFollowId(followId);
  }, [followId, presentation]);

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

  if (started.status === 'failed') {
    return (
      <View style={[styles.container, styles.center]} accessible>
        <Text style={[styles.message, styles.errorTitle]}>
          Dungeon generation failed
        </Text>
        {started.problems.map((problem) => (
          <Text key={problem} style={styles.errorText}>
            {problem}
          </Text>
        ))}
      </View>
    );
  }

  if (loadState.status !== 'ready' || !snapshot) {
    return (
      <View style={[styles.container, styles.center]} accessible>
        {loadState.status === 'loading' ? (
          <Text style={styles.message}>Loading assets…</Text>
        ) : null}
        {loadState.status === 'error' ? (
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
        ) : null}
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
