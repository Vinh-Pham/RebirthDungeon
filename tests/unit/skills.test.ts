import { describe, it, expect } from 'vitest';
import { produce } from 'immer';
import { waitFor } from 'xstate';
import { blankSave, reduceCommand, active, type Command } from '../../src/domain/commands';
import { skills, ranks, skillRank, trainingPoints } from '../../src/domain/skillCatalog';
import {
    advance,
    learn,
    train,
    effectiveStats,
    defenses,
    attackInputs,
    requirementReason,
    usableReason,
    passiveDescription,
} from '../../src/domain/skillSystem';
import { damageAmount, previewDamage } from '../../src/domain/combat';
import { roll, combination } from '../../src/domain/dice';
import { migrateSave } from '../../src/domain/migration';
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
function battle(ids: string[] = []) {
    let s = fixture();
    for (const id of ids) s = run(s, { type: 'LEARN', skill: id });
    s = run(s, { type: 'ENTER', seed: 42 });
    s = run(s, { type: 'ENCOUNTER', room: 1 });
    return edit(s, (c) => {
        c.battle!.enemies[0].hp = c.battle!.enemies[0].maxHp = 100000;
    });
}
const buy = (s: SaveData, kind: string, shop = 'General') => run(s, { type: 'BUY', shop, kind });
const item = (s: SaveData, kind: string) => active(s)!.inventory.find((i) => i.kind === kind)!.id;
const cast = (s: SaveData, skill: string) =>
    run(run(s, { type: 'ROLL', skill, target: 'enemy-0' }), { type: 'ATTACK' });
