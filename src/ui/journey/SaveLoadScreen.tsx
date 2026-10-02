import ProgressionFeedback from '../skills/ProgressionFeedback';
import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { MenuPage, menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonNotice } from '../shared/DungeonUI';

export default function SaveLoadScreen() {
  const { host } = useCharacterGame();
  const view = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const disabled = view.busy || !!view.retryAvailable || !view.storageAvailable || !!view.battle;
  return (
    <MenuPage>
      <Text className="text-muted" style={menu.body}>
        {view.storageAvailable
          ? 'Autosave follows your steps. Encounters resume at their starting checkpoint.'
          : 'Saves are unavailable. Your current journey continues in memory.'}
      </Text>
      {view.battle ? (
        <DungeonNotice
          status="accent"
          message="Finish the encounter before saving or loading a manual slot."
        />
      ) : null}
      {(['1', '2', '3'] as const).map((slot) => {
        const saved = view.slots.find((entry) => entry.id === slot);
        return (
          <DungeonCard key={slot}>
            <Text className="text-accent" style={menu.heading}>
              Slot {slot}
            </Text>
            <Text className="text-muted" style={menu.body}>
              {saved ? `Saved · ${new Date(saved.savedAt).toLocaleString()}` : 'Empty'}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <DungeonButton
                label={`Save slot ${slot}`}
                disabled={disabled}
                onPress={() => {
                  void host.save(slot);
                }}
              />
              <DungeonButton
                label={`Load slot ${slot}`}
                disabled={disabled || !saved}
                onPress={() => {
                  void host.load(slot);
                }}
              />
            </View>
          </DungeonCard>
        );
      })}
      <ProgressionFeedback host={host} />
    </MenuPage>
  );
}
