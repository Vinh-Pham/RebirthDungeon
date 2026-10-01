# Rebirth Dungeon: Inventory and Equipment

Updated **October 1, 2026**. The Expo app already has bounded item stacks, individually tracked weapons and armor, equipment enchants and locks, consumable use, shops and repair. The pack also shows active quest item requirements and delivery destinations. Grids, bags and reward overflow are future extensions. Read this with [Battle](battle.md), [Stats](stats.md), [Skills](skills.md), [Towns](towns.md), and [Enchants](enchants.md).

## 1. Current ownership and capacity

The character's campaign hero owns inventory throughout town and dungeon exploration. There is no separate town stash or independently spendable run inventory. At encounter entry, BattleSession copies that hero; the completed result returns consumptions, resources and weapon wear to the campaign. Current saves restart an unfinished encounter from its entry state, as described in [Battle](battle.md#7-encounter-results-and-save-continuation).

| Current data | Meaning |
| --- | --- |
| Hero inventory | Item-definition counts, bounded to 999 per definition |
| Weapon instances | Stable instance ID, definition ID, durability, lock and optional prefix/suffix with saved clause values |
| Armor instances | Stable instance ID, definition ID, lock and optional prefix/suffix with saved clause values |
| Equipment weapon | An owned weapon instance ID |
| Equipment armor | An owned armor instance ID; that specific copy is assigned to the armor slot |
| Gold | One hero balance, bounded to 1,000,000; no bank or gold-bag capacity |
| Dungeon keys | Run-specific absent/dropped/held/spent state; outside normal inventory |

Weapon references and count limits must remain consistent. Armor is individually owned; version 8 migrates older armor stacks without losing copies or refilling resources. There is no footprint capacity, weight, expiration, ground-item dropping or subscription storage. Item previews and React selection never create additional ownership.

Current inventory screens show ordinary item rows and individually listed equipment, with pages of 20. During battle they observe the active battle's inventory and durability and disable exploration equip/use commands. The battle Item action owns combat consumable use.

## 2. Current actions and equipment

| Action | Exploration, including a dungeon | Active encounter |
| --- | --- | --- |
| Inspect inventory/equipment | Available; no simulation tick | Read-only inventory screen |
| Equip/unequip weapon or armor | Validated campaign command | Unavailable |
| Use an eligible consumable | Validated campaign command | Through Item; one accepted use consumes a turn |
| Buy, sell, repair | Only through a nearby open town service | Unavailable |
| Learn/read/assemble books and quest acceptance/claims | Implemented town-only commands | Unavailable |
| Enchant, burn | Implemented at the nearby open town blacksmith | Unavailable |
| Lock/unlock equipment | Durable campaign command; locked gear stays equippable | Unavailable |
| Rearrange grids, split/merge, sort | Future presentation/storage operations | Initially unavailable while an encounter is active |

Selection, cancellation, comparison and scrolling spend nothing. Equip/use commands revalidate ownership and context at execution; stale rows are not authority. Opening a menu is not movement or a recovery tick. Food that is not battle-usable cannot be consumed through the battle menu.

Weapon durability is already implemented. Eligible physical actions with at least one hit wear the equipped weapon once, including an area action. Misses, magical actions, items, Defend, Rest and exhausted unarmed basic attacks do not wear it. At zero durability the weapon remains owned but stops supplying combat stats until repaired. Blacksmith repair restores the same instance, preserving its ID.

Only active equipment contributes stats. Expanded equipment and capacity bonuses must follow [Stats](stats.md): a higher maximum does not refill a depleted pool, and a lower maximum clamps it. Existing explicit healing, level-up and defeat recovery are separate rules.

## 3. Planned grid and bags

