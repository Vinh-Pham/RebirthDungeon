import { openDatabaseAsync } from 'expo-sqlite';
import { ActivityQueueSchema, emptyActivityQueue, type ActivityStorage } from './ActivityOutbox';
export async function createActivityStorage(): Promise<ActivityStorage> {
  const db = await openDatabaseAsync('rebirth-online-activity.db');
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS accounts (key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL)',
  );
  let pending = Promise.resolve();
  return {
    update(key, transform) {
      const operation = pending.then(async () => {
        let next = emptyActivityQueue();
        await db.withExclusiveTransactionAsync(async (tx) => {
          const row = await tx.getFirstAsync<{ payload: string }>(
            'SELECT payload FROM accounts WHERE key=?',
            key,
          );
          next = ActivityQueueSchema.parse(
            transform(
              row ? ActivityQueueSchema.parse(JSON.parse(row.payload)) : emptyActivityQueue(),
            ),
          );
          await tx.runAsync(
            'INSERT INTO accounts (key,payload) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload',
            key,
            JSON.stringify(next),
          );
        });
        return next;
      });
      pending = operation.then(
        () => {},
        () => {},
      );
      return operation;
    },
  };
}
