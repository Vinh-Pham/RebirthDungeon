# Turn-based battle rework for RebirthDungeon.Ktx

**Status: first playable slice implemented; mobile gameplay acceptance remains open.** Updated 2026-09-19. JVM checks and desktop interaction are verified; Android packaging and iOS AOT succeed. iOS still stops at the historical content-loading error. See [verification evidence](evidence/turn-based/verification.md).

Replace the five-dice battle loop with individual turns in a fixed Speed order. Each turn allows **one optional consumable, then Attack, Skill, or Defend**. The main action ends the turn. Preserve continuous exploration, separate encounter Worlds, deterministic rules, and the existing native application.

This document is the implementation tracker and accepted replacement for the dice requirements in [AGENTS.md](../AGENTS.md) and [battle.md](gameplay/battle.md). [Kotlin architecture](kotlin-architecture.md) records current ownership and persistence. Sections 1–7 describe the contract; section 8 records delivery and remaining gates.

## 1. Project baseline and scope

The pre-rework baseline was a Kotlin/libGDX game with `core`, `lwjgl3`, `android`, and `ios` Gradle modules. Production paths below are relative to `core/src/main/kotlin/cloud/vinh/rebirthdungeon/`; tests mirror them under `core/src/test/kotlin/`.

| Area | What exists here | Consequence for this rework |
| --- | --- | --- |
| Exploration | `ExplorationSimulation`, polygon navigation, explicit 60 Hz steps | Keep movement, discovery, encounter triggers, and two-second movement checkpoints. Exploration pauses during battle and consumes no battle turns. |
| Session | `SessionCoordinator` owns exploration, supplies, pending rewards, and mode transitions | Continue saving the complete session bundle; battle must not independently save inventory or rewards. |
| Combat | `BattleSimulation`, `BattleSession`, `BattleWorld`, `CombatRuntime`, ordered artemis systems | Replace the dice activation inside the existing encounter World. Do not introduce a second engine or mutable combat store. |
| Initiative | `TurnScheduler` uses due ticks and insertion order | Replace this with a persisted fixed round order; the existing scheduler does not already implement Speed. |
| Content | Strict Jackson DTOs, validated `ContentCatalog`, `assets/data/manifest.json` and `starter.json` | Update these definitions and validators. No TypeScript registry or Zod schemas. |
| Randomness | Juniper `AceRandom` behind `RandomSource` and `RunRandomStreams` | Retain the adapter and generation/AI/combat/loot streams, including their complete saved states. |
| Saves | `AlternatingSessionRepository`, LibGDX JSON codecs, checksums and read-back validation | Keep alternating local bundles and blocked retry behavior. No IndexedDB, browser writer lock, or legacy conversion. |
| Presentation | `BattleScreen`, Scene2D `BattleHud`, `BattleInput`, `BattleView`, `CombatTracks`, `GdxCombatFeedback` | Rework existing native controls and event consumers. No React, Phaser, HeroUI, or wmkit. |
| Playable content | One hero and at most one enemy per encounter; prototype sword, fortify, focus, spark and blood skills; two potion types | Deliver and balance this slice first. Spider families, ranked mastery progression, advanced skills, and RP missions are not implemented Kotlin features. |
| Tests | JUnit 4 JVM suites and separate native checks | Extend the existing tests; there is no Vitest, fast-check connector, or established 90% coverage gate. |

The working tree currently removes `game-plan.md`, `directory.md`, `project-phases.md`, and `free-exploration.md`. Their historical contracts were consulted through Git without restoring those files. Several replacement documents, including [skills-implementation.md](gameplay/skills-implementation.md), [combat-log.md](combat-log.md), and [verification.md](verification.md), contain browser-project implementation claims. Treat those claims as adaptation material, not evidence about this repository. Their browser claims are now explicitly labeled reference material. The current contract is [kotlin-architecture.md](kotlin-architecture.md); imported schema numbers and completion claims do not apply.

### Required first delivery

- Fixed Speed order, explicit turn boundaries, Attack/Skill/Defend, one optional potion, and conditional Wait.
- Current one-enemy encounters and current exploration/town/reward loop, with new combat content and fractional SP support.
- Resumable turns, deterministic events, save-failure retry, shared previews/eligibility, and native battle controls.
- Removal of runtime dice commands, reservations, scoring, and UI after their replacements work.

