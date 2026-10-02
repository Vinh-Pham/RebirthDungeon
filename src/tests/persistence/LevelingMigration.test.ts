import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { grantExperience, validateHero } from '../../engine/rpg/Character';

const content = loadGameContent();
function oldSave(level: number, experience: number) {
  const session = new JourneySession(content);
  const campaign = session.toSave();
  session.dispose();
  const { cumulativeLevel, itemHotbar, ...hero } = campaign.hero;
  void cumulativeLevel;
  void itemHotbar;
  Object.assign(hero, {
    level,
    experience,
    ap: 17,
    health: 30,
    mana: 2,
    stamina: 4,
    wounds: 10,
    fullness: 60,
  });
  return { version: 9, savedAt: '2026-10-02T12:00:00.000Z', campaign: { ...campaign, hero } };
}
describe('level-200 save migration', () => {
  it.each([
    [1, 10, 200],
    [2, 20, 350],
    [98, 1959, 740921],
    [99, 0, 0],
  ])('preserves level %i and converts %i old XP to %i new XP once', (level, oldXP, newXP) => {
    const old = oldSave(level, oldXP),
      migrated = parseSave(old, content);
    expect(migrated.version).toBe(11);
    expect(migrated.campaign.hero).toEqual({
      ...old.campaign.hero,
      cumulativeLevel: level,
      itemHotbar: [],
      experience: newXP,
    });
    expect(
      parseSave(JSON.parse(encodeSave(migrated.campaign, content, migrated.savedAt)), content),
    ).toEqual(migrated);
  });
  it('allows previously capped characters to earn new levels and AP', () => {
    const hero = parseSave(oldSave(99, 0), content).campaign.hero;
    grantExperience(hero, 765900, content);
    expect(hero).toMatchObject({ level: 100, cumulativeLevel: 100, ap: 18, experience: 0 });
  });
  it('round-trips partial XP above the former one-million-point storage ceiling', () => {
    const migrated = parseSave(oldSave(99, 0), content);
    Object.assign(migrated.campaign.hero, {
      level: 199,
      cumulativeLevel: 199,
      experience: 6824999,
    });
    expect(
      parseSave(JSON.parse(encodeSave(migrated.campaign, content, migrated.savedAt)), content),
    ).toEqual(migrated);
    expect(validateHero(migrated.campaign.hero, content)).toEqual(migrated.campaign.hero);
  });
  it('rejects invalid historical XP and does not reinterpret current-version saves', () => {
    for (const [level, xp] of [
      [1, 20],
      [98, 1960],
      [99, 1],
    ])
      expect(() => parseSave(oldSave(level, xp), content)).toThrow();
    const migrated = parseSave(oldSave(1, 10), content);
    expect(parseSave(migrated, content).campaign.hero.experience).toBe(200);
    expect(() => parseSave({ ...oldSave(1, 10), campaign: migrated.campaign }, content)).toThrow();
  });
});
