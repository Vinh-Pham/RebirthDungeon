# Rebirth Dungeon: Towns and Services

Updated **October 1, 2026**. The app already contains the authored refuge, connected interiors, NPC conversations, shops, repair, healing, F/E enchanting and dungeon entry. This document records those services and plans their progression extensions for the Expo/React Native game. Read it with [Inventory](inventory.md), [Character](character.md), [Skills](skills.md), [Quests](quests.md), and the [game plan](../game-plan.md).

## 1. Refuge and movement

The starting refuge is an authored **20 × 18 tile map**, with entrances to shops and training halls. Towns use the same cardinal tile-command exploration model as dungeons. A move validates walkability; tap-to-travel follows the existing pathfinder. NPC interaction requires Manhattan distance at most one. Sprite movement and camera effects visualize accepted commands and do not define reachability.

No town combat, continuous physics, NPC schedules or exploration fog is implemented. Buildings switch the authored map/entry position within the selected character's JourneySession; they do not create a new hero or game host. A service command needs the currently open NPC, its authored service, valid proximity and a non-dungeon/non-encounter context. Moving away or changing context invalidates stale service requests.

The one-time supply chest grants the starter iron blade only after its item grant succeeds. Its claimed flag prevents repeat collection. Ordinary NPC dialogue is static authored content, not a live keyword/favor system.

## 2. Current service catalog

| Refuge service      | Existing actions                                       | Notes                                                                                          |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Orchard Grocery     | Buy apples and bread                                   | Food restores authored stamina/fullness; not battle-usable                                     |
| Ember Forge         | Buy iron blades; repair owned weapons                  | Repair includes an equipped weapon and preserves its instance ID                               |
| The Wanderer’s Pack | Buy HP/MP/SP potions and moss mail; sell owned items   | The current service that buys items from the player                                            |
| Healer House        | Paid full recovery                                     | 10 gold; restores HP, MP, SP, wounds and fullness                                              |
| Refuge keeper       | Free Smash Rank F lesson and quest offers/claims       | The introductory melee lesson awards 3 AP once; rank advancement remains in the Skills journal |
| Training halls      | Explore/interact with authored NPCs                    | Learned-rank lessons and mastery systems remain planned                                        |
| Dungeon altar       | Offer an unequipped item and enter a generated dungeon | Owns generation/entry validation rather than a shop transaction                                |

Do not describe an existing bank, inn, cooking station, quest board, instructor rank-up service or enchanting bench. Add their content and commands when their feature milestone ships. Display only services supported by the current NPC definition.

## 3. Current commerce and repair

Gold is one nonnegative hero balance capped at **1,000,000**. No loose-coin item, gold bag or protected bank balance exists. Shops use authored prices and consume no RNG. Item capacity is currently a count bound of 999 per definition, not a footprint grid.

A purchase validates an integer quantity, stock definition, item capacity and total price on a staged hero before committing items/gold. Consumable/starter stock is authored rather than a simulated economy. The general store pays **floor(item price / 2) × quantity**. Selling an equipped weapon is rejected; an equipped armor copy is reserved, although extra unequipped copies of its definition may be sold. Validate incoming gold against its bound before accepting a sale.

Weapon repair costs **ceil(item price × 0.5 × missing durability / maximum durability)**. It requires an owned repairable instance, missing durability and enough gold. Fully repaired weapons are rejected without charge. The current iron blade costs 30 gold and has maximum durability 60; repair changes that same instance's durability. Breakage is an implemented combat consequence, not a deferred town feature.

Healer recovery costs 10 gold and uses the current full-restore rule, including clearing wounds and restoring fullness to 100. An already fully recovered hero is rejected without charge. Raising a resource maximum through future gear, skills or titles is separate from paying for recovery and must not refill pools. [Stats](stats.md).

All services revalidate at confirmation. Preview exact quantity, price and repair/recovery effect; opening/closing a panel does not charge, heal, tick resources or refresh state. Existing autosave is asynchronous; the selected JourneyHost now stages purchases, sales, repairs, healing and offerings as durable candidates. Success is published after saving; a failed write retains the exact candidate and blocks dependent mutations until retry. An abrupt shutdown before a successful write may still restore the previous checkpoint.

## 4. Dungeon preparation and return

Players may inspect resources, buy/use supplies, repair and change equipment before entering. The altar accepts one owned, unequipped offering: an ordinary item quantity or a specific weapon instance. It stages removal, cloned journey RNG, seed, generated blueprint and entry state, then validates the entire candidate before publishing. Rejected entry consumes neither offering nor RNG. Accepted entry consumes the offering immediately; it is not held in a profile reservation.

The campaign hero continues through the dungeon and supplies each encounter separately. Equipment can change during exploration between encounters; town services are unavailable inside the dungeon. Planned learning, rank-up, title changes, quest claims and enchanting are also town-only. Read-only feature journals can remain available.

The entrance statue allows an early return with already committed gains. Completing the boss/key/final-chest route permits the final exit. Defeat returns the hero to the refuge, restores all resources/wounds/fullness and retains inventory, durability wear and previously earned progression, while setting gold to **floor(current gold / 2)**. Do not replace this implemented rule with the older proposed 30% loss or paid post-defeat recovery.