The broader progression and content requests from the original plan are retained in section 10 with explicit prerequisites. They are not silently treated as existing behavior or prerequisites for this first delivery.

## 2. Architecture and ownership

Keep one artemis-odb `World` per active encounter, configured by `WorldConfigurationBuilder`. Register each system class once in visible execution order. Components remain mutable plain Kotlin classes with public no-arg constructors; stable project IDs, never recycled ECS entity indices, identify actors externally.

`game/` owns deterministic rules and imports no Gdx, application/data/presentation code, clock, file I/O, or platform services. `application/run` serializes battle commands; `application/session` owns expedition transitions and the complete save bundle; `data` owns serialization and storage; `presentation` submits requests and reads detached observations. Mutation and `World.process()` remain serial on the render thread. Worker results must return through the existing generation-token-checked handoff. No recursive processing, real-time battle timers, or interval systems.

| Existing location | Planned responsibility |
| --- | --- |
| `game/turns/TurnScheduler.kt` | Fixed order, captured Speed, round, cursor, unique turn sequence, removal/skipping and restore validation |
| `game/BattleSession.kt` | Encounter identity, scheduler and turn-boundary state, counters, outcome and RNG ownership |
| `game/commands/CombatCommands.kt` | Typed actor/turn-scoped action requests; remove dice requests |
| `game/CombatRuntime.kt`, `game/combat/abilities`, `stats`, `statuses` | Shared action eligibility, costs, formulas and effect timing; extract focused pure rules as needed |
| `game/ecs/systems` | Ordered validation, boundary, action, effect, cleanup and finalization orchestration |
| `game/events`, `projection`, `replay` | Immutable ordered events, separate observed/restore exports, canonical state including new turn fields |
| `application/run/BattleController.kt`, `BattleView.kt` | Submission guards, automatic progression, checkpoint gating and committed battle view |
| `application/session/SessionCoordinator.kt`, `SessionRestore.kt` | Atomic supply consumption, battle entry/exit, rewards and full-session restore |
| `data/content`, `data/save/codec` | Strict new content and save shapes, integrity validation, explicit unsupported-version errors |
| `presentation/screens/BattleScreen.kt`, `hud/BattleHud.kt`, `input/BattleInput.kt` | Turn strip, action controls, targets, costs, log, keyboard/touch input |

Keep the existing modules, source roots and dependency pins. Kotlin shared code must retain JVM 1.8 bytecode and the Java 8 API surface. No new runtime or test dependency is required. Use the existing artemis, Juniper, Jackson, KTX/Scene2D and JUnit facilities. Do not add a package manager or reintroduce SquidSquad/SquidLib.

## 3. Turn order and command contract

### Fixed initiative

1. At encounter entry, calculate player **Speed = 10 + floor(resolved DEX / 10)** from the frozen loadout/baseline and effects active at entry. Capture the result for the battle.
2. Give the existing generic enemy an explicit content Speed. **9 is the provisional starter value**; use test fixtures for enemy-first and tied orders. Do not rename it into a spider or alter encounter composition incidentally.
3. Sort descending Speed. Within each equal-Speed group, start in ascending stable actor-ID order and perform one seeded Fisher–Yates shuffle using the combat stream. Never draw randomness in a comparator; singleton groups consume no draw.
4. Persist the final order and RNG continuation in the entry checkpoint before accepting battle input. Every living actor receives one turn per round. Mid-battle Speed changes never reorder the list.
5. Keep the fixed order as battle metadata, skip defeated entries, and increment the round only on wrapping the order. Removed ECS actors remain identifiable through immutable participant metadata. Stop traversal immediately when the encounter ends.

The first slice remains one hero versus one enemy; scheduler unit tests may use larger actor lists without expanding encounter content or relaxing `BattleSimulation`'s current actor-count validation.

### Turn state and requests

Persist battle identity (the existing battle `runId` field may serve this role), participant metadata, captured Speed/order, cursor, round, a monotonically increasing turn sequence, `turnStarted`, and `itemUsed`. Combine battle identity and sequence to identify a turn. Keep the controller's session token and expected command revision as additional guards: a turn ID alone cannot reject two clicks within the same item-then-action turn.

