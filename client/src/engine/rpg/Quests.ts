import { awardTitle } from './Titles';
import { z } from 'zod';
import { SkillRankSchema, SKILL_RANKS } from '../../data/schemas/skillRank';
import type { QuestCondition, QuestDefinition, QuestObjective } from '../../data/schemas/quests';
import type { ContentRegistry } from '../data/ContentRegistry';
import { cloneData } from '../cloneData';
import { produceState, type Draft } from '../immutableState';
import {
  addItem,
  experienceToNextLevel,
  grantExperience,
  itemCount,
  removeOwnedItem,
  removableCount,
  validateHero,
  type Hero,
  type HeroSnapshot,
} from './Character';
import { learnSkillDraft, type ActionOutcome } from './Skills';
import { MAX_LEVEL } from './Leveling';

export { emptyQuestProgression } from './QuestState';
export function rankAtLeast(
  actual: z.infer<typeof SkillRankSchema> | undefined,
  required: z.infer<typeof SkillRankSchema>,
) {
  return !!actual && SKILL_RANKS.indexOf(actual) >= SKILL_RANKS.indexOf(required);
}
export function questEligible(hero: HeroSnapshot, condition?: QuestCondition): boolean {
  if (!condition) return true;
  switch (condition.kind) {
    case 'all':
      return condition.conditions.every((c) => questEligible(hero, c));
    case 'any':
      return condition.conditions.some((c) => questEligible(hero, c));
    case 'quest':
      return hero.quests[condition.questId]?.status === 'completed';
    case 'level':
      return hero.level >= condition.level;
    case 'talent':
      return hero.growthTalent === condition.talent;
    case 'skill':
      return rankAtLeast(hero.learnedSkills[condition.skillId]?.rank, condition.rank);
    case 'flag':
      return hero.questFlags.includes(condition.flagId);
    case 'item':
      return condition.equipped
        ? (!!hero.equipment.armor &&
            hero.armors[hero.equipment.armor]?.itemId === condition.itemId) ||
            (!!hero.equipment.weapon &&
              hero.weapons[hero.equipment.weapon]?.itemId === condition.itemId)
        : itemCount(hero, condition.itemId) >= condition.quantity;
  }
}
export const questStage = (hero: HeroSnapshot, quest: QuestDefinition) =>
  quest.stages.find((s) => s.id === hero.quests[quest.id]?.stageId);
