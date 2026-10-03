import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

export type PopoverAccessibilityProps = PropsWithChildren<{ open: boolean; close(): void }>;

export default function PopoverAccessibility({ children, open }: PopoverAccessibilityProps) {
  return <View accessibilityViewIsModal={open}>{children}</View>;
}
