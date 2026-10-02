import { Surface } from 'heroui-native/surface';
import { Modal, useWindowDimensions, View } from 'react-native';
import type { CharacterStatsOverlayProps } from './CharacterStatsOverlay.types';

/** RN Web's Modal supplies focus trapping, Escape, and background isolation. */
export default function CharacterStatsOverlay({
  isOpen,
  close,
  initialFocus,
  children,
}: CharacterStatsOverlayProps) {
  const tablet = useWindowDimensions().width >= 700;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={close}
      onShow={() => initialFocus.current?.focus()}
    >
      <View className="flex-1 items-center justify-center bg-backdrop">
        <Surface
          className="overflow-hidden bg-background p-0"
          role="dialog"
          aria-modal
          accessibilityLabel="Character stats"
          style={
            tablet
              ? { width: 580, height: '90%', borderRadius: 16 }
              : { width: '100%', height: '100%', borderRadius: 0 }
          }
        >
          {isOpen ? children : null}
        </Surface>
      </View>
    </Modal>
  );
}
