import { useState, useSyncExternalStore } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { TitleDefinition } from '../../data/schemas/titles';
import { previewTitle, titleConditionProgress, titleSelectionProblem, titleState } from '../../engine/rpg/Titles';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { MenuPage, menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import ProgressionFeedback from '../skills/ProgressionFeedback';
import { slotLabel, titleStatLabels, visibleTitles } from './titleLabels';

export default function TitlesScreen() {
  const { host } = useCharacterGame();
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  return hosted.session ? <TitleCollection host={host} session={hosted.session} /> : <MenuPage><DungeonLoading label="Loading titles" /></MenuPage>;
}
function TitleCollection({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const [slot, setSlot] = useState<'all' | TitleDefinition['slot']>('all');
  const [category, setCategory] = useState<'all' | TitleDefinition['category']>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [offset, setOffset] = useState(0);
  const hero = view.state.hero, content = session.content;
  const selected = content.data.titles.find((t) => t.id === selectedId);
  const town = !hosted.battle && !view.state.pending && !view.state.dungeon && !!view.map.theme;
  const busy = hosted.busy || !!hosted.retryAvailable;
  const entries = visibleTitles(hero, content.data.titles, search, slot, category);
  const knownSelected = selected && titleState(hero, selected.id) !== 'Unknown' ? selected : undefined;
  const choose = (titleId: string | undefined, titleSlot: TitleDefinition['slot']) => { void host.progress({ type: 'SELECT_TITLE', slot: titleSlot, titleId }); };
  const problem = knownSelected ? titleSelectionProblem(hero, knownSelected.slot, knownSelected.id, content) : undefined;
  const equipped = !!knownSelected && hero.titleCollection.selected[knownSelected.slot] === knownSelected.id;
  const preview = knownSelected && !problem ? previewTitle(hero, knownSelected.slot, equipped ? undefined : knownSelected.id, content) : undefined;
  return <MenuPage>
    <Text className="text-foreground" accessibilityRole="header" style={menu.title}>Titles</Text>
    <Text className="text-muted" style={menu.body}>{hero.earnedTitles.length} earned · {hero.titleCollection.discovered.filter((id) => !hero.earnedTitles.includes(id)).length} known. Earned titles stay with this character. Choose one First and one Second; their effects combine.</Text>
    <DungeonCard>
      {(['first', 'second'] as const).map((value) => {
        const id = hero.titleCollection.selected[value], definition = content.data.titles.find((t) => t.id === id);
        return <View key={value} className="gap-2">
          <Text className="text-accent" style={menu.label}>{slotLabel[value]}</Text>
          <Text className="text-foreground" style={menu.body}>{definition?.name ?? (id ? 'Unavailable title · achievement preserved; effects disabled' : 'None selected')}</Text>
          {id ? <DungeonButton label={`Inspect ${slotLabel[value]}`} onPress={() => setSelectedId(id)} /> : null}
          {id ? <DungeonButton label={`Clear ${slotLabel[value]}`} disabled={!town || busy} onPress={() => choose(undefined, value)} /> : null}
        </View>;
      })}
      <Text className="text-muted" style={menu.body}>Title changes cost no gold or AP and never refill HP, MP or SP. Master titles and cosmetic talent labels are coming later.</Text>
    </DungeonCard>
    {!town ? <DungeonNotice status="accent" message="Change titles in town. You can browse the collection anywhere without using a turn." /> : null}
    {knownSelected ? <>
      <DungeonButton label="Back to title collection" onPress={() => setSelectedId(undefined)} />
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={menu.heading}>{knownSelected.name}</Text>
        <Text className="text-muted" style={menu.body}>{slotLabel[knownSelected.slot]} · {knownSelected.category} · {titleState(hero, knownSelected.id)}{equipped ? ' · Selected' : ''}</Text>
        <Text className="text-foreground" style={menu.body}>{knownSelected.description}</Text>
        {knownSelected.hint ? <Text className="text-muted" style={menu.body}>Discovery: {titleConditionProgress(hero, knownSelected.hint, content).text}</Text> : null}
        {knownSelected.award ? <Text className="text-foreground" style={menu.body}>Achievement: {titleConditionProgress(hero, knownSelected.award, content).text}</Text> : <Text className="text-foreground" style={menu.body}>{content.data.items.some((i) => i.kind === 'titleCoupon' && i.titleId === knownSelected.id) ? `Redeem ${content.data.items.find((i) => i.kind === 'titleCoupon' && i.titleId === knownSelected.id)!.name} in town.` : `Claim ${content.data.quests.find((q) => q.rewards.titles.includes(knownSelected.id))?.name ?? 'its named quest reward'}.`}</Text>}
        {knownSelected.discoveryFirst ? <Text className="text-muted" style={menu.body}>Discover the hint before completing the achievement.</Text> : null}
        {knownSelected.eligibility ? <Text className="text-muted" style={menu.body}>Eligibility: {content.skill(knownSelected.eligibility.skillId).name} Rank {knownSelected.eligibility.rank} or better.</Text> : null}
        <Text className="text-accent" style={menu.label}>Equipped effects</Text>
        {knownSelected.effects.map((e) => <Text key={e.stat} className="text-foreground" style={menu.body}>{titleStatLabels[e.stat]} {e.value >= 0 ? '+' : ''}{e.value}</Text>)}
        {!knownSelected.effects.length ? <Text className="text-muted" style={menu.body}>No stat effects.</Text> : null}
        {hero.earnedTitles.includes(knownSelected.id) ? <Text className="text-muted" style={menu.body}>Acquired: {acquisition(hero.titleCollection.records[knownSelected.id]?.source, session)}</Text> : null}
        {problem ? <DungeonNotice status="accent" message={problem} /> : null}
        <DungeonButton label={equipped ? `Remove ${knownSelected.name}` : `Select as ${slotLabel[knownSelected.slot]}`} disabled={!town || busy || !!problem} onPress={() => choose(equipped ? undefined : knownSelected.id, knownSelected.slot)} />
      </DungeonCard>
      {preview ? <DungeonCard>
        <Text className="text-accent" style={menu.heading}>{equipped ? 'After removing' : 'After selecting'}</Text>
        <Text className="text-muted" style={menu.body}>Max HP {preview.before.maxHealth} → {preview.after.maxHealth} · MP {preview.before.maxMana} → {preview.after.maxMana} · SP {preview.before.maxStamina} → {preview.after.maxStamina}</Text>
        <Text className="text-muted" style={menu.body}>Physical damage {preview.before.combatant.minDamage}–{preview.before.combatant.maxDamage} → {preview.after.combatant.minDamage}–{preview.after.combatant.maxDamage}</Text>
        <Text className="text-muted" style={menu.body}>Magic attack {preview.before.combatant.magicAttack} → {preview.after.combatant.magicAttack} · Defense {preview.before.combatant.defense} → {preview.after.combatant.defense}</Text>
        <Text className="text-muted" style={menu.body}>Protection {preview.before.combatant.protection} → {preview.after.combatant.protection} · Magic defense {preview.before.combatant.magicDefense} → {preview.after.combatant.magicDefense} · Magic protection {preview.before.combatant.magicProtection} → {preview.after.combatant.magicProtection}</Text>
        {(Object.keys(preview.after.effective) as (keyof typeof preview.after.effective)[]).filter((key) => preview.before.effective[key] !== preview.after.effective[key]).map((key) => <Text key={key} className="text-muted" style={menu.body}>{titleStatLabels[key]} {preview.before.effective[key]} → {preview.after.effective[key]}</Text>)}
        <Text className="text-muted" style={menu.body}>Current pools after change: {preview.pools.health} HP · {preview.pools.mana} MP · {preview.pools.stamina} SP · {preview.pools.wounds} wounds. Higher limits do not restore resources.</Text>
      </DungeonCard> : null}
    </> : selectedId ? <>
      <DungeonButton label="Back to title collection" onPress={() => setSelectedId(undefined)} />
      <DungeonNotice status="accent" message={selected ? '??? · Discover this title through your journey.' : 'This title definition is unavailable. Your achievement record is preserved and supplies no effects.'} />
    </> : <>
      <Text className="text-accent" style={menu.label}>Slot</Text>
      <View className="flex-row flex-wrap gap-2">{(['all', 'first', 'second'] as const).map((value) => <DungeonButton key={value} label={value === 'all' ? 'All slots' : slotLabel[value]} selected={slot === value} onPress={() => { setSlot(value); setOffset(0); }} />)}</View>
      <Text className="text-accent" style={menu.label}>Category</Text>
      <View className="flex-row flex-wrap gap-2">{(['all', 'General', 'Story', 'Combat', 'Master', 'Event'] as const).map((value) => <DungeonButton key={value} label={value === 'all' ? 'All categories' : value} selected={category === value} onPress={() => { setCategory(value); setOffset(0); }} />)}</View>
      <Text className="text-accent" style={menu.label}>Search discovered titles</Text>
      <TextInput accessibilityLabel="Search discovered titles" value={search} onChangeText={(value) => { setSearch(value); setOffset(0); }} autoCapitalize="none" autoCorrect={false} className="min-h-12 rounded-lg border border-border bg-surface px-3 py-3 text-foreground" />
      {entries.slice(offset, offset + 20).map((t) => {
        const state = titleState(hero, t.id);
        return <DungeonButton key={t.id} label={state === 'Unknown' ? '???' : t.name} detail={state === 'Unknown' ? 'Undiscovered title' : `${slotLabel[t.slot]} · ${t.category} · ${state}${hero.titleCollection.selected[t.slot] === t.id ? ' · Selected' : ''}`} onPress={() => setSelectedId(t.id)} />;
      })}
      {!entries.length ? <Text className="text-muted" style={menu.body}>No discovered titles match these filters.</Text> : null}
      {entries.length > 20 ? <View className="flex-row flex-wrap gap-2"><DungeonButton label="Previous titles" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - 20))} /><DungeonButton label="Next titles" disabled={offset + 20 >= entries.length} onPress={() => setOffset(offset + 20)} /></View> : null}
      {hero.earnedTitles.filter((id) => !content.data.titles.some((t) => t.id === id)).map((id) => <DungeonButton key={id} label="Unavailable earned title" detail="Achievement preserved · no effects" onPress={() => setSelectedId(id)} />)}
    </>}
    <ProgressionFeedback host={host} />
  </MenuPage>;
}
function acquisition(source: string | undefined, session: JourneySession) {
  if (source?.startsWith('quest/')) return `Claimed ${session.content.data.quests.find((q) => q.id === source.split('/')[1])?.name ?? 'quest reward'}`;
  if (source?.startsWith('coupon/')) return 'Redeemed a town coupon';
  if (source === 'legacy/ownership') return 'Preserved from an earlier save';
  return source?.startsWith('encounter/') ? 'Completed encounter' : 'Saved journey achievement';
}
