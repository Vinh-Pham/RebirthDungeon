import { Stack } from 'expo-router';
import { useThemeColor } from 'heroui-native/hooks';
import AppHeader from '@/ui/navigation/AppHeader';

export const unstable_settings = { initialRouteName: 'index' };

export default function ScreensLayout() {
  const background = useThemeColor('background');
  return (
    <Stack
      screenOptions={{
        gestureEnabled: false,
        contentStyle: { backgroundColor: background },
        header: ({ options, back }) => (
          <AppHeader title={options.title ?? 'Rebirth Dungeon'} canGoBack={!!back} />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Rebirth Dungeon' }} />
      <Stack.Screen name="characters/index" options={{ title: 'Characters' }} />
      <Stack.Screen name="characters/new" options={{ title: 'New Character' }} />
      <Stack.Screen name="game/[characterId]" />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
