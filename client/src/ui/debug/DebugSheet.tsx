import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DebugSheetProps } from './DebugSheet.types';

export default function DebugSheet({ isOpen, close, children }: DebugSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal={isOpen}>
        <BottomSheet.Overlay variant="default" />
        <BottomSheet.Content
          snapPoints={['50%', '85%']}
          enableDynamicSizing={false}
          enableOverDrag={false}
          enablePanDownToClose
          topInset={insets.top}
          backgroundClassName="bg-background"
          contentContainerClassName="h-full"
          contentContainerProps={{ accessibilityLabel: 'Debug menu' }}
        >
          <BottomSheet.Title className="absolute h-px w-px overflow-hidden">
            Debug menu
          </BottomSheet.Title>
          <BottomSheetScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          >
            {isOpen ? children : null}
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
