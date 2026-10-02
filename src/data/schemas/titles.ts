import { MAX_LEVEL } from '../../engine/rpg/Leveling';
import { z } from 'zod';
import { SkillRankSchema } from './skillRank';
import type { GameContent } from './content';
const id = z.string().trim().min(1).max(200);
export const TITLE_STATS = ['strength', 'intelligence', 'dexterity', 'will', 'luck', 'maxHealth', 'maxMana', 'maxStamina', 'physicalAttack', 'magicAttack', 'defense', 'protection', 'magicDefense', 'magicProtection'] as const;
export type TitleCondition =
  | { kind: 'all' | 'any'; conditions: TitleCondition[] }
  | { kind: 'level'; minimum: number }
  | { kind: 'attribute'; attribute: 'strength' | 'intelligence' | 'dexterity' | 'will' | 'luck'; minimum: number }
  | { kind: 'skill'; skillId: string; rank: z.infer<typeof SkillRankSchema> }
  | { kind: 'questKnown' | 'questClaimed'; questId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'enteredDungeon' | 'clearDungeon'; dungeonId: string }
  | { kind: 'bossVictory' | 'encounteredBoss'; dungeonId: string; enemyId: string }
  | { kind: 'encounter'; mapId: string; minimum: number; allowDefeat: boolean; flawless: boolean };
export const TitleConditionSchema: z.ZodType<TitleCondition> = z.lazy(() => z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('all'), conditions: z.array(TitleConditionSchema).min(1).max(20) }),
  z.strictObject({ kind: z.literal('any'), conditions: z.array(TitleConditionSchema).min(1).max(20) }),
  z.strictObject({ kind: z.literal('level'), minimum: z.number().int().min(1).max(MAX_LEVEL) }),
  z.strictObject({ kind: z.literal('attribute'), attribute: z.enum(['strength', 'intelligence', 'dexterity', 'will', 'luck']), minimum: z.number().min(1).max(1500) }),
  z.strictObject({ kind: z.literal('skill'), skillId: id, rank: SkillRankSchema }),
  z.strictObject({ kind: z.literal('questKnown'), questId: id }),
  z.strictObject({ kind: z.literal('questClaimed'), questId: id }),
  z.strictObject({ kind: z.literal('item'), itemId: id }),
  z.strictObject({ kind: z.literal('enteredDungeon'), dungeonId: id }),
  z.strictObject({ kind: z.literal('clearDungeon'), dungeonId: id }),
  z.strictObject({ kind: z.literal('encounteredBoss'), dungeonId: id, enemyId: id }),
  z.strictObject({ kind: z.literal('bossVictory'), dungeonId: id, enemyId: id }),
  z.strictObject({ kind: z.literal('encounter'), mapId: id, minimum: z.number().int().min(1).max(1000000), allowDefeat: z.boolean().default(false), flawless: z.boolean().default(false) }),
]));
export const TitleSchema = z.strictObject({ id, name: id, description: id, slot: z.enum(['first', 'second']),
  category: z.enum(['General', 'Story', 'Combat', 'Master', 'Event']).default('General'),
  spoiler: z.enum(['hidden', 'placeholder']).default('placeholder'), hint: TitleConditionSchema.optional(),
  award: TitleConditionSchema.optional(), discoveryFirst: z.boolean().default(false),
  eligibility: z.strictObject({ skillId: id, rank: SkillRankSchema }).optional(),
  effects: z.array(z.strictObject({ stat: z.enum(TITLE_STATS), value: z.number().int().min(-1500).max(1500) })).max(14).default([]),
}).refine((t) => new Set(t.effects.map((e) => e.stat)).size === t.effects.length && (!t.discoveryFirst || !!t.hint), 'Invalid title effects or discovery requirement');
export type TitleDefinition = z.infer<typeof TitleSchema>;
export function validateTitleReferences(content: GameContent, ctx: z.RefinementCtx) {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const skill = (skillId: string, rank: z.infer<typeof SkillRankSchema>) => !!content.skills.find((s) => s.id === skillId)?.gameRanks?.[rank];
  const condition = (c: TitleCondition, depth = 0): void => {
    if (depth > 20) { issue('Title condition nesting too deep'); return; }
    if (c.kind === 'all' || c.kind === 'any') c.conditions.forEach((child) => condition(child, depth + 1));
    else if (c.kind === 'skill' && !skill(c.skillId, c.rank)) issue('Unsupported title skill/rank');
    else if ((c.kind === 'questKnown' || c.kind === 'questClaimed') && !content.quests.some((q) => q.id === c.questId)) issue('Unknown title quest');
    else if (c.kind === 'item' && !content.items.some((i) => i.id === c.itemId)) issue('Unknown title item');
    else if ((c.kind === 'enteredDungeon' || c.kind === 'clearDungeon' || c.kind === 'bossVictory' || c.kind === 'encounteredBoss') && !content.dungeons.some((d) => d.id === c.dungeonId && ((c.kind !== 'bossVictory' && c.kind !== 'encounteredBoss') || d.bossId === c.enemyId))) issue('Unknown title dungeon/guardian');
    else if (c.kind === 'encounter' && !content.maps.some((m) => m.id === c.mapId && content.worlds.some((w) => w.objects.some((o) => o.encounterMap === m.id)))) issue('Unreachable title encounter');
  };
  for (const t of content.titles) {
    if (t.hint) condition(t.hint); if (t.award) condition(t.award);
    if (t.eligibility && !skill(t.eligibility.skillId, t.eligibility.rank)) issue('Unsupported title eligibility');
    if (t.category === 'Master') issue('Rank 1 mastery checklists are not supported yet');
  }
  for (const i of content.items) if (i.kind === 'titleCoupon' && !content.titles.some((t) => t.id === i.titleId && !t.award && !content.quests.some((q) => q.rewards.titles.includes(t.id)))) issue('Unknown or conflicting title coupon');
}
