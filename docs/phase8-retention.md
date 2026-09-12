# Phase 8 outcome and migration contract

This table is authored before inventory-backed expeditions are enabled. Status belongs to [Project phases](project-phases.md).

| State | Encounter victory | Successful exit | Defeat | Exploration abandonment | App close |
| --- | --- | --- | --- | --- | --- |
| Brought gear, bags, unspent supplies | Reserved, unchanged ownership | Retain remaining quantities/IDs; release reservation | Retain remaining quantities/IDs; release reservation | Same as defeat | Resume same quantities/reservations |
| Consumed supplies | Consumption durable immediately | Never refund | Never refund | Never refund | Resume consumed count |
| Banked gold | Unchanged | Unchanged | Unchanged | Unchanged | Resume |
| Brought carried gold | Unchanged | Retain | Lose floor(30%); bank safe | Lose floor(30%); bank safe | Resume; no penalty |
| Pending gold | Accumulate | Add to carried balance within bag capacity; reserve 25 capacity at entry and recheck at exit | Discard | Discard | Resume |
| New item rewards | Pending with deterministic origin | Grant once; unplaced rewards enter saved withdraw-only overflow | Discard | Discard | Resume |
| XP and skill training | Pending by skill/rank, bounded objectives | Apply XP, then training, once; level AP once | Discard | Discard | Resume |
| Title discovery/evidence | Pending | Commit; clear-only awards require successful exit | Discard pending evidence, retain previously earned titles | Same as defeat | Resume |
| Future quest milestone evidence | Pending facts only | Commit deduplicated facts; no quest engine/claims | Discard pending facts, retain old committed facts | Same as defeat | Resume |
| Reservations and run loadout | Keep exact origin quantities and fixed equipment/title/stat snapshot | Release after reconciliation | Release after reconciliation | Release after reconciliation | Keep |
| Temporary combat effects | Survive frozen between encounters | Clear | Clear | Clear | Resume exactly |

One authoritative hero item collection is reserved for the active run; its immutable origin snapshot is a reconciliation record, never a second spendable inventory. Inventory layout may change before rolling; equipment, learning, banking, ranking and titles are town-only. Overflow cannot be deposited into or consumed; it blocks new expeditions until withdrawn.

Migration: Phase 7 town balances transfer exactly to the safe bank. Existing potions become physical stacks, existing item IDs/modifiers are preserved, and a zero-stat starter sword is supplied only when an old sword loadout has no physical source. A small gold bag and ordinary bag establish starter capacity. New profiles start with no currency. An active Phase 7 expedition/hand finishes under the Phase 7 retention and supply rules; conversion occurs on its first town return, preserving locked combat/RNG and all pre-existing value. No prior clear, AP, XP or title is retroactively awarded.

Starter balance: 6×10 backpack; ordinary bag 3×4 with 1×2 exterior; small gold bag grants 10,000 carried capacity. Shops spend carried gold, bank transfers are explicit at the keeper. Free recovery remains available. The authored progression resource supplies the prototype level cap, XP requirements, AP/rank costs, training counts, talent growth, title effects and deterministic reward sources. Aging, rebirth, quests, enchanting and world loot pickup remain later features.
