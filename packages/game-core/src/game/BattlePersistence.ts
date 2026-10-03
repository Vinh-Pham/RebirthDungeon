import { z } from 'zod';
import { BattleAISchema } from '../data/schemas/content';
import { EnchantStatSchema } from '../data/schemas/enchants';
import { WeaponSchema } from '../engine/rpg/Character';
import { LearnedSkillSchema } from '../engine/rpg/Skills';
import { TALENTS } from '../engine/rpg/Stats';
import { DerivedCombatStatsSchema, BattleActionSchema } from '../online/Contracts';
const id = z.string().min(1).max(300),
  amount = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const learned = z.record(id, LearnedSkillSchema);
const resource = z.strictObject({ current: amount, max: amount });
const contribution = z.strictObject({
  sourceId: id,
  name: id,
  stat: EnchantStatSchema,
  value: z.number().int().min(-1000).max(1000),
  active: z.boolean(),
  condition: z.string(),
});
export const BattleActorSchema = z.strictObject({
  id,
  name: z.string().optional(),
  inventory: z.record(id, z.number().int().min(1).max(999)).optional(),
  itemHotbar: z.array(id).max(100).optional(),
  ammunitionItemId: id.optional(),
  weapon: WeaponSchema.extend({ id }).optional(),
  statuses: z
    .array(
      z.strictObject({
        id,
        sourceId: id,
        remainingTurns: amount,
        stacks: z.number().int().min(1).max(10),
      }),
    )
    .optional(),
  stamina: resource.optional(),
  mana: resource.optional(),
  health: resource.optional(),
  wounds: amount.optional(),
  fullness: z.number().min(50).max(100).optional(),
  skills: z.array(id).max(1000).optional(),
  learnedSkills: learned.optional(),
  cooldowns: z.record(id, amount).optional(),
  position: z.strictObject({ x: amount, y: amount }).optional(),
  sprite: z
    .strictObject({ atlas: id, frame: amount, idleFrames: z.array(amount).optional() })
    .optional(),
  combatant: DerivedCombatStatsSchema.optional(),
  dead: z.literal(true).optional(),
  player: z.literal(true).optional(),
  enemy: z.literal(true).optional(),
  battleAI: BattleAISchema.optional(),
  statSource: z
    .strictObject({
      classId: id,
      level: z.number().int().min(1).max(200),
      growthTalent: z.enum(TALENTS),
      weaponItemId: id.optional(),
      ammunitionItemId: id.optional(),
      armorItemId: id.optional(),
      enchantments: z.array(contribution).optional(),
      titles: z.array(contribution).optional(),
      effects: z.array(z.strictObject({ statusId: id, stacks: z.number().int().min(1).max(10) })),
      learnedSkills: learned,
    })
    .optional(),
});
export const BattlePersistenceSchema = z.strictObject({
  version: z.literal(1),
  encounterId: id,
  seed: z.number().int().min(-2147483648).max(2147483647),
  randomState: z
    .array(z.number().int().min(-2147483648).max(2147483647))
    .length(4)
    .refine((words) => words.some((v) => v !== 0)),
  entities: z.array(BattleActorSchema).min(1).max(100),
  combat: z.strictObject({
    turns: z.strictObject({ ids: z.array(id).max(100), cursor: amount }),
    defending: z.array(id).max(100),
    outcome: z.enum(['victory', 'defeat']).optional(),
    actionSequence: amount,
  }),
  enemyHistory: z.array(z.strictObject({ id, action: BattleActionSchema })).max(100),
  training: z.strictObject({
    lastAction: amount,
    counts: z.record(id, z.record(id, z.number().int().min(0).max(1000))),
  }),
  quests: z.strictObject({
    lastAction: amount,
    ledger: z.record(
      id,
      z.strictObject({ stageId: id, counts: z.record(id, z.number().int().min(0).max(999)) }),
    ),
  }),
  titles: z.strictObject({ encounterId: id, eligible: z.boolean(), flawless: z.boolean() }),
});
