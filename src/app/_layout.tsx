import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#101719' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="characters/index" />
          <Stack.Screen name="characters/new" />
          <Stack.Screen name="game/[characterId]" options={{ gestureEnabled: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
