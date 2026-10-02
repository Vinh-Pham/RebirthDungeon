import { versionSevenHero } from './legacyFixture';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { loadGameContent } from '../../data/content';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { CharacterDetailsSchema, TALENTS } from '../../persistence/CharacterProfile';
import { CharacterRepository } from '../../persistence/CharacterRepository';
import { SQLiteSaveStorage, type SqlDatabase } from '../../persistence/SQLiteSaveStorage';
import { SaveRepository } from '../../persistence/SaveRepository';
import { parseSave } from '../../persistence/SaveSchema';
import { createHero } from '../../engine/rpg/Character';
import { AutoSaver } from '../../persistence/AutoSaver';

const content = loadGameContent();
const databases: DatabaseSync[] = [];
function database() {
  const db = new DatabaseSync(':memory:'); databases.push(db);
  const driver: SqlDatabase = {
    async execAsync(sql) { db.exec(sql); },
    async runAsync(sql, ...params) { return db.prepare(sql).run(...params); },
    async getFirstAsync<T>(sql: string, ...params: (string | number)[]) { return (db.prepare(sql).get(...params) as T | undefined) ?? null; },
    async getAllAsync<T>(sql: string, ...params: (string | number)[]) { return db.prepare(sql).all(...params) as T[]; },
    async closeAsync() {},
  };
  return { db, driver };
}
function campaign() {
  const session = new JourneySession(content);
  try { return session.toSave(); } finally { session.dispose(); }
}
async function settle() { for (let index = 0; index < 60; index++) await Promise.resolve(); }
afterEach(async () => { await settleJourneySaves(); databases.splice(0).forEach((db) => db.close()); vi.useRealTimers(); });

describe('character details', () => {
  it.each(TALENTS)('accepts %s and both age boundaries, trimming the name', (talent) => {
    for (const age of [10, 17]) expect(CharacterDetailsSchema.parse({ name: '  Ember  ', talent, age })).toEqual({ name: 'Ember', talent, age });
  });
  it.each([
    { name: '', talent: 'warrior', age: 10 }, { name: '   ', talent: 'warrior', age: 10 },
    { name: 'x'.repeat(25), talent: 'warrior', age: 10 }, { name: 'Ember', talent: 'unknown', age: 10 },
    { name: 'Ember', talent: 'mage', age: 9 }, { name: 'Ember', talent: 'mage', age: 18 },
    { name: 'Ember', talent: 'mage', age: 10.5 }, { name: 'Ember', talent: 'mage', age: '10' },
  ])('rejects invalid details %#', (details) => { expect(CharacterDetailsSchema.safeParse(details).success).toBe(false); });
});

