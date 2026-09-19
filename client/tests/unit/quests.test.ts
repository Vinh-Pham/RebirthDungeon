import { initializeInventory } from '../../src/domain/inventory';
import { describe, expect, it } from 'vitest';
import { produce, type Immutable } from 'immer';
import { active, allowed, blankSave, reduceCommand, type Command } from '../../src/domain/commands';
import type { Character, SaveData } from '../../src/domain/model';
import { migrateSave } from '../../src/domain/migration';
import { MemoryPersistence, validateSave } from '../../src/runtime/persistence';
import { makeActor } from '../../src/runtime/machines';
import { quests } from '../../src/domain/quests/catalog';
import {
    currentObjectives,
    objectiveCount,
    questReady,
    recordDefeats,
    rewardLabels,
} from '../../src/domain/quests/system';
import { validateQuestCatalog } from '../../src/domain/quests/validate';
import { controlledCharacter } from '../../src/domain/quests/roleplay';

let op = 0;
const send = (s: Immutable<SaveData>, command: Command) => {
    const next = reduceCommand(s, command, `quest-test-${++op}`);
    validateSave(next);
    return next;
};
const hero = (s: Immutable<SaveData>) => active(s)!;
const edit = (s: Immutable<SaveData>, mutate: (c: Character) => void) =>
    produce(s, (draft) => {
        mutate(draft.data.characters[0]);
        initializeInventory(draft.data.characters[0]);
    });
function fresh() {
    return send(send(blankSave(), { type: 'NAV', screen: 'NewCharacter' }), {
        type: 'CREATE',
        input: { name: 'Quest Hero', race: 'Human', talent: 'Close Combat', age: 17 },
        id: 'quest-hero',
        now: 0,
    });
}
function warning(s = fresh()) {
    s = send(s, {
        type: 'QUEST_INTERACT',
        quest: 'arens-warning',
        npc: 'Trainer',
        step: 'hear-warning',
    });
    return send(s, { type: 'COMPLETE_QUEST', quest: 'arens-warning' });
}
function readyMemory() {
    let s = warning();
    s = edit(s, (c) => {
        c.quests.records['clear-alby'].counts['alby-victory'] = 1;
    });
    return send(s, { type: 'COMPLETE_QUEST', quest: 'clear-alby' });
}
function enter(s = fresh(), room = 1) {
    return send(send(s, { type: 'ENTER', seed: 87 }), { type: 'ENCOUNTER', room });
}
function killEncounter(s: Immutable<SaveData>) {
    s = edit(s, (c) => {
        const a = c.rp?.actor ?? c;
        for (const e of a.battle!.enemies) {
            e.hp = 1;
            e.attack = 0;
        }
    });
    while (controlledCharacter(s)!.battle && s.checkpoint.phase !== 'reward') {
        const c = controlledCharacter(s)!;
        const target = c.battle!.enemies.find((e) => e.hp > 0)!.id;
        s = send(send(s, { type: 'ROLL', skill: 'normal', target }), { type: 'ATTACK' });
    }
    return s;
}

