import { z } from 'zod';
import { CommandRequestSchema, CreationRequestSchema } from '@rebirth/game-core/online/Contracts';
export const PendingCommandSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('create'),
    request: CreationRequestSchema,
    createdAt: z.number().int(),
  }),
  z.strictObject({
    kind: z.literal('command'),
    request: CommandRequestSchema,
    createdAt: z.number().int(),
  }),
]);
export type PendingCommand = z.infer<typeof PendingCommandSchema>;
export interface CommandJournal {
  read(key: string): Promise<PendingCommand | undefined>;
  write(key: string, value: PendingCommand): Promise<void>;
  clear(key: string, commandId: string): Promise<void>;
}
export const journalKey = (origin: string, userId: string, characterId = 'creation') =>
  JSON.stringify([origin, userId, characterId]);
