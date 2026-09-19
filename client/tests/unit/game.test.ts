import { settle } from './helpers/battle';
import { turnIdentity } from '../../src/domain/battle/engine';

import { it, expect } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { blankSave, reduceCommand, active, addItem, type Command } from '../../src/domain/commands';
import { generateDungeon, findPath } from '../../src/domain/dungeon';
import { makeActor, dialogueMachine, questMachine } from '../../src/runtime/machines';
import {
    MemoryPersistence,
    IndexedDBPersistence,
    validateSave,
} from '../../src/runtime/persistence';
import { agingBoundaries, rebirthCooldown, xpNeeded } from '../../src/domain/progression';
import 'fake-indexeddb/auto';
function game() {
    let s = blankSave();
    let n = 0;
    const doIt = (c: Command) => {
        s = reduceCommand(s, c, String(++n)) as typeof s;
        s = settle(s);
        return s;
    };
    doIt({ type: 'NAV', screen: 'NewCharacter' });
    doIt({
        type: 'CREATE',
        input: { name: 'Rowan', race: 'Human', talent: 'Close Combat', age: 17 },
        id: 'rowan',
        now: Date.UTC(2026, 8, 17),
    });
    return {
        doIt,
        get s() {
            return s;
        },
        get c() {
            return active(s)!;
        },
    };
}

