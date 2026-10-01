import { z } from 'zod';
import { SkillRankSchema } from './skillRank';
const id = z.string().min(1);
const bp = z.number().int().min(0).max(10000);
export const EnchantStatSchema = z.enum(['strength', 'intelligence', 'dexterity', 'will', 'luck', 'maxHealth', 'maxMana', 'maxStamina', 'physicalAttack', 'magicAttack', 'defense', 'protection', 'magicDefense', 'magicProtection']);
export const EnchantConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('skill'), skillId: id, rank: SkillRankSchema }),
  z.strictObject({ kind: z.literal('level'), minimum: z.number().int().min(1).max(99) }),
  z.strictObject({ kind: z.literal('talent'), talent: z.enum(['warrior', 'mage', 'archery']) }),
]);
export const EnchantSchema = z.strictObject({ id, name: id, slot: z.enum(['prefix', 'suffix']), rank: SkillRankSchema,
  kinds: z.array(z.enum(['weapon', 'armor'])).min(1).max(2), tags: z.array(z.enum(['melee', 'sword'])).max(2),
  clauses: z.array(z.strictObject({ id, stat: EnchantStatSchema, unit: z.literal('flat'), min: z.number().int().min(-1000).max(1000), max: z.number().int().min(-1000).max(1000), conditions: z.array(EnchantConditionSchema).max(10) }).refine((c) => c.min <= c.max)).min(1).max(20),
}).refine((e) => new Set(e.clauses.map((c) => c.id)).size === e.clauses.length && new Set(e.kinds).size === e.kinds.length && new Set(e.tags).size === e.tags.length);
export const EnchantRulesSchema = z.strictObject({
  intCap: z.number().int().min(0).max(1500), intBonusBpPerPoint: bp,
  baseChanceBp: z.partialRecord(SkillRankSchema, bp), powderBonusBp: z.record(id, bp),
  recipes: z.partialRecord(SkillRankSchema, z.strictObject({ scrollCount: z.literal(1), powderCount: z.literal(1), manaCost: z.number().int().min(1).max(10000), burnManaCost: z.number().int().min(1).max(10000), burnChanceBp: bp })),
  manaHerbId: id, holyWaterId: id,
});
export type EnchantDefinition = z.infer<typeof EnchantSchema>;
export type EnchantStat = z.infer<typeof EnchantStatSchema>;
