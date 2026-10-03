import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { BattleSession } from '../../game/BattleSession';
import { hitTestBattleTarget } from '../../renderer/BattleTargeting';
import { worldToScreen } from '../../renderer/Camera';

describe('arena target hit testing', () => {
  it('keeps a 44px hit area at phone scale and follows zoom and pan', () => {
    const session = new BattleSession(loadGameContent());
    try {
      const enemy = session.getSnapshot().entities.find((entity) => entity.id === 'slime-1')!;
      for (const width of [240, 350, 560])
        for (const multiplier of [1, 1.4]) {
          const camera = { x: 17, y: 23, zoom: (width / 320) * multiplier };
          const center = worldToScreen({ x: enemy.x + 16, y: enemy.y + 16 }, camera);
          const half = Math.max(44, 32 * camera.zoom) / 2;
          expect(
            hitTestBattleTarget(
              { x: center.x + half - 1, y: center.y },
              session.getSnapshot().entities,
              ['slime-1'],
              camera,
            ),
          ).toBe('slime-1');
          expect(
            hitTestBattleTarget(
              { x: center.x + half + 1, y: center.y },
              session.getSnapshot().entities,
              ['slime-1'],
              camera,
            ),
          ).toBeUndefined();
        }
    } finally {
      session.dispose();
    }
  });

  it('chooses the nearest eligible center and ignores defeated, invalid and empty areas', () => {
    const session = new BattleSession(loadGameContent());
    try {
      const enemy = session.getSnapshot().entities.find((entity) => entity.id === 'slime-1')!;
      const entities = [
        { ...enemy, id: 'a', x: 0, y: 0 },
        { ...enemy, id: 'b', x: 32, y: 0 },
      ];
      const camera = { x: 0, y: 0, zoom: 0.75 };
      expect(hitTestBattleTarget({ x: 29, y: 12 }, entities, ['a', 'b'], camera)).toBe('b');
      expect(
        hitTestBattleTarget({ x: 23, y: 12 }, [...entities].reverse(), ['a', 'b'], camera),
      ).toBe('a');
      expect(hitTestBattleTarget({ x: 24, y: 12 }, entities, ['a', 'b'], camera)).toBe('a');
      expect(
        hitTestBattleTarget({ x: 36, y: 12 }, [{ ...entities[1], dead: true }], ['b'], camera),
      ).toBeUndefined();
      expect(
        hitTestBattleTarget({ x: 36, y: 12 }, [{ ...entities[1], health: 0 }], ['b'], camera),
      ).toBeUndefined();
      expect(hitTestBattleTarget({ x: 36, y: 12 }, entities, [], camera)).toBeUndefined();
      expect(hitTestBattleTarget({ x: 200, y: 200 }, entities, ['a', 'b'], camera)).toBeUndefined();
    } finally {
      session.dispose();
    }
  });
});
