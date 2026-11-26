export const equipmentSlots = {
  headgear: "Headgear",
  armor: "Armor",
  accessory_1: "Acc 1",
  accessory_2: "Acc 2",
  gloves: "Gloves",
  shoes: "Shoes",
  main_hand: "Main Hand",
  off_hand: "Offhand",
} as const;

export type EquipmentSlot = keyof typeof equipmentSlots;

export interface InventoryItem {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  quantity: number;
  stackLimit: number;
  slot?: string;
  accessorySlot?: "accessory_1" | "accessory_2";
  equipped?: boolean;
  durability?: number;
}
export interface Inventory {
  width: number;
  height: number;
  items: InventoryItem[];
}

export function equipmentSlot(
  item: Pick<InventoryItem, "slot" | "accessorySlot">,
): EquipmentSlot | undefined {
  if (item.slot === "accessory")
    return item.accessorySlot === "accessory_2" ? "accessory_2" : "accessory_1";
  if (item.slot && Object.hasOwn(equipmentSlots, item.slot))
    return item.slot as EquipmentSlot;
}

type ItemFootprint = Pick<
  InventoryItem,
  "id" | "x" | "y" | "width" | "height" | "equipped"
>;

export function canPlace(
  inventory: Pick<Inventory, "width" | "height"> & {
    items: readonly ItemFootprint[];
  },
  item: Pick<ItemFootprint, "id" | "width" | "height">,
  x: number,
  y: number,
) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x + item.width > inventory.width ||
    y + item.height > inventory.height
  )
    return false;
  return inventory.items.every(
    (other) =>
      other.id === item.id ||
      other.equipped ||
      x + item.width <= other.x ||
      other.x + other.width <= x ||
      y + item.height <= other.y ||
      other.y + other.height <= y,
  );
}
export function moveItem(
  inventory: Inventory,
  id: string,
  x: number,
  y: number,
) {
  const item = inventory.items.find((value) => value.id === id);
  if (!item || item.equipped || !canPlace(inventory, item, x, y)) return false;
  item.x = x;
  item.y = y;
  return true;
}
export function addItem(inventory: Inventory, item: InventoryItem) {
  if (
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0 ||
    item.quantity > item.stackLimit ||
    inventory.items.some((existing) => existing.id === item.id)
  )
    return false;
  for (let y = 0; y < inventory.height; y++)
    for (let x = 0; x < inventory.width; x++)
      if (canPlace(inventory, item, x, y)) {
        inventory.items.push({ ...item, x, y });
        return true;
      }
  return false;
}
export function equipItem(inventory: Inventory, id: string) {
  const item = inventory.items.find((value) => value.id === id);
  if (!item) return false;
  const wornAt = (slot: EquipmentSlot) =>
    inventory.items.find(
      (value) => value.equipped && equipmentSlot(value) === slot,
    );
  const accessorySlot = item.slot === "accessory"
    ? wornAt("accessory_1") && !wornAt("accessory_2")
      ? "accessory_2"
      : "accessory_1"
    : undefined;
  const slot = accessorySlot ?? equipmentSlot(item);
  if (!slot) return false;
  if (item.equipped) return true;
  const old = wornAt(slot);
  if (old) {
    if (
      !canPlace(
        {
          ...inventory,
          items: inventory.items.filter((value) => value.id !== item.id),
        },
        old,
        item.x,
        item.y,
      )
    )
      return false;
    old.equipped = false;
    delete old.accessorySlot;
    old.x = item.x;
    old.y = item.y;
  }
  if (accessorySlot) item.accessorySlot = accessorySlot;
  item.equipped = true;
  return true;
}
export function removeItem(inventory: Inventory, id: string, quantity = 1) {
  const item = inventory.items.find((value) => value.id === id);
  if (
    !item ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > item.quantity
  )
    return false;
  item.quantity -= quantity;
  if (!item.quantity)
    inventory.items = inventory.items.filter((value) => value.id !== id);
  return true;
}
