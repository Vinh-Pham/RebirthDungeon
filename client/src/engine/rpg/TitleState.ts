import { z } from 'zod';
const id = z.string().min(1).max(300);
export const TitleProgressionSchema = z.strictObject({
  titleCollection: z.strictObject({
    discovered: z.array(id).max(1000),
    records: z
      .record(id, z.strictObject({ source: id }))
      .refine((r) => Object.keys(r).length <= 1000),
    evidence: z
      .record(id, z.number().int().min(0).max(1000000))
      .refine((r) => Object.keys(r).length <= 10000),
    selected: z.strictObject({ first: id.optional(), second: id.optional() }),
  }),
});
export function emptyTitleProgression() {
  return {
    titleCollection: {
      discovered: [] as string[],
      records: {} as Record<string, { source: string }>,
      evidence: {} as Record<string, number>,
      selected: {} as { first?: string; second?: string },
    },
  };
}
