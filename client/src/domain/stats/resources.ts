import { produce, type Immutable } from 'immer';
import type { Character, Resource } from '../model';
import { resolveStats } from './resolve';
import { statRules } from './rules';

export const pools = ['hp', 'mana', 'stamina'] as const;
export type CostVector = Record<Resource, number>;
export function effectiveCosts(
    c: Immutable<Character>,
    skill: string,
    rankCosts: Immutable<CostVector>,
): CostVector {
    const modifiers = resolveStats(c)
        .sources.flatMap((source) => source.costs ?? [])
        .filter((modifier) => !modifier.skill || modifier.skill === skill);
    return produce({ hp: 0, mana: 0, stamina: 0 }, (draft) => {
        for (const pool of pools) {
            const base = rankCosts[pool];
            if (!Number.isFinite(base) || base < 0) throw new Error('Invalid skill cost.');
            if (base === 0) continue;
            const scoped = modifiers.filter((modifier) => modifier.pool === pool);
            const flat = scoped.reduce((sum, modifier) => sum + (modifier.flat ?? 0), 0);
            const bp = scoped.reduce((sum, modifier) => sum + (modifier.percentBp ?? 0), 0);
            draft[pool] = Math.min(
                statRules.maxAmount,
                Math.max(1, Math.ceil(((base + flat) * Math.max(0, 10000 + bp)) / 10000)),
            );
        }
        if (!pools.some((pool) => draft[pool] > 0))
            throw new Error('An active skill must consume a resource.');
    });
}
export function resourceState(c: Immutable<Character>, pool: Resource) {
    const reserved = c.battle?.action?.costs[pool] ?? 0;
    return {
        current: c[pool],
        maximum: resolveStats(c).primary[pool],
        reserved,
        available: Math.max(0, c[pool] - reserved),
    };
}
export function costDescription(costs: Immutable<CostVector>) {
    return pools
        .filter((pool) => costs[pool] > 0)
        .map((pool) => `${costs[pool]} ${pool === 'hp' ? 'HP' : pool === 'mana' ? 'MP' : 'SP'}`)
        .join(' + ');
}
export function affordability(
    c: Immutable<Character>,
    costs: Immutable<CostVector>,
    useReserved = true,
) {
    for (const pool of pools) {
        const available = useReserved ? resourceState(c, pool).available : c[pool];
        if (available - costs[pool] < (pool === 'hp' ? 1 : 0))
            return `Not enough ${pool}${pool === 'hp' && costs.hp ? ' (must leave at least 1 HP)' : ''}`;
    }
    return '';
}