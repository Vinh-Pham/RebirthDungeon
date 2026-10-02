import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { TitleSchema } from '../../data/schemas/titles';
import { createHero, heroStats, addItem, validateHero } from '../../engine/rpg/Character';
import { awardTitle, EncounterTitles, mergeTitleEncounter, previewTitle, reconcileTitles, recordTitleEvidence, selectTitle, titleState, unlockTitleCoupon } from '../../engine/rpg/Titles';
import { visibleTitles } from '../../ui/titles/titleLabels';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { JourneySession } from '../../game/JourneySession';

const content = loadGameContent();
function withTitles(extra: unknown[]) { return new ContentRegistry({ ...content.data, titles: [...content.data.titles, ...extra] }); }
function owned() { const hero = createHero(content); for (const t of content.data.titles) awardTitle(hero, t.id, 'test/earned', content); return hero; }

describe('title discovery and committed achievements', () => {
  it('separates discovery from ownership, and guardian victory from a successful exit', () => {
    const hero = createHero(content), before = heroStats(hero, content);
    expect(titleState(hero, 'first-delver')).toBe('Unknown');
    recordTitleEvidence(hero, 'entered/moss-depths'); reconcileTitles(hero, content, 'entry');
    expect(titleState(hero, 'first-delver')).toBe('Known'); expect(hero.earnedTitles).toEqual([]);
    expect(titleState(hero, 'guardian-breaker')).toBe('Unknown');
    recordTitleEvidence(hero, 'guardian/moss-depths/giant-black-spider'); reconcileTitles(hero, content, 'guardian');
    expect(titleState(hero, 'guardian-breaker')).toBe('Known');
    const attempt = new EncounterTitles('attempt-1', true);
    mergeTitleEncounter(hero, attempt.snapshot(), 'victory', 'generated-boss-map', content, { dungeonId: 'moss-depths', enemyId: 'giant-black-spider' });
    reconcileTitles(hero, content, 'encounter/1');
    expect(titleState(hero, 'guardian-breaker')).toBe('Earned'); expect(titleState(hero, 'first-delver')).toBe('Known');
    expect(hero.titleCollection.selected).toEqual({}); expect(heroStats(hero, content)).toEqual(before);
    recordTitleEvidence(hero, 'clear/moss-depths'); reconcileTitles(hero, content, 'exit');
    expect(hero.earnedTitles).toEqual(['first-delver', 'guardian-breaker']);
    expect(hero.titleCollection.evidence['encounter/generated-boss-map/victory']).toBeUndefined();
  });
  it('permits direct awards, explicit discovery-first, AND/OR conditions, and stable title order', () => {
    const registry = withTitles([
      { id: 'z-level', name: 'Level', description: 'Level milestone', slot: 'first', award: { kind: 'level', minimum: 2 } },
      { id: 'a-level', name: 'Level or skill', description: 'Direct award', slot: 'first', award: { kind: 'any', conditions: [{ kind: 'level', minimum: 2 }, { kind: 'skill', skillId: 'smash', rank: 'F' }] } },
      { id: 'discover-first', name: 'Patient', description: 'Discover first', slot: 'second', discoveryFirst: true, hint: { kind: 'level', minimum: 2 }, award: { kind: 'all', conditions: [{ kind: 'level', minimum: 2 }, { kind: 'attribute', attribute: 'strength', minimum: 50 }] } },
    ]);
    const hero = createHero(registry); hero.level = 2;
    expect(reconcileTitles(hero, registry, 'level/2')).toEqual(['a-level', 'z-level']);
    expect(titleState(hero, 'discover-first')).toBe('Known');
    expect(reconcileTitles(hero, registry, 'next-boundary')).toEqual(['discover-first']);
  });
  it('excludes title/gear bonuses from attribute achievements, including unlock loops', () => {
    const registry = withTitles([
      { id: 'int-source', name: 'Study', description: 'Study', slot: 'first', effects: [{ stat: 'intelligence', value: 100 }] },
      { id: 'int-threshold', name: 'Scholar', description: 'Progression only', slot: 'second', award: { kind: 'attribute', attribute: 'intelligence', minimum: 100 } },
    ]);
    let hero = createHero(registry); awardTitle(hero, 'int-source', 'test', registry); hero = selectTitle(hero, 'first', 'int-source', registry);
    expect(heroStats(hero, registry).effective.intelligence).toBeGreaterThan(100);
    expect(reconcileTitles(hero, registry, 'equipment')).toEqual([]);
    expect(hero.earnedTitles).not.toContain('int-threshold');
  });
  it('requires a completed eligible attempt, honors defeat rules, and drops damage evidence on restart', () => {
    const registry = withTitles([
      { id: 'participation', name: 'Practice', description: 'Completed practice', slot: 'first', award: { kind: 'encounter', mapId: 'chamber', minimum: 1, allowDefeat: true } },
      { id: 'winner', name: 'Winner', description: 'Victory only', slot: 'first', award: { kind: 'encounter', mapId: 'chamber', minimum: 1 } },
      { id: 'flawless', name: 'Flawless', description: 'No damage', slot: 'second', award: { kind: 'encounter', mapId: 'chamber', minimum: 1, flawless: true } },
    ]);
    const hero = createHero(registry), attempt = new EncounterTitles('first', true);
    attempt.damage('player', 4); expect(hero.titleCollection.evidence).toEqual({});
    expect(new EncounterTitles('first', true).snapshot().flawless).toBe(true);
    mergeTitleEncounter(hero, attempt.snapshot(), 'defeat', 'chamber', registry);
    expect(reconcileTitles(hero, registry, 'encounter/1')).toEqual(['participation']);
    mergeTitleEncounter(hero, attempt.snapshot(), 'victory', 'chamber', registry);
    expect(reconcileTitles(hero, registry, 'encounter/2')).toEqual(['winner']);
    mergeTitleEncounter(hero, new EncounterTitles('rp', false).snapshot(), 'victory', 'chamber', registry);
    expect(hero.titleCollection.evidence['encounter/chamber/victory']).toBe(1);
    mergeTitleEncounter(hero, new EncounterTitles('clean', true).snapshot(), 'victory', 'chamber', registry);
    expect(reconcileTitles(hero, registry, 'encounter/3')).toEqual(['flawless']);
  });
});

