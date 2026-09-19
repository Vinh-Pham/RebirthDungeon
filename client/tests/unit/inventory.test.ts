import { act, settle } from './helpers/battle';

import { storeRaw } from './helpers/storage';
import { seedRng } from '../../src/domain/rng';
import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { waitFor } from 'xstate';
import { blankSave, reduceCommand, type Command } from '../../src/domain/commands';
import { items } from '../../src/domain/catalog';
import {
    addInventoryItem,
    consumeInventoryItem,
    equipReason,
    firstSpace,
    initializeInventory,
    moveReason,
    placementReason,
    validateInventory,
} from '../../src/domain/inventory';
import { emptyEquipment, type SaveData } from '../../src/domain/model';
import { migrateSave } from '../../src/domain/migration';
import { resolveStats } from '../../src/domain/stats/resolve';
import {
    MemoryPersistence,
    validateSave,
    IndexedDBPersistence,
} from '../../src/runtime/persistence';
import { makeActor } from '../../src/runtime/machines';
import 'fake-indexeddb/auto';
import { createMemory } from '../../src/domain/quests/roleplay';
let operation = 0;
const run = (s: SaveData, command: Command, id = `inventory:${++operation}`) =>
    reduceCommand(s, command, id) as SaveData;
function fresh() {
    let s = run(blankSave(), { type: 'NAV', screen: 'NewCharacter' });
    s = run(s, {
        type: 'CREATE',
        id: 'hero',
        now: 0,
        input: { name: 'Inventory', race: 'Human', age: 17, talent: 'Close Combat' },
    });
    return produce(s, (d) => {
        d.data.characters[0].gold = 10000;
    });
}
const hero = (s: SaveData) => s.data.characters[0];
const buy = (s: SaveData, kind: string) =>
    run(s, {
        type: 'BUY',
        kind,
        shop:
            items[kind].type === 'weapon' || items[kind].type === 'shield'
                ? 'Blacksmith'
                : 'General',
    });
