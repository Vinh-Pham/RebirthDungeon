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
import InventoryItemPopover from './InventoryItemPopover';
import InventoryPager, { INVENTORY_PAGE_SIZE, inventoryPage } from './InventoryPager';
import {
  inventoryRows,
  visibleInventoryRows,
  type InventoryFilter,
  type InventoryRow,
} from './inventoryRows';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;
const filters = [
  ['all', 'All'],
  ['supplies', 'Supplies'],
  ['equipment', 'Equipment'],
  ['books', 'Books'],
] as const;

export default function InventoryScreen() {
  const { host } = useCharacterGame();
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  return hosted.session ? (
    <InventoryPage key={hosted.revision} host={host} session={hosted.session} />
  ) : (
    <MenuPage>
      <DungeonLoading label="Loading inventory" />
    </MenuPage>
  );
}

function InventoryPage({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return (
    <MenuPage>
      <InventoryContent host={host} session={session} />
      {view.message ? <DungeonNotice status="accent" message={view.message} /> : null}
      <ProgressionFeedback host={host} showNotice={false} />
    </MenuPage>
  );
}

export function InventoryContent({
  host,
  session,
}: {
  host: JourneyHost;
  session: JourneySession;
}) {
  const { profile } = useCharacterGame();
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const battle = useSyncExternalStore(
    hosted.battle?.subscribe ?? noSubscribe,
    hosted.battle?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>();
  const [error, setError] = useState<string>();
  const hero = view.state.hero;
  const rows = useMemo(
    () => inventoryRows(hero, session.content, battle?.inventory),
    [hero, session.content, battle?.inventory],
  );
  const visible = useMemo(() => visibleInventoryRows(rows, filter, search), [rows, filter, search]);
  const currentPage = inventoryPage(page, visible.length);
  const start = currentPage * INVENTORY_PAGE_SIZE;
  const disabled =
    hosted.busy || !!hosted.battle || !!hosted.retryAvailable || !!view.state.pending;
  const hotbarDisabled = hosted.busy || !!hosted.retryAvailable || !hosted.storageAvailable;
  const town = !view.state.dungeon && !view.state.pending && !!view.map.theme;
  const equippedWeapon = rows.find((row) => row.equipped && row.item.kind === 'weapon');
  const equippedArmor = rows.find((row) => row.equipped && row.item.kind === 'armor');
  const dispatch = (command: GameCommand) => {
    const current = host.getSnapshot();
    if (current.busy || current.battle || current.retryAvailable) return;
    try {
      setError(undefined);
      session.dispatch(command);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'This item could not be used.');
    }
  };
  const needs = questItemNeeds(
    battle?.inventory ? { ...hero, inventory: battle.inventory.items } : hero,
    session.content,
  );
  const icon = (row: InventoryRow, section: string) => {
    const key = `${section}:${row.key}`;
    return (
      <InventoryItemPopover
        key={row.key}
        row={row}
        open={selectedKey === key}
        onOpenChange={(open) => {
          setSelectedKey(open ? key : undefined);
          setError(undefined);
        }}
      >
        <DungeonNotice message={error} />
        <ProgressionFeedback host={host} showNotice={false} />
        <InventoryDetails
          row={row}
          hero={battle?.inventory ? { ...hero, inventory: battle.inventory.items } : hero}
          host={host}
          session={session}
          characterId={profile.id}
          review={battle?.character}
          disabled={disabled}
          hotbarDisabled={hotbarDisabled}
          town={town}
          dispatch={dispatch}
        />
      </InventoryItemPopover>
    );
  };
  return (
    <View className="gap-4">
      {hosted.battle ? (
        <DungeonNotice
          status="accent"
          message="You can change your Items hotbar during battle. Use consumables from the combat screen; equipment and dropping stay unavailable until the encounter ends."
        />
      ) : null}
      <DungeonNotice message={error} />
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
          Equipment
        </Text>
        <Text className="text-muted" style={menu.body}>
          {hero.gold.toLocaleString()} gold · Character pack
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {equippedWeapon ? (
            icon(equippedWeapon, 'equipment')
          ) : (
            <Text className="text-muted" style={menu.body}>
              Weapon: Bare hands
            </Text>
          )}
          {equippedArmor ? (
            icon(equippedArmor, 'equipment')
          ) : (
            <Text className="text-muted" style={menu.body}>
              Armor: None
            </Text>
          )}
        </View>
        {view.state.dungeon ? (
          <Text className="text-muted" style={menu.body}>
            Dungeon keys · Boss: {view.state.dungeon.bossKey.status} · Treasure:{' '}
            {view.state.dungeon.treasureKey.status}
          </Text>
        ) : null}
      </DungeonCard>
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
          Items hotbar
        </Text>
        <Text className="text-muted" style={menu.body}>
          Tap an assigned consumable to inspect or remove it. Empty slots stay assigned when you run
          out.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {hero.itemHotbar.map((id) =>
            icon(
              {
                key: `item:${id}`,
                reference: { itemId: id },
                item: session.content.item(id),
                quantity: (battle?.inventory?.items ?? hero.inventory)[id] ?? 0,
                equipped: false,
              },
              'hotbar',
            ),
          )}
        </View>
        {!hero.itemHotbar.length ? (
          <Text className="text-muted" style={menu.body}>
            No consumables assigned.
          </Text>
        ) : null}
      </DungeonCard>
      <DungeonCard>
        <Text className="text-accent" style={menu.heading}>
          Quest supplies
        </Text>
        {needs.length ? (
          needs.map(({ quest, objective, count }) => (
            <Text key={`${quest.id}/${objective.id}`} className="text-muted" style={menu.body}>
              {session.content.item(objective.itemId).name} · {count}/{objective.target} for{' '}
              {quest.name}
              {objective.kind === 'deliverItem'
                ? ` · ${npcLabel(session.content, quest.claimNpc)}`
                : ''}
            </Text>
          ))
        ) : (
          <Text className="text-muted" style={menu.body}>
            No current item objectives. Speak to town NPCs for requests.
          </Text>
        )}
        <DungeonButton
          label="Quest journal"
          onPress={() =>
            router.navigate({
              pathname: '/game/[characterId]/quests',
              params: { characterId: profile.id },
            })
          }
        />
      </DungeonCard>
      <DungeonCard>
        <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
          Your pack
        </Text>
        <Text className="text-muted" style={menu.body}>
          Tap an item for details and actions. Each equipment icon is one owned copy.
        </Text>
        <Input
          accessibilityLabel="Search inventory"
          value={search}
          placeholder="Search your pack"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onChangeText={(value) => {
            setSearch(value);
            setPage(0);
            setSelectedKey(undefined);
          }}
          className="min-h-12 border border-border"
        />
        <View className="flex-row flex-wrap gap-2">
          {filters.map(([value, label]) => (
            <DungeonButton
              key={value}
              label={label}
              selected={filter === value}
              accessibilityLabel={`Show ${label.toLowerCase()} in inventory`}
              onPress={() => {
                setFilter(value);
                setPage(0);
                setSelectedKey(undefined);
              }}
            />
          ))}
        </View>
        <Text className="text-muted" accessibilityLiveRegion="polite" style={menu.body}>
          {visible.length} {visible.length === 1 ? 'entry' : 'entries'} · Sorted by name
        </Text>
        {!visible.length ? (
          <Text className="text-muted" style={menu.body}>
            {!rows.length ? 'Your pack is empty.' : 'No items match this search and filter.'}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-2">
          {visible.slice(start, start + INVENTORY_PAGE_SIZE).map((row) => icon(row, 'pack'))}
        </View>
        <InventoryPager
          label="Pack entries"
          page={currentPage}
          count={visible.length}
          onPage={(next) => {
            setPage(next);
            setSelectedKey(undefined);
          }}
        />
      </DungeonCard>
    </View>
  );
}
