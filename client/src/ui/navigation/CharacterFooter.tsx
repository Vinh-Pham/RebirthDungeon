import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { DungeonButton } from '../shared/DungeonUI';
import ResourceBar from '../shared/ResourceBar';
import { useCharacterStatus } from '../shared/useCharacterStatus';
import { useAppNavigation, type ActiveGame } from './AppNavigationContext';

export default function CharacterFooter({ game }: { game?: ActiveGame }) {
  const navigation = useNavigation('/');
  const { menuTrigger } = useAppNavigation();
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="border-t border-border bg-surface">
      <View style={styles.bar}>
        <DungeonButton
          ref={menuTrigger}
          label="☰"
          accessibilityLabel="Open navigation menu"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-12 w-12 min-h-12 p-0"
        />
        {game ? (
          <HostedStatus game={game} />
        ) : (
          <Text className="flex-1 text-sm text-muted" accessibilityLabel="Loading character status">
            Loading character…
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function HostedStatus({ game }: { game: ActiveGame }) {
  const hosted = useSyncExternalStore(
    game.host.subscribe,
    game.host.getSnapshot,
    game.host.getServerSnapshot,
  );
  return hosted.session ? (
    <Status key={hosted.revision} game={game} session={hosted.session} />
  ) : (
    <Text className="flex-1 text-sm text-muted">Character status unavailable</Text>
  );
}

function Status({ game, session }: { game: ActiveGame; session: JourneySession }) {
  const { hero, review, experience } = useCharacterStatus(game.host, session);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const resourceWidth = Math.max(120, Math.min(220, (width - insets.left - insets.right - 24) / 3));
  const name = game.profile.name;
  const hunger = `${(100 - review.fullness).toFixed(1)}%`;
  return (
    <>
      <View style={[styles.resources, { width: resourceWidth }]}>
        <ResourceBar
          variant="compact"
          label="HP"
          name={name}
          value={review.health}
          max={review.stats.maxHealth}
        />
        <ResourceBar
          variant="compact"
          label="Mana"
          name={name}
          value={review.mana}
          max={review.stats.maxMana}
        />
        <ResourceBar
          variant="compact"
          label="Stamina"
          name={name}
          value={review.stamina}
          max={review.stats.maxStamina}
          trailingText={hunger}
          accessibleText={`${review.stamina} of ${review.stats.maxStamina}, ${hunger} hunger`}
        />
      </View>
      <View style={styles.experience}>
        <Text
          numberOfLines={1}
          className="text-accent"
          style={styles.name}
          accessibilityLabel={name}
        >
          {name}
        </Text>
        <Text className="text-muted" style={styles.level}>
          Level {hero.level}
        </Text>
        <ResourceBar
          variant="compact"
          label="XP"
          name={name}
          value={experience.value}
          max={experience.max}
          valueText={experience.text}
          accessibleText={experience.accessibleText}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 64,
  },
  resources: { flexShrink: 0, gap: 4 },
  experience: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 12, fontWeight: '600' },
  level: { fontSize: 11 },
});
