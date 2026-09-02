/**
 * Rendering baseline constants (Phase 1 decision — see README "Rendering
 * baseline"). All values are in logical pixels unless stated otherwise.
 */

/** Base tile size in logical pixels. Every atlas grid is aligned to it. */
export const TILE_SIZE = 16;

/**
 * Reference portrait viewport. The renderer picks the largest integer device
 * pixel that scales this viewport to fit the screen and centers the result,
 * so one logical pixel is always a whole number of device pixels.
 */
export const REFERENCE_VIEWPORT_WIDTH = 240;
export const REFERENCE_VIEWPORT_HEIGHT = 320;

/** Camera exponential-lerp rate (per second); dt-corrected in the worklet. */
export const CAMERA_FOLLOW_RATE = 6;

/** Lerp rate (per second) smoothing actor presentation toward sim positions. */
export const ACTOR_FOLLOW_RATE = 14;

/** Screen shake impulse envelope. */
export const SHAKE_DURATION_MS = 420;
export const SHAKE_MAGNITUDE_PX = 2.5;

/** How often the spike simulation steps on the JavaScript thread (ms). */
export const SPIKE_TICK_INTERVAL_MS = 100;
