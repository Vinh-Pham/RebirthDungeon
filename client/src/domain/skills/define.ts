import { ranks, type Skill, type Objective } from './types';
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
export function define(
    name: string,
    requirement: Skill['requirement'],
    base: number,
    growth: number,
    pip: number,
    cost: number,
    options: Partial<Omit<Skill, 'ranks'>> & {
        cooldown?: number;
        rankWeights?: (index: number) => number[];
        training?: Objective[];
    } = {},
): Skill {
    const { rankWeights, training, ...definition } = options;
    const effect = options.effect ?? 'attack';
    const objectives =
        training ??
        (['heal', 'defend', 'manaShield', 'restoreMana', 'status'].includes(effect)
            ? [objective('use', 'Successful uses', 4, 25)]
            : effect === 'counter'
              ? [
                    objective('use', 'Stances prepared', 2, 20),
                    objective('counter', 'Successful counters', 5, 20),
                ]
              : effect === 'buff'
                ? [
                      objective('use', 'Buffs activated', 2, 20),
                      objective('buffHit', 'Melee actions during buff', 3, 30),
                  ]
                : ['shield', 'light', 'heavy'].includes(requirement)
                  ? defenseObjectives
                  : attackObjectives);
    return {
        name,
        description: name,
        icon: '✧',
        requirement,
        resource: 'stamina',
        type: 'active',
        effect,
        route: 'lesson',
        hits: 1,
        target: 'one',
        ...definition,
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
            weights: rankWeights?.(r) ?? [1, 1, 1, 1, 1, 1],
            ap: r === 14 ? 0 : 2 + r,
            duration: 2 + Math.floor(r / 5),
            objectives:
                options.route === 'starter' || r === 14 ? [] : objectives.map((o) => ({ ...o })),
        })),
    };
}