import { useState, useSyncExternalStore } from 'react';
import { Surface } from 'heroui-native/surface';
import { ScrollView, Text, View } from 'react-native';
import type { GameplayBattle as BattleSession } from '../../game/Gameplay';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { DungeonButton as Button, DungeonNotice } from '../shared/DungeonUI';

export default function VictoryLootPanel({
  journey,
  battle,
  busy,
  retryAvailable,
  error,
  confirm,
}: {
  journey: JourneySession;
  battle: BattleSession;
  busy: boolean;
  retryAvailable?: boolean;
  error?: string;
  confirm(selectedItemIds: readonly string[]): void;
}) {
  const presentation = useSyncExternalStore(
    battle.presentation.subscribe,
    battle.presentation.getSnapshot,
    battle.presentation.getSnapshot,
  );
  const [loot] = useState(() => journey.previewVictoryLoot(battle));
  const availableIds = loot.items.filter((item) => item.collectable > 0).map((item) => item.itemId);
  const [selected, setSelected] = useState<string[]>(availableIds);
  const locked = busy || !!retryAvailable || presentation.busy;
  const allSelected = availableIds.every((id) => selected.includes(id));
  return (
    <Surface
      className="min-h-0 gap-3 rounded-xl border border-border p-4"
      style={{ flexShrink: 1 }}
    >
      <Text className="text-lg font-semibold text-accent" accessibilityRole="header">
        Victory loot
      </Text>
      <Text className="text-sm text-foreground" accessibilityLiveRegion="polite">
        {loot.gold} gold · {loot.experience} XP
      </Text>
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}
        contentContainerStyle={{ gap: 12 }}
        nestedScrollEnabled
      >
        <Text className="text-xs leading-5 text-muted">
          Gold and XP are always collected. Choose the items to keep; unselected items are left
          behind.
        </Text>
        {loot.items.length ? (
          <>
            <Button
              label="Select all loot"
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: allSelected ? true : selected.length ? 'mixed' : false,
              }}
              selected={allSelected}
              disabled={locked || !availableIds.length}
              onPress={() => setSelected(allSelected ? [] : availableIds)}
            />
            <View className="gap-2">
              {loot.items.map((item) => {
                const name = journey.content.item(item.itemId).name;
                const checked = selected.includes(item.itemId);
                return (
                  <Button
                    key={item.itemId}
                    image={{ kind: 'item', id: item.itemId }}
                    label={`${name} ×${item.quantity}`}
                    detail={
                      item.collectable === 0
                        ? 'No room in your pack'
                        : item.collectable < item.quantity
                          ? `Room for ${item.collectable} of ${item.quantity}`
                          : checked
                            ? 'Selected'
                            : 'Leave behind'
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={`${name}, ${item.quantity} dropped, ${item.collectable} available to collect`}
                    selected={checked}
                    disabled={locked || item.collectable === 0}
                    onPress={() =>
                      setSelected((current) =>
                        current.includes(item.itemId)
                          ? current.filter((id) => id !== item.itemId)
                          : [...current, item.itemId],
                      )
                    }
                  />
                );
              })}
            </View>
          </>
        ) : (
          <Text className="text-sm text-muted">
            No item drops this time. Your gold and XP are ready to collect.
          </Text>
        )}
        {retryAvailable ? (
          <Text className="text-xs leading-5 text-muted">
            Your selection is waiting to save. Retry collects these same rewards.
          </Text>
        ) : null}
        {error ? <DungeonNotice message={error} /> : null}
      </ScrollView>
      <Button
        primary
        label={retryAvailable ? 'Retry loot confirmation' : 'Confirm loot'}
        busy={busy}
        disabled={presentation.busy}
        accessibilityHint="Collect the selected loot and return to exploration"
        onPress={() => confirm(selected)}
      />
    </Surface>
  );
}
