import { ProgressBar } from 'heroui-native-pro/progress-bar';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const resourceFill = {
  HP: 'bg-red-500',
  Mana: 'bg-blue-500',
  Stamina: 'bg-yellow-400',
  XP: 'bg-sky-300',
};

interface ResourceBarProps {
  label: keyof typeof resourceFill;
  value: number;
  max: number;
  name: string;
  variant?: 'default' | 'compact';
  valueText?: string;
  trailingText?: string;
  accessibleText?: string;
}

export default function ResourceBar({
  label,
  value,
  max,
  name,
  variant = 'default',
  valueText,
  trailingText,
  accessibleText,
}: ResourceBarProps) {
  const compact = variant === 'compact';
  const experienceTrack = compact && label === 'XP';
  const { fontScale } = useWindowDimensions();
  return (
    <ProgressBar
      value={value}
      maxValue={Math.max(1, max)}
      size={compact ? 'sm' : 'lg'}
      className="gap-1"
      accessibilityLabel={`${name} ${label}`}
      accessibilityValue={{ min: 0, max, now: value, text: accessibleText ?? `${value} of ${max}` }}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={accessibleText ?? `${value} of ${max}`}
    >
      {compact ? null : (
        <View style={styles.labels}>
          <ProgressBar.Label className="text-muted" style={styles.label}>
            {label}
          </ProgressBar.Label>
          <ProgressBar.ValueLabel className="text-foreground" style={styles.value}>
            {valueText ?? `${value} / ${max}`}
          </ProgressBar.ValueLabel>
        </View>
      )}
      <ProgressBar.Track
        style={
          compact
            ? { minHeight: (experienceTrack ? 8 : 10) * fontScale, borderRadius: 4 }
            : undefined
        }
      >
        <ProgressBar.Fill className={resourceFill[label]} />
        {compact ? (
          <View
            style={[styles.trackLabel, !experienceTrack && styles.resourceLabel]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text
              className={
                experienceTrack ? 'rounded-sm bg-background/80 px-1 text-foreground' : undefined
              }
              style={experienceTrack ? styles.value : styles.resourceValue}
            >
              {valueText ?? `${value} / ${max}`}
            </Text>
            {!experienceTrack && trailingText ? (
              <Text style={[styles.resourceValue, styles.trailingValue]}>{trailingText}</Text>
            ) : null}
          </View>
        ) : null}
      </ProgressBar.Track>
    </ProgressBar>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  label: { fontFamily: mono, fontSize: 10 },
  value: { fontFamily: mono, fontSize: 11 },
  resourceValue: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 14,
    color: '#ffffff',
    textShadowColor: '#101719',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resourceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  trailingValue: { textAlign: 'right' },
  trackLabel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
