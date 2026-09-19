/** Test-only raw writes simulate legacy versions and storage corruption at the boundary. */
export async function storeRaw(value: unknown, key = 'current') {
    await import('fake-indexeddb/auto');
    return new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('rebirth-dungeon', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('saves');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('saves', 'readwrite');
            tx.objectStore('saves').put(value, key);
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        };
    });
}