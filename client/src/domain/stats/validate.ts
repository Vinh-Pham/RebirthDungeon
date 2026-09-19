import type { Immutable } from 'immer';
import type { Character, Enemy } from '../model';
import {
    primaryIds,
    statIds,
    type ModifierSource,
    type StatModifier,
    type CostModifier,
} from './types';
import { statRules } from './rules';
const validAmount = (n: number) => Number.isFinite(n) && Math.abs(n) <= statRules.maxAmount;
function modifiers(
    values: readonly Immutable<StatModifier>[],
    costs: readonly Immutable<CostModifier>[] = [],
) {
    if (
        !Array.isArray(values) ||
        values.length > statRules.maxModifiers ||
        !Array.isArray(costs) ||
        costs.length > statRules.maxModifiers
    )
        throw new Error('Invalid modifier list.');
    for (const m of values)
        if (
            !statIds.includes(m.stat) ||
            !validAmount(m.flat ?? 0) ||
            !Number.isSafeInteger(m.percentBp ?? 0) ||
            !validAmount(m.percentBp ?? 0) ||
            Object.keys(m).some((key) => !['stat', 'flat', 'percentBp'].includes(key))
        )
            throw new Error('Invalid stat modifier.');
    for (const m of costs)
        if (
            !['hp', 'mana', 'stamina'].includes(m.pool) ||
            !validAmount(m.flat ?? 0) ||
            !Number.isSafeInteger(m.percentBp ?? 0) ||
            !validAmount(m.percentBp ?? 0) ||
            (m.skill !== undefined && typeof m.skill !== 'string')
        )
            throw new Error('Invalid cost modifier.');
}
function source(s: Immutable<ModifierSource>) {
    if (!s?.id || !s.name || !['equipment', 'skill', 'title', 'status'].includes(s.kind))
        throw new Error('Invalid stat source.');
    modifiers(s.modifiers, s.costs);
}
export function validateActorStats(actor: Immutable<Character | Enemy>) {
    if (!Array.isArray(actor.statuses) && 'stats' in actor) throw new Error('Missing statuses.');
    const groups = new Set<string>();
    for (const s of actor.statuses ?? []) {
        const d = s.definition;
        if (
            !d ||
            d.version !== 1 ||
            !d.id ||
            !d.name ||
            !d.group ||
            groups.has(d.group) ||
            !s.sourceId ||
            !s.sourceName ||
            s.targetId !== actor.id ||
            typeof s.skipNext !== 'boolean' ||
            typeof d.removable !== 'boolean' ||
            !Number.isSafeInteger(d.priority) ||
            !Number.isSafeInteger(d.duration) ||
            d.duration < 1 ||
            d.duration > statRules.maxDuration ||
            !Number.isSafeInteger(s.remaining) ||
            s.remaining < 1 ||
            s.remaining > d.duration ||
            !Array.isArray(d.tags) ||
            d.tags.some((tag) => !['buff', 'harmful', 'poison'].includes(tag))
        )
            throw new Error('Invalid saved status.');
        groups.add(d.group);
        modifiers(d.modifiers, d.costs);
        for (const e of d.periodic ?? [])
            if (
                !['restore', 'damage'].includes(e.kind) ||
                !['hp', 'mana', 'stamina'].includes(e.pool) ||
                !Number.isSafeInteger(e.amount) ||
                !validAmount(e.amount) ||
                e.amount < 0 ||
                (e.damageType !== undefined &&
                    !['true', 'physical', 'magic'].includes(e.damageType))
            )
                throw new Error('Invalid periodic effect.');
    }
    if (groups.size > statRules.maxSources) throw new Error('Too many statuses.');
    if (!('stats' in actor)) return;
    if (!actor.titleModifiers) throw new Error('Missing title sources.');
    for (const s of Object.values(actor.titleModifiers)) source(s);
    for (const values of [actor.base, actor.growth, actor.stats])
        for (const id of primaryIds)
            if (!validAmount(values[id])) throw new Error('Invalid base stats.');
    for (const pool of ['hp', 'mana', 'stamina'] as const)
        if (
            actor[pool] < 0 ||
            actor[pool] > actor.stats[pool] ||
            actor.stats[pool] < (pool === 'hp' ? 1 : 0)
        )
            throw new Error('Invalid resource bounds.');
    const snapshot = actor.run?.baseline?.statSnapshot;
    if (actor.run && !snapshot) throw new Error('Missing stat snapshot.');
    if (snapshot) {
        if (
            snapshot.version !== 1 ||
            !Array.isArray(snapshot.sources) ||
            snapshot.sources.length > statRules.maxSources
        )
            throw new Error('Invalid stat snapshot.');
        for (const id of primaryIds)
            if (!validAmount(snapshot.base[id])) throw new Error('Invalid snapshot base.');
        const ids = new Set<string>();
        for (const s of snapshot.sources) {
            source(s);
            if (ids.has(s.id)) throw new Error('Duplicate stat source.');
            ids.add(s.id);
        }
    }
}