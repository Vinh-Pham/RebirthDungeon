# Phase 4 starter combat contract

Authored 2026-09-08 for content version 2, rules version 1. These are deliberately small prototype values, not final rank tables. [Battle](gameplay/battle.md) owns action rules and [Stats](gameplay/stats.md) owns calculation and timing rules; this document specifies their initial balance choices and integration boundary.

## Starter actions and recovery

| Skill | Rank | Cost HP/MP/SP | Effect | Equipment / target | Cooldown |
| --- | --- | --- | --- | --- | --- |
| `skill.sword` | F | 0/0/5 | B=2, physical A, K=1; fair weights 1/1/1/1/1/1 | Sword; adjacent hostile | 0 |
| `skill.sword` | E | 0/0/5 | B=4, physical A, K=1; weights 1/1/1/1/2/2 | Sword; adjacent hostile | 0 |
| `skill.fortify` | F | 0/0/4 | Replace shield with floor((2 + pips) × combination); 1 subsequent owner activation | Self | 1 subsequent owner activation |
| `skill.focus` | F | 0/3/0 | `status.strength`: STR +3, 3 subsequent owner activations; dice do not change magnitude/duration | Self | 0 |
| `skill.spark` | F | 0/5/0 | B=2, magic A, K=1; fair dice | Adjacent hostile | 0 |
| `skill.blood` | F | 4/2/2 | B=2, physical A, K=1; fair dice; HP must remain ≥1 | Adjacent hostile | 0 |
| `skill.enemy_strike` | F | 0/0/3 | B=4, physical A, K=0, multiplier 1; then STR −3 for 3 target activations | Adjacent hero; no dice/RNG | 0 |

Every completed living-actor activation regenerates 0 HP, 1 MP and 2 SP, after periodic effects, expiration and maximum clamping. These rates are authored `stat.regen_*` definitions and can use the stat modifier resolver. At zero MP/SP, a free pre-roll pass remains legal; enemies still receive their activations. There is no free attack, implicit HP healing, potion use or Inn access. Enemy attacks also require affordability; an exhausted enemy waits and regenerates. A post-roll pass pays the locked vector before the same activation-end processing. Recovery cannot fund the cost of its own activation.

All five dice have stable indices 0–4. Reroll subsets are validated completely before any draw and sampled by increasing index regardless of request order. All replacement results stand. Kept flags can be toggled freely after rolling. No animation/panel command exists in the simulation; post-lock movement, selection and item use are rejected. Free selection may open an activation without a bump. A bump opens it even if the default sword is currently unaffordable, allowing another skill or a pass.

The default starter hero knows the five named player skills at F and carries a sword legality tag. `CombatLoadout` supplies a detached learned-rank/equipment/modifier snapshot, including sword E for tests or a later profile consumer. Actual item identity and equipment transactions remain Phase 7. Smash and Combat/Sword Mastery are deferred until their rank values and progression consumers are authored; they are not aliases for the starter sword.

## Arithmetic, status order and ownership

Modifiers use integer basis points (10000 = 100%). Protection stat values use percentage points (100 = full resistance). Stat terms accumulate as exact fractions; floor once per stat after summed flat and percent modifiers, then clamp. Direct derived modifiers apply after primary modifiers and derivation. Sources must be unique per stat. HP current/max stay in `Health`; `ResourcePools` owns MP/SP current/max and all three reservations, so there is no duplicate authoritative HP value.

Damage uses two floors: flat defense before the combination floor, then Protection before its floor; shield absorbs last. Preview and commitment call the same resolver. Upfront HP payment bypasses defense and shield. Shield replacement does not stack. Shield expiry and cooldown decrement skip their casting boundary.

Statuses retain definition/source IDs; one instance per target/stacking group. Same-version application refreshes without stacking; lower priority cannot replace or refresh, equal/higher priority replaces. Distinct groups resolve in group-ID order. On each eligible owner boundary: physical periodic damage through the shared damage resolver, explicit recovery if still alive, duration decrement/expiry, shield/cooldown expiry, recomputation/clamping, then regeneration. A self-applied status skips its casting boundary. A status applied by an enemy first counts at the hero's upcoming completion. No effect ticks when applied or on dice commands. Maxima rising never refill; maxima falling clamp permanently.

## Encounter, floor and expedition boundaries

An encounter participant is a hostile explicitly contacted by a player bump or hostile selection, or an enemy that reaches the hero and attempts its authored response. Contacted hostiles join the current participant set. An uncontacted hostile elsewhere is not automatically a participant. Empty floors do not start or win encounters.

At activation completion, finish all status effects and remove dead occupancy/initiative entries before selecting the next actor. Evaluate hero defeat first, otherwise victory only when a nonempty participant set has no living members. Publish one outcome and clear participation. A later contact starts a new encounter. Final hero identity/HP remain available for a defeat observation, but the hero is removed from occupancy/initiative and all later commands reject.

Victory does not stop exploration or grant loot, XP, training, a floor objective, or expedition completion. `ExitReached` is still a floor objective marker. Only a future application outcome policy may translate eligible evidence to an expedition result. `AbilityUsed` marks committed use for future training consumers; passing never emits it.

## Phase 5 integration boundary

Create a `RunSession` with `combatEnabled = true` for the command-only combat slice. It owns the same World and scheduler, with dice/ability/damage/status systems registered before cleanup. Existing production sessions default to movement-only until Phase 5 installs combat controls and whole-activation checkpoints. No user-facing combat control is claimed by Phase 4.

`combatObservation()` exports detached, visibility-filtered actor values and previews. `canonicalState()` includes all authoritative combat state, including hidden actors, only for replay/testing. The old movement `restoreExport()` explicitly refuses combat sessions rather than producing a lossy checkpoint. Content v1 remains loadable for its historical movement fixture; combat requires authored content v2. No automatic v1→v2 save migration or mid-roll restore is claimed.
