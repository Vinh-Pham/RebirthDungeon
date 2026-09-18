# Rebirth Dungeon: Inventory and Equipment

Inventory is a **grid of carried items with different footprints**, expanded through bags and supported by stacking, sorting, and search. Equipment occupies dedicated slots and supplies the character's active item bonuses. Capacity should create choices about what to bring into a dungeon and what loot to keep, while making ownership and item movement clear.

This is a design specification for planned gameplay, based on **Mabinogi**. It complements the [game plan](../game-plan.md), [project phases](../project-phases.md), [stats.md](stats.md), [skills.md](skills.md), [enchants.md](enchants.md), [character.md](character.md), and [battle.md](battle.md). It does not claim inventory is implemented. The rules below are proposed Rebirth Dungeon defaults; final capacity, economy, and defeat/abandonment carry-over remain balance and progression decisions.

The full inventory design begins in **Phase 8**. Before then, [the first playable loop](../free-exploration.md) uses bounded potion counts and a temporary single gold balance; bags and banking below do not apply to that smaller slice.

## 1. Mabinogi reference

| Reference mechanic | Mabinogi behavior |
| --- | --- |
| Basic inventory | Unequipped items occupy a 6-column by 10-row grid. Item footprints vary. |
| Equipment | Gear has body, hand, and accessory slots. Only the active weapon set supplies its effects. Style equipment primarily changes appearance. |
| Stacks | Players can divide stacks and gather compatible items together. |
| Bags | Bags add space, reside in the main inventory, and support sorting tags and pickup priority. |
| Special storage | The Me tab restricts its contents; VIP and other storage have separate access rules. |
| Search | Inventory search supports names, categories, size, and favorites. |
| Overflow | Certain incoming items enter Temporary Inventory when space is unavailable; droppable items fall to the ground after five minutes of logged-in time. |

