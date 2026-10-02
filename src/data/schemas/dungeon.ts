import { z } from 'zod';

const id = z.string().min(1);
export const RewardTableSchema = z
  .array(
    z
      .strictObject({
        itemId: id,
        min: z.number().int().min(1).max(99),
        max: z.number().int().min(1).max(99),
        weight: z.number().int().min(1).max(1000),
      })
      .refine((reward) => reward.min <= reward.max),
  )
  .min(1);
export const DungeonDefinitionSchema = z
  .strictObject({
    id,
    name: id,
    minRooms: z.number().int().min(4).max(12),
    maxRooms: z.number().int().min(4).max(12),
    roomWeights: z.strictObject({
      monster: z.number().positive(),
      chest: z.number().positive(),
      mimic: z.number().positive(),
      fountain: z.number().positive(),
    }),
    monsterIds: z.array(id).min(1),
    mimicId: id,
    bossId: id,
    companionIds: z.array(id).min(1),
    fountainIds: z.array(id).min(1),
    ordinaryRewards: RewardTableSchema,
    finalRewards: RewardTableSchema,
  })
  .refine((definition) => definition.minRooms <= definition.maxRooms);
export type DungeonDefinition = z.infer<typeof DungeonDefinitionSchema>;
