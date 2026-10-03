import { Button as HeroButton } from 'heroui-native/button';
import { Popover } from 'heroui-native/popover';
import type { ReactNode } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameImage from '../shared/GameImage';
import PopoverAccessibility from '../shared/PopoverAccessibility';
import { inventoryRowLabel, type InventoryRow } from './inventoryRows';

export default function InventoryItemPopover({
  row,
  open,
  onOpenChange,
  children,
}: {
  row: InventoryRow;
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const label = inventoryRowLabel(row);
  return (
    <Popover isOpen={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <HeroButton
          isIconOnly
          variant={Platform.OS === 'web' ? 'primary' : 'outline'}
          accessibilityLabel={`Inspect ${label}`}
          accessibilityState={{ expanded: open }}
          aria-expanded={open}
          className={`size-14 rounded-lg border p-1 ${row.equipped ? 'border-accent bg-surface-tertiary' : 'border-border bg-surface-secondary'}`}
        >
          <GameImage kind="item" id={row.item.id} size={44} />
        </HeroButton>
      </Popover.Trigger>
      <Popover.Portal unstable_accessibilityContainerViewIsModal>
        <Popover.Overlay className="bg-transparent" />
        <Popover.Content
          presentation="popover"
          placement="top"
          width={Math.min(360, width - insets.left - insets.right - 24)}
          accessibilityLabel={label}
          insets={{
            top: insets.top + 12,
            bottom: insets.bottom + 12,
            left: insets.left + 12,
            right: insets.right + 12,
          }}
          className="rounded-xl border border-border bg-surface p-3"
        >
          <PopoverAccessibility open={open} close={() => onOpenChange(false)}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: Math.max(120, (height - insets.top - insets.bottom) * 0.7) }}
              contentContainerStyle={{ gap: 12 }}
            >
              <View className="flex-row items-center gap-2">
                <Popover.Title className="min-w-0 flex-1 text-base text-accent">
                  {label}
                </Popover.Title>
                <Popover.Close accessibilityLabel="Close item details" className="size-12" />
              </View>
              {open ? children : null}
            </ScrollView>
          </PopoverAccessibility>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}
