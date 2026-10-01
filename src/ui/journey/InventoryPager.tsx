import { Pressable, StyleSheet, Text, View } from 'react-native';

export const INVENTORY_PAGE_SIZE = 20;
export function inventoryPage(page: number, count: number) { return Math.min(page, Math.max(0, Math.ceil(count / INVENTORY_PAGE_SIZE) - 1)); }

/** Bound rendered rows on mobile while keeping every owned copy accessible. */
export default function InventoryPager({ page, count, label, disabled = false, onPage }: {
  page: number; count: number; label: string; disabled?: boolean; onPage(page: number): void;
}) {
  if (count <= INVENTORY_PAGE_SIZE) return null;
  const start = page * INVENTORY_PAGE_SIZE;
  return <View style={styles.row}>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{label} {start + 1}–{Math.min(start + INVENTORY_PAGE_SIZE, count)} of {count}</Text>
    <View style={styles.actions}>{([['Previous', -1, page === 0], ['Next', 1, start + INVENTORY_PAGE_SIZE >= count]] as const).map(([name, offset, unavailable]) =>
      <Pressable key={String(name)} accessibilityRole="button" accessibilityLabel={`${name} ${label.toLowerCase()}`} accessibilityState={{ disabled: disabled || !!unavailable }} disabled={disabled || !!unavailable}
        onPress={() => onPage(page + Number(offset))} style={({ pressed }) => [styles.button, (disabled || unavailable) && styles.disabled, pressed && styles.disabled]}>
        <Text style={styles.text}>{name}</Text>
      </Pressable>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  row: { gap: 8 }, actions: { flexDirection: 'row', gap: 12 }, text: { color: '#d0b987', fontSize: 13 },
  button: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#756244', borderRadius: 5 }, disabled: { opacity: 0.4 },
});
