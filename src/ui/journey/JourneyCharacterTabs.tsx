import { router } from 'expo-router';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import { Tabs } from 'heroui-native/tabs';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { heroStats, MAX_LEVEL, experienceToNextLevel } from '../../engine/rpg/Character';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import CharacterStatsDetails from '../shared/CharacterStatsDetails';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import ResourceBar from '../shared/ResourceBar';
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
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full gap-4">
      <KeyboardChoiceGroup itemRole="tab" value={value}>
        <Tabs.List
          accessibilityLabel="Character details"
          className="w-full border border-border bg-surface"
        >
          <Tabs.ScrollView>
            <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
            {(['Character', 'Stats', 'Skills', 'Inventory', 'Quests'] as const).map((label) => (
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
      <Tabs.Content value="character">
        <CharacterSummary session={session} />
      </Tabs.Content>
      <Tabs.Content value="stats">
        <DungeonCard>
          <Text className="text-accent" style={styles.heading}>
            {session.characterName ?? 'Warden'} · Stats
          </Text>
          <CharacterStatsDetails host={host} session={session} />
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

function CharacterSummary({ session }: { session: JourneySession }) {
  const { profile } = useCharacterGame();
  const { state } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const stats = heroStats(state.hero, session.content, state.dungeon?.effects);
  const name = session.characterName ?? 'Warden';
  return (
    <DungeonCard>
      <Text className="text-accent" style={styles.heading}>
        {name} · Level {state.hero.level}
      </Text>
      <Text className="text-muted" style={styles.body}>
        {session.content.data.classes.find((entry) => entry.id === state.hero.classId)?.name} ·{' '}
        {TALENT_LABELS[state.hero.growthTalent]} · Starting age {profile.age}
      </Text>
      <ResourceBar label="HP" value={state.hero.health} max={stats.maxHealth} name={name} />
      <Text className="text-muted" style={styles.body}>
        {stats.maxHealth - state.hero.wounds} healable HP · {state.hero.wounds} wounds
      </Text>
      <ResourceBar label="Mana" value={state.hero.mana} max={stats.maxMana} name={name} />
      <View className="gap-1">
        <ResourceBar
          label="Stamina"
          value={state.hero.stamina}
          max={stats.maxStamina}
          name={name}
        />
        <View style={styles.staminaNotes}>
          <Text className="text-muted" style={[styles.body, styles.recoveryNote]}>
            Rest recovers stamina up to {Math.floor((stats.maxStamina * state.hero.fullness) / 100)}
          </Text>
          <Text className="text-muted" style={[styles.body, styles.hunger]}>
            {(100 - state.hero.fullness).toFixed(1)}% Hunger
          </Text>
        </View>
      </View>
      <Text className="text-muted" style={styles.body}>
        {state.hero.gold} gold · {state.hero.ap} AP
      </Text>
      <Text className="text-muted" style={styles.body}>
        Damage {stats.combatant.minDamage}–{stats.combatant.maxDamage} · Defense{' '}
        {stats.combatant.defense} · Speed {stats.combatant.speed}
      </Text>
      {state.hero.level < MAX_LEVEL ? (
        <ResourceBar
          label="XP"
          value={state.hero.experience}
          max={experienceToNextLevel(state.hero.level)}
          name={name}
        />
      ) : (
        <Text className="text-muted" style={styles.body}>
          Maximum level
        </Text>
      )}
      <Text className="text-muted" style={styles.body}>
        First:{' '}
        {session.content.data.titles.find((t) => t.id === state.hero.titleCollection.selected.first)
          ?.name ?? 'None'}{' '}
        · Second:{' '}
        {session.content.data.titles.find(
          (t) => t.id === state.hero.titleCollection.selected.second,
        )?.name ?? 'None'}
      </Text>
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
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 12, lineHeight: 20 },
  heading: { fontSize: 17, fontWeight: '600' },
  staminaNotes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    columnGap: 12,
    rowGap: 4,
  },
  recoveryNote: { flexGrow: 1, flexShrink: 1, flexBasis: 180 },
  hunger: { marginLeft: 'auto', textAlign: 'right' },
});
