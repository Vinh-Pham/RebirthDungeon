import { gameHref } from '../navigation/gameHref';
import { router } from 'expo-router';
import { ProgressBar } from 'heroui-native-pro/progress-bar';
import { Tabs } from 'heroui-native/tabs';
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gameRank, rankUpReason, trainingPoints } from '../../engine/rpg/Skills';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { useCharacterGame } from '../menu/CharacterGameContext';
import GameImage from '../shared/GameImage';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import RestSkillUse from '../skills/RestSkillUse';
import ProgressionFeedback from '../skills/ProgressionFeedback';

export default function JourneySkills({ session }: { session: JourneySession }) {
  const { profile, host } = useCharacterGame();
  const [category, setCategory] = useState('life');
  const { state, map } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const hero = state.hero;
  const skills = session.content.data.skills.filter((skill) => !!hero.learnedSkills[skill.id]);
  const categorySkills = skills.filter((skill) => (skill.category ?? 'combat') === category);
  const town = !state.inEncounter && !state.dungeon && !!map.theme;

  return (
    <View className="gap-3">
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={styles.heading}>
          Learned skills
        </Text>
        <Text className="text-muted" style={styles.body}>
          {skills.length} learned · {hero.ap} AP available
        </Text>
        <Text className="text-muted" style={styles.body}>
          Combat skills train in battle; Enchant trains at the town blacksmith. Reach 100 training,
          then spend AP in town to rank up.
        </Text>
        <DungeonButton
          label="Open skills journal"
          onPress={() => router.navigate(gameHref(profile.id, 'skills'))}
        />
      </DungeonCard>
      <ProgressionFeedback host={host} showNotice={false} />
      <Tabs
        value={category}
        onValueChange={(next) => {
          host.recordLog('user', 'SKILL_FILTER', `Viewing ${next} skills.`);
          setCategory(next);
        }}
        className="w-full gap-3"
      >
        <KeyboardChoiceGroup itemRole="tab" value={category}>
          <Tabs.List
            accessibilityLabel="Skill categories"
            className="w-full border border-border bg-surface"
          >
            <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
            {(['Life', 'Combat', 'Magic'] as const).map((label) => (
              <Tabs.Trigger
                key={label}
                value={label.toLowerCase()}
                accessibilityLabel={label}
                className="min-h-12 flex-1"
              >
                <Tabs.Label className="text-xs">{label}</Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </KeyboardChoiceGroup>
        <Tabs.Content value={category} className="gap-3">
          {categorySkills.length === 0 ? (
            <DungeonCard>
              <Text className="text-muted" style={styles.body}>
                No {category} skills learned yet. Speak to an instructor or read a skill book to
                learn one.
              </Text>
            </DungeonCard>
          ) : null}
          {categorySkills.map((skill) => {
            const record = hero.learnedSkills[skill.id];
            const rank = gameRank(skill, record.rank);
            const points = trainingPoints(skill, record);
            const status =
              points < 100
                ? `Next: Rank ${rank.nextRank} · ${rank.apCost} AP`
                : (rankUpReason(hero, skill.id, session.content) ??
                  (town
                    ? `Ready to rank up to ${rank.nextRank}`
                    : 'Training complete · Return to town to rank up'));

            return (
              <DungeonCard key={skill.id}>
                <View style={styles.row}>
                  <GameImage kind="skill" id={skill.id} />
                  <Text
                    className="text-foreground"
                    accessibilityRole="header"
                    style={styles.skillName}
                  >
                    {skill.name}
                  </Text>
                  <Text
                    className="rounded-md bg-surface-tertiary px-3 py-1 text-accent"
                    style={styles.rank}
                  >
                    Rank {record.rank}
                  </Text>
                </View>
                <Text className="text-muted capitalize" style={styles.body}>
                  {skill.category ?? 'combat'} · {skill.kind ?? 'active'}
                </Text>
                {skill.id === 'rest' ? <RestSkillUse host={host} session={session} /> : null}
                {rank.objectives.length ? (
                  <>
                    <ProgressBar
                      value={Math.min(points, 100)}
                      maxValue={100}
                      size="sm"
                      className="gap-2"
                      accessibilityLabel={`${skill.name} training`}
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: Math.min(points, 100),
                        text: `${points} of 100 training points`,
                      }}
                    >
                      <View style={styles.row}>
                        <ProgressBar.Label className="text-muted" style={styles.body}>
                          Training
                        </ProgressBar.Label>
                        <ProgressBar.ValueLabel className="text-foreground" style={styles.body}>
                          {points} / 100
                        </ProgressBar.ValueLabel>
                      </View>
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                    <Text
                      className={points >= 100 ? 'text-accent' : 'text-muted'}
                      style={styles.body}
                    >
                      {status}
                    </Text>
                    {rank.objectives.map((objective) => (
                      <View key={objective.id} style={styles.row}>
                        <Text className="text-muted" style={styles.objective}>
                          {objective.label}
                        </Text>
                        <Text className="text-foreground" style={styles.body}>
                          {record.objectiveCounts[objective.id] ?? 0} / {objective.maximum}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text className="text-muted" style={styles.body}>
                    {record.rank === '1'
                      ? 'Maximum rank reached.'
                      : `Current rank cap: ${record.rank}. Further training is not available yet.`}
                  </Text>
                )}
              </DungeonCard>
            );
          })}
        </Tabs.Content>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 12, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillName: { flex: 1, fontSize: 16, fontWeight: '600' },
  rank: { fontSize: 12, fontWeight: '600' },
  objective: { flex: 1, fontSize: 12, lineHeight: 20 },
});
