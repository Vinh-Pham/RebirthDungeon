import { initializeInventory } from '../../src/domain/inventory';
import { talentSkill } from '../../src/domain/catalog';
import { it, expect } from 'vitest';
import { produce } from 'immer';
import { waitFor } from 'xstate';
import {
    blankSave,
    reduceCommand,
    active,
    allowed,
    addItem,
    type Command,
} from '../../src/domain/commands';
import { attackDamage } from '../../src/domain/dice';
import { applyAging, gainXp, rebirth } from '../../src/domain/progression';
import { findPath } from '../../src/domain/dungeon';
import { enemyDamage } from '../../src/domain/behavior';
import { makeActor } from '../../src/runtime/machines';
import {
    MemoryPersistence,
    IndexedDBPersistence,
    validateSave,
} from '../../src/runtime/persistence';
import type { SaveData, Talent, Race } from '../../src/domain/model';
import 'fake-indexeddb/auto';
let op = 10000;
const run = (s: SaveData, c: Command) => reduceCommand(s, c, String(++op)) as SaveData;
function fixture(race: Race = 'Human', talent: Talent = 'Close Combat') {
    return run(run(blankSave(), { type: 'NAV', screen: 'NewCharacter' }), {
        type: 'CREATE',
        input: { name: 'Aster', race, talent, age: 10 },
        id: 'aster',
        now: 0,
    });
}
const edit = (s: SaveData, fn: (s: SaveData) => void) => produce(s, fn);
it('rejects invalid characters, settings, missing targets and empty operations', () => {
    let s = run(blankSave(), { type: 'NAV', screen: 'NewCharacter' });
    for (const input of [
        { name: 'a', race: 'Human', age: 10, talent: 'Magic' },
        { name: 'Aster', race: 'Giant', age: 10, talent: 'Archery' },
        { name: 'Aster', race: 'Human', age: 9, talent: 'Magic' },
        { name: 'Aster', race: 'Human', age: 10.5, talent: 'Magic' },
    ])
        expect(() => run(s, { type: 'CREATE', input: input as any, id: 'x', now: 0 })).toThrow();
    s = run(fixture(), { type: 'NAV', screen: 'NewCharacter' });
    expect(() =>
        run(s, {
            type: 'CREATE',
            input: { name: 'ASTER', race: 'Human', age: 10, talent: 'Magic' },
            id: 'z',
            now: 0,
        }),
    ).toThrow('unique');
    expect(() =>
        run(s, {
            type: 'CREATE',
            input: { name: 'Other', race: 'Human', age: 10, talent: 'Magic' },
            id: 'aster',
            now: 0,
        }),
    ).toThrow('already');
    s = run(s, { type: 'NAV', screen: 'CharacterSelect' });
    expect(() => run(s, { type: 'PLAY', id: 'missing', now: 0 })).toThrow();
    expect(() =>
        run(s, {
            type: 'REBIRTH',
            id: 'aster',
            age: 10,
            talent: 'invalid' as Talent,
            now: 86400000,
        }),
    ).toThrow();
    for (const settings of [{ music: -1 }, { effects: NaN }, { hudScale: 0.1 }])
        expect(() => run(s, { type: 'SETTINGS', settings })).toThrow();
    s = run(s, {
        type: 'SETTINGS',
        settings: { music: 0.5, effects: 0.6, hudScale: 1.2, reducedMotion: true },
    });
    expect(s.data.settings.music).toBe(0.5);
    expect(active(blankSave())).toBeUndefined();
    expect(allowed(blankSave(), { type: 'ABANDON' })).toBe(false);
    expect(() =>
        run(
            edit(blankSave(), (s) => {
                s.checkpoint.screen = 'Town1';
            }),
            { type: 'HEAL' },
        ),
    ).toThrow('Select');
});
it('transactions reject insufficient funds, unknown items and equipped bank deposits', () => {
    let s = fixture();
    for (const c of [
        { type: 'BUY', shop: 'Blacksmith', kind: 'steel' },
        { type: 'BUY', shop: 'missing', kind: 'silk' },
        { type: 'SELL', id: 'missing' },
        { type: 'USE', id: 'missing' },
        { type: 'USE', id: 'aster-weapon' },
        { type: 'EQUIP', id: 'missing' },
        { type: 'EQUIP', id: 'aster-hp' },
        { type: 'REPAIR', id: 'aster-hp' },
        { type: 'BANK_ITEM', id: 'missing', deposit: true },
        { type: 'BANK_ITEM', id: 'aster-weapon', deposit: true },
    ] as Command[])
        expect(() => run(s, c)).toThrow();
    s = run(s, { type: 'BUY', shop: 'General', kind: 'armor' });
    const armor = active(s)!.inventory.find((i) => i.kind === 'armor')!;
    s = run(s, { type: 'EQUIP', id: armor.id });
    expect(active(s)!.equipment.body).toBe(armor.id);
    s = run(s, { type: 'UNEQUIP', id: armor.id });
    s = run(s, { type: 'SELL', id: armor.id });
    expect(active(s)!.inventory.some((i) => i.kind === 'armor')).toBe(false);
    s = edit(s, (s) => {
        s.data.characters[0].gold = 0;
        s.data.characters[0].inventory[0].durability = 0;
        if (s.data.characters[0].battle) delete s.data.characters[0].battle!.action;
    });
    expect(() => run(s, { type: 'HEAL' })).toThrow();
    expect(() => run(s, { type: 'REPAIR', id: 'aster-weapon' })).toThrow();
    const giant = fixture('Giant');
    const ownsBow = run(giant, { type: 'BUY', shop: 'Blacksmith', kind: 'bow' });
    expect(() =>
        run(ownsBow, {
            type: 'EQUIP',
            id: active(ownsBow)!.inventory.find((i) => i.kind === 'bow')!.id,
        }),
    ).toThrow('Requires');
    expect(active(fixture('Elf'))!.inventory[0].kind).toBe('mace');
});
it('stack limits fail atomically and banks preserve item quantities', () => {
    const rows: any[] = [{ id: 'a', kind: 'silk', count: 98 }];
    addItem(rows, { id: 'b', kind: 'silk', count: 4 }, 2);
    expect(rows.map((i) => i.count)).toEqual([99, 3]);
    expect(() => addItem([], { id: 'x', kind: 'unknown', count: 1 }, 30)).toThrow();
    expect(() => addItem([], { id: 'x', kind: 'silk', count: 0 }, 30)).toThrow();
    let s = fixture();
    s = run(s, { type: 'BANK_ITEM', id: 'aster-hp', deposit: true });
    expect(active(s)!.bank[0].count).toBe(3);
    s = run(s, { type: 'BANK_ITEM', id: active(s)!.bank[0].id, deposit: false });
    expect(active(s)!.inventory.find((i) => i.kind === 'hp')!.count).toBe(3);
    s = edit(s, (s) => {
        s.data.characters[0].inventory = Array.from({ length: 60 }, (_, i) => ({
            id: String(i),
            kind: 'gem',
            count: 99,
        }));
        s.data.characters[0].equipment.main = null;
        initializeInventory(s.data.characters[0]);
    });
    const original = s;
    expect(() => run(s, { type: 'BUY', shop: 'Grocery', kind: 'bread' })).toThrow('space');
    expect(s).toBe(original);
});
it('supplies, invalid encounters, position boundaries, abandonment and selected rewards', () => {
    let s = run(fixture(), { type: 'ENTER', seed: 7 });
    s = run(s, { type: 'POSITION', x: NaN, y: 0 });
    const pos = active(s)!.run!.x;
    s = run(s, { type: 'POSITION', x: 0, y: 0 });
    expect(active(s)!.run!.x).toBe(pos);
    const r = active(s)!.run!.rooms[1];
    s = run(s, { type: 'POSITION', x: r.x * 32, y: r.y * 32 });
    expect(active(s)!.run!.x).toBe(r.x * 32);
    for (const room of [0, 99]) expect(() => run(s, { type: 'ENCOUNTER', room })).toThrow();
    s = run(s, { type: 'ENCOUNTER', room: 5 });
    expect(s.checkpoint.phase).toBe('reward');
    s = run(s, { type: 'CLAIM', ids: ['missing', active(s)!.reward!.items[0].id], gold: false });
    expect(active(s)!.reward!.claimed).toHaveLength(1);
    s = run(s, { type: 'LEAVE_REWARD' });
    expect(() => run(s, { type: 'ENCOUNTER', room: 5 })).toThrow();
    s = run(s, { type: 'ABANDON' });
    expect(active(s)!.run).toBeNull();
});
it('combat guards, recovery, defeat and unarmed or broken-weapon damage', () => {
    let s = run(fixture(), { type: 'ENTER', seed: 1 });
    s = run(s, { type: 'ENCOUNTER', room: 1 });
    for (const cmd of [
        { type: 'ROLL', skill: 'unknown', target: 'enemy-0' },
        { type: 'ROLL', skill: 'normal', target: 'missing' },
    ] as Command[])
        expect(() => run(s, cmd)).toThrow();
    s = run(s, { type: 'RECOVER' });
    expect(active(s)!.battle!.turn).toBe(2);
    s = run(s, { type: 'USE', id: 'aster-hp' });
    expect(active(s)!.battle!.turn).toBe(3);
    s = run(s, { type: 'ROLL', skill: 'normal', target: 'enemy-0' });
    expect(() => run(s, { type: 'HOLD', index: -1 })).toThrow();
    for (let index = 0; index < 5; index++) s = run(s, { type: 'HOLD', index });
    expect(() => run(s, { type: 'REROLL' })).toThrow();
    const c = active(s)!,
        enemy = c.battle!.enemies[0];
    const damage = attackDamage(c, enemy, 'normal', [1, 1, 1, 1, 1]);
    const broken = edit(s, (s) => {
        s.data.characters[0].inventory[0].durability = 0;
        if (s.data.characters[0].battle) delete s.data.characters[0].battle!.action;
    });
    expect(attackDamage(active(broken)!, enemy, 'normal', [1, 1, 1, 1, 1])).toBeLessThan(damage);
    const unarmed = edit(s, (s) => {
        s.data.characters[0].equipment.main = null;
    });
    expect(attackDamage(active(unarmed)!, enemy, 'normal', [1, 1, 1, 1, 1])).toBeGreaterThan(0);
    expect(() => attackDamage(c, enemy, 'missing', [1, 1, 1, 1, 1])).toThrow();
    const invalid = edit(s, (s) => {
        s.data.characters[0].stamina = 0;
    });
    expect(() => run(invalid, { type: 'ATTACK' })).toThrow();
    s = edit(s, (s) => {
        s.checkpoint.phase = 'selecting';
        s.data.characters[0].hp = 1;
    });
    s = run(s, { type: 'RECOVER' });
    expect(s.checkpoint.screen).toBe('Town1');
    expect(active(s)!.hp).toBe(active(s)!.stats.hp);
    expect(enemyDamage(10, 20, 1)).toBe(0);
    expect(enemyDamage(10, 0, 0)).toBe(0);
});
it.each(['Magic', 'Archery', 'Dual Gun'] as Talent[])(
    'talent %s has deterministic attack and growth',
    (talent) => {
        let s = run(fixture('Human', talent), { type: 'LEARN', skill: talentSkill[talent] });
        s = run(s, { type: 'ENTER', seed: 1 });
        s = run(s, { type: 'ENCOUNTER', room: 1 });
        const c = active(s)!;
        s = run(s, { type: 'ROLL', skill: talentSkill[talent], target: 'enemy-0' });
        expect(
            attackDamage(c, c.battle!.enemies[0], talentSkill[talent], [2, 2, 2, 3, 3]),
        ).toBeGreaterThan(0);
        s = run(s, { type: 'ATTACK' });
        const ch = structuredClone(active(s)!);
        gainXp(ch, 1000);
        expect(ch.level).toBeGreaterThan(1);
        ch.level = 199;
        gainXp(ch, Number.MAX_SAFE_INTEGER);
        expect(ch.level).toBe(200);
        expect(ch.xp).toBe(0);
        applyAging(ch, 86400000 * 8);
        expect(ch.age).toBeGreaterThan(10);
    },
);
it('rebirth rejects active dungeons and invalid ages or races', () => {
    const c = structuredClone(active(fixture())!);
    rebirth(c, 'Magic', 10, 86400000);
    expect(c.level).toBe(1);
    expect(() => rebirth(c, 'Magic', 18, 3 * 86400000)).toThrow();
    const giant = structuredClone(active(fixture('Giant'))!);
    expect(() => rebirth(giant, 'Archery', 10, 86400000)).toThrow();
    const runCharacter = structuredClone(active(run(fixture(), { type: 'ENTER', seed: 1 }))!);
    expect(() => rebirth(runCharacter, 'Magic', 10, 86400000)).toThrow();
    expect(findPath([[1, 0, 1]], { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([]);
});
it('save validation rejects malformed IDs, nonfinite resources and invalid scenes', () => {
    const s = fixture();
    for (const invalid of [
        edit(s, (s) => {
            s.data.characters.push(s.data.characters[0]);
        }),
        edit(s, (s) => {
            s.data.characters[0].hp = NaN;
        }),
        edit(s, (s) => {
            s.checkpoint.screen = 'Unknown' as any;
        }),
    ])
        expect(() => validateSave(invalid)).toThrow();
});
it('machine routes every checkpoint and exposes loading failures', async () => {
    for (const [screen, phase] of [
        ['CharacterSelect', 'exploring'],
        ['NewCharacter', 'exploring'],
        ['Town1', 'exploring'],
        ['Alby', 'exploring'],
        ['Battle', 'selecting'],
        ['Battle', 'choosingDice'],
        ['Battle', 'reward'],
        ['TreasureRoom', 'treasure'],
        ['TreasureRoom', 'reward'],
    ] as const) {
        const p = new MemoryPersistence();
        p.value = edit(fixture(), (s) => {
            s.checkpoint.screen = screen;
            s.checkpoint.phase = phase;
        });
        const a = makeActor(p).start();
        await waitFor(a, (s) => !s.matches('loading'));
        expect(a.getSnapshot().matches(screen)).toBe(true);
        a.send({ type: 'DISMISS' });
        a.stop();
    }
    const a = makeActor({
        load: async () => {
            throw new Error('damaged');
        },
        save: async () => {},
    }).start();
    await waitFor(a, (s) => s.matches('failure'));
    expect(a.getSnapshot().context.error).toContain('damaged');
    a.stop();
});
it('IndexedDB restores its prior snapshot when the current one is damaged', async () => {
    const p = new IndexedDBPersistence(),
        s = fixture();
    await p.save(s);
    await p.save(run(s, { type: 'SETTINGS', settings: { music: 0.9 } }));
    await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('rebirth-dungeon', 1);
        req.onsuccess = () => {
            const tx = req.result.transaction('saves', 'readwrite');
            tx.objectStore('saves').put({ version: 999 }, 'current');
            tx.oncomplete = () => {
                req.result.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        };
    });
    expect(await p.load()).toEqual(s);
});
it('combat actors serialize rolling and enemy resolution before publishing a save', async () => {
    const p = new MemoryPersistence();
    p.value = run(run(fixture(), { type: 'ENTER', seed: 2 }), { type: 'ENCOUNTER', room: 1 });
    const actor = makeActor(p).start();
    await waitFor(actor, (s) => s.matches('Battle'));
    const initial = actor.getSnapshot().context.save;
    actor.send({
        type: 'COMMAND',
        command: { type: 'ROLL', skill: 'normal', target: 'enemy-0' },
        operationId: 'roll',
    });
    expect(actor.getSnapshot().matches('rolling')).toBe(true);
    expect(actor.getSnapshot().context.save).toBe(initial);
    actor.send({ type: 'COMMAND', command: { type: 'ATTACK' }, operationId: 'premature' });
    await waitFor(actor, (s) => s.matches({ Battle: 'choosingDice' }));
    expect(actor.getSnapshot().context.save.data.operations).not.toContain('premature');
    actor.send({ type: 'COMMAND', command: { type: 'ATTACK' }, operationId: 'attack' });
    expect(actor.getSnapshot().matches('resolvingPlayer')).toBe(true);
    await waitFor(actor, (s) => s.matches('Battle'));
    expect(actor.getSnapshot().context.save.data.operations).toContain('attack');
    actor.stop();
});
it('a failed load cannot overwrite an existing save and supports a safe retry', async () => {
    let fail = true,
        writes = 0;
    const p = {
        load: async () => {
            if (fail) throw new Error('temporarily unavailable');
            return fixture();
        },
        save: async () => {
            writes++;
        },
    };
    const a = makeActor(p).start();
    await waitFor(a, (s) => s.matches('failure'));
    a.send({
        type: 'COMMAND',
        command: { type: 'NAV', screen: 'NewCharacter' },
        operationId: 'unsafe',
    });
    expect(a.getSnapshot().matches('failure')).toBe(true);
    expect(writes).toBe(0);
    fail = false;
    a.send({ type: 'RETRY' });
    await waitFor(a, (s) => s.matches('Town1'));
    expect(active(a.getSnapshot().context.save)!.name).toBe('Aster');
    a.stop();
});
