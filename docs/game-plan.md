# First-slice gameplay design record

This record preserves earlier gameplay design. See the [current gameplay plan](mabinogi-inspired-gameplay-plan.md) and [architecture](architecture.md) for the playable game.

## 5. Town, characters, and progression

Create a handcrafted Tir Chonaill-inspired Town1 with a square, stream, bridge, outskirts, and northern dungeon approach. Use original art and dialogue/service panels rather than separate interiors.

| Location | Function |
| --- | --- |
| Healer House | Paid restoration and free recovery after defeat |
| Grocery Store | Stamina-restoring food |
| Bank | Character-specific item and gold storage |
| Blacksmith | Weapons and repairs |
| General Shop | Potions, basic armor, and item sales |
| Alby entrance | Dungeon entry and onboarding dialogue |

Initial economy: 100 starting gold, 30 inventory slots, 60 bank slots, consumable stacks of 99, individual equipment instances, sale value 25% of purchase price. Food costs 5 gold and restores 20 Stamina; potions cost 10 gold and restore 30 of their resource; healing costs 10 gold. Weapons start with 20 durability and lose one per committed attack action, not per animation or hit; at zero, halve their weapon contribution. Repair costs one gold per missing point. Keep unarmed attacks available and defer ammunition. Store prices, restrictions, and loot tables in content modules. The richer footprint inventory in [inventory.md](gameplay/inventory.md) is a later milestone, not existing Defold behavior.

Preserve the original progression targets using the saved Mabinogi references, prioritizing current growth tables over contradictory historical prose:

- Shared base stats, a defined combat EXP table, and level 200 cap per life; preserve fractional talent growth.
- Human/Elf can select all four talents; Giant cannot select Archery. Equipment restrictions are independently validated.
- Award one AP per level and five per weekly aging event. Track AP even before the complete ranking UI is implemented.
- Age at Saturday noon in `America/Los_Angeles`, with offline catch-up and talent aging bonuses through age 20, once per boundary.
- Lua's local OS time conversion is not an IANA timezone implementation. Provide a tested timezone/boundary adapter, independent of the computer's timezone, covering DST, clock rollback, and missed weeks. Inject time into domain rules.
- Rebirth cooldowns are 1/2/4/6 days below cumulative level 5,000/8,000/10,000/otherwise, measured from creation or the last rebirth.
- Rebirth allows a compatible talent and age 10–17, no older than current age. Process pending aging and require abandoning an active run first.
- Reset current level, EXP, and temporary growth; retain identity, cumulative progression, AP, learned skills, possessions, and bank.
- Creation grants the starter weapon/skill plus Combat Mastery F and Defense F. Rebirth unlocks new talent starter skills without duplicating item gifts.

Ranked skills, advanced stats, titles, enchants, and the broader quest catalog remain porting work described by the gameplay docs. Do not fabricate values for unverified wiki entries or claim TypeScript catalogs exist in this checkout.

## 6. Alby, combat, quests, and rewards

### Dungeon and encounters

Generate eight connected rooms: entrance, three required encounters, boss room, two optional side rooms, and a treasure room beyond the boss. Join seeded room templates with corridors; validate doors, occupancy, spawns, and boss access. Teach encounters through visible spider contact, a trapped chest, and a room switch. Required encounters unlock the boss gate; optional rooms contain an encounter and supplies.

Include small/white spiders, stronger red spiders, and a Giant Spider with two adds. Persist generated layout, encounters, gates, room-clear flags, and return position. Defeat ends the run and returns the hero fully restored to the healer, retaining claimed rewards and EXP. Confirm early abandonment and retain claimed rewards. Neither defeat nor abandoning a run counts as a successful dungeon clear.

### Turn-based combat

Use the gameplay rules in [the turn-based design](turn-based-plan.md), expressed as pure Lua commands and a serializable queue. There are no dice rolls, holds, reroll rounds, or combination multipliers in this target.

Runtime routing:

