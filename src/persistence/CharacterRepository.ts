import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { JourneySession } from '../game/JourneySession';
import { CharacterDetailsSchema, type CharacterStorage, type CharacterProfile, type CompleteCharacter } from './CharacterProfile';
import { encodeSave, parseSave } from './SaveSchema';

export interface CharacterSummary { profile: CharacterProfile; level?: number; savedAt?: string; error?: string }
export class CharacterRepository {
  constructor(private storage: CharacterStorage, private content: ContentRegistry) {}
  async list(): Promise<CharacterSummary[]> {
    const profiles = await this.storage.listProfiles();
    return Promise.all(profiles.map(async (profile) => {
      try {
        const saves = await this.storage.listSaves(profile.id);
        const save = saves.find((row) => row.id === 'auto') ?? saves.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
        if (!save) return { profile, error: 'No journey save was found.' };
        const campaign = parseSave(JSON.parse(save.payload), this.content).campaign;
        return { profile, level: campaign.hero.level, savedAt: save.savedAt };
      } catch { return { profile, error: 'This journey could not be read. Its saves have been preserved.' }; }
    }));
  }
  async get(id: string) { return this.storage.readProfile(id); }
  async create(raw: unknown): Promise<CompleteCharacter> {
    const details = CharacterDetailsSchema.parse(raw);
    const profile: CompleteCharacter = { ...details, id: `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`,
      createdAt: new Date().toISOString(), needsSetup: false };
    const session = new JourneySession(this.content);
    try {
      await this.storage.createProfile(profile, { id: 'auto', savedAt: profile.createdAt,
        payload: encodeSave(session.toSave(), this.content, profile.createdAt) });
    } finally { session.dispose(); }
    return profile;
  }
  async completeImport(id: string, raw: unknown): Promise<CompleteCharacter> {
    const details = CharacterDetailsSchema.parse(raw);
    const existing = await this.get(id);
    if (!existing?.needsSetup) throw new Error('This character does not need setup.');
    const profile: CompleteCharacter = { ...existing, ...details, needsSetup: false };
    await this.storage.updateProfile(profile);
    return profile;
  }
  close() { return this.storage.close(); }
}
