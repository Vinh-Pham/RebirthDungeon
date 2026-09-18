import { freeze } from 'immer';
import type { Talent } from './model';
export const ranks = [
    'F',
    'E',
    'D',
    'C',
    'B',
    'A',
    '9',
    '8',
    '7',
    '6',
    '5',
    '4',
    '3',
    '2',
    '1',
] as const;
export type Rank = (typeof ranks)[number];
export interface SkillProgress {
    rank: Rank;
    counts: Record<string, number>;
}
export interface Objective {
    id: string;
    label: string;
    points: number;
    cap: number;
}
export interface RankDefinition {
    rank: Rank;
    base: number;
    pip: number;
    costs: { hp: number; mana: number; stamina: number };
    cooldown: number;
    weights: number[];
    ap: number;
    duration: number;
    objectives: Objective[];
}
export interface Skill {
    name: string;
    description: string;
    icon: string;
    talent?: Talent;
    resource: 'mana' | 'stamina';
    type: 'active' | 'passive';
    effect: 'attack' | 'counter' | 'buff' | 'passive';
    requirement:
        | 'any'
        | 'melee'
        | 'sword'
        | 'shield'
        | 'light'
        | 'heavy'
        | 'dual'
        | 'bow'
        | 'guns'
        | 'magic';
    route: 'starter' | 'lesson' | 'book' | 'collection';
    hits: number;
    target: 'one' | 'all' | 'self';
    ranks: RankDefinition[];
}
const objective = (id: string, label: string, points: number, cap: number): Objective => ({
    id,
    label,
    points,
    cap,
});
const attackObjectives = [
    objective('hit', 'Damaging actions', 2, 40),
    objective('kill', 'Enemies defeated', 5, 10),
];
const defenseObjectives = [
    objective('incoming', 'Eligible incoming attacks', 1, 100),
    objective('survive', 'Encounters survived', 5, 10),
];
function define(
    name: string,
    requirement: Skill['requirement'],
    base: number,
    growth: number,
    pip: number,
    cost: number,
    options: Partial<Omit<Skill, 'ranks'>> & { cooldown?: number } = {},
): Skill {
    const effect = options.effect ?? 'attack';
    const objectives =
        effect === 'counter'
            ? [
                  objective('use', 'Stances prepared', 2, 20),
                  objective('counter', 'Successful counters', 5, 20),
              ]
            : effect === 'buff'
              ? [
                    objective('use', 'Buffs activated', 2, 20),
                    objective('buffHit', 'Melee actions during buff', 3, 30),
                ]
              : name === 'Critical Hit'
                ? [
                      objective('critical', 'Critical actions', 5, 20),
                      objective('criticalKill', 'Critical defeats', 10, 5),
                  ]
                : ['shield', 'light', 'heavy'].includes(requirement)
                  ? defenseObjectives
                  : attackObjectives;
    const descriptions: Record<string, string> = {
        'Normal Attack': 'Strike one enemy with your equipped weapon, or fight unarmed.',
        Smash: 'A powerful single-target melee strike.',
        'Power Shot': 'Fire a strong arrow at one enemy.',
        'Double Shot': 'Fire two shots at one enemy using one hand of dice and one payment.',
        Icebolt: 'Cast ice magic at one enemy, applying magical defenses.',
        Counterattack:
            'Prepare one retaliation that negates the next eligible melee hit before your next turn. Ranged attacks and magic bypass it.',
        Windmill: 'Strike every living enemy once with the same hand of dice.',
        'Final Hit':
            'Spend this turn gaining a temporary melee attack bonus. The hand determines its strength; subsequent attacks still cost resources.',
        'Combat Mastery':
            'Permanently increase health capacity and strengthen melee attacks. Increasing capacity does not heal.',
        'Sword Mastery': 'Strengthen sword attacks, once per action even when using two swords.',
        'Dual Wield Mastery':
            'Strengthen attacks made with distinct swords equipped in both hands.',
        'Critical Hit':
            'Enable occasional critical attacks. Ranking increases critical damage, not chance.',
        'Shield Mastery': 'Improve physical and magical defenses while a shield is equipped.',
        'Light Armor Mastery': 'Improve physical and magical defenses while wearing light armor.',
        'Heavy Armor Mastery': 'Improve defenses and reduce heavy armor’s Dexterity penalty.',
    };
    return {
        name,
        description: descriptions[name],
        icon: '✧',
        requirement,
        resource: 'stamina',
        type: 'active',
        effect,
        route: 'lesson',
        hits: 1,
        target: 'one',
        ...options,
        ranks: ranks.map((rank, r) => ({
            rank,
            base: base + growth * r,
            pip,
            costs: {
                hp: 0,
                mana: options.resource === 'mana' ? cost : 0,
                stamina: options.resource === 'mana' ? 0 : cost,
            },
            cooldown: options.cooldown ?? 0,
            weights: name === 'Smash' && r >= 6 ? [5, 7, 9, 11, 13, 15] : [1, 1, 1, 1, 1, 1],
            ap: r === 14 ? 0 : 2 + r,
            duration: 2 + Math.floor(r / 5),
            objectives:
                name === 'Normal Attack' || r === 14 ? [] : objectives.map((o) => ({ ...o })),
        })),
    };
}
export const skills: Record<string, Skill> = {
    normal: define('Normal Attack', 'any', 0, 0, 0.2, 2, { route: 'starter', icon: '⚔' }),
    smash: define('Smash', 'melee', 4, 2, 0.4, 6, { talent: 'Close Combat' }),
    shot: define('Power Shot', 'bow', 4, 2, 0.4, 6, { talent: 'Archery' }),
    double: define('Double Shot', 'guns', 1, 1, 0.15, 6, { talent: 'Dual Gun', hits: 2 }),
    ice: define('Icebolt', 'magic', 3, 2, 0.35, 6, { talent: 'Magic', resource: 'mana' }),
    counter: define('Counterattack', 'melee', 2, 2, 0.3, 5, { effect: 'counter', target: 'self' }),
    windmill: define('Windmill', 'melee', 2, 1, 0.25, 8, { target: 'all', cooldown: 1 }),
    final: define('Final Hit', 'melee', 2, 1, 0.1, 8, {
        effect: 'buff',
        target: 'self',
        route: 'collection',
        cooldown: 4,
    }),
    combatMastery: define('Combat Mastery', 'melee', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
    }),
    swordMastery: define('Sword Mastery', 'sword', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
    }),
    shieldMastery: define('Shield Mastery', 'shield', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
    }),
    lightMastery: define('Light Armor Mastery', 'light', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
    }),
    heavyMastery: define('Heavy Armor Mastery', 'heavy', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
    }),
    dualMastery: define('Dual Wield Mastery', 'dual', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
    }),
    critical: define('Critical Hit', 'any', 0, 0, 0, 0, {
        type: 'passive',
        effect: 'passive',
        route: 'book',
    }),
};
export const skillRank = (id: string, progress?: { readonly rank: Rank }): RankDefinition =>
    skills[id].ranks[ranks.indexOf(progress?.rank ?? 'F')];
export function trainingPoints(id: string, progress: Readonly<SkillProgress>): number {
    return skillRank(id, progress).objectives.reduce(
        (sum, o) => sum + Math.min(o.cap, progress.counts[o.id] ?? 0) * o.points,
        0,
    );
}

freeze(skills, true);