Define typed requests for Attack, UseSkill, Defend, UseBattleItem and Wait, plus an internal BeginTurn request. Each action carries actor, expected battle/turn identity, and relevant content/target IDs; the application envelope retains the expected session token and revision. Names are illustrative; extend the existing `RunCommand` boundary rather than creating a parallel command bus.

Validate active/living actor, initialized turn, encounter membership, allegiance, learned rank, equipment, cooldown, all required pools, item stock/allowance and Wait eligibility. Presentation uses the same eligibility calculations, but simulation/application validation remains authoritative. Reject stale or invalid requests without changing counters, resources, status clocks, supplies, RNG or events.

Selection and preview are presentation state until confirmation. A confirmed main action validates and pays once, resolves once, and ends the turn. There is no saved dice selection, cost reservation, or opportunity to change a confirmed target. HP costs must leave at least 1 HP and bypass mitigation/shields.

### Boundary order

Use explicit command phases, not frame callbacks:

1. **BeginTurn:** reject repeated starts; expire next-owner-start effects such as Defend; recompute/clamp affected pools; apply authored start effects and stamina recovery for a living actor; evaluate the outcome; mark the boundary complete and reset the item allowance. Save before player input or enemy decisions.
2. **Optional item:** validate stock and effects, consume one item, resolve it, set `itemUsed`, and checkpoint. Remain on the same initialized turn. No cooldown tick, regeneration, duration decrement or cursor advance.
3. **Main action:** validate, pay costs, resolve authored effects and any enabled reactions in stable order, and check casualties/outcome after each complete effect or reaction group.
4. **Owner turn end:** if battle continues and the actor lives, process eligible periodic effects, duration/cooldown updates, stat recomputation/clamping and authored end regeneration once. Self-applied effects/cooldowns skip their casting boundary using explicit saved markers. Check termination during periodic resolution; dead actors do not regenerate.
5. **Finish:** record one turn-end event/counter update, then advance to the next living actor with `turnStarted = false`. A terminal action finalizes its turn once without selecting or starting another actor.

A terminal effect group stops later groups and later turn boundaries. If one atomic group defeats both sides, defeat takes precedence. This deliberately replaces the old specification's delayed outcome check after all activation-end work. Tests must pin last-enemy kills, periodic death and simultaneous-defeat policy so system registration order cannot change it.

## 4. Actions, resources and balance

| Action | First-slice behavior |
| --- | --- |
| **Attack** | Available without choosing a skill from the menu. Use a new explicit `skill.normal` content definition, current physical attack contribution and legal hostile target. Future weapon categories use their authored scaling. No browser `normal` save identifier needs preservation. |
| **Skill** | Execute a learned prototype skill at its captured rank, validating its existing equipment, target, costs and cooldown. Preserve current content IDs unless a documented replacement is necessary. |
| **Defend** | Spend authored SP to gain Defense and Protection until the next owner turn begins. Add an explicit definition and start-boundary status; do not silently equate it with the existing Fortify shield. |
| **Item** | Use a carried potion from `SessionCoordinator`'s bounded supplies before the main action, once per turn. The battle menu and any later inventory UI share that allowance. |
| **Wait** | Free main action available only when no legal, affordable Attack, Skill or Defend exists. Grants no special recovery or defense. Items are optional and do not have to be exhausted before Wait becomes legal. |

Remove ordinary Pass and any battle Recover action. Free recovery at the town spring stays available under the current exploration contract. A failed item request consumes neither stock nor allowance. Equipment swaps remain unavailable in battle. A full-resource potion that restores nothing and applies no valid effect should be rejected without consumption.

### Fractional SP without floating-point drift

Current `ResourceVector` fields and ECS pools are whole-number `Int`s. Fractional stamina therefore requires a deliberate cross-layer unit change, not only display formatting.

Represent SP amounts in integer tenths using an explicit value type or clearly named fields. **2.0 SP = 20 units; 0.5 SP = 5 units.** Keep HP/MP integral for this slice. Convert SP maxima, current values, costs, flat modifiers, regeneration, potion restoration, content DTOs, save fields and previews together. Percentage modifiers remain their existing basis-point values; do not multiply percentages by ten. Use checked/widened arithmetic and reject overflow or malformed units.

