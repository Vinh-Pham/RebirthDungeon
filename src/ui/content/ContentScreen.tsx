import GameImage from '../shared/GameImage';
import { starterProgression } from '../../engine/rpg/Skills';
import { DungeonCard } from '../shared/DungeonUI';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateCharacterStats } from '../../engine/rpg/Stats';
import { loadGameContent } from '../../data/content';

const registry = loadGameContent();
const content = registry.data;
const targetNames = {
  self: 'Self',
  ally: 'One ally',
  enemy: 'One enemy',
  allEnemies: 'All enemies',
};

export default function ContentScreen() {
  return (
    <SafeAreaView
      className="bg-background"
      edges={['bottom', 'left', 'right']}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text className="text-accent" style={styles.eyebrow}>
            KNOW WHAT WAITS BELOW
          </Text>
          <Text className="text-foreground" style={styles.title}>
            Dungeon codex
          </Text>
          <Text className="text-muted" style={styles.intro}>
            A warden’s notes on the creatures and powers of the deep.
          </Text>
          <Text className="text-accent" style={styles.section}>
            Wardens
          </Text>
          {content.classes.map((entry) => {
            const stats = calculateCharacterStats(
              {
                classId: entry.id,
                learnedSkills: starterProgression(entry.id, registry).learnedSkills,
                level: 1,
                growthTalent: 'warrior',
                effects: [],
              },
              registry,
            );
            return (
              <DungeonCard key={entry.id}>
                <Text className="text-foreground" style={styles.name}>
                  {entry.name}
                </Text>
                <Text className="text-muted" style={styles.detail}>
                  {stats.maxHealth} HP · {stats.maxMana} mana · {stats.maxStamina} stamina before
                  talent resource bonuses. Talent and known skills determine your attributes; review
                  Stats for your character.
                </Text>
              </DungeonCard>
            );
          })}
          <Text className="text-accent" style={styles.section}>
            Creatures
          </Text>
          {content.enemies.map((entry) => (
            <DungeonCard key={entry.id}>
              <Text className="text-foreground" style={styles.name}>
                {entry.name}
              </Text>
              <Text className="text-muted" style={styles.detail}>
                {entry.maxHealth} HP · {entry.combatant.minDamage ?? entry.combatant.attack}–
                {entry.combatant.maxDamage ?? entry.combatant.attack} damage ·{' '}
                {entry.combatant.defense} defense
              </Text>
            </DungeonCard>
          ))}
          <Text className="text-accent" style={styles.section}>
            Skills
          </Text>
          {content.skills.map((entry) => (
            <DungeonCard key={entry.id}>
              <View className="flex-row items-center gap-3">
                <GameImage kind="skill" id={entry.id} />
                <Text className="min-w-0 flex-1 text-foreground" style={styles.name}>
                  {entry.name}
                </Text>
              </View>
              <Text className="text-muted" style={styles.detail}>
                {entry.description ??
                  `${entry.manaCost} mana · ${targetNames[entry.target]} · ${entry.power} ${entry.effect === 'heal' ? 'healing' : 'power'}`}
              </Text>
              {entry.minPower !== undefined ? (
                <Text className="text-muted" style={styles.detail}>
                  {entry.minPower}–{entry.maxPower} base{' '}
                  {entry.effect === 'heal' ? 'healing' : 'damage'} · {entry.manaCost} MP
                  {entry.staminaCost ? ` · ${entry.staminaCost} SP when self-targeted` : ''}
                </Text>
              ) : null}
              {entry.reference && (
                <Text className="text-muted" style={styles.detail}>
                  Rank {entry.rank} · {entry.category} · {entry.kind}
                  {entry.battleUsable === false ? ' · Unavailable in battle' : ''}
                </Text>
              )}
            </DungeonCard>
          ))}
          <Text className="text-accent" style={styles.section}>
            Relics & remedies
          </Text>
          {content.items.map((entry) => (
            <DungeonCard key={entry.id}>
              <View className="flex-row items-center gap-3">
                <GameImage kind="item" id={entry.id} />
                <Text className="min-w-0 flex-1 text-foreground" style={styles.name}>
                  {entry.name}
                </Text>
              </View>
              <Text className="text-muted" style={styles.detail}>
                {entry.description}
              </Text>
            </DungeonCard>
          ))}
          <Text className="text-accent" style={styles.section}>
            Afflictions
          </Text>
          {content.statusEffects.map((entry) => (
            <DungeonCard key={entry.id}>
              <Text className="text-foreground" style={styles.name}>
                {entry.name}
              </Text>
              <Text className="text-muted" style={styles.detail}>
                {entry.duration} turns ·{' '}
                {entry.effect === 'stat'
                  ? `${entry.modifier >= 0 ? '+' : ''}${entry.modifier} ${entry.stat}`
                  : `${entry.power} ${entry.effect} each turn`}
              </Text>
            </DungeonCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { alignItems: 'center', padding: 20, paddingTop: 12, paddingBottom: 24 },
  content: { width: '100%', maxWidth: 560, gap: 12 },
  eyebrow: { fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 36 },
  intro: { fontSize: 13, lineHeight: 21, marginBottom: 12 },
  section: { fontSize: 18, marginTop: 16 },
  name: { fontSize: 14, fontWeight: '600' },
  detail: { fontSize: 12, lineHeight: 20 },
});
