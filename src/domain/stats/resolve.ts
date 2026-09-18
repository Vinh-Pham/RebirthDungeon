import { produce, type Immutable } from 'immer';
import type { Character, Enemy, Stats } from '../model';
import { items } from '../catalog';
import { ranks, skills } from '../skillCatalog';
import { wikiValue } from '../skills/wiki';
import { emptyCombatStats, isPercentage, statBound, statRules } from './rules';
import {
    primaryIds,
    statIds,
    type ModifierSource,
    type StatId,
    type StatModifier,
    type StatSnapshot,
} from './types';

export function equipment(c: Immutable<Character>) {
    const loadout = c.run?.baseline ?? c;
    const main = c.inventory.find((i) => i.id === loadout.weapon);
    const off = c.inventory.find((i) => i.id === loadout.offhand);
    const body = c.inventory.find((i) => i.id === loadout.armor);
    const weapon = main && items[main.kind],
        offDef = off && items[off.kind],
        armor = body && items[body.kind];
    const sword = !!main && ['sword', 'steel'].includes(main.kind);
    const dual = sword && !!off && main.id !== off.id && ['sword', 'steel'].includes(off.kind);
    return {
        main,
        off,
        weapon,
        offDef,
        armor,
        sword,
        dual,
        melee: !weapon || weapon.talent === 'Close Combat',
    };
}
export function progressionStats(c: Immutable<Character>): Stats {
    return produce({ ...c.base }, (draft) => {
        for (const id of primaryIds) draft[id] += c.growth[id];
    });
}

const growthNames: [keyof Stats, RegExp][] = [
    ['hp', /^Additional HP\b/],
    ['mana', /^Additional (Mana|MP)\b/],
    ['stamina', /^Additional Stamina\b/],
    ['str', /^Additional (Str|Strength)\b/],
    ['dex', /^Additional (Dex|Dexterity)\b/],
    ['int', /^Additional (Int|Intelligence)\b/],
    ['will', /^Additional Will\b/],
    ['luck', /^Additional Luck\b/],
];

