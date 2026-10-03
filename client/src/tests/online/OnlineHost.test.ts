import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { OnlineAccess } from '../../online/Access';
import { GameAPI } from '../../online/API';
import { CommandCoordinator } from '../../online/CommandCoordinator';
import type { CommandJournal, PendingCommand } from '../../online/CommandJournal';
import { OnlineGameplayHost } from '../../online/OnlineGameplayHost';
import {
  execute,
  newOnlineState,
  publicView,
  gameContent,
} from '@rebirth/game-core/online/Runtime';
import { GAME_CONTENT_VERSION } from '@rebirth/game-core/online/Contracts';
function fixture() {
  let state = newOnlineState(12345, 'Player', 'warrior');
  let metadata = {
    id: 'hero',
    name: 'Player',
    talent: 'warrior' as const,
    age: 12,
    revision: 1,
    contentVersion: GAME_CONTENT_VERSION,
    createdAt: 0,
    updatedAt: 0,
  };
  const access = new OnlineAccess();
  access.accept('user', access.getSnapshot());
  const rows = new Map<string, PendingCommand>();
  let storageFailure = false;
  const journal: CommandJournal = {
    read: async (key) => {
      if (storageFailure) throw new Error('Disk unavailable');
      return rows.get(key);
    },
    write: async (key, value) => {
      rows.set(key, value);
    },
    clear: async (key) => {
      rows.delete(key);
    },
  };
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    if (init!.method === 'GET') return Response.json(publicView(state, metadata));
    const request = JSON.parse(init!.body as string),
      resolved = execute(state, 'Player', request.command, Date.now());
    state = resolved.state;
    metadata = { ...metadata, revision: metadata.revision + 1 };
    return Response.json({
      view: publicView(state, metadata),
      receipt: {
        commandId: request.commandId,
        characterId: 'hero',
        baseRevision: request.expectedRevision,
        committedRevision: metadata.revision,
        createdAt: Date.now(),
        outcome: resolved.outcome,
      },
    });
  });
  const api = new GameAPI({
    origin: 'https://api.example.com',
    access,
    fetch: fetcher,
    credentials: async () => ({ credentials: 'include' }),
    onUnauthorized: () => access.invalidate(),
  });
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const commands = new CommandCoordinator({
    api,
    access,
    queries,
    journal: async () => journal,
    uuid: () => crypto.randomUUID(),
  });
  const createHost = () =>
    new OnlineGameplayHost({
      api,
      access,
      queries,
      commands,
      characterId: 'hero',
      userId: 'user',
      content: gameContent,
      mutate: (action) =>
        action.kind === 'retry'
          ? commands.retry('hero')
          : commands.submit('hero', action.revision, action.command),
    });
  return {
    access,
    fetcher,
    queries,
    createHost,
    rows,
    getState: () => state,
    failStorage: (failed: boolean) => {
      storageFailure = failed;
    },
  };
}
async function start(f: ReturnType<typeof fixture>) {
  const host = f.createHost(),
    stop = host.subscribe(() => {});
  await vi.waitFor(() => expect(host.getSnapshot().busy).toBe(false));
  return { host, stop };
}
afterEach(() => vi.useRealTimers());
it('uses authoritative cache revisions and never constructs an online journey engine', async () => {
  const f = fixture(),
    { host, stop } = await start(f);
  const before = host.getSnapshot().session!.getSnapshot();
  expect(host.getSnapshot().session).not.toHaveProperty('engine');
  expect(host.getSnapshot().session).not.toHaveProperty('nextEnchantOperation');
  host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
  expect(host.getSnapshot().busy).toBe(true);
  expect(before.state.position).toEqual({ x: 2, y: 3 });
  expect(host.getSnapshot().session!.getSnapshot().state.position).toEqual(before.state.position);
  await vi.waitFor(() => expect(host.getSnapshot().revision).toBe(2));
  expect(host.getSnapshot().session!.getSnapshot().state.position).toEqual({ x: 3, y: 3 });
  expect(before.state.position).toEqual({ x: 2, y: 3 });
  stop();
  f.queries.clear();
});
it('pauses Rest after backgrounding, renews explicitly, and never catches up or overlaps pulses', async () => {
  const f = fixture(),
    { host, stop } = await start(f);
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  host.toggleRest();
  await vi.waitFor(() => expect(host.getSnapshot().revision).toBe(2));
  await vi.advanceTimersByTimeAsync(1000);
  expect(host.getSnapshot().revision).toBe(3);
  f.access.connection(true, false);
  const revision = host.getSnapshot().revision;
  await vi.advanceTimersByTimeAsync(5000);
  expect(host.getSnapshot().revision).toBe(revision);
  f.access.connection(true, true);
  f.access.accept('user', f.access.getSnapshot());
  await vi.waitFor(() => expect(host.getSnapshot().busy).toBe(false));
  expect(host.getSnapshot().restPaused).toBe(true);
  await vi.advanceTimersByTimeAsync(5000);
  expect(host.getSnapshot().revision).toBe(revision);
  const health = f.getState().campaign.hero.health;
  host.toggleRest();
  await vi.waitFor(() => expect(host.getSnapshot().revision).toBe(revision + 1));
  expect(f.getState().campaign.hero.health).toBe(health);
  await vi.advanceTimersByTimeAsync(1000);
  expect(host.getSnapshot().revision).toBe(revision + 2);
  host.stopRest();
  await vi.advanceTimersByTimeAsync(10000);
  expect(host.getSnapshot().revision).toBe(revision + 2);
  stop();
  f.queries.clear();
});
it('blocks new actions until an interrupted command has been recovered after a host restart', async () => {
  const f = fixture();
  f.rows.set(JSON.stringify(['https://api.example.com', 'user', 'hero']), {
    kind: 'command',
    createdAt: 1,
    request: {
      commandId: crypto.randomUUID(),
      expectedRevision: 1,
      command: { type: 'MOVE', dx: 1, dy: 0 },
    },
  });
  const { host, stop } = await start(f);
  expect(host.getSnapshot().retryAvailable).toBe(true);
  expect(() =>
    host.getSnapshot().session!.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 }),
  ).toThrow('pending');
  expect(await host.retryProgression()).toBe(true);
  expect(host.getSnapshot().retryAvailable).toBe(false);
  expect(host.getSnapshot().revision).toBe(2);
  expect(f.rows.size).toBe(0);
  stop();
  f.queries.clear();
});
it('permits recovery-storage retry without letting a failed journal authorize progression', async () => {
  const f = fixture();
  f.failStorage(true);
  const { host, stop } = await start(f);
  expect(host.getSnapshot().retryAvailable).toBe(true);
  expect(() => host.begin({ type: 'STOP_REST' })).toThrow();
  f.failStorage(false);
  expect(await host.retryProgression()).toBe(true);
  expect(host.getSnapshot().retryAvailable).toBe(false);
  expect(host.getSnapshot().revision).toBe(1);
  stop();
  f.queries.clear();
});
it('leaving a disconnected online character is allowed without local save or rewind', async () => {
  const f = fixture(),
    { host, stop } = await start(f);
  f.access.connection(false, true);
  expect(await host.flushForExit()).toBe(true);
  expect(() => host.begin({ type: 'STOP_REST' })).toThrow();
  await expect(host.load('auto')).rejects.toThrow('one current state');
  await expect(host.save('auto')).rejects.toThrow('server');
  stop();
  f.queries.clear();
});