Attack's target rank rule is **2.0 + 0.1 × rankIndex SP**, with F index 0 and rank 1 index 14. Round the modified Attack cost upward to a tenth; other skill costs retain whole-SP upward rounding. Retain the positive-cost floor for authored positive costs and nonlethal HP checks. Tests should exercise all 15 rank indices even though the initial playable loadout supplies only the F baseline.

| Frozen Combat Mastery rank | Owner-start SP recovery |
| --- | ---: |
| F, E, D | 0.5 |
| C, B, A | 1.0 |
| 9, 8, 7 | 1.5 |
| 6, 5, 4 | 2.0 |
| 3, 2, 1 | 2.5 |

For the first slice, explicitly author Combat Mastery F and Defense F battle metadata in the starter loadout. This is not a new AP/learning/profile implementation. Provisional Defense F costs **1.0 SP** and grants **+2 Defense, +5 percentage points Protection**. Later rank/race tables require separately authored content.

Replace the hero's current default **2 SP at activation end** with the mastery-based start recovery; otherwise the redesign accidentally grants both. Preserve separately authored status recovery and the current MP regeneration unless new content explicitly changes them. Cap all recovery at maximum and report actual recovered amounts. Do not add mastery HP/melee bonuses until their progression/stat-source contract is implemented.

### Removing dice from effects

Replace `DamageInputs`/`DamageRules` and preview callers together so no pip or combination fields remain in the live formula:

```text
power = authored rank base + allowed resolved attack contribution
postDefense = max(0, power - relevant defense)
afterProtection = floor(postDefense × (100 - clamped protectionPercent) / 100)
shieldAbsorbed = min(shield, afterProtection)
actualHpLoss = min(currentHp, afterProtection - shieldAbsorbed)
```

Retain the existing distinction between percentage points for Protection and basis points for stat modifiers. Use exact integer/rational intermediate arithmetic and shared formulas for preview/resolution. Starter skills use no new critical, accuracy, variance or status-chance rolls; those systems are not present in Kotlin combat.

Removing dice substantially lowers current sword/spark/blood damage and Fortify strength. Author explicit no-dice base/effect values in `starter.json` and record before/after examples against the existing 90-HP hero and 60-HP enemy. Keep Focus's authored status behavior. Do not replace five random dice with a hidden average roll, and do not claim the old values are balanced after deleting the pip term. First-slice balance acceptance requires both a headless full-expedition run and native play of Attack, skills, Defend, items and exhaustion/Wait.

## 5. Enemy decisions

Retain the current generic enemy, encounter definitions and rewards. Add only the profile data needed for shared action eligibility: Speed, available actions/ranks, recovery, guard values, cooldowns where authored, and optional finite item stock. Keep existing HP and attack/defense inputs as the starting balance baseline.

Provisional starter enemy rules: Attack costs 2.0 SP, turn-start recovery is 0.5 SP, and Defend uses the same 1.0-SP/+2/+5 prototype guard. Replace default end-SP regeneration explicitly when enabling this recovery. The existing `skill.enemy_strike` remains an authored skill using its declared cost and weakened status; introducing spiders is not required to implement AI.

The pure policy chooses legal shared commands from committed observations:

1. If its profile permits items, an eligible healing potion at or below 35% HP, at most once this turn.
2. Defend at or below 25% HP if affordable and it did not defend on its previous turn.
3. The first ready affordable skill in authored priority order.
4. Attack, then affordable Defend, then Wait if no other main action is legal/affordable.

Persist the previous main-action choice if the policy reads it. Use integer threshold comparisons. The first shipped enemy has no consumables; a synthetic JVM fixture can verify finite item stock without adding human encounters. AI never pays costs, mutates resources or computes separate damage. Its optional item must checkpoint before selecting its main action. Automatic work remains bounded by `BattleController`'s guard and stops on save failure, player input or terminal outcome.

## 6. Transactions, restore and deterministic events

### Build on the actual controller

Today `BattleController` applies a command to its mutable World, exports it, then saves before advancing another actor. A failed write retains that resolved in-memory result and blocks dependent work; Retry save writes it again. `SessionCoordinator` includes supply consumption and the battle export in the session bundle. This is not an Immer transaction that automatically rolls the World back.

