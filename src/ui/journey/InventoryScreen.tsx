import ProgressionFeedback from '../skills/ProgressionFeedback';
import { router } from 'expo-router';
import { questItemNeeds } from '../../engine/rpg/Quests';
import { npcLabel } from '../quests/questLabels';
import { Input } from 'heroui-native/input';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import type { GameCommand } from '../../engine/commands';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { MenuPage, menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import InventoryDetails from './InventoryDetails';
import InventoryPager, { INVENTORY_PAGE_SIZE, inventoryPage } from './InventoryPager';
import { inventoryRowLabel, inventoryRows, visibleInventoryRows, type InventoryFilter } from './inventoryRows';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;
const filters = [['all', 'All'], ['supplies', 'Supplies'], ['equipment', 'Equipment'], ['books', 'Books']] as const;

export default function InventoryScreen() {
  const { host } = useCharacterGame();
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  return hosted.session ? <InventoryPage key={hosted.revision} host={host} session={hosted.session} />
    : <MenuPage><DungeonLoading label="Loading inventory" /></MenuPage>;
}

function InventoryPage({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return <MenuPage>
    <InventoryContent host={host} session={session} />
    {view.message ? <DungeonNotice status="accent" message={view.message} /> : null}
    <ProgressionFeedback host={host} showNotice={false} />
  </MenuPage>;
}

export function InventoryContent({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const { profile } = useCharacterGame();
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const battle = useSyncExternalStore(hosted.battle?.subscribe ?? noSubscribe, hosted.battle?.getSnapshot ?? noSnapshot, noSnapshot);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>();
  const [error, setError] = useState<string>();
  const hero = view.state.hero;
  const rows = useMemo(() => inventoryRows(hero, session.content, battle?.inventory), [hero, session.content, battle?.inventory]);
  const visible = useMemo(() => visibleInventoryRows(rows, filter, search), [rows, filter, search]);
  const selected = rows.find((row) => row.key === selectedKey);
  const currentPage = inventoryPage(page, visible.length);
  const start = currentPage * INVENTORY_PAGE_SIZE;
  const disabled = hosted.busy || !!hosted.battle || !!hosted.retryAvailable || !!view.state.pending;
  const town = !view.state.dungeon && !view.state.pending && !!view.map.theme;
  const equippedWeapon = rows.find((row) => row.equipped && row.item.kind === 'weapon');
  const equippedArmor = rows.find((row) => row.equipped && row.item.kind === 'armor');
  const dispatch = (command: GameCommand) => {
    const current = host.getSnapshot();
    if (current.busy || current.battle || current.retryAvailable) return;
    try { setError(undefined); session.dispatch(command); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'This item could not be used.'); }
  };
  const back = () => { setSelectedKey(undefined); setError(undefined); };
  const needs = questItemNeeds(battle?.inventory ? { ...hero, inventory: battle.inventory.items } : hero, session.content);
  return <View className="gap-4">
    {hosted.battle ? <DungeonNotice status="accent" message="Inventory is read-only during encounters. Equipment cannot change during battle; use the battle Item menu for consumables." /> : null}
    <DungeonNotice message={error} />
    {selected ? <InventoryDetails row={selected} hero={battle?.inventory ? { ...hero, inventory: battle.inventory.items } : hero} host={host} session={session} review={battle?.character} disabled={disabled} town={town} dispatch={dispatch} back={back} /> : <>
      {selectedKey ? <DungeonNotice status="accent" message="That item is no longer in your pack." /> : null}
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={menu.heading}>Equipment</Text>
        <Text className="text-muted" style={menu.body}>{hero.gold.toLocaleString()} gold · Character pack</Text>
        {equippedWeapon ? <DungeonButton label={inventoryRowLabel(equippedWeapon)} detail={`${equippedWeapon.durability} / ${equippedWeapon.item.maxDurability} durability${equippedWeapon.durability === 0 ? ' · Broken; repair at the blacksmith' : ''}`}
          onPress={() => { setSelectedKey(equippedWeapon.key); setError(undefined); }} /> : <Text className="text-muted" style={menu.body}>Weapon: Bare hands</Text>}
        {equippedArmor ? <DungeonButton label={equippedArmor.item.name} detail="Armor · One equipped copy" onPress={() => { setSelectedKey(equippedArmor.key); setError(undefined); }} /> : <Text className="text-muted" style={menu.body}>Armor: None</Text>}
        {view.state.dungeon ? <Text className="text-muted" style={menu.body}>Dungeon keys · Boss: {view.state.dungeon.bossKey.status} · Treasure: {view.state.dungeon.treasureKey.status}</Text> : null}
      </DungeonCard>
      <DungeonCard>
        <Text className="text-accent" style={menu.heading}>Quest supplies</Text>
        {needs.length ? needs.map(({ quest, objective, count }) => <Text key={`${quest.id}/${objective.id}`} className="text-muted" style={menu.body}>
          {session.content.item(objective.itemId).name} · {count}/{objective.target} for {quest.name}{objective.kind === 'deliverItem' ? ` · ${npcLabel(session.content, quest.claimNpc)}` : ''}
        </Text>) : <Text className="text-muted" style={menu.body}>No current item objectives. Speak to town NPCs for requests.</Text>}
        <DungeonButton label="Quest journal" onPress={() => router.navigate({ pathname: '/game/[characterId]/quests', params: { characterId: profile.id } })} />
      </DungeonCard>
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={menu.heading}>Your pack</Text>
        <Text className="text-muted" style={menu.body}>Supplies stack up to 999 of each item. Equipment keeps its own enchants and locks; weapons retain their durability. Tap an item to inspect it.</Text>
        <Input accessibilityLabel="Search inventory" value={search} placeholder="Search your pack" autoCorrect={false} autoCapitalize="none" returnKeyType="search"
          onChangeText={(value) => { setSearch(value); setPage(0); setSelectedKey(undefined); }} className="min-h-12 border border-border" />
        <View className="flex-row flex-wrap gap-2">{filters.map(([value, label]) => <DungeonButton key={value} label={label} selected={filter === value}
          accessibilityLabel={`Show ${label.toLowerCase()} in inventory`} onPress={() => { setFilter(value); setPage(0); setSelectedKey(undefined); }} />)}</View>
        <Text className="text-muted" accessibilityLiveRegion="polite" style={menu.body}>{visible.length} {visible.length === 1 ? 'entry' : 'entries'} · Sorted by name</Text>
        {!visible.length ? <Text className="text-muted" style={menu.body}>{!rows.length ? 'Your pack is empty.' : 'No items match this search and filter.'}</Text> : null}
        {visible.slice(start, start + INVENTORY_PAGE_SIZE).map((row) => <DungeonButton key={row.key} label={inventoryRowLabel(row)}
          detail={`Character pack · ${row.item.kind === 'weapon' ? `${row.durability} / ${row.item.maxDurability} durability${row.durability === 0 ? ' · Broken' : ''}` : row.item.kind === 'consumable' ? 'Supply' : row.item.kind === 'armor' ? 'Armor' : ['material', 'enchantScroll'].includes(row.item.kind) ? 'Enchant supplies' : 'Skill collection'}`}
          onPress={() => { setSelectedKey(row.key); setError(undefined); }} />)}
        <InventoryPager label="Pack entries" page={currentPage} count={visible.length} onPage={setPage} />
      </DungeonCard>
    </>}
  </View>;
}