describe('title selection and stat sources', () => {
  it('combines both slots, applies penalties, previews exact pools, and removes each source independently', () => {
    let hero = owned(); const before = heroStats(hero, content);
    hero = selectTitle(hero, 'first', 'guardian-breaker', content);
    expect(heroStats(hero, content).maxMana).toBe(before.maxMana - 5); expect(hero.mana).toBe(before.maxMana - 5);
    expect(heroStats(hero, content).combatant.minDamage).toBe(before.combatant.minDamage! + 3);
    expect(heroStats(hero, content).combatant.magicAttack).toBe(before.combatant.magicAttack);
    const preview = previewTitle(hero, 'second', 'lantern-companion', content);
    expect(preview.after.maxHealth).toBe(before.maxHealth + 5); expect(preview.pools.health).toBe(before.maxHealth);
    hero = selectTitle(hero, 'second', 'lantern-companion', content);
    hero = selectTitle(hero, 'first', 'first-delver', content);
    expect(heroStats(hero, content).maxHealth).toBe(before.maxHealth + 15); expect(hero.mana).toBe(before.maxMana - 5);
    hero.health = before.maxHealth + 15; hero.wounds = 0;
    hero = selectTitle(hero, 'first', undefined, content);
    expect(heroStats(hero, content).maxHealth).toBe(before.maxHealth + 5); expect(hero.health).toBe(before.maxHealth + 5);
    hero = selectTitle(hero, 'second', undefined, content);
    expect(heroStats(hero, content)).toEqual(before); expect(hero.health).toBe(before.maxHealth); expect(hero.mana).toBe(before.maxMana - 5);
    expect(hero.ap).toBe(0); expect(hero.gold).toBe(0);
  });
  it('derives attributes once and clamps wounds and all pools without healing on repeated swaps', () => {
    const registry = withTitles([{ id: 'tough', name: 'Tough', description: 'Attribute and direct effects', slot: 'first', effects: [{ stat: 'strength', value: 30 }, { stat: 'maxHealth', value: -110 }, { stat: 'maxMana', value: -150 }, { stat: 'maxStamina', value: -150 }, { stat: 'protection', value: 10 }] }]);
    let hero = createHero(registry); awardTitle(hero, 'tough', 'test', registry); hero.wounds = 100; hero.health = 10;
    const before = heroStats(hero, registry); hero = selectTitle(hero, 'first', 'tough', registry);
    const after = heroStats(hero, registry);
    expect(after.combatant.minDamage! - before.combatant.minDamage!).toBe(10);
    expect(after.combatant.protection).toBe(10); expect(after.attributeSources.titles.strength).toBe(30);
    expect(hero).toMatchObject({ health: 1, wounds: 7, mana: 0, stamina: 0 });
    hero = selectTitle(hero, 'first', undefined, registry); hero = selectTitle(hero, 'first', 'tough', registry);
    expect(hero).toMatchObject({ health: 1, wounds: 7, mana: 0, stamina: 0 }); validateHero(hero, registry);
  });
  it('rejects wrong slots, known ownership, and unsupported eligibility, without changing the original', () => {
    const hero = owned(), original = structuredClone(hero);
    expect(() => selectTitle(hero, 'second', 'guardian-breaker', content)).toThrow('First');
    expect(() => selectTitle(createHero(content), 'first', 'first-delver', content)).toThrow('Earn');
    const registry = withTitles([{ id: 'rank-e', name: 'Practiced', description: 'Requires Rank E', slot: 'first', eligibility: { skillId: 'smash', rank: 'E' }, effects: [{ stat: 'physicalAttack', value: 10 }] }]);
    const learner = createHero(registry); awardTitle(learner, 'rank-e', 'test', registry);
    expect(() => selectTitle(learner, 'first', 'rank-e', registry)).toThrow('eligible');
    expect(hero).toEqual(original);
  });
  it('retains achievement ownership after future growth changes and clears an ineligible selection at a saved boundary', () => {
    const registry = withTitles([{ id: 'rank-e', name: 'Practiced', description: 'Requires Rank E', slot: 'first', eligibility: { skillId: 'smash', rank: 'E' }, effects: [{ stat: 'maxHealth', value: 10 }] }]);
    let hero = createHero(registry); hero.learnedSkills.smash = { rank: 'E', objectiveCounts: {} }; awardTitle(hero, 'rank-e', 'test', registry);
    hero = selectTitle(hero, 'first', 'rank-e', registry);
    hero.learnedSkills.smash.rank = 'F'; hero.level = 1; hero.growthTalent = 'mage';
    reconcileTitles(hero, registry, 'reset');
    expect(hero.titleCollection.selected.first).toBeUndefined(); expect(hero.earnedTitles).toEqual(['rank-e']);
    hero.learnedSkills.smash.rank = 'E'; expect(() => selectTitle(hero, 'first', 'rank-e', registry)).not.toThrow();
  });
  it('redeems exactly one coupon without costs or automatic selection; duplicates and noncoupons stay untouched', () => {
    const hero = createHero(content); addItem(hero, 'lantern-title-coupon', 2, content);
    const before = structuredClone(hero), earned = unlockTitleCoupon(hero, 'lantern-title-coupon', content);
    expect(hero).toEqual(before); expect(earned.inventory['lantern-title-coupon']).toBe(1);
    expect(earned.earnedTitles).toEqual(['lantern-companion']); expect(earned.titleCollection.selected).toEqual({});
    expect(earned.titleCollection.records['lantern-companion'].source).toBe('coupon/lantern-title-coupon/once');
    expect(() => unlockTitleCoupon(earned, 'lantern-title-coupon', content)).toThrow('already earned');
    expect(() => unlockTitleCoupon(hero, 'potion', content)).toThrow('Invalid');
    expect(heroStats(earned, content)).toEqual(heroStats(hero, content));
  });
});

