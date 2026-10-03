import { Stack } from 'expo-router';
import { useThemeColor } from 'heroui-native/hooks';
import AppScreenShell from '@/ui/navigation/AppScreenShell';

export const unstable_settings = { initialRouteName: 'index' };

export default function ScreensLayout() {
  const background = useThemeColor('background');
  return (
    <AppScreenShell>
      <Stack
        screenOptions={{
          gestureEnabled: false,
          contentStyle: { backgroundColor: background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Rebirth Dungeon' }} />
        <Stack.Screen name="characters/index" options={{ title: 'Characters' }} />
        <Stack.Screen name="characters/new" options={{ title: 'New Character' }} />
        <Stack.Screen name="game/[...path]" />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="online/characters/index" />
        <Stack.Screen name="online/characters/new" />
        <Stack.Screen name="online/game/[characterId]" />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </AppScreenShell>
  );
}
