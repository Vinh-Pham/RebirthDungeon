import { expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { usableReason } from '../../src/domain/skillSystem';
import { ranks } from '../../src/domain/Skills';
import { previewDamage } from '../../src/domain/combat';
import { turnIdentity } from '../../src/domain/battle/engine';
import { seedRng, createRng } from '../../src/domain/rng';
import { validateSave } from '../../src/runtime/persistence';
import { act, battle, character, command, edit, settle } from './helpers/battle';
const initial = battle(['critical', 'counter', 'smash']);
const generatedBattle = fc.record({
    seed: fc.integer(),
    rank: fc.constantFrom(...ranks),
    stamina: fc.integer({ min: 10, max: 90 }).map((n) => n / 10),
    hp: fc.integer({ min: 1, max: 10000 }),
    shield: fc.integer({ min: 0, max: 100 }),
});
const setup = (data: {
    seed: number;
    rank: (typeof ranks)[number];
    stamina: number;
    hp: number;
    shield: number;
}) =>
    edit(initial, (c) => {
        c.stamina = data.stamina;
        c.run!.baseline!.skills.combatMastery.rank = data.rank;
        c.battle!.rng = seedRng(data.seed);
        c.battle!.enemies[0].hp = data.hp;
        c.battle!.enemies[0].shield = data.shield;
    });
test.prop([generatedBattle], { numRuns: 100 })(
    'previewing is pure; a committed action bounds pools, records actual damage, and survives JSON',
    (data) => {
        const s = setup({ ...data, stamina: Math.max(data.stamina, 4) });
        const before = JSON.stringify(s),
            c = character(s),
            e = c.battle!.enemies[0];
        previewDamage(c, e, 'normal');
        previewDamage(c, e, 'normal', true);
        expect(JSON.stringify(s)).toBe(before);
        const result = act(s);
        const actor = character(result);
        expect(actor.stamina).toBeGreaterThanOrEqual(0);
        expect(actor.hp).toBeGreaterThan(0);
        expect(actor.battle!.enemies[0].hp).toBeGreaterThanOrEqual(0);
        const damages = actor.battle!.events.filter((e) => e.type === 'damage');
        expect(damages.every((e) => Number.isInteger(e.amount) && e.amount! >= 0)).toBe(true);
        expect(damages.reduce((sum, e) => sum + e.amount!, 0)).toBe(
            data.hp - actor.battle!.enemies[0].hp,
        );
        validateSave(JSON.parse(JSON.stringify(result)));
        expect(JSON.stringify(s)).toBe(before);
    },
);
test.prop([generatedBattle, fc.array(fc.boolean(), { minLength: 1, maxLength: 12 })], {
    numRuns: 60,
})(
    'bounded command sequences match after reload and preserve fixed order and once-only turn starts',
    (data, choices) => {
        const start = setup({ ...data, stamina: 50, hp: 10000 });
        function play(reload: boolean) {
            let s = start;
            for (const defend of choices) {
                s = settle(s);
                if (!character(s).battle || s.checkpoint.phase === 'reward') break;
                s = act(s, defend && !usableReason(character(s), 'defense') ? 'defense' : 'normal');
                if (reload) s = JSON.parse(JSON.stringify(s));
            }
            return s;
        }
        const a = play(false),
            b = play(true);
        expect(a).toEqual(b);
        const c = character(a);
        expect(c.battle!.order).toEqual(character(start).battle!.order);
        const starts = c.battle!.events.filter((e) => e.type === 'turnStart').map((e) => e.turnId);
        expect(new Set(starts).size).toBe(starts.length);
        expect(c.battle!.events.filter((e) => e.type === 'battleEnd').length).toBeLessThanOrEqual(
            1,
        );
    },
    30000,
);
test.prop([generatedBattle, fc.string({ minLength: 1 })], { numRuns: 100 })(
    'invalid targets and stale turns never change resources, events or randomness',
    (data, suffix) => {
        const s = setup(data),
            before = JSON.stringify(s);
        const id = turnIdentity(character(s));
        expect(() =>
            command(s, {
                type: 'BATTLE_ACTION',
                action: 'attack',
                target: `missing:${suffix}`,
                ...id,
            }),
        ).toThrow();
        expect(() =>
            command(s, {
                type: 'BATTLE_ACTION',
                action: 'attack',
                target: 'enemy-0',
                ...id,
                turnId: `${id.turnId}:${suffix}`,
            }),
        ).toThrow();
        expect(JSON.stringify(s)).toBe(before);
    },
);
test.prop([fc.integer(), fc.integer({ min: 0, max: 100 })], { numRuns: 100 })(
    'RNG continuation preserves the exact sequence after any number of draws',
    (seed, draws) => {
        const rng = createRng(seed);
        for (let i = 0; i < draws; i++) rng.int(-100, 100);
        const copy = createRng(JSON.parse(JSON.stringify(rng.snapshot())));
        expect(Array.from({ length: 20 }, () => rng.int(0, 1000))).toEqual(
            Array.from({ length: 20 }, () => copy.int(0, 1000)),
        );
    },
);
test.prop([generatedBattle], { numRuns: 30 })(
    'retrying a failed durable write yields identical events and RNG',
    async (data) => {
        const { MemoryPersistence } = await import('../../src/runtime/persistence');
        const s = setup({ ...data, stamina: 50 });
        const storage = new MemoryPersistence();
        storage.value = s;
        const expected = act(s);
        storage.fail = true;
        await expect(storage.save(expected)).rejects.toThrow();
        expect(storage.value).toBe(s);
        storage.fail = false;
        const retry = act(JSON.parse(JSON.stringify(storage.value)));
        await storage.save(retry);
        expect(storage.value).toEqual(expected);
        expect(storage.value!.battleEvents).toEqual(expected.battleEvents);
    },
);