/**
 * The run screen (Phase 3): route-owned lifecycle over the authoritative run
 * scene. The player acts through the run controller — D-pad, swipe, tap-to-
 * walk, and keyboard all reduce to the same cardinal move command — and the
 * renderer only ever draws frozen snapshots, interpolating committed positions
 * on the UI thread.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  type ComposedGesture,
  type GestureType,
} from 'react-native-gesture-handler';

import { contentRepository } from '@/bootstrap/content';
import {
  startRun,
  type RunCommandResult,
  type RunController,
} from '@/application/run/run-controller';
import { TILE_SIZE } from '@/game/config';
import { computeCameraTransform } from '@/game/camera/camera-math';
import type { RunEvent } from '@/game/events/domain-events';
import type { RunSnapshot } from '@/game/projection/run-snapshot';
import type { SceneSnapshot } from '@/game/projection/scene-snapshot';
import {
  GameCanvas,
  computeDeviceScale,
} from '@/presentation/canvas/game-canvas';
import { useSpikePresentation } from '@/presentation/canvas/use-spike-presentation';
import {
  AssetLoadingError,
  loadGameAssets,
  type LoadedGameAssets,
} from '@/presentation/canvas/load-game-assets';
import {
  directionFromKey,
  directionFromSwipe,
} from '@/presentation/run/input-map';
import { RunHud } from '@/presentation/run/run-hud';

/** Any fixed seed reproduces the same dungeon, spawns, and AI decisions. */
const RUN_SEED = 20260903;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; problems: readonly string[] }
  | { status: 'ready'; assets: LoadedGameAssets };

type RunState =
  | { status: 'loading' }
  | { status: 'failed'; problems: readonly string[] }
  | { status: 'ready'; controller: RunController };

function eventToMessage(event: RunEvent): string | null {
  switch (event.type) {
    case 'ATTACK_BUMP':
      return `${event.actorId} attacks ${event.targetId}!`;
    case 'DOOR_OPENED':
      return 'You open the door.';
    case 'TRAP_TRIGGERED':
      return 'A trap springs beneath you!';
    case 'PICKUP_COLLECTED':
      return 'You pick something up.';
    case 'STAIRS_REACHED':
      return 'You found the way down.';
    case 'INPUT_REJECTED':
      return event.reason === 'blocked' ? 'Blocked.' : 'You cannot go there.';
    default:
      return null;
  }
}

function latestMessage(events: readonly RunEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const message = eventToMessage(events[i]);
    if (message) return message;
  }
  return null;
}

function toSceneSnapshot(run: RunSnapshot): SceneSnapshot {
  return {
    mapWidthTiles: run.map.width,
    mapHeightTiles: run.map.height,
    tiles: run.map.tiles,
    actors: run.actors.map((actor) => ({
      id: actor.id,
      kind: actor.kind,
      x: actor.pxX,
      y: actor.pxY,
      facing: actor.facing,
      animation: actor.animation,
    })),
    cameraTargetActorId: 'hero',
  };
}

