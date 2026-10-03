import type { ContentRegistry } from '../data/ContentRegistry';

export function validateItemHotbar(ids: readonly string[], content: ContentRegistry) {
  if (ids.length > 100 || new Set(ids).size !== ids.length) throw new Error('Invalid item hotbar');
  for (const id of ids) {
    const item = content.item(id);
    if (item.kind !== 'consumable' || !item.battleUsable)
      throw new Error('Only battle consumables belong in the item hotbar');
  }
}

/** Assignments survive depletion; adding requires an owned, battle-usable supply. */
export function setItemHotbar(
  hero: { inventory: Record<string, number>; itemHotbar: string[] },
  itemId: string,
  assigned: boolean,
  content: ContentRegistry,
) {
  validateItemHotbar([itemId], content);
  if (assigned && !hero.inventory[itemId]) throw new Error('Item is not in inventory');
  const next = hero.itemHotbar.filter((id) => id !== itemId);
  if (assigned)
    next.splice(
      hero.itemHotbar.includes(itemId) ? hero.itemHotbar.indexOf(itemId) : next.length,
      0,
      itemId,
    );
  validateItemHotbar(next, content);
  hero.itemHotbar = next;
}

export function consumeItem(inventory: Record<string, number>, itemId: string) {
  if (!inventory[itemId]) throw new Error('Item is not in inventory');
  if (--inventory[itemId] === 0) delete inventory[itemId];
}
