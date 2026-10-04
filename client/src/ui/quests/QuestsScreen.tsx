import FeatureGate from '../shared/FeatureGate';
import { heroFeatures } from '../../game/FeatureReads';
import { useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import type { QuestDefinition } from '../../data/schemas/quests';
import type { GameplayHost as JourneyHost } from '../../game/Gameplay';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { MenuPage, menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import ProgressionFeedback from '../skills/ProgressionFeedback';
import QuestDetails from './QuestDetails';
import { categoryLabel, questStatus } from './questLabels';

export default function QuestsScreen() {
  const { host } = useCharacterGame();
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  return hosted.session ? (
    <QuestJournal host={host} session={hosted.session} />
  ) : (
    <MenuPage>
      <DungeonLoading label="Loading quests" />
    </MenuPage>
  );
}
function QuestJournalLoaded({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const [category, setCategory] = useState<'all' | QuestDefinition['category']>('all');
  const [selectedId, setSelectedId] = useState<string>();
  const hero = heroFeatures(
      session,
      ['quests', 'skills', 'inventory', 'equipment', 'titles'],
      view,
    ),
    content = session.content;
  const selected = content.data.quests.find((q) => q.id === selectedId);
  const readOnly = !!hosted.battle || !!view.state.inEncounter;
  return (
    <MenuPage>
      {selected ? (
        <>
          <DungeonButton
            label="Back to quests"
            onPress={() => {
              host.recordLog('user', 'QUEST_DETAILS', 'Returned to quests.');
              setSelectedId(undefined);
            }}
          />
          <QuestDetails
            key={selected.id}
            session={session}
            quest={selected}
            busy={hosted.busy || !!hosted.retryAvailable}
            readOnly={readOnly}
            progress={(command) => {
              void host.progress(command);
            }}
          />
        </>
      ) : (
        <>
          <Text className="text-foreground" accessibilityRole="header" style={menu.title}>
            Quests
          </Text>
          <Text className="text-muted" style={menu.body}>
            Accept a story or town request, follow its stages, then claim the rewards in town.
            Opening this journal uses no turn.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(['all', 'mainstream', 'sidequest', 'skill'] as const).map((value) => (
              <DungeonButton
                key={value}
                label={value === 'all' ? 'All' : categoryLabel[value]}
                selected={category === value}
                onPress={() => {
                  host.recordLog('user', 'QUEST_FILTER', `Viewing ${value} quests.`);
                  setCategory(value);
                }}
              />
            ))}
          </View>
          {content.data.quests
            .filter((q) => category === 'all' || q.category === category)
            .map((q) => (
              <DungeonButton
                key={q.id}
                label={q.name}
                detail={`${categoryLabel[q.category]} · ${questStatus(hero, q)}`}
                onPress={() => {
                  host.recordLog('user', 'QUEST_DETAILS', `Opened ${q.name} details.`);
                  setSelectedId(q.id);
                }}
              />
            ))}
          {hero.earnedTitles.length ? (
            <DungeonCard>
              <Text className="text-accent" style={menu.heading}>
                Earned titles
              </Text>
              {hero.earnedTitles.map((id) => {
                const title = content.data.titles.find((t) => t.id === id);
                return (
                  <View key={id} className="gap-1">
                    <Text className="text-foreground" style={menu.body}>
                      {title?.name ?? 'Unavailable earned title'}
                    </Text>
                    <Text className="text-muted" style={menu.body}>
                      {title?.description ?? 'Achievement preserved; effects disabled.'}
                    </Text>
                  </View>
                );
              })}
            </DungeonCard>
          ) : null}
        </>
      )}
      {readOnly ? (
        <DungeonNotice
          status="accent"
          message="Quest journal is read-only during encounters. Practice progress is saved after the encounter finishes."
        />
      ) : null}
      <ProgressionFeedback host={host} />
    </MenuPage>
  );
}

function QuestJournal(props: Parameters<typeof QuestJournalLoaded>[0]) {
  return (
    <FeatureGate
      session={props.session}
      features={['quests', 'skills', 'inventory', 'equipment', 'titles']}
    >
      <QuestJournalLoaded {...props} />
    </FeatureGate>
  );
}
