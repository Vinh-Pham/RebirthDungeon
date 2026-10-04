import { publicFeatures } from '@rebirth/game-core/online/PublicFeatures';
import { gameContent } from '@rebirth/game-core/online/TestRuntime';
import { StatSourceSchema } from '@rebirth/game-core/online/Contracts';
import { heroStatSource } from '../../engine/rpg/Character';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { OnlineAccess } from '../../online/Access';
import { APIError, GameAPI, StaleAccessError, retryRead } from '../../online/API';
import { CommandCoordinator } from '../../online/CommandCoordinator';
import {
  PendingCommandSchema,
  journalKey,
  type CommandJournal,
  type PendingCommand,
} from '../../online/CommandJournal';
import { gameKeys, mergeCharacter } from '../../online/queries';
import { parseAPIURL } from '../../online/config';
import { newOnlineState, publicView } from '@rebirth/game-core/online/TestRuntime';
import { GAME_CONTENT_VERSION } from '@rebirth/game-core/online/Contracts';
const origin = 'https://api.example.com';
const metadata = {
  id: 'dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b',
  name: 'Player',
  talent: 'warrior' as const,
  age: 12,
  revision: 1,
  contentVersion: GAME_CONTENT_VERSION,
  createdAt: 0,
  updatedAt: 0,
};
const view = () => publicView(newOnlineState(12345, 'Player', 'warrior'), metadata);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
class MemoryJournal implements CommandJournal {
  rows = new Map<string, PendingCommand>();
  failWrite = false;
  failClear = false;
  async read(key: string) {
    return this.rows.get(key);
  }
  async write(key: string, value: PendingCommand) {
    if (this.failWrite) throw new Error('Disk full');
    if (this.rows.has(key)) throw new Error('Another action is already pending.');
    this.rows.set(key, PendingCommandSchema.parse(structuredClone(value)));
  }
  async clear(key: string, commandId: string) {
    if (this.failClear) throw new Error('Disk full');
    if (this.rows.get(key)?.request.commandId === commandId) this.rows.delete(key);
  }
}
function fixture(transport: typeof fetch) {
  const access = new OnlineAccess();
  access.accept('account-a', access.getSnapshot());
  const unauthorized = vi.fn(() => access.invalidate());
  const api = new GameAPI({
    origin,
    access,
    fetch: transport,
    credentials: async () => ({ headers: { Cookie: 'session=fake' }, credentials: 'omit' }),
    onUnauthorized: unauthorized,
  });
  const journal = new MemoryJournal(),
    queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const coordinator = () =>
    new CommandCoordinator({
      api,
      access,
      queries,
      journal: async () => journal,
      uuid: () => crypto.randomUUID(),
      now: () => 1000,
    });
  return { access, api, journal, queries, coordinator, unauthorized };
}
function committed(body: { commandId: string; expectedRevision: number }) {
  return {
    receipt: {
      commandId: body.commandId,
      characterId: 'dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b',
      baseRevision: body.expectedRevision,
      committedRevision: body.expectedRevision + 1,
      createdAt: 1000,
      outcome: { message: 'Committed', events: [] },
    },
    apiVersion: 2 as const,
    snapshotRevision: body.expectedRevision + 1,
    updates: publicFeatures(
      { ...view(), character: { ...metadata, revision: body.expectedRevision + 1 } },
      gameContent,
      { receipts: [] },
    ),
  };
}
afterEach(() => vi.useRealTimers());
describe('connection and account isolation', () => {
  it('validates an explicit public origin without silently accepting paths or credentials', () => {
    expect(parseAPIURL('')).toBeUndefined();
    expect(parseAPIURL('http://192.168.1.10:8787/')).toBe('http://192.168.1.10:8787');
    for (const url of [
      'https://user:pass@example.com',
      'https://example.com/api',
      'ftp://example.com',
      'https://example.com?key=secret',
    ])
      expect(() => parseAPIURL(url)).toThrow();
  });
  it('requires authoritative session revalidation after foregrounding and reconnecting', () => {
    const access = new OnlineAccess(),
      old = access.getSnapshot();
    access.accept('a', old);
    expect(access.ready()).toBe(true);
    const lease = access.getSnapshot();
    access.connection(false, false);
    expect(access.ready()).toBe(false);
    access.connection(true, true);
    expect(access.accept('a', lease)).toBe(false);
    expect(access.ready()).toBe(false);
    access.accept('a', access.getSnapshot());
    expect(access.ready()).toBe(true);
    access.invalidate();
    expect(access.accept('b', lease)).toBe(false);
  });
  it('sends native credentials, bounds UTF-8 bodies, and rejects offline requests immediately', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const f = fixture(fetcher);
    await f.api.request('/api/game/characters', z.object({ ok: z.boolean() }), { name: 'Player' });
    expect(fetcher.mock.calls[0][1]?.credentials).toBe('omit');
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('Cookie')).toBe('session=fake');
    await expect(
      f.api.request('/x', z.unknown(), { name: '💥'.repeat(1100) }),
    ).rejects.toMatchObject({ status: 413 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    f.access.connection(false, true);
    await expect(f.api.request('/x', z.unknown())).rejects.toBeInstanceOf(StaleAccessError);
    expect(fetcher).toHaveBeenCalledTimes(1);
    f.queries.clear();
  });
  it('discards successful and unauthorized responses from an earlier account', async () => {
    for (const status of [200, 401]) {
      const response = deferred<Response>();
      const f = fixture(vi.fn(async () => response.promise));
      const request = f.api.request('/x', z.unknown());
      await Promise.resolve();
      f.access.invalidate();
      f.access.accept('account-b', f.access.getSnapshot());
      response.resolve(Response.json({ ok: true }, { status }));
      await expect(request).rejects.toBeInstanceOf(StaleAccessError);
      expect(f.unauthorized).not.toHaveBeenCalled();
      f.queries.clear();
    }
  });
  it('invalidates only an authoritative current 401 and does not retry client errors', async () => {
    const f = fixture(
      vi.fn(async () => Response.json({ message: 'Session replaced' }, { status: 401 })),
    );
    await expect(f.api.request('/x', z.unknown())).rejects.toMatchObject({ status: 401 });
    expect(f.unauthorized).toHaveBeenCalledOnce();
    expect(f.access.ready()).toBe(false);
    for (const status of [400, 401, 403, 404, 409, 422, 429])
      expect(retryRead(0, new APIError(status, 'rejected'))).toBe(false);
    expect(retryRead(0, new APIError(503, 'unavailable'))).toBe(true);
    expect(retryRead(2, new Error('network'))).toBe(false);
    f.queries.clear();
  });
});
describe('durable online command coordination', () => {
  it('persists before sending and recovers the exact request after a lost response and restart', async () => {
    const bodies: any[] = [];
    let fail = true;
    const f = fixture(
      vi.fn(async (_url, init) => {
        const body = JSON.parse(init!.body as string);
        bodies.push(body);
        expect(f.journal.rows.size).toBe(1);
        if (fail) throw new Error('Response lost');
        return Response.json(committed(body));
      }),
    );
    const command = { type: 'MOVE' as const, dx: 1, dy: 0 };
    await expect(
      f.coordinator().submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, command),
    ).rejects.toThrow('Response lost');
    expect(
      f.queries.getQueryData(
        gameKeys.character(origin, 'account-a', 'dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b'),
      ),
    ).toBeUndefined();
    await expect(
      f.coordinator().submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, command),
    ).rejects.toMatchObject({ status: 409 });
    expect(bodies).toHaveLength(1);
    fail = false;
    const recovered = await f.coordinator().retry('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(recovered.receipt.commandId).toBe(bodies[0].commandId);
    expect(f.journal.rows.size).toBe(0);
    f.queries.clear();
  });
  it('allows only one in-flight action per character even before storage resolves', async () => {
    const response = deferred<Response>();
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      response.resolve(Response.json(committed(JSON.parse(init!.body as string))));
      return response.promise;
    });
    const f = fixture(fetcher),
      commands = f.coordinator();
    const first = commands.submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, {
      type: 'MOVE',
      dx: 1,
      dy: 0,
    });
    await expect(
      commands.submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'MOVE', dx: 1, dy: 0 }),
    ).rejects.toMatchObject({
      status: 409,
    });
    await first;
    expect(fetcher).toHaveBeenCalledOnce();
    f.queries.clear();
  });
  it('does not overwrite pending requests from another coordinator', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
      Response.json(committed(JSON.parse(init!.body as string))),
    );
    const f = fixture(fetcher);
    const results = await Promise.allSettled([
      f
        .coordinator()
        .submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'MOVE', dx: 1, dy: 0 }),
      f
        .coordinator()
        .submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'MOVE', dx: 0, dy: 1 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(f.journal.rows.size).toBe(0);
    f.queries.clear();
  });
  it('never sends an action when the durable journal cannot be written', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const f = fixture(fetcher);
    f.journal.failWrite = true;
    await expect(
      f.coordinator().submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'STOP_REST' }),
    ).rejects.toThrow('Disk full');
    expect(fetcher).not.toHaveBeenCalled();
    f.queries.clear();
  });
  it('retains unknown commits but clears authoritative rejections without rebasing', async () => {
    for (const status of [400, 401, 403, 404, 409, 413, 415, 422, 429, 503]) {
      const f = fixture(
        vi.fn(async () =>
          Response.json({ message: 'Rejected' }, { status, headers: { 'Retry-After': '2' } }),
        ),
      );
      await expect(
        f.coordinator().submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'STOP_REST' }),
      ).rejects.toMatchObject({
        status,
      });
      expect(f.journal.rows.size).toBe([401, 429, 503].includes(status) ? 1 : 0);
      f.queries.clear();
    }
  });
  it('never persists or replays a Rest pulse after losing its result', async () => {
    const f = fixture(
      vi.fn(async () => {
        expect(f.journal.rows.size).toBe(0);
        throw new Error('offline');
      }),
    );
    await expect(
      f.coordinator().submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'REST_PULSE' }),
    ).rejects.toThrow();
    expect(f.journal.rows.size).toBe(0);
    await expect(
      f.coordinator().retry('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b'),
    ).rejects.toMatchObject({ status: 409 });
    f.queries.clear();
  });
  it('keeps acknowledged recovery available when clearing storage fails', async () => {
    const f = fixture(
      vi.fn(async (_url, init) => Response.json(committed(JSON.parse(init!.body as string)))),
    );
    f.journal.failClear = true;
    await expect(
      f.coordinator().submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'STOP_REST' }),
    ).rejects.toThrow('Disk full');
    expect(f.journal.rows.size).toBe(1);
    f.journal.failClear = false;
    const result = await f.coordinator().retry('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b');
    expect('updates' in result ? result.snapshotRevision : result.character.revision).toBe(2);
    expect(f.journal.rows.size).toBe(0);
    f.queries.clear();
  });
  it('does not publish old-account commits and isolates its recoverable journal', async () => {
    const response = deferred<Response>();
    let body: any;
    const started = deferred<void>();
    const f = fixture(
      vi.fn(async (_url, init) => {
        body = JSON.parse(init!.body as string);
        started.resolve();
        return response.promise;
      }),
    );
    const request = f
      .coordinator()
      .submit('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b', 1, { type: 'STOP_REST' });
    await started.promise;
    f.access.invalidate();
    f.access.accept('account-b', f.access.getSnapshot());
    response.resolve(Response.json(committed(body)));
    await expect(request).rejects.toBeInstanceOf(StaleAccessError);
    expect(await f.coordinator().pending('dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b')).toBeUndefined();
    expect(
      f.journal.rows.has(journalKey(origin, 'account-a', 'dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b')),
    ).toBe(true);
    expect(
      f.queries.getQueryData(
        gameKeys.character(origin, 'account-a', 'dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b'),
      ),
    ).toBeUndefined();
    f.queries.clear();
  });
  it('keeps the latest revision when a receipt retry returns a later view or an older read arrives', () => {
    const original = view();
    const first = {
        view: {
          ...original,
          statReview: {
            stats: original.stats,
            source: StatSourceSchema.parse(heroStatSource(original.hero, [], gameContent)),
          },
        },
        connectionGeneration: 0,
      },
      latest = { ...first, view: { ...first.view, character: { ...metadata, revision: 8 } } };
    expect(
      mergeCharacter(latest, { ...first, connectionGeneration: 2 }).view.character.revision,
    ).toBe(8);
    expect(mergeCharacter(latest, { ...first, connectionGeneration: 2 }).connectionGeneration).toBe(
      0,
    );
  });
  it('recovers creation using the original command ID and account scope', async () => {
    const bodies: any[] = [];
    let fail = true;
    const f = fixture(
      vi.fn(async (_url, init) => {
        const body = JSON.parse(init!.body as string);
        bodies.push(body);
        if (fail) throw new Error('offline');
        const created = committed({ ...body, expectedRevision: 0 });
        return Response.json({
          apiVersion: 2,
          receipt: created.receipt,
          character: created.updates.character,
        });
      }),
    );
    await expect(
      f
        .coordinator()
        .create({ commandId: crypto.randomUUID(), name: 'Player', talent: 'warrior', age: 12 }),
    ).rejects.toThrow();
    fail = false;
    await f.coordinator().retry();
    expect(bodies[1]).toEqual(bodies[0]);
    expect(f.journal.rows.size).toBe(0);
    f.queries.clear();
  });
});
