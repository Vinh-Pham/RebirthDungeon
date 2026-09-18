import type { Immutable } from 'immer';
import type { SaveData } from '../domain/model';
export interface Persistence {
    load(): Promise<SaveData | null>;
    save(save: Immutable<SaveData>): Promise<void>;
}
export function validateSave(value: unknown): asserts value is SaveData {
    const s = value as SaveData;
    if (
        !s ||
        s.version !== 1 ||
        s.data?.version !== 1 ||
        s.checkpoint?.version !== 1 ||
        !Array.isArray(s.data.characters) ||
        s.data.characters.length > 20 ||
        !Number.isFinite(s.data.rng) ||
        !Number.isSafeInteger(s.data.revision) ||
        !Array.isArray(s.data.operations)
    )
        throw new Error('This save is damaged or from an unsupported version.');
    const ids = new Set<string>();
    for (const c of s.data.characters) {
        if (
            !c.id ||
            ids.has(c.id) ||
            !c.name ||
            !Array.isArray(c.inventory) ||
            !Array.isArray(c.bank) ||
            !c.stats ||
            ![c.hp, c.mana, c.stamina, c.gold, c.level].every(Number.isFinite)
        )
            throw new Error('This character save is damaged.');
        ids.add(c.id);
    }
    if (
        ![
            'Title',
            'CharacterSelect',
            'NewCharacter',
            'Town1',
            'Alby',
            'Battle',
            'TreasureRoom',
        ].includes(s.checkpoint.screen)
    )
        throw new Error('Unsupported scene checkpoint.');
}
export class IndexedDBPersistence implements Persistence {
    private db?: Promise<IDBDatabase>;
    private open() {
        return (this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
            const r = indexedDB.open('rebirth-dungeon', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('saves');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        }));
    }
    async load() {
        const db = await this.open();
        return new Promise<SaveData | null>((resolve, reject) => {
            const tx = db.transaction('saves', 'readonly');
            const store = tx.objectStore('saves'),
                r = store.get('current');
            r.onsuccess = () => {
                if (!r.result) {
                    resolve(null);
                    return;
                }
                try {
                    validateSave(r.result);
                    resolve(r.result);
                } catch {
                    const previous = store.get('previous');
                    previous.onsuccess = () => {
                        try {
                            validateSave(previous.result);
                            resolve(previous.result);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    previous.onerror = () => reject(previous.error);
                }
            };
            r.onerror = () => reject(r.error);
        });
    }
    async save(save: Immutable<SaveData>) {
        const db = await this.open();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('saves', 'readwrite'),
                store = tx.objectStore('saves');
            const r = store.get('current');
            r.onsuccess = () => {
                if (r.result) store.put(r.result, 'previous');
                store.put(JSON.parse(JSON.stringify(save)), 'current');
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('Unable to save.'));
            tx.onabort = () => reject(tx.error || new Error('Saving was interrupted.'));
        });
    }
}
export class MemoryPersistence implements Persistence {
    value: SaveData | null = null;
    fail = false;
    async load() {
        return this.value;
    }
    async save(s: Immutable<SaveData>) {
        if (this.fail) throw new Error('Storage unavailable');
        this.value = JSON.parse(JSON.stringify(s));
    }
}
