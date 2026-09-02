/**
 * RNG streams (game plan §6): a run derives one independent generator per
 * system from a single master seed, so adding draws to one system never
 * shifts another system's outcomes, and a run snapshot stores each stream's
 * state separately.
 */

import {
  createSeededRandomSource,
  type SeededRandomSource,
} from '@/core/random/seeded-random-source';

export const RNG_STREAM_NAMES = [
  'dungeon',
  'enemyAi',
  'combat',
  'loot',
  'cosmetics',
  'gacha',
] as const;

export type RngStreamName = (typeof RNG_STREAM_NAMES)[number];

export type RngStreams = Readonly<Record<RngStreamName, SeededRandomSource>>;

/**
 * FNV-1a-style mix of the master seed and stream label into a 32-bit seed.
 * Deterministic across platforms (integer math only).
 */
export function deriveStreamSeed(masterSeed: number, label: string): number {
  if (!Number.isFinite(masterSeed)) {
    throw new Error(`master seed must be finite, got ${masterSeed}`);
  }
  let hash = (Math.trunc(masterSeed) ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < label.length; i++) {
    hash ^= label.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2545f491) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function deriveRngStreams(masterSeed: number): RngStreams {
  const streams = {} as Record<RngStreamName, SeededRandomSource>;
  for (const name of RNG_STREAM_NAMES) {
    streams[name] = createSeededRandomSource(
      deriveStreamSeed(masterSeed, name),
    );
  }
  return Object.freeze(streams);
}

/**
 * Snapshots every stream (e.g. before persisting an active run).
 * Keyed by stream name; shape mirrors RngSnapshot per stream.
 */
export function snapshotRngStreams(
  streams: RngStreams,
): Record<RngStreamName, { state: number; draws: number }> {
  const snapshot = {} as Record<
    RngStreamName,
    { state: number; draws: number }
  >;
  for (const name of RNG_STREAM_NAMES) {
    snapshot[name] = streams[name].snapshot();
  }
  return snapshot;
}
