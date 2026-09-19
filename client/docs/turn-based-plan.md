# Turn-based battle rework

## Summary

Replace dice combat with individual turns in a fixed Speed order. Each player turn allows **one optional inventory item**, followed by **Attack, Skill, or Defend**. The main action ends the turn.

Remove dice mechanics completely. Convert existing saves immediately, preserving characters and dungeon progress without retaining a legacy combat engine.

## Battle rules

### Turn order and actions

- At encounter entry, calculate player **Speed = 10 + floor(DEX / 10)** using the current resolved stats and frozen run baseline.
- Initial enemy Speed: White Spider **9**, Red Spider **12**, Giant Spider **8**. Future human profiles default to **11**.
- Sort highest Speed first; break ties using seeded randomness once. Persist the resulting order.
- Every living combatant gets one turn per round. Skip defeated actors. Speed changes during battle do not reorder the queue.
- Display the order before the opening action and throughout battle, highlighting the current actor.
- Selecting menus or targets spends nothing. Confirming a valid main action pays its cost and resolves it atomically.
- Check victory and defeat after actions, reactions, and periodic effects; stop further turns immediately when battle ends.

### Player actions and progression

| Action     | Behavior                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Attack** | Uses the equipped weapon’s damage category, or unarmed melee. Combat Mastery determines its stamina cost.                        |
| **Skill**  | Uses a learned active skill with its existing rank, targeting, equipment restrictions, costs, and cooldown.                      |
| **Defend** | Uses the Defense skill’s rank-based stamina cost, Defense bonus, and Protection bonus until the start of the player’s next turn. |
| **Item**   | Uses one eligible consumable without ending the turn. Available only before the main action.                                     |

- Grant **Combat Mastery F** and **Defense F** to new characters and existing characters missing them, including the controlled actor in Aren’s memory. Preserve higher ranks.
- Keep Normal Attack’s persisted `normal` identifier, but give it no separate progression: its displayed rank and cost follow Combat Mastery.
- Normal Attack costs **2 + 0.1 × rankIndex SP**, where F is index 0 and rank 1 is index 14: **2.0–3.4 SP**.
- Every damaging Normal Attack trains Combat Mastery regardless of weapon type. Preserve existing melee training from other attacks without duplicate credit.
- Combat Mastery’s existing melee damage bonuses remain melee-only. Defense retains its existing training and AP progression.
- At the start of each player turn, recover stamina according to the frozen Combat Mastery rank:

| Ranks   | SP recovered |
| ------- | -----------: |
| F, E, D |          0.5 |
| C, B, A |          1.0 |
| 9, 8, 7 |          1.5 |
| 6, 5, 4 |          2.0 |
| 3, 2, 1 |          2.5 |

- Cap recovery at maximum stamina. Preserve fractional values; show sufficient precision in costs and resource displays.
- Apply existing cost modifiers to Attack, rounding its final cost upward to one decimal place. Preserve existing whole-number rounding for other skills.
- Remove Recover and ordinary Pass. Show **Wait** only when no legal main action is affordable. Wait is free, provides no extra recovery or defense, and ends the turn.
- Item use neither advances cooldowns nor triggers regeneration or periodic effects. A failed item use does not consume the allowance. Both inventory and battle-menu use share the same persisted allowance.

### Damage and effect timing

- Remove pip contributions, combination multipliers, weighted rolls, holds, and rerolls.
- Offensive power becomes the existing rank base plus the existing weapon/stat contribution and rank attack multiplier. Preserve current multi-hit allocation, including Arrow Revolver’s authored behavior.
- Keep mitigation, critical hits, shields, durability, training, and kill credit shared between previews and resolution.
- Healing restores `floor(rank.base × 5)` HP; Final Hit grants its rank base as the attack bonus. Counterattack uses direct skill power plus its existing opponent-attack contribution.
- Defense and unused Counterattack expire at the owner’s next turn start. Counterattack still negates and retaliates against the first eligible melee hit.
- Cooldowns and ordinary status durations advance once at the owner’s turn end, preserving the existing exclusion for the casting/application turn.
- Mana Shield lasts until the third subsequent owner turn begins, paying upkeep once at each such boundary. It never pays upkeep separately for each enemy.
- Combat Mastery recovery happens only at turn start; existing status-based regeneration remains at turn end. Neither can repeat after reload.

## Implementation changes

### Domain, enemy decisions, and runtime

