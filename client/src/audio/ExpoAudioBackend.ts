import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { AudioBackend, MusicId, SoundId } from './AudioManager';
const assets = {
  hit: require('../../assets/audio/hit.wav'),
  heal: require('../../assets/audio/heal.wav'),
  loot: require('../../assets/audio/loot.wav'),
  step: require('../../assets/audio/step.wav'),
  exploration: require('../../assets/audio/exploration.wav'),
  battle: require('../../assets/audio/battle.wav'),
};
/** Bounded SFX pool supports overlapping hits; all native players are released. */
export class ExpoAudioBackend implements AudioBackend {
  private sounds = new Map<SoundId, { players: AudioPlayer[]; cursor: number }>();
  private music = new Map<MusicId, AudioPlayer>();
  private current?: MusicId;
  private disposed = false;
  constructor(private onError: (error: unknown) => void) {}
  async configure() {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
  }
  playSound(id: SoundId, volume: number) {
    if (this.disposed) return;
    let pool = this.sounds.get(id);
    if (!pool) {
      pool = { players: Array.from({ length: 3 }, () => createAudioPlayer(assets[id])), cursor: 0 };
      this.sounds.set(id, pool);
    }
    const player = pool.players[pool.cursor++ % pool.players.length];
    player.volume = volume;
    void player
      .seekTo(0)
      .then(() => {
        if (!this.disposed) player.play();
      })
      .catch(this.onError);
  }
  playMusic(id: MusicId, volume: number) {
    if (this.disposed) return;
    if (this.current && this.current !== id) this.music.get(this.current)?.pause();
    let player = this.music.get(id);
    if (!player) {
      player = createAudioPlayer(assets[id]);
      player.loop = true;
      this.music.set(id, player);
    }
    player.volume = volume;
    if (this.current !== id || !player.playing) player.play();
    this.current = id;
  }
  stopMusic() {
    this.music.forEach((player) => player.pause());
    this.current = undefined;
  }
  dispose() {
    this.disposed = true;
    this.sounds.forEach((pool) => pool.players.forEach((player) => player.release()));
    this.music.forEach((player) => player.release());
    this.sounds.clear();
    this.music.clear();
  }
}
