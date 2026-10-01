import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { loadGameContent } from '../data/content';
import type { JourneySession } from '../game/JourneySession';
import type { BattleSession } from '../game/BattleSession';
import { createSaveStorage } from '../persistence/createSaveStorage';
import { AudioSettingsRepository } from '../persistence/AudioSettingsRepository';
import { AudioPreferences } from '../state/AudioPreferences';
import { AudioManager, type AudioSettings } from './AudioManager';
import { ExpoAudioBackend } from './ExpoAudioBackend';

async function withSettings<T>(operation: (repository: AudioSettingsRepository) => Promise<T>) {
  const repository = new AudioSettingsRepository(await createSaveStorage(), loadGameContent());
  try { return await operation(repository); } finally { await repository.close(); }
}
type Binding = { session: JourneySession; battle?: BattleSession };
interface AudioContextValue {
  preferences: AudioPreferences;
  settings: AudioSettings;
  ready: boolean;
  soundReady: boolean;
  error?: string;
  setSettings(settings: AudioSettings): void;
  resume(): void;
  attachSession(session: JourneySession, battle?: BattleSession): () => void;
}
const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: PropsWithChildren) {
  const [preferences] = useState(() => new AudioPreferences(
    () => withSettings((repository) => repository.read()),
    (settings) => withSettings((repository) => repository.write(settings)),
  ));
  const view = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot, preferences.getServerSnapshot);
  const [manager, setManager] = useState<AudioManager>();
  const [binding, setBinding] = useState<Binding>();
  const [unlockedManager, setUnlockedManager] = useState<AudioManager>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    const report = (failure: unknown) => setError(failure instanceof Error ? failure.message : 'Audio is unavailable.');
    const audio = new AudioManager(new ExpoAudioBackend(report), report);
    audio.suspend(true);
    void preferences.start().then(() => { if (active) setManager(audio); });
    return () => { active = false; audio.dispose(); };
  }, [preferences]);
  useEffect(() => {
    if (!manager || !binding) { manager?.suspend(true); return; }
    const disconnectJourney = manager.connect(binding.session.engine.events);
    const disconnectBattle = binding.battle ? manager.connect(binding.battle.engine.events) : undefined;
    manager.setScene(binding.battle ? 'battle' : 'exploration');
    manager.suspend(AppState.currentState !== 'active');
    const lifecycle = AppState.addEventListener('change', (state) => manager.suspend(state !== 'active'));
    return () => { disconnectJourney(); disconnectBattle?.(); lifecycle.remove(); manager.suspend(true); };
  }, [manager, binding]);
  useEffect(() => {
    manager?.setSettings(view.settings);
    const session = binding?.session;
    if (session) {
      const current = session.getSnapshot().state.audio;
      if (current.enabled !== view.settings.enabled || current.music !== view.settings.music || current.sfx !== view.settings.sfx) session.setAudio(view.settings);
    }
  }, [manager, binding?.session, view.settings]);
  useEffect(() => {
    if (manager && view.ready && view.settings.enabled && Platform.OS !== 'web') {
      void manager.enable(preferences.getSettings()).then((enabled) => { if (enabled) setUnlockedManager(manager); });
    }
  }, [manager, preferences, view.ready, view.settings.enabled]);
  const attachSession = useCallback((session: JourneySession, battle?: BattleSession) => {
    const next = { session, battle };
    setBinding(next);
    return () => setBinding((current) => current === next ? undefined : current);
  }, []);
  const enable = useCallback((settings: AudioSettings) => {
    setError(undefined);
    if (manager) void manager.enable(settings).then((enabled) => { if (enabled) setUnlockedManager(manager); });
  }, [manager]);
  const setSettings = useCallback((settings: AudioSettings) => {
    void preferences.setSettings(settings);
    // Browsers require unlocking from the press; native initialization belongs to the effect.
    if (Platform.OS === 'web' && settings.enabled && unlockedManager !== manager) enable(settings);
  }, [preferences, manager, unlockedManager, enable]);
  const resume = useCallback(() => enable(preferences.getSettings()), [enable, preferences]);
  const value = useMemo(() => ({ preferences, settings: view.settings, ready: view.ready && !!manager,
    soundReady: !!manager && unlockedManager === manager, error: view.error ?? error, setSettings, resume, attachSession }),
  [preferences, view.settings, view.ready, view.error, manager, unlockedManager, error, setSettings, resume, attachSession]);
  return <AudioContext value={value}>{children}</AudioContext>;
}
export function useAudio() {
  const audio = useContext(AudioContext);
  if (!audio) throw new Error('Sound controls require the app audio provider.');
  return audio;
}
