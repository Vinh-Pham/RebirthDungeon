import '@/global.css';

import { DarkTheme, ThemeProvider } from 'expo-router';
import { useThemeColor } from 'heroui-native/hooks';
import { HeroUINativeProvider } from 'heroui-native/provider';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Uniwind } from 'uniwind';

import { AudioProvider } from '@/audio/AudioProvider';
import { AppNavigationProvider } from '@/ui/navigation/AppNavigationContext';
import AppDrawer from '@/ui/navigation/AppDrawer';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();
Uniwind.setTheme('dark');

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={{ toast: false }}>
        <RootNavigator />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const [background, surface, foreground, accent, border] = useThemeColor([
    'background', 'surface', 'foreground', 'accent', 'border',
  ]);
  const theme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background, card: surface, text: foreground, primary: accent, border },
  };
  return (
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <AudioProvider><AppNavigationProvider><AppDrawer /></AppNavigationProvider></AudioProvider>
      </ThemeProvider>
  );
}
