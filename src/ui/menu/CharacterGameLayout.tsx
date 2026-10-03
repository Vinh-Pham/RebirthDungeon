import { LogEngine } from '../../engine/logging/LogEngine';
import {
  Redirect,
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  usePathname,
} from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, BackHandler, Text, View } from 'react-native';
import { useDrawerStatus } from 'expo-router/drawer';
import { DrawerActions } from 'expo-router/react-navigation';
import { useAudio } from '../../audio/AudioProvider';
import { useAppNavigation } from '../navigation/AppNavigationContext';
import { DungeonLoading } from '../shared/DungeonUI';
import { loadGameContent } from '../../data/content';
import { JourneyHost } from '../../game/JourneyHost';
import { createSaveStorage } from '../../persistence/createSaveStorage';
import { withCharacters } from '../../persistence/characters';
import { type CharacterProfile, type CompleteCharacter } from '../../persistence/CharacterProfile';
import { CharacterGameContext } from './CharacterGameContext';
import { MenuButton, MenuError, MenuPage, menu } from './MenuUI';
import DebugMenu from '../debug/DebugMenu';

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
    void withCharacters((repository) => repository.get(characterId))
      .then((found) => {
        if (!found)
          throw new Error('This character could not be found. Choose a character to continue.');
        if (active) setProfile(found);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error ? failure.message : 'Your character could not be loaded.',
          );
      });
    return () => {
      active = false;
    };
  }, [characterId, attempt]);
  if (profile?.needsSetup)
    return <Redirect href={{ pathname: '/characters/new', params: { importId: profile.id } }} />;
  if (profile) return <CharacterGame profile={profile} />;
  return (
    <MenuPage>
      <Text className="text-foreground" style={menu.title}>
        Your journey
      </Text>
      {error ? (
        <>
          <MenuError message={error} />
          <MenuButton
            label="Retry"
            onPress={() => {
              setError(undefined);
              setAttempt((value) => value + 1);
            }}
          />
          <MenuButton
            label="Back to Characters"
            secondary
            onPress={() => router.dismissTo('/characters')}
          />
        </>
      ) : (
        <DungeonLoading label="Loading character" />
      )}
    </MenuPage>
  );
}
function CharacterGame({ profile }: { profile: CompleteCharacter }) {
  const [attempt, setAttempt] = useState(0);
  const { ready } = useAudio();
  if (!ready)
    return (
      <MenuPage>
        <DungeonLoading label="Loading sound preferences" />
      </MenuPage>
    );
  return (
    <GameSession key={attempt} profile={profile} retry={() => setAttempt((value) => value + 1)} />
  );
}
function GameSession({ profile, retry }: { profile: CompleteCharacter; retry(): void }) {
  const { preferences, attachSession } = useAudio();
  const { registerGame, statsOpen, closeStats, characters } = useAppNavigation();
  const navigation = useNavigation('/');
  const drawerOpen = useDrawerStatus() === 'open';
  const path = usePathname();
  const debugBlocked = drawerOpen || statsOpen;
  const [debugMenu, setDebugMenu] = useState({ path, blocked: debugBlocked, open: false });
  if (debugMenu.path !== path || debugMenu.blocked !== debugBlocked)
    setDebugMenu({ path, blocked: debugBlocked, open: false });
  const debugOpen = debugMenu.path === path && !debugBlocked && debugMenu.open;
  const setDebugOpen = useCallback(
    (open: boolean) => setDebugMenu({ path, blocked: debugBlocked, open }),
    [path, debugBlocked],
  );
  const [host] = useState(
    () =>
      new JourneyHost(
        loadGameContent(),
        () => createSaveStorage(profile.id),
        profile.name,
        profile.talent,
        preferences.getSettings,
        {
          debugEnabled: __DEV__,
          logs: new LogEngine(Date.now),
          characterId: profile.id,
          restClock: {
            schedule(callback, delayMs) {
              const timer = setTimeout(callback, delayMs);
              return () => clearTimeout(timer);
            },
          },
        },
      ),
  );
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const ready = !!snapshot.session;
  const lastLoggedPath = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || lastLoggedPath.current === path) return;
    lastLoggedPath.current = path;
    if (!path.endsWith('/logs'))
      host.recordLog(
        'user',
        'NAVIGATION',
        `Opened ${path.split('/').at(-1) === profile.id ? 'Journey' : path.split('/').at(-1)}.`,
      );
  }, [host, path, profile.id, ready]);
  const leavePending = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        host.recordLog(
          'system',
          'APP_BACKGROUND',
          'App left the foreground; Rest stopped and a save flush was requested.',
        );
        host.stopRest();
        void host.flush();
      }
    });
    return () => subscription.remove();
  }, [host]);
  const leave = useCallback(async () => {
    if (leavePending.current || host.getSnapshot().busy) return false;
    leavePending.current = true;
    try {
      if (!(await host.flushForExit())) return false;
      host.logs.clear();
      router.dismissTo('/characters');
      return true;
    } finally {
      leavePending.current = false;
    }
  }, [host]);
  useEffect(() => {
    if (ready) return registerGame({ host, profile, leave });
  }, [ready, registerGame, host, profile, leave]);
  useEffect(() => {
    if (snapshot.session) return attachSession(snapshot.session, snapshot.battle);
  }, [snapshot.session, snapshot.battle, attachSession]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (__DEV__ && debugOpen) {
          setDebugOpen(false);
          return true;
        }
        if (drawerOpen) {
          navigation.dispatch(DrawerActions.closeDrawer());
          return true;
        }
        if (statsOpen) {
          closeStats();
          return true;
        }
        if (
          path.endsWith('/inventory') ||
          path.endsWith('/save-load') ||
          path.endsWith('/skills') ||
          path.endsWith('/titles') ||
          path.endsWith('/quests') ||
          path.endsWith('/logs') ||
          path.endsWith('/explore')
        )
          return false;
        const current = host.getSnapshot();
        if (!current.battle && current.session?.getSnapshot().activeService) {
          if (!current.busy) current.session.dispatch({ type: 'CLOSE_SERVICE' });
          return true;
        }
        void characters();
        return true;
      });
      return () => subscription.remove();
    }, [
      characters,
      host,
      statsOpen,
      closeStats,
      drawerOpen,
      navigation,
      path,
      debugOpen,
      setDebugOpen,
    ]),
  );
  if (!snapshot.session)
    return (
      <MenuPage>
        <Text className="text-foreground" style={menu.title}>
          {profile.name}
        </Text>
        {snapshot.busy ? (
          <DungeonLoading label="Loading journey" />
        ) : (
          <>
            <MenuError message={snapshot.error ?? 'Your journey could not be loaded.'} />
            <MenuButton label="Retry" onPress={retry} />
            <MenuButton
              label="Back to Characters"
              secondary
              onPress={() => router.dismissTo('/characters')}
            />
          </>
        )}
      </MenuPage>
    );
  return (
    <CharacterGameContext value={{ host, profile }}>
      <View className="flex-1 bg-background">
        <View
          className="flex-1"
          pointerEvents={debugOpen ? 'none' : 'auto'}
          accessibilityElementsHidden={debugOpen}
          importantForAccessibility={debugOpen ? 'no-hide-descendants' : 'auto'}
        >
          <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="logs" />
            <Stack.Screen name="explore" />
            <Stack.Screen name="inventory" />
            <Stack.Screen name="skills" />
            <Stack.Screen name="quests" />
            <Stack.Screen name="titles" />
            <Stack.Screen name="save-load" />
          </Stack>
        </View>
        {__DEV__ ? (
          <DebugMenu
            isOpen={debugOpen}
            onOpenChange={setDebugOpen}
            hidden={drawerOpen || statsOpen}
          />
        ) : null}
      </View>
    </CharacterGameContext>
  );
}
