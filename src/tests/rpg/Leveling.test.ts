import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { createHero, grantExperience, heroStats, validateHero } from '../../engine/rpg/Character';
import { experienceToNextLevel, MAX_LEVEL } from '../../engine/rpg/Leveling';

const content = loadGameContent();

describe('normal XP chart and lifetime progression', () => {
  it.each([[1, 400], [2, 700], [50, 83000], [99, 765900], [100, 249000], [101, 264000], [199, 6825000], [200, 0]])('uses the wiki chart at level %i with %i XP', (level, xp) => {
    expect(experienceToNextLevel(level)).toBe(xp);
  });
  it('reaches every level at its exact threshold and stops at the wiki total of 279,988,500 XP', () => {
    const hero = createHero(content, 'mage');
    let total = 0;
    for (let level = 1; level < MAX_LEVEL; level++) {
      const threshold = experienceToNextLevel(level);
      grantExperience(hero, threshold - 1, content);
      expect(hero.level).toBe(level);
      grantExperience(hero, 1, content);
      expect(hero).toMatchObject({ level: level + 1, cumulativeLevel: level + 1, ap: 5 + level, experience: 0 });
      total += threshold;
      expect(validateHero(hero, content)).toEqual(hero);
    }
    expect(total).toBe(279988500);
    expect(heroStats(hero, content).attributeSources.levels.intelligence).toBe(99.5);
  });
  it('crosses the lower level-100 threshold once and preserves the correct remainder and lifetime count', () => {
    const hero = createHero(content);
    Object.assign(hero, { level: 99, cumulativeLevel: 500, experience: 765899 });
    grantExperience(hero, 249002, content);
    expect(hero).toMatchObject({ level: 101, cumulativeLevel: 502, ap: 7, experience: 1 });
  });
  it('rejects invalid chart inputs, XP boundaries and lifetime overflow without spending rewards', () => {
    for (const level of [0, 201, 1.5, NaN, Infinity]) expect(() => experienceToNextLevel(level)).toThrow();
    const hero = createHero(content);
    for (const change of [{ level: 201 }, { cumulativeLevel: 0 }, { level: 2, cumulativeLevel: 1 }, { experience: 400 }, { level: 200, cumulativeLevel: 200, experience: 1 }]) {
      expect(() => validateHero({ ...hero, ...change }, content)).toThrow();
    }
    hero.cumulativeLevel = Number.MAX_SAFE_INTEGER;
    grantExperience(hero, 399, content);
    const before = structuredClone(hero);
    expect(() => grantExperience(hero, 1, content)).toThrow('Cumulative');
    expect(hero).toEqual(before);
  });
});
