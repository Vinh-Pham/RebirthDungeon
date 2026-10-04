import { ActivityQueueSchema, emptyActivityQueue, type ActivityStorage } from './ActivityOutbox';
export async function createActivityStorage(): Promise<ActivityStorage> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('rebirth-online-activity', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('accounts');
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = request.onblocked = () => reject(new Error('Activity storage unavailable'));
  });
  return {
    update(key, transform) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('accounts', 'readwrite'),
          store = tx.objectStore('accounts');
        const read = store.get(key);
        let next = emptyActivityQueue();
        read.onsuccess = () => {
          try {
            next = ActivityQueueSchema.parse(
              transform(
                read.result ? ActivityQueueSchema.parse(read.result) : emptyActivityQueue(),
              ),
            );
            store.put(next, key);
          } catch {
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(next);
        tx.onabort = tx.onerror = () => reject(new Error('Activity storage unavailable'));
      });
    },
  };
}
