import { produce, type Immutable } from 'immer';
import { items } from './catalog';
import {
    emptyEquipment,
    equipmentSlots,
    type Character,
    type EquipmentSlot,
    type EquipmentLoadout,
    type InventoryAnchor,
    type Item,
} from './model';

export const backpack = { columns: 6, rows: 10 };
export const slotLabels: Record<EquipmentSlot, string> = {
    accessory1: 'Accessory 1',
    head: 'Headgear',
    accessory2: 'Accessory 2',
    main: 'Right hand',
    body: 'Body',
    offhand: 'Left hand',
    gloves: 'Gloves',
    boots: 'Boots',
    robe: 'Robe',
};
export const footprint = (kind: string) => items[kind].footprint!;
export const equippedSlot = (c: Immutable<Character>, id: string) =>
    equipmentSlots.find((slot) => c.equipment[slot] === id);
export function raceReason(c: Pick<Character, 'race'>, kind: string) {
    const races = items[kind].races;
    return races && !races.includes(c.race) ? `Requires ${races.join(' or ')}.` : '';
}
export function placementReason(
    c: Immutable<Character>,
    kind: string,
    anchor: InventoryAnchor,
    ignore?: string,
) {
    const { width, height } = footprint(kind);
    if (
        !Number.isInteger(anchor.column) ||
        !Number.isInteger(anchor.row) ||
        anchor.column < 0 ||
        anchor.row < 0 ||
        anchor.column + width > backpack.columns ||
        anchor.row + height > backpack.rows
    )
        return `Needs a ${width} × ${height} space inside the backpack.`;
    for (const item of c.inventory) {
        const other = c.placements[item.id];
        if (item.id === ignore || !other) continue;
        const size = footprint(item.kind);
        if (
            anchor.column < other.column + size.width &&
            anchor.column + width > other.column &&
            anchor.row < other.row + size.height &&
            anchor.row + height > other.row
        )
            return 'That space is occupied.';
    }
    return '';
}
export function firstSpace(
    c: Immutable<Character>,
    kind: string,
    ignore?: string,
): InventoryAnchor | undefined {
    for (let row = 0; row < backpack.rows; row++)
        for (let column = 0; column < backpack.columns; column++) {
            const anchor = { column, row };
            if (!placementReason(c, kind, anchor, ignore)) return anchor;
        }
}
function place(c: Character, item: Item, preferred?: InventoryAnchor) {
    const anchor =
        preferred && !placementReason(c, item.kind, preferred, item.id)
            ? preferred
            : firstSpace(c, item.kind, item.id);
    if (!anchor)
        throw new Error(
            `Not enough inventory space. Needs a ${footprint(item.kind).width} × ${footprint(item.kind).height} space.`,
        );
    c.placements[item.id] = { ...anchor };
}

