/**
 * Presentation state for the render spike, driven by a single Reanimated frame
 * callback on the UI thread.
 *
 * Authority boundary: actor positions live in the demo scene's plain
 * TypeScript state (JavaScript thread). This module only ever receives
 * *copies* of that state as presentation targets; the authoritative values are
 * never stored in shared values. Everything mutated below (animation clock,
 * lerped render positions, camera focus, shake, frame stats) is purely
 * presentational.
 */

import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ACTOR_FOLLOW_RATE, CAMERA_FOLLOW_RATE } from '../config';
import { lerpFactor } from '../camera/camera-math';
import type { ActorSnapshot } from '../scene/scene-snapshot';

/** Plain copy of an actor used as a presentation target. */
export type RenderActor = Pick<
  ActorSnapshot,
  'id' | 'x' | 'y' | 'facing' | 'animation'
>;

const FRAME_STATS_WINDOW_MS = 500;

export interface SpikePresentation {
  /** Monotonic presentation clock in ms (animation frames derive from it). */
  readonly clock: SharedValue<number>;
  /** Presentation targets copied from the authoritative scene. */
  readonly actorTargets: SharedValue<RenderActor[]>;
  /** dt-lerped copies used for drawing (smooths simulation steps). */
  readonly actorRender: SharedValue<RenderActor[]>;
  /** Camera focus point in world logical pixels (lerped). */
  readonly focusX: SharedValue<number>;
  readonly focusY: SharedValue<number>;
  /** Actor id the camera should follow. */
  readonly followId: SharedValue<string>;
  /** Integer device-pixel scale. */
  readonly zoom: SharedValue<number>;
  /** Presentation clock value at which the current shake started (-1 = idle). */
  readonly shakeStart: SharedValue<number>;
  /** Frame statistics over the last sampling window. */
  readonly fps: SharedValue<number>;
  readonly worstFrameMs: SharedValue<number>;
  /** Starts a screen-shake impulse at the current clock value. */
  triggerShake(): void;
  /** Copies authoritative actor state into presentation targets. */
  pushActorTargets(targets: RenderActor[]): void;
  /** Switches the followed actor. */
  setFollowId(id: string): void;
  /** Sets the device-pixel zoom scale. */
  setZoom(value: number): void;
  /** Reduces the zoom if it exceeds the largest scale that fits the viewport. */
  clampZoom(max: number): void;
}

export function useSpikePresentation(initial: {
  actors: RenderActor[];
  followId: string;
  zoom: number;
}): SpikePresentation {
  const clock = useSharedValue(0);
  const actorTargets = useSharedValue<RenderActor[]>(initial.actors);
  const actorRender = useSharedValue<RenderActor[]>(
    initial.actors.map((actor) => ({ ...actor })),
  );
  const followId = useSharedValue(initial.followId);
  const focusX = useSharedValue(
    initial.actors.find((actor) => actor.id === initial.followId)?.x ?? 0,
  );
  const focusY = useSharedValue(
    initial.actors.find((actor) => actor.id === initial.followId)?.y ?? 0,
  );
  const zoom = useSharedValue(initial.zoom);
  const shakeStart = useSharedValue(-1);
  const fps = useSharedValue(0);
  const worstFrameMs = useSharedValue(0);

  const statFrames = useSharedValue(0);
  const statWindowMs = useSharedValue(0);

  useFrameCallback((frame) => {
    const dtMs = frame.timeSincePreviousFrame ?? 0;
    clock.value += dtMs;

    // Frame statistics (presentation diagnostics only).
    statFrames.value += 1;
    statWindowMs.value += dtMs;
    if (dtMs > worstFrameMs.value) worstFrameMs.value = dtMs;
    if (statWindowMs.value >= FRAME_STATS_WINDOW_MS) {
      fps.value = (statFrames.value * 1000) / statWindowMs.value;
      statFrames.value = 0;
      statWindowMs.value = 0;
      worstFrameMs.value = 0;
    }

    // Smooth the discrete simulation steps into continuous motion.
    // NOTE: no inner closures (Array.map/find) here — they are not reliably
    // auto-workletized, so plain loops keep everything on the UI runtime.
    const targets = actorTargets.value;
    const render = actorRender.value;
    const actorK = lerpFactor(dtMs, ACTOR_FOLLOW_RATE);
    const next: RenderActor[] = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const previous = render[i];
      next.push(
        previous
          ? {
              id: target.id,
              x: previous.x + (target.x - previous.x) * actorK,
              y: previous.y + (target.y - previous.y) * actorK,
              facing: target.facing,
              animation: target.animation,
            }
          : { ...target },
      );
    }
    actorRender.value = next;

    // Camera follow.
    let followed: RenderActor | undefined;
    for (let i = 0; i < next.length; i++) {
      if (next[i].id === followId.value) {
        followed = next[i];
        break;
      }
    }
    if (followed) {
      const cameraK = lerpFactor(dtMs, CAMERA_FOLLOW_RATE);
      focusX.value += (followed.x - focusX.value) * cameraK;
      focusY.value += (followed.y - focusY.value) * cameraK;
    }
  }, true);

  return {
    clock,
    actorTargets,
    actorRender,
    focusX,
    focusY,
    followId,
    zoom,
    shakeStart,
    fps,
    worstFrameMs,
    triggerShake() {
      shakeStart.value = clock.value;
    },
    pushActorTargets(targets) {
      actorTargets.value = targets;
    },
    setFollowId(id) {
      followId.value = id;
    },
    setZoom(value) {
      zoom.value = value;
    },
    clampZoom(max) {
      if (zoom.value > max) zoom.value = max;
    },
  };
}
