import { expect, it } from 'vitest';
import { produce } from 'immer';
import { blankSave, reduceCommand, active, type Command } from '../../src/domain/commands';
import type { Character, SaveData, Enemy } from '../../src/domain/model';
import {
    resolveStats,
    modifiedStat,
    createStatSnapshot,
    enemyStats,
} from '../../src/domain/stats/resolve';
import {
    applyStatus,
    removeStatuses,
    completeStatusActivation,
    restorePool,
    statusSummary,
} from '../../src/domain/stats/statuses';
import {
    effectiveCosts,
    affordability,
    resourceState,
    costDescription,
} from '../../src/domain/stats/resources';
import { statusDefinitions } from '../../src/domain/stats/statusCatalog';
import { validateActorStats } from '../../src/domain/stats/validate';
import { actionCosts, refreshStats } from '../../src/domain/skillSystem';
import { skillRank } from '../../src/domain/Skills';
import { migrateSave } from '../../src/domain/migration';
import { validateSave } from '../../src/runtime/persistence';
import { payReservation, previewDamage } from '../../src/domain/combat';
let sequence = 0;
const run = (s: SaveData, cmd: Command) => reduceCommand(s, cmd, `stats-${++sequence}`) as SaveData;
function fixture() {
    const s = run(run(blankSave(), { type: 'NAV', screen: 'NewCharacter' }), {
        type: 'CREATE',
        input: { name: 'Stat hero', race: 'Human', talent: 'Close Combat', age: 17 },
        id: 'stats-hero',
        now: 0,
    });
    return produce(s, (d) => {
        d.data.characters[0].gold = 5000;
    });
}
const hero = (s = fixture()) => s.data.characters[0];
const origin = { id: 'test-source', name: 'Test source' };
const status = (c: Character, id: string, own = false) => applyStatus(c, id, origin, own);
function battle(magic = false) {
    let s = fixture();
    s = run(s, { type: 'LEARN', skill: 'bloodStrike' });
    const sword = hero(s).equipment.main!;
    s = run(s, { type: 'BUY', shop: 'Blacksmith', kind: 'wand' });
    s = run(s, { type: 'EQUIP', id: hero(s).inventory.find((i) => i.kind === 'wand')!.id });
    for (const skill of ['arcaneFocus', 'firebolt']) s = run(s, { type: 'LEARN', skill });
    if (!magic) s = run(s, { type: 'EQUIP', id: sword });
    for (const kind of [
        'strengthDraught',
        'unstableElixir',
        'antidote',
        'cleansingTonic',
        'renewalTonic',
    ])
        s = run(s, { type: 'BUY', shop: 'General', kind });
    s = run(run(s, { type: 'ENTER', seed: 42 }), { type: 'ENCOUNTER', room: 1 });
    return produce(s, (d) => {
        for (const e of hero(d).battle!.enemies) {
            e.hp = e.maxHp = 10000;
            e.attack = 0;
            e.inflicts = [];
        }
    });
}
it('resolves additive flats and percentages once, primary before derived, and rejects invalid dependencies', () => {
    expect(
        modifiedStat('str', 40, [
            { stat: 'str', flat: 9 },
            { stat: 'str', percentBp: 1000 },
            { stat: 'str', percentBp: 1000 },
        ]),
    ).toBe(58);
    expect(modifiedStat('hp', -99, [])).toBe(1);
    expect(modifiedStat('mana', -99, [])).toBe(0);
    expect(modifiedStat('protection', 123, [])).toBe(100);
    expect(modifiedStat('magicProtection', 2.345, [])).toBe(2.34);
    expect(() => modifiedStat('str', NaN, [])).toThrow();
    expect(() => modifiedStat('str', 0, [{ stat: 'unknown' } as never])).toThrow();
    expect(() => modifiedStat('str', 0, [{ stat: 'str', from: 'meleeAttack' } as never])).toThrow();
    const c = hero();
    const buffed = status(c, 'strengthDraught');
    expect(resolveStats(buffed).values.str).toBe(resolveStats(c).values.str + 10);
    expect(resolveStats(buffed).values.meleeAttack).toBe(resolveStats(c).values.meleeAttack + 1);
    expect(resolveStats(removeStatuses(buffed, 'buff')).values).toEqual(resolveStats(c).values);
    expect(c.statuses).toEqual([]);
    expect(Object.isFrozen(buffed)).toBe(true);
});
it('tracks title slots and fractional growth, freezes run sources, and never refills changed maxima', () => {
    const c = produce(hero(), (d) => {
        d.growth.str = 0.75;
        d.hp = 10;
        d.titleModifiers.first = {
            id: 'vigor',
            name: 'Vigor',
            kind: 'title',
            modifiers: [{ stat: 'hp', flat: 20 }],
        };
        d.titleModifiers.second = {
            id: 'vigor',
            name: 'Vigor',
            kind: 'title',
            modifiers: [{ stat: 'str', flat: 10 }],
        };
        refreshStats(d);
    });
    expect(c.hp).toBe(10);
    expect(createStatSnapshot(c).base.str % 1).toBe(0.75);
    expect(resolveStats(c).sources.filter((s) => s.kind === 'title')).toHaveLength(2);
    let s = produce(fixture(), (d) => {
        d.data.characters[0] = c;
    });
    s = run(s, { type: 'ENTER', seed: 2 });
    const before = resolveStats(hero(s)).values;
    s = produce(s, (d) => {
        hero(d).growth.str += 100;
        hero(d).titleModifiers = {};
    });
    expect(resolveStats(hero(s)).values).toEqual(before);
    const clamped = produce(c, (d) => {
        d.titleModifiers.first!.modifiers = [{ stat: 'hp', flat: -1000 }];
        refreshStats(d);
    });
    expect(clamped.hp).toBe(1);
    expect(
        produce(clamped, (d) => {
            d.titleModifiers = {};
            refreshStats(d);
        }).hp,
    ).toBe(1);
});
it('scopes resource modifiers, keeps zero pools zero and preserves a minimum positive cost', () => {
    const c = produce(hero(), (d) => {
        d.titleModifiers.first = {
            id: 'cost',
            name: 'Cost test',
            kind: 'title',
            modifiers: [],
            costs: [
                { pool: 'hp', flat: -99 },
                { pool: 'mana', percentBp: -20000 },
                { pool: 'stamina', skill: 'normal', flat: 2, percentBp: 5000 },
            ],
        };
    });
    expect(effectiveCosts(c, 'normal', { hp: 4, mana: 10, stamina: 3 })).toEqual({
        hp: 1,
        mana: 1,
        stamina: 8,
    });
    expect(effectiveCosts(c, 'other', { hp: 0, mana: 0, stamina: 3 })).toEqual({
        hp: 0,
        mana: 0,
        stamina: 3,
    });
    expect(() => effectiveCosts(c, 'normal', { hp: 0, mana: 0, stamina: 0 })).toThrow();
    expect(() => effectiveCosts(c, 'normal', { hp: NaN, mana: 0, stamina: 0 })).toThrow();
    expect(costDescription({ hp: 4, mana: 6, stamina: 3 })).toBe('4 HP + 6 MP + 3 SP');
    expect(
        affordability(
            produce(c, (d) => {
                d.hp = 4;
            }),
            { hp: 4, mana: 0, stamina: 0 },
        ),
    ).toContain('at least 1 HP');
});
it('reserves mixed costs, freezes preview, rejects interleaving, and pays exactly once through reload and pass', () => {
    let s = battle();
    const before = hero(s);
    s = run(s, { type: 'ROLL', skill: 'bloodStrike', target: 'enemy-0' });
    expect(resourceState(hero(s), 'hp').reserved).toBe(4);
    expect(hero(s).hp).toBe(before.hp);
    expect(() =>
        run(s, { type: 'USE', id: hero(s).inventory.find((i) => i.kind === 'unstableElixir')!.id }),
    ).toThrow();
    const frozen = hero(s).battle!.action!;
    s = run(s, { type: 'REROLL' });
    expect(hero(s).battle!.action).toEqual(frozen);
    const json = JSON.parse(JSON.stringify(s));
    validateSave(json);
    s = migrateSave(json);
    const target = hero(s).battle!.enemies[0];
    const preview = previewDamage(hero(s), target, 'bloodStrike', hero(s).battle!.dice);
    s = run(s, { type: 'ATTACK' });
    expect(hero(s).hp).toBe(before.hp - 4);
    expect(hero(s).stamina).toBe(before.stamina - 3);
    expect(target.hp - hero(s).battle!.enemies[0].hp).toBe(preview);
    s = run(s, { type: 'ROLL', skill: 'bloodStrike', target: 'enemy-0' });
    s = run(s, { type: 'PASS' });
    expect(hero(s).hp).toBe(before.hp - 8);
    expect(() => run(s, { type: 'ATTACK' })).toThrow();
    const unaffordable = produce(s, (d) => {
        hero(d).hp = 4;
    });
    expect(() =>
        run(unaffordable, { type: 'ROLL', skill: 'bloodStrike', target: 'enemy-0' }),
    ).toThrow(/hp/);
    expect(hero(unaffordable).hp).toBe(4);
});
it('validates all pools before payment and HP costs bypass shield and mitigation', () => {
    let s = run(battle(), { type: 'ROLL', skill: 'bloodStrike', target: 'enemy-0' });
    const c = JSON.parse(JSON.stringify(hero(s))) as Character;
    c.stamina = 0;
    const before = c.hp;
    expect(() => payReservation(c)).toThrow(/stamina/);
    expect(c.hp).toBe(before);
    s = produce(s, (d) => {
        hero(d).hp = 5;
        hero(d).effects.shield = 100;
    });
    s = run(s, { type: 'PASS' });
    expect(hero(s).hp).toBe(1);
    expect(hero(s).effects.shield).toBe(100);
});
it('refreshes one stacking group without increasing magnitude, respects priority and removal tags', () => {
    const first = status(hero(), 'strengthDraught');
    const advanced = completeStatusActivation(first).actor;
    const refreshed = applyStatus(
        advanced,
        'strengthDraught',
        { id: 'other', name: 'Other' },
        false,
        { ...statusDefinitions.strengthDraught, modifiers: [{ stat: 'str', flat: 99 }] },
    );
    expect(refreshed.statuses[0].definition.modifiers[0].flat).toBe(10);
    expect(refreshed.statuses[0].remaining).toBe(3);
    const stronger = status(refreshed, 'greaterStrength');
    const lower = status(completeStatusActivation(stronger).actor, 'strengthDraught');
    expect(lower.statuses[0].remaining).toBe(2);
    const equal = applyStatus(lower, 'strengthDraught', origin, false, {
        ...statusDefinitions.strengthDraught,
        priority: 20,
    });
    expect(equal.statuses[0].definition.id).toBe('strengthDraught');
    const mixed = status(status(equal, 'poison'), 'unstableWeakness');
    expect(removeStatuses(mixed, 'poison').statuses).toHaveLength(2);
    expect(removeStatuses(mixed, 'harmful').statuses).toHaveLength(1);
    expect(removeStatuses(mixed, 'buff').statuses).toHaveLength(2);
    expect(statusSummary(mixed.statuses[0])).toContain('Test source');
    expect(() => status(hero(), 'missing')).toThrow();
});
it('ticks only eligible owner activations, including the final tick, and recovery never revives', () => {
    let c = status(
        produce(hero(), (d) => {
            d.hp = 30;
        }),
        'poison',
        true,
    );
    c = completeStatusActivation(c).actor;
    expect(c.hp).toBe(30);
    expect(c.statuses[0].remaining).toBe(3);
    for (let i = 0; i < 3; i++) c = completeStatusActivation(c).actor;
    expect(c.hp).toBe(21);
    expect(c.statuses).toHaveLength(0);
    c = status(
        status(
            produce(c, (d) => {
                d.hp = 2;
            }),
            'poison',
        ),
        'regeneration',
    );
    c = completeStatusActivation(c).actor;
    expect(c.hp).toBe(0);
    expect(restorePool(c, 'hp', 500).hp).toBe(0);
    expect(() => status(c, 'guard')).toThrow();
    expect(() => restorePool(c, 'mana', -1)).toThrow();
    const healthy = produce(hero(), (d) => {
        d.hp = 20;
    });
    expect(completeStatusActivation(status(healthy, 'regeneration')).actor.hp).toBe(25);
});
it('regenerates after expiration, skips new regeneration, and supports enemy periodic and stat effects', () => {
    let c = produce(hero(), (d) => {
        d.hp = 10;
    });
    c = applyStatus(c, 'regeneration', origin, true, {
        ...statusDefinitions.regeneration,
        periodic: [],
        modifiers: [{ stat: 'hpRegen', flat: 5 }],
        duration: 2,
    });
    c = completeStatusActivation(c).actor;
    expect(c.hp).toBe(10);
    c = completeStatusActivation(c).actor;
    expect(c.hp).toBe(15);
    c = completeStatusActivation(c).actor;
    expect(c.hp).toBe(15);
    const e: Enemy = {
        id: 'test',
        name: 'Test enemy',
        hp: 20,
        maxHp: 30,
        attack: 10,
        defense: 5,
        statuses: [],
    };
    const weakened = applyStatus(e, 'armorBreak', origin, false);
    expect(enemyStats(weakened).defense).toBe(1);
    expect(completeStatusActivation(applyStatus(e, 'regeneration', origin, false)).actor.hp).toBe(
        25,
    );
    const poisoned = applyStatus(e, 'poison', origin, false, {
        ...statusDefinitions.poison,
        periodic: [{ kind: 'damage', pool: 'hp', amount: 10, damageType: 'physical' }],
    });
    expect(completeStatusActivation(poisoned).actor.hp).toBe(15);
    const magical = produce(e, (d) => {
        d.attackType = 'magic';
        d.magicDefense = 2;
        d.magicProtection = 0.5;
        d.shield = 1;
    });
    expect(enemyStats(magical).attack).toBe(10);
    expect(
        completeStatusActivation(
            applyStatus(magical, 'poison', origin, false, {
                ...statusDefinitions.poison,
                periodic: [{ kind: 'damage', pool: 'hp', amount: 10, damageType: 'magic' }],
            }),
        ).actor.hp,
    ).toBe(17);
});
it('uses side-effect potions as full actions, preserves effects on reload, cleanses without undoing recovery', () => {
    let s = battle();
    s = produce(s, (d) => {
        hero(d).mana = 0;
    });
    const use = (kind: string) => {
        s = run(s, { type: 'USE', id: hero(s).inventory.find((i) => i.kind === kind)!.id });
    };
    use('unstableElixir');
    expect(hero(s).mana).toBe(45);
    expect(hero(s).statuses[0].definition.id).toBe('unstableWeakness');
    expect(hero(s).statuses[0].remaining).toBe(3);
    expect(hero(s).battle!.turn).toBe(2);
    const snapshot = JSON.parse(JSON.stringify(s));
    validateSave(snapshot);
    expect(migrateSave(snapshot)).toEqual(snapshot);
    use('cleansingTonic');
    expect(hero(s).statuses).toHaveLength(0);
    expect(hero(s).mana).toBe(45);
    expect(() => {
        use('antidote');
    }).toThrow(/No matching/);
    use('strengthDraught');
    const str = hero(s).stats.str;
    s = run(s, { type: 'ABANDON' });
    expect(hero(s).statuses).toHaveLength(0);
    expect(hero(s).stats.str).toBe(str - 10);
    const town = run(fixture(), { type: 'BUY', shop: 'General', kind: 'strengthDraught' });
    expect(() =>
        run(town, {
            type: 'USE',
            id: hero(town).inventory.find((i) => i.kind === 'strengthDraught')!.id,
        }),
    ).toThrow(/dungeon/);
});
it('skill buffs skip casting expiration and enemy afflictions affect the next activation', () => {
    let s = battle(true);
    const base = resolveStats(hero(s)).values.magicAttack;
    s = run(run(s, { type: 'ROLL', skill: 'arcaneFocus', target: 'enemy-0' }), { type: 'ATTACK' });
    expect(resolveStats(hero(s)).values.magicAttack).toBe(base + 6);
    expect(hero(s).statuses[0].remaining).toBe(3);
    s = produce(s, (d) => {
        hero(d).battle!.enemies[0].inflicts = ['armorBreak', 'exhaustion'];
    });
    s = run(s, { type: 'PASS' });
    expect(hero(s).statuses.some((s) => s.definition.id === 'armorBreak')).toBe(true);
    expect(
        actionCosts(hero(s), 'normal', skillRank('normal', hero(s).skills.normal)).stamina,
    ).toBeGreaterThan(1);
    s = produce(s, (d) => {
        hero(d).battle!.enemies[0].inflicts = [];
    });
    s = run(run(s, { type: 'PASS' }), { type: 'PASS' });
    expect(resolveStats(hero(s)).values.magicAttack).toBe(base);
});
it('migrates old version-two saves without changing pending actions or resources', () => {
    const s = run(battle(), { type: 'ROLL', skill: 'normal', target: 'enemy-0' });
    const old = JSON.parse(JSON.stringify(s));
    old.version = 2;
    old.data.version = 2;
    delete old.data.statsVersion;
    delete old.data.characters[0].statuses;
    delete old.data.characters[0].titleModifiers;
    delete old.data.characters[0].run.baseline.statSnapshot;
    const upgraded = migrateSave(old);
    expect(hero(upgraded).battle).toEqual(hero(s).battle);
    expect(hero(upgraded).stamina).toBe(hero(s).stamina);
    expect(old.data.statsVersion).toBeUndefined();
    validateSave(upgraded);
    expect(() =>
        migrateSave({ ...s, version: 2, data: { ...s.data, version: 2, statsVersion: 99 } }),
    ).toThrow();
});
it('rejects malformed saved modifiers, duplicate sources, status groups, and resource bounds', () => {
    const c = status(hero(), 'poison');
    validateActorStats(c);
    for (const mutate of [
        (d: Character) => {
            d.statuses[0].remaining = 0;
        },
        (d: Character) => {
            d.statuses.push(d.statuses[0]);
        },
        (d: Character) => {
            d.statuses[0].definition.periodic![0].amount = -1;
        },
        (d: Character) => {
            d.statuses[0].definition.modifiers = [{ stat: 'unknown' } as never];
        },
        (d: Character) => {
            d.statuses[0].definition.costs = [{ pool: 'hp', percentBp: 0.5 }];
        },
        (d: Character) => {
            d.hp = d.stats.hp + 1;
        },
        (d: Character) => {
            d.base.str = NaN;
        },
        (d: Character) => {
            d.titleModifiers.first = { id: '', name: '', kind: 'title', modifiers: [] };
        },
    ])
        expect(() => validateActorStats(produce(c, mutate))).toThrow();
    const running = hero(battle());
    expect(() =>
        validateActorStats(
            produce(running, (d) => {
                d.run!.baseline!.statSnapshot!.sources.push(
                    d.run!.baseline!.statSnapshot!.sources[0],
                );
            }),
        ),
    ).toThrow();
    expect(() =>
        resolveStats(
            produce(running, (d) => {
                d.run!.baseline!.statSnapshot!.version = 99 as 1;
            }),
        ),
    ).toThrow();
    expect(active(fixture())?.id).toBe('stats-hero');
});

it('status maximum reductions clamp immediately and restoration of capacity cannot heal', () => {
    const c = hero();
    const reduced = applyStatus(c, 'unstableWeakness', origin, false, {
        ...statusDefinitions.unstableWeakness,
        modifiers: [{ stat: 'hp', flat: -100 }],
    });
    expect(reduced.hp).toBe(c.stats.hp - 100);
    expect(removeStatuses(reduced, 'harmful').hp).toBe(reduced.hp);
    expect(c.hp).toBe(c.stats.hp);
    const permanent = applyStatus(c, 'unstableWeakness', origin, false, {
        ...statusDefinitions.unstableWeakness,
        removable: false,
    });
    expect(removeStatuses(permanent, 'harmful').statuses).toHaveLength(1);
});
