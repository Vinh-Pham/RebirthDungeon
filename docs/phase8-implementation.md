# Phase 8 implementation

Phase status belongs to [Project phases](project-phases.md). The [retention contract](phase8-retention.md) defines the inventory-backed outcome policy.

## Ownership and transactions

Main still owns the single authoritative session. Inventory and progression rules work on detached command candidates. Purchases, bank transfers, lessons, books/pages, ranks, loadouts and titles use the same validated command, checkpoint-before-publication and retry boundary as combat. Panels receive copied observations and call pure previews; dialogue traversal never grants anything.

Inventory instances have stable identity, quantity, rolled modifiers, protection, rectangular location, inserted pages and run origin. The backpack is 6×10. Ordinary bags occupy a backpack rectangle and cannot nest; their interiors participate in deterministic placement. Gold bags add capacity and may be carried inside ordinary bags. Placement merges compatible stacks in bag-priority order, then searches rows and columns. Sort/gather stays in one container. Failed purchases, splits, swaps and withdrawals discard the complete candidate. Two-handed weapons displace both hands only if everything fits. A protected item can move or equip but cannot be consumed or sold.

Reward overflow is part of the saved inventory and supports withdrawal only. It cannot be used, sold or directly moved, and blocks new expeditions. New runs reserve 25 gold capacity, enough for both authored encounter rewards. The exit also checks capacity before committing. Banked gold is never spent by shops or lost on failure.

Run entry freezes stats, maxima, ranks, selected titles, age and talent, and records original item identities/quantities. Layout changes preserve provenance; gear and progression changes require town. Consumed potions stay consumed on every outcome. Saved active hands retain their existing cost reservations and independent RNG states. Completed outcomes close their pending ledger, preventing repeat grants.

## Starter progression

The authored resource at `content/progression/starter.tres` supplies:

- Level cap 5; successive XP costs 100, 150, 200 and 250; each level awards 1 AP.
- Each defeated sentinel records 75 pending XP and one matching Focus page. Successful skill activation records 50 pending training, capped at 100 including already committed training. Passing, learning and mere selection grant no training.
- Rank-up is an explicit town action costing 100 training and 1 AP, advances one authored rank, resets training and respects each skill's prototype cap.
- The keeper teaches Blood Strike for 10 carried gold. Spark and completed Focus books teach Rank F with zero training; the incomplete Focus book accepts its two distinct pages.
- Close Combat and Magic are the two starter talents. Talent choice becomes fixed on selection or the first completed outcome. Combat level growth adds 2 maximum HP and 1 Strength; Magic adds 2 maximum MP and 1 Magic Attack. Related Rank F skills contribute 20 mastery XP and higher supported ranks contribute 50; every 50 mastery XP raises the derived mastery level, bounded at 15. Partial training contributes nothing.
- A clear unlocks the First Delver and Guardian Breaker First titles. A Lantern coupon unlocks a Second title. Only equipped effects apply; the optional talent display is cosmetic.

Stat recomputation combines starting profile, life growth, skill ranks, talent mastery, equipment and selected titles. Increasing a maximum never heals; decreasing it clamps current pools. Character and action previews show these sources and changes. Recovery is the existing explicit free keeper service.

## Save compatibility and UI

Save envelope v3 stores strict growth, inventory, overflow and pending run records. The unchanged combat content/RNG version remains 3/1; the added progression contract has its own version 1. V1/V2 envelopes migrate structurally on decode. Existing town gold transfers exactly to the bank, potions become stacks and existing item identities/modifiers survive. Starter bags establish capacity. A legacy active run completes its original retention rules before conversion at the first town return; its locked hand is not rebuilt. Conversion is idempotent and checkpointed.

World buttons open Inventory, Skills, Character and Titles. The keeper's actual Dialogue Manager conversation opens Shop, Bank and Lessons. Transactions require explicit preview/confirmation; service confirmation rechecks keeper proximity and line of sight. Focus loss or scene replacement dismisses the panel, and stale callbacks cannot mutate a later session. Containers, scrolling, focus navigation, grid tap placement and desktop dragging provide input alternatives.

No new artwork was required; existing game art is reused. QuestSystem claims, aging/rebirth, enchanting, advanced skills, broader talent/title catalogs and world loot pickup remain in their later phases. This phase records only committed milestone facts for future quest eligibility.

See [verification evidence](evidence/phase8/README.md).
