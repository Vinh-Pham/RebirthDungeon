import { StyleSheet, Text, View } from 'react-native';

/**
 * Temporary bootstrap screen for Phase 0.
 * Real home/dungeon-selection presentation arrives with later phases.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rebirth Dungeon</Text>
      <Text style={styles.subtitle}>Project bootstrap OK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0d12',
    gap: 8,
  },
  title: {
    color: '#e8e6e3',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#8a8f98',
    fontSize: 14,
  },
});
