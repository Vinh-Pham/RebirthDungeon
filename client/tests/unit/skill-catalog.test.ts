import { readdirSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { active, blankSave, reduceCommand, type Command } from '../../src/domain/commands';
import { skills, ranks, skillRank } from '../../src/domain/Skills';
import {
    actionCosts,
    effectiveStats,
    learn,
    refreshStats,
    snapshotAction,
    usableReason,
} from '../../src/domain/skillSystem';
import { validateSave } from '../../src/runtime/persistence';
import { wikiValue } from '../../src/domain/skills/wiki';
import type { Character, SaveData } from '../../src/domain/model';

let sequence = 0;
const run = (save: SaveData, command: Command) =>
    reduceCommand(save, command, `catalog-${++sequence}`) as SaveData;
function fixture(talent: 'Magic' | 'Archery' | 'Close Combat' = 'Magic') {
    let save = run(blankSave(), { type: 'NAV', screen: 'NewCharacter' });
    save = run(save, {
        type: 'CREATE',
        input: { name: 'Catalog', race: 'Human', age: 17, talent },
        id: 'catalog',
        now: 0,
    });
    return produce(save, (draft) => {
        const c = draft.data.characters[0];
        c.base.mana = 1000;
        refreshStats(c);
        c.mana = c.stats.mana;
    });
}
function battle(id: string, talent: 'Magic' | 'Archery' | 'Close Combat' = 'Magic') {
    let save = run(fixture(talent), { type: 'LEARN', skill: id });
    save = run(save, { type: 'ENTER', seed: 42 });
    save = run(save, { type: 'ENCOUNTER', room: 1 });
    return produce(save, (draft) => {
        const c = draft.data.characters[0];
        c.battle!.enemies[0].hp = c.battle!.enemies[0].maxHp = 100000;
        c.battle!.enemies[0].attack = 0;
    });
}
function cast(save: SaveData, id: string) {
    return run(run(save, { type: 'ROLL', skill: id, target: 'enemy-0' }), { type: 'ATTACK' });
}

describe('wiki-backed catalog', () => {
    it('covers every supplied icon once, with its own module and locally saved reference', () => {
        const icons = readdirSync('public/assets/game/skills').filter((name) =>
            name.endsWith('.webp'),
        );
        expect(icons).toHaveLength(33);
        for (const icon of icons) {
            const entries = Object.values(skills).filter(
                (skill) => skill.icon === `/assets/game/skills/${icon}`,
            );
            expect(entries, icon).toHaveLength(1);
            const slug = icon.slice(0, -5);
            expect(existsSync(`src/domain/skills/${slug}.ts`)).toBe(true);
            expect(existsSync(`docs/references/skills/${slug}.md`)).toBe(true);
            const wiki = entries[0].wiki!;
            expect(wiki.url).toMatch(/^https:\/\/wiki.mabinogiworld.com\//);
            if (slug === 'wand-mastery') {
                expect(wiki.unavailable).toBeTruthy();
                expect(wiki.rows).toEqual([]);
            } else {
                expect(wiki.rows.length).toBeGreaterThan(0);
                for (const row of wiki.rows)
                    expect(row.values, `${slug}: ${row.label}`).toHaveLength(15);
            }
        }
    });
    it('expands merged cells without shifting ranks and preserves racial AP/cost differences', () => {
        expect(skillRank('smash', { rank: 'F' }, 'Human')).toMatchObject({
            ap: 4,
            attackMultiplier: 2,
            costs: { stamina: 4 },
        });
        expect(skillRank('smash', { rank: 'F' }, 'Giant').attackMultiplier).toBe(3);
        expect(skillRank('firebolt', { rank: 'F' }).costs.mana).toBe(2);
        expect(skillRank('firebolt', { rank: 'F' }, 'Elf').ap).toBe(4);
        expect(skillRank('firebolt', { rank: '1' }).costs.mana).toBe(5);
        expect(skillRank('rangeAttack', { rank: 'F' }, 'Human').ap).toBe(1);
        expect(skillRank('rangeAttack', { rank: 'F' }, 'Elf').ap).toBe(3);
        expect(skillRank('thunder', { rank: 'F' }).costs.mana).toBe(36);
        expect(skillRank('thunder', { rank: '1' }, 'Giant').costs.mana).toBe(40);
        expect(wikiValue(skills.lightningBolt.wiki, 'Mana Use', 2, 'Giant')).toBe(2);
        expect(wikiValue(skills.counter.wiki, 'Damage From Opponent [%]', 14, 'Elf')).toBe(150);
    });
    it('keeps life skills and unverified entries out of learning and combat', () => {
        const c = structuredClone(active(fixture())!) as Character;
        for (const [id, skill] of Object.entries(skills)) {
            if (skill.route !== 'reference') continue;
            expect(() => learn(c, id)).toThrow('Catalog reference');
            expect(usableReason(c, id)).toBeTruthy();
        }
        c.race = 'Elf';
        expect(() => learn(c, 'arrowRevolver')).toThrow('Human');
    });
    it('applies cumulative stat gains once without refilling resources', () => {
        let save = fixture();
        const before = active(save)!;
        save = run(save, { type: 'LEARN', skill: 'magicMastery' });
        expect(active(save)!.mana).toBe(before.mana);
        expect(effectiveStats(active(save)!).mana).toBe(before.stats.mana + 11);
        save = run(save, { type: 'ENTER', seed: 42 });
        expect(effectiveStats(active(save)!).mana).toBe(before.stats.mana + 11);
    });
});

describe('additional combat skills', () => {
    it.each([
        'firebolt',
        'lightningBolt',
        'iceSpear',
        'thunder',
        'hailstorm',
        'meteorStrike',
        'shockwave',
    ])('%s deals damage, pays once, trains, and survives reload', (id) => {
        const before = battle(id);
        const costs = actionCosts(active(before)!, id);
        const after = cast(before, id);
        const c = active(after)!;
        expect(c.battle!.enemies[0].hp).toBeLessThan(100000);
        expect(c.mana).toBe(active(before)!.mana - costs.mana);
        expect(c.skills[id].counts.hit).toBe(1);
        validateSave(JSON.parse(JSON.stringify(after)));
    });
    it.each(['rangeAttack', 'magnumShot', 'arrowRevolver'])('%s works with a bow', (id) => {
        const after = cast(battle(id, 'Archery'), id);
        expect(active(after)!.battle!.enemies[0].hp).toBeLessThan(100000);
        expect(active(after)!.skills[id].counts.hit).toBe(1);
    });
    it('heals, restores mana, and freezes percentage costs at reservation', () => {
        let heal = produce(battle('healing'), (draft) => {
            draft.data.characters[0].hp = 1;
        });
        heal = cast(heal, 'healing');
        expect(active(heal)!.hp).toBeGreaterThan(1);
        expect(active(heal)!.skills.healing.counts.use).toBe(1);
        let mana = produce(battle('manaRegeneration'), (draft) => {
            draft.data.characters[0].mana = 0;
        });
        mana = cast(mana, 'manaRegeneration');
        expect(active(mana)!.mana).toBe(Math.floor(effectiveStats(active(mana)!).mana * 0.2));
        expect(active(mana)!.cooldowns.manaRegeneration).toBe(50);
        const save = battle('shockwave');
        const action = snapshotAction(active(save)!, 'shockwave', 'enemy-0');
        expect(action.costs.mana).toBe(Math.ceil(effectiveStats(active(save)!).mana * 0.01));
    });
    it('Defense protects one response and Mana Shield drains mana before health', () => {
        let defense = produce(battle('defense', 'Close Combat'), (draft) => {
            draft.data.characters[0].battle!.enemies[0].attack = 15;
        });
        const hp = active(defense)!.hp;
        defense = cast(defense, 'defense');
        expect(active(defense)!.hp).toBe(hp);
        expect(active(defense)!.effects.defense).toBeUndefined();
        let shield = produce(battle('manaShield'), (draft) => {
            draft.data.characters[0].battle!.enemies[0].attack = 15;
        });
        const before = active(shield)!;
        shield = cast(shield, 'manaShield');
        expect(active(shield)!.hp).toBe(before.hp);
        expect(active(shield)!.mana).toBeLessThan(before.mana - 4);
        expect(active(shield)!.effects.manaShield?.remaining).toBe(2);
        validateSave(JSON.parse(JSON.stringify(shield)));
        shield = run(run(shield, { type: 'PASS' }), { type: 'PASS' });
        expect(active(shield)!.effects.manaShield).toBeUndefined();
    });
    it('all playable wiki ranks have finite costs, AP, and modifiers', () => {
        for (const [id, skill] of Object.entries(skills)) {
            if (!skill.wiki || skill.route === 'reference') continue;
            for (const race of ['Human', 'Elf', 'Giant'] as const)
                for (const rank of ranks) {
                    const value = skillRank(id, { rank }, race);
                    for (const number of [
                        value.ap,
                        value.cooldown,
                        ...Object.values(value.costs),
                        value.attackMultiplier ?? 0,
                    ]) {
                        expect(Number.isFinite(number), `${id} ${race} ${rank}`).toBe(true);
                        expect(number).toBeGreaterThanOrEqual(0);
                    }
                }
        }
    });
});

it('rejects damaged saved support effects and counter coefficients', () => {
    for (const effects of [
        { defense: { defense: -1, protection: 0 } },
        { manaShield: { efficiency: 0, upkeep: 1, remaining: 2 } },
        { manaShield: { efficiency: 1, upkeep: -1, remaining: 2 } },
        { manaShield: { efficiency: 1, upkeep: 1, remaining: 0 } },
        {
            counter: {
                power: 1,
                multiplier: 1,
                opponentMultiplier: -1,
                source: { skill: 'counter', melee: true, sword: true, dual: false },
            },
        },
    ]) {
        const save = produce(fixture(), (draft) => {
            draft.data.characters[0].effects = effects;
        });
        expect(() => validateSave(save)).toThrow();
    }
});