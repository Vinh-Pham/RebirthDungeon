import type { ItemDefinition } from '../../data/schemas/content';
import type { ContentRegistry } from '../../engine/data/ContentRegistry';
import type { Hero, OwnedItem } from '../../engine/rpg/Character';
import type { BattleView } from '../../game/BattleSession';

export type InventoryFilter = 'all' | 'supplies' | 'equipment' | 'books';
export interface InventoryRow {
  key: string;
  reference: OwnedItem;
  item: ItemDefinition;
  quantity: number;
  equipped: boolean;
  durability?: number;
}

/** A view of the battle copy or the campaign pack; never creates item ownership. */
export function inventoryRows(hero: Hero, content: ContentRegistry, battle?: BattleView['inventory']): InventoryRow[] {
  return [
    ...Object.entries(battle?.items ?? hero.inventory).map(([itemId, quantity]) => ({ key: `item:${itemId}`, reference: { itemId }, item: content.item(itemId), quantity, equipped: false })),
    ...Object.entries(hero.armors).map(([armorId, armor]) => ({ key: `armor:${armorId}`, reference: { armorId }, item: content.item(armor.itemId), quantity: 1, equipped: hero.equipment.armor === armorId })),
    ...Object.entries(hero.weapons).map(([weaponId, weapon]) => ({ key: `weapon:${weaponId}`, reference: { weaponId }, item: content.item(weapon.itemId), quantity: 1, equipped: hero.equipment.weapon === weaponId,
      durability: battle?.weapon?.id === weaponId ? battle.weapon.durability : weapon.durability })),
  ];
}

export function visibleInventoryRows(rows: readonly InventoryRow[], filter: InventoryFilter, search: string) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matches = filter === 'all' || (filter === 'supplies' ? ['consumable', 'enchantScroll', 'material'].includes(row.item.kind) : filter === 'equipment' ? ['weapon', 'armor'].includes(row.item.kind) : ['skillBook', 'incompleteBook', 'skillPage'].includes(row.item.kind));
    return matches && (!query || `${row.item.name} ${row.item.id} ${'itemId' in row.reference ? '' : Object.values(row.reference)[0]}`.toLowerCase().includes(query));
  }).sort((left, right) => left.item.name.localeCompare(right.item.name) || left.key.localeCompare(right.key, undefined, { numeric: true }));
}

export function inventoryRowLabel(row: InventoryRow) {
  return `${row.item.name}${'itemId' in row.reference ? ` ×${row.quantity}` : ` · Copy ${Object.values(row.reference)[0].split('-')[1]}`}${row.equipped ? ' · equipped' : ''}`;
}
