import { describe, it, expect } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { blankSave, reduceCommand, active, addItem, type Command } from '../../src/domain/commands';
import { combination, roll } from '../../src/domain/dice';
import { generateDungeon, findPath } from '../../src/domain/dungeon';
import { makeActor, dialogueMachine, questMachine, enemyMachine } from '../../src/runtime/machines';
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
describe('dice', () => {
    it('classifies all 7776 outcomes', () => {
        const counts: Record<string, number> = {};
        for (let n = 0; n < 7776; n++) {
            let k = n;
            const d = Array.from({ length: 5 }, () => {
                const v = (k % 6) + 1;
                k = Math.floor(k / 6);
                return v;
            });
            const c = combination(d);
            counts[c.name] = (counts[c.name] || 0) + 1;
            expect(combination([...d].reverse())).toEqual(c);
        }
        expect(counts).toEqual({
            'Five of a kind': 6,
            'Four of a kind': 150,
            'Full house': 300,
            Straight: 240,
            'Three of a kind': 1200,
            'Two pairs': 1800,
            Pair: 3600,
            Chance: 480,
        });
    });
    it('holds dice and rejects bad hands', () => {
        expect(roll(5, [1, 2, 3, 4, 5], [true, true, true, true, true]).dice).toEqual([
            1, 2, 3, 4, 5,
        ]);
        expect(() => combination([7, 1, 1, 1, 1])).toThrow();
        expect(roll(42)).toEqual(roll(42));
    });
});
it('1000 seeded floors connect every room with a valid path', () => {
    for (let seed = 0; seed < 1000; seed++) {
        const d = generateDungeon(seed);
        expect(d.rooms).toHaveLength(7);
        expect(d.rooms.filter((r) => r.required)).toHaveLength(3);
        for (const r of d.rooms.slice(1))
            expect(findPath(d.tiles, d.rooms[0], r).length).toBeGreaterThan(0);
    }
    expect(findPath([[0]], { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
});
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
    g.doIt({ type: 'USE', id: bread.id });
    g.doIt({ type: 'BANK_GOLD', amount: 20, deposit: true });
    expect(g.c.bankGold).toBe(20);
    g.doIt({ type: 'BANK_GOLD', amount: 10, deposit: false });
    expect(g.c.bankGold).toBe(10);
    expect(() => g.doIt({ type: 'BANK_GOLD', amount: 1000, deposit: true })).toThrow();
    expect(() => g.doIt({ type: 'BANK_GOLD', amount: -1, deposit: true })).toThrow();
    expect(() => g.doIt({ type: 'SELL', id: g.c.weapon! })).toThrow();
    g.doIt({ type: 'EQUIP', id: g.c.weapon! });
    const weapon = g.c.inventory[0];
    g.doIt({ type: 'BANK_ITEM', id: weapon.id, deposit: true });
    g.doIt({ type: 'BANK_ITEM', id: g.c.bank[0].id, deposit: false });
    g.doIt({ type: 'EQUIP', id: g.c.inventory.at(-1)!.id });
    g.doIt({ type: 'REPAIR', id: g.c.weapon! });
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
    expect(() => g.doIt({ type: 'ENCOUNTER', room: 6 })).toThrow('three');
    for (const room of [1, 2, 3, 6]) {
        g.doIt({ type: 'ENCOUNTER', room });
        let turns = 0;
        while (g.s.checkpoint.phase !== 'reward' && turns++ < 60) {
            if (g.c.hp < 50) {
                const potion = g.c.inventory.find((i) => i.kind === 'hp');
                if (potion) {
                    g.doIt({ type: 'USE', id: potion.id });
                    continue;
                }
            }
            g.doIt({
                type: 'ROLL',
                skill: g.c.stamina >= 4 && !g.c.cooldowns.smash ? 'smash' : 'normal',
                target: g.c.battle!.enemies.find((e) => e.hp)!.id,
            });
            g.doIt({ type: 'HOLD', index: 0 });
            g.doIt({ type: 'REROLL' });
            g.doIt({ type: 'REROLL' });
            expect(() => g.doIt({ type: 'REROLL' })).toThrow();
            if (room === 1 && turns === 1) {
                const dice = g.c.battle!.dice;
                g.doIt({ type: 'NAV', screen: 'CharacterSelect' });
                g.doIt({ type: 'PLAY', id: 'rowan', now: Date.UTC(2026, 8, 17) });
                expect(g.s.checkpoint.phase).toBe('choosingDice');
                expect(g.c.battle!.dice).toEqual(dice);
            }
            g.doIt({ type: 'ATTACK' });
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
    const ai = createActor(enemyMachine, { input: { attack: 5 } }).start();
    ai.send({ type: 'TURN' });
    expect(ai.getSnapshot().value).toBe('acting');
    ai.send({ type: 'DEFEAT' });
    expect(ai.getSnapshot().status).toBe('done');
});
