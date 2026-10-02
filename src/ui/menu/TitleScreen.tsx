import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MenuButton, MenuPage, menu } from './MenuUI';

export default function TitleScreen() {
  return (
    <MenuPage>
      <Text className="text-accent" style={menu.eyebrow}>
        A NEW LIFE BEYOND THE DARK
      </Text>
      <View style={styles.hero}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.gate}
        >
          <View style={styles.innerGate}>
            <Text style={styles.ember}>✦</Text>
            <View style={styles.path} />
          </View>
        </View>
        <Text
          className="text-foreground"
          accessibilityRole="header"
          style={[menu.title, styles.title]}
        >
          Rebirth{'\n'}Dungeon
        </Text>
        <View style={styles.rule} />
        <Text className="text-muted" style={[menu.body, styles.subtitle]}>
          Every journey begins with a name.
        </Text>
      </View>
      <MenuButton label="Play" onPress={() => router.navigate('/characters')} />
      <Text style={styles.footer}>THE EMBER WAITS FOR YOU</Text>
    </MenuPage>
  );
}
const styles = StyleSheet.create({
  hero: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
    paddingVertical: 36,
  },
  gate: {
    width: 156,
    height: 182,
    borderWidth: 8,
    borderColor: '#344044',
    borderTopLeftRadius: 78,
    borderTopRightRadius: 78,
    padding: 10,
    marginBottom: 10,
  },
  innerGate: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8d7855',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ember: { color: '#d0b987', fontSize: 54 },
  path: { height: 24, width: 1, backgroundColor: '#8d7855' },
  title: { fontSize: 48, lineHeight: 54, textAlign: 'center' },
  rule: { height: 1, width: 48, backgroundColor: '#8d7855' },
  subtitle: { textAlign: 'center' },
  footer: {
    color: '#82908c',
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 2,
    paddingVertical: 12,
  },
});
