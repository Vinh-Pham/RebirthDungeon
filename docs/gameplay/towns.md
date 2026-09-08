# Rebirth Dungeon: Towns

Towns are **walkable, safe grid settlements between dungeon runs**, home to service NPCs, instructors, commerce, banking, and recovery. The former abstract "hub" is dissolved: self-service progression lives in a **persistent game UI menu bar**, while town buildings own the NPC-bound half of preparation — learning skills, accepting quests, shopping, banking, healing, resting, and ceremonies.

This is a design specification for planned gameplay, modeled after **Mabinogi**. It complements [skills.md](skills.md), [character.md](character.md), [inventory.md](inventory.md), [battle.md](battle.md), [enchants.md](enchants.md), [quests.md](quests.md), [titles.md](titles.md), [stats.md](stats.md), the [game plan](../game-plan.md), and the [project phases](../project-phases.md). The concepts below are requirements; prices, percentages, footprints, and names are proposed Rebirth Dungeon defaults. This document does not claim towns are implemented.

## 1. Mabinogi reference

| Reference mechanic | Mabinogi behavior |
| --- | --- |
| Starter town | Tir Chonaill is the village where newcomers arrive: a self-sufficient farming town with a healer, grocery, blacksmith, general store, bank, school, church, inn, and chief's house, with dungeons (Alby, Ciar) reachable from its outskirts. |
| Town amenities | A windmill grinds crops into flour; a cooking oven, loom, and spinning wheel provide crafting stations; fields, pastures, the stream, and the graveyard supply gatherable resources. |
| User interface | A bottom-center gamebar shows HP/MP/Stamina gauges and level/EXP; a menu bar of buttons opens Character, Skills, Quests, Inventory, and system menus from anywhere in the world. |
| Commerce | NPCs sell goods themed to their shop; the bank stores gold; part-time jobs and NPC favor systems attach repeatable work and relationships to town NPCs. |