describe('ranked skill content and acquisition', () => {
    it('has the complete icon catalog and legacy skills with fifteen reachable ranks and an unranked basic action', () => {
        expect(Object.keys(skills)).toHaveLength(40);
        expect(skills.charge).toBeUndefined();
        for (const [id, s] of Object.entries(skills)) {
            expect(s.ranks.map((r) => r.rank)).toEqual(ranks);
            for (const r of s.ranks) {
                expect(r.weights).toHaveLength(6);
                expect(r.weights.reduce((a, b) => a + b)).toBeGreaterThan(0);
                if (id !== 'normal' && r.rank !== '1')
                    expect(
                        r.objectives.reduce((sum, o) => sum + o.points * o.cap, 0),
                    ).toBeGreaterThanOrEqual(100);
            }
        }
    });
    it('starts with Normal Attack, learns only eligible lessons, and preserves immutability', () => {
        const original = fixture();
        expect(Object.keys(active(original)!.skills)).toEqual(['normal']);
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
        s = run(s, { type: 'LEARN', skill: 'combatMastery' });
        expect(active(s)!.hp).toBe(initial);
        expect(active(s)!.stats.hp).toBe(initial + 10);
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
        expect(defenses(active(s)!)).toEqual({ defense: 3, protection: 0.01 });
        s = buy(s, 'heavyArmor', 'Blacksmith');
        s = run(s, { type: 'EQUIP', id: item(s, 'heavyArmor') });
        s = run(s, { type: 'LEARN', skill: 'heavyMastery' });
        expect(defenses(active(s)!)).toEqual({ defense: 10, protection: 0.02 });
        expect(defenses(active(s)!, true)).toEqual({ defense: 5, protection: 0.01 });
        expect(effectiveStats(active(s)!).dex).toBe(58);
        s = buy(s, 'lightArmor', 'Blacksmith');
        s = run(s, { type: 'EQUIP', id: item(s, 'lightArmor') });
        s = run(s, { type: 'LEARN', skill: 'lightMastery' });
        expect(effectiveStats(active(s)!).dex).toBe(58);
        expect(defenses(active(s)!)).toEqual({ defense: 8, protection: 0.01 });
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
describe('revised combat transactions', () => {
    it('uses exact combo, mitigation, critical and weighted-die rules', () => {
        expect(damageAmount(50, 2.5, 4, 0)).toBe(115);
        expect(damageAmount(50, 2.5, 4, 0.2, 0.25)).toBe(114);
        expect(damageAmount(2, 10, 4, 0)).toBe(0);
        expect(damageAmount(10, 1, 0, 2)).toBe(0);
        expect(combination([1, 2, 3, 4, 6])).toEqual({ name: 'Chance', multiplier: 1 });
        expect(roll(1, [], [], [0, 0, 0, 0, 0, 1]).dice).toEqual([6, 6, 6, 6, 6]);
        expect(() => roll(1, [], [], [0, 0, 0, 0, 0, 0])).toThrow();
        expect(skillRank('smash', { rank: '9' }).weights).toEqual([5, 7, 9, 11, 13, 15]);
    });
    it('locks ranks/stats/costs, preserves rolled hands, and charges passes once', () => {
        let s = battle(['smash', 'combatMastery']);
        const stamina = active(s)!.stamina;
        s = run(s, { type: 'ROLL', skill: 'smash', target: 'enemy-0' });
        const action = active(s)!.battle!.action!;
        expect(active(s)!.stamina).toBe(stamina);
        expect(action.costs.stamina).toBe(4);
        const original = s;
        expect(() => run(s, { type: 'ROLL', skill: 'normal', target: 'enemy-0' })).toThrow();
        expect(() => run(s, { type: 'USE', id: 'hero-hp' })).toThrow();
        s = run(s, { type: 'REROLL', indices: [1, 3] });
        expect(active(s)!.battle!.dice[0]).toBe(active(original)!.battle!.dice[0]);
        expect(() => run(s, { type: 'REROLL', indices: [1, 1] })).toThrow();
        const restored = JSON.parse(JSON.stringify(s));
        validateSave(restored);
        expect(restored.data.characters[0].battle.action).toEqual(action);
        const preview = previewDamage(
            active(s)!,
            active(s)!.battle!.enemies[0],
            'smash',
            active(s)!.battle!.dice,
        );
        s = edit(s, (c) => {
            c.stats.str = 900;
            c.skills.smash.rank = '1';
        });
        expect(
            previewDamage(
                active(s)!,
                active(s)!.battle!.enemies[0],
                'smash',
                active(s)!.battle!.dice,
            ),
        ).toBe(preview);
        s = run(s, { type: 'PASS' }, 'paid-pass');
        expect(active(s)!.stamina).toBe(stamina - 4);
        expect(active(s)!.skills.combatMastery.counts).toEqual({});
        expect(run(s, { type: 'PASS' }, 'paid-pass')).toBe(s);
        s = run(s, { type: 'PASS' });
        expect(active(s)!.stamina).toBe(stamina - 4);
    });
    it('trains once per action, retains progress on abandonment, and awards pages once', () => {
        let s = battle(['smash', 'combatMastery', 'swordMastery']);
        s = cast(s, 'smash');
        for (const id of ['smash', 'combatMastery', 'swordMastery'])
            expect(active(s)!.skills[id].counts.hit).toBe(1);
        s = edit(s, (c) => {
            c.battle!.enemies[0].hp = 1;
        });
        s = cast(s, 'normal');
        expect(active(s)!.reward!.items.some((i) => i.kind === 'finalPage1')).toBe(true);
        s = run(s, { type: 'CLAIM', ids: active(s)!.reward!.items.map((i) => i.id), gold: true });
        s = run(s, { type: 'ABANDON' });
        expect(active(s)!.skills.smash.counts.hit).toBe(1);
        expect(item(s, 'finalPage1')).toBeTruthy();
    });
    it('counter intercepts once, expires against ranged enemies, and can win a battle', () => {
        let s = battle(['counter', 'combatMastery']);
        const hp = active(s)!.hp;
        s = cast(s, 'counter');
        expect(active(s)!.hp).toBe(hp);
        expect(active(s)!.skills.counter.counts.counter).toBe(1);
        expect(active(s)!.skills.combatMastery.counts.hit).toBe(1);
        expect(active(s)!.effects.counter).toBeUndefined();
        s = edit(s, (c) => {
            c.battle!.enemies[0].attackType = 'ranged';
            c.cooldowns.counter = 0;
        });
        s = cast(s, 'counter');
        expect(active(s)!.hp).toBeLessThan(hp);
        expect(active(s)!.skills.counter.counts.counter).toBe(1);
        expect(active(s)!.skills.combatMastery.counts.hit).toBe(1);
        s = edit(s, (c) => {
            c.battle!.enemies[0].attackType = 'melee';
            c.cooldowns.counter = 0;
            c.battle!.enemies[0].hp = 1;
        });
        s = cast(s, 'counter');
        expect(s.checkpoint.phase).toBe('reward');
    });
    it('Final Hit skips casting duration, prevents recast, and cooldowns tick on passes', () => {
        let s = fixture();
        s = edit(s, (c) => {
            c.skills.final = { rank: 'F', counts: {} };
        });
        s = run(s, { type: 'ENTER', seed: 1 });
        s = run(s, { type: 'ENCOUNTER', room: 1 });
        s = edit(s, (c) => {
            c.battle!.enemies[0].hp = 10000;
        });
        s = cast(s, 'final');
        expect(active(s)!.effects.final?.remaining).toBe(2);
        expect(active(s)!.cooldowns.final).toBe(4);
        expect(usableReason(active(s)!, 'final')).not.toBe('');
        s = cast(s, 'normal');
        expect(active(s)!.effects.final?.remaining).toBe(1);
        expect(active(s)!.skills.final.counts.buffHit).toBe(1);
        s = run(s, { type: 'PASS' });
        expect(active(s)!.effects.final).toBeUndefined();
        expect(active(s)!.cooldowns.final).toBe(2);
        s = run(s, { type: 'PASS' });
        s = run(s, { type: 'PASS' });
        expect(usableReason(active(s)!, 'final')).toBe('');
    });
    it('Windmill freezes sorted targets and rolls one critical check per target', () => {
        let s = battle(['windmill', 'combatMastery']);
        s = edit(s, (c) => {
            c.skills.critical = { rank: 'F', counts: {} };
            c.run!.baseline!.skills.critical = { rank: 'F', counts: {} };
            c.battle!.enemies.push({ ...c.battle!.enemies[0], id: 'enemy-1' });
            c.battle!.enemies.reverse();
        });
        s = run(s, { type: 'ROLL', skill: 'windmill', target: 'enemy-0' });
        expect(active(s)!.battle!.action!.targets.map((t) => t.id)).toEqual(['enemy-0', 'enemy-1']);
        s = edit(s, (c) => {
            c.battle!.action!.criticalChance = 10000;
        });
        s = run(s, { type: 'ATTACK' });
        expect(active(s)!.skills.combatMastery.counts.hit).toBe(1);
        expect(active(s)!.skills.critical.counts.critical).toBe(1);
        expect(active(s)!.battle!.criticalResults).toEqual({ 'enemy-0': true, 'enemy-1': true });
        expect(active(s)!.cooldowns.windmill).toBe(1);
        expect(() => cast(s, 'windmill')).toThrow('Cooldown');
        s = run(s, { type: 'PASS' });
        expect(active(s)!.cooldowns.windmill).toBe(0);
    });
});
describe('migration and durable state', () => {
    it('migrates legacy skills and pending dice without spending or rerolling', () => {
        const legacy: any = JSON.parse(
            JSON.stringify(run(battle(), { type: 'ROLL', skill: 'normal', target: 'enemy-0' })),
        );
        legacy.version = 1;
        legacy.data.version = 1;
        legacy.data.characters[0].skills = ['normal', 'smash'];
        delete legacy.data.characters[0].battle.action;
        const s = migrateSave(legacy);
        validateSave(s);
        expect(s.version).toBe(2);
        expect(s.migrationNotice).toBe(true);
        expect(active(s)!.skills.smash.rank).toBe('F');
        expect(active(s)!.battle!.dice).toEqual(legacy.data.characters[0].battle.dice);
        expect(active(s)!.stamina).toBe(legacy.data.characters[0].stamina);
        expect(migrateSave(s)).toBe(s);
        expect(legacy.version).toBe(1);
    });
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

it('rejects stale action intents even when a new hand is ready', () => {
    let s = battle();
    s = run(s, { type: 'ROLL', skill: 'normal', target: 'enemy-0' });
    const id = active(s)!.battle!.action!.id;
    s = run(s, { type: 'ATTACK', actionId: id });
    s = run(s, { type: 'ROLL', skill: 'normal', target: 'enemy-0' });
    expect(() => run(s, { type: 'ATTACK', actionId: id })).toThrow('already ended');
    expect(() => run(s, { type: 'REROLL', actionId: id })).toThrow('already ended');
});
it('rejects corrupted action/status data and nonpositive resource affordability', () => {
    const s = run(battle(), { type: 'ROLL', skill: 'normal', target: 'enemy-0' });
    for (const corrupt of [
        (c: Character) => {
            c.battle!.action!.rank.weights = [0, 0, 0, 0, 0, 0];
        },
        (c: Character) => {
            c.battle!.action!.criticalChance = 10001;
        },
        (c: Character) => {
            c.battle!.action!.targets[0].id = 'missing';
        },
        (c: Character) => {
            c.battle!.action!.costs.stamina = -1;
        },
        (c: Character) => {
            c.effects.final = { remaining: 0, magnitude: 4 };
        },
        (c: Character) => {
            c.effects.counter = {
                power: -1,
                multiplier: 1,
                source: { skill: 'counter', melee: true, sword: true, dual: false },
            };
        },
        (c: Character) => {
            c.cooldowns.normal = -1;
        },
        (c: Character) => {
            c.collection = [1, 1];
        },
        (c: Character) => {
            delete c.run!.baseline;
        },
    ])
        expect(() => validateSave(edit(s, corrupt))).toThrow();
    const dead = edit(s, (c) => {
        c.hp = 0;
    });
    expect(usableReason(active(dead)!, 'normal')).toBe('Not enough hp');
});
it('retains a legacy backup and restores the last valid save after corruption', async () => {
    const { IndexedDBPersistence } = await import('../../src/runtime/persistence');
    await import('fake-indexeddb/auto');
    const p = new IndexedDBPersistence(),
        legacy: any = JSON.parse(JSON.stringify(fixture()));
    legacy.version = 1;
    legacy.data.version = 1;
    legacy.data.characters[0].skills = ['normal', 'smash'];
    await p.save(legacy);
    const migrated = (await p.load())!;
    expect(migrated.version).toBe(2);
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
    await p.save({ broken: true } as any);
    expect(await p.load()).toEqual(migrated);
});
