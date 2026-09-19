import { storeRaw } from './helpers/storage';

import { describe, it, expect } from 'vitest';
import { produce } from 'immer';
import { waitFor } from 'xstate';
import { blankSave, reduceCommand, active, type Command } from '../../src/domain/commands';
import { skills, ranks, skillRank, trainingPoints } from '../../src/domain/Skills';
import {
    advance,
    learn,
    train,
    effectiveStats,
    defenses,
    attackInputs,
    requirementReason,
    passiveDescription,
    actionCosts,
    outsideBattleReason,
} from '../../src/domain/skillSystem';

import { validateSave, MemoryPersistence } from '../../src/runtime/persistence';
import { makeActor } from '../../src/runtime/machines';
import type { SaveData, Character } from '../../src/domain/model';
let op = 0;
const run = (s: SaveData, cmd: Command, id = `skills-${++op}`) =>
    reduceCommand(s, cmd, id) as SaveData;
const edit = (s: SaveData, fn: (c: Character, s: SaveData) => void) =>
    produce(s, (d) => fn(d.data.characters[0], d));
function fixture() {
    let s = run(blankSave(), { type: 'NAV', screen: 'NewCharacter' });
    s = run(s, {
        type: 'CREATE',
        input: { name: 'Skills', race: 'Human', age: 17, talent: 'Close Combat' },
        id: 'hero',
        now: 0,
    });
    return edit(s, (c) => {
        c.gold = 5000;
    });
}
const buy = (s: SaveData, kind: string, shop = 'General') => run(s, { type: 'BUY', shop, kind });
const item = (s: SaveData, kind: string) => active(s)!.inventory.find((i) => i.kind === kind)!.id;
describe('ranked skill content and acquisition', () => {
    it('has the complete icon catalog and legacy skills with fifteen reachable ranks and an unranked basic action', () => {
        expect(Object.keys(skills)).toHaveLength(42);
        expect(skills.charge).toBeUndefined();
        for (const [id, s] of Object.entries(skills)) {
            expect(s.ranks.map((r) => r.rank)).toEqual(ranks);
            for (const r of s.ranks) {
                if (s.type === 'active' && s.route !== 'reference')
                    expect(
                        Object.values(r.costs).some((cost) => cost > 0),
                        `${id} ${r.rank} has an upfront cost`,
                    ).toBe(true);
                if (id !== 'normal' && r.rank !== '1')
                    expect(
                        r.objectives.reduce((sum, o) => sum + o.points * o.cap, 0),
                    ).toBeGreaterThanOrEqual(100);
            }
        }
    });
    it('starts with Normal Attack, learns only eligible lessons, and preserves immutability', () => {
        const original = fixture();
        expect(Object.keys(active(original)!.skills)).toEqual([
            'normal',
            'combatMastery',
            'defense',
        ]);
        const s = run(original, { type: 'LEARN', skill: 'smash' });
        expect(active(original)!.skills.smash).toBeUndefined();
        expect(active(s)!.skills.smash.rank).toBe('F');
        expect(active(s)!.ap).toBe(5);
        for (const skill of ['smash', 'charge', 'critical', 'final', 'shieldMastery', 'ice'])
            expect(() => run(s, { type: 'LEARN', skill })).toThrow();
        expect(() =>
            run(run(s, { type: 'ENTER', seed: 1 }), { type: 'RANK_UP', skill: 'smash' }),
        ).toThrow();
    });
    it('reads a book once and atomically consumes all five distinct pages in any order', () => {
        let s = buy(fixture(), 'criticalBook');
        s = run(s, { type: 'READ', id: item(s, 'criticalBook') });
        expect(active(s)!.skills.critical.rank).toBe('F');
        s = buy(s, 'criticalBook');
        expect(() => run(s, { type: 'READ', id: item(s, 'criticalBook') })).toThrow('already');
        s = buy(s, 'finalPage1');
        expect(() => run(s, { type: 'INSERT_PAGE', id: item(s, 'finalPage1') })).toThrow();
        s = buy(s, 'finalCollection');
        for (const p of [1, 5, 3, 2, 4]) {
            if (p !== 1) s = buy(s, `finalPage${p}`);
            s = run(s, { type: 'INSERT_PAGE', id: item(s, `finalPage${p}`) });
            if (p === 1) {
                s = buy(s, 'finalPage1');
                expect(() => run(s, { type: 'INSERT_PAGE', id: item(s, 'finalPage1') })).toThrow();
            }
        }
        expect(active(s)!.collection).toEqual([1, 2, 3, 4, 5]);
        expect(active(s)!.inventory.some((i) => i.kind === 'finalCollection')).toBe(false);
        s = run(s, { type: 'READ', id: item(s, 'finalBook') });
        expect(active(s)!.skills.final.rank).toBe('F');
        expect(() => run(s, { type: 'READ', id: 'missing' })).toThrow();
    });
    it('enforces 99/100/AP gates, resets excess training and advances every transition to rank 1', () => {
        const c = structuredClone(active(fixture())!);
        learn(c, 'smash');
        c.skills.smash.counts = { hit: 37, kill: 5 };
        expect(trainingPoints('smash', c.skills.smash)).toBe(99);
        expect(() => advance(c, 'smash')).toThrow('100');
        c.skills.smash.counts = { hit: 40, kill: 4 };
        c.ap = 1;
        expect(() => advance(c, 'smash')).toThrow('AP');
        c.ap = 4;
        advance(c, 'smash');
        expect(c.ap).toBe(0);
        expect(c.skills.smash).toEqual({ rank: 'E', counts: {} });
        c.ap = 1000;
        for (let r = 1; r < 14; r++) {
            c.skills.smash.counts = { hit: 40, kill: 10 };
            advance(c, 'smash');
            expect(c.skills.smash.rank).toBe(ranks[r + 1]);
            expect(c.skills.smash.counts).toEqual({});
        }
        expect(() => advance(c, 'smash')).toThrow('Max Rank');
        expect(() => advance(c, 'normal')).toThrow();
        train(c, 'smash', 'hit', 100);
        expect(c.skills.smash.counts).toEqual({});
    });
});
describe('equipment and derived mastery effects', () => {
    it('activates each mastery only for its equipment and never heals when maxima grow', () => {
        let s = fixture();
        const initial = active(s)!.hp;
        expect(active(s)!.skills.combatMastery.rank).toBe('F');
        expect(active(s)!.hp).toBe(initial);
        s = run(s, { type: 'LEARN', skill: 'swordMastery' });
        const single = attackInputs(active(s)!, 'normal').attack;
        s = buy(s, 'sword', 'Blacksmith');
        const sword = active(s)!.inventory.filter((i) => i.kind === 'sword')[1].id;
        s = run(s, { type: 'EQUIP', id: sword, slot: 'offhand' });
        s = run(s, { type: 'LEARN', skill: 'dualMastery' });
        expect(attackInputs(active(s)!, 'normal').attack).toBe(single + 4 + 1);
        expect(() => run(s, { type: 'SELL', id: sword })).toThrow();
        expect(() => run(s, { type: 'BANK_ITEM', id: sword, deposit: true })).toThrow();
        s = buy(s, 'shield', 'Blacksmith');
        s = run(s, { type: 'EQUIP', id: item(s, 'shield') });
        s = run(s, { type: 'LEARN', skill: 'shieldMastery' });
        expect(requirementReason(active(s)!, 'dualMastery')).toContain('dual');
        expect(defenses(active(s)!)).toEqual({ defense: 9, protection: 0.01 });
        s = buy(s, 'heavyArmor', 'Blacksmith');
        s = run(s, { type: 'EQUIP', id: item(s, 'heavyArmor') });
        s = run(s, { type: 'LEARN', skill: 'heavyMastery' });
        expect(defenses(active(s)!)).toEqual({ defense: 16, protection: 0.02 });
        expect(defenses(active(s)!, true)).toEqual({ defense: 7, protection: 0.034 });
        expect(effectiveStats(active(s)!).dex).toBe(58);
        s = buy(s, 'lightArmor', 'Blacksmith');
        s = run(s, { type: 'EQUIP', id: item(s, 'lightArmor') });
        s = run(s, { type: 'LEARN', skill: 'lightMastery' });
        expect(effectiveStats(active(s)!).dex).toBe(58);
        expect(defenses(active(s)!)).toEqual({ defense: 14, protection: 0.01 });
        for (const id of [
            'combatMastery',
            'swordMastery',
            'dualMastery',
            'critical',
            'heavyMastery',
            'lightMastery',
            'shieldMastery',
        ])
            expect(passiveDescription(active(s)!, id)).not.toBe('');
    });
    it('rejects invalid off-hand pairs and prohibits equipment changes during runs', () => {
        let s = buy(fixture(), 'guns', 'Blacksmith');
        s = run(s, { type: 'EQUIP', id: item(s, 'guns') });
        s = buy(s, 'shield', 'Blacksmith');
        expect(() => run(s, { type: 'EQUIP', id: item(s, 'shield') })).toThrow();
        expect(() => run(s, { type: 'EQUIP', id: item(s, 'guns'), slot: 'offhand' })).toThrow();
        s = run(s, { type: 'ENTER', seed: 1 });
        expect(() => run(s, { type: 'EQUIP', id: item(s, 'guns') })).toThrow();
    });
});