const id = (s: SaveData, kind: string) => hero(s).inventory.find((i) => i.kind === kind)!.id;
function full(s: SaveData) {
    return produce(s, (d) => {
        const c = hero(d);
        c.inventory = c.inventory.filter((i) => Object.values(c.equipment).includes(i.id));
        c.inventory.push(
            ...Array.from({ length: 60 }, (_, n) => ({ id: `full:${n}`, kind: 'gem', count: 99 })),
        );
        initializeInventory(c);
    });
}
function legacy(s: SaveData, version = 3) {
    const old = JSON.parse(JSON.stringify(s));
    old.version = old.data.version = version;
    old.data.rng = 123;
    for (const c of old.data.characters) {
        const convert = (v: typeof c) => {
            v.weapon = v.equipment.main;
            v.offhand = v.equipment.offhand;
            v.armor = v.equipment.body;
            delete v.equipment;
            delete v.placements;
            delete v.inventoryRecovery;
        };
        convert(c);
        if (c.run?.baseline) convert(c.run.baseline);
        if (c.rp) {
            c.rp.rng = 7319;
            convert(c.rp.actor);
            convert(c.rp.actor.run.baseline);
        }
    }
    return old;
}
describe('backpack transactions', () => {
    it('places multi-cell items, keeps holes, rejects overlap and boundaries, and reloads positions', () => {
        let s = buy(fresh(), 'armor');
        const armor = id(s, 'armor');
        s = run(s, { type: 'MOVE_ITEM', id: armor, anchor: { column: 4, row: 7 } });
        expect(hero(s).placements[armor]).toEqual({ column: 4, row: 7 });
        for (const anchor of [
            { column: 5, row: 7 },
            { column: 4, row: 8 },
            { column: -1, row: 0 },
            { column: 0.5, row: 0 },
            { column: 0, row: 0 },
        ])
            expect(() => run(s, { type: 'MOVE_ITEM', id: armor, anchor })).toThrow();
        expect(moveReason(hero(s), armor, { column: 4, row: 7 })).toBe('');
        expect(moveReason(hero(s), 'missing', { column: 0, row: 0 })).toContain('not found');
        validateSave(JSON.parse(JSON.stringify(s)));
        expect(placementReason(hero(s), 'armor', { column: 4, row: 7 }, armor)).toBe('');
    });
    it('rejects fragmented space and failed grants without partial stacking, gold or bank changes', () => {
        let s = full(fresh());
        expect(firstSpace(hero(s), 'sword')).toBeUndefined();
        expect(() => buy(s, 'armor')).toThrow('space');
        s = produce(s, (d) => {
            hero(d).bank.push({ id: 'bank', kind: 'sword', count: 1 });
        });
        expect(() => run(s, { type: 'BANK_ITEM', id: 'bank', deposit: false })).toThrow('space');
        const c = structuredClone(hero(s));
        c.inventory[1] = { ...c.inventory[1], kind: 'hp', count: 98 };
        expect(() => addInventoryItem(c, { id: 'gift', kind: 'hp', count: 3 })).toThrow('space');
        expect(c.inventory[1].count).toBe(98);
        for (const n of [0, 2, 4, 12, 14, 16])
            s = run(s, { type: 'DROP_ITEM', id: `full:${n}`, quantity: 99 });
        expect(firstSpace(hero(s), 'armor')).toBeUndefined();
        expect(firstSpace(hero(s), 'hp')).toEqual({ column: 0, row: 0 });
    });
    it('discards exact quantities once, frees exhausted footprints, and rejects stale requests', () => {
        let s = fresh();
        const potion = id(s, 'hp');
        const before = s;
        for (const quantity of [0, -1, 0.5, 4, NaN])
            expect(() => run(s, { type: 'DROP_ITEM', id: potion, quantity })).toThrow('quantity');
        expect(() => run(s, { type: 'DROP_ITEM', id: 'hero-weapon', quantity: 1 })).toThrow(
            'Unequip',
        );
        s = run(s, { type: 'DROP_ITEM', id: potion, quantity: 2 }, 'discard-once');
        expect(run(s, { type: 'DROP_ITEM', id: potion, quantity: 2 }, 'discard-once')).toBe(s);
        expect(hero(s).inventory.find((i) => i.id === potion)!.count).toBe(1);
        s = run(s, { type: 'DROP_ITEM', id: potion, quantity: 1 });
        expect(hero(s).placements[potion]).toBeUndefined();
        expect(s.data.rng).toBe(before.data.rng);
        expect(() => run(s, { type: 'DROP_ITEM', id: potion, quantity: 1 })).toThrow('not found');
    });
    it('allows organization on a player turn, blocks between turns, and freezes equipment', () => {
        let s = run(fresh(), { type: 'ENTER', seed: 42 });
        s = run(s, { type: 'MOVE_ITEM', id: id(s, 'hp'), anchor: { column: 5, row: 9 } });
        s = settle(run(s, { type: 'ENCOUNTER', room: 1 }));
        const turn = hero(s).battle!.turn;
        s = run(s, { type: 'DROP_ITEM', id: id(s, 'hp'), quantity: 1 });
        expect(hero(s).battle!.turn).toBe(turn);
        expect(() => run(s, { type: 'UNEQUIP', id: 'hero-weapon' })).toThrow();
        expect(() =>
            run(s, { type: 'MOVE_ITEM', id: 'hero-weapon', anchor: { column: 2, row: 2 } }),
        ).toThrow('Unequip');
        s = act(s, 'defense');
        for (const cmd of [
            { type: 'MOVE_ITEM', id: id(s, 'hp'), anchor: { column: 2, row: 2 } },
            { type: 'DROP_ITEM', id: id(s, 'hp'), quantity: 1 },
        ] as Command[])
            expect(() => run(s, cmd)).toThrow();
        validateSave(s);
    });
});
describe('equipment', () => {
    it('equips every new slot with unique instances and counts bonuses once without healing', () => {
        let s = fresh();
        const base = resolveStats(hero(s)).values;
        for (const kind of [
            'clothCap',
            'clothGloves',
            'travelerBoots',
            'travelerRobe',
            'copperCharm',
        ]) {
            s = buy(s, kind);
            s = run(s, { type: 'EQUIP', id: id(s, kind) });
        }
        s = buy(s, 'copperCharm');
        const second = hero(s).inventory.filter((i) => i.kind === 'copperCharm')[1].id;
        s = run(s, { type: 'EQUIP', id: second, slot: 'accessory2' });
        expect(resolveStats(hero(s)).values.defense).toBe(base.defense + 3);
        expect(resolveStats(hero(s)).values.magicDefense).toBe(base.magicDefense + 1);
        expect(resolveStats(hero(s)).values.luck).toBe(base.luck + 2);
        const hp = hero(s).hp;
        s = buy(s, 'vigorCoat');
        s = run(s, { type: 'EQUIP', id: id(s, 'vigorCoat') });
        expect(hero(s).hp).toBe(hp);
        expect(hero(s).placements[second]).toBeUndefined();
        s = run(s, { type: 'EQUIP', id: second, slot: 'accessory2' });
        validateSave(s);
    });
    it('allows ownership but rejects incompatible races, wrong slots and non-equipment', () => {
        let s = buy(fresh(), 'woodlandCharm');
        const charm = id(s, 'woodlandCharm');
        expect(equipReason(hero(s), charm, 'accessory1')).toBe('Requires Elf.');
        expect(() => run(s, { type: 'EQUIP', id: charm })).toThrow('Requires Elf');
        expect(() => run(s, { type: 'EQUIP', id: 'hero-weapon', slot: 'head' })).toThrow(
            'does not fit',
        );
        expect(() => run(s, { type: 'EQUIP', id: id(s, 'hp') })).toThrow();
        expect(equipReason(hero(s), 'missing', 'head')).toContain('not found');
        s = produce(s, (d) => {
            hero(d).race = 'Elf';
        });
        s = run(s, { type: 'EQUIP', id: charm });
        validateSave(s);
    });
    it('exchanges gear into the vacated area and atomically returns incompatible off-hand gear', () => {
        let s = buy(buy(fresh(), 'shield'), 'wand');
        s = run(s, { type: 'EQUIP', id: id(s, 'shield') });
        const wand = id(s, 'wand'),
            origin = hero(s).placements[wand];
        s = run(s, { type: 'EQUIP', id: wand });
        expect(hero(s).equipment.offhand).toBeNull();
        expect(hero(s).placements['hero-weapon']).toEqual(origin);
        expect(hero(s).placements[id(s, 'shield')]).toBeDefined();
        s = run(s, { type: 'EQUIP', id: 'hero-weapon' });
        s = run(s, { type: 'EQUIP', id: id(s, 'shield') });
        s = run(s, { type: 'UNEQUIP', id: 'hero-weapon', anchor: { column: 5, row: 7 } });
        expect(hero(s).equipment.main).toBeNull();
        expect(hero(s).equipment.offhand).toBeNull();
        validateSave(s);
    });
    it('rejects full-backpack unequip, unavailable slots, and sale/deposit/drop of new equipped gear', () => {
        let s = buy(fresh(), 'clothCap');
        const cap = id(s, 'clothCap');
        s = run(s, { type: 'EQUIP', id: cap });
        s = full(s);
        expect(() => run(s, { type: 'UNEQUIP', id: cap })).toThrow('space');
        for (const cmd of [
            { type: 'SELL', id: cap },
            { type: 'BANK_ITEM', id: cap, deposit: true },
            { type: 'DROP_ITEM', id: cap, quantity: 1 },
        ] as Command[])
            expect(() => run(s, cmd)).toThrow('Unequip');
        expect(() => run(s, { type: 'UNEQUIP', id: 'full:0' })).toThrow('not equipped');
        expect(() => run(s, { type: 'EQUIP', id: 'hero-weapon', slot: 'offhand' })).toThrow();
    });
});
describe('save compatibility', () => {
    it('migrates actual schema-three ownership, preserving crowded inventory through recovery', () => {
        const old = legacy(fresh());
        old.data.characters[0].inventory.push(
            ...Array.from({ length: 29 }, (_, n) => ({ id: `old:${n}`, kind: 'armor', count: 1 })),
        );
        const s = migrateSave(old);
        validateSave(s);
        expect(s.version).toBe(5);
        expect(hero(s).inventoryRecovery.length).toBeGreaterThan(0);
        expect(hero(s).inventory.length + hero(s).inventoryRecovery.length).toBe(32);
        expect(hero(s).equipment.main).toBe('hero-weapon');
        expect(migrateSave(s)).toBe(s);
        expect(old.version).toBe(3);
        let next = s;
        const recovery = hero(next).inventoryRecovery[0];
        expect(() => run(next, { type: 'WITHDRAW_RECOVERY', id: recovery.id })).toThrow('space');
        for (const item of hero(next)
            .inventory.filter((i) => i.kind === 'armor')
            .slice(0, 2))
            next = run(next, { type: 'DROP_ITEM', id: item.id, quantity: 1 });
        next = run(next, { type: 'WITHDRAW_RECOVERY', id: recovery.id });
        validateSave(next);
        expect(() => run(next, { type: 'WITHDRAW_RECOVERY', id: recovery.id })).toThrow(
            'not found',
        );
    });
    it('migrates a battle while preserving HP and frozen stat sources', () => {
        const s = settle(
            run(run(fresh(), { type: 'ENTER', seed: 42 }), { type: 'ENCOUNTER', room: 1 }),
        );
        const old = legacy(s);
        const migrated = migrateSave(old);
        validateSave(migrated);
        expect(hero(migrated).battle!.enemies.map((e) => e.hp)).toEqual(
            hero(s).battle!.enemies.map((e) => e.hp),
        );
        expect(hero(migrated).run!.baseline!.statSnapshot).toEqual(
            hero(s).run!.baseline!.statSnapshot,
        );
        expect(migrated.data.rng).toEqual(seedRng(123));
    });
    it('migrates isolated RP inventory without changing the borrowed loadout or simulation', () => {
        const s = produce(fresh(), (d) => {
            hero(d).quests.records['arens-expedition'] = { status: 'active', stage: 0, counts: {} };
            hero(d).rp = createMemory('legacy-rp');
            d.checkpoint = { version: 1, screen: 'Alby', phase: 'exploring' };
        });
        const migrated = migrateSave(legacy(s));
        validateSave(migrated);
        expect(hero(migrated).rp!.actor.equipment).toEqual(hero(s).rp!.actor.equipment);
        expect(hero(migrated).rp!.rng).toEqual(seedRng(7319));
        expect(hero(migrated).inventory).toEqual(hero(s).inventory);
    });
    it('rejects overlapping, missing and orphaned placements, duplicate ownership and invalid loadouts', () => {
        const s = fresh();
        const corruptions = [
            (c: ReturnType<typeof hero>) => {
                c.placements['hero-hp'] = c.placements['hero-stamina'];
            },
            (c: ReturnType<typeof hero>) => {
                delete c.placements['hero-hp'];
            },
            (c: ReturnType<typeof hero>) => {
                c.placements.ghost = { column: 0, row: 0 };
            },
            (c: ReturnType<typeof hero>) => {
                c.placements['hero-weapon'] = { column: 3, row: 0 };
            },
            (c: ReturnType<typeof hero>) => {
                c.bank.push({ ...c.inventory[0] });
            },
            (c: ReturnType<typeof hero>) => {
                c.equipment.head = 'hero-weapon';
            },
            (c: ReturnType<typeof hero>) => {
                c.inventory[0].count = 2;
            },
            (c: ReturnType<typeof hero>) => {
                c.inventory[0].durability = 21;
            },
            (c: ReturnType<typeof hero>) => {
                c.inventory[0].kind = 'unknown';
            },
            (c: ReturnType<typeof hero>) => {
                c.inventoryRecovery = null!;
            },
        ];
        for (const mutate of corruptions)
            expect(() => validateSave(produce(s, (d) => mutate(hero(d))))).toThrow();
        const c = structuredClone(hero(s));
        c.equipment = emptyEquipment();
        expect(() => validateInventory(c)).toThrow();
        expect(() => consumeInventoryItem(c, 'missing')).toThrow();
        expect(() => addInventoryItem(c, { ...c.inventory[0] })).toThrow('Duplicate');
    });
    it('rolls back failed storage and retries a discard exactly once', async () => {
        const persistence = new MemoryPersistence();
        persistence.value = fresh();
        const actor = makeActor(persistence);
        actor.start();
        await waitFor(actor, (s) => s.matches('Town1'));
        const before = actor.getSnapshot().context.save;
        persistence.fail = true;
        actor.send({
            type: 'COMMAND',
            command: { type: 'DROP_ITEM', id: 'hero-hp', quantity: 2 },
            operationId: 'discard',
        });
        await waitFor(actor, (s) => !!s.context.error);
        expect(actor.getSnapshot().context.save).toBe(before);
        persistence.fail = false;
        actor.send({
            type: 'COMMAND',
            command: { type: 'DROP_ITEM', id: 'hero-hp', quantity: 2 },
            operationId: 'discard',
        });
        await waitFor(actor, (s) => s.context.save !== before);
        expect(hero(persistence.value!).inventory.find((i) => i.id === 'hero-hp')!.count).toBe(1);
        actor.stop();
    });
    it('retains a version-three backup while saving the migrated bundle', async () => {
        const p = new IndexedDBPersistence();
        const old = legacy(fresh());
        await storeRaw(old);
        const s = (await p.load())!;
        await p.save(s);
        const backup = await new Promise<unknown>((resolve) => {
            const request = indexedDB.open('rebirth-dungeon', 1);
            request.onsuccess = () => {
                const db = request.result;
                const read = db.transaction('saves').objectStore('saves').get('legacy-v3');
                read.onsuccess = () => {
                    resolve(read.result);
                    db.close();
                };
            };
        });
        expect(backup).toEqual(old);
    });
});