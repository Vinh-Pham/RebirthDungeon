import { z } from 'zod';

const id = z.string().min(1);
export const QuestProgressionSchema = z.strictObject({
  quests: z.record(id, z.strictObject({ status: z.enum(['available', 'active', 'completed']), stageId: id,
    counts: z.record(id, z.number().int().min(0).max(999)), claimId: id.optional() })),
  earnedTitles: z.array(id).max(1000), questFlags: z.array(id).max(1000),
  trackedObjectives: z.array(z.strictObject({ questId: id, objectiveId: id })).max(3),
});
export function emptyQuestProgression(): z.infer<typeof QuestProgressionSchema> {
  return { quests: {}, earnedTitles: [], questFlags: [], trackedObjectives: [] };
}
