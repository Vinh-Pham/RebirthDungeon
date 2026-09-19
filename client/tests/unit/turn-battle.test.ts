import { executeBattleCommand } from '../../src/domain/commands';
import { describe, expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { ranks } from '../../src/domain/Skills';
import { actionCosts, turnRecovery, speed } from '../../src/domain/skillSystem';
import { previewDamage } from '../../src/domain/combat';
import { createRng, seedRng, rngSchema } from '../../src/domain/rng';
import { createBattle, turnIdentity, playerTurn } from '../../src/domain/battle/engine';
import { enemyProfile } from '../../src/domain/battle/profiles';
import { chooseEnemyCommand } from '../../src/domain/behavior';
import { migrateSave } from '../../src/domain/migration';
import { validateSave, MemoryPersistence } from '../../src/runtime/persistence';
import { makeActor } from '../../src/runtime/machines';
import { battle, fixture, character, command, edit, act, settle } from './helpers/battle';

describe('individual turns', () => {
    it('sorts once, persists ties, and gives each living actor one turn per round', () => {
        let s = battle([], 'Close Combat', 2);
        const c = character(s),
            order = c.battle!.order;
        expect(order[0]).toBe(c.id);
        expect(c.battle!.speeds[c.id]).toBe(speed(c));
        const same = createBattle(c, 2, structuredClone(c.battle!.enemies), seedRng(2));
        expect(createBattle(c, 2, structuredClone(c.battle!.enemies), seedRng(2))).toEqual(same);
        s = settle(act(s));
        expect(character(s).battle!.order).toEqual(order);
        expect(character(s).battle!.round).toBe(2);
        expect(character(s).battle!.events.filter((e) => e.type === 'turnEnd')).toHaveLength(3);
        validateSave(s);
    });
    it('resumes enemy-first turns and skips defeated actors', () => {
        let s = battle([], 'Close Combat', 2);
        s = edit(s, (c) => {
            const b = c.battle!;
            b.order = ['enemy-0', c.id, 'enemy-1'];
            b.cursor = 0;
            b.started = false;
            b.enemies[1].hp = 0;
        });
        const hp = character(s).hp;
        s = settle(s);
        expect(character(s).hp).toBeLessThanOrEqual(hp);
        expect(playerTurn(character(s))).toBe(true);
        s = settle(act(s));
        expect(
            character(s).battle!.events.filter(
                (e) => e.type === 'turnStart' && e.actorId === 'enemy-1',
            ),
        ).toHaveLength(0);
    });
    it.each(ranks)(
        'uses Combat Mastery %s for fractional attack cost and turn recovery',
        (rank) => {
            const index = ranks.indexOf(rank);
            let s = edit(battle(), (c) => {
                c.run!.baseline!.skills.combatMastery.rank = rank;
                c.stamina = 50;
            });
            expect(actionCosts(character(s), 'normal').stamina).toBe((20 + index) / 10);
            expect(turnRecovery(character(s))).toBe((Math.floor(index / 3) + 1) * 0.5);
            const start = s;
            s = act(s);
            expect(character(s).stamina).toBe(50 - (20 + index) / 10);
            expect(character(start).stamina).toBe(50);
            s = settle(s);
            expect(character(s).stamina).toBeCloseTo(
                50 - (20 + index) / 10 + turnRecovery(character(s)),
            );
        },
    );
    it.each(['Close Combat', 'Archery', 'Magic', 'Dual Gun'] as const)(
        'trains mastery exactly once for %s normal attacks',
        (talent) => {
            const s = act(battle([], talent));
            expect(character(s).skills.combatMastery.counts.hit).toBe(1);
            expect(character(s).skills.normal.counts).toEqual({});
        },
    );
    it('pays and previews one atomic action, rejects stale and duplicate submissions', () => {
        const s = battle(['smash']);
        const c = character(s),
            identity = turnIdentity(c);
        const preview = previewDamage(c, c.battle!.enemies[0], 'smash');
        const intent = {
            type: 'BATTLE_ACTION' as const,
            action: 'skill' as const,
            skill: 'smash',
            target: 'enemy-0',
            ...identity,
        };
        const next = command(s, intent, 'once');
        expect(character(next).battle!.enemies[0].hp).toBe(10000 - preview);
        expect(character(next).stamina).toBe(c.stamina - actionCosts(c, 'smash').stamina);
        expect(command(next, intent, 'once')).toBe(next);
        expect(() => command(settle(next), intent)).toThrow();
        expect(
            executeBattleCommand(s, intent, 'headless').events.some((e) => e.type === 'damage'),
        ).toBe(true);
        expect(c.battle!.events.some((e) => e.type === 'damage')).toBe(false);
    });
    it('only permits Wait when no main action is affordable', () => {
        let s = battle();
        const wait = () =>
            command(s, { type: 'BATTLE_ACTION', action: 'wait', ...turnIdentity(character(s)) });
        expect(wait).toThrow('affordable');
        s = edit(s, (c) => {
            c.stamina = 0;
            c.mana = 0;
        });
        const next = wait();
        expect(character(next).stamina).toBe(0);
        expect(character(next).effects.defense).toBeUndefined();
    });
});
describe('items and effects', () => {
    it('shares one item allowance across inventory/menu and reload, with failed-use rollback', () => {
        let s = battle();
        const full = { type: 'BATTLE_ITEM' as const, id: 'hero-hp', ...turnIdentity(character(s)) };
        expect(() => command(s, full)).toThrow('full');
        s = edit(s, (c) => {
            c.hp = 20;
        });
        const next = command(s, full);
        const c = character(next);
        expect(c.hp).toBeGreaterThan(20);
        expect(c.battle!.turnId).toBe(character(s).battle!.turnId);
        expect(c.battle!.itemUsed).toBe(true);
        const reload = JSON.parse(JSON.stringify(next));
        validateSave(reload);
        expect(() =>
            command(reload, { type: 'USE', id: 'hero-hp', turnId: c.battle!.turnId }),
        ).toThrow('already');
        expect(character(s).inventory.find((i) => i.id === 'hero-hp')!.count).toBe(3);
        expect(character(settle(act(next))).battle!.itemUsed).toBe(false);
    });
    it('keeps Defense and Counterattack through enemy turns, expiring at owner start', () => {
        let s = act(battle(), 'defense');
        expect(character(s).statuses.some((x) => x.definition.group === 'guard')).toBe(true);
        s = settle(s);
        expect(character(s).statuses.some((x) => x.definition.group === 'guard')).toBe(false);
        s = act(battle(['counter']), 'counter');
        expect(character(s).effects.counter).toBeDefined();
        s = settle(s);
        expect(character(s).effects.counter).toBeUndefined();
        expect(character(s).skills.counter.counts.counter).toBe(1);
        expect(character(s).battle!.events.some((e) => e.type === 'counter')).toBe(true);
    });
    it('pays Mana Shield upkeep once at three subsequent owner starts, independently of enemy count', () => {
        let s = edit(battle(['manaShield'], 'Magic', 2), (c) => {
            c.mana = c.stats.mana;
            for (const e of c.battle!.enemies) e.attack = 0;
        });
        s = act(s, 'manaShield');
        const mana = character(s).mana;
        const upkeep = character(s).effects.manaShield!.upkeep;
        s = settle(s);
        expect(character(s).mana).toBe(mana - upkeep);
        expect(character(s).effects.manaShield!.remaining).toBe(2);
        s = settle(act(s));
        expect(character(s).effects.manaShield!.remaining).toBe(1);
        s = settle(act(s));
        expect(character(s).effects.manaShield).toBeUndefined();
        expect(character(s).mana).toBe(mana - upkeep * 3);
    });
    it('stops on counter kills and awards victory only once', () => {
        let s = edit(battle(['counter']), (c) => {
            c.battle!.enemies[0].hp = 1;
            c.battle!.enemies[0].defendedLastTurn = true;
        });
        s = settle(act(s, 'counter'));
        expect(s.checkpoint.phase).toBe('reward');
        expect(character(s).battle!.events.filter((e) => e.type === 'battleEnd')).toHaveLength(1);
        expect(character(s).battle!.events.some((e) => e.type === 'defeated')).toBe(true);
    });
    it('gives explicitly enabled human profiles a finite potion and no dungeon encounter changes', () => {
        let s = edit(battle(), (c) => {
            const b = c.battle!,
                e = b.enemies[0];
            Object.assign(e, enemyProfile({ name: 'Human', species: 'human', boss: false }));
            e.species = 'human';
            e.hp = 1;
            e.consumables = [{ id: 'potion', kind: 'hp', count: 1 }];
            b.cursor = b.order.indexOf(e.id);
        });
        expect(chooseEnemyCommand(character(s)).type).toBe('BATTLE_ITEM');
        s = command(s, { type: 'ENEMY_TURN', ...turnIdentity(character(s)) });
        expect(character(s).battle!.enemies[0].consumables).toEqual([]);
        expect(character(s).battle!.itemUsed).toBe(true);
        expect(chooseEnemyCommand(character(s)).type).toBe('BATTLE_ACTION');
    });
});
describe('randomness and persistence', () => {
    it('round-trips the generator, does not draw at probability boundaries, and rejects invalid state', () => {
        const rng = createRng(42),
            before = rng.snapshot();
        expect(rng.chance(0)).toBe(false);
        expect(rng.chance(1)).toBe(true);
        expect(rng.snapshot()).toEqual(before);
        rng.int(0, 100);
        const restored = createRng(JSON.parse(JSON.stringify(rng.snapshot())));
        expect(restored.int(-20, 20)).toBe(rng.int(-20, 20));
        expect(() => createRng({ ...before, state: [0, 0, 0, 0] })).toThrow();
        expect(() => rng.int(2, 1)).toThrow();
        expect(() => rng.chance(NaN)).toThrow();
        expect(rngSchema.safeParse({ ...before, state: [1] }).success).toBe(false);
    });
    it.each([1, 2, 3, 4])(
        'migrates schema %i without spending or granting a turn-start recovery',
        (version) => {
            const original = battle(['smash']);
            const legacy = JSON.parse(JSON.stringify(original));
            legacy.version = legacy.data.version = version;
            legacy.data.rng = 123;
            const c = legacy.data.characters[0];
            delete c.skills.combatMastery;
            delete c.skills.defense;
            delete c.run.baseline.skills.combatMastery;
            delete c.run.baseline.skills.defense;
            c.battle.dice = [1, 2, 3, 4, 5];
            c.battle.action = { costs: { stamina: 4 } };
            if (version === 1) c.skills = ['normal', 'smash'];
            const result = migrateSave(legacy);
            validateSave(result);
            expect(result.version).toBe(5);
            expect(character(result).stamina).toBe(c.stamina);
            expect(character(result).battle!.started).toBe(true);
            expect(character(result).battle).not.toHaveProperty('dice');
            expect(character(result).skills.combatMastery.rank).toBe('F');
            expect(migrateSave(result)).toBe(result);
        },
    );
    it('publishes only successful writes, retries deterministically, and resumes enemy turns after reload', async () => {
        const storage = new MemoryPersistence();
        storage.value = battle();
        const actor = makeActor(storage).start();
        await waitFor(actor, (s) => s.matches({ Battle: 'selecting' }));
        const before = actor.getSnapshot().context.save;
        const intent = {
            type: 'BATTLE_ACTION' as const,
            action: 'attack' as const,
            target: 'enemy-0',
            ...turnIdentity(character(storage.value)),
        };
        storage.fail = true;
        actor.send({ type: 'COMMAND', command: intent, operationId: 'failed' });
        await waitFor(actor, (s) => !!s.context.error);
        expect(actor.getSnapshot().context.save).toBe(before);
        storage.fail = false;
        actor.send({ type: 'COMMAND', command: intent, operationId: 'failed' });
        await waitFor(actor, (s) => s.context.save.data.revision > before.data.revision);
        actor.stop();
        const resumed = makeActor(storage).start();
        await waitFor(
            resumed,
            (s) =>
                s.matches({ Battle: 'selecting' }) &&
                character(s.context.save as typeof storage.value & {}).battle!.turn > 1,
        );
        validateSave(storage.value);
        resumed.stop();
    });
});

describe('boundary regressions', () => {
    it('migrates a real legacy RP skill set while preserving sources and spent resources', async () => {
        const { createMemory } = await import('../../src/domain/quests/roleplay');
        const old = JSON.parse(JSON.stringify(fixture()));
        old.version = old.data.version = 4;
        old.data.rng = 123;
        old.checkpoint = { version: 1, screen: 'Alby', phase: 'exploring' };
        const hero = old.data.characters[0];
        hero.quests.records['arens-expedition'] = { status: 'active', stage: 0, counts: {} };
        hero.rp = JSON.parse(JSON.stringify(createMemory('legacy-rp')));
        hero.rp.rng = 7319;
        const aren = hero.rp.actor;
        aren.hp = 40;
        aren.stamina = 20.5;
        for (const id of ['combatMastery', 'defense']) {
            delete aren.skills[id];
            delete aren.run.baseline.skills[id];
            aren.run.baseline.statSnapshot.sources = aren.run.baseline.statSnapshot.sources.filter(
                (s: { id: string }) => s.id !== `skill:${id}`,
            );
        }
        const sources = structuredClone(aren.run.baseline.statSnapshot.sources);
        const migrated = migrateSave(old);
        validateSave(migrated);
        expect(character(migrated).hp).toBe(40);
        expect(character(migrated).stamina).toBe(20.5);
        expect(character(migrated).run!.baseline!.statSnapshot!.sources).toEqual(
            expect.arrayContaining(sources),
        );
        expect(migrated.data.characters[0].inventory).toEqual(hero.inventory);
    });
    it('rejects malformed current saves, unknown enemy skills and invalid outcome/event identity', () => {
        for (const mutate of [
            (c: any) => {
                c.battle.cursor = 100;
            },
            (c: any) => {
                c.battle.skills = ['extra'];
            },
            (c: any) => {
                c.battle.enemies[0].skills = ['missing'];
            },
            (c: any) => {
                c.battle.winner = 'player';
            },
            (c: any) => {
                c.battle.events[0].id = 'bad';
            },
            (c: any) => {
                c.battle.rng.algorithm = 'unknown';
            },
            (c: any) => {
                c.stamina = NaN;
            },
        ])
            expect(() => validateSave(edit(battle(), mutate))).toThrow();
    });
    it('retains terminal events after defeat and the complete headless reward transaction', () => {
        let s = edit(battle(), (c) => {
            c.battle!.enemies[0].hp = 1;
        });
        const result = executeBattleCommand(
            s,
            {
                type: 'BATTLE_ACTION',
                action: 'attack',
                target: 'enemy-0',
                ...turnIdentity(character(s)),
            },
            'terminal',
        );
        expect(character(result.state as typeof s).reward).toBeTruthy();
        expect(result.events.filter((e) => e.type === 'battleEnd')).toHaveLength(1);
        expect(
            executeBattleCommand(
                result.state,
                {
                    type: 'BATTLE_ACTION',
                    action: 'attack',
                    target: 'enemy-0',
                    ...turnIdentity(character(s)),
                },
                'terminal',
            ).events,
        ).toEqual([]);
        s = edit(battle(), (c) => {
            const b = c.battle!;
            b.cursor = b.order.indexOf('enemy-0');
            c.hp = 1;
            b.enemies[0].attack = 10000;
        });
        s = command(s, { type: 'ENEMY_TURN', ...turnIdentity(character(s)) });
        expect(s.checkpoint.screen).toBe('Town1');
        expect(s.battleEvents!.some((e) => e.type === 'battleEnd')).toBe(true);
        validateSave(s);
    });
    it('does not publish or spend when the writer lock is lost during a scheduled turn', async () => {
        const storage = new MemoryPersistence();
        storage.value = act(battle());
        let writable = true;
        const actor = makeActor(storage, () => writable).start();
        await waitFor(actor, (s) => s.matches({ Battle: 'advancing' }));
        const before = actor.getSnapshot().context.save;
        writable = false;
        await waitFor(actor, (s) => !!s.context.error);
        expect(actor.getSnapshot().context.save).toBe(before);
        expect(storage.value).toEqual(before);
        actor.stop();
    });
});
it('pins the RNG sequence and rejects malformed executable content', async () => {
    const { enemySkillSchema } = await import('../../src/domain/battle/profiles');
    const { rankSchema, statusDefinitionSchema } = await import('../../src/domain/battle/schemas');
    const { statusDefinitions } = await import('../../src/domain/stats/statusCatalog');
    const { skills } = await import('../../src/domain/Skills');
    const rng = createRng(42);
    expect(Array.from({ length: 8 }, () => rng.int(0, 1000))).toEqual([
        267, 643, 521, 711, 450, 963, 889, 640,
    ]);
    expect(() =>
        enemySkillSchema.parse({ name: 'Broken', power: 1, cost: -1, cooldown: 0 }),
    ).toThrow();
    expect(() => rankSchema.parse({ ...skills.normal.ranks[0], weights: [1, 2] })).toThrow();
    expect(() =>
        statusDefinitionSchema.parse({ ...statusDefinitions.poison, duration: -1 }),
    ).toThrow();
});