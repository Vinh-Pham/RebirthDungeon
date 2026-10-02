import { z } from 'zod';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { AudioSettings } from '../audio/AudioManager';
import type { CharacterStorage } from './CharacterProfile';
import { parseSave } from './SaveSchema';

export const AudioSettingsSchema = z.strictObject({
  enabled: z.boolean(),
  music: z.number().min(0).max(1),
  sfx: z.number().min(0).max(1),
});
export const DEFAULT_AUDIO: AudioSettings = { enabled: false, music: 0.3, sfx: 0.7 };
export interface AudioSettingsStorage {
  readAudioSettings(): Promise<unknown | undefined>;
  writeAudioSettings(settings: AudioSettings): Promise<void>;
}

/** Preferences have their own record, independent of character checkpoints. */
export class AudioSettingsRepository {
  constructor(
    private storage: CharacterStorage & AudioSettingsStorage,
    private content: ContentRegistry,
  ) {}
  async read(): Promise<AudioSettings> {
    const existing = await this.storage.readAudioSettings();
    if (existing !== undefined) return AudioSettingsSchema.parse(existing);
    const profiles = await this.storage.listProfiles();
    const rows = (
      await Promise.all(
        profiles.map(async (profile) =>
          (await this.storage.listSaves(profile.id)).map((row) => ({ row, profile })),
        ),
      )
    )
      .flat()
      .sort(
        (a, b) =>
          b.row.savedAt.localeCompare(a.row.savedAt) ||
          a.profile.id.localeCompare(b.profile.id) ||
          a.row.id.localeCompare(b.row.id),
      );
    let settings = { ...DEFAULT_AUDIO };
    for (const { row, profile } of rows) {
      try {
        settings = parseSave(
          JSON.parse(row.payload),
          this.content,
          profile.needsSetup ? undefined : profile.talent,
        ).campaign.audio;
        break;
      } catch {
        /* A corrupt journey must not prevent settings initialization. */
      }
    }
    await this.write(settings);
    return settings;
  }
  write(settings: AudioSettings) {
    return this.storage.writeAudioSettings(AudioSettingsSchema.parse(settings));
  }
  close() {
    return this.storage.close();
  }
}
