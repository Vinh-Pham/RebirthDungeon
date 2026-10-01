export function consumeItem(inventory: Record<string, number>, itemId: string) {
  if (!inventory[itemId]) throw new Error('Item is not in inventory');
  if (--inventory[itemId] === 0) delete inventory[itemId];
}
