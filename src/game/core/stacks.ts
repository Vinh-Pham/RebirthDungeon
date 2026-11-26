import { addItem, type InventoryItem } from "../systems/inventory";
import type { Profile } from "./profile";

export const pouches = {
  gold_pouch_small: { name: "Small Gold Pouch", capacity: 10000, price: 1760 },
  gold_pouch_large: { name: "Large Gold Pouch", capacity: 50000, price: 9800 },
} as const;

export function pouchKind(id: string): keyof typeof pouches | undefined {
  const kind = id.split("#")[0];
  return Object.hasOwn(pouches, kind)
    ? (kind as keyof typeof pouches)
    : undefined;
}

export function syncStacks(profile: Profile) {
  let gold = profile.gold;
  const inventory = profile.inventory;
  for (const item of inventory.items) {
    const kind = pouchKind(item.id);
    if (!kind) continue;
    const pouch = pouches[kind];
    item.quantity = Math.min(gold, pouch.capacity) + 1;
    gold -= item.quantity - 1;
  }
  const stacks = [
    { id: "gold", label: "Gold", quantity: gold, limit: 1000 },
    {
      id: "cobweb",
      label: "Cobweb",
      quantity: profile.materials.cobweb,
      limit: 99,
    },
  ];
  for (const stack of stacks) {
    const prefix = `stack-${stack.id}-`;
    const required = Math.ceil(stack.quantity / stack.limit);
    if (required > inventory.width * inventory.height) return false;
    inventory.items = inventory.items.filter(
      (item) =>
        !item.id.startsWith(prefix) ||
        Number(item.id.slice(prefix.length)) < required,
    );
    for (let slot = 0; slot < required; slot++) {
      const id = prefix + slot;
      const quantity = Math.min(
        stack.quantity - slot * stack.limit,
        stack.limit,
      );
      const existing = inventory.items.find((item) => item.id === id);
      if (existing) existing.quantity = quantity;
      else if (
        !addItem(inventory, {
          id,
          name: stack.label,
          quantity,
          stackLimit: stack.limit,
          width: 1,
          height: 1,
          x: 0,
          y: 0,
        })
      )
        return false;
    }
  }
  return true;
}

export function addPouch(profile: Profile, id: keyof typeof pouches) {
  const pouch = pouches[id];
  if (!pouch || profile.gold < pouch.price) return false;
  let suffix = 1;
  while (profile.inventory.items.some((item) => item.id === `${id}#${suffix}`))
    suffix++;
  const item: InventoryItem = {
    id: `${id}#${suffix}`,
    name: pouch.name,
    width: 2,
    height: 2,
    x: 0,
    y: 0,
    quantity: 1,
    stackLimit: pouch.capacity + 1,
  };
  if (!addItem(profile.inventory, item)) return false;
  profile.gold -= pouch.price;
  return true;
}