export function objectiveProgress(hero: HeroSnapshot, quest: QuestDefinition, o: QuestObjective) {
  if (hero.quests[quest.id]?.status === 'completed') return o.target;
  if (o.kind === 'ownItem') return Math.min(o.target, itemCount(hero, o.itemId));
  if (o.kind === 'deliverItem')
    return Math.min(o.target, removableCount(hero, { itemId: o.itemId }));
  if (o.kind === 'skillRank')
    return rankAtLeast(hero.learnedSkills[o.skillId]?.rank, o.rank) ? 1 : 0;
  return hero.quests[quest.id]?.counts[o.id] ?? 0;
}
export function questReady(hero: HeroSnapshot, quest: QuestDefinition) {
  const record = hero.quests[quest.id],
    stage = questStage(hero, quest);
  return (
    record?.status === 'active' &&
    stage?.id === quest.stages.at(-1)!.id &&
    stage.objectives.every((o) => objectiveProgress(hero, quest, o) >= o.target)
  );
}
/** State facts may be reconciled; past interactions or encounters are never replayed. */
export function reconcileQuests(
  hero: Hero,
  content: ContentRegistry,
  openNpc?: { worldId: string; objectId: string },
) {
  for (const quest of content.data.quests) {
    if (
      !hero.quests[quest.id] &&
      questEligible(hero, quest.prerequisite) &&
      (quest.delivery === 'automatic' ||
        (quest.offerNpc?.worldId === openNpc?.worldId &&
          quest.offerNpc?.objectId === openNpc?.objectId))
    ) {
      hero.quests[quest.id] = { status: 'available', stageId: quest.stages[0].id, counts: {} };
    }
    advanceStages(hero, quest);
  }
  const tracked = hero.trackedObjectives.filter((t) => {
    const quest = content.data.quests.find((q) => q.id === t.questId);
    return (
      quest &&
      hero.quests[quest.id]?.status === 'active' &&
      questStage(hero, quest)?.objectives.some((o) => o.id === t.objectiveId)
    );
  });
  if (tracked.length !== hero.trackedObjectives.length) hero.trackedObjectives = tracked;
}
function advanceStages(hero: Hero, quest: QuestDefinition) {
  const record = hero.quests[quest.id];
  if (record?.status !== 'active') return;
  let index = quest.stages.findIndex((s) => s.id === record.stageId);
  while (
    index >= 0 &&
    index < quest.stages.length - 1 &&
    quest.stages[index].objectives.every((o) => objectiveProgress(hero, quest, o) >= o.target)
  ) {
    record.stageId = quest.stages[++index].id;
  }
}
export function acceptQuestDraft(
  hero: Draft<Hero>,
  quest: QuestDefinition,
  content: ContentRegistry,
) {
  if (hero.quests[quest.id]?.status !== 'available' || !questEligible(hero, quest.prerequisite))
    throw new Error('This quest is not currently eligible for acceptance');
  hero.quests[quest.id] = { status: 'active', stageId: quest.stages[0].id, counts: {} };
  reconcileQuests(hero, content);
}
export function acceptQuest(
  hero: HeroSnapshot,
  quest: QuestDefinition,
  content: ContentRegistry,
): HeroSnapshot {
  return produceState(hero, (draft) => acceptQuestDraft(draft, quest, content));
}
export function trackObjective(hero: Hero, quest: QuestDefinition, objectiveId: string) {
  const existing = hero.trackedObjectives.findIndex(
    (t) => t.questId === quest.id && t.objectiveId === objectiveId,
  );
  if (existing >= 0) {
    hero.trackedObjectives.splice(existing, 1);
    return;
  }
  if (
    hero.quests[quest.id]?.status !== 'active' ||
    !questStage(hero, quest)?.objectives.some((o) => o.id === objectiveId)
  )
    throw new Error('Track an active objective');
  if (hero.trackedObjectives.length === 3)
    throw new Error('Untrack an objective before adding another (maximum three)');
  hero.trackedObjectives.push({ questId: quest.id, objectiveId });
}
export type QuestWorldEvidence =
  | { kind: 'interact'; worldId: string; objectId: string }
  | { kind: 'visit'; worldId: string }
  | { kind: 'clearDungeon'; dungeonId: string };
