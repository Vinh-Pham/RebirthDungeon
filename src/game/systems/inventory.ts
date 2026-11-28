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
  handSlot?: "main_hand" | "off_hand";
  equipped?: boolean;
  durability?: number;
}
export interface Inventory {
  width: number;
  height: number;
  items: InventoryItem[];
}
export interface EquipOptions {
  targetSlot?: "main_hand" | "off_hand";
  canOffHand?: boolean;
  twoHanded?: boolean;
  isOneHandedSword?: (item: InventoryItem) => boolean;
  isTwoHanded?: (item: InventoryItem) => boolean;
}

export function equipmentSlot(
  item: Pick<InventoryItem, "slot" | "accessorySlot" | "handSlot">,
): EquipmentSlot | undefined {
  if (item.slot === "accessory")
    return item.accessorySlot === "accessory_2" ? "accessory_2" : "accessory_1";
  if (item.slot === "main_hand" && item.handSlot) return item.handSlot;
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
function findPlacement(
  inventory: Pick<Inventory, "width" | "height"> & { items: readonly ItemFootprint[] },
  item: Pick<ItemFootprint, "id" | "width" | "height">,
  preferredX?: number,
  preferredY?: number,
) {
  if (preferredX !== undefined && preferredY !== undefined && canPlace(inventory, item, preferredX, preferredY)) {
    return { x: preferredX, y: preferredY };
  }
  for (let y = 0; y < inventory.height; y++) {
    for (let x = 0; x < inventory.width; x++) {
      if (canPlace(inventory, item, x, y)) return { x, y };
    }
  }
  return null;
}

export function equipItem(inventory: Inventory, id: string, options?: EquipOptions) {
  const item = inventory.items.find((value) => value.id === id);
  if (!item) return false;
  const wornAt = (slot: EquipmentSlot) =>
    inventory.items.find((value) => value.equipped && equipmentSlot(value) === slot);
  const accessorySlot =
    item.slot === "accessory"
      ? wornAt("accessory_1") && !wornAt("accessory_2")
        ? "accessory_2"
        : "accessory_1"
      : undefined;
  let slot: EquipmentSlot | undefined;
  if (accessorySlot) {
    slot = accessorySlot;
  } else if (item.slot === "main_hand") {
    if (options?.targetSlot === "off_hand" && options.canOffHand) {
      slot = "off_hand";
    } else if (
      !options?.targetSlot &&
      options?.canOffHand &&
      !options.twoHanded &&
      wornAt("main_hand") &&
      !wornAt("off_hand") &&
      options.isOneHandedSword?.(wornAt("main_hand")!)
    ) {
      slot = "off_hand";
    } else {
      slot = "main_hand";
    }
  } else {
    slot = equipmentSlot(item);
  }
  if (!slot) return false;
  if (item.equipped && equipmentSlot(item) === slot) return true;

  const toRemove: InventoryItem[] = [];
  const old = wornAt(slot);
  if (old && old.id !== item.id) toRemove.push(old);
  if (slot === "main_hand" && options?.twoHanded) {
    const off = wornAt("off_hand");
    if (off && off.id !== item.id && !toRemove.includes(off)) toRemove.push(off);
  }
  if (slot === "off_hand") {
    const main = wornAt("main_hand");
    if (main && main.id !== item.id && options?.isTwoHanded?.(main) && !toRemove.includes(main)) {
      toRemove.push(main);
    }
  }

  const removeIds = new Set(toRemove.map((entry) => entry.id));
  const stagedItems: InventoryItem[] = inventory.items
    .filter((value) => value.id !== item.id && !removeIds.has(value.id))
    .map((value) => ({ ...value }));
  const placements = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < toRemove.length; i++) {
    const displaced = toRemove[i];
    const point = findPlacement(
      { width: inventory.width, height: inventory.height, items: stagedItems },
      displaced,
      i === 0 && !item.equipped ? item.x : undefined,
      i === 0 && !item.equipped ? item.y : undefined,
    );
    if (!point) return false;
    placements.set(displaced.id, point);
    stagedItems.push({ ...displaced, equipped: false, x: point.x, y: point.y });
  }

  for (const displaced of toRemove) {
    const point = placements.get(displaced.id)!;
    displaced.equipped = false;
    delete displaced.accessorySlot;
    delete displaced.handSlot;
    displaced.x = point.x;
    displaced.y = point.y;
  }
  delete item.accessorySlot;
  delete item.handSlot;
  if (accessorySlot) item.accessorySlot = accessorySlot;
  if (item.slot === "main_hand" && (slot === "main_hand" || slot === "off_hand")) item.handSlot = slot;
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
