import type { GameEvent } from '../engine/events';
import type { EventBus } from '../engine/EventBus';
export type SoundId = 'hit' | 'heal' | 'loot' | 'step';
export type MusicId = 'exploration' | 'battle';
export interface AudioBackend {
  configure(): Promise<void>;
  playSound(id: SoundId, volume: number): void;
  playMusic(id: MusicId, volume: number): void;
  stopMusic(): void;
  dispose(): void;
}
export interface AudioSettings {
  enabled: boolean;
  music: number;
  sfx: number;
}
/** Event consumer only. Failed audio can never affect authoritative gameplay. */
export class AudioManager {
  private disposed = false;
  private ready = false;
  private suspended = false;
  private scene: MusicId = 'exploration';
  private subscriptions = new Set<() => void>();
  private settings: AudioSettings = { enabled: false, music: 0.3, sfx: 0.7 };
  constructor(
    private backend: AudioBackend,
    private onError: (error: unknown) => void = () => {},
  ) {}
  async enable(settings: AudioSettings) {
    this.setSettings(settings);
    try {
      await this.backend.configure();
      if (this.disposed) return false;
      this.ready = true;
      this.refreshMusic();
      return true;
    } catch (error) {
      this.onError(error);
      return false;
    }
  }
  setSettings(settings: AudioSettings) {
    if (
      [settings.music, settings.sfx].some(
        (value) => !Number.isFinite(value) || value < 0 || value > 1,
      )
    )
      throw new Error('Invalid audio volume');
    this.settings = { ...settings };
    this.refreshMusic();
  }
  setScene(scene: MusicId) {
    this.scene = scene;
    this.refreshMusic();
  }
  suspend(suspended: boolean) {
    this.suspended = suspended;
    this.refreshMusic();
  }
  connect(events: EventBus) {
    const unsubscribe = events.subscribe((event) => this.accept(event));
    this.subscriptions.add(unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete(unsubscribe);
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
    this.backend.dispose();
  }
  private accept(event: GameEvent) {
    if (
      !this.ready ||
      this.disposed ||
      this.suspended ||
      !this.settings.enabled ||
      this.settings.sfx === 0
    )
      return;
    const sound: SoundId | undefined =
      event.type === 'DAMAGE_DEALT'
        ? 'hit'
        : event.type === 'HEALTH_RESTORED' || event.type === 'STATUS_APPLIED'
          ? 'heal'
          : event.type === 'LOOT_RECEIVED' || event.type === 'WORLD_INTERACTED'
            ? 'loot'
            : event.type === 'WORLD_MOVED'
              ? 'step'
              : undefined;
    if (sound) this.safe(() => this.backend.playSound(sound, this.settings.sfx));
  }
  private refreshMusic() {
    if (this.disposed || !this.ready) return;
    this.safe(() => {
      if (this.suspended || !this.settings.enabled || this.settings.music === 0)
        this.backend.stopMusic();
      else this.backend.playMusic(this.scene, this.settings.music);
    });
  }
  private safe(action: () => void) {
    try {
      action();
    } catch (error) {
      this.onError(error);
    }
  }
}
