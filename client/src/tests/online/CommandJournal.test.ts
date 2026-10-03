import { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, it, vi } from 'vitest';
import { createCommandJournal } from '../../online/createCommandJournal';
import type { PendingCommand } from '../../online/CommandJournal';

const storage = vi.hoisted(() => ({ database: undefined as DatabaseSync | undefined }));
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    const db = storage.database!;
    return {
      execAsync: async (sql: string) => db.exec(sql),
      runAsync: async (sql: string, ...params: string[]) => db.prepare(sql).run(...params),
      getFirstAsync: async (sql: string, ...params: string[]) => db.prepare(sql).get(...params),
    };
  },
}));
afterEach(() => storage.database?.close());
const pending = (): PendingCommand => ({
  kind: 'command',
  createdAt: 123,
  request: { commandId: crypto.randomUUID(), expectedRevision: 1, command: { type: 'STOP_REST' } },
});
it('native journal reserves a character atomically and late acknowledgments preserve newer requests', async () => {
  storage.database = new DatabaseSync(':memory:');
  const first = await createCommandJournal(),
    second = await createCommandJournal();
  const a = pending(),
    b = pending();
  const results = await Promise.allSettled([first.write('hero', a), second.write('hero', b)]);
  expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
  expect(await second.read('hero')).toEqual(a);
  await first.clear('hero', a.request.commandId);
  await second.write('hero', b);
  await first.clear('hero', a.request.commandId);
  expect(await second.read('hero')).toEqual(b);
  await second.clear('hero', b.request.commandId);
  expect(await first.read('hero')).toBeUndefined();
});
