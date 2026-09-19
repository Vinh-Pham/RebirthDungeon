import { createMemory } from './roleplay';
import type { Character } from '../model';
import { items, skills } from '../catalog';
import { quests } from './catalog';
import { questCategories, questNpcs, type QuestDefinition } from './types';
import { ranks } from '../Skills';

export function validateQuestCatalog(catalog: Record<string, QuestDefinition> = quests) {
    const visited = new Set<string>(),
        visiting = new Set<string>();
    const visit = (id: string) => {
        if (visited.has(id)) return;
        const q = catalog[id];
        if (!q || visiting.has(id))
            throw new Error('Missing quest reference or prerequisite cycle.');
        visiting.add(id);
        if (
            q.id !== id ||
            !questCategories.includes(q.category) ||
            !q.stages.length ||
            new Set(q.stages.map((s) => s.id)).size !== q.stages.length
        )
            throw new Error('Invalid quest definition.');
        if (q.delivery.kind === 'npc' && !questNpcs[q.delivery.npc])
            throw new Error('Unknown quest NPC.');
        const objectives = q.stages.flatMap((s) => s.objectives);
        if (
            q.stages.some((s) => !s.objectives.length) ||
            new Set(objectives.map((o) => o.id)).size !== objectives.length
        )
            throw new Error('Invalid quest objectives.');
        for (const o of objectives) {
            if (
                !Number.isSafeInteger(o.target) ||
                o.target < 1 ||
                ('npc' in o && !questNpcs[o.npc]) ||
                (o.kind === 'deliver' && !items[o.item])
            )
                throw new Error('Unattainable quest objective.');
        }
        for (const p of q.prerequisites) {
            if (p.kind === 'claimed') visit(p.quest);
            if (
                p.kind === 'rank' &&
                (!skills[p.skill] || !ranks.includes(p.rank) || q.rewards.skill === p.skill)
            )
                throw new Error('Invalid skill prerequisite.');
        }
        if (
            [q.rewards.gold, q.rewards.xp, q.rewards.ap].some(
                (n) => n !== undefined && (!Number.isSafeInteger(n) || n < 0),
            ) ||
            (q.rewards.skill && !skills[q.rewards.skill]) ||
            q.rewards.items?.some(
                (i) => !items[i.kind] || !Number.isSafeInteger(i.count) || i.count < 1,
            )
        )
            throw new Error('Invalid quest reward.');
        visiting.delete(id);
        visited.add(id);
    };
    for (const id of Object.keys(catalog)) visit(id);
}
validateQuestCatalog();

