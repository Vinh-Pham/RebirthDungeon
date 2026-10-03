import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import {
  createHero,
  experienceToNextLevel,
  grantExperience,
  heroStats,
  validateHero,
} from '../../engine/rpg/Character';
import { TALENTS } from '../../engine/rpg/Stats';

const content = loadGameContent();

describe('earned character progression', () => {
  it.each(TALENTS)(
    'crosses exact XP thresholds, retains fractions and restores %s resources only on an earned level',
    (talent) => {
      const hero = createHero(content, talent);
      Object.assign(hero, { health: 20, mana: 4, stamina: 9, wounds: 10, fullness: 60 });
      const before = structuredClone(hero);
      grantExperience(hero, 399, content);
      expect(hero).toEqual({ ...before, experience: 399 });
      grantExperience(hero, 706, content);
      const stats = heroStats(hero, content);
      const attribute =
        talent === 'warrior' ? 'strength' : talent === 'mage' ? 'intelligence' : 'dexterity';
      expect(hero).toMatchObject({
        level: 3,
        cumulativeLevel: 3,
        experience: 5,
        ap: 7,
        health: stats.maxHealth,
        mana: stats.maxMana,
        stamina: stats.maxStamina,
        wounds: 0,
        fullness: 100,
      });
      expect(experienceToNextLevel(hero.level)).toBe(1000);
      expect(stats.base[attribute]).toBe(heroStats(before, content).base[attribute] + 1);
      expect(validateHero(hero, content)).toEqual(hero);
      const settled = structuredClone(hero);
      grantExperience(hero, 0, content);
      expect(hero).toEqual(settled);
    },
  );

  it('caps at level 200, discards excess XP and awards AP only for the final earned level', () => {
    const hero = createHero(content);
    hero.level = 199;
    hero.cumulativeLevel = 999;
    hero.experience = 6824999;
    hero.ap = 7;
    grantExperience(hero, 1000000, content);
    expect(hero).toMatchObject({ level: 200, cumulativeLevel: 1000, experience: 0, ap: 8 });
    Object.assign(hero, { health: 20, mana: 4, stamina: 9, wounds: 10, fullness: 60 });
    const before = structuredClone(hero);
    grantExperience(hero, 1000000, content);
    expect(hero).toEqual(before);
    expect(validateHero(hero, content)).toEqual(hero);
  });

  it('preserves an odd half-point talent level across validation and rejects invalid rewards without mutation', () => {
    const hero = createHero(content, 'archery');
    grantExperience(hero, 400, content);
    expect(heroStats(validateHero(hero, content), content).base.dexterity).toBe(68.5);
    const before = structuredClone(hero);
    for (const amount of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => grantExperience(hero, amount, content)).toThrow('Invalid experience');
      expect(hero).toEqual(before);
    }
  });
});
