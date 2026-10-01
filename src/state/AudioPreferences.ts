import type { AudioSettings } from '../audio/AudioManager';
import { AudioSettingsSchema, DEFAULT_AUDIO } from '../persistence/AudioSettingsRepository';

interface PreferencesView { settings: AudioSettings; ready: boolean; error?: string }
const initial: PreferencesView = { settings: DEFAULT_AUDIO, ready: false };

/** Serial writes keep rapid volume changes ordered; failures retain the latest choice for retry. */
export class AudioPreferences {
  private snapshot: PreferencesView = initial;
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private pending?: AudioSettings;
  constructor(private read: () => Promise<AudioSettings>, private write: (settings: AudioSettings) => Promise<void>) {}
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => initial;
  getSettings = () => this.snapshot.settings;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  start = () => {
    if (this.loading) return this.loading;
    this.loading = this.read().then((settings) => this.update({ settings: AudioSettingsSchema.parse(settings), ready: true, error: undefined }))
      .catch((error: unknown) => this.update({ ready: true, error: this.message(error) }));
    return this.loading;
  };
  setSettings = (raw: AudioSettings) => {
    const settings = AudioSettingsSchema.parse(raw);
    this.pending = settings;
    this.update({ settings, error: undefined });
    this.writes = this.writes.then(() => this.write(settings)).then(() => {
      if (this.pending === settings) { this.pending = undefined; this.update({ error: undefined }); }
    }).catch((error: unknown) => { if (this.pending === settings) this.update({ error: this.message(error) }); });
    return this.writes;
  };
  retry = () => {
    if (this.pending) return this.setSettings(this.pending);
    this.loading = undefined;
    return this.start();
  };
  private update(change: Partial<PreferencesView>) { this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach((listener) => listener()); }
  private message(error: unknown) { return error instanceof Error ? error.message : 'Sound preferences could not be saved.'; }
}
