import { Tabs } from 'heroui-native/tabs';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import { inventoryRows, inventoryRowLabel, visibleInventoryRows } from './inventoryRows';
import FeatureGate from '../shared/FeatureGate';
import { heroFeatures, characterReviewFeature } from '../../game/FeatureReads';
import GameImage from '../shared/GameImage';
import EnchantServicePanel from './EnchantServicePanel';
import { DungeonButton as Button, DungeonCard } from '../shared/DungeonUI';
import { useSyncExternalStore, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import type { GameplayProgressionCommand as ProgressionCommand } from '../../game/Gameplay';
import type { GameCommand } from '../../engine/commands';
import {
  heroStats,
  itemCount,
  removableCount,
  repairPrice,
  type OwnedItem,
} from '../../engine/rpg/Character';
import InventoryPager, { INVENTORY_PAGE_SIZE, inventoryPage } from './InventoryPager';
import TownQuestOffers from '../quests/TownQuestOffers';
import { questItemNeeds } from '../../engine/rpg/Quests';
import { shopOffers } from '../../engine/world/Shop';
import ShopItemPopover from './ShopItemPopover';

type Quote = { command: ProgressionCommand; label: string; goldChange: number; detail: string };

function TownServicePanelLoaded({
  session,
  objectId,
  busy,
  dispatch,
  progress,
  tradeTab,
  onTradeTabChange,
}: {
  session: JourneySession;
  objectId: string;
  busy: boolean;
  dispatch(command: GameCommand): boolean;
  progress(command: ProgressionCommand): void;
  tradeTab: string;
  onTradeTabChange(value: string): void;
}) {
  const [enchanting, setEnchanting] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [openOffer, setOpenOffer] = useState<string>();
  const [repairPage, setRepairPage] = useState(0);
  const [tradePage, setTradePage] = useState(0);
  const [salePage, setSalePage] = useState(0);
  const pending = useRef<Quote | undefined>(undefined);
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { map } = view;
  const hero = heroFeatures(session, ['inventory', 'equipment', 'skills', 'quests'], view);
  const content = session.content;
  const object = map.objects.find((entry) => entry.id === objectId)!;
  const shop = content.data.shops.find((entry) => entry.id === object.shopId);
  const altar = object.kind === 'altar' || object.kind === 'dungeonEntrance';
  const stats =
    characterReviewFeature(session, view)?.stats ??
    heroStats(heroFeatures(session, ['inventory', 'equipment', 'skills', 'titles'], view), content);
  const choose = (next: Quote) => {
    pending.current = next;
    setQuote(next);
  };
  const cancel = () => {
    pending.current = undefined;
    setQuote(undefined);
  };
  const confirm = () => {
    const next = pending.current;
    if (!next || busy) return;
    // Consume the UI confirmation before dispatch so rapid repeated taps cannot buy twice.
    pending.current = undefined;
    progress(next.command);
    setQuote(undefined);
  };
  const inventory = [
    ...Object.entries(hero.inventory).map(([itemId]) => ({
      reference: { itemId } as OwnedItem,
      item: content.item(itemId),
      key: itemId,
      detail: `${hero.inventory[itemId]} in your pack`,
    })),
    ...Object.entries(hero.armors).map(([armorId, armor]) => ({
      reference: { armorId } as OwnedItem,
      item: content.item(armor.itemId),
      key: armorId,
      detail: `Armor copy ${armorId.slice(6)}`,
    })),
    ...Object.entries(hero.weapons).map(([weaponId, weapon], index) => ({
      reference: { weaponId } as OwnedItem,
      item: content.item(weapon.itemId),
      key: weaponId,
      detail: `Weapon ${index + 1} · ${weapon.durability}/${content.item(weapon.itemId).maxDurability} durability${weapon.durability === 0 ? ' · broken' : ''}`,
    })),
  ].filter(
    (entry) =>
      !['incompleteBook', 'titleCoupon'].includes(entry.item.kind) &&
      removableCount(hero, entry.reference) > 0,
  );
  const saleInventory = visibleInventoryRows(inventoryRows(hero, content), 'all', '');
  const saleStart = inventoryPage(salePage, saleInventory.length) * INVENTORY_PAGE_SIZE;
  const weapons = Object.entries(hero.weapons);
  const repairStart = inventoryPage(repairPage, weapons.length) * INVENTORY_PAGE_SIZE;
  const tradeStart = inventoryPage(tradePage, inventory.length) * INVENTORY_PAGE_SIZE;
  const questWarning = (itemId: string) =>
    questItemNeeds(hero, content, itemId)
      .map(
        ({ quest, objective, count }) =>
          `Needed for ${quest.name}: ${count}/${objective.target}. Spending this item can delay the quest.`,
      )
      .join(' ');

  return (
    <DungeonCard>
      <Text className="text-accent" style={styles.eyebrow}>
        {altar ? 'GODDESS SANCTUARY' : object.kind === 'healer' ? 'RECOVERY' : 'TOWN SERVICES'}
      </Text>
      <Text className="text-accent" accessibilityRole="header" style={styles.heading}>
        {shop?.name ?? object.name}
      </Text>
      <Text className="text-accent" accessibilityLiveRegion="polite" style={styles.gold}>
        {hero.gold} gold · {hero.health}/{stats.maxHealth} HP · {hero.mana}/{stats.maxMana} mana ·{' '}
        {hero.stamina}/{stats.maxStamina} stamina
      </Text>
      {enchanting && object.enchanting ? (
        <EnchantServicePanel
          session={session}
          objectId={objectId}
          busy={busy}
          progress={progress}
          back={() => setEnchanting(false)}
        />
      ) : quote ? (
        <DungeonCard className="bg-surface-tertiary">
          <Text className="text-foreground" style={styles.name}>
            {quote.label}
          </Text>
          <Text className="text-muted" style={styles.body}>
            {quote.detail}
          </Text>
          <Text className="text-accent" style={styles.gold}>
            {quote.goldChange > 0 ? `Receive ${quote.goldChange}` : `Cost ${-quote.goldChange}`}{' '}
            gold · After: {hero.gold + quote.goldChange} gold
          </Text>
          <Button
            label={altar ? 'Confirm offering and enter dungeon' : 'Confirm transaction'}
            disabled={
              busy || hero.gold + quote.goldChange < 0 || hero.gold + quote.goldChange > 1000000
            }
            onPress={confirm}
          />
          <Button label="Cancel" disabled={busy} onPress={cancel} />
        </DungeonCard>
      ) : (
        <>
          {object.enchanting ? (
            <Button
              label="Enchant equipment or burn for scrolls"
              disabled={busy}
              onPress={() => setEnchanting(true)}
            />
          ) : null}
          <TownQuestOffers session={session} objectId={objectId} busy={busy} progress={progress} />
          {object.lessons.length ? (
            <>
              <Text className="text-muted" style={styles.body}>
                Learn a skill at Rank F. Combat skills train in the dungeon; Enchant trains at the
                town forge.
                {object.lessons.some((lesson) => lesson.skillId === 'smash')
                  ? ' The introductory Smash lesson awards 3 AP once.'
                  : ''}
              </Text>
              {object.lessons.map((offer) => {
                const skill = content.skill(offer.skillId),
                  record = hero.learnedSkills[skill.id];
                return (
                  <DungeonCard key={skill.id}>
                    <View className="flex-row items-center gap-3">
                      <GameImage kind="skill" id={skill.id} />
                      <Text className="min-w-0 flex-1 text-foreground" style={styles.name}>
                        {skill.name} · {record ? `Rank ${record.rank}` : 'Rank F lesson'}
                      </Text>
                    </View>
                    <Text className="text-muted" style={styles.body}>
                      {skill.acquisitionHint} · {offer.fee} gold
                    </Text>
                    <Button
                      label={record ? 'Already learned' : `Learn ${skill.name} · ${offer.fee} gold`}
                      disabled={busy || !!record || hero.gold < offer.fee}
                      onPress={() => progress({ type: 'LEARN_SKILL', objectId, skillId: skill.id })}
                    />
                  </DungeonCard>
                );
              })}
            </>
          ) : null}
          {shop ? (
            <Tabs
              value={tradeTab}
              onValueChange={(next) => {
                setOpenOffer(undefined);
                onTradeTabChange(next);
              }}
              className="w-full gap-3"
            >
              <KeyboardChoiceGroup itemRole="tab" value={tradeTab}>
                <Tabs.List
                  accessibilityLabel="Shop inventory"
                  className="w-full border border-border bg-surface"
                >
                  <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
                  {(['Buy', 'Sell'] as const).map((label) => (
                    <Tabs.Trigger
                      key={label}
                      value={label.toLowerCase()}
                      accessibilityLabel={label}
                      className="min-h-12 flex-1"
                    >
                      <Tabs.Label>{label}</Tabs.Label>
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </KeyboardChoiceGroup>
              <Tabs.Content value="buy" className="gap-3">
                <Text className="text-accent" style={styles.section}>
                  Buy supplies
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {shopOffers(shop, content).map((offer) => {
                    const { itemId, price, quantity: bundleSize } = offer;
                    const item = content.item(itemId);
                    const owned = itemCount(hero, itemId);
                    const capacity = 999 - owned;
                    const maximum = Math.min(
                      Math.floor(capacity / bundleSize),
                      price > 0 ? Math.floor(hero.gold / price) : 999,
                    );
                    const key = `${itemId}:${bundleSize}`;
                    return (
                      <ShopItemPopover
                        key={key}
                        item={item}
                        owned={owned}
                        price={price}
                        bundleSize={bundleSize}
                        maximum={maximum}
                        busy={busy}
                        open={openOffer === key}
                        onOpenChange={(open) => setOpenOffer(open ? key : undefined)}
                        trade={(quantity) =>
                          progress({
                            type: 'BUY_ITEM',
                            objectId,
                            itemId,
                            quantity: quantity * bundleSize,
                            ...(bundleSize > 1 ? { bundleSize } : {}),
                          })
                        }
                      />
                    );
                  })}
                </View>
              </Tabs.Content>
              <Tabs.Content value="sell" className="gap-3">
                <Text className="text-accent" style={styles.section}>
                  Your inventory
                </Text>
                <Text className="text-muted" style={styles.body}>
                  {shop.buysItems
                    ? 'Sell spare items for half their purchase price. Equipped and locked items stay in your pack.'
                    : 'This merchant does not buy items. You can sell spare items at the general shop.'}
                </Text>
                {saleInventory.length === 0 ? (
                  <Text className="text-muted" style={styles.body}>
                    Your pack is empty.
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                  {saleInventory.slice(saleStart, saleStart + INVENTORY_PAGE_SIZE).map((row) => {
                    const price = Math.floor(row.item.price / 2);
                    const locked =
                      'weaponId' in row.reference
                        ? hero.weapons[row.reference.weaponId].locked
                        : 'armorId' in row.reference
                          ? hero.armors[row.reference.armorId].locked
                          : false;
                    const unavailableReason = !shop.buysItems
                      ? 'This merchant does not buy items.'
                      : row.equipped
                        ? 'Unequip this item before selling it.'
                        : locked
                          ? 'Unlock this item in Inventory before selling it.'
                          : row.item.kind === 'titleCoupon'
                            ? 'Keep title coupons for town redemption; they cannot be sold.'
                            : row.item.kind === 'incompleteBook'
                              ? 'Unfinished books cannot be sold.'
                              : undefined;
                    const maximum = unavailableReason
                      ? 0
                      : Math.min(
                          removableCount(hero, row.reference),
                          price > 0 ? Math.floor((1000000 - hero.gold) / price) : 999,
                        );
                    const key = `sell:${row.key}`;
                    return (
                      <ShopItemPopover
                        key={key}
                        item={row.item}
                        label={inventoryRowLabel(row)}
                        highlighted={row.equipped}
                        owned={itemCount(hero, row.item.id)}
                        detail={
                          row.durability !== undefined
                            ? `${row.durability}/${row.item.maxDurability} durability`
                            : undefined
                        }
                        warning={questWarning(row.item.id)}
                        price={price}
                        action="Sell"
                        maximum={maximum}
                        unavailableReason={unavailableReason ?? 'Your gold purse is full.'}
                        busy={busy}
                        open={openOffer === key}
                        onOpenChange={(open) => setOpenOffer(open ? key : undefined)}
                        trade={(quantity) =>
                          progress({ type: 'SELL_ITEM', objectId, item: row.reference, quantity })
                        }
                      />
                    );
                  })}
                </View>
                <InventoryPager
                  label="Sale items"
                  page={inventoryPage(salePage, saleInventory.length)}
                  count={saleInventory.length}
                  disabled={busy}
                  onPage={setSalePage}
                />
              </Tabs.Content>
            </Tabs>
          ) : null}
          {shop?.kind === 'blacksmith' ? (
            <>
              <Text className="text-accent" style={styles.section}>
                Repair weapons
              </Text>
              {Object.keys(hero.weapons).length === 0 ? (
                <Text className="text-muted" style={styles.body}>
                  Your pack has no weapons to repair.
                </Text>
              ) : null}
              {weapons
                .slice(repairStart, repairStart + INVENTORY_PAGE_SIZE)
                .map(([weaponId, weapon], offset) => {
                  const index = repairStart + offset;
                  const item = content.item(weapon.itemId);
                  const cost = repairPrice(weapon, content);
                  const repaired = weapon.durability === item.maxDurability;
                  return (
                    <DungeonCard key={weaponId}>
                      <GameImage kind="item" id={item.id} />
                      <Text className="text-foreground" style={styles.name}>
                        {item.name} · Weapon {index + 1}
                        {hero.equipment.weapon === weaponId ? ' · equipped' : ''}
                      </Text>
                      <Text className="text-muted" style={styles.body}>
                        {weapon.durability}/{item.maxDurability} durability
                        {weapon.durability === 0 ? ' · broken, no stat bonus' : ''}
                      </Text>
                      <Button
                        label={repaired ? 'Fully repaired' : `Repair for ${cost} gold`}
                        disabled={busy || repaired || hero.gold < cost}
                        onPress={() =>
                          choose({
                            command: { type: 'REPAIR_WEAPON', objectId, weaponId },
                            label: `Repair ${item.name}?`,
                            goldChange: -cost,
                            detail: `Restore durability to ${item.maxDurability}/${item.maxDurability}.`,
                          })
                        }
                      />
                    </DungeonCard>
                  );
                })}
              <InventoryPager
                label="Repair weapons"
                page={inventoryPage(repairPage, weapons.length)}
                count={weapons.length}
                disabled={busy}
                onPage={setRepairPage}
              />
            </>
          ) : null}
          {object.kind === 'healer' ? (
            <>
              <Text className="text-muted" style={styles.body}>
                The healer restores all resources, removes wounds, and restores fullness. Treatment
                costs {object.healingCost} gold.
              </Text>
              <Button
                label={`Receive treatment · ${object.healingCost} gold`}
                disabled={
                  busy ||
                  hero.gold < object.healingCost! ||
                  (hero.health === stats.maxHealth &&
                    hero.mana === stats.maxMana &&
                    hero.stamina === stats.maxStamina &&
                    hero.wounds === 0 &&
                    hero.fullness === 100)
                }
                onPress={() =>
                  choose({
                    command: { type: 'HEAL', objectId },
                    label: 'Receive treatment?',
                    goldChange: -object.healingCost!,
                    detail: `HP ${hero.health} → ${stats.maxHealth}; mana ${hero.mana} → ${stats.maxMana}; stamina ${hero.stamina} → ${stats.maxStamina}; wounds ${hero.wounds} → 0; fullness ${hero.fullness} → 100%. Weapon durability is unchanged.`,
                  })
                }
              />
              {hero.gold < object.healingCost! ? (
                <Text className="text-muted" style={styles.body}>
                  You need more gold for treatment. You can sell spare items at the general shop.
                </Text>
              ) : null}
            </>
          ) : null}
          {altar ? (
            <>
              <Text className="text-accent" style={styles.section}>
                Choose an offering
              </Text>
              <Text className="text-muted" style={styles.body}>
                Offer one unequipped item. The goddess consumes it and opens the moss depths. All
                offerings lead to the same dungeon.
              </Text>
              {inventory.length === 0 ? (
                <Text className="text-muted" style={styles.body}>
                  No unequipped items available. Unequip equipment or find loot in the moss halls.
                </Text>
              ) : null}
              {inventory.slice(tradeStart, tradeStart + INVENTORY_PAGE_SIZE).map((entry) => (
                <DungeonCard key={entry.key}>
                  <GameImage kind="item" id={entry.item.id} />
                  <Text className="text-foreground" style={styles.name}>
                    {entry.item.name}
                  </Text>
                  <Text className="text-muted" style={styles.body}>
                    {entry.detail}
                  </Text>
                  <Button
                    label={`Offer ${entry.item.name}`}
                    disabled={busy}
                    onPress={() =>
                      choose({
                        command: { type: 'OFFER_ITEM', objectId, item: entry.reference },
                        label: `Offer ${entry.item.name}?`,
                        goldChange: 0,
                        detail: `${entry.detail}. One copy will be permanently consumed to begin a new dungeon run. ${questWarning(entry.item.id)}`,
                      })
                    }
                  />
                </DungeonCard>
              ))}
              <InventoryPager
                label="Offerings"
                page={inventoryPage(tradePage, inventory.length)}
                count={inventory.length}
                disabled={busy}
                onPage={setTradePage}
              />
            </>
          ) : null}
        </>
      )}
      <Button
        label={altar ? 'Leave altar' : 'Close services'}
        disabled={busy}
        onPress={() => dispatch({ type: 'CLOSE_SERVICE' })}
      />
    </DungeonCard>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, letterSpacing: 2 },
  heading: { fontSize: 26 },
  section: { fontSize: 18, marginTop: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 13, lineHeight: 21 },
  gold: { fontSize: 13, lineHeight: 22 },
});

export default function TownServicePanel(
  props: Omit<Parameters<typeof TownServicePanelLoaded>[0], 'tradeTab' | 'onTradeTabChange'>,
) {
  const [tradeTab, setTradeTab] = useState('buy');
  return (
    <FeatureGate session={props.session} features={['inventory', 'equipment', 'skills', 'quests']}>
      <TownServicePanelLoaded {...props} tradeTab={tradeTab} onTradeTabChange={setTradeTab} />
    </FeatureGate>
  );
}
