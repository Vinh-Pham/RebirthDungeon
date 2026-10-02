import { useMemo, useState, useSyncExternalStore } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Skill } from '../../data/schemas/content';
import type { Hero } from '../../engine/rpg/Character';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import { gameRank, rankUpReason, trainingPoints } from '../../engine/rpg/Skills';
import { distance } from '../../engine/world/TileMap';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { MenuPage, menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import GameImage from '../shared/GameImage';
import ProgressionFeedback from './ProgressionFeedback';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;
function rankEffects(
  skill: Skill,
  rank: NonNullable<Skill['gameRanks']>[keyof NonNullable<Skill['gameRanks']>],
) {
  if (!rank) return '';
  if (skill.kind === 'life')
    return `Apply scrolls and burn equipment at the town forge. Permanent Intelligence +${rank.statBonuses?.intelligence ?? 0}. Recipes are shown before each attempt.`;
  if (skill.kind === 'active')
    return `${skill.effect === 'heal' ? 'Healing' : 'Power'} ${rank.minPower}–${rank.maxPower} · ${rank.manaCost} MP · ${rank.staminaCost} base SP${skill.requiresWeapon ? ` · usable ${skill.requiresWeapon} weapon` : ''}`;
  return [
    rank.maxHealth ? `Max HP +${rank.maxHealth}` : '',
    rank.meleeMax ? `Melee damage +${rank.meleeMin}–${rank.meleeMax}` : '',
    rank.swordMax ? `Sword damage +${rank.swordMin}–${rank.swordMax}` : '',
    rank.swordBalance ? `Sword Balance +${Math.round(rank.swordBalance * 100)}%` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
function progressLabel(hero: Hero, skill: Skill, town: boolean) {
  const record = hero.learnedSkills[skill.id];
  if (!skill.gameRanks) return 'Not implemented';
  if (!record)
    return hero.discoveredSkills.includes(skill.id)
      ? 'Discovered · Learn Rank F'
      : 'Unlearned · Learn Rank F';
  const rank = gameRank(skill, record.rank);
  const reason = !rank.nextRank
    ? record.rank === '1'
      ? 'Max Rank: 1'
      : `Prototype cap: ${record.rank}`
    : hero.ap < rank.apCost!
      ? `Training complete · Need ${rank.apCost! - hero.ap} AP`
      : undefined;
  const points = trainingPoints(skill, record);
  if (reason?.includes('cap:') || reason?.includes('Max Rank')) return reason;
  if (points < 100) return `${points} / 100 training`;
  if (!town) return 'Training complete · Return to town to rank up';
  return (
    reason ??
    `Ready · Rank up ${record.rank} → ${gameRank(skill, record.rank).nextRank} · ${gameRank(skill, record.rank).apCost} AP`
  );
}
export default function SkillsScreen() {
  const { host } = useCharacterGame();
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  return hosted.session ? (
    <SkillJournal host={host} session={hosted.session} />
  ) : (
    <MenuPage>
      <DungeonLoading label="Loading skills" />
    </MenuPage>
  );
}
function SkillJournal({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [filter, setFilter] = useState<'learned' | 'discovered' | 'catalog'>('learned');
  const [selectedId, setSelectedId] = useState<string>();
  const skills = useMemo(() => session.content.data.skills, [session]);
  const hero = view.state.hero,
    town = !view.state.pending && !view.state.dungeon && !!view.map.theme;
  const rows = skills.filter(
    (skill) =>
      filter === 'catalog' ||
      (filter === 'learned'
        ? !!hero.learnedSkills[skill.id]
        : hero.discoveredSkills.includes(skill.id)),
  );
  const selected = selectedId ? skills.find((s) => s.id === selectedId) : undefined;
  if (selected)
    return (
      <MenuPage>
        <DungeonButton label="Back to skills" onPress={() => setSelectedId(undefined)} />
        <SkillDetails host={host} session={session} skill={selected} />
      </MenuPage>
    );
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-background">
      <FlatList
        data={rows}
        keyExtractor={(skill) => skill.id}
        contentContainerStyle={{
          padding: 24,
          gap: 12,
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <Text className="text-foreground" accessibilityRole="header" style={menu.title}>
              Skills
            </Text>
            <Text className="text-accent" style={menu.heading}>
              {hero.ap} Ability Points
            </Text>
            <Text className="text-muted" style={menu.body}>
              Combat skills train in battle; Enchant trains at the town blacksmith. Invest AP in
              town. 100 training unlocks advancement.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(['learned', 'discovered', 'catalog'] as const).map((value) => (
                <DungeonButton
                  key={value}
                  label={
                    value === 'learned'
                      ? 'Learned'
                      : value === 'discovered'
                        ? 'Discovered'
                        : 'Catalog'
                  }
                  selected={filter === value}
                  onPress={() => setFilter(value)}
                />
              ))}
            </View>
            {!town ? (
              <DungeonNotice
                status="accent"
                message="Return to town to rank up or learn skills. Viewing the journal uses no turn."
              />
            ) : null}
            <ProgressionFeedback host={host} />
          </View>
        }
        ListEmptyComponent={
          <Text className="text-muted" style={menu.body}>
            Speak to the keeper and collect manuals to discover skills.
          </Text>
        }
        renderItem={({ item: skill }) => (
          <DungeonButton
            image={{ kind: 'skill', id: skill.id }}
            label={`${skill.name}${hero.learnedSkills[skill.id] ? ` · Rank ${hero.learnedSkills[skill.id].rank}` : ''}`}
            detail={`${skill.category ?? 'combat'} · ${skill.kind ?? 'active'} · ${progressLabel(hero, skill, town)}`}
            accessibilityLabel={`${skill.name}. ${progressLabel(hero, skill, town)}. View details.`}
            onPress={() => setSelectedId(skill.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}
function SkillDetails({
  host,
  session,
  skill,
}: {
  host: JourneyHost;
  session: JourneySession;
  skill: Skill;
}) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const battle = useSyncExternalStore(
    hosted.battle?.subscribe ?? noSubscribe,
    hosted.battle?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  const hero = view.state.hero,
    record = hero.learnedSkills[skill.id];
  const town = !view.state.pending && !view.state.dungeon && !!view.map.theme;
  const rank = skill.gameRanks?.[record?.rank ?? 'F'];
  const recipe = session.content.data.skillBookRecipes.find((r) => r.skillId === skill.id);
  const collection = recipe ? hero.bookCollections[recipe.id] : undefined;
  const books = session.content.data.items.filter(
    (i) => i.kind === 'skillBook' && i.skillId === skill.id && hero.inventory[i.id],
  );
  const instructor = view.map.objects.find((o) => o.lessons.some((l) => l.skillId === skill.id));
  const offer = instructor?.lessons.find((l) => l.skillId === skill.id);
  const pending = battle?.training[skill.id] ?? {};
  const pendingPoints =
    rank?.objectives.reduce((total, o) => total + (pending[o.id] ?? 0) * o.points, 0) ?? 0;
  const disabled = hosted.busy || !!hosted.retryAvailable || !town;
  const weapon = hosted.battle
    ? hosted.battle.engine.getEntity('player')?.weapon
    : hero.equipment.weapon
      ? hero.weapons[hero.equipment.weapon]
      : undefined;
  const inactive =
    skill.kind === 'passive' &&
    skill.requiresWeapon &&
    (!weapon ||
      weapon.durability === 0 ||
      !session.content.item(weapon.itemId).weaponTags.includes(skill.requiresWeapon));
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <GameImage kind="skill" id={skill.id} size={80} />
        <Text
          className="min-w-0 flex-1 text-foreground"
          accessibilityRole="header"
          style={menu.title}
        >
          {skill.name}
        </Text>
      </View>
      <Text className="text-muted" style={menu.body}>
        {skill.category} · {skill.kind} · {record ? `Rank ${record.rank}` : 'Unlearned'}
      </Text>
      <Text className="text-accent" style={menu.heading}>
        {hero.ap} AP · {progressLabel(hero, skill, town)}
      </Text>
      <ProgressionFeedback host={host} />
      {!town ? (
        <DungeonNotice status="accent" message="Return to town to rank up or learn skills" />
      ) : null}
      {!rank ? (
        <DungeonNotice message="Not implemented. This skill needs authored game ranks and resolver support." />
      ) : (
        <>
          <DungeonCard>
            <Text className="text-foreground" style={menu.heading}>
              Current effects
            </Text>
            <Text className="text-muted" style={menu.body}>
              {rankEffects(skill, rank)}
            </Text>
            {inactive ? (
              <Text className="text-muted" style={menu.body}>
                Inactive · Equip a usable sword
              </Text>
            ) : null}
            {rank.nextRank ? (
              <>
                <Text className="text-foreground" style={menu.heading}>
                  Next: Rank {rank.nextRank} · {rank.apCost} AP
                </Text>
                <Text className="text-muted" style={menu.body}>
                  {rankEffects(skill, skill.gameRanks![rank.nextRank])}
                </Text>
              </>
            ) : null}
          </DungeonCard>
          {record ? (
            <DungeonCard>
              <Text className="text-foreground" style={menu.heading}>
                {rank.objectives.length
                  ? `Training: ${trainingPoints(skill, record)} / 100${rank.nextRank ? '' : ' · Current rank cap'}`
                  : progressLabel(hero, skill, town)}
              </Text>
              {hosted.battle ? (
                <Text className="text-accent" style={menu.body}>
                  Banked after this battle: +{pendingPoints} training
                </Text>
              ) : null}
              {rank.objectives.map((o) => (
                <Text key={o.id} className="text-muted" style={menu.body}>
                  {o.label} · {record.objectiveCounts[o.id] ?? 0}/{o.maximum} · {o.points} points
                  each{pending[o.id] ? ` · +${pending[o.id]} pending` : ''}
                </Text>
              ))}
              {rank.nextRank ? (
                <DungeonButton
                  primary
                  label={`Rank up ${record.rank} → ${rank.nextRank} · ${rank.apCost} AP`}
                  disabled={disabled || !!rankUpReason(hero, skill.id, session.content)}
                  onPress={() => {
                    void host.progress({ type: 'RANK_UP_SKILL', skillId: skill.id });
                  }}
                />
              ) : null}
            </DungeonCard>
          ) : (
            <DungeonCard>
              <Text className="text-muted" style={menu.body}>
                {skill.acquisitionHint ?? 'Granted to new wardens.'}
              </Text>
              {offer && instructor ? (
                <>
                  <Text className="text-muted" style={menu.body}>
                    {instructor.name} · {offer.fee} gold
                    {distance(instructor, view.state.position) > 1 ||
                    view.activeService !== instructor.id
                      ? ' · Approach and speak to the instructor first'
                      : ''}
                  </Text>
                  <DungeonButton
                    primary
                    label={`Learn ${skill.name} · Rank F`}
                    disabled={
                      disabled ||
                      distance(instructor, view.state.position) > 1 ||
                      view.activeService !== instructor.id ||
                      hero.gold < offer.fee
                    }
                    onPress={() => {
                      void host.progress({
                        type: 'LEARN_SKILL',
                        skillId: skill.id,
                        objectId: instructor.id,
                      });
                    }}
                  />
                </>
              ) : null}
              {books.map((book) => (
                <DungeonButton
                  primary
                  image={{ kind: 'item', id: book.id }}
                  key={book.id}
                  label={`Read ${book.name}`}
                  disabled={disabled}
                  onPress={() => {
                    void host.progress({ type: 'READ_SKILL_BOOK', itemId: book.id });
                  }}
                />
              ))}
            </DungeonCard>
          )}
          {recipe ? (
            <DungeonCard>
              <Text className="text-foreground" style={menu.heading}>
                Sword manual ·{' '}
                {collection?.completed
                  ? 'Complete'
                  : `${collection?.insertedPages.length ?? 0}/${recipe.pages.length} pages`}
              </Text>
              <Text className="text-muted" style={menu.body}>
                {hero.inventory[recipe.incompleteItemId]
                  ? 'Binding owned'
                  : collection?.completed
                    ? 'Read the completed manual to learn.'
                    : 'Find the unfinished manual in the refuge training row.'}
              </Text>
              {recipe.pages.map((page) => {
                const inserted = collection?.insertedPages.includes(page.itemId);
                return (
                  <View key={page.itemId} className="gap-2">
                    <Text className="text-foreground" style={menu.label}>
                      {session.content.item(page.itemId).name} ·{' '}
                      {inserted ? 'Inserted' : hero.inventory[page.itemId] ? 'Owned' : 'Missing'}
                    </Text>
                    <Text className="text-muted" style={menu.body}>
                      {page.hint}
                    </Text>
                    {!inserted && !collection?.completed ? (
                      <DungeonButton
                        label={`Insert ${session.content.item(page.itemId).name}`}
                        disabled={
                          disabled ||
                          !hero.inventory[page.itemId] ||
                          !hero.inventory[recipe.incompleteItemId]
                        }
                        onPress={() => {
                          void host.progress({
                            type: 'INSERT_SKILL_PAGE',
                            recipeId: recipe.id,
                            pageId: page.itemId,
                          });
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </DungeonCard>
          ) : null}
        </>
      )}
    </View>
  );
}
