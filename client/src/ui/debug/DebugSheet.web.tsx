import { Surface } from 'heroui-native/surface';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DebugSheetProps } from './DebugSheet.types';

/** RN Web's Modal owns Escape, focus containment, and background isolation. */
export default function DebugSheet({ isOpen, close, initialFocus, children }: DebugSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={close}
      onShow={() => initialFocus.current?.focus()}
    >
      <View className="flex-1 items-center justify-end bg-backdrop">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessible={false}
          focusable={false}
        />
        <Surface
          className="w-full max-w-[560px] overflow-hidden rounded-t-2xl border border-border bg-background"
          role="dialog"
          aria-modal
          accessibilityLabel="Debug menu"
          style={{ maxHeight: height * 0.85 }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
            {isOpen ? children : null}
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}