Retain this single-pending-result approach. Freeze each accepted result and its event batch for persistence; retry must not reapply the command, rerun initiative, consume another potion or advance RNG. Extend the controller with a last-successfully-saved observation/event view so presentation publishes committed outcomes only. On failure, show the save error over that view and disable dependent actions. The mutated pending World is inaccessible to gameplay until its write succeeds. Unexpected simulation exceptions halt the controller rather than attempting to continue partially applied rules.

Apply the same publication discipline to battle entry, victory/defeat return and reward transitions in `SessionCoordinator`. Complete the durable terminal battle checkpoint before disposing its World or publishing return to exploration. Persist encounter removal, hero state, pending rewards and loot RNG together. Restarting from a terminal checkpoint must finish the transition once; retrying a failed return save must reuse the pending result, not reroll loot.

Application validation owns supply availability; game rules own effect/turn legality. Stage and restore supply changes on command rejection as needed so no failed request spends stock. No battle-only repository may omit the session-owned consumption.

### New saves only

Follow the project's accepted new-save policy. Do **not** implement browser schema-4/5/6 conversion, numeric RNG migration, legacy dice resolution, or compatibility engines.

At inspection, the session payload is version **3**, nested battle payload **2**, and content schema/content/rules are **2/3/2**. These are different version axes. Implemented versions are content schema/content/rules **3/4/3**, session payload **4**, nested battle payload **3**, combat record **2**, and unchanged checksum envelope **2**. Update constructors, manifests, codecs, validation and fixtures together.

Unsupported old or future versions must produce a clear error and preserve both files. Do not reinterpret integer SP as tenths, silently fall back to an incompatible older slot, or overwrite saves to make loading succeed. Use a separate checkpoint directory for development; starting fresh in the normal directory must be an explicit user action. Preserve damaged-slot recovery only among compatible, fully validated saves.

Save/restore must include the full session, frozen hero/loadout data, battle participants/order/turn markers, current pools, statuses/cooldowns and their timing markers, finite supplies, event sequence, rules/content versions and all authoritative RNG states. Validate unique actor/order membership, living current actor for nonterminal turns, coherent terminal states, nonnegative counters, valid rank/content references, resource bounds and legal item/boundary state. Keep observed exports separate from full restore data so undiscovered exploration entities never leak into HUD data.

### RNG and events

Retain Juniper's existing algorithm/format tag and five-word state restore. Preserve explicit `RandomStream` tags even where the combat tag has a historical dice name/value. Do not reseed the same combat stream at every encounter. The current session hands its stream continuation through encounters; preserve that model rather than adding a new RNG library or duplicated battle RNG copy.

Initiative consumes combat draws once. Previews, validation, rejected commands, animations and failed-save retries consume none. Keep generation, AI and loot streams isolated. Specify stable iteration order for targets/statuses/effects, and include turn state and RNG continuation in `RunCanonical`. Same initial state, versions and commands must yield identical canonical state and ordered events across save/restore.

Extend the existing `DomainEvent`/`OrderedEvent` types for turn start/end, action/item use, costs, actual recovery/damage/absorption, status expiration, actor defeat and encounter end. Pair monotonically increasing event sequence with battle identity; capture actor/turn metadata before advancing the cursor. Never execute events as commands.

Persist the last committed event batch with its outcome, including terminal events until the session transition can display them. The first slice may retain up to **100 events** for its active battle log, trimming oldest complete command batches and marking truncation; a single oversized batch is omitted whole with that marker. Event sequence never resets when trimming. This bound is provisional and separate from a future archive. Presentation deduplicates IDs, may skip historical animations on restore, and rebuilds from the committed observation after interruption.

## 7. Native battle presentation

Replace dice controls in `BattleHud`, `BattleInput` and `BattleView` with Attack, Skills, Items and Defend. Show Wait only under the shared eligibility rule. Skills omits the default Attack/Defend entries but retains genuinely different actions such as Fortify. Keep skill/target browsing local and show confirmation costs, target, preview, cooldown and disabled reason before submission.

