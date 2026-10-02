import { versionSevenHero } from '../persistence/legacyFixture';
import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { addItem, createHero, grantExperience, heroStats, validateHero } from '../../engine/rpg/Character';
import { EncounterTraining, insertSkillPage, learnSkill, rankUpSkill, readSkillBook, trainingPoints, type ActionOutcome } from '../../engine/rpg/Skills';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { JourneySession } from '../../game/JourneySession';
const content = loadGameContent();
const outcome = (actionId: number, override: Partial<ActionOutcome> = {}): ActionOutcome => ({
  encounterId: 'authored', actionId, sourceId: 'player', skillId: 'smash', rank: 'F', action: 'skill', origin: 'direct', tags: ['melee', 'sword'],
  targets: [{ targetId: 'slime', hostile: true, hit: true, critical: false, damage: 10, healing: 0, defeated: true }], ...override,
});
describe('learned ranks and acquisition', () => {
  it('grants explicit starter ownership once and derives stats without refilling on learning or rank-up', () => {
    let hero = createHero(content);
    expect(Object.keys(hero.learnedSkills)).toEqual(content.data.classes[0].skills);
    expect(heroStats(hero, content).base.intelligence).toBe(52);
    hero.health = 30; hero.mana = 2; hero.stamina = 3;
    hero = learnSkill(hero, 'combat-mastery', content);
    expect(heroStats(hero, content).maxHealth).toBe(128);
    expect(heroStats(hero, content).combatant.minDamage).toBe(22);
    hero.ap = 3; hero.learnedSkills['combat-mastery'].objectiveCounts = { uses: 20, hits: 10, defeats: 1 };
    hero = rankUpSkill(hero, 'combat-mastery', content);
    expect(heroStats(hero, content).maxHealth).toBe(130);
    expect(heroStats(hero, content).combatant.minDamage).toBe(23);
    expect(hero).toMatchObject({ health: 30, mana: 2, stamina: 3, ap: 0, learnedSkills: { 'combat-mastery': { rank: 'E', objectiveCounts: {} } } });
    expect(() => rankUpSkill(hero, 'combat-mastery', content)).toThrow('Prototype cap: E');
  });
  it('reads a complete book once; duplicate and unsupported learning consumes nothing', () => {
    const original = createHero(content); addItem(original, 'combat-manual', 2, content);
    const learned = readSkillBook(original, 'combat-manual', content);
    learned.learnedSkills['combat-mastery'].objectiveCounts.uses = 4;
    expect(learned.inventory['combat-manual']).toBe(1); expect(learned.ap).toBe(0);
    const before = structuredClone(learned);
    expect(() => readSkillBook(learned, 'combat-manual', content)).toThrow('already'); expect(learned).toEqual(before);
    expect(() => learnSkill(original, 'blacksmithing', content)).toThrow('Not implemented');
    expect(original.inventory['combat-manual']).toBe(2); expect(original.learnedSkills['combat-mastery']).toBeUndefined();
  });
  it.each([[1, 2, 3], [3, 1, 2], [2, 3, 1]])('assembles distinct pages in order %j and reads exactly one manual', (...order) => {
    let hero = createHero(content); addItem(hero, 'sword-manual-unfinished', 1, content);
    for (const page of order) addItem(hero, `sword-page-${page}`, 1, content);
    for (const page of order) hero = insertSkillPage(hero, 'sword-manual', `sword-page-${page}`, content);
    expect(hero.inventory['sword-manual-unfinished']).toBeUndefined(); expect(hero.inventory['sword-manual']).toBe(1);
    expect(hero.bookCollections['sword-manual'].completed).toBe(true);
    hero = readSkillBook(hero, 'sword-manual', content); expect(hero.learnedSkills['sword-mastery']).toEqual({ rank: 'F', objectiveCounts: {} });
    expect(() => addItem(hero, 'sword-manual-unfinished', 1, content)).toThrow();
  });
  it('rejects wrong, duplicate, missing, overfull and unbound pages without mutation', () => {
    let hero = createHero(content); addItem(hero, 'sword-page-1', 2, content);
    expect(() => insertSkillPage(hero, 'sword-manual', 'sword-page-1', content)).toThrow();
    addItem(hero, 'sword-manual-unfinished', 1, content);
    expect(() => addItem(hero, 'sword-manual-unfinished', 1, content)).toThrow();
    hero = insertSkillPage(hero, 'sword-manual', 'sword-page-1', content);
    const before = structuredClone(hero);
    for (const page of ['sword-page-1', 'sword-page-2', 'potion']) expect(() => insertSkillPage(hero, 'sword-manual', page, content)).toThrow();
    expect(hero).toEqual(before);
    addItem(hero, 'sword-page-2', 1, content); addItem(hero, 'sword-page-3', 1, content);
    hero = insertSkillPage(hero, 'sword-manual', 'sword-page-2', content); hero.inventory['sword-manual'] = 999;
    const full = structuredClone(hero);
    expect(() => insertSkillPage(hero, 'sword-manual', 'sword-page-3', content)).toThrow('full'); expect(hero).toEqual(full);
  });
  it.each([[99, 10, false], [100, 2, false], [100, 3, true], [120, 5, true]])('gates %i training and %i AP', (points, ap, succeeds) => {
    const hero = learnSkill(createHero(content), 'sword-mastery', content); hero.ap = ap;
    hero.learnedSkills['sword-mastery'].objectiveCounts = points === 99 ? { hits: 13, defeats: 6 } : points === 120 ? { hits: 20, defeats: 6 } : { hits: 20, defeats: 4 };
    const before = structuredClone(hero); expect(trainingPoints(content.skill('sword-mastery'), hero.learnedSkills['sword-mastery'])).toBe(points);
    if (succeeds) expect(rankUpSkill(hero, 'sword-mastery', content)).toMatchObject({ ap: ap - 3, learnedSkills: { 'sword-mastery': { rank: 'E', objectiveCounts: {} } } });
    else expect(() => rankUpSkill(hero, 'sword-mastery', content)).toThrow();
    expect(hero).toEqual(before);
  });
  it('awards every gained level one AP and never awards AP for importing levels', () => {
    const hero = createHero(content); grantExperience(hero, 120, content);
    expect(hero).toMatchObject({ level: 4, experience: 0, ap: 3 });
    const journey = new JourneySession(content); const state = journey.toSave(); journey.dispose(); state.hero.level = 5; state.hero.health = 17; state.hero.mana = 4; state.hero.stamina = 9;
    const { ap, learnedSkills, discoveredSkills, bookCollections, claimedMilestones, quests, earnedTitles, questFlags, trackedObjectives, ...legacy } = versionSevenHero(state.hero);
    void ap; void learnedSkills; void discoveredSkills; void bookCollections; void claimedMilestones; void quests; void earnedTitles; void questFlags; void trackedObjectives;
    const migrated = parseSave({ version: 5, savedAt: new Date().toISOString(), campaign: { ...state, hero: legacy } }, content);
    expect(migrated.version).toBe(9); expect(migrated.campaign.hero).toMatchObject({ ap: 0, level: 5, health: 17, mana: 4, stamina: 9 });
    expect(heroStats(migrated.campaign.hero, content).base.intelligence).toBe(52);
    expect(parseSave(JSON.parse(encodeSave(migrated.campaign, content)), content).campaign.hero).toEqual(migrated.campaign.hero);
  });
});
describe('bounded attributed training and catalog validation', () => {
  it('counts one use per area action and distinct direct defeats, supports passives, caps counters and deduplicates', () => {
    let hero = learnSkill(createHero(content), 'smash', content); hero = learnSkill(hero, 'combat-mastery', content); hero = learnSkill(hero, 'sword-mastery', content);
    const ledger = new EncounterTraining('authored', hero.learnedSkills, content, true);
    const area = outcome(1); area.targets.push({ ...area.targets[0], targetId: 'slime-2' });
    ledger.record(area); ledger.record(area);
    expect(ledger.snapshot()).toEqual({ smash: { uses: 1, hits: 1, defeats: 2 }, 'combat-mastery': { uses: 1, hits: 1, defeats: 2 }, 'sword-mastery': { hits: 1, defeats: 2 } });
    for (let action = 2; action < 100; action++) ledger.record(outcome(action));
    expect(ledger.snapshot().smash).toEqual({ uses: 20, hits: 10, defeats: 3 });
    expect(hero.learnedSkills.smash.objectiveCounts).toEqual({});
    const detached = ledger.snapshot(); detached.smash.uses = 0; expect(ledger.snapshot().smash.uses).toBe(20);
  });
  it('trains misses only as uses, excludes ally damage, passive recovery, magic and nonauthored arenas', () => {
    let hero = learnSkill(createHero(content), 'smash', content); hero = learnSkill(hero, 'combat-mastery', content); hero = learnSkill(hero, 'sword-mastery', content);
    const ledger = new EncounterTraining('authored', hero.learnedSkills, content, true);
    const miss = outcome(1); Object.assign(miss.targets[0], { hit: false, damage: 0, defeated: false }); ledger.record(miss);
    expect(ledger.snapshot()).toEqual({ smash: { uses: 1 }, 'combat-mastery': { uses: 1 } });
    const ally = outcome(2); ally.targets[0].hostile = false; ledger.record(ally);
    ledger.record(outcome(3, { skillId: 'firebolt', tags: [] }));
    ledger.record(outcome(4, { sourceId: 'slime' }));
    expect(ledger.snapshot()).toEqual({ smash: { uses: 1 }, 'combat-mastery': { uses: 1 } });
    const debug = new EncounterTraining('authored', hero.learnedSkills, content, false); debug.record(outcome(1)); expect(debug.snapshot()).toEqual({});
  });
  it('rejects unsupported ranks, unknown/overcap counts, duplicate flags, bad recipes and unreachable gates', () => {
    const hero = learnSkill(createHero(content), 'smash', content);
    for (const mutate of [
      (h: typeof hero) => { h.learnedSkills.smash.rank = 'D'; },
      (h: typeof hero) => { h.learnedSkills.smash.objectiveCounts.hits = 11; },
      (h: typeof hero) => { h.learnedSkills.smash.objectiveCounts.random = 1; },
      (h: typeof hero) => { h.discoveredSkills.push('smash'); },
      (h: typeof hero) => { h.bookCollections.nope = { completed: false, insertedPages: [] }; },
    ]) { const copy = structuredClone(hero); mutate(copy); expect(() => validateHero(copy, content)).toThrow(); }
    for (const mutate of [
      (raw: typeof content.data) => { raw.skills.find((s) => s.id === 'smash')!.gameRanks!.F!.objectives = []; },
      (raw: typeof content.data) => { delete raw.skills.find((s) => s.id === 'smash')!.gameRanks!.E; },
      (raw: typeof content.data) => { raw.skills.find((s) => s.id === 'smash')!.gameRanks!.F!.apCost = -1; },
      (raw: typeof content.data) => { raw.skillBookRecipes[0].pages[0].itemId = 'potion'; },
    ]) { const raw = structuredClone(content.data); mutate(raw); expect(() => new ContentRegistry(raw)).toThrow(); }
  });
});