describe('migration and durable state', () => {
    it('rejects malformed progression and rolls back failed durable rank-up', async () => {
        let s = run(fixture(), { type: 'LEARN', skill: 'smash' });
        s = edit(s, (c) => {
            c.skills.smash.counts = { hit: 40, kill: 4 };
        });
        expect(() =>
            validateSave(
                edit(s, (c) => {
                    c.skills.smash.counts.hit = -1;
                }),
            ),
        ).toThrow();
        const storage = new MemoryPersistence();
        storage.value = s;
        const actor = makeActor(storage).start();
        await waitFor(actor, (s) => s.matches('Town1'));
        storage.fail = true;
        actor.send({
            type: 'COMMAND',
            command: { type: 'RANK_UP', skill: 'smash' },
            operationId: 'rank',
        });
        await waitFor(actor, (s) => s.matches('Town1') && !!s.context.error);
        expect(active(actor.getSnapshot().context.save)!.skills.smash.rank).toBe('F');
        storage.fail = false;
        actor.send({
            type: 'COMMAND',
            command: { type: 'RANK_UP', skill: 'smash' },
            operationId: 'rank',
        });
        await waitFor(actor, (s) => active(s.context.save)!.skills.smash.rank === 'E');
        expect(active(storage.value!)!.ap).toBe(1);
        actor.stop();
    });
});

