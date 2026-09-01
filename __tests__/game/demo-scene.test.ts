import {
  createDemoScene,
  getSceneSnapshot,
  setCameraTarget,
  tickDemoScene,
} from '@/game/scene/demo-scene';
import { TILE_SIZE } from '@/game/config';

describe('createDemoScene', () => {
  it('builds the room and actors', () => {
    const scene = createDemoScene();
    expect(scene.mapWidthTiles).toBe(20);
    expect(scene.mapHeightTiles).toBe(24);
    expect(scene.tiles).toHaveLength(20 * 24);
    expect(scene.actors.map((actor) => actor.id)).toEqual([
      'hero',
      'slime-north',
      'slime-south',
    ]);
    expect(scene.cameraTargetActorId).toBe('hero');
  });
});

describe('tickDemoScene', () => {
  it('moves patrolling actors toward their waypoint at the configured speed', () => {
    const scene = createDemoScene();
    const slime = scene.actors.find((actor) => actor.id === 'slime-north');
    if (!slime) throw new Error('slime missing');
    const startX = slime.x;

    const used = tickDemoScene(scene, 100);
    expect(used).toBe(100);
    // 20 px/s for 0.1s → 2px, straight toward a waypoint to the right
    expect(slime.x).toBeCloseTo(startX + 2, 5);
    expect(slime.facing).toBe(1);
  });

  it('flips facing when heading left', () => {
    const scene = createDemoScene();
    const slime = scene.actors.find((actor) => actor.id === 'slime-north');
    if (!slime) throw new Error('slime missing');
    let sawLeft = false;
    for (let i = 0; i < 800 && !sawLeft; i++) {
      tickDemoScene(scene, 100);
      if (slime.facing === -1) sawLeft = true;
    }
    expect(sawLeft).toBe(true);
  });

  it('cycles through waypoints and keeps positions on the route', () => {
    const scene = createDemoScene();
    const slime = scene.actors.find((actor) => actor.id === 'slime-north');
    if (!slime) throw new Error('slime missing');
    const centers = slime.route.map(({ tx, ty }) => ({
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
    }));
    for (let i = 0; i < 800; i++) tickDemoScene(scene, 100);
    // after a long run the slime is near one of its waypoint centers
    const near = centers.some(
      (center) =>
        Math.hypot(center.x - slime.x, center.y - slime.y) < TILE_SIZE,
    );
    expect(near).toBe(true);
  });

  it('leaves static actors in place', () => {
    const scene = createDemoScene();
    const hero = scene.actors.find((actor) => actor.id === 'hero');
    if (!hero) throw new Error('hero missing');
    const { x, y } = hero;
    for (let i = 0; i < 10; i++) tickDemoScene(scene, 100);
    expect(hero.x).toBe(x);
    expect(hero.y).toBe(y);
  });
});

describe('setCameraTarget', () => {
  it('rejects unknown actors', () => {
    const scene = createDemoScene();
    expect(() => setCameraTarget(scene, 'dragon')).toThrow(
      "unknown camera target actor 'dragon'",
    );
  });

  it('accepts known actors', () => {
    const scene = createDemoScene();
    setCameraTarget(scene, 'slime-south');
    expect(scene.cameraTargetActorId).toBe('slime-south');
  });
});

describe('getSceneSnapshot', () => {
  it('returns a frozen snapshot independent from later simulation changes', () => {
    const scene = createDemoScene();
    const snapshot = getSceneSnapshot(scene);
    const slime = snapshot.actors.find((actor) => actor.id === 'slime-north');
    if (!slime) throw new Error('slime missing');

    tickDemoScene(scene, 100);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.tiles)).toBe(true);
    expect(snapshot.actors.find((actor) => actor.id === 'slime-north')?.x).toBe(
      slime.x,
    );
  });
});