describe('character persistence', () => {
  it('creates profiles and initial journeys atomically, with the chosen talent governing growth', async () => {
    const { driver } = database(); const storage = await new SQLiteSaveStorage(driver).initialize();
    const repository = new CharacterRepository(storage, content);
    expect(await repository.list()).toEqual([]);
    for (const talent of TALENTS) {
      const profile = await repository.create({ name: 'Ember', talent, age: 17 });
      expect(profile.talent).toBe(talent);
      const row = await storage.readSave(profile.id, 'auto');
      expect(parseSave(JSON.parse(row!.payload), content).campaign.hero).toEqual(createHero(content, talent));
    }
    const roster = await repository.list();
    expect(roster).toHaveLength(3); expect(new Set(roster.map((entry) => entry.profile.id)).size).toBe(3);
    expect(roster.every((entry) => entry.level === 1 && !entry.error)).toBe(true);
  });
  it('rolls back the profile if writing its initial save fails', async () => {
    const { db, driver } = database(); const storage = await new SQLiteSaveStorage(driver).initialize();
    db.exec("CREATE TRIGGER reject_save BEFORE INSERT ON character_saves BEGIN SELECT RAISE(ABORT, 'Disk full'); END;");
    const repository = new CharacterRepository(storage, content);
    await expect(repository.create({ name: 'Ember', talent: 'mage', age: 10 })).rejects.toThrow('Disk full');
    expect(await repository.list()).toEqual([]);
    db.exec('DROP TRIGGER reject_save');
    await repository.create({ name: 'Ember', talent: 'mage', age: 10 });
    expect(await repository.list()).toHaveLength(1);
  });
  it('isolates autosaves and every manual slot across characters and database reopen', async () => {
    const { driver } = database(); const menu = await new SQLiteSaveStorage(driver).initialize();
    const characters = new CharacterRepository(menu, content);
    const first = await characters.create({ name: 'Ember', talent: 'warrior', age: 10 });
    const second = await characters.create({ name: 'Ash', talent: 'archery', age: 17 });
    const a = new SaveRepository(await new SQLiteSaveStorage(driver, first.id).initialize(), content);
    const b = new SaveRepository(await new SQLiteSaveStorage(driver, second.id).initialize(), content);
    for (const slot of ['auto', '1', '2', '3'] as const) {
      const state = campaign(); state.hero.gold = 42; await a.save(slot, state);
      expect((await b.load(slot))?.hero.gold ?? 0).toBe(0);
    }
    const reopened = new SaveRepository(await new SQLiteSaveStorage(driver, first.id).initialize(), content);
    for (const slot of ['auto', '1', '2', '3'] as const) expect((await reopened.load(slot))?.hero.gold).toBe(42);
  });
  it('imports all legacy rows once, preserves their bytes and retains progress after completing details', async () => {
    const { db, driver } = database(); const original = campaign(); original.hero.gold = 93;
    const { growthTalent, stamina, wounds, fullness, ap, learnedSkills, discoveredSkills, bookCollections, claimedMilestones, quests, earnedTitles, questFlags, trackedObjectives, ...oldHero } = versionSevenHero(original.hero); void ap; void learnedSkills; void discoveredSkills; void bookCollections; void claimedMilestones; void quests; void earnedTitles; void questFlags; void trackedObjectives; void growthTalent; void stamina; void wounds; void fullness; oldHero.health = 42; oldHero.mana = 14;
    const payload = JSON.stringify({ version: 4, savedAt: new Date().toISOString(), campaign: { ...original, hero: oldHero } });
    db.exec('CREATE TABLE save_slots (id TEXT PRIMARY KEY, savedAt TEXT NOT NULL, payload TEXT NOT NULL); PRAGMA user_version=1;');
    for (const slot of ['auto', '1', '2', '3']) db.prepare('INSERT INTO save_slots VALUES (?, ?, ?)').run(slot, new Date().toISOString(), payload);
    const storage = await new SQLiteSaveStorage(driver).initialize();
    const repository = new CharacterRepository(storage, content);
    expect((await repository.list())[0].profile.needsSetup).toBe(true);
    const completed = await repository.completeImport('legacy', { name: 'Keeper', talent: 'mage', age: 15 });
    expect(completed.name).toBe('Keeper');
    await storage.initialize();
    expect(await storage.listProfiles()).toEqual([completed]);
    expect((await storage.listSaves('legacy')).every((row) => row.payload === payload)).toBe(true);
    expect(db.prepare('SELECT count(*) AS count FROM save_slots').get()?.count).toBe(4);
    const migrated = (await new SaveRepository(storage, content, 'mage').load('auto'))!;
    expect(migrated.hero).toMatchObject({ gold: 93, growthTalent: 'mage', health: 118, mana: 108 });
    expect((await repository.list())[0].error).toBeUndefined();
    expect(JSON.parse((await storage.readSave('legacy', 'auto'))!.payload).version).toBe(11);
    expect(db.prepare('SELECT payload FROM save_slots WHERE id = ?').get('auto')?.payload).toBe(payload);
    await expect(repository.completeImport('legacy', { name: 'Other', talent: 'mage', age: 15 })).rejects.toThrow();
  });
  it('keeps corrupt journeys visible without altering their saves or hiding healthy characters', async () => {
    const { db, driver } = database(); const storage = await new SQLiteSaveStorage(driver).initialize(); const repository = new CharacterRepository(storage, content);
    const first = await repository.create({ name: 'Ember', talent: 'mage', age: 10 });
    await repository.create({ name: 'Ash', talent: 'archery', age: 17 });
    db.prepare('UPDATE character_saves SET payload = ? WHERE characterId = ?').run('{broken', first.id);
    const roster = await repository.list();
    expect(roster).toHaveLength(2); expect(roster.find((entry) => entry.profile.id === first.id)?.error).toBeDefined();
    expect(roster.filter((entry) => !entry.error)).toHaveLength(1);
    expect((await storage.readSave(first.id, 'auto'))?.payload).toBe('{broken');
  });
  it('does not replace a selected character with a blank journey on a corrupt or missing autosave', async () => {
    for (const payload of [undefined, '{broken']) {
      const { driver } = database(); const storage = await new SQLiteSaveStorage(driver, 'missing').initialize();
      if (payload) await storage.write({ id: 'auto', savedAt: '', payload });
      const host = new JourneyHost(content, async () => storage, 'Ember');
      const unsubscribe = host.subscribe(vi.fn()); await settle();
      expect(host.getSnapshot().session).toBeUndefined(); expect(host.getSnapshot().error).toBeDefined();
      unsubscribe(); await settle();
    }
  });
  it('loads imported manual-only journeys, uses the chosen name in exploration and battles, and flushes before reopening', async () => {
    const { driver } = database(); const storage = await new SQLiteSaveStorage(driver, 'legacy').initialize();
    const session = new JourneySession(content); session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); session.dispatch({ type: 'INTERACT', objectId: 'east' });
    session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    await new SaveRepository(storage, content).save('1', session.toSave()); session.dispose();
    const host = new JourneyHost(content, async () => storage, 'Ember'); const unsubscribe = host.subscribe(vi.fn()); await settle();
    expect(host.getSnapshot().session?.engine.getEntity('player')?.name).toBe('Ember');
    expect(host.getSnapshot().battle?.getSnapshot().entities.find((entity) => entity.side === 'player')?.name).toBe('Ember');
    expect(await host.flush()).toBe(true); unsubscribe(); await settle();
  });
  it('waits for a timer-started autosave that is already writing', async () => {
    vi.useFakeTimers(); let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    const save = vi.fn(async () => { await gate; });
    const saver = new AutoSaver({ save } as unknown as SaveRepository, vi.fn());
    saver.schedule(campaign()); await vi.advanceTimersByTimeAsync(250);
    let finished = false; const flushing = saver.flush().then(() => { finished = true; });
    await settle(); expect(finished).toBe(false); release(); await flushing; expect(finished).toBe(true);
    await saver.dispose(); expect(save).toHaveBeenCalledTimes(1);
  });
});
