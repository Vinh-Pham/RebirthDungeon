import { z } from 'zod';
import { SkillRankSchema, type Skill } from '../../data/schemas/content';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';
import type { Hero } from './Character';
import { consumeItem } from './Inventory';
import { cloneData } from '../cloneData';

export const LearnedSkillSchema = z.strictObject({ rank: SkillRankSchema,
  objectiveCounts: z.record(z.string().min(1), z.number().int().min(0).max(1000)) });
export const SkillProgressionSchema = z.strictObject({
  ap: z.number().int().min(0).max(1000000),
  learnedSkills: z.record(z.string().min(1), LearnedSkillSchema),
  discoveredSkills: z.array(z.string().min(1)).max(1000),
  bookCollections: z.record(z.string().min(1), z.strictObject({ insertedPages: z.array(z.string().min(1)).max(20), completed: z.boolean() })),
  claimedMilestones: z.array(z.enum(['intro-melee-lesson'])).max(1),
});
export type LearnedSkills = z.infer<typeof SkillProgressionSchema>['learnedSkills'];
export function starterProgression(classId: string, content: ContentRegistry): z.infer<typeof SkillProgressionSchema> {
  const definition = content.data.classes.find((c) => c.id === classId);
  if (!definition) throw new Error('Unknown character class');
  return { ap: 0, learnedSkills: Object.fromEntries(definition.skills.map((id) => [id, { rank: 'F', objectiveCounts: {} }])),
    discoveredSkills: [...definition.skills], bookCollections: {}, claimedMilestones: [] };
}
export function gameRank(skill: Skill, rank: z.infer<typeof SkillRankSchema>) {
  const definition = skill.gameRanks?.[rank];
  if (!definition) throw new Error('Not implemented at this rank');
  return definition;
}
export function resolveLearnedSkill(content: ContentRegistry, learned: LearnedSkills, id: string): Skill {
  const skill = content.skill(id), record = learned[id];
  if (!record) throw new Error('Skill is unavailable: it has not been learned');
  const rank = gameRank(skill, record.rank);
  if (skill.kind !== 'active' || skill.battleUsable !== true) throw new Error('Skill is not an implemented battle action');
  return { ...skill, rank: record.rank, power: rank.maxPower, minPower: rank.minPower, maxPower: rank.maxPower,
    manaCost: rank.manaCost, staminaCost: rank.staminaCost, statBonuses: rank.statBonuses };
}
export function skillForEntity(content: ContentRegistry, source: Entity, id: string): Skill {
  // Standalone legacy fixtures and authored enemy definitions keep their independent defaults.
  return source.learnedSkills ? resolveLearnedSkill(content, source.learnedSkills, id) : content.skill(id);
}
export function skillEquipmentReason(source: Entity, skill: Skill, content: ContentRegistry): string | undefined {
  if (!skill.requiresWeapon) return;
  const weapon = source.weapon;
  const tags = weapon && weapon.durability > 0 ? content.item(weapon.itemId).weaponTags : [];
  return tags.includes(skill.requiresWeapon) ? undefined : `Equip a usable ${skill.requiresWeapon === 'sword' ? 'sword' : 'melee weapon'}`;
}
export function trainingPoints(skill: Skill, record: LearnedSkills[string]) {
  return gameRank(skill, record.rank).objectives.reduce((sum, o) => sum + Math.min(record.objectiveCounts[o.id] ?? 0, o.maximum) * o.points, 0);
}
export function rankUpReason(hero: Hero, id: string, content: ContentRegistry): string | undefined {
  const record = hero.learnedSkills[id]; if (!record) return 'Learn this skill first';
  const skill = content.skill(id), rank = gameRank(skill, record.rank);
  if (!rank.nextRank) return record.rank === '1' ? 'Max Rank: 1' : `Prototype cap: ${record.rank}`;
  if (trainingPoints(skill, record) < 100) return 'Requires 100 training';
  if (hero.ap < rank.apCost!) return `Training complete · Need ${rank.apCost! - hero.ap} AP`;
}
export function rankUpSkill(hero: Hero, id: string, content: ContentRegistry): Hero {
  const reason = rankUpReason(hero, id, content); if (reason) throw new Error(reason);
  const candidate = cloneData(hero), rank = gameRank(content.skill(id), hero.learnedSkills[id].rank);
  candidate.ap -= rank.apCost!; candidate.learnedSkills[id] = { rank: rank.nextRank!, objectiveCounts: {} };
  return candidate;
}
export function learnSkill(hero: Hero, id: string, content: ContentRegistry): Hero {
  const skill = content.skill(id); gameRank(skill, 'F');
  if (hero.learnedSkills[id]) throw new Error('This skill is already learned');
  const candidate = cloneData(hero); candidate.learnedSkills[id] = { rank: 'F', objectiveCounts: {} };
  if (!candidate.discoveredSkills.includes(id)) candidate.discoveredSkills.push(id);
  return candidate;
}
export function readSkillBook(hero: Hero, itemId: string, content: ContentRegistry): Hero {
  const item = content.item(itemId);
  if (item.kind !== 'skillBook' || !item.skillId || !hero.inventory[itemId]) throw new Error('Own a complete skill book first');
  const candidate = learnSkill(hero, item.skillId, content); consumeItem(candidate.inventory, itemId); return candidate;
}
export function insertSkillPage(hero: Hero, recipeId: string, pageId: string, content: ContentRegistry): Hero {
  const recipe = content.data.skillBookRecipes.find((r) => r.id === recipeId);
  const collection = hero.bookCollections[recipeId];
  if (!recipe || !recipe.pages.some((p) => p.itemId === pageId) || !hero.inventory[pageId] ||
      !hero.inventory[recipe.incompleteItemId] || collection?.completed || collection?.insertedPages.includes(pageId)) throw new Error('Page is missing, unrelated, already inserted, or the matching book is unavailable');
  const candidate = cloneData(hero);
  const next = candidate.bookCollections[recipeId] ??= { insertedPages: [], completed: false };
  next.insertedPages.push(pageId); consumeItem(candidate.inventory, pageId);
  if (next.insertedPages.length === recipe.pages.length) {
    if ((candidate.inventory[recipe.completeItemId] ?? 0) >= 999) throw new Error('Inventory stack is full');
    candidate.inventory[recipe.completeItemId] = (candidate.inventory[recipe.completeItemId] ?? 0) + 1;
    consumeItem(candidate.inventory, recipe.incompleteItemId); next.completed = true;
  }
  return candidate;
}
export function validateSkillProgression(hero: Hero, content: ContentRegistry) {
  for (const [id, record] of Object.entries(hero.learnedSkills)) {
    const rank = gameRank(content.skill(id), record.rank);
    if (Object.entries(record.objectiveCounts).some(([id, count]) => !rank.objectives.some((o) => o.id === id && count <= o.maximum))) throw new Error('Invalid training objective counts');
    if (!hero.discoveredSkills.includes(id)) throw new Error('Learned skill must be discovered');
  }
  if (new Set(hero.discoveredSkills).size !== hero.discoveredSkills.length || new Set(hero.claimedMilestones).size !== hero.claimedMilestones.length) throw new Error('Duplicate progression flags');
  hero.discoveredSkills.forEach((id) => content.skill(id));
  for (const [id, collection] of Object.entries(hero.bookCollections)) {
    const recipe = content.data.skillBookRecipes.find((r) => r.id === id);
    if (!recipe || new Set(collection.insertedPages).size !== collection.insertedPages.length ||
        collection.insertedPages.some((p) => !recipe.pages.some((page) => page.itemId === p)) ||
        collection.completed !== (collection.insertedPages.length === recipe.pages.length) ||
        (collection.completed && !!hero.inventory[recipe.incompleteItemId]) ||
        (!collection.completed && hero.inventory[recipe.incompleteItemId] !== 1)) throw new Error('Invalid book collection');
  }
  for (const item of content.data.items) if (item.kind === 'incompleteBook' && (hero.inventory[item.id] ?? 0) > 1) throw new Error('Only one unfinished book per recipe is allowed');
}

