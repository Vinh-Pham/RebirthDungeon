import type { SaveRow, SaveSlot, SaveStorage } from './SaveRepository';
/** Browser storage avoids SQLite web's SharedArrayBuffer hosting requirement. */
export async function createSaveStorage(): Promise<SaveStorage> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('rebirth-dungeon', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('save_slots')) request.result.createObjectStore('save_slots', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open browser saves'));
    request.onblocked = () => reject(new Error('Close other game tabs to upgrade saves'));
  });
  function transaction<T>(mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('save_slots', mode); const request = execute(tx.objectStore('save_slots'));
      let value: T;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? new Error('Save transaction aborted'));
      tx.onerror = () => reject(tx.error ?? new Error('Save transaction failed'));
    });
  }
  return {
    read: (id: SaveSlot) => transaction<SaveRow | undefined>('readonly', (store) => store.get(id)),
    list: () => transaction<SaveRow[]>('readonly', (store) => store.getAll()),
    async write(row: SaveRow) { await transaction('readwrite', (store) => store.put(row)); },
    async close() { db.close(); },
  };
}
