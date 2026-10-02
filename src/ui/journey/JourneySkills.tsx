import { router } from 'expo-router';
import { ProgressBar } from 'heroui-native-pro/progress-bar';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gameRank, rankUpReason, trainingPoints } from '../../engine/rpg/Skills';
import type { JourneySession } from '../../game/JourneySession';
import { useCharacterGame } from '../menu/CharacterGameContext';
import GameImage from '../shared/GameImage';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';

export default function JourneySkills({ session }: { session: JourneySession }) {
  const { profile } = useCharacterGame();
  const { state, map } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hero = state.hero;
  const skills = session.content.data.skills.filter((skill) => !!hero.learnedSkills[skill.id]);
  const town = !state.pending && !state.dungeon && !!map.theme;

  return <View className="gap-3">
    <DungeonCard>
      <Text className="text-accent" accessibilityRole="header" style={styles.heading}>Learned skills</Text>
      <Text className="text-muted" style={styles.body}>{skills.length} learned · {hero.ap} AP available</Text>
      <Text className="text-muted" style={styles.body}>Combat skills train in battle; Enchant trains at the town blacksmith. Reach 100 training, then spend AP in town to rank up.</Text>
      <DungeonButton label="Open skills journal" onPress={() => router.navigate({ pathname: '/game/[characterId]/skills', params: { characterId: profile.id } })} />
    </DungeonCard>
    {skills.length === 0 ? <DungeonCard>
      <Text className="text-muted" style={styles.body}>No skills learned yet. Speak to an instructor or read a skill book to learn your first skill.</Text>
    </DungeonCard> : null}
    {skills.map((skill) => {
      const record = hero.learnedSkills[skill.id];
      const rank = gameRank(skill, record.rank);
      const points = trainingPoints(skill, record);
      const status = points < 100 ? `Next: Rank ${rank.nextRank} · ${rank.apCost} AP`
        : rankUpReason(hero, skill.id, session.content) ?? (town ? `Ready to rank up to ${rank.nextRank}` : 'Training complete · Return to town to rank up');

      return <DungeonCard key={skill.id}>
        <View style={styles.row}>
          <GameImage kind="skill" id={skill.id} />
          <Text className="text-foreground" accessibilityRole="header" style={styles.skillName}>{skill.name}</Text>
          <Text className="rounded-md bg-surface-tertiary px-3 py-1 text-accent" style={styles.rank}>Rank {record.rank}</Text>
        </View>
        <Text className="text-muted capitalize" style={styles.body}>{skill.category ?? 'combat'} · {skill.kind ?? 'active'}</Text>
        {rank.objectives.length ? <>
          <ProgressBar value={Math.min(points, 100)} maxValue={100} size="sm" className="gap-2"
            accessibilityLabel={`${skill.name} training`} accessibilityValue={{ min: 0, max: 100, now: Math.min(points, 100), text: `${points} of 100 training points` }}>
            <View style={styles.row}>
              <ProgressBar.Label className="text-muted" style={styles.body}>Training</ProgressBar.Label>
              <ProgressBar.ValueLabel className="text-foreground" style={styles.body}>{points} / 100</ProgressBar.ValueLabel>
            </View>
            <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
          </ProgressBar>
          <Text className={points >= 100 ? 'text-accent' : 'text-muted'} style={styles.body}>{status}</Text>
          {rank.objectives.map((objective) => <View key={objective.id} style={styles.row}>
            <Text className="text-muted" style={styles.objective}>{objective.label}</Text>
            <Text className="text-foreground" style={styles.body}>{record.objectiveCounts[objective.id] ?? 0} / {objective.maximum}</Text>
          </View>)}
        </> : <Text className="text-muted" style={styles.body}>{record.rank === '1' ? 'Maximum rank reached.' : `Current rank cap: ${record.rank}. Further training is not available yet.`}</Text>}
      </DungeonCard>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 12, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  skillName: { flex: 1, fontSize: 16, fontWeight: '600' },
  rank: { fontSize: 12, fontWeight: '600' },
  objective: { flex: 1, fontSize: 12, lineHeight: 20 },
});