it('1000 seeded floors connect every room with a valid path', () => {
    for (let seed = 0; seed < 1000; seed++) {
        const d = generateDungeon(seed);
        expect(d.rooms).toHaveLength(7);
        expect(d.rooms.filter((r) => r.required)).toHaveLength(4);
        for (const r of d.rooms.slice(1))
            expect(findPath(d.tiles, d.rooms[0], r).length).toBeGreaterThan(0);
    }
    expect(findPath([[0]], { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
}, 15000);
it('creation limits, immutable updates and duplicate operations', () => {
    const g = game(),
        before = g.s;
    g.doIt({ type: 'BUY', shop: 'Grocery', kind: 'bread' });
    expect(before.data.characters[0].gold).toBe(100);
    expect(g.c.gold).toBe(95);
    expect(reduceCommand(g.s, { type: 'HEAL' }, g.s.data.operations.at(-1)!)).toBe(g.s);
    expect(() =>
        g.doIt({
            type: 'CREATE',
            input: { name: 'a', race: 'Human', talent: 'Magic', age: 17 },
            id: 'bad',
            now: 0,
        }),
    ).toThrow();
    for (let n = 1; n < 20; n++) {
        g.doIt({ type: 'NAV', screen: 'NewCharacter' });
        g.doIt({
            type: 'CREATE',
            input: { name: `hero${n}`, race: 'Elf', talent: 'Magic', age: 10 },
            id: String(n),
            now: 0,
        });
    }
    g.doIt({ type: 'NAV', screen: 'NewCharacter' });
    expect(() =>
        g.doIt({
            type: 'CREATE',
            input: { name: 'overflow', race: 'Human', talent: 'Magic', age: 17 },
            id: 'overflow',
            now: 0,
        }),
    ).toThrow('20');
});
it('transactions handle equipment, bank, purchases, selling and capacity atomically', () => {
    const g = game();
    g.doIt({ type: 'BUY', shop: 'Grocery', kind: 'bread' });
    const bread = g.c.inventory.find((i) => i.kind === 'bread')!;
    expect(() => g.doIt({ type: 'USE', id: bread.id })).toThrow('already full');
    g.doIt({ type: 'BANK_GOLD', amount: 20, deposit: true });
    expect(g.c.bankGold).toBe(20);
    g.doIt({ type: 'BANK_GOLD', amount: 10, deposit: false });
    expect(g.c.bankGold).toBe(10);
    expect(() => g.doIt({ type: 'BANK_GOLD', amount: 1000, deposit: true })).toThrow();
    expect(() => g.doIt({ type: 'BANK_GOLD', amount: -1, deposit: true })).toThrow();
    expect(() => g.doIt({ type: 'SELL', id: g.c.equipment.main! })).toThrow();
    g.doIt({ type: 'UNEQUIP', id: g.c.equipment.main! });
    const weapon = g.c.inventory[0];
    g.doIt({ type: 'BANK_ITEM', id: weapon.id, deposit: true });
    g.doIt({ type: 'BANK_ITEM', id: g.c.bank[0].id, deposit: false });
    g.doIt({ type: 'EQUIP', id: g.c.inventory.at(-1)!.id });
    g.doIt({ type: 'REPAIR', id: g.c.equipment.main! });
    g.doIt({ type: 'HEAL' });
    expect(() => g.doIt({ type: 'BUY', shop: 'Grocery', kind: 'steel' })).toThrow();
    const rows: any[] = [];
    addItem(rows, { id: 'a', kind: 'silk', count: 200 }, 30);
    expect(rows.map((i) => i.count)).toEqual([99, 99, 2]);
    expect(() => addItem(rows, { id: 'b', kind: 'sword', count: 30 }, 30)).toThrow();
});
it('complete dungeon, prevent duplicate loot/chests, and resume battle', () => {
    const g = game();
    g.doIt({ type: 'LEARN', skill: 'smash' });
    g.doIt({ type: 'ENTER', seed: 42 });
    expect(() => g.doIt({ type: 'ENCOUNTER', room: 6 })).toThrow('non-boss');
    for (const room of [1, 2, 3, 4, 6]) {
        g.doIt({ type: 'ENCOUNTER', room });
        let turns = 0;
        while (g.s.checkpoint.phase !== 'reward' && turns++ < 60) {
            if (g.c.hp < 50 && !g.c.battle!.itemUsed) {
                const potion = g.c.inventory.find((i) => i.kind === 'hp');
                if (potion) {
                    g.doIt({ type: 'USE', id: potion.id, turnId: g.c.battle!.turnId });
                    continue;
                }
            }
            g.doIt({
                type: 'BATTLE_ACTION',
                action: g.c.stamina >= 4 && !g.c.cooldowns.smash ? 'skill' : 'attack',
                skill: g.c.stamina >= 4 && !g.c.cooldowns.smash ? 'smash' : undefined,
                target: g.c.battle!.enemies.find((e) => e.hp)!.id,
                ...turnIdentity(g.c),
            });
        }
        expect(g.c.reward).not.toBeNull();
        g.doIt({ type: 'CLAIM', ids: g.c.reward!.items.map((i) => i.id), gold: true });
        const gold = g.c.gold;
        g.doIt({ type: 'CLAIM', ids: g.c.reward!.items.map((i) => i.id), gold: true });
        expect(g.c.gold).toBe(gold);
        g.doIt({ type: 'LEAVE_REWARD' });
    }
    expect(g.s.checkpoint.screen).toBe('TreasureRoom');
    g.doIt({ type: 'CHEST', index: 2 });
    expect(() => g.doIt({ type: 'CHEST', index: 1 })).toThrow();
    g.doIt({ type: 'CLAIM', ids: [], gold: true });
    g.doIt({ type: 'CONTINUE' });
    expect(g.s.checkpoint.screen).toBe('Town1');
    expect(g.c.run).toBeNull();
});
it('progression uses wiki XP and local Saturday noon aging', () => {
    expect(xpNeeded(1)).toBe(400);
    expect(rebirthCooldown(4999)).toBe(86400000);
    expect(rebirthCooldown(5000)).toBe(2 * 86400000);
    expect(rebirthCooldown(8000)).toBe(4 * 86400000);
    expect(rebirthCooldown(10000)).toBe(6 * 86400000);
    expect(
        agingBoundaries(Date.parse('2026-09-19T18:59:00Z'), Date.parse('2026-09-19T19:01:00Z')),
    ).toHaveLength(1);
    const g = game();
    g.doIt({ type: 'NAV', screen: 'CharacterSelect' });
    expect(() =>
        g.doIt({
            type: 'REBIRTH',
            id: 'rowan',
            talent: 'Magic',
            age: 17,
            now: Date.UTC(2026, 8, 17),
        }),
    ).toThrow();
    g.doIt({ type: 'REBIRTH', id: 'rowan', talent: 'Magic', age: 10, now: Date.UTC(2026, 8, 20) });
    expect(g.c.talent).toBe('Magic');
    expect(g.c.skills.ice).toBeUndefined();
    expect(g.c.skills.normal).toBeDefined();
});
it('machine commits only successful durable writes', async () => {
    const storage = new MemoryPersistence();
    const a = makeActor(storage).start();
    await waitFor(a, (s) => s.matches('Title'));
    storage.fail = true;
    a.send({ type: 'COMMAND', command: { type: 'NAV', screen: 'NewCharacter' }, operationId: '1' });
    await waitFor(a, (s) => s.matches('Title') && !!s.context.error);
    expect(a.getSnapshot().context.save.data.revision).toBe(0);
    storage.fail = false;
    a.send({ type: 'COMMAND', command: { type: 'NAV', screen: 'NewCharacter' }, operationId: '2' });
    await waitFor(a, (s) => s.matches('NewCharacter'));
    expect(storage.value?.checkpoint.screen).toBe('NewCharacter');
    a.stop();
});
it('IndexedDB round trips, validates saves and orchestration progresses', async () => {
    const p = new IndexedDBPersistence(),
        g = game();
    await p.save(g.s);
    expect(await p.load()).toEqual(g.s);
    expect(() => validateSave({})).toThrow();
    const d = createActor(dialogueMachine).start();
    d.send({ type: 'OPEN', service: 'Bank' });
    expect(d.getSnapshot().value).toBe('choosing');
    d.send({ type: 'TRANSACT' });
    d.send({ type: 'DONE' });
    d.send({ type: 'CLOSE' });
    expect(d.getSnapshot().value).toBe('closed');
    d.stop();
    const q = createActor(questMachine).start();
    for (const type of ['ENTER', 'WIN', 'BOSS', 'TREASURE'] as const) q.send({ type });
    expect(q.getSnapshot().status).toBe('done');
    q.stop();
});