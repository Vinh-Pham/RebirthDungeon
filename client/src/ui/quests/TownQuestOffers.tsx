import { gameHref } from '../navigation/gameHref';
import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import type { ProgressionCommand } from '../../engine/commands';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';
import QuestDetails from './QuestDetails';
import { questStatus } from './questLabels';

export default function TownQuestOffers({
  session,
  objectId,
  busy,
  progress,
}: {
  session: JourneySession;
  objectId: string;
  busy: boolean;
  progress(command: ProgressionCommand): void;
}) {
  const { profile } = useCharacterGame();
  const [selectedId, setSelectedId] = useState<string>();
  const { state } = session.getSnapshot();
  const quests = session.content.data.quests.filter(
    (q) =>
      state.hero.quests[q.id] &&
      [q.offerNpc, q.claimNpc].some((n) => n?.objectId === objectId && n.worldId === state.worldId),
  );
  const selected = quests.find((q) => q.id === selectedId);
  if (!quests.length) return null;
  return (
    <View className="gap-3">
      <Text className="text-accent" style={menu.heading}>
        Quests
      </Text>
      {selected ? (
        <DungeonCard>
          <DungeonButton label="Back to NPC quests" onPress={() => setSelectedId(undefined)} />
          <QuestDetails
            key={selected.id}
            session={session}
            quest={selected}
            busy={busy}
            progress={progress}
          />
        </DungeonCard>
      ) : (
        quests.map((q) => (
          <DungeonButton
            key={q.id}
            label={q.name}
            detail={questStatus(state.hero, q)}
            onPress={() => setSelectedId(q.id)}
          />
        ))
      )}
      <DungeonButton
        label="Open quest journal"
        onPress={() => router.navigate(gameHref(profile.id, 'quests'))}
      />
    </View>
  );
}