/** A source snapshot is copied into a run; live statuses are deliberately excluded. */
export function createStatSnapshot(c: Immutable<Character>): StatSnapshot {
    const e = equipment(c),
        learned = c.run?.baseline?.skills ?? c.skills;
    const index = (id: string) => (learned[id] ? ranks.indexOf(learned[id].rank) : -1);
    const snapshot: StatSnapshot = {
        version: 1,
        base: { ...(c.run?.baseline?.stats ?? progressionStats(c)) },
        sources: [],
    };
    return produce(snapshot, (draft) => {
        const add = (source: ModifierSource) => {
            draft.sources.push(source);
        };
        for (const [id, progress] of Object.entries(learned)) {
            const skill = skills[id];
            if (!skill || skill.route === 'reference') continue;
            const r = ranks.indexOf(progress.rank);
            const modifiers: StatModifier[] = [];
            if (skill.wiki)
                for (const row of skill.wiki.rows) {
                    if (
                        !row.label.startsWith('Additional ') ||
                        !row.label.includes('Total') ||
                        (/Human|Elf|Giant/.test(row.label) && !row.label.includes(c.race))
                    )
                        continue;
                    const value = Number.parseFloat(row.values[r].replace(/,/g, '')) || 0;
                    for (const [stat, pattern] of growthNames)
                        if (pattern.test(row.label) && value) modifiers.push({ stat, flat: value });
                }
            const value = (label: string) => wikiValue(skill.wiki, label, r, c.race);
            const eligible =
                id === 'combatMastery' ||
                id === 'rangeAttack' ||
                (id === 'swordMastery' && e.sword) ||
                (id === 'dualMastery' && e.dual) ||
                (id === 'bowMastery' && e.weapon?.talent === 'Archery');
            if (eligible)
                modifiers.push({
                    stat: ['rangeAttack', 'bowMastery'].includes(id)
                        ? 'rangedAttack'
                        : 'meleeAttack',
                    flat: skill.wiki
                        ? (value('Additional Min Damage') + value('Additional Max Damage')) / 2
                        : skill.ranks[r].base,
                });
            if (
                (id === 'heavyMastery' && e.armor?.armorCategory === 'heavy') ||
                (id === 'lightMastery' && e.armor?.armorCategory === 'light')
            ) {
                for (const [stat, label] of [
                    ['defense', 'Additional Defense'],
                    ['magicDefense', 'Additional Magic Defense'],
                    ['protection', 'Additional Protection'],
                    ['magicProtection', 'Additional Magic Protection'],
                ] as const)
                    modifiers.push({ stat, flat: value(label) });
            }
            if (id === 'shieldMastery' && e.offDef?.type === 'shield')
                for (const stat of [
                    'defense',
                    'magicDefense',
                    'protection',
                    'magicProtection',
                ] as const)
                    modifiers.push({ stat, flat: skill.ranks[r].base });
            if (id === 'defense')
                modifiers.push({ stat: 'defense', flat: value('Additional Base Defense') });
            if (modifiers.length)
                add({ id: `skill:${id}`, name: skill.name, kind: 'skill', modifiers });
        }
        for (const [item, definition, slot] of [
            [e.main, e.weapon, 'main'],
            [e.off, e.offDef, 'offhand'],
            [
                c.inventory.find((i) => i.id === (c.run?.baseline?.armor ?? c.armor)),
                e.armor,
                'armor',
            ],
        ] as const) {
            if (!item || !definition) continue;
            const modifiers: StatModifier[] = structuredClone(definition.modifiers ?? []);
            if (definition.power && (slot === 'main' || e.dual)) {
                const power =
                    definition.power *
                    (item.durability === 0 ? 0.5 : 1) *
                    (slot === 'offhand' ? 0.5 : 1);
                for (const stat of (slot === 'offhand'
                    ? ['meleeAttack']
                    : ['meleeAttack', 'rangedAttack', 'magicAttack', 'dualGunAttack']) as StatId[])
                    modifiers.push({ stat, flat: power });
            }
            if (definition.defense) modifiers.push({ stat: 'defense', flat: definition.defense });
            if (definition.magicDefense)
                modifiers.push({ stat: 'magicDefense', flat: definition.magicDefense });
            if (slot === 'armor' && definition.armorCategory === 'heavy')
                modifiers.push({
                    stat: 'dex',
                    percentBp:
                        -100 *
                        (index('heavyMastery') < 0
                            ? 20
                            : wikiValue(
                                  skills.heavyMastery.wiki,
                                  'Dex Reduction',
                                  index('heavyMastery'),
                                  c.race,
                              )),
                });
            add({
                id: `equipment:${slot}:${item.id}`,
                name: definition.name,
                kind: 'equipment',
                modifiers,
                costs: structuredClone(definition.costModifiers ?? []),
            });
        }
        if (!e.weapon)
            add({
                id: 'equipment:unarmed',
                name: 'Unarmed',
                kind: 'equipment',
                modifiers: [{ stat: 'meleeAttack', flat: 2 }],
            });
        for (const slot of ['first', 'second'] as const) {
            const source = c.titleModifiers?.[slot];
            if (source)
                add({
                    ...(JSON.parse(JSON.stringify(source)) as ModifierSource),
                    id: `title:${slot}:${source.id}`,
                    kind: 'title',
                });
        }
    });
}

export function liveSources(c: Immutable<Character>): ModifierSource[] {
    const sources = (c.statuses ?? []).map((s) => ({
        id: `status:${s.definition.group}:${s.sourceId}`,
        name: `${s.definition.name} (${s.sourceName})`,
        kind: 'status' as const,
        modifiers: s.definition.modifiers,
        costs: s.definition.costs,
    })) as ModifierSource[];
    if (c.run?.baseline?.statSnapshot) {
        const e = equipment(c);
        for (const [item, definition, slot] of [
            [e.main, e.weapon, 'main'],
            [e.off, e.offDef, 'offhand'],
        ] as const) {
            if (item?.durability !== 0 || !definition?.power || (slot === 'offhand' && !e.dual))
                continue;
            const saved = c.run.baseline.statSnapshot.sources.find(
                (source) => source.id === `equipment:${slot}:${item.id}`,
            );
            const stat = 'meleeAttack';
            const full = definition.power * (slot === 'offhand' ? 0.5 : 1);
            if (saved?.modifiers.some((m) => m.stat === stat && m.flat === full))
                sources.push({
                    id: `wear:${item.id}`,
                    name: `${definition.name} (broken)`,
                    kind: 'equipment',
                    modifiers: (slot === 'offhand'
                        ? ([stat] as const)
                        : (['meleeAttack', 'rangedAttack', 'magicAttack', 'dualGunAttack'] as const)
                    ).map((stat) => ({ stat, flat: -full / 2 })),
                });
        }
    }
    // Saved legacy effects remain sources until they expire; never bake them into progression.
    if (c.effects.final)
        sources.push({
            id: 'status:final',
            name: 'Final Hit',
            kind: 'status',
            modifiers: [{ stat: 'meleeAttack', flat: c.effects.final.magnitude }],
        });
    if (c.effects.defense)
        sources.push({
            id: 'status:defense',
            name: 'Defense',
            kind: 'status',
            modifiers: [
                { stat: 'defense', flat: c.effects.defense.defense },
                { stat: 'protection', flat: c.effects.defense.protection },
            ],
        });
    return sources;
}