/** Bank storage retains its row capacity; backpack callers use addInventoryItem. */
export function addItem(list: Item[], item: Item, limit: number) {
    const def = items[item.kind];
    if (!def || !Number.isSafeInteger(item.count) || item.count < 1)
        throw new Error('Invalid item.');
    let remaining = item.count;
    if (def.slots?.length) {
        if (list.length + remaining > limit) throw new Error('Not enough inventory space.');
        for (let i = 0; i < remaining; i++)
            list.push({ ...item, id: i ? `${item.id}-${i}` : item.id, count: 1 });
        return;
    }
    for (const row of list.filter((i) => i.kind === item.kind)) {
        const n = Math.min(99 - row.count, remaining);
        row.count += n;
        remaining -= n;
    }
    let index = 0;
    while (remaining > 0) {
        if (list.length >= limit) throw new Error('Not enough inventory space.');
        const n = Math.min(99, remaining);
        list.push({ ...item, id: index ? `${item.id}-${index}` : item.id, count: n });
        remaining -= n;
        index++;
    }
}
/** Simulate the complete grant before publishing any quantity or placement. */
export function addInventoryItem(c: Character, item: Item) {
    const next = produce(c, (draft) => {
        const ids = new Set(draft.inventory.map((i) => i.id));
        if (ids.has(item.id)) throw new Error('Duplicate item identity.');
        addItem(draft.inventory, item, Number.MAX_SAFE_INTEGER);
        for (const added of draft.inventory) if (!ids.has(added.id)) place(draft, added);
    });
    c.inventory = [...next.inventory];
    c.placements = { ...next.placements };
}
export function consumeInventoryItem(c: Character, id: string, quantity = 1) {
    const item = c.inventory.find((i) => i.id === id);
    if (!item) throw new Error('Item not found.');
    if (equippedSlot(c, id)) throw new Error('Unequip this item first.');
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.count)
        throw new Error('Choose a valid quantity.');
    item.count -= quantity;
    if (!item.count) {
        c.inventory.splice(c.inventory.indexOf(item), 1);
        delete c.placements[id];
    }
}
function loadoutReason(c: Immutable<Character>, loadout: Immutable<EquipmentLoadout>) {
    const ids = new Set<string>();
    for (const slot of equipmentSlots) {
        const id = loadout[slot];
        if (id === null) continue;
        const item = c.inventory.find((i) => i.id === id);
        if (!item || ids.has(id) || item.count !== 1) return 'Invalid equipment assignment.';
        ids.add(id);
        if (!items[item.kind].slots?.includes(slot))
            return `This item does not fit ${slotLabels[slot]}.`;
        const reason = raceReason(c, item.kind);
        if (reason) return reason;
    }
    const main = c.inventory.find((i) => i.id === loadout.main),
        off = c.inventory.find((i) => i.id === loadout.offhand);
    if (off) {
        const mainHand = main && items[main.kind].hand;
        if (!mainHand || !['sword', 'melee'].includes(mainHand))
            return 'Equip a one-handed melee weapon first.';
        if (items[off.kind].hand === 'sword' && mainHand !== 'sword')
            return 'Dual wielding requires paired swords.';
    }
    return '';
}
export function equipItem(c: Character, id: string, slot: EquipmentSlot) {
    const item = c.inventory.find((i) => i.id === id);
    if (!item) throw new Error('Item not found.');
    if (!items[item.kind].slots?.includes(slot))
        throw new Error(`This item does not fit ${slotLabels[slot]}.`);
    const race = raceReason(c, item.kind);
    if (race) throw new Error(race);
    if (equippedSlot(c, id) === slot) return;
    const preferred = c.placements[id];
    const previous = { ...c.equipment };
    const source = equippedSlot(c, id);
    if (source) c.equipment[source] = null;
    c.equipment[slot] = id;
    // A main-hand change may displace an incompatible off-hand, but never lose it.
    if (
        (slot === 'main' || source === 'main') &&
        c.equipment.offhand &&
        c.equipment.offhand !== id &&
        loadoutReason(c, c.equipment)
    )
        c.equipment.offhand = null;
    const reason = loadoutReason(c, c.equipment);
    if (reason) throw new Error(reason);
    delete c.placements[id];
    for (const old of Object.values(previous)) {
        if (!old || Object.values(c.equipment).includes(old)) continue;
        place(
            c,
            c.inventory.find((i) => i.id === old)!,
            preferred,
        );
    }
}
export function moveItem(c: Character, id: string, anchor?: InventoryAnchor) {
    const item = c.inventory.find((i) => i.id === id);
    if (!item) throw new Error('Item not found.');
    if (anchor) {
        const reason = placementReason(c, item.kind, anchor, id);
        if (reason) throw new Error(reason);
    }
    const slot = equippedSlot(c, id);
    if (slot) c.equipment[slot] = null;
    if (slot === 'main' && c.equipment.offhand) {
        const off = c.inventory.find((i) => i.id === c.equipment.offhand)!;
        c.equipment.offhand = null;
        place(c, item, anchor);
        place(c, off);
    } else place(c, item, anchor);
}
function inventoryActionReason(action: () => unknown) {
    try {
        action();
        return '';
    } catch (error) {
        return error instanceof Error ? error.message : 'Invalid destination.';
    }
}
export function equipReason(c: Immutable<Character>, id: string, slot: EquipmentSlot) {
    return inventoryActionReason(() => produce(c, (draft) => equipItem(draft, id, slot)));
}
export function moveReason(c: Immutable<Character>, id: string, anchor: InventoryAnchor) {
    return inventoryActionReason(() => produce(c, (draft) => moveItem(draft, id, anchor)));
}
/** New actors and legacy migration only. Never repack an existing current-version save. */
export function initializeInventory(c: Character) {
    c.placements = {};
    c.inventoryRecovery ??= [];
    const originalItems = c.inventory.slice();
    for (const item of originalItems) {
        if (equippedSlot(c, item.id)) continue;
        const anchor = firstSpace(c, item.kind);
        if (anchor) c.placements[item.id] = anchor;
        else {
            c.inventoryRecovery.push(item);
            c.inventory.splice(c.inventory.indexOf(item), 1);
        }
    }
}
export function migrateInventory(c: Character) {
    const legacy = c as Character & {
        weapon?: string | null;
        armor?: string | null;
        offhand?: string | null;
    };
    c.equipment ??= {
        ...emptyEquipment(),
        main: legacy.weapon ?? null,
        offhand: legacy.offhand ?? null,
        body: legacy.armor ?? null,
    };
    const baseline = c.run?.baseline as NonNullable<Character['run']>['baseline'] & {
        weapon?: string | null;
        armor?: string | null;
        offhand?: string | null;
    };
    if (baseline) {
        baseline.equipment ??= {
            ...emptyEquipment(),
            main: baseline.weapon ?? null,
            offhand: baseline.offhand ?? null,
            body: baseline.armor ?? null,
        };
        delete baseline.weapon;
        delete baseline.offhand;
        delete baseline.armor;
    }
    delete legacy.weapon;
    delete legacy.offhand;
    delete legacy.armor;
    initializeInventory(c);
    if (c.rp) migrateInventory(c.rp.actor);
}
export function validateInventory(c: Character) {
    if (
        !Array.isArray(c.inventory) ||
        !Array.isArray(c.bank) ||
        !Array.isArray(c.inventoryRecovery) ||
        !c.placements ||
        !c.equipment ||
        Object.keys(c.equipment).length !== equipmentSlots.length
    )
        throw new Error('Invalid inventory.');
    const ids = new Set<string>();
    for (const item of [...c.inventory, ...c.bank, ...c.inventoryRecovery, ...c.quests.overflow]) {
        const def = items[item.kind];
        if (
            !def ||
            !item.id ||
            ids.has(item.id) ||
            !Number.isSafeInteger(item.count) ||
            item.count < 1 ||
            item.count > (def.slots?.length ? 1 : 99) ||
            (item.durability !== undefined &&
                (!Number.isInteger(item.durability) || item.durability < 0 || item.durability > 20))
        )
            throw new Error('Invalid inventory item.');
        ids.add(item.id);
    }
    const reason = loadoutReason(c, c.equipment);
    if (reason) throw new Error(reason);
    for (const item of c.inventory) {
        const anchor = c.placements[item.id];
        if (equippedSlot(c, item.id)) {
            if (anchor) throw new Error('Equipped item occupies backpack.');
        } else if (!anchor || placementReason(c, item.kind, anchor, item.id))
            throw new Error('Invalid backpack placement.');
    }
    if (Object.keys(c.placements).some((id) => !c.inventory.some((i) => i.id === id)))
        throw new Error('Orphaned backpack placement.');
    if (c.run?.baseline) {
        if (equipmentSlots.some((slot) => c.run!.baseline!.equipment?.[slot] !== c.equipment[slot]))
            throw new Error('Run loadout changed.');
    }
}
