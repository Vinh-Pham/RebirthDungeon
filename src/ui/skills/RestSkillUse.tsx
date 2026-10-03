import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { heroStats } from '../../engine/rpg/Character';
import { REST_STAMINA_RECOVERY } from '../../engine/rpg/Resources';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import { DungeonButton } from '../shared/DungeonUI';

export default function RestSkillUse({
  host,
  session,
}: {
  host: JourneyHost;
  session: JourneySession;
}) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const reason =
    hosted.battle || view.state.pending
      ? 'Use Rest from the Combat hotbar during battle.'
      : view.activeService
        ? 'Close the town service before resting.'
        : !view.state.hero.learnedSkills.rest
          ? 'Learn Rest first.'
          : hosted.retryAvailable
            ? 'Retry the pending save before resting again.'
            : undefined;
  const stats = heroStats(view.state.hero, session.content, view.state.dungeon?.effects);
  return (
    <View className="gap-2">
      {!hosted.battle && !view.state.pending ? (
        <Text className="text-muted text-xs leading-5">
          Stamina {view.state.hero.stamina} / {stats.maxStamina} · Recover up to{' '}
          {REST_STAMINA_RECOVERY} each second while resting, limited by fullness.
        </Text>
      ) : null}
      {view.resting ? (
        <Text className="text-accent text-xs leading-5">Resting · Stop before moving.</Text>
      ) : null}
      {reason && !view.resting ? (
        <Text className="text-muted text-xs leading-5">{reason}</Text>
      ) : null}
      <DungeonButton
        label={view.resting ? 'Stop' : 'Use'}
        accessibilityLabel={view.resting ? 'Stop resting' : 'Use Rest to recover stamina'}
        disabled={!view.resting && (!!reason || hosted.busy)}
        busy={!view.resting && hosted.busy}
        onPress={() => {
          host.toggleRest();
        }}
      />
    </View>
  );
}
