import { useSyncExternalStore } from 'react';
import FeatureGate from '../shared/FeatureGate';
import { heroFeatures } from '../../game/FeatureReads';
import { gameHref } from '../navigation/gameHref';
import { router } from 'expo-router';
import { Text } from 'react-native';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { objectiveProgress, questStage } from '../../engine/rpg/Quests';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';

function QuestTrackerLoaded({ session }: { session: JourneySession }) {
  const { profile } = useCharacterGame();
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hero = heroFeatures(session, ['quests', 'skills', 'inventory', 'equipment'], view);
  const available = Object.values(hero.quests).filter((q) => q.status === 'available').length;
  const active = session.content.data.quests.filter((q) => hero.quests[q.id]?.status === 'active');
  const objectiveCount = active.reduce(
    (sum, q) => sum + (questStage(hero, q)?.objectives.length ?? 0),
    0,
  );
  return (
    <DungeonCard>
      <Text className="text-accent" style={menu.heading}>
        Quest tracker
      </Text>
      {hero.trackedObjectives.map((t) => {
        const quest = active.find((q) => q.id === t.questId)!,
          o = questStage(hero, quest)!.objectives.find((o) => o.id === t.objectiveId)!;
        return (
          <Text key={`${t.questId}/${t.objectiveId}`} className="text-foreground" style={menu.body}>
            {quest.name} · {o.label} · {objectiveProgress(hero, quest, o)}/{o.target}
          </Text>
        );
      })}
      {!hero.trackedObjectives.length ? (
        <Text className="text-muted" style={menu.body}>
          Choose up to three objectives in the journal.
        </Text>
      ) : null}
      <DungeonButton
        label={`Quest journal · More${Math.max(0, objectiveCount - hero.trackedObjectives.length) ? ` (${objectiveCount - hero.trackedObjectives.length})` : ''}`}
        detail={`${active.length} active quests · ${available} available`}
        onPress={() => router.navigate(gameHref(profile.id, 'quests'))}
      />
    </DungeonCard>
  );
}

export default function QuestTracker(props: Parameters<typeof QuestTrackerLoaded>[0]) {
  return (
    <FeatureGate session={props.session} features={['quests', 'skills', 'inventory', 'equipment']}>
      <QuestTrackerLoaded {...props} />
    </FeatureGate>
  );
}
