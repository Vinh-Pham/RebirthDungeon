import { expect, it, vi } from 'vitest';
import {
  ActivityOutbox,
  ACTIVITY_MAX_AGE,
  ACTIVITY_MAX_BYTES,
  emptyActivityQueue,
  pruneActivity,
  type ActivityQueue,
  type ActivityStorage,
} from '../../online/ActivityOutbox';
import { GameAPI } from '../../online/API';
import { OnlineAccess } from '../../online/Access';
import type { ActivityEvent } from '@rebirth/game-core/online/Audit';

const event = (occurredAt = 1000000000): ActivityEvent => ({
  id: crypto.randomUUID(),
  type: 'NAVIGATION',
  message: 'Opened inventory',
  occurredAt,
});
function setup() {
  let now = 1000000000;
  const queues = new Map<string, ActivityQueue>();
  const storage: ActivityStorage = {
    async update(key, transform) {
      const next = transform(structuredClone(queues.get(key) ?? emptyActivityQueue()));
      queues.set(key, next);
      return structuredClone(next);
    },
  };
  const access = new OnlineAccess();
  const signIn = (id: string | undefined) => {
    access.invalidate();
    access.accept(id, access.getSnapshot());
  };
  signIn('alice');
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    return Response.json({ ids: body.events.map((e: ActivityEvent) => e.id) });
  });
  const api = new GameAPI({
    origin: 'https://game.test',
    access,
    credentials: async () => ({}),
    fetch: fetcher,
    onUnauthorized: () => signIn(undefined),
  });
  const acknowledged = vi.fn();
  const create = () =>
    new ActivityOutbox({
      api,
      access,
      storage: async () => storage,
      uuid: () => crypto.randomUUID(),
      now: () => now,
      acknowledged,
    });
  return {
    create,
    fetcher,
    queues,
    access,
    signIn,
    acknowledged,
    advance: (ms: number) => {
      now += ms;
    },
    queue: (user = 'alice') => queues.get(JSON.stringify([api.origin, user]))!,
  };
}
it('survives service recreation and retries stable IDs after a lost response', async () => {
  const s = setup(),
    item = event();
  await s.create().enqueue('alice', 'hero', item);
  s.fetcher.mockRejectedValueOnce(new Error('Lost response'));
  await s.create().flush();
  expect(s.queue().entries).toHaveLength(1);
  await s.create().flush();
  expect(s.queue().entries).toEqual([]);
  const ids = s.fetcher.mock.calls.map(([, init]) => JSON.parse(init!.body as string).events[0].id);
  expect(ids).toEqual([item.id, item.id]);
  expect(s.acknowledged).toHaveBeenCalledWith('hero', 'alice');
});
it('isolates signed-out, backgrounded and switched accounts, including in-flight acknowledgments', async () => {
  const s = setup(),
    outbox = s.create();
  await outbox.enqueue('alice', 'alice-hero', event());
  s.signIn(undefined);
  await outbox.flush();
  expect(s.fetcher).not.toHaveBeenCalled();
  s.signIn('bob');
  await outbox.flush();
  expect(s.fetcher).not.toHaveBeenCalled();
  s.signIn('alice');
  s.access.connection(true, false);
  await outbox.flush();
  expect(s.fetcher).not.toHaveBeenCalled();
  s.access.connection(true, true);
  s.signIn('alice');
  s.fetcher.mockImplementationOnce(async (_url, init) => {
    s.signIn('bob');
    return Response.json({
      ids: JSON.parse(init!.body as string).events.map((e: ActivityEvent) => e.id),
    });
  });
  await outbox.flush();
  expect(s.queue().entries).toHaveLength(1);
  s.signIn('alice');
  s.advance(5000);
  await outbox.flush();
  expect(s.queue().entries).toHaveLength(0);
});
it('limits UTF-8 batches to 4 KiB and respects Retry-After independently of gameplay', async () => {
  const s = setup(),
    outbox = s.create();
  for (let i = 0; i < 18; i++)
    await outbox.enqueue('alice', 'hero', { ...event(), message: '界'.repeat(256) });
  s.fetcher.mockResolvedValueOnce(
    Response.json({ message: 'Throttled' }, { status: 429, headers: { 'Retry-After': '60' } }),
  );
  await outbox.flush();
  await outbox.flush();
  expect(s.fetcher).toHaveBeenCalledTimes(1);
  s.advance(60000);
  await outbox.flush();
  expect(s.queue().entries).toHaveLength(0);
  for (const [, init] of s.fetcher.mock.calls)
    expect(new TextEncoder().encode(init!.body as string).length).toBeLessThanOrEqual(4096);
});
it('bounds persisted bytes and age and delivers a durable dropped-event report', async () => {
  const entries = Array.from({ length: 4000 }, () => ({
    characterId: 'hero',
    event: { ...event(), message: '界'.repeat(256) },
  }));
  const pruned = pruneActivity({ entries, dropped: 0 }, 1000000000);
  expect(new TextEncoder().encode(JSON.stringify(pruned)).length).toBeLessThan(ACTIVITY_MAX_BYTES);
  expect(pruned.dropped).toBeGreaterThan(0);
  const s = setup(),
    outbox = s.create();
  await outbox.enqueue('alice', 'hero', event(1000000000 - ACTIVITY_MAX_AGE - 1));
  await outbox.flush();
  const reported = JSON.parse(s.fetcher.mock.calls[0][1]!.body as string).events;
  expect(reported[0].type).toBe('ACTIVITY_DROPPED');
  expect(s.queue().entries).toHaveLength(0);
});
it('does not let a removed character block delivery for remaining characters', async () => {
  const s = setup(),
    outbox = s.create();
  await outbox.enqueue('alice', 'deleted', event());
  await outbox.enqueue('alice', 'active', event());
  s.fetcher.mockResolvedValueOnce(Response.json({ message: 'Not found' }, { status: 404 }));
  await outbox.flush();
  s.advance(5000);
  await outbox.flush();
  expect(s.queue().entries).toHaveLength(0);
  expect(s.fetcher.mock.calls[1][0]).toContain('/active/activity');
});
