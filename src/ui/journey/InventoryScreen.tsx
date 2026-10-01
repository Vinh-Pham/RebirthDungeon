import { router } from 'expo-router';
import ProgressionFeedback from '../skills/ProgressionFeedback';
import { useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import type { GameCommand } from '../../engine/commands';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { MenuPage, menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import InventoryPager, { INVENTORY_PAGE_SIZE, inventoryPage } from './InventoryPager';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;

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
    <ProgressionFeedback host={host} />
  </MenuPage>;
}

export function InventoryContent({ host, session }: { host: JourneyHost; session: JourneySession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const battle = useSyncExternalStore(hosted.battle?.subscribe ?? noSubscribe, hosted.battle?.getSnapshot ?? noSnapshot, noSnapshot);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string>();
  const hero = view.state.hero;
  const player = battle ? hosted.battle?.engine.getEntity('player') : undefined;
  const items = Object.entries(player?.inventory ?? hero.inventory);
  const weapons = Object.entries(hero.weapons);
  const currentPage = inventoryPage(page, weapons.length);
  const start = currentPage * INVENTORY_PAGE_SIZE;
  const { profile } = useCharacterGame();
  const disabled = hosted.busy || !!hosted.battle || !!hosted.retryAvailable;
  const progressionDisabled = disabled || !!view.state.dungeon || !view.map.theme;
  const dispatch = (command: GameCommand) => {
    if (host.getSnapshot().busy || host.getSnapshot().battle) return;
    try { setError(undefined); session.dispatch(command); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'This item could not be used.'); }
  };
  return <View className="gap-4">
    {hosted.battle ? <DungeonNotice status="accent" message="Inventory is read-only during encounters. Use the battle Item menu for consumables." /> : null}
    <DungeonCard><Text className="text-accent" style={menu.heading}>Your pack</Text>
      {!items.length && !weapons.length ? <Text className="text-muted" style={menu.body}>Your pack is empty.</Text> : null}
      {items.map(([id, quantity]) => {
        const item = session.content.item(id);
        const equipped = Object.values(hero.equipment).includes(id);
        return <View key={id} className="gap-2 py-2">
          <Text className="text-foreground" style={menu.body}>{item.name} ×{quantity}{equipped ? ' · equipped' : ''}</Text>
          <Text className="text-muted" style={menu.body}>{item.description}</Text>
          {item.kind === 'skillBook' ? <DungeonButton label={`Read ${item.name}`} disabled={progressionDisabled || !!hero.learnedSkills[item.skillId!]} onPress={() => { void host.progress({ type: 'READ_SKILL_BOOK', itemId: id }); }} />
            : ['skillPage', 'incompleteBook'].includes(item.kind) ? <DungeonButton label="View book collection" onPress={() => router.navigate({ pathname: '/game/[characterId]/skills', params: { characterId: profile.id } })} />
            : <DungeonButton disabled={disabled} selected={equipped}
              label={`${item.kind === 'consumable' ? 'Use' : equipped ? 'Unequip' : 'Equip'} ${item.name}`}
              onPress={() => dispatch(item.kind === 'consumable' ? { type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: id }
                : equipped ? { type: 'UNEQUIP_ITEM', slot: 'armor' } : { type: 'EQUIP_ITEM', itemId: id })} />}
          {item.kind === 'skillBook' && !view.map.theme ? <Text className="text-muted" style={menu.body}>Return to town to read</Text> : null}
        </View>;
      })}
      {weapons.slice(start, start + INVENTORY_PAGE_SIZE).map(([weaponId, weapon], offset) => {
        const index = start + offset;
        const item = session.content.item(weapon.itemId);
        const equipped = hero.equipment.weapon === weaponId;
        const durability = player?.weapon?.id === weaponId ? player.weapon.durability : weapon.durability;
        return <View key={weaponId} className="gap-2 py-2">
          <Text className="text-foreground" style={menu.body}>{item.name} · Weapon {index + 1}{equipped ? ' · equipped' : ''}</Text>
          <Text className="text-muted" style={menu.body}>{durability}/{item.maxDurability} durability{durability === 0
            ? ' · broken, no stat bonus; repair at the blacksmith' : ` · +${item.power} ${item.stat ?? 'attack'}`}</Text>
          <DungeonButton disabled={disabled} selected={equipped} label={`${equipped ? 'Unequip' : 'Equip'} ${item.name} · Weapon ${index + 1}`}
            onPress={() => dispatch(equipped ? { type: 'UNEQUIP_ITEM', slot: 'weapon' } : { type: 'EQUIP_WEAPON', weaponId })} />
        </View>;
      })}
      <InventoryPager label="Weapons" page={currentPage} count={weapons.length} disabled={hosted.busy} onPage={setPage} />
    </DungeonCard>
    <DungeonNotice message={error} />
  </View>;
}
