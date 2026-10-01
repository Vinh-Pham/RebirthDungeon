import { router, useNavigation, usePathname } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import { DungeonButton, DungeonNotice } from '../shared/DungeonUI';
import { useAppNavigation } from './AppNavigationContext';

export default function AppHeader({ title, canGoBack }: { title: string; canGoBack?: boolean }) {
  const navigation = useNavigation('/');
  const path = usePathname();
  const { game, error, menuTrigger } = useAppNavigation();
  const inGame = path.startsWith('/game/');
  const auxiliary = path.endsWith('/inventory') || path.endsWith('/save-load');
  const label = path.endsWith('/inventory') ? 'Inventory' : path.endsWith('/save-load') ? 'Save/Load' : inGame ? game?.profile.name ?? 'Your journey' : title;
  const showBack = auxiliary || path === '/settings' || (!inGame && canGoBack);
  const back = () => {
    if (router.canGoBack()) router.back();
    else if (inGame) router.replace({ pathname: '/game/[characterId]', params: { characterId: game?.profile.id ?? path.split('/')[2] } });
    else router.replace(path === '/characters/new' ? '/characters' : '/');
  };
  return <SafeAreaView edges={['top', 'left', 'right']} className="border-b border-border bg-background">
    <View className="flex-row items-center gap-3 px-4 py-2">
      <DungeonButton ref={menuTrigger} label="☰" accessibilityLabel="Open navigation menu"
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} accessibilityRole="header" className="text-lg font-semibold text-accent">{label}</Text>
        {game ? <Text numberOfLines={1} className="text-xs text-muted">{inGame && !auxiliary ? `${TALENT_LABELS[game.profile.talent]} · Age ${game.profile.age}` : game.profile.name}</Text> : null}
      </View>
      {showBack ? <DungeonButton label="Back" onPress={back} /> : null}
    </View>
    {error ? <View className="px-4 pb-2"><DungeonNotice message={error} /></View> : null}
  </SafeAreaView>;
}
