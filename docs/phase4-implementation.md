# Phase 4 implementation

The [phase tracker](project-phases.md) is the completion authority. This implementation replaces Phase 3's encounter-resolution shortcut with command-driven combat.

## Ownership and flow

- `CommandResolver` accepts selection, roll, keep, reroll, commit, pass and enemy-action commands. Session/revision/operation checks and complete legality checks precede any mutation or RNG. Accepted commands publish a copied candidate and ordered events.
- `BattleRules` starts one-enemy encounters, freezes inputs and reserves the complete cost vector on the first roll, then pays and finishes an activation once. Hero pools remain exclusively in `SessionShell.hero`.
- `DiceRules` classifies one whole five-die hand and samples integer cumulative weights through the owned combat stream. Reroll indices are validated as a whole and sorted before sampling.
- `CombatMath` supplies the same integer effect calculation to previews and commitment. Physical damage uses effective Strength; magical damage uses the separate Magic Attack stat. Weapon eligibility is checked once; there is no extra implicit weapon damage.
- The separate `scenes/battle/battle.tscn` scene renders copied observations and submits intents. It is a minimal usable rules harness: skill costs, five indexed keeps, rerolls, preview, commit/pass, pools, reservations, status duration and outcome. Phase 5 still owns the full HUD, battle State Charts presentation and Phantom Camera staging.
- `EnemyScheduler` owns a manual LimboAI BTPlayer. The authored `content/ai/sentinel.tres` sequence uses game-owned BTCondition/BTAction scripts and a per-player Blackboard. Tasks read copied legal candidates and return a proposal only. One manual update is the decision budget; missing/failed/RUNNING decisions fall back to pass.
- Legal enemy skills are sorted by stable ID and the first is selected deterministically. There is no random tie selection in this starter policy, so the isolated AI RNG stream is preserved without draws. Combat, AI, generation and loot streams remain independent. Operation tokens include session, encounter, activation and revision, including repeat expeditions.

## Authored starter values

Content version is now **3**; schema/rules/generator/RNG versions remain **1**. These are provisional gameplay fixtures, not final balance.

| Actor | HP / MP / SP | Strength | Defense | Magic attack / defense | Physical / magical protection |
| --- | --- | --- | --- | --- | --- |
| Hero | 30 / 10 / 20 | 3 | 1 | 3 / 1 | 0 / 0 bp |
| Sentinel | 48 / 0 / 10 | 2 | 0 | 0 / 0 | 0 / 0 bp |

Both actors author regeneration of **0 HP, 1 MP, 2 SP** at a completed living-owner activation. Pools and integer stats cap at 1,000,000; protections cap at 10,000 basis points. Damage/shield outputs clamp to 0–1,000,000 after the specified integer calculation. Authoring validation bounds costs, powers, weights, regeneration, status magnitudes/priorities and references.

All starter encounters explicitly choose **hero first**. With equal fixed 100-tick action costs and exactly two living actors, initiative ties favor this authored first actor and turns strictly alternate; no wall-clock timer or spatial ordering participates. Advanced speed/multi-enemy initiative is outside this phase.

Gallery victory adds **10** pending gold, Sanctum adds **15**; the standalone training fixture adds **5**. Sword and Fortify are learned at F. Sword E, Focus, Spark and Blood are extension/test fixtures, not extra starting skills.

## Timing and continuation

Self-applied statuses and cooldowns skip the casting boundary. Statuses use explicit groups and priorities; same-version refresh does not stack magnitude, different equal/higher-priority versions replace, and weaker versions cannot refresh stronger ones. Fortify explicitly replaces shield with its newly rolled amount. Periodic damage runs in stable group order, followed by expiry, pool clamping and living-actor regeneration. Surviving statuses freeze in exploration and clear at run end. Defeat takes precedence over simultaneous enemy death and discards pending rewards.

Victory marks exactly its encounter resolved and holds rewards pending. Returning restores the exploration position/discovery. The dungeon exit moves pending gold into the in-memory committed balance once.

`CombatCheckpoint` captures explicit value-only fields for actors, statuses, battle phase, hand, keeps, locks, reservations, operations, exploration and all RNG streams. Tests encode/decode that DTO and reconstruct fresh state before identical reroll/commit continuation. This is a trusted **in-memory** checkpoint contract, not a hardened external save format. Phase 6 owns disk serialization, validation/migrations, atomic slots and interrupted-process durability.

No new art was needed; the existing hero and sentinel sprites are reused. No asset-generation service was called.

See [fresh evidence](evidence/phase4/README.md) and the [starter acceptance contract](phase4-combat.md).
