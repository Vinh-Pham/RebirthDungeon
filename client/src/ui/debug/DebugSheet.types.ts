import type { PropsWithChildren, RefObject } from 'react';
import type { View } from 'react-native';

export type DebugSheetProps = PropsWithChildren<{
  isOpen: boolean;
  close(): void;
  initialFocus: RefObject<View | null>;
}>;