The Mabinogi-inspired extension proposes a **6-column × 10-row backpack**, varied item footprints and ordinary bags. These are design defaults, not present save fields or final balance. Use original art and definitions rather than importing reference inventory assets. [Reference inspiration](https://wiki.mabinogiworld.com/view/Inventory).

| Proposed item | Fixed footprint | Proposed stack limit |
| --- | --- | --- |
| Potion, powder or herb | 1 × 1 | 20 of the same definition/variant |
| Skill page | 1 × 1 | 10 of the same page |
| Enchant scroll | 1 × 2 | 1 |
| Skill book | 2 × 2 | 1 |
| Sword | 1 × 3 | 1 |
| Shield | 2 × 2 | 1 |
| Body armor | 2 × 3 | 1 |
| Small bag | 1 × 2 in the backpack | 1; owns a 3 × 4 contents grid |

Store a top-left anchor in zero-based container coordinates and derive occupied cells. Validate positive dimensions, boundaries, content restrictions and rectangle overlap. Enough free cells do not guarantee a fitting rectangle. Rotation and weight are deferred. Equipping removes the item from its grid; unequipping needs a legal destination.

A bag owns one stable contents-container ID and occupies backpack space even when closed. Bags cannot nest, enter equipment slots or contain themselves. Moving a bag preserves its contents. Selling, destroying or placing a nonempty bag into inaccessible storage is rejected. Initially use unrestricted bags; later hard category restrictions are distinct from optional automatic-pickup filters. Changing a filter neither ejects nor moves items.

Grid adoption requires a lossless migration from current counts and weapon instances. Splitting a saved count of 999 into smaller stacks must preserve the entire quantity. Existing armor copies need stable instance identities before unique enchants are possible. Preserve equipped weapon IDs, depletion and durability. Overflow must exist before migration can encounter insufficient space; never delete an item to make a migrated save fit.

## 4. Placement, stacking and protection

Automatic placement is deterministic and uses no RNG:

1. Visit legal, filter-matching bags in saved pickup-priority order, then the backpack.
2. Fill compatible stacks in that order, scanning rows and columns consistently.
3. Place remaining stacks at the first legal anchors, left-to-right and top-to-bottom.
4. Validate the entire requested transfer before committing. Failure preserves its source and destinations; a partial transfer requires an explicit requested quantity.

Stack identity includes definition, variant, binding and any gameplay-relevant unique state. Differently enchanted, rolled or partially used items cannot merge merely because their names match. Equipment, bags, books and scrolls begin nonstackable. Splitting creates a new stable ID; merging retains any source remainder and deletes only an empty source record. Quantities stay positive and within limits.

Gather Stacks combines compatible stacks within the selected scope. Sort stages a complete arrangement, for example descending area then definition and instance ID. If its packing algorithm cannot fit all items, preserve the old layout. Neither operation changes ownership, equipment, rolls or quantities.

Favorites organize views. A separate future item lock blocks selling, destruction, recipe consumption, enchant replacement and burning. Locked items may move/equip; split portions inherit locks and merging requires compatible protection state. Physical quest items follow authored restrictions; nonphysical objective records cannot be discarded. A selected item or drag cursor remains a view of its authoritative location.

## 5. Planned equipment expansion

The existing weapon/armor pair remains the baseline. Introduce additional slots only with item definitions, validation, migration and skill consumers:

| Proposed slot | Rule |
| --- | --- |
| Main hand | One compatible one-handed or two-handed weapon |
| Off hand | Shield or a compatible second one-handed weapon |
| Head, hands, feet | One eligible instance per slot |
| Body | Exactly one clothing/light-armor/heavy-armor category |
| Accessories 1/2 | Two distinct assignments subject to authored restrictions |

A two-handed item is one main-hand instance with an off-hand occupancy marker; count its bonuses/enchants once. Dual wielding needs two distinct compatible instances and cannot leave a lone off-hand weapon. Masteries cannot legalize an invalid loadout. Inactive/cosmetic sets provide no gameplay bonuses if introduced later.

Validate equipment prerequisites and destinations for every displaced item in one operation. A two-handed swap may displace both sword and shield; consider the new weapon's vacated grid space before deciding whether the entire swap fits. Failure retains the original loadout and placements. Keep exploration equipment changes available between encounters; do not silently impose a whole-dungeon equipment lock. Active encounters retain their entry loadout.

## 6. Grants, full capacity and outputs

Current grants have different boundaries that must be described accurately:

- A chest grant that cannot fit the current per-definition limit is rejected before marking that chest claimed.
- Encounter victory currently truncates drops to remaining per-definition capacity and clamps gold to its balance limit. There is no recoverable overflow queue today.
- Shop purchases validate capacity and affordability before charging; selling protects equipped gear and uses the rules in [Towns](towns.md).
- Manual quest claims stage delivery inputs before validating all rewards. If any reward cannot fit, the entire claim is rejected; no inputs or rewards change. Delivery, XP/level AP, gold, explicit AP, items, earned titles, flags and the one-time receipt save together.

Quest supplies remain usable until a confirmed delivery. Using, selling or offering a required item may make a ready quest unfinished again. Item details and shop confirmations show that relationship; equipped armor copies are reserved from delivery. Inspecting requirements does not accept or complete quests.

The grid milestone should replace silent reward truncation with saved overflow. Authoritative encounter/quest grants place what fits and store the exact remainder in the same candidate. Overflow has no timer and is withdraw-only: no use, equip, sale, enchant or recipe consumption before withdrawal. Players cannot deposit ordinary items into it. Show pending entries clearly, and block optional additional reward-producing activities while overflow remains; already completed outcomes must still be recoverable.

Requested world pickups remain all-or-nothing unless the player specifies a smaller quantity. A failed pickup leaves its stable world ID and quantity unclaimed. Current dungeon keys remain explicit run records rather than general grid loot. Ground-loot persistence is new work, not a capability of the current renderer.

Purchases, book assembly and recipes must stage consumed inputs before checking output placement. Reject before charging or consuming when the complete result cannot fit; these operations do not use overflow as extra storage. Page insertion removes one page and records that exact page once. Burning reserves space for the maximum two recovered scrolls after removing its equipment/material inputs, before any RNG draw. [Enchant burning](enchants.md#6-burning-and-recovery).

## 7. Encounter results and rebirth

Carry the campaign's actual supplies into each encounter. A completed victory or defeat returns used items and weapon wear once. Victory grants XP/gold/items and clears the encounter; defeat grants no victory rewards, halves current gold, restores the hero and ends the dungeon. Already earned levels and inventory survive defeat. Returning early through the entrance statue also keeps previously committed gains. There is no exit-time second payout or profile-reservation reconciliation.

Current encounter restart restores entry supplies and durability, discarding the unfinished attempt. UI navigation does not count as a completed encounter or inventory grant. Expanded inventory must preserve this checkpoint policy until exact mid-battle saves are deliberately implemented.

Deliberate rebirth is future work under [Character](character.md). Preserve inventory, installed enchants and IDs; preview any eligibility changes. Ineligible equipped items move into legal carried storage or saved overflow in the same operation, and lose their active contributions. Rebirth must not duplicate gear or repeat past rewards.

## 8. React Native interface and persistence

Keep inventory helpers outside routes and extend the existing InventoryScreen/shared components. Compact portrait screens use list/detail navigation, equipment summaries and bag tabs. A future grid supports tap item → choose action → tap destination as the primary path; dragging is optional. Preview the full rectangle and keep authoritative placement until the command commits. Use accessible quantity controls and concrete errors such as “Needs a 2 × 3 space” or “Equipment cannot change during battle.”

Search/filter results identify the actual container. Favorites, sorting previews and scroll position are UI state; ownership, placements, locks and quantities belong to the campaign. Prevent panel gestures from reaching the map, support text scaling and safe insets, and use stable keys/virtualization for large collections.

Extend src/data definitions, Zod validation, RPG commands and hero serialization together. Future saved data includes stable item/container IDs, anchors, bag parents, unique armor/enchant state, locks, pickup priority and overflow. Reject duplicate ownership, overlapping placements, cycles, orphan contents and incompatible equipment. Do not repair corruption by deleting items.

The current v7 repository serializes saved campaigns. Town transactions, skill/book operations and manual quest claims use the [durable candidate boundary](../game-plan.md#6-saves-ownership-and-durability), publishing success only after the exact candidate saves and retaining it for retry on failure. Ordinary exploration equip/use commands still use asynchronous autosave; future multi-part recipes should adopt the same candidate boundary. UI previews and animations never perform ownership mutations.

## 9. Delivery and acceptance

First preserve current stacks, equipment, battle consumption and repair. Then add unique item identities where required, grid migration/overflow, placement/stack tools, one ordinary bag, locks and the expanded loadout. Banking, trade/mail, paid storage, expiration, rotation, pets and manual ground drops remain separate extensions.

Acceptance should verify quantity conservation; count-to-stack migration including 999-item saves; stable weapon IDs/wear; rectangle fragmentation; failed sort/swap preserving state; no bag cycles; lock enforcement; deterministic placement; current full-chest rejection; saved reward overflow; maximum burn-output space; battle read-only inventory; and suspend/reload/retry without duplicated grants. Test compact touch controls, large text and native/web storage as well as pure TypeScript rules.