Display the captured turn order before the opening action and throughout combat, highlight the active actor, and show round, HP/MP/SP, active effects and **Item available / Item used**. Format SP with enough precision to distinguish 2.0 from 2.1; display actual capped recovery. Add a compact scrollable event log to the existing battle screen. A separate persistent combat-log window is later work.

`CombatTracks` and `GdxCombatFeedback` consume committed events. Animation completion or Skip changes only presentation; it cannot apply damage, begin a turn, or tick cooldowns. Preserve keyboard focus, touch target usability, existing input ownership, reduced-motion/skip behavior and safe insets. Validate desktop resizing and compact landscape Android/iOS layouts using their actual viewports, rather than a browser-only 320px requirement.

Keep `ExplorationScreen`, town services, screen disposal/navigation and separate scene ownership. Leaving/recreating the battle screen must not recreate the encounter, refresh its turn or reset its RNG. Show captured Speed in battle details; a full Character window is not a prerequisite.

## 8. Implementation sequence

Checked boxes refer to the first playable slice and the [recorded evidence](evidence/turn-based/verification.md). They do not close mobile gameplay, physical-device or release gates.

### A. Reconcile contracts and author the slice

- [x] Update the dice descriptions in AGENTS/README and affected battle, stats, skills, inventory and UI specs. Establish a Kotlin architecture/work-queue home for the deleted documents; remove or label browser implementation claims without erasing historical native blockers.
- [x] Record the first-slice/later-feature split, exact content IDs, provisional no-dice values, status/outcome ordering, SP units and distinct version numbers.
- [x] Add deterministic example expectations for Attack, one offensive skill, Fortify, Focus, Defend, items and exhaustion. No package or dependency changes.

### B. Rules and battle World

- [x] Replace due-tick initiative with fixed order and restorable turn boundaries. Introduce fractional SP consistently across domain definitions, ECS and pure calculations.
- [x] Add shared eligibility/previews and command validation; implement Attack/Skill/Defend/Item/Wait and command-producing AI.
- [x] Replace dice systems with the ordered boundary/action pipeline. Update cleanup/outcome handling and canonical exports, retaining one authoritative World and detached snapshots.
- [x] Verify scheduler, units, formulas, boundary timing, rejection invariants and repeatable event/RNG sequences in JVM tests.

### C. Content, persistence and application integration

- [x] Update strict Jackson DTOs/catalog validation, manifest and starter content; reject missing/duplicate references, unsupported effects/ranks and malformed unit values.
- [x] Update session/battle codecs and restore validation with explicit version rejection; test compatible damaged-slot fallback and unsupported-save preservation.
- [x] Wire turn starts and AI into checkpoint/resume routing. Atomically save item consumption, final action outcomes, events, RNG and next-turn markers.
- [x] Add committed-view publication and pending-result retry to battle/session transitions; verify failure at entry, begin-turn, item, action, enemy action, terminal result and reward return.

### D. Presentation and removal

- [x] Replace dice controls/previews/input bindings, render order/costs/allowance/log, and connect animation/audio to committed events.
- [x] Remove `game/combat/dice`, `DiceSystem`, dice-only components/commands/events, hand reservations, scoring tables, obsolete fixtures and tutorial text after callers move. Keep historical evidence explicitly historical.
- [x] Exercise desktop Attack/skills/Defend/items, save/restart and victory return; record provisional damage values. Verify full expedition, purchases, defeat/recovery and pending-reward exit in JVM integration tests.
- [ ] Complete Android/iOS touch, suspension and recreation journeys, plus native exhaustion/Wait play. The classic-menu follow-up verifies visible actors and usable commands/confirmation at a 683×425 desktop viewport; actual mobile touch/lifecycle acceptance remains open.

### E. Acceptance and evidence

- [x] Run the relevant checks below and record commands, environment/device, results and durable evidence paths. Separate automated checks, packaging and real interaction.
- [x] Record unresolved balance/content decisions and deferred items, and update the chosen implementation tracker's overview, current focus, completion log and work notes together.
- [x] Keep historical Android/iOS, physical-device and release gates open unless newly verified. A completed plan or passing headless engine does not complete native acceptance.

### Overview and current focus

| Milestone | State |
| --- | --- |
| A–C: contract, deterministic rules, content and persistence | Implemented and JVM verified |
| D: native presentation and dice removal | Implemented; desktop journey verified, compact layout/device acceptance incomplete |
| E: evidence and dispositions | Recorded; overall native acceptance remains open |

