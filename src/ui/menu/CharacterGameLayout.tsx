import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppTabs from '../../components/app-tabs';
import { loadGameContent } from '../../data/content';
import { JourneyHost } from '../../game/JourneyHost';
import { createSaveStorage } from '../../persistence/createSaveStorage';
import { withCharacters } from '../../persistence/characters';
import { TALENT_LABELS, type CharacterProfile, type CompleteCharacter } from '../../persistence/CharacterProfile';
import { CharacterGameContext } from './CharacterGameContext';
import { MenuButton, MenuError, MenuPage, menu } from './MenuUI';

export default function CharacterGameLayout() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  return <LoadCharacter key={characterId} characterId={characterId} />;
}
function LoadCharacter({ characterId }: { characterId: string }) {
  const [profile, setProfile] = useState<CharacterProfile>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void withCharacters((repository) => repository.get(characterId)).then((found) => {
      if (!found) throw new Error('This character could not be found. Choose a character to continue.');
      if (active) setProfile(found);
    }).catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Your character could not be loaded.'); });
    return () => { active = false; };
  }, [characterId, attempt]);
  if (profile?.needsSetup) return <Redirect href={{ pathname: '/characters/new', params: { importId: profile.id } }} />;
  if (profile) return <CharacterGame profile={profile} />;
  return <MenuPage><Text style={menu.title}>Your journey</Text>{error ? <><MenuError message={error} />
    <MenuButton label="Retry" onPress={() => { setError(undefined); setAttempt((value) => value + 1); }} />
    <MenuButton label="Back to Characters" secondary onPress={() => router.dismissTo('/characters')} />
  </> : <ActivityIndicator color="#d0b987" accessibilityLabel="Loading character" />}</MenuPage>;
}
function CharacterGame({ profile }: { profile: CompleteCharacter }) {
  const [attempt, setAttempt] = useState(0);
  return <GameSession key={attempt} profile={profile} retry={() => setAttempt((value) => value + 1)} />;
}
function GameSession({ profile, retry }: { profile: CompleteCharacter; retry(): void }) {
  const [host] = useState(() => new JourneyHost(loadGameContent(), () => createSaveStorage(profile.id), profile.name));
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string>();
  const leavePending = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') void host.flush(); });
    return () => subscription.remove();
  }, [host]);
  const leave = useCallback(async () => {
    if (leavePending.current || snapshot.busy) return;
    leavePending.current = true; setLeaving(true); setError(undefined);
    if (await host.flushForExit()) router.dismissTo('/characters');
    else { setError('Your latest progress could not be saved. Please try again.'); leavePending.current = false; setLeaving(false); }
  }, [host, snapshot.busy]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { void leave(); return true; });
    return () => subscription.remove();
  }, [leave]));
  if (!snapshot.session) return <MenuPage><Text style={menu.title}>{profile.name}</Text>
    {snapshot.busy ? <ActivityIndicator color="#d0b987" accessibilityLabel="Loading journey" /> : <>
      <MenuError message={snapshot.error ?? 'Your journey could not be loaded.'} /><MenuButton label="Retry" onPress={retry} />
      <MenuButton label="Back to Characters" secondary onPress={() => router.dismissTo('/characters')} />
    </>}
  </MenuPage>;
  return <CharacterGameContext value={{ host, profile }}><View style={menu.screen}>
    <SafeAreaView edges={['top']} style={styles.header}>
      <View style={styles.headerRow}><View style={styles.identity}><Text numberOfLines={1} style={menu.heading}>{profile.name}</Text>
        <Text style={styles.details}>{TALENT_LABELS[profile.talent]} · Age {profile.age}</Text></View>
        <MenuButton label={leaving ? 'Saving…' : 'Characters'} secondary busy={leaving} disabled={snapshot.busy} onPress={() => { void leave(); }} />
      </View><MenuError message={error} />
    </SafeAreaView>
    <AppTabs />
  </View></CharacterGameContext>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, backgroundColor: '#101719', borderBottomWidth: 1, borderBottomColor: '#344044' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }, identity: { flex: 1, gap: 4 },
  details: { color: '#aab6b5', fontSize: 12 },
});