`enter → begin_turn → player_input / enemy_decision → commit → present → next_turn / victory / defeat`

A save error returns to a recoverable commit state. The domain turn cursor, turn-start marker, and committed event batch determine restoration; animation state is transient.

- Freeze player Speed at encounter entry: `10 + floor(DEX / 10)`. Initial speeds: White Spider 9, Red Spider 12, Giant Spider 8.
- Sort descending Speed; break ties with a seeded shuffle once, then save the order. Every living actor acts once per round. Skip defeated actors; no mid-battle reordering.
- A player turn allows one optional eligible item followed by **Attack, Skill, or Defend**. The main action ends the turn. Item use persists immediately and keeps the same turn ID.
- Select a living target; Attack/Defend and an available selected skill execute directly. Menus/target selection spend nothing. Show exact cost, cooldown, disabled reason, and item allowance.
- Attack uses the weapon category or unarmed melee. Combat Mastery F–1 controls its base SP cost: `2 + 0.1 × rank_index`, with F = 0 and rank 1 = 14. Apply modifiers and round final Attack cost upward to one decimal place.
- Recover SP once at owner turn start: 0.5 for F–D, 1.0 for C–A, 1.5 for 9–7, 2.0 for 6–4, 2.5 for 3–1. Cap at maximum; preserve fractions.
- Skills use catalog-defined ranks, targeting, weapon/race restrictions, costs, cooldowns, and effects. Defense uses rank-based SP, Defense, and Protection and expires at the next owner turn start. An emergency Wait is legal only when no main action is affordable, as defined in the turn-based contract.
- Share formulas between previews and resolution. Keep the documented critical, multi-hit, status, and owner-boundary policies; previews never roll randomness.
- Enemies submit the same validated commands. Port the spider skill/AI rules from the turn-based design; optional enemy items require explicit finite inventory permission.
- Check termination after actions, reactions, and periodic effects. No dead actor acts, and no later effect grants another victory.

The first combat slice implements the starter skills and spiders with validated Lua content, then expands rank/status coverage. Persist ordered event IDs and a bounded action log alongside outcomes. [Per-battle archives](combat-log.md) are a later storage milestone; logs never execute gameplay commands.

### Quest and dialogue integration

Defold Quest owns objective evaluation; defold-ink owns authored dialogue and choices. Start with **enter Alby → win a battle → defeat the boss → claim treasure and return**. Use stable quest/task IDs and explicit evidence from committed domain actions. The journal reflects committed progress; manual claim commands grant rewards exactly once.

Compile `.ink` to UTF-8 Ink JSON using a compiler compatible with the pinned runtime, package JSON as custom resources, and render paragraphs/choices through Druid. Version story content and persist the selected library save representation. On restoration, suppress external gameplay side effects and rebuild the current dialogue presentation. Quest rewards, trade, and bank operations always go through the session service, even when initiated by story choices.

Broader quest stages, run-banked evidence, tracked quests, overflow grants, and Aren's memory from [quests.md](gameplay/quests.md) follow after the initial loop. A future role-play actor must have isolated stats, inventory, quest state, and RNG; shared singleton modules must never leak progress back into the hero.

### Rewards and treasure

Victory grants EXP once and creates persisted gold/item offers. Support individual selection, Take Selected, and Take All. Preserve unclaimed offers until confirmed departure; never silently discard overflow. Ordinary victories return to Alby. Boss victory grants EXP and one run-specific treasure chest key, then opens the east passage to the walkable treasure room instead of creating an ordinary gold/item offer.

Generate and save five hidden chest offers with boss victory. Each unopened chest costs one key; save key consumption, opened state and pending rewards together. The boss currently drops one key, but multiple keys can open multiple distinct chests. A clickable goddess statue confirms closing the run and returning to the town gate, with collected possessions retained. Unused keys and unopened chests are left behind. Repeated clicks, failed saves, quest callbacks and restart must not duplicate keys or chest payouts.
