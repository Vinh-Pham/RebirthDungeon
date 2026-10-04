import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { Text, View } from 'react-native';
import { useOnline } from '../../online/OnlineProvider';
import { contentOptions, featureOptions } from '../../online/queries';
import { APIError } from '../../online/API';
import { OnlineGameplayHost, type OnlineHostOptions } from '../../online/OnlineGameplayHost';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { useAudio } from '../../audio/AudioProvider';
import { useAppNavigation } from '../navigation/AppNavigationContext';
import { CharacterGameContext } from '../menu/CharacterGameContext';
import { MenuButton, MenuError, MenuPage, menu } from '../menu/MenuUI';
import { DungeonLoading } from '../shared/DungeonUI';
import OnlineGate from './OnlineGate';
export default function OnlineGameLayout() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  return (
    <OnlineGate>
      <LoadGame key={characterId} characterId={characterId} />
    </OnlineGate>
  );
}
function LoadGame({ characterId }: { characterId: string }) {
  const { api, session, access } = useOnline();
  const metadata = useQuery(
    featureOptions(api!, access, session!.user.id, characterId, 'character'),
  );
  const catalog = useQuery({
    ...contentOptions(api!, session!.user.id, metadata.data?.contentVersion),
    enabled: !!metadata.data,
  });
  useEffect(() => {
    if (metadata.error instanceof APIError && metadata.error.status === 404)
      router.dismissTo('/online/characters?reset=1');
  }, [metadata.error]);
  if (!catalog.data)
    return (
      <MenuPage>
        <Text className="text-foreground" style={menu.title}>
          Online journey
        </Text>
        {catalog.error || metadata.error ? (
          <>
            <MenuError
              message={catalog.error?.message ?? metadata.error?.message ?? 'Character unavailable'}
            />
            <MenuButton
              label="Retry"
              onPress={() => {
                void catalog.refetch();
              }}
            />
          </>
        ) : (
          <DungeonLoading label="Loading game content" />
        )}
        <MenuButton
          label="Online characters"
          secondary
          onPress={() => router.dismissTo('/online/characters')}
        />
      </MenuPage>
    );
  return (
    <Game
      key={`${api!.origin}:${session!.user.id}:${characterId}`}
      characterId={characterId}
      catalog={catalog.data.catalog}
    />
  );
}
function Game({
  characterId,
  catalog,
}: {
  characterId: string;
  catalog: ConstructorParameters<typeof ContentRegistry>[0];
}) {
  const path = usePathname();
  const online = useOnline(),
    queries = useQueryClient();
  const { registerGame } = useAppNavigation(),
    { attachSession } = useAudio();
  const mutation = useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: (action: Parameters<OnlineHostOptions['mutate']>[0]) =>
      action.kind === 'retry'
        ? online.commands!.retry(characterId)
        : online.commands!.submit(characterId, action.revision, action.command),
  });
  const mutate = mutation.mutateAsync;
  const host = useMemo(
    () =>
      new OnlineGameplayHost({
        characterId,
        userId: online.session!.user.id,
        api: online.api!,
        access: online.access,
        commands: online.commands!,
        activity: online.activity,
        queries,
        content: new ContentRegistry(catalog),
        mutate,
      }),
    [
      characterId,
      online.session!.user.id,
      online.api,
      online.access,
      online.commands,
      online.activity,
      queries,
      catalog,
      mutate,
    ],
  );
  useEffect(() => {
    if (!path.endsWith('/logs'))
      host.recordLog(
        'user',
        'NAVIGATION',
        `Opened ${path.split('/').at(-1) === characterId ? 'Journey' : path.split('/').at(-1)}.`,
      );
  }, [host, path, characterId]);
  useFocusEffect(useCallback(() => () => host.stopRest(), [host]));
  const view = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const profile = useMemo(
    () => (view.session ? { ...host.current().character } : undefined),
    [host, view.session],
  );
  useEffect(() => {
    if (profile && view.session)
      return registerGame({
        host,
        profile,
        leave: async () => {
          if (!(await host.flushForExit())) return false;
          host.stopRest();
          router.dismissTo('/online/characters');
          return true;
        },
      });
  }, [host, profile, view.session, registerGame]);
  useEffect(() => {
    if (view.session) return attachSession(view.session, view.battle);
  }, [attachSession, view.session, view.battle]);
  if (!view.session || !profile)
    return (
      <MenuPage>
        {view.error ? (
          <>
            <MenuError message={view.error} />
            <MenuButton
              label="Retry"
              onPress={() => {
                void queries.invalidateQueries({ queryKey: ['game'] });
              }}
            />
          </>
        ) : (
          <DungeonLoading label="Loading online character" />
        )}
        <MenuButton
          label="Online characters"
          secondary
          onPress={() => router.dismissTo('/online/characters')}
        />
      </MenuPage>
    );
  return (
    <CharacterGameContext value={{ host, profile }}>
      <View className="flex-1 bg-background">
        <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
      </View>
    </CharacterGameContext>
  );
}
