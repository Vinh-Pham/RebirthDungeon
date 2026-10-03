import { router } from 'expo-router';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { Tabs } from 'heroui-native/tabs';
import { StyleSheet, Text } from 'react-native';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import CharacterStatsDetails from '../shared/CharacterStatsDetails';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import { InventoryContent } from './InventoryScreen';
import JourneySkills from './JourneySkills';
import QuestTracker from '../quests/QuestTracker';

export default function JourneyCharacterTabs({
  host,
  session,
  value,
  onValueChange,
}: {
  host: JourneyHost;
  session: JourneySession;
  value: string;
  onValueChange(value: string): void;
}) {
  const { profile } = useCharacterGame();
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full gap-4">
      <KeyboardChoiceGroup itemRole="tab" value={value}>
        <Tabs.List
          accessibilityLabel="Character details"
          className="w-full border border-border bg-surface"
        >
          <Tabs.ScrollView>
            <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
            {(['Stats', 'Skills', 'Inventory', 'Quests'] as const).map((label) => (
              <Tabs.Trigger
                key={label}
                value={label.toLowerCase()}
                accessibilityLabel={label}
                className="min-h-12"
                style={{
                  flexGrow: label.length > 6 ? 1.3 : 1,
                  flexShrink: 0,
                  minWidth: label.length > 6 ? 88 : 64,
                  paddingHorizontal: 10,
                }}
              >
                <Tabs.Label className="text-xs" numberOfLines={1}>
                  {label}
                </Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.ScrollView>
        </Tabs.List>
      </KeyboardChoiceGroup>
      <Tabs.Content value="stats">
        <DungeonCard>
          <Text className="text-accent" style={styles.heading}>
            {session.characterName ?? 'Warden'} · Stats
          </Text>
          <CharacterStatsDetails host={host} session={session} profile={profile} />
          <DungeonButton
            label="Title collection"
            onPress={() =>
              router.navigate({
                pathname: '/game/[characterId]/titles',
                params: { characterId: profile.id },
              })
            }
          />
          <DungeonButton
            label="Skills journal"
            onPress={() =>
              router.navigate({
                pathname: '/game/[characterId]/skills',
                params: { characterId: profile.id },
              })
            }
          />
        </DungeonCard>
      </Tabs.Content>
      <Tabs.Content value="skills">
        <JourneySkills session={session} />
      </Tabs.Content>
      <Tabs.Content value="inventory">
        <InventoryContent host={host} session={session} />
      </Tabs.Content>
      <Tabs.Content value="quests">
        <QuestTracker session={session} />
      </Tabs.Content>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '600' },
});
