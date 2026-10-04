import type { ReactNode } from 'react';
import ItemPopover from './ItemPopover';
import { inventoryRowLabel, type InventoryRow } from './inventoryRows';

export default function InventoryItemPopover({
  row,
  ...props
}: {
  row: InventoryRow;
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  return (
    <ItemPopover
      {...props}
      itemId={row.item.id}
      label={inventoryRowLabel(row)}
      highlighted={row.equipped}
    />
  );
}