it('delivers starter quests, discovers every category and does not infer a Magic rebirth', () => {
    const s = fresh(),
        c = hero(s);
    expect(c.quests.records['arens-warning'].status).toBe('active');
    expect(c.quests.records['silk-for-nell'].status).toBe('available');
    expect(c.quests.records['sword-first-lesson'].status).toBe('active');
    expect(c.quests.records['path-of-magic']).toBeUndefined();
    expect(
        new Set(
            Object.values(c.quests.records).map(
                (_, i) => quests[Object.keys(c.quests.records)[i]].category,
            ),
        ).size,
    ).toBe(6);
    expect(c.quests.records['clear-alby']).toBeUndefined();
    expect(() => send(s, { type: 'COMPLETE_QUEST', quest: 'arens-warning' })).toThrow('objectives');
    expect(() =>
        send(s, { type: 'ACCEPT_QUEST', quest: 'silk-for-nell', npc: 'Trainer' }),
    ).toThrow();
    expect(() =>
        send(s, {
            type: 'QUEST_INTERACT',
            quest: 'arens-warning',
            step: 'hear-warning',
            npc: 'General',
        }),
    ).toThrow();
});
it('claims once beyond the operation ledger and unlocks the next story only on claim', () => {
    let s = send(fresh(), {
        type: 'QUEST_INTERACT',
        quest: 'arens-warning',
        npc: 'Trainer',
        step: 'hear-warning',
    });
    expect(hero(s).quests.records['clear-alby']).toBeUndefined();
    expect(hero(s).quests.records['arens-warning'].status).toBe('ready');
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'arens-warning' });
    const { gold, xp, totalLevel, ap } = hero(s);
    s = produce(s, (d) => {
        d.data.operations = [];
    });
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'arens-warning' });
    expect(hero(s)).toMatchObject({ gold, xp, totalLevel, ap });
    expect(hero(s).quests.records['clear-alby'].status).toBe('active');
    expect(() => send(s, { type: 'COMPLETE_QUEST', quest: 'missing' })).toThrow();
});
it('requires acceptance and fresh ordered dialogue without opening a service granting credit', () => {
    let s = fresh();
    expect(() =>
        send(s, {
            type: 'QUEST_INTERACT',
            quest: 'healers-welcome',
            step: 'meet-nell',
            npc: 'General',
        }),
    ).toThrow();
    s = send(s, { type: 'ACCEPT_QUEST', quest: 'healers-welcome', npc: 'Healer' });
    s = send(s, { type: 'ACCEPT_QUEST', quest: 'healers-welcome', npc: 'Healer' });
    expect(() =>
        send(s, {
            type: 'QUEST_INTERACT',
            quest: 'healers-welcome',
            step: 'report-elara',
            npc: 'Healer',
        }),
    ).toThrow();
    s = send(s, {
        type: 'QUEST_INTERACT',
        quest: 'healers-welcome',
        step: 'meet-nell',
        npc: 'General',
    });
    expect(hero(s).quests.records['healers-welcome'].stage).toBe(1);
    expect(questReady(hero(s), 'healers-welcome')).toBe(false);
    s = send(s, {
        type: 'QUEST_INTERACT',
        quest: 'healers-welcome',
        step: 'report-elara',
        npc: 'Healer',
    });
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'healers-welcome' });
    expect(hero(s).inventory.find((i) => i.kind === 'hp')!.count).toBe(5);
});
it('tracks at most three, persists choices, and untracks claimed quests', () => {
    let s = fresh();
    for (const id of ['arens-warning', 'kill-spiders', 'sword-first-lesson'])
        s = send(s, { type: 'TRACK_QUEST', quest: id, tracked: true });
    s = send(s, { type: 'ACCEPT_QUEST', quest: 'healers-welcome', npc: 'Healer' });
    expect(() => send(s, { type: 'TRACK_QUEST', quest: 'healers-welcome', tracked: true })).toThrow(
        'three',
    );
    expect(() => send(s, { type: 'TRACK_QUEST', quest: 'silk-for-nell', tracked: true })).toThrow();
    s = send(s, { type: 'TRACK_QUEST', quest: 'kill-spiders', tracked: false });
    s = send(s, { type: 'TRACK_QUEST', quest: 'arens-warning', tracked: true });
    s = warning(s);
    expect(hero(s).quests.tracked).toEqual(['sword-first-lesson']);
    expect(migrateSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
});
it('consumes exact backpack deliveries, rechecks readiness and excludes bank stock', () => {
    let s = send(fresh(), { type: 'ACCEPT_QUEST', quest: 'silk-for-nell', npc: 'General' });
    s = edit(s, (c) => {
        c.bank.push({ id: 'bank-silk', kind: 'silk', count: 20 });
        c.inventory.push(
            { id: 'silk-a', kind: 'silk', count: 2 },
            { id: 'silk-b', kind: 'silk', count: 2 },
        );
    });
    s = send(s, { type: 'HEAL' });
    expect(questReady(hero(s), 'silk-for-nell')).toBe(true);
    expect(() => send(s, { type: 'COMPLETE_QUEST', quest: 'silk-for-nell' })).toThrow('NPC');
    s = send(s, { type: 'BANK_ITEM', id: 'silk-a', deposit: true });
    expect(hero(s).quests.records['silk-for-nell'].status).toBe('active');
    expect(() =>
        send(s, { type: 'COMPLETE_QUEST', quest: 'silk-for-nell', npc: 'General' }),
    ).toThrow('objectives');
    s = edit(s, (c) => {
        c.inventory.push({ id: 'extra', kind: 'silk', count: 2 });
    });
    const gold = hero(s).gold;
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'silk-for-nell', npc: 'General' });
    expect(
        hero(s)
            .inventory.filter((i) => i.kind === 'silk')
            .reduce((n, i) => n + i.count, 0),
    ).toBe(1);
    expect(hero(s).gold).toBe(gold + 120);
    const done = hero(s);
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'silk-for-nell', npc: 'General' });
    expect(hero(s).inventory).toEqual(done.inventory);
});
it('saves overflow without partial-stack duplication and withdraws once', () => {
    let s = send(fresh(), { type: 'ACCEPT_QUEST', quest: 'healers-welcome', npc: 'Healer' });
    s = send(
        send(s, {
            type: 'QUEST_INTERACT',
            quest: 'healers-welcome',
            npc: 'General',
            step: 'meet-nell',
        }),
        { type: 'QUEST_INTERACT', quest: 'healers-welcome', npc: 'Healer', step: 'report-elara' },
    );
    s = edit(s, (c) => {
        c.inventory = [
            { id: 'hp-stack', kind: 'hp', count: 98 },
            ...Array.from({ length: 59 }, (_, n) => ({
                id: `sword-${n}`,
                kind: 'gem',
                count: 99,
            })),
        ];
        c.equipment.main = null;
    });
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'healers-welcome' });
    expect(hero(s).inventory[0].count).toBe(98);
    expect(hero(s).quests.overflow[0].count).toBe(2);
    const id = hero(s).quests.overflow[0].id;
    expect(() => send(s, { type: 'WITHDRAW_QUEST_REWARD', id })).toThrow('space');
    s = send(s, { type: 'DROP_ITEM', id: 'sword-0', quantity: 99 });
    const gold = hero(s).gold;
    s = send(send(s, { type: 'WITHDRAW_QUEST_REWARD', id }), { type: 'WITHDRAW_QUEST_REWARD', id });
    expect(hero(s).quests.overflow).toEqual([]);
    expect(
        hero(s)
            .inventory.filter((i) => i.kind === 'hp')
            .reduce((n, i) => n + i.count, 0),
    ).toBe(100);
    expect(hero(s).gold).toBe(gold);
});
it.each(['ABANDON', 'death'] as const)(
    'banks unique kills after %s, but never a clear',
    (outcome) => {
        let s = killEncounter(enter(warning(), 2));
        expect(hero(s).run!.quests!.counts['kill-spiders'].spiders).toBe(2);
        expect(hero(s).quests.records['kill-spiders'].counts.spiders ?? 0).toBe(0);
        s = send(s, { type: 'TRACK_QUEST', quest: 'kill-spiders', tracked: true });
        expect(hero(s).run!.quests!.counts['kill-spiders'].spiders).toBe(2);
        s = send(s, { type: 'LEAVE_REWARD' });
        if (outcome === 'death') {
            s = send(s, { type: 'ENCOUNTER', room: 3 });
            s = edit(s, (c) => {
                c.hp = 1;
                c.battle!.enemies[0].attack = 999;
            });
            s = send(s, { type: 'PASS' });
        } else s = send(s, { type: 'ABANDON' });
        expect(hero(s).quests.records['kill-spiders'].counts.spiders).toBe(2);
        expect(hero(s).quests.records['clear-alby'].counts['alby-victory'] ?? 0).toBe(0);
        expect(hero(s).run).toBeNull();
    },
);
it('credits every distinct target across encounters and quests, and clears only at successful return', () => {
    let s = edit(warning(), (c) => {
        c.skills.smash = { rank: 'E', counts: {} };
    });
    s = send(s, { type: 'HEAL' });
    s = send(s, { type: 'ACCEPT_QUEST', quest: 'patience-before-power', npc: 'Trainer' });
    s = send(s, { type: 'ENTER', seed: 9 });
    for (const room of [1, 2, 3, 4, 6]) {
        s = killEncounter(send(s, { type: 'ENCOUNTER', room }));
        s = send(s, { type: 'LEAVE_REWARD' });
    }
    expect(hero(s).quests.records['clear-alby'].status).toBe('active');
    s = send(s, { type: 'CHEST', index: 0 });
    s = send(s, { type: 'CONTINUE' });
    expect(hero(s).quests.records['kill-spiders'].counts.spiders).toBe(5);
    expect(hero(s).quests.records['patience-before-power'].stage).toBe(1);
    expect(hero(s).quests.records['clear-alby'].status).toBe('ready');
    s = send(s, {
        type: 'QUEST_INTERACT',
        quest: 'patience-before-power',
        npc: 'Trainer',
        step: 'patience-report',
    });
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'patience-before-power' });
    expect(hero(s).skills.counter).toEqual({ rank: 'F', counts: {} });
});
it('respects rank order, equipment catch-up and persisted rebirth evidence', () => {
    let s = edit(fresh(), (c) => {
        c.skills.swordMastery = { rank: '9', counts: {} };
    });
    s = send(s, { type: 'HEAL' });
    expect(hero(s).quests.records['steady-blade'].status).toBe('active');
    s = send(s, {
        type: 'QUEST_INTERACT',
        quest: 'sword-first-lesson',
        npc: 'Trainer',
        step: 'sword-lesson',
    });
    s = send(s, { type: 'COMPLETE_QUEST', quest: 'sword-first-lesson' });
    expect(hero(s).skills.swordMastery.rank).toBe('9');
    expect(rewardLabels(hero(s), 'sword-first-lesson').join()).toContain('already known');
    s = send(s, { type: 'NAV', screen: 'CharacterSelect' });
    s = send(s, { type: 'REBIRTH', id: 'quest-hero', talent: 'Magic', age: 17, now: 86400001 });
    s = send(s, { type: 'PLAY', id: 'quest-hero', now: 86400001 });
    expect(hero(s).quests.records['path-of-magic'].status).toBe('active');
    expect(hero(s).quests.records['sword-first-lesson'].status).toBe('completed');
    expect(hero(s).quests.rebirths).toHaveLength(1);
});
it('rolls back the entire claim when the balance is invalid or storage fails', async () => {
    let s = send(fresh(), {
        type: 'QUEST_INTERACT',
        quest: 'arens-warning',
        npc: 'Trainer',
        step: 'hear-warning',
    });
    const tooRich = edit(s, (c) => {
        c.gold = Number.MAX_SAFE_INTEGER;
    });
    expect(() => send(tooRich, { type: 'COMPLETE_QUEST', quest: 'arens-warning' })).toThrow(
        'balance',
    );
    expect(hero(tooRich).quests.records['arens-warning'].claimId).toBeUndefined();
    const persistence = new MemoryPersistence();
    await persistence.save(s);
    const actor = makeActor(persistence).start();
    await new Promise<void>((resolve) => {
        const sub = actor.subscribe((snapshot) => {
            if (snapshot.matches('Town1')) {
                sub.unsubscribe();
                resolve();
            }
        });
    });
    persistence.fail = true;
    actor.send({
        type: 'COMMAND',
        command: { type: 'COMPLETE_QUEST', quest: 'arens-warning' },
        operationId: 'failed-claim',
    });
    await new Promise<void>((resolve) => {
        const sub = actor.subscribe((snapshot) => {
            if (snapshot.context.error) {
                sub.unsubscribe();
                resolve();
            }
        });
    });
    expect(actor.getSnapshot().context.save).toEqual(s);
    persistence.fail = false;
    actor.send({
        type: 'COMMAND',
        command: { type: 'COMPLETE_QUEST', quest: 'arens-warning' },
        operationId: 'retry-claim',
    });
    await new Promise<void>((resolve) => {
        const sub = actor.subscribe((snapshot) => {
            if (snapshot.matches('Town1') && !snapshot.context.error) {
                sub.unsubscribe();
                resolve();
            }
        });
    });
    s = actor.getSnapshot().context.save;
    expect(hero(s).quests.records['arens-warning'].status).toBe('completed');
    actor.stop();
});
it('migrates schema two mid-roll without crediting past or current-run objectives', () => {
    const s = send(enter(), { type: 'ROLL', skill: 'normal', target: 'enemy-0' });
    const old = JSON.parse(JSON.stringify(s));
    old.version = old.data.version = 2;
    delete old.data.characters[0].quests;
    delete old.data.characters[0].rp;
    delete old.data.characters[0].run.quests;
    const migrated = migrateSave(old);
    validateSave(migrated);
    expect(migrated.version).toBe(4);
    expect(hero(migrated).battle).toEqual(hero(s).battle);
    expect(migrated.data.rng).toBe(s.data.rng);
    expect(hero(migrated).run!.quests!.stages).toEqual({});
    expect(hero(migrated).quests.records).toEqual({});
    const town = send(migrated, { type: 'ABANDON' });
    expect(hero(town).quests.records['kill-spiders'].counts).toEqual({});
    expect(hero(town).quests.records['arens-warning'].status).toBe('active');
});

