import { useContext, type ComponentProps } from 'react';
import { Tabs as RouterTabs } from 'expo-router';
import { Tabs } from 'heroui-native/tabs';
import KeyboardChoiceGroup from '../ui/shared/KeyboardChoiceGroup';
import { View } from 'react-native';
import { DebugMenuTabBarContext } from '../ui/debug/DebugMenuContext';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof RouterTabs>['tabBar']>>[0];

function DungeonTabBar({ state, navigation, descriptors, insets }: TabBarProps) {
  const active = state.routes[state.index].name;
  const reportDebugTabBarHeight = useContext(DebugMenuTabBarContext);
  return (
    <View
      className="border-t border-border bg-background px-5 pt-2"
      style={{ paddingBottom: insets.bottom + 8 }}
      onLayout={
        reportDebugTabBarHeight
          ? (event) => reportDebugTabBarHeight(event.nativeEvent.layout.height)
          : undefined
      }
    >
      <KeyboardChoiceGroup itemRole="tab" value={active}>
        <Tabs
          value={active}
          className="w-full max-w-[560px] self-center"
          onValueChange={(name) => {
            const route = state.routes.find((entry) => entry.name === name);
            if (!route) return;
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (name !== active && !event.defaultPrevented)
              navigation.navigate(route.name, route.params);
          }}
        >
          <Tabs.List className="w-full border border-border bg-surface">
            <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
            {state.routes.map((route) => (
              <Tabs.Trigger
                key={route.key}
                value={route.name}
                accessibilityLabel={descriptors[route.key].options.title ?? route.name}
                className="min-h-12 flex-1"
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              >
                <Tabs.Label>{descriptors[route.key].options.title ?? route.name}</Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </KeyboardChoiceGroup>
    </View>
  );
}

export default function AppTabs() {
  return (
    <RouterTabs
      tabBar={(props) => <DungeonTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <RouterTabs.Screen name="index" options={{ title: 'Journey' }} />
      <RouterTabs.Screen name="explore" options={{ title: 'Codex' }} />
    </RouterTabs>
  );
}
