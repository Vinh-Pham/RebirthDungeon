/**
 * React Native HUD for the run: turn indicator, message line from the latest
 * events, the accessible D-pad (with Wait), and the presentation diagnostics
 * from the rendering baseline. Everything interactive is a native view so it
 * stays screen-reader reachable and out of the pixel canvas.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DIRECTIONS, type Direction } from '@/presentation/run/input-map';

export interface RunHudProps {
  turn: number;
  awaitingInput: boolean;
  message: string | null;
  heroHp: { current: number; max: number } | null;
  fps: number;
  worstFrameMs: number;
  zoom: number;
  onMove(direction: Direction): void;
  onWait(): void;
  onShake(): void;
  onCycleZoom(): void;
}

export function RunHud({
  turn,
  awaitingInput,
  message,
  heroHp,
  fps,
  worstFrameMs,
  zoom,
  onMove,
  onWait,
  onShake,
  onCycleZoom,
}: RunHudProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View
        style={[styles.stats, { top: insets.top + 8, right: insets.right + 8 }]}
        accessible
        accessibilityLabel={`Presentation: ${Math.round(fps)} frames per second, worst frame ${worstFrameMs.toFixed(1)} milliseconds, zoom times ${zoom}`}
      >
        <Text style={styles.statsText}>
          {Math.round(fps)} fps · {worstFrameMs.toFixed(1)} ms
        </Text>
        <Text style={styles.statsText}>×{zoom}</Text>
      </View>

      <View
        style={[styles.status, { top: insets.top + 8, left: insets.left + 8 }]}
        accessible
        accessibilityLabel={
          awaitingInput
            ? `Turn ${turn}. Your move.${heroHp ? ` Health ${heroHp.current} of ${heroHp.max}.` : ''}`
            : `Turn ${turn}. Resolving.`
        }
      >
        <Text style={styles.statusText}>
          {awaitingInput ? 'Your move' : '…'}
        </Text>
        {heroHp ? (
          <Text style={styles.statusSub}>
            HP {heroHp.current}/{heroHp.max} · T{turn}
          </Text>
        ) : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}
      </View>

      <View style={[styles.controls, { marginBottom: insets.bottom + 12 }]}>
        <View style={styles.dpad}>
          <DpadButton
            label="▲"
            accessibilityLabel="Move up"
            onPress={() => onMove(DIRECTIONS.up)}
          />
          <View style={styles.dpadMiddleRow}>
            <DpadButton
              label="◀"
              accessibilityLabel="Move left"
              onPress={() => onMove(DIRECTIONS.left)}
            />
            <DpadButton
              label="•"
              accessibilityLabel="Wait one turn"
              onPress={onWait}
            />
            <DpadButton
              label="▶"
              accessibilityLabel="Move right"
              onPress={() => onMove(DIRECTIONS.right)}
            />
          </View>
          <DpadButton
            label="▼"
            accessibilityLabel="Move down"
            onPress={() => onMove(DIRECTIONS.down)}
          />
        </View>

        <View style={styles.sideButtons}>
          <HudButton label="Shake" onPress={onShake} />
          <HudButton label={`Zoom ×${zoom}`} onPress={onCycleZoom} />
        </View>
      </View>
    </View>
  );
}

function DpadButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dpadButton,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.dpadText}>{label}</Text>
    </Pressable>
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
    alignItems: 'flex-end',
  },
  statsText: {
    color: '#9fe08f',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  status: {
    position: 'absolute',
    backgroundColor: 'rgba(8, 10, 14, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 220,
  },
  statusText: {
    color: '#e8e6e3',
    fontSize: 13,
    fontWeight: '700',
  },
  statusSub: {
    color: '#9aa3b2',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  messageText: {
    color: '#c9b458',
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
  },
  dpad: {
    alignItems: 'center',
    gap: 4,
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dpadButton: {
    width: 52,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3f4a',
    backgroundColor: 'rgba(8, 10, 14, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadText: {
    color: '#e8e6e3',
    fontSize: 16,
    fontWeight: '700',
  },
  sideButtons: {
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
