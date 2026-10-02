import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEBUG_GOLD_CAP, DEBUG_GOLD_SHORTCUTS, debugGoldError } from '../../game/DebugCommands';
import { useCharacterGame } from '../menu/CharacterGameContext';
import ProgressionFeedback from '../skills/ProgressionFeedback';
import { DungeonButton } from '../shared/DungeonUI';
import DebugSheet from './DebugSheet';

export default function DebugMenu({
  isOpen,
  onOpenChange,
  hidden,
  tabBarHeight,
}: {
  isOpen: boolean;
  onOpenChange(open: boolean): void;
  hidden: boolean;
  tabBarHeight: number;
}) {
  const { host, profile } = useCharacterGame();
  const view = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const insets = useSafeAreaInsets();
  const trigger = useRef<View>(null);
  const initialFocus = useRef<View>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!isOpen && wasOpen.current) trigger.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);
  const gold = view.session?.getSnapshot().state.hero.gold ?? 0;
  const unavailable = view.busy
    ? 'Saving progress…'
    : view.retryAvailable
      ? 'Retry the pending save before adding more gold.'
      : !view.storageAvailable
        ? 'Save storage is required to add gold.'
        : undefined;
  const close = () => {
    onOpenChange(false);
  };
  if (hidden || !view.session) return null;
  return (
    <>
      <View
        pointerEvents="box-none"
        className="absolute"
        style={{
          right: insets.right + 16,
          bottom: Math.max(insets.bottom, tabBarHeight) + 16,
        }}
      >
        <DungeonButton
          ref={trigger}
          label="DBG"
          primary
          accessibilityLabel="Open debug menu"
          accessibilityState={{ expanded: isOpen }}
          className="h-14 w-14 min-h-14 rounded-full p-0"
          onPress={() => onOpenChange(true)}
        />
      </View>
      <DebugSheet isOpen={isOpen} close={close} initialFocus={initialFocus}>
        <View className="gap-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className="shrink text-xl font-semibold text-foreground"
              accessibilityRole="header"
            >
              Debug menu
            </Text>
            <DungeonButton
              ref={initialFocus}
              label="Close"
              onPress={close}
              accessibilityLabel="Close debug menu"
            />
          </View>
          <Text className="text-base text-muted">{profile.name}</Text>
          <Text className="text-lg text-accent" accessibilityLiveRegion="polite">
            {gold.toLocaleString()} gold
          </Text>
          <Text className="text-base font-semibold text-foreground">Add gold</Text>
          <Text className="text-sm text-muted">
            Saved immediately, including during battles. Gold cap: {DEBUG_GOLD_CAP.toLocaleString()}
            .
          </Text>
          {DEBUG_GOLD_SHORTCUTS.map((amount) => {
            const reason = unavailable ?? debugGoldError(gold, amount);
            return (
              <View key={amount} className="gap-1">
                <DungeonButton
                  label={`+${amount.toLocaleString()} gold`}
                  disabled={!!reason}
                  onPress={() => {
                    void host.debug({ type: 'ADD_GOLD', amount });
                  }}
                />
                {reason ? <Text className="text-sm text-muted">{reason}</Text> : null}
              </View>
            );
          })}
          <ProgressionFeedback host={host} />
        </View>
      </DebugSheet>
    </>
  );
}
