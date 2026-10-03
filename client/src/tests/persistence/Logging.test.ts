import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { LogEngine, selectLogEntries } from '../../engine/logging/LogEngine';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
const content = loadGameContent(),
  cleanups: (() => void)[] = [];
async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
afterEach(async () => {
  cleanups.splice(0).forEach((c) => c());
  await settleJourneySaves();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function setup() {
  vi.useFakeTimers();
  const rows = new Map<string, SaveRow>();
  const storage: SaveStorage = {
    async read(id) {
      return rows.get(id);
    },
    async list() {
      return [...rows.values()];
    },
    async write(row) {
      rows.set(row.id, row);
    },
    async close() {},
  };
  const logs = new LogEngine(() => 123);
  const host = new JourneyHost(content, async () => storage, undefined, undefined, undefined, {
    debugEnabled: true,
    logs,
    characterId: 'character-a',
  });
  const unsubscribe = host.subscribe(vi.fn());
  cleanups.push(unsubscribe);
  await settle();
  await host.flush();
  return { host, storage, rows, logs, unsubscribe };
}
describe('character logs and durable publication', () => {
  it('publishes a candidate once after exact retry and retains history when exit is blocked', async () => {
    const { host, storage, logs } = await setup();
    const before = host.getSnapshot().session!.toSave();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(selectLogEntries(logs.getSnapshot()).some((e) => e.type === 'DEBUG_COMPLETED')).toBe(
      false,
    );
    expect(selectLogEntries(logs.getSnapshot()).some((e) => e.type === 'OPERATION_FAILED')).toBe(
      true,
    );
    const count = logs.getSnapshot().count;
    expect(await host.flushForExit()).toBe(false);
    expect(logs.getSnapshot().count).toBeGreaterThanOrEqual(count);
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    const bytes = write.mock.calls[0][0].payload;
    expect(await host.retryProgression()).toBe(true);
    expect(write.mock.calls[1][0].payload).toBe(bytes);
    expect(
      selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'DEBUG_COMPLETED'),
    ).toHaveLength(1);
    expect(
      selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'SAVE_RETRY'),
    ).toHaveLength(1);
    expect(host.getSnapshot().session!.toSave().hero.gold).toBe(before.hero.gold + 100);
    expect(JSON.parse(bytes).campaign.logs).toBeUndefined();
    expect(JSON.parse(bytes).version).toBe(13);
    expect(await host.retryProgression()).toBe(false);
  });
  it('observes actual automatic writes and their failures without replaying movement', async () => {
    const { host, storage, logs } = await setup();
    logs.clear();
    host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    await vi.advanceTimersByTimeAsync(250);
    expect(
      selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'AUTOSAVE_COMPLETED'),
    ).toHaveLength(0);
    expect(selectLogEntries(logs.getSnapshot()).some((e) => e.type === 'OPERATION_FAILED')).toBe(
      true,
    );
    expect(await host.flush()).toBe(true);
    expect(
      selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'AUTOSAVE_COMPLETED'),
    ).toHaveLength(1);
    expect(selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'MOVE')).toHaveLength(1);
  });
  it('keeps history across session replacements and manual clear never saves or changes gameplay', async () => {
    const { host, logs, storage } = await setup();
    const session = host.getSnapshot().session!;
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    await host.flush();
    const count = logs.getSnapshot().count;
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(true);
    expect(host.getSnapshot().session).not.toBe(session);
    expect(logs.getSnapshot().count).toBeGreaterThan(count);
    expect(selectLogEntries(logs.getSnapshot()).every((e) => e.characterId === 'character-a')).toBe(
      true,
    );
    const state = host.getSnapshot().session!.toSave(),
      write = vi.spyOn(storage, 'write');
    logs.clear();
    expect(logs.getSnapshot().count).toBe(0);
    expect(host.getSnapshot().session!.toSave()).toEqual(state);
    expect(write).not.toHaveBeenCalled();
    host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: -1, dy: 0 });
    expect(logs.getSnapshot().count).toBeGreaterThan(0);
  });
  it('clears on character host disposal and a reopened visit starts without previous messages', async () => {
    const { host, logs, unsubscribe, storage } = await setup();
    host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    expect(await host.flushForExit()).toBe(true);
    const previous = selectLogEntries(logs.getSnapshot());
    const disposedSession = host.getSnapshot().session!;
    unsubscribe();
    expect(logs.getSnapshot().count).toBe(0);
    expect(() =>
      disposedSession.dispatch({ type: 'MOVE', entityId: 'player', dx: -1, dy: 0 }),
    ).toThrow('disposed');
    expect(logs.getSnapshot().count).toBe(0);
    await settleJourneySaves();
    const reopened = new JourneyHost(
      content,
      async () => storage,
      undefined,
      undefined,
      undefined,
      { logs },
    );
    cleanups.push(reopened.subscribe(vi.fn()));
    await settle();
    expect(selectLogEntries(logs.getSnapshot()).some((e) => e.type === 'MOVE')).toBe(false);
    expect(previous.some((e) => e.type === 'MOVE')).toBe(true);
  });
  it('retains command receipts on a successful durable lesson without logging speculative candidates', async () => {
    const { host, storage, logs } = await setup();
    const session = host.getSnapshot().session!;
    session.dispatch({ type: 'TRAVEL_TO', x: 12, y: 4 });
    session.dispatch({ type: 'INTERACT', objectId: 'combat-instructor' });
    await host.flush();
    logs.clear();
    vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Offline'));
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(false);
    expect(selectLogEntries(logs.getSnapshot()).some((e) => e.type === 'LEARN_SKILL')).toBe(false);
    expect(await host.retryProgression()).toBe(true);
    expect(
      selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'LEARN_SKILL'),
    ).toHaveLength(1);
    expect(
      selectLogEntries(logs.getSnapshot()).filter((e) => e.type === 'SKILL_LEARNED'),
    ).toHaveLength(1);
  });
});
