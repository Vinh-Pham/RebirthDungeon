import type { SaveRow, SaveSlot, SaveStorage } from './SaveRepository';
import type {
  CharacterProfile,
  CompleteCharacter,
} from '@rebirth/game-core/persistence/CharacterProfile';
export * from '@rebirth/game-core/persistence/CharacterProfile';
export interface CharacterStorage extends SaveStorage {
  listProfiles(): Promise<CharacterProfile[]>;
  readProfile(id: string): Promise<CharacterProfile | undefined>;
  listSaves(characterId: string): Promise<SaveRow[]>;
  readSave(characterId: string, slot: SaveSlot): Promise<SaveRow | undefined>;
  /** The profile and initial autosave must commit together. */
  createProfile(profile: CompleteCharacter, initialSave: SaveRow): Promise<void>;
  updateProfile(profile: CompleteCharacter): Promise<void>;
}
