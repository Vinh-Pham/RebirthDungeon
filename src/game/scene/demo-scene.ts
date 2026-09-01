/**
 * Authoritative demo scene for the rendering spike.
 *
 * This is plain mutable TypeScript state — the single source of truth for
 * actor positions. The renderer never mutates it; presentation layers receive
 * immutable snapshots or plain copies of actor state.
 */

import type { ActorSnapshot, SceneSnapshot } from './scene-snapshot';
import { TILE_SIZE } from '../config';

export interface DemoScene {
  mapWidthTiles: number;
  mapHeightTiles: number;
  tiles: number[];
  actors: InternalActor[];
  cameraTargetActorId: string;
  clockMs: number;
}

interface InternalActor extends Omit<ActorSnapshot, 'x' | 'y' | 'facing'> {
  x: number;
  y: number;
  facing: ActorSnapshot['facing'];
  /** Patrol route in tile coordinates; static actors have a single point. */
  route: readonly { readonly tx: number; readonly ty: number }[];
  routeIndex: number;
  speedPxPerSecond: number;
}

const MAP_ROWS = [
  'TTTTTTTTTTTDDTTTTTTT',
  'T..................T',
  'T.,.....c.......r..T',
  'T..................T',
  'T...##########.....T',
  'T...#......c.#.....T',
  'T.D.#.,......#.....T',
  'T...#...c....#..r..T',
  'T...#........#.....T',
  'T...#...r....#.....T',
  'T...#,...#####.....T',
  'T...c..............T',
  'T.r....,,.......c..T',
  'T.........S........T',
  'T....c.............T',
  'T..#............r..T',
  'T..#..r....####....T',
  'T..####....#..#....T',
  'T..,...D...#.,#....T',
  'T..........#..#....T',
  'T..c....r..####.c..T',
  'T..................T',
  'T.,......c......r..T',
  'TTTTTTTTTTTTTTTTTTTT',
];

const LEGEND: Record<string, number> = {
  '.': 0, // floor
  ',': 1, // floor-alt
  '#': 2, // wall
  T: 3, // wall-top
  D: 4, // door
  S: 5, // stairs
  c: 6, // crack
  r: 7, // rubble
};

export function createDemoScene(): DemoScene {
  const mapHeightTiles = MAP_ROWS.length;
  const mapWidthTiles = MAP_ROWS[0].length;
  const tiles = MAP_ROWS.flatMap((row) => {
    if (row.length !== mapWidthTiles) {
      throw new Error(`demo map row length ${row.length} != ${mapWidthTiles}`);
    }
    return [...row].map((ch) => {
      const tile = LEGEND[ch];
      if (tile === undefined) throw new Error(`unknown demo map tile '${ch}'`);
      return tile;
    });
  });

  const actors: InternalActor[] = [
    {
      id: 'hero',
      kind: 'hero',
      x: 8 * TILE_SIZE + TILE_SIZE / 2,
      y: 12 * TILE_SIZE + TILE_SIZE / 2,
      facing: 1,
      animation: 'hero/idle',
      route: [{ tx: 8, ty: 12 }],
      routeIndex: 0,
      speedPxPerSecond: 0,
    },
    {
      id: 'slime-north',
      kind: 'monster',
      x: 5 * TILE_SIZE + TILE_SIZE / 2,
      y: 7 * TILE_SIZE + TILE_SIZE / 2,
      facing: 1,
      animation: 'slime/idle',
      route: [
        { tx: 5, ty: 7 },
        { tx: 9, ty: 7 },
        { tx: 9, ty: 9 },
        { tx: 5, ty: 9 },
      ],
      routeIndex: 0,
      speedPxPerSecond: 20,
    },
    {
      id: 'slime-south',
      kind: 'monster',
      x: 6 * TILE_SIZE + TILE_SIZE / 2,
      y: 21 * TILE_SIZE + TILE_SIZE / 2,
      facing: -1,
      animation: 'slime/idle',
      route: [
        { tx: 6, ty: 21 },
        { tx: 12, ty: 21 },
      ],
      routeIndex: 0,
      speedPxPerSecond: 12,
    },
  ];

  return {
    mapWidthTiles,
    mapHeightTiles,
    tiles,
    actors,
    cameraTargetActorId: 'hero',
    clockMs: 0,
  };
}

/** Advances the authoritative simulation. Returns the actual elapsed ms used. */
export function tickDemoScene(scene: DemoScene, dtMs: number): number {
  const dt = Math.max(0, Math.min(dtMs, 1000)) / 1000;
  scene.clockMs += dt * 1000;
  for (const actor of scene.actors) {
    if (actor.route.length < 2 || actor.speedPxPerSecond <= 0) continue;
    let remaining = actor.speedPxPerSecond * dt;
    while (remaining > 0.0001) {
      const target = actor.route[actor.routeIndex];
      const tx = target.tx * TILE_SIZE + TILE_SIZE / 2;
      const ty = target.ty * TILE_SIZE + TILE_SIZE / 2;
      const dx = tx - actor.x;
      const dy = ty - actor.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= remaining) {
        actor.x = tx;
        actor.y = ty;
        actor.routeIndex = (actor.routeIndex + 1) % actor.route.length;
        remaining -= dist;
        continue;
      }
      actor.x += (dx / dist) * remaining;
      actor.y += (dy / dist) * remaining;
      if (Math.abs(dx) > 0.001) actor.facing = dx > 0 ? 1 : -1;
      remaining = 0;
    }
  }
  return dt * 1000;
}

export function setCameraTarget(scene: DemoScene, actorId: string): void {
  if (!scene.actors.some((actor) => actor.id === actorId)) {
    throw new Error(`unknown camera target actor '${actorId}'`);
  }
  scene.cameraTargetActorId = actorId;
}

/** Immutable copy handed to presentation code. */
export function getSceneSnapshot(scene: DemoScene): SceneSnapshot {
  const actors: readonly ActorSnapshot[] = scene.actors.map(
    ({ id, kind, x, y, facing, animation }) => ({
      id,
      kind,
      x,
      y,
      facing,
      animation,
    }),
  );
  return Object.freeze({
    mapWidthTiles: scene.mapWidthTiles,
    mapHeightTiles: scene.mapHeightTiles,
    tiles: Object.freeze([...scene.tiles]),
    actors: Object.freeze(actors),
    cameraTargetActorId: scene.cameraTargetActorId,
  });
}
