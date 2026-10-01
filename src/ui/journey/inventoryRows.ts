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
    ...Object.entries(battle?.items ?? hero.inventory).map(([itemId, quantity]) => ({ key: `item:${itemId}`, reference: { itemId }, item: content.item(itemId), quantity, equipped: hero.equipment.armor === itemId })),
    ...Object.entries(hero.weapons).map(([weaponId, weapon]) => ({ key: `weapon:${weaponId}`, reference: { weaponId }, item: content.item(weapon.itemId), quantity: 1, equipped: hero.equipment.weapon === weaponId,
      durability: battle?.weapon?.id === weaponId ? battle.weapon.durability : weapon.durability })),
  ];
}

export function visibleInventoryRows(rows: readonly InventoryRow[], filter: InventoryFilter, search: string) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matches = filter === 'all' || (filter === 'supplies' ? row.item.kind === 'consumable' : filter === 'equipment' ? ['weapon', 'armor'].includes(row.item.kind) : ['skillBook', 'incompleteBook', 'skillPage'].includes(row.item.kind));
    return matches && (!query || `${row.item.name} ${row.item.id} ${'weaponId' in row.reference ? row.reference.weaponId : ''}`.toLowerCase().includes(query));
  }).sort((left, right) => left.item.name.localeCompare(right.item.name) || left.key.localeCompare(right.key, undefined, { numeric: true }));
}

export function inventoryRowLabel(row: InventoryRow) {
  return `${row.item.name}${'weaponId' in row.reference ? ` · Copy ${row.reference.weaponId.slice(7)}` : ` ×${row.quantity}`}${row.equipped ? ' · equipped' : ''}`;
}