describe('Aren memory', () => {
    it('isolates the actor and RNG, restores reservations, prevents hero actions, and exits without rewards', () => {
        const base = readyMemory();
        let s = send(base, { type: 'START_RP_MISSION', quest: 'arens-expedition', npc: 'Trainer' });
        expect(controlledCharacter(s)!.name).toBe('Aren');
        for (const cmd of [
            { type: 'ENTER', seed: 1 },
            { type: 'HEAL' },
            { type: 'BUY', shop: 'General', kind: 'hp' },
            { type: 'EQUIP', id: 'aren-sword' },
            { type: 'COMPLETE_QUEST', quest: 'arens-expedition' },
        ] as Command[])
            expect(allowed(s, cmd)).toBe(false);
        expect(() => send(s, { type: 'ENCOUNTER', room: 2 })).toThrow('previous');
        expect(() => send(s, { type: 'ENCOUNTER', room: 3, x: 1248, y: 256 })).toThrow('both');
        s = send(send(s, { type: 'ENCOUNTER', room: 1 }), {
            type: 'ROLL',
            skill: 'normal',
            target: 'enemy-0',
        });
        const saved = migrateSave(JSON.parse(JSON.stringify(s)));
        validateSave(saved);
        expect(hero(saved).rp).toEqual(hero(s).rp);
        expect(s.data.rng).toBe(base.data.rng);
        s = send(saved, {
            type: 'ATTACK',
            actionId: controlledCharacter(saved)!.battle!.action!.id,
        });
        expect(hero(s).inventory).toEqual(hero(base).inventory);
        s = send(s, { type: 'EXIT_RP_MISSION' });
        expect(hero(s)).toEqual(hero(base));
        expect(s.data.rng).toBe(base.data.rng);
    });
    it('commits success once, starts the report stage, and completes the story after explicit claim', () => {
        let s = send(readyMemory(), {
            type: 'START_RP_MISSION',
            quest: 'arens-expedition',
            npc: 'Trainer',
        });
        const before = hero(s);
        for (const room of [1, 2]) s = killEncounter(send(s, { type: 'ENCOUNTER', room }));
        expect(controlledCharacter(s)!.skills.smash.counts).toEqual({});
        expect(controlledCharacter(s)!.reward).toBeNull();
        s = send(s, { type: 'ENCOUNTER', room: 3, x: 1248, y: 256 });
        expect(hero(s).quests.records['arens-expedition'].stage).toBe(1);
        expect(hero(s).quests.records['kill-spiders']).toEqual(
            before.quests.records['kill-spiders'],
        );
        expect(hero(s).gold).toBe(before.gold);
        expect(hero(s).skills).toEqual(before.skills);
        s = send(s, {
            type: 'QUEST_INTERACT',
            quest: 'arens-expedition',
            npc: 'Trainer',
            step: 'memory-report',
        });
        s = send(s, { type: 'COMPLETE_QUEST', quest: 'arens-expedition' });
        expect(hero(s).quests.chapters).toEqual(['beneath-the-ruins']);
        expect(hero(s).quests.generations).toEqual(['broken-seal']);
        expect(() =>
            send(s, { type: 'START_RP_MISSION', quest: 'arens-expedition', npc: 'Trainer' }),
        ).toThrow();
    });
    it('resumes a suspended mission through the title screen and retries death with fresh supplies', () => {
        let s = send(readyMemory(), {
            type: 'START_RP_MISSION',
            quest: 'arens-expedition',
            npc: 'Trainer',
        });
        s = send(s, { type: 'ENCOUNTER', room: 1 });
        s = send(send(s, { type: 'NAV', screen: 'CharacterSelect' }), {
            type: 'PLAY',
            id: 'quest-hero',
            now: 0,
        });
        expect(s.checkpoint.screen).toBe('Battle');
        s = edit(s, (c) => {
            c.rp!.actor.hp = 1;
            c.rp!.actor.battle!.enemies[0].attack = 999;
        });
        s = send(s, { type: 'PASS' });
        expect(hero(s).rp).toBeNull();
        expect(hero(s).quests.records['arens-expedition'].stage).toBe(0);
        s = send(s, { type: 'START_RP_MISSION', quest: 'arens-expedition', npc: 'Trainer' });
        expect(controlledCharacter(s)!.inventory.find((i) => i.kind === 'hp')!.count).toBe(2);
    });
});