- Replace the battle’s dice state with a serializable turn state: fixed actor order, captured Speed, cursor, round, unique turn ID, item-used flag, and turn-start completion state.
- Replace dice commands with typed main-action commands, battle item use, conditional Wait, and an internal enemy-turn command. Require the expected turn ID to reject stale submissions.
- Keep the existing command → XState → Immer → persistence → publication pipeline. Save each actor’s outcome and queue transition before publishing or animating it.
- Resume pending enemy turns after reload through the same guarded transaction path. A failed write leaves the previous committed turn intact.
- Move the seeded random generator into a neutral module for initiative ties, critical hits, dungeon generation, and rewards; delete the dice module.
- Introduce enemy profiles containing Speed, resource pools, skills, cooldowns, guard strength, and optional finite consumables. Reuse shared cost, damage, status, and item-effect resolution.

**Initial enemy defaults:**

- Preserve current HP, attack, defense, rewards, and encounter composition.
- Spiders start with 20 SP, recover 0.5 SP per turn, spend 2 SP on Attack and 1 SP on Defend. Enemy Defend grants +2 Defense and +5 percentage points Protection until their next turn.
- White Spider gains Pounce: 1.25× attack. Red Spider gains Poison Bite: normal attack power plus existing poison. Giant Spider gains Armor Break: normal attack power plus the existing armor-break effect. Each costs 4 SP with a two-owner-turn cooldown.
- Move poison/armor-break application from every normal hit to these named skills.
- AI priority: use an eligible potion at or below 35% HP; then Defend at or below 25% HP unless it defended last turn; otherwise use a ready affordable skill, Attack, affordable Defend, or emergency Wait.
- Only profiles explicitly allowing items can use them, at most one before their main action. Test a human profile with one existing HP potion; do not add humans to dungeon encounters.

### Presentation

- Replace the dice panel with **Attack / Skills / Items / Defend**, a turn-order strip, target selection, action preview, and readable action log.
- Skills excludes the separate Attack and Defend entries and retains paging or scrolling.
- Show exact costs, cooldowns, disabled reasons, and “Item available” / “Item used.”
- Implement accessible React/HeroUI battle controls; retain Phaser for battlefield visuals and target highlighting. Both use the same domain selectors.
- Preserve keyboard focus, touch usability, reduced motion, window input ownership, and layouts down to 320px.
- Update Combat Mastery details with Attack cost and turn recovery; show Speed in character details.

### Save conversion and cleanup

- Upgrade schema 4 to **schema 5**, including nested RP actors and earlier supported save versions.
- Preserve resources, inventory, ranks, training, enemy HP, statuses, cooldowns, rewards, quest progress, and frozen run data.
- Discard unfinished dice selections and unpaid reservations without charging or resolving them. Reopen the player’s turn with a fresh item allowance and no migration-time recovery.
- Compute the fixed order for converted battles, placing the cursor at the player and treating earlier positions as already passed for that partial round.
- Preserve already-applied effect magnitudes and remaining durations; convert temporary defenses/reactions to the new turn boundaries and remove obsolete combination fields.
- Add missing starter skills to profile and frozen run skill records. Add only their missing baseline contributions; do not rebuild the run from current profile stats or refill pools.
- Retain the pre-upgrade backup and explain the conversion through the existing migration notice.
- Remove dice commands, scoring, rank weights/pip fields, UI, tutorial text, and obsolete tests. Migration only reads/discards obsolete data; it never executes old combat.
- Update current gameplay, architecture, skill-adaptation, inventory, and verification documentation. Preserve original wiki source data.

## Validation and acceptance

- **Turn scheduling:** player-first/enemy-first battles, seeded ties, fixed order across rounds, dead actors skipped, counterattack kills, and immediate battle termination.
- **Economy:** every mastery rank’s Attack cost and recovery; fractional arithmetic; resource caps; Defense race/rank costs; universal mastery training; emergency Wait eligibility.
- **Items:** item then action, second item rejected through every entry point, failed use rollback, reload after use, finite human potion supply, and monsters unable to use items.
- **Effects:** identical preview/resolution calculations, single/multiple targets, critical hits, Defense expiration, Counterattack, Mana Shield upkeep, poison, regeneration, and cooldown timing.
- **Persistence:** every supported migration, unfinished old actions, frozen baselines, RP isolation, duplicate commands, reload between enemy turns, failed writes, and read-only tabs.
- **Browser journeys:** complete dungeon and boss reward flow, all four controls, inventory integration, turn-order display, reloads, Aren’s memory, keyboard access, and narrow screens.
- Run lint, typecheck, coverage with existing 90% gates, production build, and affected browser suites. Report actual browser limitations and failures.
- No commits, pushes, or deployment. No party system, real-time gauges, dynamic initiative, or new human encounters in this change.