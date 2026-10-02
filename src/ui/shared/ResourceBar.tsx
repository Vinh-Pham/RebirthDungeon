import { ProgressBar } from 'heroui-native-pro/progress-bar';
import { Platform, StyleSheet, View } from 'react-native';

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const resourceFill = { HP: 'bg-red-500', Mana: 'bg-blue-500', Stamina: 'bg-yellow-400', XP: 'bg-accent' };

interface ResourceBarProps {
  label: keyof typeof resourceFill;
  value: number;
  max: number;
  name: string;
}

export default function ResourceBar({ label, value, max, name }: ResourceBarProps) {
  return <ProgressBar value={value} maxValue={Math.max(1, max)} size="lg" className="gap-1"
    accessibilityLabel={`${name} ${label}`} accessibilityValue={{ min: 0, max, now: value, text: `${value} of ${max}` }}>
    <View style={styles.labels}>
      <ProgressBar.Label className="text-muted" style={styles.label}>{label}</ProgressBar.Label>
      <ProgressBar.ValueLabel className="text-foreground" style={styles.value}>{value} / {max}</ProgressBar.ValueLabel>
    </View>
    <ProgressBar.Track>
      <ProgressBar.Fill className={resourceFill[label]} />
    </ProgressBar.Track>
  </ProgressBar>;
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  label: { fontFamily: mono, fontSize: 10 }, value: { fontFamily: mono, fontSize: 11 },
});