it('rejects malformed quest saves and cyclic or unreachable catalog entries', () => {
    const base = fresh();
    for (const mutate of [
        (c: Character) => {
            c.quests.tracked = ['missing'];
        },
        (c: Character) => {
            c.quests.records['missing'] = { status: 'active', stage: 0, counts: {} };
        },
        (c: Character) => {
            c.quests.records['kill-spiders'].counts.spiders = 6;
        },
        (c: Character) => {
            c.quests.records['kill-spiders'].claimId = 'forged';
        },
        (c: Character) => {
            c.quests.records['kill-spiders'].stage = 3;
        },
        (c: Character) => {
            c.quests.overflow = [{ id: 'fake', kind: 'hp', count: 3 }];
        },
        (c: Character) => {
            c.quests.chapters = ['beneath-the-ruins'];
        },
    ])
        expect(() => validateSave(edit(base, mutate))).toThrow();
    const broken = structuredClone(quests);
    broken['arens-warning'].prerequisites = [{ kind: 'claimed', quest: 'clear-alby' }];
    expect(() => validateQuestCatalog(broken)).toThrow('cycle');
    broken['arens-warning'].prerequisites = [{ kind: 'claimed', quest: 'missing' }];
    expect(() => validateQuestCatalog(broken)).toThrow();
    broken['arens-warning'].prerequisites = [];
    broken['arens-warning'].rewards.xp = -1;
    expect(() => validateQuestCatalog(broken)).toThrow('reward');
    expect(currentObjectives(hero(base), 'missing')).toEqual([]);
    expect(
        objectiveCount(
            hero(base),
            'kill-spiders',
            currentObjectives(hero(base), 'kill-spiders')[0],
        ),
    ).toBe(0);
    const copy = structuredClone(hero(base));
    recordDefeats(copy);
});

