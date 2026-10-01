import { z } from 'zod';
import type { SaveRow, SaveSlot, SaveStorage } from './SaveRepository';

import { TALENTS } from '../engine/rpg/Stats';
export { TALENTS } from '../engine/rpg/Stats';
export const TALENT_LABELS = { warrior: 'Warrior', archery: 'Archery', mage: 'Mage' } as const;
export const CharacterDetailsSchema = z.strictObject({
  name: z.string().trim().min(1, 'Enter a character name.').max(24, 'Use 24 characters or fewer.'),
  talent: z.enum(TALENTS, { error: 'Choose a talent.' }),
  age: z.number().int().min(10).max(17),
});
export type CharacterDetails = z.infer<typeof CharacterDetailsSchema>;
const identity = { id: z.string().min(1), createdAt: z.string().datetime() };
export const CharacterProfileSchema = z.discriminatedUnion('needsSetup', [
  z.strictObject({ ...identity, ...CharacterDetailsSchema.shape, needsSetup: z.literal(false) }),
  z.strictObject({ ...identity, name: z.string().min(1), needsSetup: z.literal(true) }),
]);
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;
export type CompleteCharacter = Extract<CharacterProfile, { needsSetup: false }>;
export const importedCharacter = (): CharacterProfile => ({
  id: 'legacy', name: 'Imported Adventurer', createdAt: new Date().toISOString(), needsSetup: true,
});

export interface CharacterStorage extends SaveStorage {
  listProfiles(): Promise<CharacterProfile[]>;
  readProfile(id: string): Promise<CharacterProfile | undefined>;
  listSaves(characterId: string): Promise<SaveRow[]>;
  readSave(characterId: string, slot: SaveSlot): Promise<SaveRow | undefined>;
  /** The profile and initial autosave must commit together. */
  createProfile(profile: CompleteCharacter, initialSave: SaveRow): Promise<void>;
  updateProfile(profile: CompleteCharacter): Promise<void>;
}
