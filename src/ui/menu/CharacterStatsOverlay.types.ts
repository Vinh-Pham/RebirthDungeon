import type { PropsWithChildren, RefObject } from 'react';
import type { View } from 'react-native';

export type CharacterStatsOverlayProps = PropsWithChildren<{
  isOpen: boolean;
  close(): void;
  initialFocus: RefObject<View | null>;
}>;