it('retains a legacy backup and restores the last valid save after corruption', async () => {
    const { IndexedDBPersistence } = await import('../../src/runtime/persistence');
    await import('fake-indexeddb/auto');
    const p = new IndexedDBPersistence(),
        legacy: any = JSON.parse(JSON.stringify(fixture()));
    legacy.version = 1;
    legacy.data.version = 1;
    legacy.data.rng = 123;
    legacy.data.characters[0].skills = ['normal', 'smash'];
    await storeRaw(legacy);
    const migrated = (await p.load())!;
    expect(migrated.version).toBe(5);
    await p.save(migrated);
    const backup = await new Promise<any>((resolve, reject) => {
        const open = indexedDB.open('rebirth-dungeon', 1);
        open.onsuccess = () => {
            const tx = open.result.transaction('saves', 'readonly'),
                request = tx.objectStore('saves').get('legacy-v1');
            request.onsuccess = () => resolve(request.result);
            tx.oncomplete = () => open.result.close();
        };
        open.onerror = () => reject(open.error);
    });
    expect(backup.version).toBe(1);
    expect(backup.data.characters[0].skills).toEqual(['normal', 'smash']);
    await storeRaw(migrated, 'previous');
    await storeRaw({ broken: true });
    expect(await p.load()).toEqual(migrated);
});
describe('outside-battle skill use', () => {
    const mage = () => {
        let s = run(blankSave(), { type: 'NAV', screen: 'NewCharacter' });
        return run(s, {
            type: 'CREATE',
            input: { name: 'Caster', race: 'Human', age: 17, talent: 'Magic' },
            id: 'mage',
            now: 0,
        });
    };
    it('heals from the skill window, paying once, training, and starting the cooldown', () => {
        let s = run(mage(), { type: 'LEARN', skill: 'healing' });
        s = edit(s, (c) => {
            c.hp = 10;
        });
        const before = active(s)!,
            costs = actionCosts(before, 'healing'),
            cooldown = skillRank('healing', before.skills.healing).cooldown;
        expect(cooldown).toBe(0);
        s = run(s, { type: 'USE_SKILL', skill: 'healing' });
        const c = active(s)!;
        expect(c.mana).toBe(before.mana - costs.mana);
        expect(c.hp).toBe(Math.min(effectiveStats(c).hp, 10 + 30));
        expect(c.skills.healing.counts.use).toBe(1);
    });
    it('restores mana by rank percentage and blocks reuse during cooldown', () => {
        let s = run(mage(), { type: 'LEARN', skill: 'manaRegeneration' });
        s = edit(s, (c) => {
            c.mana = 5;
        });
        const before = active(s)!;
        s = run(s, { type: 'USE_SKILL', skill: 'manaRegeneration' });
        const c = active(s)!;
        expect(c.mana).toBe(
            Math.min(effectiveStats(c).mana, 5 + Math.floor((effectiveStats(c).mana * 20) / 100)),
        );
        expect(c.stamina).toBe(before.stamina - 5);
        expect(c.cooldowns.manaRegeneration).toBe(50);
        expect(() => run(s, { type: 'USE_SKILL', skill: 'manaRegeneration' })).toThrow('Cooldown');
    });
    it('rejects battle-only skills, unlearned skills, and battle-phase timing', () => {
        const s = mage();
        expect(outsideBattleReason(active(s)!, 'smash')).toBe('Usable in battle only');
        expect(() => run(s, { type: 'USE_SKILL', skill: 'smash' })).toThrow(
            'Usable in battle only',
        );
        expect(() => run(s, { type: 'USE_SKILL', skill: 'healing' })).toThrow(
            'Skill is not learned',
        );
        let battled = run(mage(), { type: 'ENTER', seed: 42 });
        battled = run(battled, { type: 'ENCOUNTER', room: 1 });
        expect(() => run(battled, { type: 'USE_SKILL', skill: 'normal' })).toThrow(
            'not available right now',
        );
    });
});