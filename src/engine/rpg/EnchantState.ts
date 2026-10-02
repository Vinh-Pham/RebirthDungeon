import { z } from 'zod';
import { createGameRandom } from '../Random';
const id = z.string().min(1);
export const InstalledEnchantSchema = z.strictObject({
  enchantId: id,
  values: z.record(id, z.number().int().min(-1000).max(1000)),
});
export const EquipmentEnchantFields = {
  locked: z.boolean().optional(),
  prefix: InstalledEnchantSchema.optional(),
  suffix: InstalledEnchantSchema.optional(),
};
export const EnchantProgressionSchema = z.strictObject({
  enchanting: z.strictObject({
    algorithm: z.literal('xoroshiro128plus'),
    version: z.literal(1),
    seed: z.number().int().min(-2147483648).max(2147483647),
    state: z
      .array(z.number().int().min(-2147483648).max(2147483647))
      .length(4)
      .refine((s) => s.some((v) => v !== 0)),
    nextOperationId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    receipts: z
      .array(
        z.strictObject({
          id,
          kind: z.enum(['apply', 'burn']),
          message: id,
          recovered: z.array(id).max(2),
          success: z.boolean(),
        }),
      )
      .max(100),
  }),
});
export type InstalledEnchant = z.infer<typeof InstalledEnchantSchema>;
export type EnchantedEquipment = {
  itemId: string;
  locked?: boolean;
  prefix?: InstalledEnchant;
  suffix?: InstalledEnchant;
};
export function emptyEnchantProgression(
  campaignSeed = 12345,
): z.infer<typeof EnchantProgressionSchema> {
  const seed = (campaignSeed ^ 0x45a17c9b) | 0;
  return {
    enchanting: {
      algorithm: 'xoroshiro128plus',
      version: 1,
      seed,
      state: createGameRandom(seed).snapshot(),
      nextOperationId: 1,
      receipts: [],
    },
  };
}
