import type { SaveRow, SaveSlot, SaveStorage } from './SaveRepository';
import type { AudioSettings } from '../audio/AudioManager';
import type { AudioSettingsStorage } from './AudioSettingsRepository';
import { CharacterProfileSchema, importedCharacter, type CharacterProfile, type CompleteCharacter, type CharacterStorage } from './CharacterProfile';
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: (string | number)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: (string | number)[]): Promise<T[]>;
  closeAsync(): Promise<void>;
}
/** SQL stays testable without importing Expo into headless tests. */
export class SQLiteSaveStorage implements SaveStorage, CharacterStorage, AudioSettingsStorage {
  constructor(private db: SqlDatabase, private characterId = 'legacy') {}
  async initialize() {
    const row = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) > 3) throw new Error('Save database is newer than this app');
    // Idempotent schema migration, committed atomically with its version marker.
    await this.db.execAsync('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    if ((row?.user_version ?? 0) < 2) {
      await this.db.execAsync(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS save_slots (id TEXT PRIMARY KEY NOT NULL, savedAt TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS character_saves (characterId TEXT NOT NULL, id TEXT NOT NULL, savedAt TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(characterId, id));`);
      try {
        await this.db.runAsync("INSERT OR IGNORE INTO characters (id, payload) SELECT 'legacy', ? WHERE EXISTS (SELECT 1 FROM save_slots)", JSON.stringify(importedCharacter()));
        await this.db.execAsync(`INSERT OR IGNORE INTO character_saves (characterId, id, savedAt, payload) SELECT 'legacy', id, savedAt, payload FROM save_slots;
          PRAGMA user_version = 2; COMMIT;`);
      } catch (error) { await this.db.execAsync('ROLLBACK;'); throw error; }
    }
    if ((row?.user_version ?? 0) < 3) {
      await this.db.execAsync('BEGIN IMMEDIATE;');
      try {
        await this.db.execAsync(`CREATE TABLE IF NOT EXISTS app_settings (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
          PRAGMA user_version = 3; COMMIT;`);
      } catch (error) { await this.db.execAsync('ROLLBACK;'); throw error; }
    }
    return this;
  }
  async readAudioSettings() {
    const row = await this.db.getFirstAsync<{ payload: string }>("SELECT payload FROM app_settings WHERE id = 'audio'");
    return row ? JSON.parse(row.payload) as unknown : undefined;
  }
  async writeAudioSettings(settings: AudioSettings) {
    await this.db.runAsync("INSERT INTO app_settings (id, payload) VALUES ('audio', ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload", JSON.stringify(settings));
  }
  read(id: SaveSlot) { return this.readSave(this.characterId, id); }
  list() { return this.listSaves(this.characterId); }
  async readSave(characterId: string, id: SaveSlot) { return (await this.db.getFirstAsync<SaveRow>('SELECT id, savedAt, payload FROM character_saves WHERE characterId = ? AND id = ?', characterId, id)) ?? undefined; }
  listSaves(characterId: string) { return this.db.getAllAsync<SaveRow>('SELECT id, savedAt, payload FROM character_saves WHERE characterId = ? ORDER BY id', characterId); }
  async write(row: SaveRow) {
    await this.db.runAsync('INSERT INTO character_saves (characterId, id, savedAt, payload) VALUES (?, ?, ?, ?) ON CONFLICT(characterId, id) DO UPDATE SET savedAt = excluded.savedAt, payload = excluded.payload', this.characterId, row.id, row.savedAt, row.payload);
  }
  async listProfiles() {
    const rows = await this.db.getAllAsync<{ payload: string }>('SELECT payload FROM characters ORDER BY rowid');
    return rows.map((row) => CharacterProfileSchema.parse(JSON.parse(row.payload)));
  }
  async readProfile(id: string): Promise<CharacterProfile | undefined> {
    const row = await this.db.getFirstAsync<{ payload: string }>('SELECT payload FROM characters WHERE id = ?', id);
    return row ? CharacterProfileSchema.parse(JSON.parse(row.payload)) : undefined;
  }
  async createProfile(profile: CompleteCharacter, save: SaveRow) {
    await this.db.execAsync('BEGIN IMMEDIATE;');
    try {
      await this.db.runAsync('INSERT INTO characters (id, payload) VALUES (?, ?)', profile.id, JSON.stringify(profile));
      await this.db.runAsync('INSERT INTO character_saves (characterId, id, savedAt, payload) VALUES (?, ?, ?, ?)', profile.id, save.id, save.savedAt, save.payload);
      await this.db.execAsync('COMMIT;');
    } catch (error) { await this.db.execAsync('ROLLBACK;'); throw error; }
  }
  async updateProfile(profile: CompleteCharacter) {
    await this.db.runAsync('UPDATE characters SET payload = ? WHERE id = ?', JSON.stringify(profile), profile.id);
  }
  close() { return this.db.closeAsync(); }
}
