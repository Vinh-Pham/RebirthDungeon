import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { JourneySession } from '../../game/JourneySession';
import type { GameCommand } from '../../engine/commands';
import { heroStats, itemCount, removableCount, repairPrice, type OwnedItem } from '../../engine/rpg/Character';
import InventoryPager, { INVENTORY_PAGE_SIZE, inventoryPage } from './InventoryPager';

function Button({ label, accessibilityLabel = label, disabled = false, onPress }: { label: string; accessibilityLabel?: string; disabled?: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function TradeRow({ name, detail, price, maximum, verb, disabled, choose }: {
  name: string; detail: string; price: number; maximum: number; verb: string; disabled: boolean; choose(quantity: number): void;
}) {
  const [quantity, setQuantity] = useState(1);
  const count = Math.max(1, Math.min(quantity, maximum));
  return <View style={styles.row}><Text style={styles.name}>{name}</Text><Text style={styles.body}>{detail}</Text>
    <Text style={styles.body}>{price} gold each · Total {price * count} gold</Text>
    <View style={styles.actions}>
      <Button label="−" accessibilityLabel={`${verb} fewer ${name}`} disabled={disabled || count <= 1} onPress={() => setQuantity(count - 1)} />
      <Text accessibilityLiveRegion="polite" style={styles.quantity}>×{count}</Text>
      <Button label="+" accessibilityLabel={`${verb} more ${name}`} disabled={disabled || count >= maximum} onPress={() => setQuantity(count + 1)} />
    </View>
    <Button label={`${verb} ${name} ×${count}`} disabled={disabled || maximum < 1} onPress={() => choose(count)} />
  </View>;
}
type Quote = { command: GameCommand; label: string; goldChange: number; detail: string };

export default function TownServicePanel({ session, objectId, busy, dispatch }: {
  session: JourneySession; objectId: string; busy: boolean; dispatch(command: GameCommand): boolean;
}) {
  const [quote, setQuote] = useState<Quote>();
  const [repairPage, setRepairPage] = useState(0);
  const [tradePage, setTradePage] = useState(0);
  const pending = useRef<Quote | undefined>(undefined);
  const { state, map } = session.getSnapshot(); const hero = state.hero; const content = session.content;
  const object = map.objects.find((entry) => entry.id === objectId)!;
  const shop = content.data.shops.find((entry) => entry.id === object.shopId);
  const altar = object.kind === 'altar' || object.kind === 'dungeonEntrance';
  const stats = heroStats(hero, content);
  const choose = (next: Quote) => { pending.current = next; setQuote(next); };
  const cancel = () => { pending.current = undefined; setQuote(undefined); };
  const confirm = () => {
    const next = pending.current;
    if (!next || busy) return;
    // Consume the UI confirmation before dispatch so rapid repeated taps cannot buy twice.
    pending.current = undefined;
    dispatch(next.command); setQuote(undefined);
  };
  const inventory = [
    ...Object.entries(hero.inventory).map(([itemId]) => ({ reference: { itemId } as OwnedItem, item: content.item(itemId), key: itemId, detail: `${hero.inventory[itemId]} in your pack` })),
    ...Object.entries(hero.weapons).map(([weaponId, weapon], index) => ({ reference: { weaponId } as OwnedItem, item: content.item(weapon.itemId), key: weaponId,
      detail: `Weapon ${index + 1} · ${weapon.durability}/${content.item(weapon.itemId).maxDurability} durability${weapon.durability === 0 ? ' · broken' : ''}` })),
  ].filter((entry) => removableCount(hero, entry.reference) > 0);
  const weapons = Object.entries(hero.weapons);
  const repairStart = inventoryPage(repairPage, weapons.length) * INVENTORY_PAGE_SIZE;
  const tradeStart = inventoryPage(tradePage, inventory.length) * INVENTORY_PAGE_SIZE;

  return <View style={styles.panel}>
    <Text style={styles.eyebrow}>{altar ? 'GODDESS SANCTUARY' : object.kind === 'healer' ? 'RECOVERY' : 'TOWN SERVICES'}</Text>
    <Text accessibilityRole="header" style={styles.heading}>{shop?.name ?? object.name}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.gold}>{hero.gold} gold · {hero.health}/{stats.maxHealth} HP · {hero.mana}/{stats.maxMana} mana · {hero.stamina}/{stats.maxStamina} stamina</Text>
    {quote ? <View style={styles.confirmation}>
      <Text style={styles.name}>{quote.label}</Text><Text style={styles.body}>{quote.detail}</Text>
      <Text style={styles.gold}>{quote.goldChange > 0 ? `Receive ${quote.goldChange}` : `Cost ${-quote.goldChange}`} gold · After: {hero.gold + quote.goldChange} gold</Text>
      <Button label={altar ? 'Confirm offering and enter dungeon' : 'Confirm transaction'} disabled={busy || hero.gold + quote.goldChange < 0 || hero.gold + quote.goldChange > 1000000} onPress={confirm} />
      <Button label="Cancel" disabled={busy} onPress={cancel} />
    </View> : <>
      {shop ? <><Text style={styles.section}>Buy supplies</Text>{shop.items.map((itemId) => {
        const item = content.item(itemId); const capacity = 999 - itemCount(hero, itemId);
        const maximum = Math.min(capacity, item.price > 0 ? Math.floor(hero.gold / item.price) : 999);
        return <TradeRow key={itemId} name={item.name} detail={`${item.description} · ${itemCount(hero, itemId)} owned`} price={item.price} maximum={maximum} verb="Buy" disabled={busy}
          choose={(quantity) => choose({ command: { type: 'BUY_ITEM', objectId, itemId, quantity }, label: `Buy ${item.name} ×${quantity}?`, goldChange: -item.price * quantity,
            detail: item.kind === 'weapon' ? 'Each weapon has its own durability and arrives fully repaired.' : item.description })} />;
      })}</> : null}
      {shop?.kind === 'blacksmith' ? <><Text style={styles.section}>Repair weapons</Text>
        {Object.keys(hero.weapons).length === 0 ? <Text style={styles.body}>Your pack has no weapons to repair.</Text> : null}
        {weapons.slice(repairStart, repairStart + INVENTORY_PAGE_SIZE).map(([weaponId, weapon], offset) => {
          const index = repairStart + offset;
          const item = content.item(weapon.itemId); const cost = repairPrice(weapon, content); const repaired = weapon.durability === item.maxDurability;
          return <View key={weaponId} style={styles.row}><Text style={styles.name}>{item.name} · Weapon {index + 1}{hero.equipment.weapon === weaponId ? ' · equipped' : ''}</Text>
            <Text style={styles.body}>{weapon.durability}/{item.maxDurability} durability{weapon.durability === 0 ? ' · broken, no stat bonus' : ''}</Text>
            <Button label={repaired ? 'Fully repaired' : `Repair for ${cost} gold`} disabled={busy || repaired || hero.gold < cost}
              onPress={() => choose({ command: { type: 'REPAIR_WEAPON', objectId, weaponId }, label: `Repair ${item.name}?`, goldChange: -cost, detail: `Restore durability to ${item.maxDurability}/${item.maxDurability}.` })} />
          </View>;
        })}<InventoryPager label="Repair weapons" page={inventoryPage(repairPage, weapons.length)} count={weapons.length} disabled={busy} onPage={setRepairPage} /></> : null}
      {object.kind === 'healer' ? <>
        <Text style={styles.body}>The healer restores all resources, removes wounds, and restores fullness. Treatment costs {object.healingCost} gold.</Text>
        <Button label={`Receive treatment · ${object.healingCost} gold`} disabled={busy || hero.gold < object.healingCost! || (hero.health === stats.maxHealth && hero.mana === stats.maxMana && hero.stamina === stats.maxStamina && hero.wounds === 0 && hero.fullness === 100)}
          onPress={() => choose({ command: { type: 'HEAL', objectId }, label: 'Receive treatment?', goldChange: -object.healingCost!, detail: 'Restore all resources, clear wounds and hunger. Weapon durability is unchanged.' })} />
        {hero.gold < object.healingCost! ? <Text style={styles.body}>You need more gold for treatment. You can sell spare items at the general shop.</Text> : null}
      </> : null}
      {altar || shop?.buysItems ? <><Text style={styles.section}>{altar ? 'Choose an offering' : 'Sell spare items'}</Text>
        <Text style={styles.body}>{altar ? 'Offer one unequipped item. The goddess consumes it and opens the moss depths. All offerings lead to the same dungeon.' : 'The general shop pays half the item’s purchase price. Equipped copies stay in your pack.'}</Text>
        {inventory.length === 0 ? <Text style={styles.body}>No unequipped items available. Unequip equipment or find loot in the moss halls.</Text> : null}
        {inventory.slice(tradeStart, tradeStart + INVENTORY_PAGE_SIZE).map((entry) => altar ? <View key={entry.key} style={styles.row}>
          <Text style={styles.name}>{entry.item.name}</Text><Text style={styles.body}>{entry.detail}</Text>
          <Button label={`Offer ${entry.item.name}`} disabled={busy} onPress={() => choose({ command: { type: 'OFFER_ITEM', objectId, item: entry.reference }, label: `Offer ${entry.item.name}?`, goldChange: 0,
            detail: `${entry.detail}. One copy will be permanently consumed to begin a new dungeon run.` })} />
        </View> : <TradeRow key={entry.key} name={entry.item.name} detail={entry.detail} price={Math.floor(entry.item.price / 2)}
          maximum={Math.min(removableCount(hero, entry.reference), Math.floor(entry.item.price / 2) > 0 ? Math.floor((1000000 - hero.gold) / Math.floor(entry.item.price / 2)) : 999)} verb="Sell" disabled={busy}
          choose={(quantity) => choose({ command: { type: 'SELL_ITEM', objectId, item: entry.reference, quantity }, label: `Sell ${entry.item.name} ×${quantity}?`, goldChange: Math.floor(entry.item.price / 2) * quantity, detail: entry.detail })} />)}
        <InventoryPager label={altar ? 'Offerings' : 'Sale items'} page={inventoryPage(tradePage, inventory.length)} count={inventory.length} disabled={busy} onPage={setTradePage} />
      </> : null}
    </>}
    <Button label={altar ? 'Leave altar' : 'Close services'} disabled={busy} onPress={() => dispatch({ type: 'CLOSE_SERVICE' })} />
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 16, padding: 18, backgroundColor: '#182127', borderRadius: 8, borderWidth: 1, borderColor: '#65543b' },
  eyebrow: { color: '#a79474', fontSize: 10, letterSpacing: 2 }, heading: { color: '#e4d9c5', fontSize: 26 },
  section: { color: '#d0b987', fontSize: 18, marginTop: 8 }, name: { color: '#ddd6c8', fontSize: 15, fontWeight: '600' },
  body: { color: '#a3b1b2', fontSize: 13, lineHeight: 21 }, gold: { color: '#d0b987', fontSize: 13, lineHeight: 22 },
  row: { gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#344044' }, actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  quantity: { color: '#e4d9c5', fontSize: 16 }, confirmation: { gap: 14, backgroundColor: '#253035', padding: 16, borderRadius: 6 },
  button: { minWidth: 46, minHeight: 46, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#756244', borderRadius: 5, backgroundColor: '#263137' },
  buttonText: { color: '#e4d9c5', fontSize: 13, fontWeight: '600' }, disabled: { opacity: 0.4 }, pressed: { opacity: 0.7 },
});
