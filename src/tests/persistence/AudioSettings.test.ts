import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { loadGameContent } from '../../data/content';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { SQLiteSaveStorage, type SqlDatabase } from '../../persistence/SQLiteSaveStorage';
import { CharacterRepository } from '../../persistence/CharacterRepository';
import { AudioSettingsRepository, DEFAULT_AUDIO } from '../../persistence/AudioSettingsRepository';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { AudioPreferences } from '../../state/AudioPreferences';

const content = loadGameContent();
const databases: DatabaseSync[] = [];
function database() {
  const db = new DatabaseSync(':memory:');
  databases.push(db);
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
afterEach(async () => { await settleJourneySaves(); databases.splice(0).forEach((db) => db.close()); });

describe('global sound storage', () => {
  it('initializes a fresh database with defaults and persists global settings on reopen', async () => {
    const { db, driver } = database();
    const storage = await new SQLiteSaveStorage(driver).initialize();
    const repository = new AudioSettingsRepository(storage, content);
    expect(await repository.read()).toEqual(DEFAULT_AUDIO);
    const settings = { enabled: true, music: 0.1, sfx: 0.9 };
    await repository.write(settings);
    const reopened = await new SQLiteSaveStorage(driver).initialize();
    expect(await new AudioSettingsRepository(reopened, content).read()).toEqual(settings);
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(3);
    expect(await storage.listProfiles()).toEqual([]);
    expect(() => repository.write({ ...settings, music: 2 })).toThrow();
  });
  it('upgrades version 1 legacy saves without modifying their payloads', async () => {
    const { db, driver } = database();
    const state = campaign(); state.audio = { enabled: true, music: 0.5, sfx: 0.4 };
    const payload = encodeSave(state, content);
    db.exec('CREATE TABLE save_slots (id TEXT PRIMARY KEY, savedAt TEXT NOT NULL, payload TEXT NOT NULL); PRAGMA user_version=1;');
    db.prepare('INSERT INTO save_slots VALUES (?, ?, ?)').run('auto', '2026-01-01T00:00:00.000Z', payload);
    const storage = await new SQLiteSaveStorage(driver).initialize();
    expect(await new AudioSettingsRepository(storage, content).read()).toEqual(state.audio);
    expect((await storage.readSave('legacy', 'auto'))?.payload).toBe(payload);
    expect(db.prepare('SELECT payload FROM save_slots').get()?.payload).toBe(payload);
  });
  it('upgrades version 2 and adopts the newest valid slot across characters exactly once', async () => {
    const { db, driver } = database();
    const storage = await new SQLiteSaveStorage(driver).initialize();
    const characters = new CharacterRepository(storage, content);
    const first = await characters.create({ name: 'First', talent: 'warrior', age: 10 });
    const second = await characters.create({ name: 'Second', talent: 'mage', age: 17 });
    const state = parseSave(JSON.parse((await storage.readSave(second.id, 'auto'))!.payload), content, second.talent).campaign;
    state.audio = { enabled: true, music: 0.2, sfx: 0.8 };
    const payload = encodeSave(state, content);
    db.prepare('INSERT INTO character_saves VALUES (?, ?, ?, ?)').run(second.id, '2', '2090-01-01T00:00:00.000Z', payload);
    db.prepare('INSERT INTO character_saves VALUES (?, ?, ?, ?)').run(first.id, '3', '2091-01-01T00:00:00.000Z', '{broken');
    const savedRows = db.prepare('SELECT * FROM character_saves ORDER BY characterId, id').all();
    db.exec('DROP TABLE app_settings; PRAGMA user_version=2;');
    const upgraded = await new SQLiteSaveStorage(driver).initialize();
    const repository = new AudioSettingsRepository(upgraded, content);
    expect(await repository.read()).toEqual(state.audio);
    expect(db.prepare('SELECT * FROM character_saves ORDER BY characterId, id').all()).toEqual(savedRows);
    const global = { enabled: false, music: 0.6, sfx: 0.1 };
    await repository.write(global);
    expect(await repository.read()).toEqual(global);
    expect((await upgraded.listProfiles()).map((profile) => profile.id)).toEqual([first.id, second.id]);
  });
  it('preserves an unreadable settings record and exposes the error', async () => {
    const { db, driver } = database();
    const storage = await new SQLiteSaveStorage(driver).initialize();
    db.prepare('INSERT INTO app_settings VALUES (?, ?)').run('audio', '{broken');
    await expect(new AudioSettingsRepository(storage, content).read()).rejects.toThrow();
    expect(db.prepare('SELECT payload FROM app_settings').get()?.payload).toBe('{broken');
  });
  it('uses global audio on character startup and older manual loads without changing gameplay state', async () => {
    const { driver } = database();
    const storage = await new SQLiteSaveStorage(driver).initialize();
    const profile = await new CharacterRepository(storage, content).create({ name: 'Ember', talent: 'warrior', age: 10 });
    const old = (await storage.readSave(profile.id, 'auto'))!;
    const scoped = await new SQLiteSaveStorage(driver, profile.id).initialize();
    await scoped.write({ ...old, id: '1' });
    let global = { enabled: true, music: 0.8, sfx: 0.2 };
    const host = new JourneyHost(content, async () => scoped, profile.name, profile.talent, () => global);
    const stop = host.subscribe(() => {});
    try {
      await vi.waitFor(() => expect(host.getSnapshot().busy).toBe(false));
      expect(host.getSnapshot().session?.toSave().audio).toEqual(global);
      const originalHero = host.getSnapshot().session!.toSave().hero;
      global = { enabled: false, music: 0.1, sfx: 0.9 };
      await host.load('1');
      expect(host.getSnapshot().session?.toSave().audio).toEqual(global);
      expect(host.getSnapshot().session?.toSave().hero).toEqual(originalHero);
    } finally { stop(); }
  });
});

describe('sound preference updates', () => {
  it('orders rapid updates and retries failed writes while retaining the current choice', async () => {
    const saved: number[] = [];
    let failing = true;
    const preferences = new AudioPreferences(async () => DEFAULT_AUDIO, async (settings) => {
      saved.push(settings.music);
      if (failing && settings.music === 0.5) throw new Error('Disk full');
    });
    await preferences.start();
    const first = preferences.setSettings({ ...DEFAULT_AUDIO, music: 0.4 });
    const second = preferences.setSettings({ ...DEFAULT_AUDIO, music: 0.5 });
    await Promise.all([first, second]);
    expect(saved).toEqual([0.4, 0.5]);
    expect(preferences.getSettings().music).toBe(0.5);
    expect(preferences.getSnapshot().error).toBe('Disk full');
    failing = false;
    await preferences.retry();
    expect(saved).toEqual([0.4, 0.5, 0.5]);
    expect(preferences.getSnapshot().error).toBeUndefined();
  });
  it('allows in-memory preferences after an initial read failure and recovers on retry', async () => {
    let failed = true;
    const preferences = new AudioPreferences(async () => {
      if (failed) throw new Error('Storage unavailable');
      return { ...DEFAULT_AUDIO, music: 0.9 };
    }, async () => {});
    await preferences.start();
    expect(preferences.getSnapshot().ready).toBe(true);
    expect(preferences.getSnapshot().error).toBe('Storage unavailable');
    expect(preferences.getSettings()).toEqual(DEFAULT_AUDIO);
    failed = false;
    await preferences.retry();
    expect(preferences.getSettings().music).toBe(0.9);
    expect(preferences.getSnapshot().error).toBeUndefined();
  });
});
