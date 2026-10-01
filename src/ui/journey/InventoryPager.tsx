import { Text, View } from 'react-native';
import { DungeonButton } from '../shared/DungeonUI';

export const INVENTORY_PAGE_SIZE = 20;
export function inventoryPage(page: number, count: number) { return Math.min(page, Math.max(0, Math.ceil(count / INVENTORY_PAGE_SIZE) - 1)); }

/** Bound rendered rows on mobile while keeping every owned copy accessible. */
export default function InventoryPager({ page, count, label, disabled = false, onPage }: {
  page: number; count: number; label: string; disabled?: boolean; onPage(page: number): void;
}) {
  if (count <= INVENTORY_PAGE_SIZE) return null;
  const start = page * INVENTORY_PAGE_SIZE;
  return <View className="gap-2">
    <Text accessibilityLiveRegion="polite" className="text-sm text-accent">{label} {start + 1}–{Math.min(start + INVENTORY_PAGE_SIZE, count)} of {count}</Text>
    <View className="flex-row flex-wrap gap-3">{([['Previous', -1, page === 0], ['Next', 1, start + INVENTORY_PAGE_SIZE >= count]] as const).map(([name, offset, unavailable]) =>
      <DungeonButton key={name} label={name} accessibilityLabel={`${name} ${label.toLowerCase()}`} disabled={disabled || unavailable}
        onPress={() => onPage(page + offset)} />)}</View>
  </View>;
}