it('counts counterattack and multi-target defeats once, without dice selection giving credit', () => {
    for (const skill of ['counter', 'windmill']) {
        let s = send(fresh(), { type: 'LEARN', skill });
        s = enter(s, skill === 'windmill' ? 3 : 1);
        s = edit(s, (c) => {
            for (const e of c.battle!.enemies) {
                e.hp = 1;
                e.inflicts = [];
            }
        });
        s = send(s, { type: 'ROLL', skill, target: 'enemy-0' });
        expect(hero(s).run!.quests!.counts).toEqual({});
        s = send(s, { type: 'REROLL', indices: [0] });
        expect(hero(s).run!.quests!.counts).toEqual({});
        s = send(s, { type: 'ATTACK' });
        const count = skill === 'windmill' ? 3 : 1;
        expect(hero(s).run!.quests!.counts['kill-spiders'].spiders).toBe(count);
        const copied = structuredClone(hero(s));
        recordDefeats(copied);
        expect(copied.run!.quests!.counts['kill-spiders'].spiders).toBe(count);
    }
});
it('does not count a sword trial while using a mace, and rejects damaged memory templates', () => {
    let s = edit(fresh(), (c) => {
        c.skills.smash = { rank: 'E', counts: {} };
        c.inventory.push({ id: 'mace', kind: 'mace', count: 1, durability: 20 });
    });
    s = send(s, { type: 'EQUIP', id: 'mace' });
    s = send(s, { type: 'ACCEPT_QUEST', quest: 'patience-before-power', npc: 'Trainer' });
    s = killEncounter(enter(s));
    s = send(s, { type: 'ABANDON' });
    expect(hero(s).quests.records['patience-before-power'].counts).toEqual({});
    const memory = send(readyMemory(), {
        type: 'START_RP_MISSION',
        quest: 'arens-expedition',
        npc: 'Trainer',
    });
    for (const mutate of [
        (c: Character) => {
            c.rp!.actor.skills.smash.rank = '1';
        },
        (c: Character) => {
            c.rp!.actor.run!.cleared = [2, 2];
        },
        (c: Character) => {
            c.rp!.actor.inventory.push({ id: 'fake-gem', kind: 'gem', count: 1 });
        },
        (c: Character) => {
            c.rp!.actor.run!.x = -1;
        },
        (c: Character) => {
            c.rp!.version = 9 as 1;
        },
    ])
        expect(() => validateSave(edit(memory, mutate))).toThrow();
});
it('retains the original schema-two fallback when upgrading after a damaged current save', async () => {
    const { IndexedDBPersistence } = await import('../../src/runtime/persistence');
    await import('fake-indexeddb/auto');
    const persistence = new IndexedDBPersistence();
    const old = JSON.parse(JSON.stringify(fresh()));
    old.version = old.data.version = 2;
    delete old.data.characters[0].quests;
    delete old.data.characters[0].rp;
    await persistence.save(old);
    await persistence.save({ invalid: true } as unknown as SaveData);
    const restored = (await persistence.load())!;
    expect(restored.version).toBe(4);
    await persistence.save(restored);
    const backup = await new Promise<SaveData>((resolve, reject) => {
        const open = indexedDB.open('rebirth-dungeon', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const tx = open.result.transaction('saves', 'readonly');
            const request = tx.objectStore('saves').get('legacy-v2');
            request.onsuccess = () => resolve(request.result);
            tx.oncomplete = () => open.result.close();
        };
    });
    expect(backup).toEqual(old);
    const pending = enter(warning());
    const damaged = edit(pending, (c) => {
        c.run!.quests!.counts = { 'kill-spiders': { spiders: -2 } };
    });
    expect(() => validateSave(damaged)).toThrow('pending');
});

it('persists town-load quest delivery before publishing and never writes from a read-only tab', async () => {
    const { waitFor } = await import('xstate');
    const persistence = new MemoryPersistence();
    const old = edit(fresh(), (c) => {
        c.quests.records = {};
        c.quests.notices = [];
    });
    await persistence.save(old);
    let actor = makeActor(persistence, () => false).start();
    await waitFor(actor, (s) => s.matches('Town1'));
    expect(active(actor.getSnapshot().context.save)!.quests.records).toEqual({});
    expect(persistence.value).toEqual(old);
    actor.stop();
    persistence.fail = true;
    actor = makeActor(persistence).start();
    await waitFor(actor, (s) => s.matches('failure'));
    expect(persistence.value).toEqual(old);
    expect(actor.getSnapshot().context.save.data.characters).toEqual([]);
    persistence.fail = false;
    actor.send({ type: 'RETRY' });
    await waitFor(actor, (s) => s.matches('Town1'));
    expect(active(actor.getSnapshot().context.save)!.quests.records['arens-warning'].status).toBe(
        'active',
    );
    expect(persistence.value).toEqual(actor.getSnapshot().context.save);
    actor.stop();
});