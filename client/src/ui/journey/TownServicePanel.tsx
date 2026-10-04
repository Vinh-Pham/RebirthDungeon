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
import { purchasePrice, shopOffers } from '../../engine/world/Shop';

function TradeRow({
  itemId,
  name,
  detail,
  price,
  bundleSize = 1,
  maximum,
  verb,
  disabled,
  choose,
}: {
  itemId: string;
  name: string;
  detail: string;
  price: number;
  bundleSize?: number;
  maximum: number;
  verb: string;
  disabled: boolean;
  choose(quantity: number): void;
}) {
  const [quantity, setQuantity] = useState(1);
  const count = Math.max(1, Math.min(quantity, maximum));
  return (
    <DungeonCard>
      <View className="flex-row items-center gap-3">
        <GameImage kind="item" id={itemId} />
        <Text className="min-w-0 flex-1 text-foreground" style={styles.name}>
          {name}
        </Text>
      </View>
      <Text className="text-muted" style={styles.body}>
        {detail}
      </Text>
      <Text className="text-muted" style={styles.body}>
        {price} gold {bundleSize > 1 ? 'per bundle' : 'each'} · Total {price * count} gold
      </Text>
      <View style={styles.actions}>
        <Button
          label="−"
          accessibilityLabel={`${verb} fewer ${name}`}
          disabled={disabled || count <= 1}
          onPress={() => setQuantity(count - 1)}
        />
        <Text className="text-foreground" accessibilityLiveRegion="polite" style={styles.quantity}>
          ×{count}
        </Text>
        <Button
          label="+"
          accessibilityLabel={`${verb} more ${name}`}
          disabled={disabled || count >= maximum}
          onPress={() => setQuantity(count + 1)}
        />
      </View>
      <Button
        label={`${verb} ${name} ×${count}`}
        disabled={disabled || maximum < 1}
        onPress={() => choose(count)}
      />
    </DungeonCard>
  );
}
type Quote = { command: ProgressionCommand; label: string; goldChange: number; detail: string };

function TownServicePanelLoaded({
  session,
  objectId,
  busy,
  dispatch,
  progress,
}: {
  session: JourneySession;
  objectId: string;
  busy: boolean;
  dispatch(command: GameCommand): boolean;
  progress(command: ProgressionCommand): void;
}) {
  const [enchanting, setEnchanting] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [repairPage, setRepairPage] = useState(0);
  const [tradePage, setTradePage] = useState(0);
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
            <>
              <Text className="text-accent" style={styles.section}>
                Buy supplies
              </Text>
              {shopOffers(shop, content).map((offer) => {
                const { itemId, price, quantity: bundleSize } = offer;
                const item = content.item(itemId);
                const capacity = 999 - itemCount(hero, itemId);
                const maximum = Math.min(
                  Math.floor(capacity / bundleSize),
                  price > 0 ? Math.floor(hero.gold / price) : 999,
                );
                return (
                  <TradeRow
                    itemId={itemId}
                    key={`${itemId}:${bundleSize}`}
                    name={`${item.name}${bundleSize > 1 ? ` x${bundleSize}` : ''}`}
                    detail={`${item.description} · ${itemCount(hero, itemId)} owned`}
                    price={price}
                    bundleSize={bundleSize}
                    maximum={maximum}
                    verb="Buy"
                    disabled={busy}
                    choose={(quantity) =>
                      choose({
                        command: {
                          type: 'BUY_ITEM',
                          objectId,
                          itemId,
                          quantity: quantity * bundleSize,
                          ...(bundleSize > 1 ? { bundleSize } : {}),
                        },
                        label: `Buy ${item.name} ×${quantity * bundleSize}?`,
                        goldChange: -purchasePrice(
                          shop,
                          content,
                          itemId,
                          quantity * bundleSize,
                          bundleSize,
                        ),
                        detail:
                          item.kind === 'weapon'
                            ? 'Each weapon has its own durability and arrives fully repaired.'
                            : item.description,
                      })
                    }
                  />
                );
              })}
            </>
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
          {altar || shop?.buysItems ? (
            <>
              <Text className="text-accent" style={styles.section}>
                {altar ? 'Choose an offering' : 'Sell spare items'}
              </Text>
              <Text className="text-muted" style={styles.body}>
                {altar
                  ? 'Offer one unequipped item. The goddess consumes it and opens the moss depths. All offerings lead to the same dungeon.'
                  : 'The general shop pays half the item’s purchase price. Equipped and locked copies stay in your pack.'}
              </Text>
              {inventory.length === 0 ? (
                <Text className="text-muted" style={styles.body}>
                  No unequipped items available. Unequip equipment or find loot in the moss halls.
                </Text>
              ) : null}
              {inventory.slice(tradeStart, tradeStart + INVENTORY_PAGE_SIZE).map((entry) =>
                altar ? (
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
                ) : (
                  <TradeRow
                    itemId={entry.item.id}
                    key={entry.key}
                    name={entry.item.name}
                    detail={entry.detail}
                    price={Math.floor(entry.item.price / 2)}
                    maximum={Math.min(
                      removableCount(hero, entry.reference),
                      Math.floor(entry.item.price / 2) > 0
                        ? Math.floor((1000000 - hero.gold) / Math.floor(entry.item.price / 2))
                        : 999,
                    )}
                    verb="Sell"
                    disabled={busy}
                    choose={(quantity) =>
                      choose({
                        command: { type: 'SELL_ITEM', objectId, item: entry.reference, quantity },
                        label: `Sell ${entry.item.name} ×${quantity}?`,
                        goldChange: Math.floor(entry.item.price / 2) * quantity,
                        detail: `${entry.detail}. ${questWarning(entry.item.id)}`,
                      })
                    }
                  />
                ),
              )}
              <InventoryPager
                label={altar ? 'Offerings' : 'Sale items'}
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
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  quantity: { fontSize: 16 },
});

export default function TownServicePanel(props: Parameters<typeof TownServicePanelLoaded>[0]) {
  return (
    <FeatureGate session={props.session} features={['inventory', 'equipment', 'skills', 'quests']}>
      <TownServicePanelLoaded {...props} />
    </FeatureGate>
  );
}
