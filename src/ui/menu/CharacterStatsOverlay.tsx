import { Dialog } from 'heroui-native/dialog';
import { useWindowDimensions } from 'react-native';
import type { CharacterStatsOverlayProps } from './CharacterStatsOverlay.types';

/** The portal owns mounting, so closed stats do not subscribe to the game. */
export default function CharacterStatsOverlay({ isOpen, close, children }: CharacterStatsOverlayProps) {
  const tablet = useWindowDimensions().width >= 700;
  return <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
    <Dialog.Portal className="items-center justify-center" unstable_accessibilityContainerViewIsModal>
      <Dialog.Overlay variant="default" />
      <Dialog.Content isSwipeable={false} className="overflow-hidden bg-background p-0"
        style={tablet ? { width: 580, height: '90%', borderRadius: 16 } : { width: '100%', height: '100%', borderRadius: 0 }}>
        <Dialog.Title className="absolute h-px w-px overflow-hidden">Character stats</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>;
}