There is no town menu action that grants a second copy of encounter loot or skill training after return. Dungeon completion objectives must use the specific completed-run outcome, rather than any return to town.

## 5. Planned town progression

Keep the reference-inspired town as a small set of useful destinations rather than a collection of desktop windows. Proposed additions:

| Future service        | Dependency and behavior                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Instructors           | Skills plan: NPC lessons, owned ranks, prerequisite checks and AP/training rank-up                        |
| Library/book merchant | Book/page acquisition and assemblies using inventory output validation                                    |
| Quest NPCs/board      | Offers, delivery and manual claims from Quests; state belongs to the hero                                 |
| Title management      | Equip earned First/Second titles with a complete stat preview                                             |
| Enchanting            | Prefix/suffix attempts and separate destructive burning; frozen chance/cost preview                       |
| Inn                   | Optional priced recovery alternative; must have a distinct purpose before adding another full-heal button |
| Bank                  | Optional future carried/banked economy with a defined migration and defeat policy                         |
| Rebirth service       | Explicit reset/preserve preview and town-only confirmation after Character is implemented                 |

The first instructor and book/page routes are implemented. The next slice now includes NPC offers, delivery/manual quest claims, a journal/tracker and an earned story title. Title equipment, additional item instances and enchanting materials remain future work. Existing shop IDs, prices and save IDs remain stable unless deliberately migrated.

An optional future bank may offer exact deposits/withdrawals and a protected balance. Gold bags could add carried capacity, with proposed capacities of 10,000/25,000/50,000. These are later economy proposals: they must not retroactively strand current gold, silently change defeat losses or become requirements for the present loop. Validate removing a capacity bag before mutation, and define full-reward handling before the economy ships. Use [Inventory](inventory.md) overflow rules where appropriate.

## 6. Dialogue, gathering and amenities

NPC panels combine a short authored conversation with their supported service buttons. Later offer two to four topics, quest offers and instructor hints; the dialogue view observes saved quest/skill availability. Closing a conversation is not acceptance of an offer. NPC favor, gifts, keyword unlocking and part-time jobs require explicit progression before adding UI tabs.

Gathering and cooking are planned. Suggested refuge amenities include farmland for wheat/barley, pasture for wool, a herb patch, water collection, fruit trees, a mill and a cooking oven. Tools, recipes, inventory outputs and skill ownership must be defined with those features; there is no existing cooking system to call.

Start gathering with deterministic authored yields and a saved action/count-based replenishment rule. Passive time spent in a panel, repeated map entry or app relaunch must not refill a spot. If random yields are later introduced, persist the dedicated stream and exact accepted result. Validate output capacity after simulating inputs before spending tools/materials. Meals use the existing fullness/stamina model with explicit effects rather than an undocumented recovery timer.

Second towns, schedules, seasons, MMO trading/housing and social systems are outside the immediate plan. A second town should add a meaningful service/content role and explicit map links instead of copying all refuge services.

## 7. React Native integration and saving

Town content lives in src/data and is validated through ContentRegistry. JourneySession and RPG commands own movement, service legality, prices and hero mutation. React Native NPC/service views dispatch requests through the selected character's JourneyHost and show its copied observations. Keep new components/hooks outside src/app; Expo Router only owns screen/layout navigation.

Portrait service panels use a scrollable list/detail flow, safe-area padding, accessible quantity controls, named actions and a visible Back/Close. Close or disable a service panel when its NPC/context is no longer valid. Panel taps and scrolling must not reach the world map. Long names, large text and keyboard focus on web must remain usable. [User interface](user-interface.md).

New quest/skill/bank/gathering fields belong in versioned campaign saves with validation and migration. For multi-part service operations, adopt the [durable candidate boundary](../game-plan.md#6-saves-ownership-and-durability): save the complete accepted candidate before success, retain the same candidate on write failure and block dependent mutations until resolved. Recovery/retry must not charge twice or resample an enchant outcome. Native SQLite and web IndexedDB share the serialized repository contract.

## 8. Verification and open balance work

Preserve current map transitions, proximity checks, supply-chest claims, 999-count/1,000,000-gold bounds, equipped-item sale rejection, exact sell/repair rounding and paid full recovery. Test rejected services without item/gold/RNG changes; dungeon services unavailable; early return and defeat retention; and service panels invalidated by movement/context changes.

The initial instructor/quest eligibility, delivery readiness and durable service/claim retries have engine/persistence coverage. Future acceptance adds title equipment, bank migration if adopted, gathering persistence, recipe output capacity and native large-text touch interaction. Run lint/typecheck and the relevant pure engine/persistence tests when implementing, then smoke-test on iOS, Android and web. Current prices and defeat policy remain authoritative until a tested, explicit balance change replaces them.

## Enchanting pilot

The refuge keeper offers a free Enchant F lesson with zero training and no AP award. The blacksmith sells Keen/Studious/Vigor/Resilience scrolls, Enchant Powder, Mana Herb and Holy Water. Its service has a separate enchant chooser and explicit destructive burn preview. Applications and burns require a nearby open service in town, learned Enchant, unlocked owned equipment and the previewed inputs. Costs, equipment, rolled values, outputs, training, RNG and receipt become live only after the host candidate saves; Retry saves the same retained result. See [Enchants](enchants.md) for balance and conditions.
