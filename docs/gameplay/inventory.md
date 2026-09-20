# Rebirth Dungeon: Inventory and equipment

**First-loop Defold implementation, with later expansion specified below.** The [game plan](../game-plan.md) fixes initial capacity/economy; [architecture](../architecture.md) fixes saving. The footprint grid is a milestone-6 port, not the starting inventory.

## First-loop inventory

Use **30 carried item/stack slots**, **60 bank slots**, consumable stacks of **99**, and individual nonstackable equipment instances. Gold is a nonnegative integer balance separate from items; bank gold belongs to the same character. There are no gold bags, weight limits or timed overflow loss in this slice.

Each instance has a stable ID, definition ID, quantity and applicable durability/state. Each owned item has one location: carried inventory, equipped slot or bank. Pending encounter/chest offers are separate unclaimed records. A GUI selection or run baseline reference is not a second spendable copy. Freeze equipment contributions/ranks at run entry while supplies and claimed loot use the single authoritative character envelope.

| Action | Rule |
| --- | --- |
| Buy / withdraw / claim | Simulate complete transfer and stack capacity before spending or marking claimed |
| Sell | Unequipped eligible items only; floor(25% of purchase price) per unit |
| Equip / unequip | Town without active run; validate race, slots and space for displaced gear |
| Use consumable | Validate target/effect; in battle share one optional-item allowance before main action |
| Bank transfer | Town service, exact quantities/gold, character-specific ownership |
| Repair | Blacksmith, one gold per missing durability point |
| Discard, when exposed | Explicit quantity and confirmation; failed save preserves items; no world pickup/refund |

Weapons begin with **20 durability**, lose one per committed attack action, and halve weapon contribution at zero. Unarmed Attack remains possible. Ammunition is deferred. A source with a different maximum durability needs explicit content, not an assumed global override.

Claims support individual selection, Take Selected and Take All. Reject a transfer that cannot fit without partially spending/granting. Keep offers available after failure. Never silently discard overflow or automatically depart with unclaimed rewards; use confirmed departure. Broader quest overflow is a separately identified saved grant, not inventory that can be spent in combat.

The first-loop panel uses a six-row paged list with item details, keyboard selection, exact-quantity bank/sale controls, exact gold amounts, and confirmed discard outside battle/rewards. Equip and bank changes remain town-only. Inventory GUI commands and presentation data travel through bounded messages; the rules presenter previews the same candidate checks used at commit. Whole bank moves retain item IDs and weapon durability; splitting a stack gives only the new split-off stack a new ID. Fully merged stacks retire their emptied source ID.

## Later 6×10 footprint inventory

Milestone 6 replaces slot capacity with a **6-column × 10-row grid**, plus nine equipment assignments. A future Defold save migration must preserve ownership, quantity, durability, claims and frozen run sources. This is not browser schema-4 import.

| Item family | Footprint |
| --- | --- |
| Potions, food, materials, pages, accessories | 1×1 |
| Weapons except dual guns | 1×3 |
| Dual guns, shields, books/collection books | 2×2 |
| Body armor, robes | 2×3 |
| Headgear, gloves | 2×1 |
| Boots | 2×2 |

Fixed orientation initially. Equipment is nonstackable; stack limits remain 99 where allowed. Save each item once, a top-left backpack anchor for carried items, and references for equipped items. Use zero-based inventory coordinates independent of Defold/A* grid conventions. Every footprint must be in bounds and nonoverlapping; enough total free cells does not guarantee fit.

Fill compatible stacks first, then scan left-to-right/top-to-bottom; never rearrange unrelated items. Dragging preserves grabbed-cell offset, previews legal destinations, and does not auto-swap/merge occupied cells. Keyboard Select → Move/Equip/Unequip supplies a drag alternative. Escape cancels presentation selection without a command.

The nine slots are accessory 1/headgear/accessory 2; right hand/body/left hand; gloves/boots/robe. Slot/race metadata drives preview and commit. Giants may own/buy bows but cannot equip them. Shields require a one-handed melee main weapon; dual wielding requires distinct legal swords. A two-handed weapon blocks off-hand gear. Main-hand replacement returns incompatible off-hand gear atomically, preferring the vacated source space then first-fit. Reject the entire exchange if it cannot fit. Robes are independent of body armor/masteries; two distinct eligible accessories may coexist.

Retained later shop proposals: Cloth cap/gloves/Traveler boots, 25 gold and +1 Defense each; Traveler robe, 40 gold and +1 Magic Defense; Copper charm, 30 gold and +1 LUK; Elf-only Woodland charm, 30 gold and +1 DEX. Validate these catalogs at that milestone; they do not exist yet.

If a legitimate future capacity migration cannot place all owned items, use a clearly labeled withdraw-only recovery area with stable IDs. Corrupt current-format placements are rejected, not silently repacked. Recovery items cannot become usable supplies until withdrawn. Keep recovery separate from quest overflow/claim ledgers.

## GUI and mutation policy

Use Druid lists/panels initially and project GUI grid widgets later. Show item art, quantity, price, durability, bonuses, restrictions and disabled reasons; source-derived critical stats come from the character/skill resolver, not invented per-weapon critical rates. Selection offers the same details as hover. Suppress hover during drag, menus and confirmations; keep bounds/close controls visible.

First-slice open panels pause world movement/updates under [UI](user-interface.md). Enemy turns, reward transitions and busy writes block inventory mutations. During an initialized player's selection turn, later Move/Discard may be supported without advancing turns or RNG, while use shares the item allowance. Equipment changes and recovery withdrawal stay town-only. This policy needs explicit command guards before enabling the richer UI.

## Saving and verification

Pure Lua inventory rules compute whole transfers within a copied candidate; DefSave persists inventory, equipment, gold, rewards and claims together. Use revisions/operation IDs, validate unique ownership and leave inputs unchanged on rejection. RP uses a separate inventory context when implemented. Rebirth/defeat/abandonment retain committed possessions; temporary run effects clear as specified elsewhere.

Lester covers capacity/stacks, prices, races/slots, durability, exchanges, overflow, duplicate operations and failed writes. Later add footprint fragmentation, migration recovery and unchanged counts/RNG after organization. Engine tests cover Druid interaction, focus, no click-through and restart.

Bags, sorting, split/merge, locks, cosmetic slots, alternate loadouts and ground drops remain later proposals requiring their own contracts. They do not impose capacity or item-loss rules on the first release.
