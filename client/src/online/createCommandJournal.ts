import { openDatabaseAsync } from 'expo-sqlite';
import { PendingCommandSchema, type CommandJournal } from './CommandJournal';
export async function createCommandJournal(): Promise<CommandJournal> {
  const db = await openDatabaseAsync('rebirth-online-commands.db');
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS pending_commands (key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL)',
  );
  return {
    async read(key) {
      const row = await db.getFirstAsync<{ payload: string }>(
        'SELECT payload FROM pending_commands WHERE key = ?',
        key,
      );
      return row ? PendingCommandSchema.parse(JSON.parse(row.payload)) : undefined;
    },
    async write(key, value) {
      await db.runAsync(
        'INSERT INTO pending_commands (key, payload) VALUES (?, ?)',
        key,
        JSON.stringify(PendingCommandSchema.parse(value)),
      );
    },
    async clear(key, commandId) {
      await db.runAsync(
        "DELETE FROM pending_commands WHERE key = ? AND json_extract(payload, '$.request.commandId') = ?",
        key,
        commandId,
      );
    },
  };
}
