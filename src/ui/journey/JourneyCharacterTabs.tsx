import { Tabs } from 'heroui-native/tabs';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';
import { heroStats, experienceToNextLevel } from '../../engine/rpg/Character';
import type { GameCommand } from '../../engine/commands';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import CharacterStatsDetails from '../shared/CharacterStatsDetails';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import ResourceBar from '../shared/ResourceBar';
import { InventoryContent } from './InventoryScreen';

export default function JourneyCharacterTabs({ host, session, value, onValueChange, dispatch }: {
  host: JourneyHost; session: JourneySession; value: string; onValueChange(value: string): void;
  dispatch(command: GameCommand): boolean;
}) {
  return <Tabs value={value} onValueChange={onValueChange} className="w-full gap-4">
    <KeyboardChoiceGroup itemRole="tab" value={value}>
      <Tabs.List accessibilityLabel="Character details" className="w-full border border-border bg-surface">
        <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
        {(['Character', 'Stats', 'Inventory'] as const).map((label) => <Tabs.Trigger key={label} value={label.toLowerCase()}
          accessibilityLabel={label} className="min-h-12 flex-1 px-2">
          <Tabs.Label className="text-sm" numberOfLines={1}>{label}</Tabs.Label>
        </Tabs.Trigger>)}
      </Tabs.List>
    </KeyboardChoiceGroup>
    <Tabs.Content value="character">
      <CharacterSummary host={host} session={session} dispatch={dispatch} />
    </Tabs.Content>
    <Tabs.Content value="stats">
      <DungeonCard>
        <Text className="text-accent" style={styles.heading}>{session.characterName ?? 'Warden'} · Stats</Text>
        <CharacterStatsDetails host={host} session={session} />
      </DungeonCard>
    </Tabs.Content>
    <Tabs.Content value="inventory">
      <InventoryContent host={host} session={session} />
    </Tabs.Content>
  </Tabs>;
}

function CharacterSummary({ host, session, dispatch }: {
  host: JourneyHost; session: JourneySession; dispatch(command: GameCommand): boolean;
}) {
  const { state } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const stats = heroStats(state.hero, session.content, state.dungeon?.effects);
  const name = session.characterName ?? 'Warden';
  return <DungeonCard>
    <Text className="text-accent" style={styles.heading}>{name} · Level {state.hero.level}</Text>
    <ResourceBar label="HP" value={state.hero.health} max={stats.maxHealth} name={name} />
    <ResourceBar label="Mana" value={state.hero.mana} max={stats.maxMana} name={name} />
    <ResourceBar label="Stamina" value={state.hero.stamina} max={stats.maxStamina} name={name} />
    <Text className="text-muted" style={styles.body}>{state.hero.gold} gold</Text>
    <Text className="text-muted" style={styles.body}>Damage {stats.combatant.minDamage}–{stats.combatant.maxDamage} · Defense {stats.combatant.defense} · Speed {stats.combatant.speed}</Text>
    <Text className="text-muted" style={styles.body}>{state.hero.level < 99 ? `${state.hero.experience}/${experienceToNextLevel(state.hero.level)} XP to next level` : 'Maximum level'}</Text>
    <Text className="text-muted" style={styles.body}>{state.hero.wounds} wounds · {state.hero.fullness.toFixed(1)}% fullness</Text>
    <DungeonButton label="Rest · recover stamina" disabled={hosted.busy} onPress={() => dispatch({ type: 'REST', entityId: 'player' })} />
  </DungeonCard>;
}

const styles = StyleSheet.create({
  body: { fontSize: 12, lineHeight: 20 },
  heading: { fontSize: 17, fontWeight: '600' },
});
