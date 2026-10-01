import type { SaveRow, SaveSlot } from './SaveRepository';
import { CharacterProfileSchema, importedCharacter, type CharacterStorage } from './CharacterProfile';
import type { AudioSettingsStorage } from './AudioSettingsRepository';

/** Keep browser saves in IndexedDB; legacy rows remain as a recovery copy. */
export async function createSaveStorage(characterId = 'legacy'): Promise<CharacterStorage & AudioSettingsStorage> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open('rebirth-dungeon', 3);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (event.oldVersion < 3) database.createObjectStore('app_settings');
      if (event.oldVersion >= 2) return;
      if (!database.objectStoreNames.contains('save_slots')) database.createObjectStore('save_slots', { keyPath: 'id' });
      const profiles = database.createObjectStore('characters', { keyPath: 'id' });
      const saves = database.createObjectStore('character_saves', { keyPath: ['characterId', 'id'] });
      saves.createIndex('characterId', 'characterId');
      const legacy = request.transaction!.objectStore('save_slots').openCursor();
      let imported = false;
      legacy.onsuccess = () => {
        const cursor = legacy.result;
        if (!cursor) return;
        if (!imported) { profiles.add(importedCharacter()); imported = true; }
        saves.add({ ...cursor.value, characterId: 'legacy' });
        cursor.continue();
      };
    };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to open browser saves'));
    request.onblocked = () => { blocked = true; reject(new Error('Close other game tabs to upgrade saves')); };
  });
  function transaction<T>(stores: string[], mode: IDBTransactionMode, execute: (tx: IDBTransaction) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value: T;
      try {
        const request = execute(tx);
        request.onsuccess = () => { value = request.result; };
      } catch (error) { tx.abort(); reject(error); return; }
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? new Error('Save transaction aborted'));
      tx.onerror = () => reject(tx.error ?? new Error('Save transaction failed'));
    });
  }
  const readSave = async (id: string, slot: SaveSlot) => transaction<SaveRow | undefined>(['character_saves'], 'readonly', (tx) => tx.objectStore('character_saves').get([id, slot]));
  const listSaves = async (id: string) => transaction<SaveRow[]>(['character_saves'], 'readonly', (tx) => tx.objectStore('character_saves').index('characterId').getAll(id));
  return {
    readAudioSettings: () => transaction<unknown>(['app_settings'], 'readonly', (tx) => tx.objectStore('app_settings').get('audio')),
    async writeAudioSettings(settings) { await transaction(['app_settings'], 'readwrite', (tx) => tx.objectStore('app_settings').put(settings, 'audio')); },
    read: (slot) => readSave(characterId, slot), list: () => listSaves(characterId), readSave, listSaves,
    async write(row) { await transaction(['character_saves'], 'readwrite', (tx) => tx.objectStore('character_saves').put({ ...row, characterId })); },
    async listProfiles() {
      const profiles = await transaction<unknown[]>(['characters'], 'readonly', (tx) => tx.objectStore('characters').getAll());
      return profiles.map((profile) => CharacterProfileSchema.parse(profile));
    },
    async readProfile(id) {
      const profile = await transaction<unknown>(['characters'], 'readonly', (tx) => tx.objectStore('characters').get(id));
      return profile ? CharacterProfileSchema.parse(profile) : undefined;
    },
    async createProfile(profile, initialSave) {
      await transaction(['characters', 'character_saves'], 'readwrite', (tx) => {
        tx.objectStore('characters').add(profile);
        return tx.objectStore('character_saves').add({ ...initialSave, characterId: profile.id });
      });
    },
    async updateProfile(profile) {
      await transaction(['characters'], 'readwrite', (tx) => {
        const store = tx.objectStore('characters');
        const request = store.get(profile.id);
        request.onsuccess = () => { if (request.result) store.put(profile); else tx.abort(); };
        // Return a separate request so the transaction helper does not replace this handler.
        return store.count(profile.id);
      });
    },
    async close() { db.close(); },
  };
}