Current focus: resolve the existing iOS content-loading dependency failure and run Android/iOS landscape touch and lifecycle acceptance. Continue to preserve the historical Phase 5 physical-device and release gates. Section 10 features remain later work, not missing runtime stubs to add during this slice.

### Completion log — 2026-09-19

Replaced runtime dice combat with fixed initiative, actor/turn-scoped commands, shared rules, fractional SP and typed history. Integrated committed-view save/retry and atomic encounter transitions. Reworked Scene2D controls and strict new-save formats. Verified 72 JVM tests, core boundary/format checks, desktop compilation/play, Android duplicate-class/APK gates, and full iOS AOT/link/sign. No new dependencies. Full platform acceptance is not complete.

### Work notes — 2026-09-19

- Desktop evidence uses an isolated checkpoint directory; normal player saves were not converted or overwritten. New saves only.
- Starter balance is provisional: Attack deals 11, Sword F 21, Spark 23 against starter defenses; Fortify gives 14 shield, Defend +2 Defense/+5 Protection. Automated tests pin Focus duration, capped potion effects, and exhaustion/Wait. Native play verified the offensive/defensive/item loop and victory return; broad balance and native exhaustion acceptance remain open.
- Android had no connected device. Packaging success does not satisfy runtime acceptance.
- Xcode 27 simulator installation/launch reaches the existing `java/lang/BootstrapMethodError` dependency error after loading 10 assets. AOT succeeds; iOS gameplay, physical devices and release remain blocked/unverified. See evidence for exact target and next action.
- Existing deleted architecture/tracker files were not restored. `kotlin-architecture.md` and this tracker carry current ownership and open gates. Imported browser documents retain their text under explicit reference-only notices.

## 9. Validation matrix

Extend existing suites such as `CombatRulesTest`, `CombatSimulationTest`, `CombatCheckpointTest`, `ContentRepositoryTest`, `SessionIntegrationTest`, `BattlePresentationTest`, `RandomSourceTest` and the artemis/Juniper smoke tests. Add focused `game/turns` tests as the feature arrives. Use JUnit parameterized/exhaustive bounded cases and seeded command-sequence loops through production code; record a failing seed/sequence. A property-testing dependency is unnecessary for this scope.

| Area | Required cases |
| --- | --- |
| Initiative | Player/enemy first, seeded ties, no tie reshuffle after restore, fixed order across rounds, dead actor skip, round wrap, terminal turn stops |
| Resource economy | All Attack rank indices/recovery bands, fixed-point SP caps and rounding, mixed costs, nonlethal HP payment, modifier units, no duplicate default SP regeneration |
| Actions | Equipment/rank/target/cooldown rejection, preview equals actual deterministic result, no-op potion rejection, conditional Wait, exactly one turn end |
| Item ownership | Item then action, second item rejected through every entry point, stale revision, rejection leaves stock unchanged, reload after item, finite enemy stock |
| Effects | Defend expires at next owner start, Fortify remains distinct, application-turn exclusions, periodic defeat, simultaneous defeat policy, no healing dead actors or ticking on item/preview |
| Persistence | Resume before/after turn start and between enemy commands, malformed current saves, unsupported versions preserved, damaged compatible slot fallback, incomplete writes/read-back failures |
| Retry/publication | Failure at every checkpoint boundary; unchanged published view until save succeeds; repeated retry does not repay costs, rerun RNG, reconsume stock or duplicate terminal events/rewards |
| Determinism | Same state/events/RNG after restore and injected failures, no draws on rejection/preview, stable canonical ordering, snapshot collections and contents detached |
| Session regression | Multiple encounters, battle return position, supplies and pending gold/loot, successful exit exactly once, defeat discards pending rewards, free town recovery |
| Presentation | All controls, current turn/allowance, readable fractional costs, log ordering, skip/reduced motion, focus/input ownership, resize, suspension and screen recreation |

Run the existing repository commands:

```sh
./gradlew :core:test
./gradlew :core:check
./gradlew :core:compileKotlin :lwjgl3:compileKotlin
REBIRTH_CHECKPOINT_DIR=/tmp/rebirth-turn-based-check ./gradlew :lwjgl3:run
./gradlew :android:checkDebugDuplicateClasses :android:assembleDebug
```