export function modifiedStat(
    id: StatId,
    base: number,
    modifiers: readonly Immutable<StatModifier>[],
): number {
    if (!statIds.includes(id) || !Number.isFinite(base))
        throw new Error('Unknown or invalid stat.');
    let flat = 0,
        percentBp = 0;
    for (const modifier of modifiers) {
        if (
            Object.keys(modifier).some((key) => !['stat', 'flat', 'percentBp'].includes(key)) ||
            !statIds.includes(modifier.stat) ||
            !Number.isFinite(modifier.flat ?? 0) ||
            !Number.isSafeInteger(modifier.percentBp ?? 0)
        )
            throw new Error('Invalid stat modifier.');
        if (modifier.stat === id) {
            flat += modifier.flat ?? 0;
            percentBp += modifier.percentBp ?? 0;
        }
    }
    const scale = isPercentage(id) ? 100 : 1;
    const value =
        Math.floor(((base + flat) * Math.max(0, 10000 + percentBp) * scale) / 10000 + 1e-9) / scale;
    const bound = statBound(id);
    return Math.min(bound.max, Math.max(bound.min, value));
}

export function resolveStats(c: Immutable<Character>) {
    const baseline = c.run?.baseline?.statSnapshot ?? createStatSnapshot(c);
    if (baseline.version !== statRules.version) throw new Error('Unsupported stat rules.');
    const sources: readonly Immutable<ModifierSource>[] = [...baseline.sources, ...liveSources(c)];
    const modifiers = sources.flatMap((source) => source.modifiers);
    const values = produce(emptyCombatStats(), (draft) => {
        for (const id of primaryIds) draft[id] = modifiedStat(id, baseline.base[id], modifiers);
        const base = {
            meleeAttack: draft.str * statRules.meleePerStr,
            rangedAttack: draft.dex * statRules.rangedPerDex,
            magicAttack: draft.int * statRules.magicPerInt,
            dualGunAttack: draft.str * statRules.dualPerStr + draft.int * statRules.dualPerInt,
            defense: draft.str * statRules.defensePerStr,
            magicDefense: draft.will * statRules.magicDefensePerWill,
            protection: 0,
            magicProtection: draft.int * statRules.magicProtectionPerInt,
            hpRegen: 0,
            manaRegen: 0,
            staminaRegen: 0,
        };
        for (const id of Object.keys(base) as (keyof typeof base)[])
            draft[id] = modifiedStat(id, base[id], modifiers);
    });
    const primary = Object.fromEntries(
        primaryIds.map((id) => [id, values[id]]),
    ) as unknown as Stats;
    return { values, primary, sources, base: baseline.base, version: baseline.version };
}

export function enemyStats(enemy: Immutable<Enemy>) {
    const modifiers = (enemy.statuses ?? []).flatMap((s) => s.definition.modifiers);
    const magic = enemy.attackType === 'magic';
    return {
        attack: modifiedStat(
            magic ? 'magicAttack' : enemy.attackType === 'ranged' ? 'rangedAttack' : 'meleeAttack',
            enemy.attack,
            modifiers,
        ),
        hp: modifiedStat('hp', enemy.maxHp, modifiers),
        defense: modifiedStat('defense', enemy.defense, modifiers),
        magicDefense: modifiedStat('magicDefense', enemy.magicDefense ?? 0, modifiers),
        protection: modifiedStat('protection', (enemy.protection ?? 0) * 100, modifiers) / 100,
        magicProtection:
            modifiedStat('magicProtection', (enemy.magicProtection ?? 0) * 100, modifiers) / 100,
    };
}
