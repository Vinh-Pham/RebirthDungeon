import { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { Surface } from 'heroui-native/surface';
import type { BattleSession } from '../../game/BattleSession';

export default function BattleDebugInformation({ session }: { session: BattleSession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const presentation = useSyncExternalStore(
    session.presentation.subscribe,
    session.presentation.getSnapshot,
    session.presentation.getSnapshot,
  );
  return (
    <Surface className="gap-1 rounded-xl bg-surface-secondary p-4">
      <Text className="text-muted" style={styles.text}>
        Seed {session.engine.seed} · {view.phase}
      </Text>
      <Text className="text-muted" style={styles.text}>
        Entities {session.engine.world.entities.length} · Turn {view.turnId ?? 'complete'}
      </Text>
      <Text className="text-muted" style={styles.text}>
        Order {session.combat.turnOrder.join(' → ')} · Visual queue {presentation.pending}
      </Text>
      {view.entities.map((entity) => (
        <Text className="text-muted" key={entity.id} style={styles.text}>
          {entity.id} ({entity.x}, {entity.y}) · {entity.sprite.atlas}:{entity.sprite.frame}
        </Text>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, lineHeight: 18 },
});