Tests remain plain JVM tests without `Gdx.app`, OpenGL, native UI or platform SDK startup. `:core:check` includes the direct Gdx import/format boundary guard; review must additionally enforce I/O restrictions and dependency direction.

For iOS, follow [README](../README.md)'s full RoboVM AOT/link/sign plus explicit simulator install/launch procedure, including the Xcode 27+ DeviceHub workaround. `:ios:compileKotlin` is not an iOS build. Native acceptance requires real desktop play, Android landscape touch/lifecycle checks, and an iOS launch past content loading into actual gameplay.

Historical unmet gates remain: Phase 5 mobile acceptance, Android compact-landscape touch/suspension/recreation, the Jackson/RoboVM content-loading `BootstrapMethodError`, physical-device testing and release verification. Historical AOT or APK success does not resolve those gates, and browser verification records do not cover this application.

## 10. Retained later work and explicit dispositions

| Original request | Disposition for this Kotlin project |
| --- | --- |
| Grant Combat Mastery/Defense to existing characters; rank learning, AP and training | New saves only; author F battle metadata now. Full progression later owns acquisition/ranks/training and supplies frozen run data. When enabled, damaging Normal Attacks train mastery for every weapon category, without duplicate melee credit; mastery's melee bonuses remain melee-only. |
| Defense race/rank costs and all weapon damage categories | Retain as future content requirements after character/equipment/stat ownership exists. Do not fabricate complete tables to close this rework. |
| Critical hits, Arrow Revolver, Counterattack, Healing, Final Hit, Mana Shield, durability | No equivalent complete Kotlin systems exist. Enable in separately tested skill slices. Preserve the desired one-critical-roll-per-eligible-target/shared-across-hits policy, authored multi-hit allocation, `floor(rank.base × 5)` Healing and rank-base Final Hit bonus as proposed adaptations, subject to final content/rounding validation. |
| Advanced timing | Counterattack should negate/retaliate against the first eligible melee hit and expire unused at the next owner start. Mana Shield's three-subsequent-owner-start lifetime/upkeep and unaffordable-upkeep behavior need an explicit executable specification before enabling it. Do not add placeholder effects now. |
| White/Red/Giant Spiders and humans | Later content expansion: proposed Speeds 9/12/8 and human default 11; spider 20 SP, 0.5 recovery, 2-SP Attack, 1-SP Defend; Pounce 1.25×, Poison Bite and Armor Break at 4 SP/two-owner-turn cooldown. These are provisional imported values, not existing enemies or effects to preserve. Human potion behavior is testable with a fixture; no new human encounters in this change. |
| Aren's memory and nested RP saves | Defer until quest/RP ownership exists. Reuse this battle engine with isolated actor/resources/RNG and explicit outcome policy; never leak RP rewards/training to the hero or consume the ordinary expedition stream. No RP migration fixtures against nonexistent saves. |
| Full inventory, banking, quests and character windows | Keep bounded potion supplies, one temporary gold balance and free town recovery for the slice. Future inventory use must route through the same allowance/transaction boundary. Reconcile town requirements before expanding services. |
| Per-character combat archive and schema 6 | [combat-log.md](combat-log.md) needs a separate Kotlin adaptation. First delivery includes committed events and a bounded active log, not persistent character archives or browser schema migration. |
| rot.js or variable-frequency initiative | Outside this design. All living actors act once per round; no real-time gauges, dynamic initiative, party system, spatial skills or fleeing. |

Implementation evidence: [verification record](evidence/turn-based/verification.md), screenshots and per-suite test totals in the same directory. Native acceptance remains scoped as recorded above.

### Classic battle-menu follow-up

Implemented the user-requested classic Final Fantasy-style menu direction: vertical commands, blue windows, nested skill/item/target selection, dedicated party resources, and Up/Down/Enter/Escape navigation. Battlefield rendering fits the unoccupied area, fixing the observed desktop compact overlap. Core checks (72 tests), desktop packaging and native keyboard/resize/skill-execution checks passed; [evidence](evidence/turn-based/verification.md#classic-command-menu-follow-up). Native mobile gates remain open.
