import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  applyDamage,
  calculateDamage,
  calculateHitChance,
  createGameRandom,
  createHealth,
  resolveAttack,
  rollCritical,
  rollHit,
  validateCombatStats,
  type Entity,
} from '../../engine';

function fighter(id: string): Entity {
  return { id, health: createHealth(30), combatant: { attack: 12, defense: 4, speed: 5 } };
}

describe('health and damage', () => {
  it('normalizes explicit health creation and clamps overkill to actual HP lost', () => {
    expect(createHealth(10, 20)).toEqual({ current: 10, max: 10 });
    expect(createHealth(10, -2)).toEqual({ current: 0, max: 10 });
    const health = createHealth(10);
    expect(applyDamage(health, 40)).toBe(10);
    expect(applyDamage(health, 40)).toBe(0);
    expect(health.current).toBe(0);
    expect(calculateDamage({ attack: 12, defense: 4 })).toBe(8);
    expect(calculateDamage({ attack: 12, defense: 4, critical: true })).toBe(12);
    expect(calculateDamage({ attack: 3, defense: 50 })).toBe(1);
    expect(calculateDamage({ attack: 5, defense: 0, critical: true })).toBe(7);
  });

  it('maintains health bounds and finite positive damage across generated inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: -10000, max: 20000 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.boolean(),
        (max, current, attack, defense, critical) => {
          const health = createHealth(max, current);
          const before = health.current;
          const damage = calculateDamage({ attack, defense, critical });
          const amount = applyDamage(health, damage);
          expect(Number.isSafeInteger(damage)).toBe(true);
          expect(damage).toBeGreaterThanOrEqual(1);
          expect(amount).toBe(before - health.current);
          expect(health.current).toBeGreaterThanOrEqual(0);
          expect(health.current).toBeLessThanOrEqual(max);
        },
      ),
      { seed: 20260929, numRuns: 200 },
    );
  });

  it('rejects invalid health, stats, and overflowing damage', () => {
    for (const value of [0, -1, 1.5, NaN, Infinity])
      expect(() => createHealth(value)).toThrow(RangeError);
    expect(() => applyDamage({ current: -1, max: 10 }, 1)).toThrow(RangeError);
    expect(() => applyDamage({ current: 11, max: 10 }, 1)).toThrow(RangeError);
    expect(() => applyDamage(createHealth(10), -1)).toThrow(RangeError);
    for (const value of [-1, 0.5, NaN, Infinity]) {
      expect(() => validateCombatStats({ attack: value, defense: 0, speed: 0 })).toThrow(
        RangeError,
      );
    }
    expect(() =>
      calculateDamage({ attack: Number.MAX_SAFE_INTEGER, defense: 0, critical: true }),
    ).toThrow(RangeError);
  });
});

describe('attack resolution', () => {
  it('rolls hit then critical, returns a pure result, and respects evasion', () => {
    const attacker = fighter('player');
    const target = fighter('slime');
    target.combatant!.evasion = 0.2;
    const chance = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(true);
    const random = { ...createGameRandom(1), chance };
    const original = structuredClone([attacker, target]);
    expect(resolveAttack({ attacker, target, random })).toEqual({
      hit: true,
      critical: true,
      damage: 12,
    });
    expect(chance.mock.calls).toEqual([[0.75], [0.1]]);
    expect([attacker, target]).toEqual(original);
    expect(calculateHitChance(0.2, 0.8)).toBe(0);
  });

  it('does not roll critical chance on a miss', () => {
    const chance = vi.fn().mockReturnValue(false);
    expect(
      resolveAttack({
        attacker: fighter('a'),
        target: fighter('b'),
        random: { ...createGameRandom(1), chance },
      }),
    ).toEqual({ hit: false, critical: false, damage: 0 });
    expect(chance).toHaveBeenCalledOnce();
  });

  it('validates every rule before randomness and rejects dead units and self-targeting', () => {
    const chance = vi.fn();
    const random = { ...createGameRandom(1), chance };
    const invalid = [
      { ...fighter('b'), health: undefined },
      { ...fighter('b'), health: { current: 0, max: 30 } },
      { ...fighter('b'), dead: true as const },
      { ...fighter('b'), combatant: { attack: 1, defense: 0, speed: 0, evasion: 2 } },
    ];
    for (const target of invalid)
      expect(() => resolveAttack({ attacker: fighter('a'), target, random })).toThrow();
    expect(() => resolveAttack({ attacker: fighter('a'), target: fighter('a'), random })).toThrow(
      'self',
    );
    const attacker = fighter('a');
    attacker.combatant!.attack = Number.MAX_SAFE_INTEGER;
    expect(() => resolveAttack({ attacker, target: fighter('b'), random })).toThrow('safe integer');
    expect(chance).not.toHaveBeenCalled();
    for (const value of [-1, 2, NaN, Infinity]) {
      expect(() => calculateHitChance(value)).toThrow(RangeError);
      expect(() => rollHit(random, value)).toThrow(RangeError);
      expect(() => rollCritical(random, value)).toThrow(RangeError);
    }
  });
});
