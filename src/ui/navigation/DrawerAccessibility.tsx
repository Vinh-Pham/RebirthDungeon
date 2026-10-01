import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

export type DrawerAccessibilityProps = PropsWithChildren<{ open: boolean; close(): void }>;
export default function DrawerAccessibility({ children, open }: DrawerAccessibilityProps) {
  return <View className="flex-1" accessibilityViewIsModal={open} accessibilityElementsHidden={!open}
    importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}>{children}</View>;
}