export interface ActionOutcome {
  encounterId: string; actionId: number; sourceId: string; skillId?: string; rank?: z.infer<typeof SkillRankSchema>;
  action: 'attack' | 'skill' | 'item' | 'rest' | 'defend'; tags: string[]; origin: 'direct';
  targets: { targetId: string; hostile: boolean; hit: boolean; critical: boolean; damage: number; healing: number; defeated: boolean }[];
}
export type TrainingLedger = Record<string, Record<string, number>>;
/** At most one capped counter per authored objective; no growing event history. */
export class EncounterTraining {
  private lastAction = 0;
  private counts: TrainingLedger = {};
  constructor(readonly encounterId: string, private learned: LearnedSkills, private content: ContentRegistry, private eligible: boolean) {}
  record(outcome: ActionOutcome) {
    if (!this.eligible || outcome.encounterId !== this.encounterId || outcome.actionId <= this.lastAction) return;
    this.lastAction = outcome.actionId;
    if (outcome.sourceId !== 'player' || outcome.origin !== 'direct') return;
    for (const [id, record] of Object.entries(this.learned)) {
      const skill = this.content.skill(id), rank = gameRank(skill, record.rank);
      const applies = skill.kind === 'passive' ? outcome.tags.includes(skill.requiresWeapon === 'sword' ? 'sword' : 'melee') : outcome.skillId === id && outcome.rank === record.rank;
      if (!applies) continue;
      for (const objective of rank.objectives) {
        const eligibleTargets = outcome.targets.filter((t) => objective.event === 'heal' ? !t.hostile && t.healing > 0 : t.hostile &&
          (objective.event === 'use' || (objective.event === 'damage' ? t.damage > 0 : t.defeated && t.damage > 0)));
        const current = this.counts[id]?.[objective.id] ?? 0;
        const increment = objective.scope === 'target' ? new Set(eligibleTargets.map((t) => t.targetId)).size : eligibleTargets.length ? 1 : 0;
        const limit = Math.max(0, objective.maximum - (record.objectiveCounts[objective.id] ?? 0));
        const next = Math.min(limit, objective.scope === 'encounter' ? Math.max(current, increment) : current + increment);
        if (next) (this.counts[id] ??= {})[objective.id] = next;
      }
    }
  }
  snapshot(): TrainingLedger { return cloneData(this.counts); }
}
export function mergeTraining(hero: Hero, ledger: TrainingLedger, content: ContentRegistry) {
  for (const [id, counts] of Object.entries(ledger)) {
    const record = hero.learnedSkills[id]; if (!record) throw new Error('Training skill is not learned');
    const objectives = gameRank(content.skill(id), record.rank).objectives;
    for (const [key, count] of Object.entries(counts)) {
      const objective = objectives.find((o) => o.id === key);
      if (!objective || !Number.isInteger(count) || count < 0) throw new Error('Invalid encounter training');
      record.objectiveCounts[key] = Math.min(objective.maximum, (record.objectiveCounts[key] ?? 0) + count);
    }
  }
}