Sources: [Inventory and equipment](https://wiki.mabinogiworld.com/view/Inventory#Equipment), [Basic inventory and tabs](https://wiki.mabinogiworld.com/view/Inventory#Tabs), [Bags](https://wiki.mabinogiworld.com/view/Inventory#Bags), [Search](https://wiki.mabinogiworld.com/view/Inventory#Inventory_Search), [Temporary Inventory](https://wiki.mabinogiworld.com/view/Inventory#Temporary_Inventory).

Rebirth Dungeon adopts the grid, item sizes, bags, equipment separation, and organization tools. The initial design uses permanent capacity and saved reward overflow. It does not adopt subscription storage, real-time overflow loss, or Mabinogi's full collection of specialized tabs.

## 2. Inventory spaces and ownership

| Space | Proposed role | Gameplay boundary |
| --- | --- | --- |
| Backpack | Main 6 × 10 grid for carried items and bag items | Starting dimensions are provisional |
| Bag contents | Additional grids supplied by bags in the backpack | Accessible carried storage, subject to bag restrictions |
| Equipment | Items assigned to valid gear slots | Only equipped items contribute equipment effects |
| Quest record | Nonphysical quest flags, keys, and recorded page progress | Not a general storage grid |
| Run inventory | The run's carried equipment, supplies, bags, and collected loot | Separate simulation state while the run is active |
| Reward overflow | Saved items awarded at a durable grant boundary that do not fit | Withdraw-only holding area, unavailable as equipment or supplies |

Use hero-owned inventory for the initial offline design, consistent with the proposed hero-owned skills and AP. An item instance has one authoritative location within its ownership context: backpack, one bag, one equipment assignment, pending reward, or a world pickup. A drag cursor and search result are views of an item, never additional locations or ownership copies.

The profile owns committed inventory. The run operates on a validated snapshot with origin references and reservations for items brought from the profile; that snapshot is not another independently spendable collection. Town inventory mutations are unavailable while a run is active in the initial design. Section 9 defines reconciliation.

The quest record stores progression data, not arbitrary items renamed as quest objects. Physical books, uninserted pages, enchant scrolls, potions, and crafting materials consume grid space. A quest key may instead be a nonphysical flag only when its content definition explicitly says so. The distinction must be visible before pickup.

## 3. Grid capacity and item footprints

Each item definition declares a positive integer `width`, `height`, and maximum stack quantity. One item instance or stack occupies one contiguous rectangle. Every occupied cell must lie inside its container, be free of other items, and satisfy the container's content restrictions. Having enough free cells in total is insufficient if no correctly shaped rectangle fits.

Illustrative dimensions and stack limits, not Mabinogi item data or final balance:

| Item | Grid footprint | Maximum stack |
| --- | --- | --- |
| Small potion | 1 × 1 | 20 |
| Magic powder or mana herb | 1 × 1 | 20 of the same material |
| Skill page | 1 × 1 | 10 copies of the same page |
| Enchant scroll | 1 × 2 | 1 |
| Skill book | 2 × 2 | 1 |
| One-handed sword | 1 × 3 | 1 |
| Shield | 2 × 2 | 1 |
| Body armor | 2 × 3 | 1 |
| Small bag | 1 × 2 in the backpack | 1; supplies a separate 3 × 4 grid |

Stack quantity does not enlarge its rectangle. Initial item orientation is fixed; rotation and weight/encumbrance are deferred. Equipment is removed from its former grid placement when equipped, so it frees those cells. Unequipping requires a legal destination rectangle, not just an empty equipment slot.

Keep inventory coordinates separate from dungeon coordinates. Use zero-based columns and rows from the inventory's top-left corner, with rows increasing downward. Item placement stores its top-left anchor; occupancy is derived from its definition's footprint. Do not save duplicate item records for every occupied cell.

Capacity upgrades, if added, change authored container dimensions at a town boundary and preserve placements. The initial design has no capacity expiration or shrink timer. Definition changes that shrink storage or enlarge item footprints require a migration that preserves every item; they must not silently delete items that no longer fit.

## 4. Bags and automatic placement

A bag is a nonstackable item in the backpack that owns one contents grid. Its exterior footprint consumes backpack cells even while closed. Its contents remain accessible while the bag window is closed; opening, closing, or renaming it changes presentation only.

**No nested bags:** bags cannot enter another bag, an equipment slot, or their own contents. A nonempty bag cannot be sold, destroyed, replaced, or moved into inaccessible storage. Empty it first. Moving a bag to another legal backpack anchor preserves its contents and stable container identity. At run start, copying a selected bag includes its validated contents and origin references as one contained hierarchy.

Start with ordinary unrestricted bags. Later specialized bags can declare allowed item categories. Distinguish a bag's hard content restriction from a player's optional **pickup filter**: the filter controls automatic routing, while legal manual placement may ignore it. Changing a filter does not move or eject existing items; changing a bag's hard restrictions requires validated content migration.

Players may order bags for automatic pickup. The proposed algorithm is deterministic:

1. Visit filter-matching legal bags in the player's saved priority order, followed by the backpack as fallback.
2. Fill compatible nonfull stacks across those destinations in that order, using row/column order within each container.
3. Place any remainder as new stacks, visiting the same destinations and scanning anchors left-to-right, top-to-bottom.
4. Simulate the entire requested transfer before committing it. If any requested quantity cannot fit, reject that transfer without moving items or reducing the source.

The player can explicitly choose a smaller pickup quantity for a partial transfer. Do not silently take part of a stack when the command requested all of it. Automatic placement uses no RNG and does not rearrange unrelated items to make space.

**Gather Stacks** combines compatible stacks within the selected scope. **Sort** first gathers eligible stacks, then attempts a deterministic layout, for example descending footprint area followed by definition ID and instance ID. Build and validate the complete proposed layout before applying it. A simple packing algorithm can fail even when the current arrangement fits; in that case preserve the old layout and explain that sorting could not fit everything. Sorting never changes ownership, rolls, equipment, or item counts.

## 5. Stacks, identity, and item protection

Merge only instances with the same stack key. Initially that key includes definition ID, quality/variant, binding or ownership restrictions, and gameplay-relevant state. In a run, it also includes provenance so brought supplies and newly looted supplies remain distinguishable for result reconciliation. Items with different uses remaining, enchant values, or other unique state cannot merge merely because their names match.

Equipment, bags, and enchant scrolls are nonstackable in the first slice. Each equipment instance retains its inherent rolls, prefix/suffix enchants, and resolved enchant values when moved, equipped, or returned from a run. A bag retains its container ID. Gold follows the two-place model in [towns.md](towns.md): a nonnegative integer banked balance at the Bank plus bag-capped carried gold; loose coins are never grid items, and carried capacity must be validated before committing any gold grant.

Splitting requires an integer quantity from 1 through `sourceQuantity - 1` and a legal destination. Assign a new stable instance ID to the split portion and preserve its stack metadata. Merging transfers at most the destination's remaining capacity, retains any source remainder, and removes the source record only when empty. No action may create negative quantities, zero-sized stacks, quantities above a stack limit, or duplicate IDs.

Favorites are search/organization markers. A separate **item lock** protects a specific instance from selling, destruction, recipe consumption, and enchant replacement or burning; the player must explicitly unlock it first. Locked items may still move or equip. Stack merging requires matching lock state, and splitting copies it. Do not make a favorite icon imply protection that the action validator does not enforce.

Nonphysical quest records cannot be discarded. Physical quest-critical items follow authored discard restrictions. Initial inventory items do not expire; timed items and mixed-expiration stacks need a separate design before introduction.

## 6. Equipment and loadout validation

| Slot | Proposed initial rule |
| --- | --- |
| Main hand | Compatible one-handed or two-handed weapon |
| Off hand | Shield or a compatible one-handed weapon; blocked by a two-handed main weapon |
| Head | One eligible headgear item |
| Body | One clothing, light-armor, or heavy-armor item with exactly one body category |
| Hands | One pair of gloves or eligible hand armor |
| Feet | One pair of boots or eligible footwear |
| Accessory 1 / 2 | Two separate accessory assignments, subject to authored item restrictions |

These slots are a proposed subset of the reference. Start with one active weapon set. Robes, cosmetic Style slots, alternate weapon sets, automatic loadout switching, and mastery-based accessory-slot unlocks are deferred. Equipping a visual or inactive-set item must never grant gameplay bonuses if those features are later introduced.

A two-handed weapon is one instance assigned to the main hand, with an off-hand occupancy reservation referring to it. Count its stats and enchants once. Dual wielding requires two distinct compatible one-handed instances; start with paired swords. A shield plus sword supports Charge and Shield Mastery; paired swords support Dual Wield Mastery. A passive does not override illegal equipment combinations. Reject a lone off-hand weapon in the initial loadout model.

Equip/unequip operations validate ownership, reservations, slot restrictions, prerequisites, and every displaced item's destination together. Replacing a sword-and-shield loadout with a two-handed weapon must find space for both displaced items, considering the new weapon's vacated grid cells. If the full change cannot fit, retain the complete original loadout and grid. No item is dropped automatically to complete a swap.

Apply new equipment, remove old contributions, and recompute stats in one transition. Only active equipped instances contribute inherent stats and eligible enchant clauses. Combat, Sword, Shield, armor, and Dual Wield Mastery then follow their own conditions in [skills.md](skills.md#8-combat-skill-catalog). Never count weapon or mastery bonuses once per occupied hand marker. Lower resource maxima clamp current pools; raising them does not refill HP, MP, or SP.

## 7. Inventory actions and simulation time

| Action | Town | During a run |
| --- | --- | --- |
| Inspect, search, filter, compare, open bags | No gameplay time | No simulation time |
| Move within carried grids, split/merge, gather, sort | Validated layout transaction | No battle activation cost; changes layout only; unavailable during a locked dice activation |
| Equip, unequip, change hand configuration | Validated equipment transaction | Unavailable during a run; equipment changes are town-only |
| Use a consumable | Only where its definition permits | When enabled, one full action before rolling under battle.md |
| Pick up world loot | Not applicable to ordinary town menus | When enabled, a validated exploration interaction at a reachable pickup; no battle activation cost |
| Read/assemble skill books, enchant, burn, sell | Between-run operations with their own validation | Unavailable |
| Destroy unwanted items | Explicit quantity/item selection and final destruction confirmation | Unavailable initially; capacity is managed through pickup choices |

Pickup requires reaching the authored interaction point/radius with an unobstructed approach, then validating quantity, ownership and fit in one saved transaction. World pickup is unavailable in the separate battle scene and never ticks combat statuses or regeneration. Opening a loot preview is free. Authored automatic quest grants use reward transactions instead of pretending a menu click is a pickup.

No inventory action may consume items, swap equipment, change a reserved stack, or alter frozen combat inputs between the first dice roll and commit/pass. Reading an item tooltip during that window remains safe. A future drop-to-ground action must define ground persistence, ownership, and its allowed exploration context before becoming available.

Quick-use buttons are references to eligible items in the current context. A run shortcut cannot consume a town potion. Resolve a stack by a stable instance reference, or by a documented deterministic matching rule, and validate again on use. A stale shortcut to an exhausted stack does not create an item or trigger a free action.

## 8. Full inventory, rewards, and crafting outputs

For a world pickup, insufficient room leaves the requested items on the ground with their existing IDs and quantities. It grants neither ownership nor a reroll of the loot. Display the required footprint and stack space so the player can rearrange inventory or request a smaller quantity. World pickups remain subject to the eventual floor-leaving and run-loss policy; they are not automatically retained rewards.

For a committed quest or run-result grant, place what fits and record the exact unplaced items in a **saved reward overflow queue** as part of that same grant. This is an explicit exception to the all-or-nothing requested-transfer rule. Claiming an overflow entry moves it into a legal carried grid once; it does not award the reward again. Overflow items cannot be used, equipped, sold, enchanted, burned, or spent as recipe inputs until withdrawn.

Overflow has no real-time expiry and never auto-drops items. It accepts only authoritative grants and system reconciliation returns, including retained run gear or gear displaced by rebirth; players cannot deposit items into it. Show it prominently and require it to be cleared before starting another run or accepting an optional reward-producing activity. Already-earned results must remain recoverable even if overflow is present. This keeps overflow from becoming a general-purpose extra backpack without destroying earned rewards.

Purchases, book assembly, and crafting-like operations must validate output placement **after simulating their consumed inputs**. If the result cannot fit, reject before consuming inputs or charging currency. They do not use overflow to bypass capacity. A skill page inserted into its collection record frees its grid quantity in the same transaction; completing a book must not duplicate either the record or output item.

Enchanting usually changes an existing equipment instance without changing its footprint. Enchant burning destroys the item and materials and may return two scrolls. Reserve legal output rectangles for the maximum possible result before burning, following [enchants.md](enchants.md#6-burning-and-recovery). Two free cells do not necessarily fit two 1 × 2 scrolls. Reject before consumption or RNG when outputs could not fit; never discard a successfully recovered scroll because the grid is full.

## 9. Runs, results, and rebirth

At run start, validate the hero's equipment and selected carried containers/supplies, then create the run snapshot and profile reservations atomically. Reserve exact source instances and quantities, including bag contents. Profile items not selected remain in town. Equipped item effects, mastery conditions, and enchant values become part of the run's starting state under stats.md and character.md.

Keep origin references on brought item quantities and an operation ledger for consumption or other allowed changes. New dungeon items have their own stable IDs and pending ownership. Layout changes do not turn brought supplies into loot, and splitting a stack preserves its origin. Reloading a run restores its current quantities, not fresh copies of its starting provisions.

At victory, defeat, or abandonment, one result transaction reconciles the run under the authored outcome policy: account for spent/destroyed brought items, return or forfeit remaining brought items, grant retained new loot/currency, release reservations, and mark the result committed. Retained quantities cannot include supplies already consumed in the run. Return items through validated placement, using reward overflow for retained items that do not fit. Preserve equipment IDs and rolled values instead of granting replacement copies.

The **exact loss and retention policy remains a Phase 8 decision**. The game must specify each outcome before inventory-backed runs ship; this document does not guarantee that every weapon or loot item survives defeat. Never clear an active run merely because the app closes, and never release its reservations without completing its result or an explicit recovery/migration operation.

Under character.md's proposed rebirth rules, committed inventory and installed enchants remain. Rebirth can change equipment eligibility or enchant conditions; preview those effects. If rebirth makes an equipped item illegal, move it into carried storage or reward overflow atomically and remove its equipment effects. Rebirth does not duplicate possessions or empty pending dungeon rewards into permanent inventory.

## 10. Inventory interface

Present equipment and the backpack together, with bags accessible through labeled tabs or a compact bag list. Avoid requiring many floating windows on mobile. Show each item's footprint, quantity, rarity, lock state, and equipped/reserved status using text or icons as well as color. Display gold separately from grid capacity and keep reward overflow visible.

Support drag-and-drop on desktop and tap-item, choose-action, tap-destination on touch. Preview the entire target rectangle with a clear valid/invalid state. An invalid drop returns the visual to its source; the item never leaves authoritative storage until the move commits. Provide a quantity selector for split, merge, pickup, and destruction, with Cancel preserving state.

Search spans the backpack, accessible bags, equipment, and overflow in the current town/run context. Results identify their container and highlight their actual placement. Filters and favorites change presentation, not legality or stack identity. Offer **Gather Stacks**, **Sort Container**, and bag pickup order separately so the player knows what will move.

Item details show category, size, stack limit, use/equip restrictions, inherent values, enchant slots and active/inactive clauses, and relevant mastery changes. Equipment comparison must simulate the entire proposed loadout, including a displaced shield or second weapon. Explain errors concretely: **Needs a 2 × 3 space**, **Bag accepts materials only**, **Off hand occupied**, **Item reserved for active run**, or **Finish this dice action first**.

Destruction is distinct from closing a window or dropping onto empty UI. Preview the selected instances/quantities and final irreversible result before the player's Destroy action. Closing the preview cancels it. Item locks and quest restrictions still apply; no bulk action silently includes protected equipment.

## 11. Data, persistence, and initial scope

Content definitions need stable item IDs, footprints, stack limits/keys, categories and tags, equipment-slot/hand compatibility, prerequisites, action permissions, consumable effects, bag dimensions/restrictions, and currency bounds. Validate positive dimensions, reachable placements in intended containers, legal categories, and all referenced definitions before accepting a catalog. These belong in the existing versioned JSON content pipeline, not presentation code.

Save item/stack IDs, definition and variant references, quantities, unique equipment/enchant state, container IDs and anchors, bag-parent relations, equipment assignments, lock state, currency balances, pickup priorities, overflow entries, and run-origin reservations/consumption. Keep UI selection and a drag preview transient. Reject overlapping/out-of-bounds placements, containment cycles, duplicate ownership, orphaned bag contents, and incompatible equipment on load; do not repair them by deleting items.

Use the existing combined profile/run bundle and ordered alternating-slot checkpoints. Each operation records its unique command/grant ID and all quantity, location, currency, equipment, or progression changes together. Replaying an accepted operation returns the recorded result. Invalid commands leave inventory, stats, time, and RNG unchanged. Save failure must not allow another reward claim or a second sale of an already-consumed item.

The first inventory slice should demonstrate the 6 × 10 backpack, different footprints, stack split/merge, one ordinary bag, deterministic placement and sorting, basic sword/shield/body equipment, item locks, and a saved full-inventory reward. Integrate a potion, skill book/page, and enchant scroll as their corresponding actions become available. Add run pickup and provision reconciliation once the outcome policy is defined.

Future implementation acceptance checks should cover:

- Fragmented free space, rectangle boundaries, fixed orientation, stable auto-placement, and failed sorting preserving the original arrangement.
- Stack limits/metadata/provenance, split IDs, partial requests, quantity conservation, and rejection without negative balances or lost source items.
- No nested bags, nonempty-bag removal rejection, filter versus hard restriction behavior, and bag contents surviving movement and reload.
- Atomic two-handed/dual-wield swaps, displaced gear capacity, one contribution per item/mastery, armor exclusivity, and no resource refill from equipping.
- Full world pickups remaining unclaimed, exactly-once reward overflow, maximum burn-output footprints, and recipe rejection before inputs or RNG are spent.
- Run reservations, consumed provisions, victory/defeat/abandonment reconciliation, rebirth eligibility changes, and interrupted saves/retries without duplicate ownership.
- Inspection not advancing time, inventory mutations blocked during dice resolution, one turn per enabled pickup/consumable/equipment action, and touch/desktop parity.

Still open: final sizes and stack limits, bag acquisition/capacity progression, legal weapon pairings, equipment values, gold limits, and run loss/carry-over. Shared account banks, trading/mail, paid storage, item weight, rotation, alternate weapon sets, cosmetic slots, durability/repair, auto-looting pets, timed items, and manual ground drops remain outside the first slice.

## Godot inventory integration

**Godot reset: 2026-09-10. Status: planned; not implemented.** ItemDefinition Resources describe type/footprint/effects; runtime item instances store stable IDs, quantities, variants, containers and equipment slots. GDScript placement rules validate full transactions before UI signals confirm them. Control-based inventory views support dragging and a tap-select alternative without owning item state. Phase 8 replaces the temporary gold/potion slice and defines its save transition and complete outcome-retention policy. Inventory cells are storage coordinates, never world navigation cells.

See [Godot architecture](../game-plan.md), [project layout](../directory.md) and [official engine sources](../references.md#godot-engine-sources).

## Research notes

The [Mabinogi Inventory page](https://wiki.mabinogiworld.com/view/Inventory) was retrieved with Firecrawl and inspected on **September 5, 2026**. Section 1 summarizes source behavior; subsequent rules and sample values are proposed Rebirth Dungeon adaptations. The raw source is cached at `.firecrawl/mabinogi-inventory.md` in the gitignored research directory.
