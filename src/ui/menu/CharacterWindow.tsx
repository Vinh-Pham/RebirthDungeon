import { router } from 'expo-router';
import { useRef, useSyncExternalStore, type RefObject } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { JourneyHost } from '../../game/JourneyHost';
import type { CompleteCharacter } from '../../persistence/CharacterProfile';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import { menu } from './MenuUI';
import { DungeonButton } from '../shared/DungeonUI';
import CharacterStatsOverlay from './CharacterStatsOverlay';
import CharacterStatsDetails from '../shared/CharacterStatsDetails';

/** Read-only subscriptions keep battle resources live without touching a campaign checkpoint. */
export function CharacterWindow({
  host,
  profile,
  isOpen,
  close,
}: {
  host: JourneyHost;
  profile: CompleteCharacter;
  isOpen: boolean;
  close(): void;
}) {
  const closeRef = useRef<View>(null);
  return (
    <CharacterStatsOverlay isOpen={isOpen} close={close} initialFocus={closeRef}>
      <CharacterStatsContent host={host} profile={profile} close={close} closeRef={closeRef} />
    </CharacterStatsOverlay>
  );
}
function CharacterStatsContent({
  host,
  profile,
  close,
  closeRef,
}: {
  host: JourneyHost;
  profile: CompleteCharacter;
  close(): void;
  closeRef: RefObject<View | null>;
}) {
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const journey = hosted.session!;
  const campaign = useSyncExternalStore(
    journey.subscribe,
    journey.getSnapshot,
    journey.getSnapshot,
  );
  const hero = campaign.state.hero;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="border-border" style={styles.header}>
        <View style={styles.label}>
          <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
            Character
          </Text>
          <Text className="text-muted" style={styles.note}>
            {profile.name} · {TALENT_LABELS[hero.growthTalent]} · Level {hero.level} · Age{' '}
            {profile.age}
          </Text>
        </View>
        <DungeonButton
          ref={closeRef}
          label="Close"
          accessibilityLabel="Close character stats"
          onPress={close}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <CharacterStatsDetails host={host} session={journey} profile={profile} />
        <DungeonButton
          label="Title collection"
          onPress={() => {
            close();
            router.navigate({
              pathname: '/game/[characterId]/titles',
              params: { characterId: profile.id },
            });
          }}
        />
        <DungeonButton
          label="Skills"
          onPress={() => {
            close();
            router.navigate({
              pathname: '/game/[characterId]/skills',
              params: { characterId: profile.id },
            });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  label: { flex: 1, gap: 4 },
  content: { padding: 20 },
  note: { fontSize: 12, lineHeight: 19 },
});
