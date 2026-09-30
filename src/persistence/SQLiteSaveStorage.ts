import type { SaveRow, SaveSlot, SaveStorage } from './SaveRepository';
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: (string | number)[]): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  closeAsync(): Promise<void>;
}
/** SQL stays testable without importing Expo into headless tests. */
export class SQLiteSaveStorage implements SaveStorage {
  constructor(private db: SqlDatabase) {}
  async initialize() {
    const row = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) > 1) throw new Error('Save database is newer than this app');
    // Idempotent schema migration, committed atomically with its version marker.
    await this.db.execAsync(`PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS save_slots (id TEXT PRIMARY KEY NOT NULL, savedAt TEXT NOT NULL, payload TEXT NOT NULL);
      PRAGMA user_version = 1;
      COMMIT;`);
    return this;
  }
  async read(id: SaveSlot) { return (await this.db.getFirstAsync<SaveRow>('SELECT id, savedAt, payload FROM save_slots WHERE id = ?', id)) ?? undefined; }
  list() { return this.db.getAllAsync<SaveRow>('SELECT id, savedAt, payload FROM save_slots ORDER BY id'); }
  async write(row: SaveRow) {
    await this.db.runAsync('INSERT INTO save_slots (id, savedAt, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET savedAt = excluded.savedAt, payload = excluded.payload', row.id, row.savedAt, row.payload);
  }
  close() { return this.db.closeAsync(); }
}
