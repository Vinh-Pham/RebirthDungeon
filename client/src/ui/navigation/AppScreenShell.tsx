import { usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DungeonNotice } from '../shared/DungeonUI';
import { useAppNavigation } from './AppNavigationContext';
import { AppScreenChrome } from './AppScreenChrome';
import CharacterFooter from './CharacterFooter';

/** One footer belongs to the navigator, never to a scrolling page or a second campaign. */
export default function AppScreenShell({ children }: PropsWithChildren) {
  const path = usePathname();
  const { game, error } = useAppNavigation();
  const characterId = path.startsWith('/online/game/') ? path.split('/')[3] : undefined;
  const activeGame =
    characterId && (game?.profile.id !== characterId || game.host.source !== 'online')
      ? undefined
      : game;
  const hasFooter = !!characterId || (path === '/settings' && !!activeGame);
  return (
    <AppScreenChrome value={hasFooter}>
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        {error ? (
          <View className="px-4 py-2">
            <DungeonNotice message={error} />
          </View>
        ) : null}
        <View className="flex-1">{children}</View>
        {hasFooter ? <CharacterFooter game={activeGame} /> : null}
      </SafeAreaView>
    </AppScreenChrome>
  );
}
