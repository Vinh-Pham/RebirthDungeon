import { MAX_LEVEL } from '../../engine/rpg/Leveling';
import { z } from 'zod';
import { SkillRankSchema } from './skillRank';
import type { GameContent } from './content';

const id = z.string().trim().min(1);
const count = z.number().int().min(1).max(999);
const amount = z.number().int().min(0).max(1000000);
const npc = z.strictObject({ worldId: id, objectId: id });
export type QuestCondition =
  | { kind: 'all' | 'any'; conditions: QuestCondition[] }
  | { kind: 'quest'; questId: string }
  | { kind: 'level'; level: number }
  | { kind: 'talent'; talent: 'warrior' | 'archery' | 'mage' }
  | { kind: 'skill'; skillId: string; rank: z.infer<typeof SkillRankSchema> }
  | { kind: 'item'; itemId: string; quantity: number; equipped: boolean }
  | { kind: 'flag'; flagId: string };
export const QuestConditionSchema: z.ZodType<QuestCondition> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('all'),
      conditions: z.array(QuestConditionSchema).min(1).max(20),
    }),
    z.strictObject({
      kind: z.literal('any'),
      conditions: z.array(QuestConditionSchema).min(1).max(20),
    }),
    z.strictObject({ kind: z.literal('quest'), questId: id }),
    z.strictObject({ kind: z.literal('level'), level: z.number().int().min(1).max(MAX_LEVEL) }),
    z.strictObject({ kind: z.literal('talent'), talent: z.enum(['warrior', 'archery', 'mage']) }),
    z.strictObject({ kind: z.literal('skill'), skillId: id, rank: SkillRankSchema }),
    z.strictObject({
      kind: z.literal('item'),
      itemId: id,
      quantity: count,
      equipped: z.boolean().default(false),
    }),
    z.strictObject({ kind: z.literal('flag'), flagId: id }),
  ]),
);
const base = { id, label: id, target: count };
export const QuestObjectiveSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...base, kind: z.literal('interact'), worldId: id, objectId: id }),
  z.strictObject({ ...base, kind: z.literal('visit'), worldId: id }),
  z.strictObject({
    ...base,
    kind: z.literal('useSkill'),
    skillId: id,
    allowDefeat: z.boolean().default(false),
  }),
  z.strictObject({ ...base, kind: z.literal('winEncounter'), mapId: id }),
  z.strictObject({ ...base, kind: z.literal('clearDungeon'), dungeonId: id }),
  z.strictObject({
    ...base,
    kind: z.literal('skillRank'),
    skillId: id,
    rank: SkillRankSchema,
    target: z.literal(1),
  }),
  z.strictObject({ ...base, kind: z.literal('ownItem'), itemId: id }),
  z.strictObject({ ...base, kind: z.literal('deliverItem'), itemId: id }),
]);
export const QuestSchema = z
  .strictObject({
    id,
    name: id,
    description: id,
    category: z.enum(['mainstream', 'sidequest', 'skill']),
    chapter: z.strictObject({ id, name: id }).optional(),
    generation: z.strictObject({ id, name: id }).optional(),
    delivery: z.enum(['automatic', 'npc']),
    offerNpc: npc.optional(),
    claimNpc: npc.optional(),
    prerequisite: QuestConditionSchema.optional(),
    stages: z
      .array(
        z.strictObject({ id, name: id, objectives: z.array(QuestObjectiveSchema).min(1).max(20) }),
      )
      .min(1)
      .max(20),
    rewards: z.strictObject({
      experience: amount.default(0),
      gold: amount.default(0),
      ap: amount.default(0),
      items: z
        .array(z.strictObject({ itemId: id, quantity: count }))
        .max(20)
        .default([]),
      skills: z.array(id).max(20).default([]),
      titles: z.array(id).max(20).default([]),
      flags: z.array(id).max(20).default([]),
    }),
  })
  .superRefine((quest, ctx) => {
    const ids = quest.stages.flatMap((s) => [s.id, ...s.objectives.map((o) => o.id)]);
    if (
      new Set(ids).size !== ids.length ||
      (quest.delivery === 'npc') !== !!quest.offerNpc ||
      (quest.category === 'mainstream' && (!quest.chapter || !quest.generation)) ||
      quest.stages.some((s, i) =>
        s.objectives.some(
          (o) => o.kind === 'deliverItem' && (!quest.claimNpc || i !== quest.stages.length - 1),
        ),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid quest IDs, delivery or story structure' });
    const deliveries = quest.stages.flatMap((s) =>
      s.objectives.filter((o) => o.kind === 'deliverItem').map((o) => o.itemId),
    );
    if (new Set(deliveries).size !== deliveries.length)
      ctx.addIssue({ code: 'custom', message: 'Combine delivery quantities per item' });
  });
export { TitleSchema as TitleAwardSchema } from './titles';
export type QuestDefinition = z.infer<typeof QuestSchema>;
export type QuestObjective = z.infer<typeof QuestObjectiveSchema>;

export function validateQuestReferences(content: GameContent, ctx: z.RefinementCtx) {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const validNpc = (value: z.infer<typeof npc>) =>
    content.worlds.some(
      (w) =>
        w.id === value.worldId &&
        !!w.theme &&
        w.objects.some(
          (o) => o.id === value.objectId && ['npc', 'merchant', 'healer'].includes(o.kind),
        ),
    );
  const supportedSkill = (id: string, rank: z.infer<typeof SkillRankSchema>) =>
    !!content.skills.find((s) => s.id === id)?.gameRanks?.[rank];
  const dependencies = new Map<string, string[]>();
  for (const quest of content.quests) {
    const deps: string[] = [];
    dependencies.set(quest.id, deps);
    const condition = (c: QuestCondition, depth = 0): void => {
      if (depth > 20) {
        issue('Quest prerequisite nesting is too deep');
        return;
      }
      if (c.kind === 'all' || c.kind === 'any')
        c.conditions.forEach((child) => condition(child, depth + 1));
      else if (c.kind === 'quest') {
        deps.push(c.questId);
        if (!content.quests.some((q) => q.id === c.questId)) issue('Unknown prerequisite quest');
      } else if (c.kind === 'skill' && !supportedSkill(c.skillId, c.rank))
        issue('Unsupported quest prerequisite skill/rank');
      else if (
        c.kind === 'item' &&
        !content.items.some(
          (i) =>
            i.id === c.itemId &&
            (!c.equipped || (c.quantity === 1 && ['weapon', 'armor'].includes(i.kind))),
        )
      )
        issue('Invalid prerequisite gear');
      else if (c.kind === 'flag' && !content.questFlags.includes(c.flagId))
        issue('Unknown quest prerequisite flag');
    };
    if (quest.prerequisite) condition(quest.prerequisite);
    if ([quest.offerNpc, quest.claimNpc].some((n) => n && !validNpc(n))) issue('Invalid quest NPC');
    for (const stage of quest.stages)
      for (const o of stage.objectives) {
        if (
          o.kind === 'interact' &&
          !content.worlds.some(
            (w) => w.id === o.worldId && w.objects.some((obj) => obj.id === o.objectId),
          )
        )
          issue('Unknown quest interaction');
        if (o.kind === 'visit' && !content.worlds.some((w) => w.id === o.worldId))
          issue('Unknown quest destination');
        if (
          o.kind === 'winEncounter' &&
          !content.maps.some(
            (m) =>
              m.id === o.mapId &&
              content.worlds.some((w) => w.objects.some((obj) => obj.encounterMap === m.id)),
          )
        )
          issue('Unreachable quest encounter');
        if (
          o.kind === 'clearDungeon' &&
          !content.dungeons.some(
            (d) =>
              d.id === o.dungeonId &&
              content.worlds.some((w) => w.objects.some((obj) => obj.dungeonId === d.id)),
          )
        )
          issue('Unknown quest dungeon');
        if (
          o.kind === 'useSkill' &&
          !content.skills.some(
            (s) => s.id === o.skillId && s.gameRanks?.F && s.kind === 'active' && s.battleUsable,
          )
        )
          issue('Unsupported practice skill');
        if (o.kind === 'skillRank' && !supportedSkill(o.skillId, o.rank))
          issue('Unsupported objective skill/rank');
        if (
          ['ownItem', 'deliverItem'].includes(o.kind) &&
          'itemId' in o &&
          !content.items.some(
            (i) =>
              i.id === o.itemId &&
              i.kind !== 'incompleteBook' &&
              (o.kind !== 'deliverItem' || i.kind !== 'weapon'),
          )
        )
          issue('Unsupported quest item');
      }
    if (
      quest.rewards.items.some(
        (r) => !content.items.some((i) => i.id === r.itemId && i.kind !== 'incompleteBook'),
      ) ||
      new Set(quest.rewards.items.map((r) => r.itemId)).size !== quest.rewards.items.length ||
      [quest.rewards.skills, quest.rewards.titles, quest.rewards.flags].some(
        (ids) => new Set(ids).size !== ids.length,
      ) ||
      quest.rewards.skills.some((id) => !supportedSkill(id, 'F')) ||
      quest.rewards.titles.some((id) => !content.titles.some((t) => t.id === id)) ||
      quest.rewards.flags.some((id) => !content.questFlags.includes(id))
    )
      issue('Invalid quest rewards');
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) {
      issue('Quest prerequisite cycle');
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    (dependencies.get(id) ?? []).forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  content.quests.forEach((q) => visit(q.id));
  if (new Set(content.questFlags).size !== content.questFlags.length)
    issue('Duplicate quest flags');
}