Sources: [Tir Chonaill](https://wiki.mabinogiworld.com/view/Tir_Chonaill), [User Interface](https://wiki.mabinogiworld.com/view/User_Interface), both retrieved and inspected on **September 7, 2026**.

Rebirth Dungeon adopts the walkable service town, the themed shop NPCs, the anywhere-accessible menu bar, banked versus carried gold, and town crafting/gathering stations. It adapts gold carrying into capacity-granting bag items with defeat risk, and Inn rest into the explicit recovery action other specifications require. It does not adopt MMO social systems, real-time NPC schedules, part-time jobs (hook reserved in section 11), NPC favor and gifting, or Mabinogi's full amenity roster.

## 2. From hub to town and menu bar

Earlier specifications used an abstract "hub" as the between-runs preparation layer. This specification replaces it with two concrete layers:

1. **The game UI menu bar** owns self-service progression from anywhere in town.
2. **Town points of interest** own NPC-bound services (section 4).

| Menu bar button | Window contents | Follows |
| --- | --- | --- |
| Character (C) | Stats, equipment slots, titles, age, talent, cumulative level | [character.md](character.md), [titles.md](titles.md) |
| Skills (Z) | Learned skills, training progress, Rank Up with AP, talent view | [skills.md](skills.md) |
| Quests (Q) | Journal with Chapter/Generation tabs, Sidequests, Skills tab, tracker | [quests.md](quests.md) |
| Inventory (I) | Grid inventory, bags, equipment assignments, gold bags and carried total, overflow withdrawal | [inventory.md](inventory.md) |
| Menu | Settings, save information, credits | — |

A persistent status readout shows current HP/MP/SP, level and XP, and carried gold. Hotkeys above mirror the desktop target; touch equivalents are a later presentation concern.

**Run-boundary gating survives unchanged in substance.** Every prior "hub-only" rule — no rank-ups, title swaps, equipment changes, quest claims, or enchant operations during an active run — becomes **"unavailable during an active run."** The menu bar remains visible in dungeons; locked actions show an explicit "unavailable during a run" state, matching titles.md's existing pattern. Run snapshots and exactly-once progression contracts in the other specifications are untouched. Where earlier documents say "hub boundary" or "in the hub," read **"town / between-runs boundary."**

## 3. Town traversal and layout

- A town is one walkable **grid map** using the same 16-pixel tiles and cardinal movement as dungeons, fully visible: **no fog of war, no enemies, no turn consumption**. Towns are safe.
- NPCs stand at their buildings or stations. The player walks to an adjacent cell and interacts.
- **Dungeon entrances sit on the town's edges.** A run begins by physically walking to an entrance, preserving the prepare → walk out → delve rhythm.
- Landmarks — stream, graveyard, farmlands, pastures, and an old ruin — double as gathering spots (section 9) and story anchors, not combat zones.
- A town is **authored content**: a map, an NPC list with service panels, gathering spot definitions, and entrance links. A second town later is additive data, not new systems. The first town is a Tir Chonaill-inspired starting village; all names in this document are illustrative placeholders.

## 4. Points of interest

| Point of interest | NPC (placeholder) | Services | Spec tie-in |
| --- | --- | --- | --- |
| Healer's House | Marla | Paid HP healing; buy potions and bandages | battle.md potions; defeat aftercare |
| Grocery Store | Iris | Buy cooking ingredients: eggs, milk, wheat, barley, meat | Cooking skill (future spec) |
| Blacksmith | Bram | Buy and sell weapons and armor | inventory.md selling; repair deferred |
| General Store | Odd | Utility items: empty bottles, tools, magic powder | Enchant application materials |
| Bank | Petra | Deposit and withdraw gold; sell gold bags | Section 6 |
| School | Cole and Wren | Skill instruction: melee and magic instructors | skills.md NPC acquisition |
| Church | Father Ansel | Buy holy water; donations (flavor-only) | Enchant burning materials |
| Inn | Bess | Paid rest: full HP/MP/SP recovery | Section 7; audit recovery decision |
| Chief's House | Chief Aldric | Mainstream quest offers; rebirth ceremony | quests.md, character.md |
| Windmill | Talla | Grind wheat or barley into flour | Cooking amenity, section 9 |
| Cooking Oven | — | Cook ingredients into food | Station contract, section 9 |
| Gathering spots | — | Farmland, pasture, graveyard, stream, shrubs | Section 9 |
| Quest board | — | One-time sidequest postings | quests.md delivery point |

**Enchant material loop:** the General Store sells magic powder (application) and the Church sells holy water (burning), giving both enchant recipes in [enchants.md](enchants.md) a stable, non-random supply. The Blacksmith sells and buys equipment but offers no repair; a durability system is deferred until separately designed.

Skill **acquisition** happens at the School through instructor lessons under skills.md: completing a lesson grants the skill once at Rank F, with any authored lesson fee previewed first. **Ranking up** remains a Skills-window action; instructors do not advance ranks.

## 5. NPC interaction model

Every service NPC combines a **dialogue shell** with a **service panel**:

- The dialogue shell shows a greeting, current quest lines, and authored flavor — a few lines, skippable.
- The service panel offers role-based actions: **Shop**, **Teach**, **Heal**, **Rest**, **Bank**, and **Talk** as applicable to that NPC. One click reaches the function.
- **Talk** holds two to four static authored topics per NPC ("About the town," "The old ruin"). Topics are the soul of Mabinogi's keyword conversations without unlock or persistence machinery.
- Quest delivery uses quests.md's NPC-offer mode: a dialogue offer accepted in one interaction. Automatic deliveries notify through the Quests window.
- Reserved hooks (deferred): a **Jobs** tab for part-time jobs, NPC favor and gifting, keyword unlocking, and NPC schedules. Panels can gain tabs later without restructuring.

## 6. Gold, gold bags, and the bank

Gold exists in exactly two places, amending inventory.md's single-balance currency rule:

- **Banked balance:** a nonnegative integer held at the Bank. Safe from defeat, no interest, no transaction fees. Deposit and withdraw in exact chosen amounts.
- **Carried gold:** one aggregate total whose maximum is the **sum of owned gold bag capacities**. Gold bags are nonstackable inventory items (1 × 2 proposed) sold at the Bank:

| Gold bag (placeholder) | Capacity | Notes |
| --- | --- | --- |
| Small gold bag | 10,000 | First tier; the only tier in the first slice |
| Gold pouch | 25,000 | Upgraded tier |
| Merchant's chest | 50,000 | Largest tier |

Bags **grant capacity** rather than holding separate coin piles: the player never manages gold per-bag, only carries more or less of it. Owning several bags sums their capacities. Selling or otherwise removing a bag is rejected while carried gold exceeds the remaining capacity; validate before committing, as inventory.md requires.

- **No loose gold exists.** Dungeon gold pickups route automatically into carried capacity using deterministic placement rules. Pickup beyond capacity offers an explicit partial pickup; the remainder stays an unclaimed world item.
- **Shops draw from carried gold only.** The Bank is not a remote payment method. A sale or reward that would exceed capacity is rejected in preview with "Carried gold is full — visit the bank."
- Bank visits are the bridge: withdraw before shopping, deposit after expeditions.
- **Defeat costs carried gold:** a proposed **30% of carried gold, rounded down**. Banked gold is untouched. This is the gold-specific input to the still-open run-loss decision; item and XP retention remain owned by that separate decision. After defeat, the hero wakes in town needing the Healer — the intended greed-versus-safety loop.

Gold bags are ordinary reservable inventory items: a run snapshot reserves brought bags, and their carried gold reconciles under the run's outcome policy alongside other supplies.

## 7. Recovery services

| Service | Effect | Proposed pricing |
| --- | --- | --- |
| Healer — Heal | Restore HP to full | ~2 gold per missing HP; cheaper per point than potions |
| Healer — Shop | Buy HP/MP/SP potions and bandages | Authored prices |
| Inn — Rest | **Full HP/MP/SP recovery** as one explicit action | Level-scaled fee |

- Inn rest is the explicit recovery action the [Documentation Audit](../../Documentation%20Audit.md) and enchants.md identify as a prerequisite for enchant operations; this specification settles that open item.
- Rest and healing fill to **current maxima only**; increasing a maximum never refills it (stats.md).
- In dungeons, potions remain separate full actions before rolling (battle.md); the Healer's service is town-only.
- Aging reconciliation (character.md) re-anchors from "hub or results boundaries" to **town or results boundaries** — a rename, not a rule change.

## 8. Commerce rules

- **Commerce is RNG-free.** Prices are authored; sales and purchases preview exact gold and items before committing.
- **Sell price** is an authored fraction of buy price, provisionally 50%. [inventory.md](inventory.md) item locks block selling locked instances; nonempty bags and reserved items cannot be sold.
- **Stock:** infinite for consumables and starter gear in the first slice; finite authored stock is a later content option.
- Every shop transaction carries an exactly-once operation ID. Re-entering a building, reloading, or retrying a failed save never re-grants purchases, duplicates refunds, or refreshes stock or gathering spots.

## 9. Gathering and cooking amenities

| Spot (landmark) | Yields | Requires |
| --- | --- | --- |
| Farmland | Wheat, barley | Nothing |
| Pasture | Wool | Shears (General Store) |
| Graveyard | Base herbs, cobwebs | Nothing |
| Stream (Adelia analog) | Bottled water | Empty bottle (General Store) |
| Shrubs and trees | Berries, apples | Nothing |

- Gathering is a free, safe interaction with **deterministic yields** per spot. If a later design varies yields, rolls use a dedicated gathering RNG stream per the game plan's stream discipline; commerce and UI actions never consume gameplay RNG.
- Spots respawn on **authored cooldown counts reconciled at town-entry or results boundaries** — offline-friendly, never real-time schedules.
- The **Windmill** grinds wheat or barley into flour. The **Cooking Oven** cooks ingredients into food. Both are station contracts only: the cooking skill's mechanics, recipes, and food effects belong to a future cooking specification. Ingredients come from the Grocery, gathering, and the Windmill.

## 10. Town state, saving, and determinism

Persisted town state includes: the banked balance; gold bag instances and their capacities; gathering spot respawn counters; NPC quest-offer state (owned by quests.md); and shop transaction operation IDs. Town actions are saved transactions in the profile — animations, re-entry, and reloads never grant extra recovery, restock, or gold. Gathering respawn and aging reconciliations use durable boundaries, so closing the app mid-town never loses or duplicates state.

## 11. Deferred and out of scope

| Deferred (hook reserved) | Out of scope for the initial design |
| --- | --- |
| Part-time jobs (Jobs tab, refresh boundary) | MMO social systems: channels, housing, trading post, auction house, pets |
| NPC favor, gifting, keyword unlocking | Real-time NPC schedules |
| Weapon repair and durability | Item or XP loss on defeat beyond the gold rule |
| Fishing, loom, spinning wheel | Weather and seasons |
| Campfire cooking | Field bosses and combat on town outskirts |
| Second town content | — |

## 12. First slice and open items

The first towns slice: one town map; Healer, Grocery, Blacksmith, General Store, Bank, Inn, and one instructor pair at the School; one gathering spot type (graveyard herbs); the small gold bag only; the five-button menu bar with run-gating states; and NPC dialogue shells with one Talk topic each. Chief's House, windmill, oven, further gathering spots, and the quest board follow as content.

Open items: final defeat-loss percentage; gold bag prices and the exact sell fraction; Inn and healing fees; the town map layout; the cooking skill specification this document depends on; and the arrival of a second town. Proposed values above are not final balance.
