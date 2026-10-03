import { afterEach, describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { immutableData, produceState } from '../../engine/immutableState';
import { createHero, heroStats, MAX_LEVEL } from '../../engine/rpg/Character';
import { BattleSession } from '../../game/BattleSession';
import { characterExperience, characterReview } from '../../ui/shared/characterStatus';

const content = loadGameContent();
const battles: BattleSession[] = [];
afterEach(() => battles.splice(0).forEach((battle) => battle.dispose()));

describe('shared character status', () => {
  it('observes depleted, frozen campaign resources without recovering or modifying them', () => {
    const hero = immutableData({
      ...createHero(content),
      health: 77,
      mana: 68,
      stamina: 71,
      wounds: 4,
      fullness: 80,
    });
    const before = structuredClone(hero);
    const review = characterReview(hero, content);
    expect(review).toMatchObject({ health: 77, mana: 68, stamina: 71, wounds: 4, fullness: 80 });
    expect(review.stats).toEqual(heroStats(hero, content));
    expect(hero).toEqual(before);
    expect(Object.isFrozen(hero)).toBe(true);
  });

  it('prefers live encounter resources while keeping XP, checkpoint resources, and RNG isolated', () => {
    const hero = immutableData({
      ...createHero(content),
      health: 77,
      mana: 68,
      stamina: 71,
      level: 7,
      experience: 657,
    });
    const checkpoint = structuredClone(hero);
    const battle = new BattleSession(content, 12345, 'chamber', hero);
    battles.push(battle);
    battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'firebolt' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    battle.dispatch({ type: 'CONFIRM_ACTION' });
    const snapshot = battle.getSnapshot();
    const random = battle.engine.random.snapshot();
    expect(snapshot.character!.mana).toBeLessThan(hero.mana);
    for (let i = 0; i < 5; i++) {
      expect(characterReview(hero, content, [], snapshot.character)).toBe(snapshot.character);
      expect(characterExperience(hero)).toMatchObject({ value: 657, max: 2000 });
    }
    expect(battle.getSnapshot()).toBe(snapshot);
    expect(battle.engine.random.snapshot()).toEqual(random);
    expect(hero).toEqual(checkpoint);
  });

  it('uses the replacement campaign after an encounter or load without altering old observations', () => {
    const before = immutableData({ ...createHero(content), health: 40, mana: 20 });
    const oldReview = characterReview(before, content);
    const replacement = produceState(before, (draft) => {
      draft.health = 15;
      draft.mana = 8;
      draft.experience = 24;
    });
    expect(characterReview(replacement, content)).toMatchObject({ health: 15, mana: 8 });
    expect(characterExperience(replacement)).toMatchObject({ value: 24, max: 400 });
    expect(oldReview).toMatchObject({ health: 40, mana: 20 });
    expect(before).toMatchObject({ health: 40, mana: 20, experience: 0 });
  });
});

describe('footer experience', () => {
  it.each([
    [1, 400],
    [7, 2000],
    [99, 765900],
    [100, 249000],
    [199, 6825000],
  ])('uses the engine threshold at level %i', (level, max) => {
    expect(characterExperience({ level, experience: max / 2 })).toEqual({
      value: max / 2,
      max,
      text: '50.0%',
      accessibleText: `${max / 2} of ${max} XP`,
    });
  });
  it('shows a filled maximum-level track instead of dividing by the zero cap threshold', () => {
    expect(characterExperience({ level: MAX_LEVEL, experience: 0 })).toEqual({
      value: 1,
      max: 1,
      text: 'Maximum level',
      accessibleText: 'Maximum level',
    });
  });
});
