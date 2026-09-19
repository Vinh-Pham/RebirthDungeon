import type { Immutable } from 'immer';
import type { Character } from '../model';
import { items, skills } from '../catalog';
import { ranks } from '../Skills';
import { gainXp } from '../progression';
import { equipment, refreshStats } from '../skillSystem';
import { addInventoryItem, consumeInventoryItem } from '../inventory';
import { quests } from './catalog';
import { emptyRunQuests, type Objective, type QuestNpc } from './types';

export function notifyQuest(c: Character, id: string, text: string) {
    c.quests.notices.push({ id, text });
    c.quests.notices = c.quests.notices.slice(-8);
}
export function currentObjectives(c: Immutable<Character>, id: string): readonly Objective[] {
    const record = c.quests.records[id];
    return record ? quests[id].stages[record.stage].objectives : [];
}
export function objectiveCount(c: Immutable<Character>, id: string, o: Objective): number {
    if (o.kind === 'deliver' && c.quests.records[id]?.status !== 'completed')
        return Math.min(
            o.target,
            c.inventory.filter((i) => i.kind === o.item).reduce((n, i) => n + i.count, 0),
        );
    return c.quests.records[id]?.counts[o.id] ?? 0;
}
export function pendingCount(c: Immutable<Character>, id: string, o: Objective): number {
    return c.run?.quests?.counts[id]?.[o.id] ?? 0;
}
export function questReady(c: Immutable<Character>, id: string): boolean {
    const r = c.quests.records[id];
    return (
        !!r &&
        ['active', 'ready'].includes(r.status) &&
        r.stage === quests[id].stages.length - 1 &&
        currentObjectives(c, id).every((o) => objectiveCount(c, id, o) >= o.target)
    );
}
export function reconcileQuests(c: Character) {
    if (c.run || c.rp || c.role) return;
    for (const q of Object.values(quests).sort((a, b) => a.id.localeCompare(b.id))) {
        if (c.quests.records[q.id]) continue;
        const eligible = q.prerequisites.every((p) => {
            switch (p.kind) {
                case 'claimed':
                    return c.quests.records[p.quest]?.status === 'completed';
                case 'rank':
                    return (
                        !!c.skills[p.skill] &&
                        ranks.indexOf(c.skills[p.skill].rank) >= ranks.indexOf(p.rank)
                    );
                case 'sword':
                    return equipment(c).sword;
                case 'rebirth':
                    return c.quests.rebirths.some((r) => r.talent === p.talent);
            }
        });
        if (!eligible) continue;
        c.quests.records[q.id] = {
            status: q.delivery.kind === 'automatic' ? 'active' : 'available',
            stage: 0,
            counts: {},
        };
        if (q.delivery.kind === 'automatic')
            notifyQuest(c, `received:${q.id}`, `Quest received: ${q.title}`);
    }
    refreshQuests(c);
}
export function refreshQuests(c: Character) {
    for (const [id, r] of Object.entries(c.quests.records)) {
        if (!['active', 'ready'].includes(r.status)) continue;
        const objectives = currentObjectives(c, id);
        const done = objectives.every((o) => objectiveCount(c, id, o) >= o.target);
        if (done && r.stage < quests[id].stages.length - 1) {
            // Delivery stages are consumed only by an explicit hand-in, never by a read.
            if (objectives.some((o) => o.kind === 'deliver')) continue;
            r.stage++;
            notifyQuest(
                c,
                `stage:${id}:${r.stage}`,
                `Objective complete: ${quests[id].title} — ${quests[id].stages[r.stage].notes}`,
            );
        } else {
            if (done && r.status !== 'ready')
                notifyQuest(c, `ready:${id}`, `Ready to complete: ${quests[id].title}`);
            r.status = done ? 'ready' : 'active';
        }
    }
}
export function acceptQuest(c: Character, id: string, npc: QuestNpc) {
    const q = quests[id],
        r = c.quests.records[id];
    if (!q || q.delivery.kind !== 'npc' || q.delivery.npc !== npc || !r)
        throw new Error('No quest offer here.');
    if (r.status !== 'available') return;
    r.status = 'active';
    notifyQuest(c, `received:${id}`, `Quest received: ${q.title}`);
}
export function interactQuest(c: Character, id: string, step: string, npc: QuestNpc) {
    const r = c.quests.records[id];
    const o = currentObjectives(c, id).find(
        (o) => o.id === step && o.kind === 'talk' && o.npc === npc,
    );
    if (!r || !['active', 'ready'].includes(r.status) || !o)
        throw new Error('No quest conversation here.');
    r.counts[o.id] = o.target;
    refreshQuests(c);
}
export function snapshotQuests(c: Character) {
    const state = emptyRunQuests();
    for (const [id, r] of Object.entries(c.quests.records))
        if (r.status === 'active') state.stages[id] = r.stage;
    return state;
}
export function recordDefeats(c: Character) {
    const b = c.battle,
        run = c.run,
        state = run?.quests;
    if (!b || !run || !state || c.role) return;
    for (const enemy of b.enemies) {
        const key = `${run.id}:${b.room}:${enemy.id}`;
        if (enemy.hp > 0 || enemy.species !== 'spider' || state.defeats.includes(key)) continue;
        state.defeats.push(key);
        for (const [id, stage] of Object.entries(state.stages)) {
            const r = c.quests.records[id];
            if (r.stage !== stage || r.status !== 'active') continue;
            for (const o of quests[id].stages[stage].objectives) {
                if (o.kind !== 'defeat' || (o.sword && !equipment(c).sword)) continue;
                state.counts[id] ??= {};
                state.counts[id][o.id] = Math.min(
                    o.target - (r.counts[o.id] ?? 0),
                    (state.counts[id][o.id] ?? 0) + 1,
                );
            }
        }
    }
}
export function bankRunQuests(c: Character, victory: boolean) {
    const state = c.run?.quests;
    if (!state || c.role) return;
    recordDefeats(c);
    for (const [id, stage] of Object.entries(state.stages)) {
        const r = c.quests.records[id];
        if (r.stage !== stage || r.status !== 'active') continue;
        for (const o of quests[id].stages[stage].objectives) {
            const count = o.kind === 'clear' && victory ? 1 : (state.counts[id]?.[o.id] ?? 0);
            if (count) r.counts[o.id] = Math.min(o.target, (r.counts[o.id] ?? 0) + count);
        }
    }
    c.run!.quests = emptyRunQuests();
    refreshQuests(c);
}
export function completeQuest(c: Character, id: string, npc?: QuestNpc) {
    const q = quests[id],
        r = c.quests.records[id];
    if (!q || !r) throw new Error('Unknown quest.');
    if (r.claimId) return;
    if (!questReady(c, id)) throw new Error('Finish the quest objectives first.');
    for (const o of currentObjectives(c, id)) {
        if (o.kind !== 'deliver') continue;
        if (npc !== o.npc) throw new Error('Bring these items to the named NPC.');
        let remaining = o.target;
        for (const item of c.inventory.filter((i) => i.kind === o.item)) {
            const n = Math.min(item.count, remaining);
            if (n) consumeInventoryItem(c, item.id, n);
            remaining -= n;
        }
        c.inventory = c.inventory.filter((i) => i.count > 0);
        r.counts[o.id] = o.target;
    }
    for (const [balance, award] of [
        [c.gold, q.rewards.gold ?? 0],
        [c.ap, q.rewards.ap ?? 0],
        [c.xp, q.rewards.xp ?? 0],
    ])
        if (!Number.isSafeInteger(balance + award) || balance + award < 0)
            throw new Error('Reward exceeds the supported balance.');
    c.gold += q.rewards.gold ?? 0;
    c.ap += q.rewards.ap ?? 0;
    gainXp(c, q.rewards.xp ?? 0);
    if (!Number.isSafeInteger(c.ap) || !Number.isSafeInteger(c.totalLevel))
        throw new Error('Reward exceeds the supported balance.');
    if (q.rewards.skill && !c.skills[q.rewards.skill])
        c.skills[q.rewards.skill] = { rank: 'F', counts: {} };
    for (const [index, item] of (q.rewards.items ?? []).entries()) {
        const grant = { ...item, id: `quest:${id}:${index}` };
        // Try placement against a copy: a partially filled stack must not be duplicated in overflow.
        try {
            addInventoryItem(c, grant);
        } catch {
            c.quests.overflow.push(grant);
        }
    }
    r.status = 'completed';
    r.claimId = `quest:${c.id}:${id}`;
    c.quests.tracked = c.quests.tracked.filter((tracked) => tracked !== id);
    if (id === 'arens-expedition') {
        c.quests.chapters.push(q.chapter!);
        c.quests.generations.push(q.generation!);
    }
    refreshStats(c);
    notifyQuest(c, `claimed:${id}`, `Reward claimed: ${q.title}`);
    reconcileQuests(c);
}
export function trackQuest(c: Character, id: string, tracked: boolean) {
    const r = c.quests.records[id];
    if (!r || !['active', 'ready'].includes(r.status))
        throw new Error('Only received, unfinished quests can be tracked.');
    if (!tracked) c.quests.tracked = c.quests.tracked.filter((q) => q !== id);
    else if (!c.quests.tracked.includes(id)) {
        if (c.quests.tracked.length >= 3)
            throw new Error('Track up to three quests. Untrack another quest first.');
        c.quests.tracked.push(id);
    }
}
export function withdrawQuestReward(c: Character, id: string) {
    const item = c.quests.overflow.find((i) => i.id === id);
    if (!item) return;
    addInventoryItem(c, { ...item });
    c.quests.overflow = c.quests.overflow.filter((i) => i.id !== id);
}
export function rewardLabels(c: Immutable<Character>, id: string): string[] {
    const r = quests[id].rewards;
    return [
        r.gold ? `${r.gold}g` : '',
        r.xp ? `${r.xp} EXP` : '',
        r.ap ? `${r.ap} AP` : '',
        r.skill
            ? `${skills[r.skill].name} Rank F${c.skills[r.skill] ? ' (already known; current rank retained)' : ''}`
            : '',
        ...(r.items ?? []).map((i) => `${i.count} × ${items[i.kind].name}`),
    ].filter(Boolean);
}
