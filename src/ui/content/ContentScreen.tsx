import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadGameContent } from '../../data/content';

const content = loadGameContent().data;
const targetNames = { self: 'Self', ally: 'One ally', enemy: 'One enemy', allEnemies: 'All enemies' };

export default function ContentScreen() {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>KNOW WHAT WAITS BELOW</Text>
        <Text style={styles.title}>Dungeon codex</Text>
        <Text style={styles.intro}>A warden’s notes on the creatures and powers of the deep.</Text>
        <Text style={styles.section}>Wardens</Text>
        {content.classes.map((entry) => <View key={entry.id} style={styles.row}>
          <Text style={styles.name}>{entry.name}</Text>
          <Text style={styles.detail}>{entry.maxHealth} HP · {entry.maxMana} mana · {entry.combatant.attack} attack</Text>
        </View>)}
        <Text style={styles.section}>Creatures</Text>
        {content.enemies.map((entry) => <View key={entry.id} style={styles.row}>
          <Text style={styles.name}>{entry.name}</Text>
          <Text style={styles.detail}>{entry.maxHealth} HP · {entry.combatant.attack} attack · {entry.combatant.defense} defense</Text>
        </View>)}
        <Text style={styles.section}>Skills</Text>
        {content.skills.map((entry) => <View key={entry.id} style={styles.row}>
          <Text style={styles.name}>{entry.name}</Text>
          <Text style={styles.detail}>{entry.description ?? `${entry.manaCost} mana · ${targetNames[entry.target]} · ${entry.power} ${entry.effect === 'heal' ? 'healing' : 'power'}`}</Text>
          {entry.reference && <Text style={styles.detail}>Rank {entry.rank} · {entry.category} · {entry.kind}{entry.battleUsable === false ? ' · Unavailable in battle' : ''}</Text>}
        </View>)}
        <Text style={styles.section}>Relics & remedies</Text>
        {content.items.map((entry) => <View key={entry.id} style={styles.row}>
          <Text style={styles.name}>{entry.name}</Text><Text style={styles.detail}>{entry.description}</Text>
        </View>)}
        <Text style={styles.section}>Afflictions</Text>
        {content.statusEffects.map((entry) => <View key={entry.id} style={styles.row}>
          <Text style={styles.name}>{entry.name}</Text><Text style={styles.detail}>{entry.duration} turns · {entry.power} {entry.effect} each turn</Text>
        </View>)}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10161c' },
  scroll: { alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'web' ? 110 : 24, paddingBottom: 110 },
  content: { width: '100%', maxWidth: 560, gap: 12 },
  eyebrow: { color: '#a79474', fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', color: '#e4d9c5', fontSize: 36 },
  intro: { color: '#83949a', fontSize: 13, lineHeight: 21, marginBottom: 12 },
  section: { color: '#cfb68b', fontSize: 18, marginTop: 16 },
  row: { borderBottomWidth: 1, borderBottomColor: '#27343b', paddingVertical: 12, gap: 6 },
  name: { color: '#d8d9cd', fontSize: 14, fontWeight: '600' },
  detail: { color: '#7d949a', fontSize: 12, lineHeight: 20 },
});