export function RunScreen() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [runState, setRunState] = useState<RunState>({ status: 'loading' });
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
  const [zoomIndex, setZoomIndex] = useState(zoomSteps.length - 1);
  const zoom = zoomSteps[Math.min(zoomIndex, zoomSteps.length - 1)] ?? 1;

  // Route-owned lifecycle: content loads once, the run controller is created
  // once, and cleanup is the only place the ECS scene is disposed.
  useEffect(() => {
    let cancelled = false;
    contentRepository.loadCatalog().then(
      (content) => {
        if (cancelled) return;
        try {
          const controller = startRun({ seed: RUN_SEED, content });
          setSnapshot(controller.snapshot());
          setRunState({ status: 'ready', controller });
        } catch (error) {
          setRunState({
            status: 'failed',
            problems: [String(error)],
          });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setRunState({ status: 'failed', problems: [String(error)] });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const controller = runState.status === 'ready' ? runState.controller : null;

  useEffect(() => {
    return () => {
      controller?.dispose();
    };
  }, [controller]);

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

  const presentation = useSpikePresentation({
    actors: (snapshot?.actors ?? []).map((actor) => ({
      id: actor.id,
      x: actor.pxX,
      y: actor.pxY,
      facing: actor.facing,
      animation: actor.animation,
    })),
    followId: 'hero',
    zoom: 1,
  });
  // Latest presentation handle for command closures; the lifecycle effect
  // above must depend only on stable controller state (see Phase 1 lesson).
  const presentationRef = useRef(presentation);
  useEffect(() => {
    presentationRef.current = presentation;
  }, [presentation]);

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

  // Every committed snapshot — including the first, which arrives before the
  // presentation hook has any targets — is pushed into the shared values here.
  useEffect(() => {
    if (!snapshot) return;
    presentation.pushActorTargets(
      snapshot.actors.map((actor) => ({
        id: actor.id,
        x: actor.pxX,
        y: actor.pxY,
        facing: actor.facing,
        animation: actor.animation,
      })),
    );
  }, [snapshot, presentation]);

  const commit = useCallback(
    (result: RunCommandResult) => {
      if (!controller) return;
      const next = controller.snapshot();
      setSnapshot(next);
      setMessage(
        result.status === 'rejected'
          ? (latestMessage(next.events) ?? result.reason ?? null)
          : latestMessage(next.events),
      );
    },
    [controller],
  );

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (!controller) return;
      commit(controller.submitMove(dx, dy));
    },
    [controller, commit],
  );

  // Tap-to-walk: map the tapped screen point back to a world tile through the
  // inverse of the camera transform, then walk one step toward it. Built in an
  // effect because shared values may only be read after render (via the ref).
  const [canvasGesture, setCanvasGesture] = useState<
    ComposedGesture | GestureType
  >(() => Gesture.Tap());
  useEffect(() => {
    const tap = Gesture.Tap().onEnd((event) => {
      if (!controller || !snapshot) return;
      const presentation = presentationRef.current;
      const deviceWidth = Math.round(width * density);
      const deviceHeight = Math.round(height * density);
      const transform = computeCameraTransform(
        presentation.focusX.value,
        presentation.focusY.value,
        snapshot.map.width * TILE_SIZE,
        snapshot.map.height * TILE_SIZE,
        deviceWidth,
        deviceHeight,
        presentation.zoom.value,
      );
      const worldX =
        (event.x * density - transform.translateX) / presentation.zoom.value;
      const worldY =
        (event.y * density - transform.translateY) / presentation.zoom.value;
      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);
      commit(controller.submitTapMove(tileX, tileY));
    });
    const swipe = Gesture.Pan().onEnd((event) => {
      if (!controller) return;
      const direction = directionFromSwipe(
        event.translationX,
        event.translationY,
      );
      if (direction) {
        commit(controller.submitMove(direction.dx, direction.dy));
      }
    });
    setCanvasGesture(Gesture.Race(tap, swipe));
  }, [controller, snapshot, width, height, density, commit]);

  const heroHp =
    snapshot?.actors.find((actor) => actor.id === 'hero')?.hp ?? null;

  if (runState.status === 'failed') {
    return (
      <View style={[styles.container, styles.center]} accessible>
        <Text style={[styles.message, styles.errorTitle]}>
          The run failed to start
        </Text>
        {runState.problems.map((problem) => (
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
        <Text style={styles.message}>
          {loadState.status === 'error'
            ? loadState.problems.join('\n')
            : 'Preparing the dungeon…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={canvasGesture}>
        <View style={StyleSheet.absoluteFill}>
          <GameCanvas
            assets={loadState.assets}
            snapshot={toSceneSnapshot(snapshot)}
            presentation={presentation}
          />
        </View>
      </GestureDetector>

      {/* Hardware-keyboard bridge: arrows/WASD produce the same move command
          as every other input. Hidden from users and screen readers. */}
      <TextInput
        onKeyPress={({ nativeEvent }) => {
          const direction = directionFromKey(nativeEvent.key);
          if (direction) handleMove(direction.dx, direction.dy);
        }}
        autoFocus
        caretHidden
        showSoftInputOnFocus={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.keyBridge}
        multiline={false}
      />

      <RunHud
        turn={snapshot.turn}
        awaitingInput={snapshot.phase === 'awaitingInput'}
        message={message}
        heroHp={heroHp}
        fps={stats.fps}
        worstFrameMs={stats.worstFrameMs}
        zoom={zoom}
        onMove={(direction) => handleMove(direction.dx, direction.dy)}
        onWait={() => {
          if (!controller) return;
          commit(controller.submitWait());
        }}
        onShake={presentation.triggerShake}
        onCycleZoom={() =>
          setZoomIndex((index) => (index + 1) % zoomSteps.length)
        }
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
  keyBridge: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
