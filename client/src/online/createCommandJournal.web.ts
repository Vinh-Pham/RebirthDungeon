import { PendingCommandSchema, type PendingCommand, type CommandJournal } from './CommandJournal';
export async function createCommandJournal(): Promise<CommandJournal> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('rebirth-online-commands', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pending');
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(new Error('Command recovery storage is unavailable.'));
    request.onblocked = () =>
      reject(new Error('Close other tabs to open command recovery storage.'));
  });
  const transaction = <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction('pending', mode);
      const request = operation(tx.objectStore('pending'));
      let value: T;
      request.onsuccess = () => {
        value = request.result;
      };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(new Error('Command recovery storage is unavailable.'));
    });
  return {
    async read(key) {
      const value = await transaction('readonly', (store) => store.get(key));
      return value === undefined ? undefined : PendingCommandSchema.parse(value);
    },
    async write(key, value: PendingCommand) {
      await transaction('readwrite', (store) => store.add(PendingCommandSchema.parse(value), key));
    },
    async clear(key, commandId) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('pending', 'readwrite');
        const store = tx.objectStore('pending');
        const request = store.get(key);
        request.onsuccess = () => {
          const value = request.result;
          if (
            value !== undefined &&
            PendingCommandSchema.parse(value).request.commandId === commandId
          )
            store.delete(key);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () =>
          reject(new Error('Command recovery storage is unavailable.'));
      });
    },
  };
}