export function recordQuestWorldEvidence(
  hero: Hero,
  evidence: QuestWorldEvidence,
  content: ContentRegistry,
) {
  for (const quest of content.data.quests) {
    const record = hero.quests[quest.id];
    if (record?.status !== 'active') continue;
    for (const o of questStage(hero, quest)!.objectives) {
      const match =
        (o.kind === 'interact' &&
          evidence.kind === 'interact' &&
          o.worldId === evidence.worldId &&
          o.objectId === evidence.objectId) ||
        (o.kind === 'visit' && evidence.kind === 'visit' && o.worldId === evidence.worldId) ||
        (o.kind === 'clearDungeon' &&
          evidence.kind === 'clearDungeon' &&
          o.dungeonId === evidence.dungeonId);
      if (match) record.counts[o.id] = Math.min(o.target, (record.counts[o.id] ?? 0) + 1);
    }
  }
  reconcileQuests(hero, content);
}
/** Simulate delivery first, then all rewards. Nothing escapes on any rejection. */
export function claimQuestDraft(
  hero: Draft<Hero>,
  quest: QuestDefinition,
  content: ContentRegistry,
) {
  if (!questReady(hero, quest)) throw new Error('This quest is not ready to claim');
  if (!questEligible(hero, quest.prerequisite))
    throw new Error('Quest prerequisites no longer hold');
  for (const o of questStage(hero, quest)!.objectives)
    if (o.kind === 'deliverItem') removeOwnedItem(hero, { itemId: o.itemId }, o.target);
  const rewards = quest.rewards;
  let level = hero.level,
    experience = hero.experience + rewards.experience;
  while (level < MAX_LEVEL && experience >= experienceToNextLevel(level))
    experience -= experienceToNextLevel(level++);
  if (hero.gold + rewards.gold > 1000000 || hero.ap + rewards.ap + level - hero.level > 1000000)
    throw new Error('Quest rewards exceed your gold or AP capacity');
  rewards.items.forEach((r) => addItem(hero, r.itemId, r.quantity, content));
  for (const skillId of rewards.skills) learnSkillDraft(hero, skillId, content);
  hero.gold += rewards.gold;
  hero.ap += rewards.ap;
  grantExperience(hero, rewards.experience, content);
  [...rewards.titles]
    .sort()
    .forEach((id) => awardTitle(hero, id, `quest/${quest.id}/once`, content));
  rewards.flags.forEach((id) => {
    if (!hero.questFlags.includes(id)) hero.questFlags.push(id);
  });
  hero.quests[quest.id].status = 'completed';
  hero.quests[quest.id].claimId = `quest/${quest.id}/once`;
  reconcileQuests(hero, content);
  validateHero(hero, content);
}
export function claimQuest(
  hero: HeroSnapshot,
  quest: QuestDefinition,
  content: ContentRegistry,
): HeroSnapshot {
  return produceState(hero, (draft) => claimQuestDraft(draft, quest, content));
}
export function questClaimProblem(
  hero: HeroSnapshot,
  quest: QuestDefinition,
  content: ContentRegistry,
) {
  try {
    claimQuest(Object.isFrozen(hero) ? hero : cloneData(hero), quest, content);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : 'Cannot claim this quest';
  }
}
export function validateQuestProgression(hero: HeroSnapshot, content: ContentRegistry) {
  for (const [id, record] of Object.entries(hero.quests)) {
    const quest = content.data.quests.find((q) => q.id === id),
      index = quest?.stages.findIndex((s) => s.id === record.stageId) ?? -1;
    if (
      !quest ||
      index < 0 ||
      (record.status === 'available' && (index !== 0 || Object.keys(record.counts).length)) ||
      (record.status === 'completed'
        ? record.claimId !== `quest/${id}/once` || index !== quest.stages.length - 1
        : !!record.claimId)
    )
      throw new Error('Invalid quest stage or receipt');
    for (const [id, count] of Object.entries(record.counts)) {
      const o = quest.stages
        .slice(0, index + 1)
        .flatMap((s) => s.objectives)
        .find((o) => o.id === id);
      if (!o || ['ownItem', 'deliverItem', 'skillRank'].includes(o.kind) || count > o.target)
        throw new Error('Invalid quest objective counter');
    }
    for (const stage of quest.stages.slice(0, record.status === 'completed' ? index + 1 : index)) {
      if (
        stage.objectives.some(
          (o) =>
            !['ownItem', 'deliverItem', 'skillRank'].includes(o.kind) &&
            (record.counts[o.id] ?? 0) !== o.target,
        )
      )
        throw new Error('Quest bypasses an unfinished stage');
    }
  }
  if (
    new Set(hero.earnedTitles).size !== hero.earnedTitles.length ||
    new Set(hero.questFlags).size !== hero.questFlags.length ||
    hero.questFlags.some((id) => !content.data.questFlags.includes(id))
  )
    throw new Error('Invalid quest awards');
  const tracked = new Set<string>();
  for (const t of hero.trackedObjectives) {
    const quest = content.data.quests.find((q) => q.id === t.questId),
      key = `${t.questId}/${t.objectiveId}`;
    if (
      tracked.has(key) ||
      !quest ||
      hero.quests[t.questId]?.status !== 'active' ||
      !questStage(hero, quest)?.objectives.some((o) => o.id === t.objectiveId)
    )
      throw new Error('Invalid tracked objective');
    tracked.add(key);
  }
}
export type QuestBattleLedger = Record<string, { stageId: string; counts: Record<string, number> }>;
/** Attempt-local practice evidence. Only a completed encounter may bank this ledger. */
export class EncounterQuests {
  private lastAction = 0;
  private ledger: QuestBattleLedger = {};
  constructor(
    readonly encounterId: string,
    private hero: Hero,
    private content: ContentRegistry,
    private eligible: boolean,
  ) {}
  record(outcome: ActionOutcome) {
    if (
      !this.eligible ||
      outcome.encounterId !== this.encounterId ||
      outcome.actionId <= this.lastAction
    )
      return;
    this.lastAction = outcome.actionId;
    if (outcome.origin !== 'direct' || outcome.sourceId !== 'player' || outcome.action !== 'skill')
      return;
    for (const quest of this.content.data.quests) {
      if (this.hero.quests[quest.id]?.status !== 'active') continue;
      const stage = questStage(this.hero, quest)!;
      for (const o of stage.objectives)
        if (o.kind === 'useSkill' && o.skillId === outcome.skillId) {
          const entry = (this.ledger[quest.id] ??= { stageId: stage.id, counts: {} });
          entry.counts[o.id] = Math.min(o.target, (entry.counts[o.id] ?? 0) + 1);
        }
    }
  }
  snapshot(): QuestBattleLedger {
    return cloneData(this.ledger);
  }
}
export function mergeQuestEncounter(
  hero: Hero,
  ledger: QuestBattleLedger,
  result: 'victory' | 'defeat',
  mapId: string,
  content: ContentRegistry,
) {
  for (const [id, entry] of Object.entries(ledger)) {
    const quest = content.data.quests.find((q) => q.id === id),
      stage = quest && questStage(hero, quest);
    if (
      !quest ||
      hero.quests[id]?.status !== 'active' ||
      !stage ||
      entry.stageId !== stage.id ||
      Object.entries(entry.counts).some(
        ([id, count]) =>
          !stage.objectives.some(
            (o) =>
              o.id === id &&
              o.kind === 'useSkill' &&
              Number.isInteger(count) &&
              count >= 0 &&
              count <= o.target,
          ),
      )
    )
      throw new Error('Invalid quest encounter evidence');
  }
  for (const quest of content.data.quests) {
    const record = hero.quests[quest.id];
    if (record?.status !== 'active') continue;
    const entry = ledger[quest.id];
    if (entry && entry.stageId !== record.stageId)
      throw new Error('Stale quest encounter evidence');
    for (const o of questStage(hero, quest)!.objectives) {
      const count = entry?.counts[o.id] ?? 0;
      if (!Number.isInteger(count) || count < 0 || count > o.target)
        throw new Error('Invalid quest encounter evidence');
      if (o.kind === 'useSkill' && (result === 'victory' || o.allowDefeat))
        record.counts[o.id] = Math.min(o.target, (record.counts[o.id] ?? 0) + count);
      if (o.kind === 'winEncounter' && result === 'victory' && mapId === o.mapId)
        record.counts[o.id] = Math.min(o.target, (record.counts[o.id] ?? 0) + 1);
    }
  }
  reconcileQuests(hero, content);
}
export function questItemNeeds(hero: HeroSnapshot, content: ContentRegistry, itemId?: string) {
  return content.data.quests.flatMap((quest) =>
    hero.quests[quest.id]?.status === 'active'
      ? (questStage(hero, quest)?.objectives ?? [])
          .filter(
            (o): o is Extract<QuestObjective, { kind: 'deliverItem' | 'ownItem' }> =>
              (o.kind === 'deliverItem' || o.kind === 'ownItem') &&
              (!itemId || o.itemId === itemId),
          )
          .map((objective) => ({
            quest,
            objective,
            count: objectiveProgress(hero, quest, objective),
          }))
      : [],
  );
}