export function validateQuests(c: Character) {
    const j = c.quests;
    if (
        !j ||
        j.version !== 1 ||
        !j.records ||
        !Array.isArray(j.tracked) ||
        j.tracked.length > 3 ||
        new Set(j.tracked).size !== j.tracked.length ||
        !Array.isArray(j.overflow) ||
        !Array.isArray(j.rebirths) ||
        !Array.isArray(j.chapters) ||
        !Array.isArray(j.generations) ||
        !Array.isArray(j.notices)
    )
        throw new Error('Invalid quest journal.');
    for (const [id, r] of Object.entries(j.records)) {
        const q = quests[id];
        if (
            !q ||
            !r ||
            !['available', 'active', 'ready', 'completed'].includes(r.status) ||
            !Number.isInteger(r.stage) ||
            !q.stages[r.stage] ||
            !r.counts
        )
            throw new Error('Invalid quest record.');
        if (
            (r.status === 'completed') !== !!r.claimId ||
            (r.claimId && r.claimId !== `quest:${c.id}:${id}`) ||
            (r.status === 'completed' && r.stage !== q.stages.length - 1)
        )
            throw new Error('Invalid quest claim.');
        const objectives = q.stages.slice(0, r.stage + 1).flatMap((s) => s.objectives);
        for (const [oid, count] of Object.entries(r.counts)) {
            const o = objectives.find((o) => o.id === oid);
            if (!o || !Number.isSafeInteger(count) || count < 0 || count > o.target)
                throw new Error('Invalid quest progress.');
        }
        if (
            q.stages
                .slice(0, r.stage)
                .some((s) => s.objectives.some((o) => r.counts[o.id] !== o.target)) ||
            (r.status === 'completed' && objectives.some((o) => r.counts[o.id] !== o.target))
        )
            throw new Error('Missing quest checkpoint.');
        if (
            r.status === 'available' &&
            (q.delivery.kind !== 'npc' || r.stage !== 0 || Object.keys(r.counts).length)
        )
            throw new Error('Invalid quest offer.');
    }
    if (j.tracked.some((id) => !['active', 'ready'].includes(j.records[id]?.status)))
        throw new Error('Invalid tracked quest.');
    if (
        new Set(j.overflow.map((i) => i.id)).size !== j.overflow.length ||
        j.overflow.some(
            (i) =>
                !items[i.kind] ||
                !Number.isSafeInteger(i.count) ||
                i.count < 1 ||
                !Object.entries(j.records).some(
                    ([id, r]) =>
                        r.claimId &&
                        (quests[id].rewards.items ?? []).some(
                            (grant, index) =>
                                i.id === `quest:${id}:${index}` &&
                                grant.kind === i.kind &&
                                grant.count === i.count,
                        ),
                ),
        )
    )
        throw new Error('Invalid quest overflow.');
    if (
        j.rebirths.some(
            (r) => !r.id || !['Close Combat', 'Archery', 'Magic', 'Dual Gun'].includes(r.talent),
        ) ||
        new Set(j.rebirths.map((r) => r.id)).size !== j.rebirths.length
    )
        throw new Error('Invalid rebirth evidence.');
    const finishedStory = j.records['arens-expedition']?.status === 'completed';
    if (
        JSON.stringify(j.chapters) !== JSON.stringify(finishedStory ? ['beneath-the-ruins'] : []) ||
        JSON.stringify(j.generations) !== JSON.stringify(finishedStory ? ['broken-seal'] : [])
    )
        throw new Error('Invalid story completion.');
    if (
        j.notices.length > 8 ||
        j.notices.some((n) => typeof n.id !== 'string' || typeof n.text !== 'string')
    )
        throw new Error('Invalid quest notices.');
    if (c.run) {
        const state = c.run.quests;
        if (
            !state ||
            state.version !== 1 ||
            !state.stages ||
            !state.counts ||
            !Array.isArray(state.defeats) ||
            new Set(state.defeats).size !== state.defeats.length ||
            state.defeats.some((id) => typeof id !== 'string' || !id.startsWith(`${c.run!.id}:`))
        )
            throw new Error('Invalid run quest snapshot.');
        for (const [id, stage] of Object.entries(state.stages)) {
            if (
                !j.records[id] ||
                j.records[id].stage !== stage ||
                j.records[id].status !== 'active'
            )
                throw new Error('Invalid quest stage snapshot.');
        }
        for (const [id, counts] of Object.entries(state.counts)) {
            if (!(id in state.stages) || !counts) throw new Error('Invalid pending quest.');
            for (const [oid, count] of Object.entries(counts)) {
                const o = quests[id].stages[state.stages[id]].objectives.find((o) => o.id === oid);
                if (
                    !o ||
                    o.kind !== 'defeat' ||
                    !Number.isSafeInteger(count) ||
                    count < 0 ||
                    count + (j.records[id].counts[oid] ?? 0) > o.target
                )
                    throw new Error('Invalid pending count.');
            }
        }
    }
    if (
        c.rp &&
        (c.run ||
            c.battle ||
            c.reward ||
            c.role ||
            c.rp.version !== 1 ||
            c.rp.scenario !== 'aren-memory' ||
            !c.rp.attemptId ||
            !Number.isInteger(c.rp.rng) ||
            c.rp.actor?.role !== 'aren' ||
            c.rp.actor.rp ||
            !c.rp.actor.run ||
            c.rp.actor.reward ||
            c.rp.actor.id !== `aren:${c.rp.attemptId}` ||
            j.records['arens-expedition']?.status !== 'active' ||
            j.records['arens-expedition']?.stage !== 0)
    )
        throw new Error('Invalid memory session.');
    if (c.rp) {
        const template = createMemory(c.rp.attemptId).actor;
        const actor = c.rp.actor;
        const run = actor.run!;
        if (
            actor.race !== template.race ||
            actor.talent !== template.talent ||
            actor.name !== template.name ||
            actor.age !== 17 ||
            actor.xp !== 0 ||
            actor.gold !== 0 ||
            actor.ap !== 0 ||
            actor.level !== 1 ||
            actor.equipment.main !== template.equipment.main ||
            actor.equipment.offhand ||
            actor.equipment.body ||
            actor.bank.length ||
            Object.keys(actor.quests.records).length ||
            JSON.stringify(actor.skills) !== JSON.stringify(template.skills) ||
            JSON.stringify(actor.base) !== JSON.stringify(template.base) ||
            (['contentVersion', 'skills', 'stats', 'statSnapshot', 'equipment'] as const).some(
                (key) =>
                    JSON.stringify(run.baseline?.[key]) !==
                    JSON.stringify(template.run!.baseline?.[key]),
            ) ||
            JSON.stringify(run.rooms) !== JSON.stringify(template.run!.rooms) ||
            JSON.stringify(run.tiles) !== JSON.stringify(template.run!.tiles) ||
            run.id !== template.run!.id ||
            run.chests.length ||
            run.chosen !== null ||
            new Set(run.cleared).size !== run.cleared.length ||
            run.cleared.some((id) => id !== 1 && id !== 2) ||
            !Number.isFinite(run.x) ||
            !Number.isFinite(run.y) ||
            !run.tiles[Math.floor(run.y / 32)]?.[Math.floor(run.x / 32)] ||
            actor.inventory.some(
                (i) =>
                    !template.inventory.some(
                        (t) =>
                            t.id === i.id &&
                            t.kind === i.kind &&
                            Number.isInteger(i.count) &&
                            i.count > 0 &&
                            i.count <= t.count,
                    ),
            ) ||
            !actor.inventory.some((i) => i.id === 'aren-sword')
        )
            throw new Error('Invalid borrowed character or scenario.');
    }
}
