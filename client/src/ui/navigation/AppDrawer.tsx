import { useCallback, useSyncExternalStore } from 'react';
import { router, usePathname } from 'expo-router';
import {
  Drawer,
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { useThemeColor } from 'heroui-native/hooks';
import { Text, View, useWindowDimensions } from 'react-native';
import { DungeonButton, DungeonNotice } from '../shared/DungeonUI';
import { useAppNavigation } from './AppNavigationContext';
import { gameHref } from './gameHref';
import DrawerAccessibility from './DrawerAccessibility';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;

function AppDrawerContent(props: DrawerContentComponentProps) {
  const { game, openStats, characters, error } = useAppNavigation();
  const snapshot = useSyncExternalStore(
    game?.host.subscribe ?? noSubscribe,
    game?.host.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  const ready = !!snapshot?.session;
  const path = usePathname();
  const open = useDrawerStatus() === 'open';
  const close = useCallback(() => props.navigation.closeDrawer(), [props.navigation]);
  const route = (
    destination:
      | 'journey'
      | 'codex'
      | 'inventory'
      | 'save-load'
      | 'skills'
      | 'quests'
      | 'titles'
      | 'logs',
  ) => {
    if (!game || !ready) return;
    close();
    router.navigate(
      gameHref(
        game.host.source,
        game.profile.id,
        destination === 'journey' ? '' : destination === 'codex' ? 'explore' : destination,
      ),
    );
  };
  return (
    <DrawerAccessibility open={open} close={close}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-lg font-semibold text-accent">Rebirth Dungeon</Text>
          <DungeonButton label="×" accessibilityLabel="Close navigation menu" onPress={close} />
        </View>
        <Text className="text-sm text-muted">
          {game ? game.profile.name : 'Choose a character to begin your journey.'}
        </Text>
        <View className="gap-3">
          <DungeonButton
            label="Journey"
            selected={
              !!game &&
              path === `${game.host.source === 'online' ? '/online' : ''}/game/${game.profile.id}`
            }
            disabled={!ready}
            onPress={() => route('journey')}
          />
          <DungeonButton
            label="Codex"
            selected={path.endsWith('/explore')}
            disabled={!ready}
            onPress={() => route('codex')}
          />
          <DungeonButton
            label="Characters"
            selected={path === '/characters'}
            busy={!!snapshot?.busy}
            onPress={() => {
              close();
              void characters();
            }}
          />
          <DungeonButton
            label="Stats"
            disabled={!ready}
            onPress={() => {
              close();
              game?.host.recordLog('user', 'STATS_OPENED', 'Opened character stats.');
              openStats();
            }}
          />
          <DungeonButton
            label="Inventory"
            selected={path.endsWith('/inventory')}
            disabled={!ready}
            onPress={() => route('inventory')}
          />
          <DungeonButton
            label="Skills"
            selected={path.endsWith('/skills')}
            disabled={!ready}
            onPress={() => route('skills')}
          />
          <DungeonButton
            label="Titles"
            selected={path.endsWith('/titles')}
            disabled={!ready}
            onPress={() => route('titles')}
          />
          <DungeonButton
            label="Quests"
            selected={path.endsWith('/quests')}
            disabled={!ready}
            onPress={() => route('quests')}
          />
          <DungeonButton
            label="Logs"
            selected={path.endsWith('/logs')}
            disabled={!ready}
            onPress={() => route('logs')}
          />
          {game?.host.source !== 'online' ? (
            <DungeonButton
              label="Save/Load"
              selected={path.endsWith('/save-load')}
              disabled={!ready}
              onPress={() => route('save-load')}
            />
          ) : (
            <Text className="text-sm text-muted">Online progress saves automatically.</Text>
          )}
          <DungeonButton
            label="Account"
            onPress={() => {
              close();
              router.navigate('/account');
            }}
          />
          <DungeonButton
            label="Settings"
            selected={path === '/settings'}
            onPress={() => {
              close();
              router.navigate('/settings');
            }}
          />
        </View>
        {error ? <DungeonNotice message={error} /> : null}
      </DrawerContentScrollView>
    </DrawerAccessibility>
  );
}
export default function AppDrawer() {
  const [background, border] = useThemeColor(['background', 'border']);
  const { width } = useWindowDimensions();
  const { statsOpen } = useAppNavigation();
  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'left',
        drawerType: 'front',
        swipeEnabled: !statsOpen,
        swipeEdgeWidth: 32,
        drawerStyle: {
          width: Math.min(320, width * 0.86),
          backgroundColor: background,
          borderRightColor: border,
          borderRightWidth: 1,
        },
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        overlayAccessibilityLabel: 'Close navigation menu',
      }}
    >
      <Drawer.Screen name="(screens)" />
    </Drawer>
  );
}
