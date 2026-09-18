import { validateActorStats } from '../domain/stats/validate';
import { migrateSave } from '../domain/migration';
import { ranks, skills, skillRank } from '../domain/skillCatalog';
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
        s.version !== 2 ||
        s.data?.version !== 2 ||
        s.data.statsVersion !== 1 ||
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
        validateActorStats(c);
        for (const enemy of c.battle?.enemies ?? []) validateActorStats(enemy);
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
        if (
            !c.skills ||
            Array.isArray(c.skills) ||
            !c.skills.normal ||
            !Array.isArray(c.collection) ||
            new Set(c.collection).size !== c.collection.length ||
            c.collection.some((p) => !Number.isInteger(p) || p < 1 || p > 5) ||
            !c.effects ||
            !c.cooldowns
        )
            throw new Error('Invalid skill progression.');
        for (const [id, p] of Object.entries(c.skills)) {
            if (!skills[id] || !ranks.includes(p.rank) || !p.counts)
                throw new Error('Invalid skill rank.');
            for (const [oid, count] of Object.entries(p.counts)) {
                const objective = skillRank(id, p).objectives.find((o) => o.id === oid);
                if (!objective || !Number.isInteger(count) || count < 0 || count > objective.cap)
                    throw new Error('Invalid training count.');
            }
        }
        if (Object.values(c.cooldowns).some((n) => !Number.isInteger(n) || n < 0))
            throw new Error('Invalid cooldown.');
        if (
            c.battle?.dice.length &&
            (!c.battle.action ||
                c.battle.dice.length !== 5 ||
                c.battle.dice.some((n) => !Number.isInteger(n) || n < 1 || n > 6))
        )
            throw new Error('Invalid saved action.');
        if (
            c.run &&
            (!c.run.baseline ||
                c.run.baseline.contentVersion !== 2 ||
                !c.run.baseline.skills.normal)
        )
            throw new Error('Invalid run snapshot.');
        if (
            c.effects.final &&
            (!Number.isFinite(c.effects.final.magnitude) ||
                c.effects.final.magnitude < 0 ||
                !Number.isInteger(c.effects.final.remaining) ||
                c.effects.final.remaining < 1)
        )
            throw new Error('Invalid Final Hit status.');
        if (
            c.effects.counter &&
            (!Number.isFinite(c.effects.counter.power) ||
                c.effects.counter.power < 0 ||
                (c.effects.counter.opponentMultiplier !== undefined &&
                    (!Number.isFinite(c.effects.counter.opponentMultiplier) ||
                        c.effects.counter.opponentMultiplier < 0)) ||
                !Number.isFinite(c.effects.counter.multiplier) ||
                c.effects.counter.multiplier <= 0)
        )
            throw new Error('Invalid Counterattack status.');
        if (
            c.effects.defense &&
            ![c.effects.defense.defense, c.effects.defense.protection].every(
                (n) => Number.isFinite(n) && n >= 0,
            )
        )
            throw new Error('Invalid Defense status.');
        if (
            c.effects.manaShield &&
            (!Number.isFinite(c.effects.manaShield.efficiency) ||
                c.effects.manaShield.efficiency <= 0 ||
                !Number.isInteger(c.effects.manaShield.remaining) ||
                c.effects.manaShield.remaining < 1 ||
                !Number.isInteger(c.effects.manaShield.upkeep) ||
                c.effects.manaShield.upkeep < 0)
        )
            throw new Error('Invalid Mana Shield status.');
        if (c.battle?.action) {
            const a = c.battle.action;
            if (
                a.combatVersion !== 2 ||
                (a.statsVersion !== undefined && a.statsVersion !== 1) ||
                !skills[a.skill] ||
                skills[a.skill].type !== 'active' ||
                !ranks.includes(a.rank?.rank) ||
                !Number.isFinite(a.attack) ||
                a.attack < 0 ||
                !Array.isArray(a.targets) ||
                new Set(a.targets.map((t) => t.id)).size !== a.targets.length ||
                a.targets.some(
                    (t) =>
                        !c.battle!.enemies.some((e) => e.id === t.id) ||
                        !Number.isFinite(t.defense) ||
                        !Number.isFinite(t.protection),
                ) ||
                !a.costs ||
                Object.values(a.costs).some((n) => !Number.isSafeInteger(n) || n < 0) ||
                ['hp', 'mana', 'stamina'].some(
                    (k) => typeof a.costs[k as keyof typeof a.costs] !== 'number',
                ) ||
                !Number.isInteger(a.criticalChance) ||
                a.criticalChance < 0 ||
                a.criticalChance > 10000 ||
                !Number.isFinite(a.criticalBonus) ||
                a.criticalBonus < 0 ||
                (a.rank.attackMultiplier !== undefined &&
                    (!Number.isFinite(a.rank.attackMultiplier) || a.rank.attackMultiplier < 0)) ||
                (a.rank.counterMultiplier !== undefined &&
                    (!Number.isFinite(a.rank.counterMultiplier) || a.rank.counterMultiplier < 0)) ||
                a.rank.weights.length !== 6 ||
                a.rank.weights.some((n) => !Number.isSafeInteger(n) || n < 0) ||
                !a.rank.weights.some((n) => n > 0)
            )
                throw new Error('Invalid action snapshot.');
        }
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
    private legacySource?: unknown;
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
                    const migrated = migrateSave(r.result);
                    validateSave(migrated);
                    if (r.result.version === 1) this.legacySource = r.result;
                    resolve(migrated);
                } catch {
                    const previous = store.get('previous');
                    previous.onsuccess = () => {
                        try {
                            const migrated = migrateSave(previous.result);
                            validateSave(migrated);
                            if (previous.result.version === 1) this.legacySource = previous.result;
                            resolve(migrated);
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
                if (r.result) {
                    try {
                        validateSave(migrateSave(r.result));
                        store.put(r.result, 'previous');
                    } catch {
                        /* Keep the last valid fallback. */
                    }
                    if (this.legacySource || r.result.version === 1) {
                        const original = store.get('legacy-v1');
                        original.onsuccess = () => {
                            if (!original.result)
                                store.put(this.legacySource ?? r.result, 'legacy-v1');
                        };
                    }
                }
                store.put(JSON.parse(JSON.stringify(save)), 'current');
            };
            tx.oncomplete = () => {
                this.legacySource = undefined;
                resolve();
            };
            tx.onerror = () => reject(tx.error || new Error('Unable to save.'));
            tx.onabort = () => reject(tx.error || new Error('Saving was interrupted.'));
        });
    }
}
export class MemoryPersistence implements Persistence {
    value: SaveData | null = null;
    fail = false;
    async load() {
        const value = this.value && migrateSave(this.value);
        if (value) validateSave(value);
        return value;
    }
    async save(s: Immutable<SaveData>) {
        if (this.fail) throw new Error('Storage unavailable');
        this.value = JSON.parse(JSON.stringify(s));
    }
}