describe('title data, spoiler policy and migrations', () => {
  it('never searches unknown names/descriptions and keeps hidden definitions out of the list', () => {
    const hero = createHero(content);
    expect(visibleTitles(hero, content.data.titles, 'guardian', 'all', 'all')).toEqual([]);
    expect(visibleTitles(hero, content.data.titles, '', 'first', 'all')).toEqual([]);
    recordTitleEvidence(hero, 'guardian/moss-depths/giant-black-spider'); reconcileTitles(hero, content, 'entry');
    expect(visibleTitles(hero, content.data.titles, 'guardian', 'first', 'Combat')).toHaveLength(1);
    const hidden = TitleSchema.parse({ id: 'hidden', name: 'Secret', description: 'Hidden', slot: 'first', spoiler: 'hidden' });
    expect(visibleTitles(hero, [hidden], '', 'all', 'all')).toEqual([]);
  });
  it('validates stable references, typed flat effects, eligibility and unsupported mastery', () => {
    for (const change of [
      { effects: [{ stat: 'speed', value: 1 }] }, { effects: [{ stat: 'maxHealth', value: 1.5 }] },
      { award: { kind: 'clearDungeon', dungeonId: 'missing' } }, { award: { kind: 'bossVictory', dungeonId: 'moss-depths', enemyId: 'slime' } },
      { hint: { kind: 'questKnown', questId: 'missing' } }, { eligibility: { skillId: 'smash', rank: '1' } }, { category: 'Master' },
    ]) expect(() => withTitles([{ id: 'invalid', name: 'Invalid', description: 'Invalid', slot: 'first', ...change }])).toThrow();
  });
  it('migrates v8 ownership without refills or losing enchants, and preserves unavailable earned selections', () => {
    const session = new JourneySession(content); const state = session.toSave(); session.dispose();
    state.hero = owned(); state.hero.health = 5; state.hero.mana = 3; state.hero.stamina = 2;
    const { titleCollection, ...oldHero } = state.hero; void titleCollection;
    const migrated = parseSave({ version: 8, savedAt: new Date().toISOString(), campaign: { ...state, hero: oldHero } }, content);
    expect(migrated.version).toBe(9); expect(migrated.campaign.hero).toMatchObject({ health: 5, mana: 3, stamina: 2, earnedTitles: state.hero.earnedTitles, titleCollection: { selected: {}, records: { 'first-delver': { source: 'legacy/ownership' } } } });
    state.hero = selectTitle(owned(), 'first', 'first-delver', content); state.hero.health = 128;
    const retired = new ContentRegistry({ ...content.data, titles: content.data.titles.filter((t) => t.id !== 'first-delver') });
    const restored = parseSave(JSON.parse(encodeSave(state, content)), retired).campaign.hero;
    expect(restored.titleCollection.selected.first).toBe('first-delver'); expect(restored.earnedTitles).toContain('first-delver');
    expect(heroStats(restored, retired).maxHealth).toBe(118); expect(restored.health).toBe(118);
    expect(() => selectTitle(restored, 'first', 'first-delver', retired)).toThrow('unavailable');
    expect(parseSave(JSON.parse(encodeSave({ ...state, hero: restored }, retired)), retired).campaign.hero).toEqual(restored);
  });
});
