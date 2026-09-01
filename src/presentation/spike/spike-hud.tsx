/**
 * React Native HUD layered over the Skia canvas. Everything interactive or
 * textual lives in native views so it stays accessible (labels, roles, screen
 * readers) and out of the pixel-perfect world.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SpikeHudProps {
  fps: number;
  worstFrameMs: number;
  zoom: number;
  followMonster: boolean;
  onShake(): void;
  onCycleZoom(): void;
  onToggleFollow(): void;
}

export function SpikeHud({
  fps,
  worstFrameMs,
  zoom,
  followMonster,
  onShake,
  onCycleZoom,
  onToggleFollow,
}: SpikeHudProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View
        style={[styles.stats, { top: insets.top + 8, right: insets.right + 8 }]}
        accessible
        accessibilityLabel={`Presentation: ${Math.round(fps)} frames per second, worst frame ${worstFrameMs.toFixed(1)} milliseconds`}
      >
        <Text style={styles.statsText}>
          {Math.round(fps)} fps · {worstFrameMs.toFixed(1)} ms
        </Text>
      </View>
      <View style={[styles.buttonRow, { marginBottom: insets.bottom + 12 }]}>
        <HudButton label="Shake" onPress={onShake} />
        <HudButton label={`Zoom ×${zoom}`} onPress={onCycleZoom} />
        <HudButton
          label={followMonster ? 'Follow: slime' : 'Follow: hero'}
          onPress={onToggleFollow}
        />
      </View>
    </View>
  );
}

function HudButton({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stats: {
    position: 'absolute',
    backgroundColor: 'rgba(8, 10, 14, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsText: {
    color: '#9fe08f',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  button: {
    backgroundColor: 'rgba(8, 10, 14, 0.8)',
    borderColor: '#3a3f4a',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonPressed: {
    backgroundColor: 'rgba(38, 44, 56, 0.9)',
  },
  buttonText: {
    color: '#e8e6e3',
    fontSize: 14,
    fontWeight: '600',
  },
});
