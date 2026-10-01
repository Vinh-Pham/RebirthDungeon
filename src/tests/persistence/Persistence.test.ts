import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { loadGameContent } from '../../data/content';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost } from '../../game/JourneyHost';
import { encodeSave, parseSave, validateCampaign } from '../../persistence/SaveSchema';
import { SaveRepository, type SaveStorage, type SaveRow } from '../../persistence/SaveRepository';
import { SQLiteSaveStorage, type SqlDatabase } from '../../persistence/SQLiteSaveStorage';
import { AutoSaver } from '../../persistence/AutoSaver';
import { createGameRandom } from '../../engine/Random';
import { legacyCampaign } from './legacyFixture';
const content = loadGameContent();
const sessions: JourneySession[] = [];
function state() { const session = new JourneySession(content); sessions.push(session); return session.toSave(); }
function memory(rows = new Map<string, SaveRow>()): SaveStorage {
  return { async read(id) { return rows.get(id); }, async list() { return [...rows.values()]; }, async write(row) { rows.set(row.id, { ...row }); }, async close() {} };
}
async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
afterEach(() => { sessions.splice(0).forEach((session) => session.dispose()); vi.useRealTimers(); });
describe('save validation and migrations', () => {
  it('round-trips a detached campaign and resumes RNG exactly', () => {
    const session = new JourneySession(content); sessions.push(session);
    session.dispatch({ type: 'INTERACT', objectId: 'keeper' });
    const saved = parseSave(JSON.parse(encodeSave(session.toSave(), content)), content);
    const resumed = new JourneySession(content, saved.campaign); sessions.push(resumed);
    expect(resumed.toSave()).toEqual(session.toSave());
    expect(Array.from({ length: 50 }, () => resumed.engine.random.int(1, 100))).toEqual(Array.from({ length: 50 }, () => session.engine.random.int(1, 100)));
  });
  it('migrates legacy version 1 audio defaults and rejects future versions', () => {
    const campaign = legacyCampaign(state()); const { audio, ...legacy } = campaign; expect(audio.enabled).toBe(false);
    const migrated = parseSave({ version: 1, savedAt: new Date().toISOString(), campaign: legacy }, content);
    expect(migrated.version).toBe(6); expect(migrated.campaign.audio).toEqual({ enabled: false, music: 0.3, sfx: 0.7 });
    expect(() => parseSave({ ...migrated, version: 99 }, content)).toThrow();
  });
  it('rejects invalid positions, resources, flags, references, RNG, and pending encounters', () => {
    for (const mutate of [
      (s: ReturnType<typeof state>) => { s.position.x = 0; },
      (s: ReturnType<typeof state>) => { s.worldId = 'missing'; },
      (s: ReturnType<typeof state>) => { s.hero.mana = 999; },
      (s: ReturnType<typeof state>) => { s.opened.push('refuge/keeper'); },
      (s: ReturnType<typeof state>) => { s.cleared.push('missing'); },
      (s: ReturnType<typeof state>) => { s.opened.push('refuge/supply-chest', 'refuge/supply-chest'); },
      (s: ReturnType<typeof state>) => { s.randomState = [0, 0, 0, 0]; },
      (s: ReturnType<typeof state>) => { s.audio.music = 4; },
      (s: ReturnType<typeof state>) => { s.pending = { worldId: 'halls', objectId: 'slime-guard', mapId: 'chamber', seed: 1 }; },
    ]) { const snapshot = state(); mutate(snapshot); expect(() => validateCampaign(snapshot, content)).toThrow(); }
  });
  it('restores encounter checkpoints with the same initial hero and battle seed', () => {
    const session = new JourneySession(content); sessions.push(session);
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); session.dispatch({ type: 'INTERACT', objectId: 'east' }); session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const saved = parseSave(JSON.parse(encodeSave(session.toSave(), content)), content);
    const resumed = new JourneySession(content, saved.campaign); sessions.push(resumed);
    const battle = resumed.createBattle(); expect(battle.engine.seed).toBe(session.toSave().pending!.seed);
    expect(battle.engine.getEntity('player')?.health?.current).toBe(saved.campaign.hero.health); battle.dispose();
  });
  it('rejects malformed RNG state without changing the generator', () => {
    const random = createGameRandom(7); const snapshot = random.snapshot();
    expect(() => random.restore([1, 2])).toThrow(); expect(random.snapshot()).toEqual(snapshot);
  });
});
describe('save storage and autosave', () => {
  it('migrates and round-trips actual SQLite rows and isolates all four slots', async () => {
    const db = new DatabaseSync(':memory:');
    const driver: SqlDatabase = {
      async execAsync(sql) { db.exec(sql); },
      async runAsync(sql, ...params) { return db.prepare(sql).run(...params); },
      async getFirstAsync<T>(sql: string, ...params: (string | number)[]) { return (db.prepare(sql).get(...params) as T | undefined) ?? null; },
      async getAllAsync<T>(sql: string, ...params: (string | number)[]) { return db.prepare(sql).all(...params) as T[]; }, async closeAsync() { db.close(); },
    };
    const storage = await new SQLiteSaveStorage(driver).initialize(); await storage.initialize();
    const repository = new SaveRepository(storage, content);
    for (const [index, slot] of (['auto', '1', '2', '3'] as const).entries()) { const save = state(); save.hero.gold = index * 10; await repository.save(slot, save); }
    expect(await repository.list()).toHaveLength(4); expect((await repository.load('2'))?.hero.gold).toBe(20);
    const updated = state(); updated.hero.gold = 99; await repository.save('2', updated);
    expect((await repository.load('2'))?.hero.gold).toBe(99); expect((await repository.load('1'))?.hero.gold).toBe(10);
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(3); await repository.close();
  });
  it('preserves save slots when corrupt or future-version loads fail', async () => {
    const rows = new Map<string, SaveRow>(); const repository = new SaveRepository(memory(rows), content);
    await repository.save('1', state()); rows.set('2', { id: '2', savedAt: '', payload: '{broken' });
    await expect(repository.load('2')).rejects.toThrow(); expect(await repository.load('1')).toBeDefined();
    expect(() => repository.load('missing' as '1')).toThrow();
  });
  it('coalesces steps and flushes the latest captured state', async () => {
    vi.useFakeTimers(); const storage = memory(); const write = vi.spyOn(storage, 'write'); const repository = new SaveRepository(storage, content);
    const saver = new AutoSaver(repository, vi.fn()); const snapshot = state();
    for (let i = 0; i < 10; i++) saver.schedule({ ...snapshot, hero: { ...snapshot.hero, gold: i } });
    await vi.advanceTimersByTimeAsync(250); expect(write).toHaveBeenCalledTimes(1); expect((await repository.load('auto'))?.hero.gold).toBe(9);
    saver.schedule(snapshot); await saver.dispose(); expect(write).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
    saver.schedule(snapshot); await vi.advanceTimersByTimeAsync(1000); expect(write).toHaveBeenCalledTimes(2);
  });
  it('surfaces failed autosaves and leaves later operations usable', async () => {
    vi.useFakeTimers(); const storage = memory(); const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    const error = vi.fn(); const repository = new SaveRepository(storage, content); const saver = new AutoSaver(repository, error);
    saver.schedule(state()); await vi.advanceTimersByTimeAsync(250); expect(error).toHaveBeenCalled();
    saver.schedule(state()); await saver.flush(); expect(write).toHaveBeenCalledTimes(2); await saver.dispose();
  });
  it('serializes concurrent writes in order and captures state at invocation time', async () => {
    const repository = new SaveRepository(memory(), content); const snapshot = state();
    const first = repository.save('auto', snapshot); snapshot.hero.gold = 7;
    const second = repository.save('auto', snapshot); snapshot.hero.gold = 999;
    await Promise.all([first, second]); expect((await repository.load('auto'))?.hero.gold).toBe(7);
  });
  it('starts, saves, loads and flushes host sessions without leaking Strict Mode lifetimes', async () => {
    vi.useFakeTimers(); const rows = new Map<string, SaveRow>(); const close = vi.fn();
    const host = new JourneyHost(content, async () => ({ ...memory(rows), close: async () => { close(); } }));
    let unsubscribe = host.subscribe(vi.fn()); unsubscribe(); await settle();
    unsubscribe = host.subscribe(vi.fn()); await settle();
    const initial = host.getSnapshot().session!; expect(initial).toBeDefined();
    await host.save('1'); initial.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    await host.load('1'); expect(host.getSnapshot().session!.toSave().position).toEqual({ x: 2, y: 3 });
    expect(() => initial.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow('disposed');
    unsubscribe(); await settle(); expect(vi.getTimerCount()).toBe(0); expect(close).toHaveBeenCalled();
  });
  it('ignores an old async load after unmount/remount and still closes its storage', async () => {
    vi.useFakeTimers(); const rows = new Map<string, SaveRow>(); const snapshot = state(); snapshot.hero.gold = 99;
    rows.set('1', { id: '1', savedAt: new Date().toISOString(), payload: encodeSave(snapshot, content) });
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    const close = vi.fn(); let connections = 0;
    const host = new JourneyHost(content, async () => {
      const storage = memory(rows); const current = ++connections;
      return { ...storage, async read(id) { if (current === 1 && id === '1') await gate; return storage.read(id); }, async close() { close(); } };
    });
    let unsubscribe = host.subscribe(vi.fn()); await settle();
    const loading = host.load('1'); await settle(); unsubscribe();
    unsubscribe = host.subscribe(vi.fn()); await settle(); const fresh = host.getSnapshot().session;
    expect(fresh).toBeDefined(); release(); await loading; await settle();
    expect(host.getSnapshot().session).toBe(fresh); expect(fresh!.toSave().hero.gold).toBe(0);
    expect(close).toHaveBeenCalledTimes(1); unsubscribe(); await settle();
  });
  it('closes storage even when the last autosave flush fails', async () => {
    vi.useFakeTimers(); const close = vi.fn(); const storage = memory();
    const host = new JourneyHost(content, async () => ({ ...storage, async write() { throw new Error('Disk full'); }, async close() { close(); } }));
    const unsubscribe = host.subscribe(vi.fn()); await settle();
    host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    unsubscribe(); await settle(); expect(close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps exploration playable and reports unavailable save storage', async () => {
    const host = new JourneyHost(content, async () => { throw new Error('Storage unavailable'); });
    const unsubscribe = host.subscribe(vi.fn()); await settle();
    expect(host.getSnapshot()).toMatchObject({ storageAvailable: false, busy: false, error: 'Storage unavailable' });
    host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    expect(host.getSnapshot().session!.toSave().position).toEqual({ x: 3, y: 3 }); unsubscribe(); await settle();
  });

});
