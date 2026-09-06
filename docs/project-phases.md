# Rebirth Dungeon Project Phases

This checklist turns [game-plan.md](game-plan.md) into an implementation tracker for the Java/LibGDX project. The game plan defines architecture and gameplay contracts; this file orders the work and records implementation evidence. All phase, task, and exit checkboxes were reset on **2026-09-02**. Completion claims and environment notes from the previous implementation have been cleared.

On **2026-09-05** this tracker was re-aligned to the game plan's gameplay update — the [battle](gameplay/battle.md), [stats](gameplay/stats.md), [skills](gameplay/skills.md), [character](gameplay/character.md), [inventory](gameplay/inventory.md), [enchants](gameplay/enchants.md), [quests](gameplay/quests.md) and [titles](gameplay/titles.md) specifications. Phases 4–7 were re-scoped to the five-dice combat, inventory/equipment and progression contracts; new phases 8–9 cover hub quests/enchanting/rebirth and RP missions/skill extensions; the former phases 8–14 were renumbered 10–16. The [titles](gameplay/titles.md) specification is folded into phases 6–9 below; game-plan.md does not yet reference it. Phases 0–1 and their recorded evidence are unchanged. This alignment edits planning documents only.

The phases expand the game plan's six milestones. Complete the earliest unfinished phase by default; if the user changes priorities, record the change and preserve any unmet prerequisite. Phase numbers below belong to this reset and do not carry over earlier completion history.

## Tracking Rules

- An unchecked box means work or verification remains; a checked box means implemented and verified against the current Java architecture.
- Keep the overview phase unchecked until its tasks and exit criteria are complete. Existing scaffold files do not automatically satisfy a phase.
- Record the commands, target/device, result, and relevant file paths when verifying a task. Distinguish dependency resolution, compilation, packaging, simulator launch, physical-device testing, and release testing.
- Keep dated blockers and the next action in Work Notes. A missing device or credential is an unmet gate, not a successful check.
- Update the phase checklist, overview, Current Focus, and Completion Log together when finishing a phase.
- If a conditional feature is intentionally omitted, record its disposition and rationale against that item before closing it. Do not silently skip required behavior or introduce an optional library solely to complete a checkbox.
- Add dependencies and folders only for a concrete feature. Use the Gradle wrapper, reviewed version pins, and documentation matching the selected library version.
- Verify rules and persistence as they are implemented. Later quality phases consolidate evidence; they do not postpone basic correctness checks.

## Current Focus

- **Current phase:** Phase 2 — Validated content and deterministic RNG.
- **Status:** Phase 1 completed and verified on 2026-09-04 (see Completion Log); Phase 2 is not started.
- **Next objective:** Stable content/entity IDs and command/event values, the project `RandomSource` interface with the Juniper `AceRandom` adapter, and the validated immutable content catalog under `data/content` — now including the five-dice scoring/face-weight profiles and the starter skill/stat/cost/status definitions shaped by the September 5 gameplay specifications.
- **Known blocker:** None. All three backends launched the prototype; iOS AOT/linking succeeded on this host (Xcode 27 beta) after removing stale force-link leftovers and launching through `simctl`/DeviceHub (see Work Notes).
- **Baseline inspected:** 2026-09-02. Shared code contains `RebirthDungeon extends Game` and an empty `FirstScreen`; desktop, Android, and RoboVM launchers exist. The game-plan audit's successful core/desktop compilation is baseline evidence, not phase completion. *(Superseded 2026-09-04: `FirstScreen` is replaced by the loading/prototype screens.)*

## Existing Architecture and Working Boundaries

| Location/owner                                      | Current state and intended responsibility                                                                   |
|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `core/src/main/java/cloud/vinh/rebirthsaga/`        | Existing application/screen scaffold; shared application, simulation, data and presentation code grows here |
| `lwjgl3/`                                           | Existing desktop launcher, desktop adapters and packaging; primary development target                       |
| `android/`                                          | Existing Android launcher, native integrations, SDK and native-library configuration                        |
| `ios/`                                              | Existing RoboVM launcher, MetalANGLE backend, iOS integrations and linking configuration                    |
| `assets/`                                           | Existing UI skin and bitmap fonts; add validated content, dungeon atlases and audio as needed               |
| artemis-odb `World` + `RunSession`                  | Planned authoritative entities, grid, dice activations, statuses, initiative, RNG streams and run rewards               |
| SquidSquad/Juniper adapters                         | Planned generation, cardinal pathfinding, FOV and explicit seeded randomness                                |
| `RunController`                                     | Planned serialized commands, committed snapshots/events and repository coordination                         |
| `SpriteBatch`, Scene2D `Stage`, presentation tracks | Planned display, controls and animation of committed results                                                |
| Versioned JSON save bundle                          | Planned project-owned profile/run/mission DTOs and alternating-slot recovery                                        |

Shared source targets Java 8; the Gradle daemon criteria select Java 25. Follow the game plan's toolchain/dependency audit rather than equating the build JVM with supported application APIs.

Simulation code uses artemis-odb and project-owned algorithm interfaces, with SquidSquad/Juniper implementations behind adapters. It must not call `Gdx`, graphics/audio, Scene2D, file I/O, networking or provider SDKs. One logical command resolves synchronously on the render thread; only then are snapshots/events exported and external work requested. Worker results return via `Gdx.app.postRunnable(...)` and are checked against the current session token.

Keep live gameplay out of UI state and animation clocks. Use explicit constructor wiring and Java service interfaces; one application-owned serialized save writer survives screen changes. Follow the package structure in game-plan section 17 without scaffolding unused folders.

## Phase Overview

- [x] Phase 0 — Dependency repair and build foundation
- [x] Phase 1 — Lifecycle, assets, and rendering integration
- [ ] Phase 2 — Validated content and deterministic RNG
- [ ] Phase 3 — Grid simulation, turns, and basic checkpoints
- [ ] Phase 4 — Deterministic five-dice combat
- [ ] Phase 5 — Playable combat and resumable activations
- [ ] Phase 6 — Durable saves, migrations, and lifecycle recovery
- [ ] Phase 7 — Progression, inventory, and the offline run loop
- [ ] Phase 8 — Quests, enchanting, and rebirth
- [ ] Phase 9 — Role-playing missions and skill extensions
- [ ] Phase 10 — Dungeon depth and expanded encounters
- [ ] Phase 11 — Presentation polish, input, audio, and haptics
- [ ] Phase 12 — Offline quality, balance, and device acceptance
- [ ] Phase 13 — Local gacha simulator and reveal flow
- [ ] Phase 14 — Authentication, backend, and cloud synchronization
- [ ] Phase 15 — Verified purchases and production gacha
- [ ] Phase 16 — Release readiness and live operations

## Phase 0 — Dependency Repair and Build Foundation

**Goal:** Turn the existing scaffold into a reproducible build baseline before adding gameplay.

**Plan alignment:** Milestone 0; game-plan sections 1–3 and 17–18.

Tasks:

- [x] Reproduce and repair the duplicate graph from `com.github.tommyettinger:jdkgdxds:2.1.8`, retaining one implementation and its required dependencies. Review a narrow exclusion or corrected publication; do not hide duplicate bytecode with packaging rules.
- [x] Verify core, desktop, Android and iOS dependency graphs after the repair; confirm Android duplicate-class checking and debug assembly pass.
- [x] Reduce the initial runtime to LibGDX, artemis-odb, selected SquidSquad modules and supporting libraries according to game-plan section 2. Defer overlapping SquidLib/pathfinding, physics, binary serialization, narrative and animation extras until needed.
- [x] Keep platform native dependencies consistent with core selections; if removing Box2D, remove its lights extension and native artifacts across every launcher.
- [x] Move `gdx-tools` to an offline tooling task/configuration and review `api` versus `implementation` exposure without breaking launcher compilation.
- [x] Preserve required JitPack access, make local Maven overrides deliberate, and capture reviewed version pins plus dependency locking/verification for the repaired graph.
- [x] Enforce Java 8 language/API compatibility in shared code while preserving the configured build JVM. Document Android SDK, RoboVM/Xcode and desktop build prerequisites separately.
- [x] Add a pinned Java 8-compatible JVM test framework for `core` and an initial meaningful rule/adapter fixture; keep graphics startup out of plain unit tests.
- [x] Add practical Java formatting/static checks and CI for shared tests, desktop compilation and Android packaging; document how iOS verification is run on a macOS host.
- [x] Update development instructions around the existing modules/package and the architecture boundaries in this tracker.

Exit criteria:

- [x] `:core:compileJava`, `:lwjgl3:compileJava`, meaningful `:core:test` tests and `:android:assembleDebug` pass through the wrapper; no duplicate-class failure remains.
- [x] The selected dependency graph is recorded and platform prerequisites are reproducible; successful JVM compilation is not reported as an iOS build.
- [x] Shared-code tests run without `Gdx.app`, OpenGL, native UI or provider SDK startup, and documented checks protect the Java/API boundary.

## Phase 1 — Lifecycle, Assets, and Rendering Integration

**Goal:** Prove the chosen stack and resource ownership in a visible LibGDX screen on every target.

**Plan alignment:** Completes Milestone 0; game-plan sections 4–5 and 11–12.

Tasks:

- [x] Evolve `RebirthDungeon` to own asset/service wiring and screen transitions; replace the empty `FirstScreen` with a focused loading/prototype screen.
- [x] Create `AssetManager` inside the application lifecycle, load the existing skin/fonts, and show actionable loading failures before activating the screen.
- [x] Render a room and animated sprite through `SpriteBatch`, a texture atlas, camera and world viewport; start with 16-pixel tiles and nearest-neighbor filtering.
- [x] Choose the logical world resolution/scaling policy and implement a separate Scene2D `Stage`/UI viewport with a working control.
- [x] Align Android and iOS to the initial landscape layout, account for safe insets, and keep viewport resize guards for zero-size windows.
- [x] Prove a command-driven artemis-odb `World` step with explicit system registration order and a seeded `DungeonProcessor` adapter returning detached data.
- [x] Route Stage input before world input with `InputMultiplexer`; verify that a consumed touch cannot trigger both UI and gameplay.
- [x] Implement screen hide/dispose ownership for stages, private batches, input processors and presentation tracks; release managed assets through `AssetManager`.
- [x] Prove worker-result handoff through `postRunnable` and rejection of stale session callbacks; keep graphics, audio and artemis-odb mutation on the render thread.
- [x] Verify repeated screen transitions, pause/resume and application recreation without static resource leaks or calls to disposed objects.
- [x] Launch the prototype on desktop, an Android emulator/device and an iOS simulator through RoboVM; record the exact targets and results.

Exit criteria:

- [x] All three backends display the room, skin and working control; iOS AOT/linking succeeds for the simulator target.
- [x] Explicit commands advance the artemis-odb spike while idle render frames advance only presentation.
- [x] Asset loading, resize, input consumption and repeated lifecycle transitions work without leaking or reusing disposed resources.

## Phase 2 — Validated Content and Deterministic RNG

**Goal:** Supply immutable game definitions and restorable randomness before building authoritative rules.

**Plan alignment:** Begins Milestone 1; game-plan sections 8, 15 and 18, plus the content requirements of the gameplay specifications.

Tasks:

- [ ] Define stable content/entity IDs, Java command/result/event values, version conventions and immutable snapshot conventions without presentation or backend types.
- [ ] Define project `RandomSource` interfaces and a Juniper `AceRandom` adapter with explicit seeds plus sequence-backed test doubles.
- [ ] Derive independent generation, AI, combat/dice, loot and cosmetic streams with stable identifiers; reserve the profile-owned hub-enchanting stream for Phase 8 and a separate development-gacha stream for Phase 13.
- [ ] Capture and restore algorithm ID, state-format version and all five AceRandom state words losslessly; reject unknown algorithms or invalid state counts.
- [ ] Define stable floor/attempt seed derivation from run seed, floor index, generator version and attempt number.
- [ ] Add Jackson-bound JSON DTOs and an immutable content catalog under `data/content`, backed by `ContentRepository`; validation is explicit rather than assumed from JSON parsing (unknown fields/enum values already fail the Jackson binding; keep that strictness).
- [ ] Add a minimal `assets/data` set for tiles, generation profiles, a hero/enemy, the five-dice combination/scoring table with per-skill/rank face-weight profiles, the starter sword skill at two illustrative ranks (fair and weighted), HP/MP/SP stat/cost definitions, statuses, the two starter potions, encounters, loot and progression curves. Defer the full skills, inventory/equipment, enchant, quest and title catalogs to their phases and banner/pity catalogs to Phase 13.
- [ ] Validate required fields, versions, IDs, ranges, cross-references, six nonnegative face weights with a positive total per skill/rank, authored rank ordering, probability totals and progression curves with actionable file/field diagnostics.
- [ ] Separate visual asset references from rules and validate required atlas/animation IDs before starting a run.
- [ ] Test seeded repeatability, full-state round trips, stream independence, malformed content and broken references in ordinary JVM tests. `JacksonContentBindingTest` already pins the content JSON binding shape (item definitions with dice-notation strings, enum rarities, tag arrays).

Exit criteria:

- [ ] Every bundled definition validates, and malformed fixtures fail at the content boundary with useful diagnostics.
- [ ] RNG restore continues the exact sequence, and cosmetic draws cannot change generation, combat, AI or loot outcomes.
- [ ] A run can receive a pinned immutable catalog and RNG streams without loading graphics or platform services.

## Phase 3 — Grid Simulation, Turns, and Basic Checkpoints

**Goal:** Deliver a playable, reproducible floor with a basic reload path before scarce random rewards are introduced.

**Plan alignment:** Completes Milestone 1; game-plan sections 5–9, 11 and 14.

Tasks:

- [ ] Create one artemis-odb `World` plus `RunSession` per run, with stable IDs, position/player/AI/blocker/vision/health components and authoritative run/floor/counter state.
- [ ] Implement a y-up `DungeonGrid` with flattened `int[]` tile IDs and an O(1) occupancy index; keep static floor/wall tiles out of the ECS.
- [ ] Build the `DungeonProcessor` adapter, translate `char[x][y]` into project tiles/spawns, validate reachability and constraints, and bound generation attempts with deterministic failure behavior.
- [ ] Establish the game-plan system pipeline in registration order: validation (100), enemy intent (150), movement (200), interaction (300), cleanup (800), visibility (900) and turn finalization (1000); Phase 4 later fills the dice/ability/damage/status slots 400–700 (slot labels per game-plan section 6). Export snapshots/events only after `World.process()` returns.
- [ ] Enforce cardinal steps, bounds, terrain and occupancy together. Walking/waiting spend one action; an unlocked door opens without movement for one action; invalid movement or a locked door without a key spends none.
- [ ] Reserve hostile-contact handling for Phase 4 without allowing overlap; complete a movement-only slice before enabling dice encounters.
- [ ] Implement `DijkstraMap` with `Measurement.MANHATTAN`, explicit blocked terrain and per-query dynamic blockers; use simple deterministic enemy pursuit/idle behavior.
- [ ] Implement `FOV.reuseFOV` with `Radius.DIAMOND`, opacity changes, `visibleNow` and persistent explored state; hide live information about unseen enemies from presentation.
- [ ] Implement `TurnScheduler` ordered by `(dueTick, insertionSequence, stableActorId)`, starting with 100 ticks per completed activation; persist queue, active actor and tie-break state.
- [ ] Implement the serialized `RunController`, accepted command/event counters, automatic-actor guard and explicit `world.process()` steps. Yield only between completed actions if necessary.
- [ ] Connect committed snapshots/events to world/HUD rendering, keyboard/D-pad/swipe controls, interpolation and input gating; no rule advances merely because a frame is drawn.
- [ ] Add a minimal versioned JSON checkpoint for the actual map, entity DTOs, explored cells, counters, scheduler and full gameplay RNG states; create the serialized alternating-slot save foundation that Phase 6 hardens.
- [ ] Rebuild derived indexes/caches on reload and compare a restored continuation against an uninterrupted replay using canonical state/event ordering.
- [ ] Test movement/door costs, occupancy/death cleanup, coordinate translation, bounded generation, path blockers, FOV invalidation, initiative ties and command determinism.

Exit criteria:

- [ ] A player can explore a generated floor and reach its exit using the shared input commands.
- [ ] The same starting state and commands reproduce map, turns, visible state and events, including after a basic save/reload.
- [ ] Simulation state is frame-rate independent, snapshots cannot mutate it, and malformed/rejected commands leave it consistent.

## Phase 4 — Deterministic Five-Dice Combat

**Goal:** Resolve a complete encounter within the existing run model using commands alone.

**Plan alignment:** Begins Milestone 2; game-plan sections 6, 9–10 and 18; [battle.md](gameplay/battle.md) and [stats.md](gameplay/stats.md).

Tasks:

- [ ] Add `DiceHand` (five stable dice), `ResourcePools`, `Stats`, `AbilityLoadout`, `StatusSet`, `Shield` and `Cooldowns` alongside existing health/identity components; do not introduce a separate authoritative combat world.
- [ ] Implement the chosen contact contract: bumping a hostile opens a dice activation for the current player turn without movement or immediate damage.
- [ ] Implement pre-roll skill/target selection: validate the learned active skill, its rank snapshot, equipment legality, range/target, cooldown and combined SP/MP/HP affordability; selection, panel and target changes before the first roll are free and cannot reset anything after it.
- [ ] Implement `ROLL_DICE`: lock skill, rank, target, effective attack/mitigation inputs, cost vector and face-weight profile, reserve every required pool cost, and sample five dice independently in stable die order from the locked profile.
- [ ] Implement kept-die flags (no RNG, cost or initiative) and batch `REROLL_DICE`: atomically replace a chosen nonempty subset of unkept dice for one of two reroll actions under the same locked profile, keeping every replacement result; reject empty, pre-roll and exhausted-budget rerolls with no budget carry-over and no automatic attack at zero rerolls. `ASSIGN_DIE`, `UNASSIGN_DIE` and the old singular `REROLL_DIE` are removed from this mode's contract.
- [ ] Implement `USE_ABILITY` (deduct reserved costs once before effects, consume the whole hand, resolve the locked skill and end the activation exactly once) and `END_TURN` (free pass before rolling; after rolling pay reserved costs and discard the hand; no skill-use training). Keep `USE_ITEM` gated until minimal inventory consumption exists (Phase 5).
- [ ] Implement pure Java scoring: pip total 5–30 and exactly one of the eight combination classes with the provisional multiplier table; no overlapping bonuses, four-die straights or wildcards.
- [ ] Implement the starter damage rule `B + A + K × P` with flat defense subtracted before the multiplier floor, clamped Protection resistance, shield absorbed last and HP clamped at zero; use exact rational/fixed-point arithmetic at the defined rounding boundaries and one shared resolver for previews and commitment.
- [ ] Enforce resource contracts: current/max/reserved HP/MP/SP, effective cost `max(1, ceil((rankCost + flat) × max(0, 1 + pct)))` per positive pool, all pools validated together before rolling, HP payment bypassing mitigation/shield while leaving at least 1 HP, and a skill never financing its own upfront cost.
- [ ] Resolve STR/INT/DEX/WIL/LUK and derived stats in dependency order (progression baseline → equipment/status modifiers → derived maxima/attack/defenses → direct derived modifiers) with additive flat/percent aggregation, explicit bounds/rounding and no refill when a maximum rises.
- [ ] Implement statuses with source IDs, stacking groups/priorities (refresh/replace rules), durations in affected-actor completed activations, periodic effects before expiry, stat recomputation/clamping and authored regeneration for living actors at eligible activation ends; nothing ticks at application and dice commands never tick or expire effects.
- [ ] Fill the dice 400, ability 500, damage 600 and status 700 pipeline slots; resolve status-generated damage before cleanup through the shared synchronous helpers.
- [ ] Implement deterministic enemy decisions through the same effect/damage helpers; remove dead actors from occupancy/initiative before selecting the next actor; finalize the player activation once even when the last hostile dies, evaluating defeat before victory.
- [ ] Emit immutable ordered combat events and expand canonical replay fixtures: exhaustively classify all 7,776 ordered five-die hands across the eight combination classes; pin one initial roll plus two subset rerolls, frozen inputs, held faces, weighted-probability boundaries, damage distributions, HP bounds, invalid commands and terminal states.
- [ ] Author the starter slice content: sword attack skill at two illustrative ranks (fair and weighted profiles), one enemy response, one skill buff and one enemy stat debuff; add the authored defensive skill, a mana skill and an illustrative HP-cost case as their effects and durations are authored. Stage Smash and Combat/Sword Mastery as their values become available.

Exit criteria:

- [ ] One hero and one enemy can resolve an encounter to victory or defeat through plain JVM command tests using the starter sword skill with fair and weighted profiles.
- [ ] Identical state, streams and commands produce identical rolls, kept dice, damage, turn order and events.
- [ ] Invalid commands, extra rolls or rerolls, post-lock skill/target/panel changes and turn-finalization edge cases cannot create resources, rerolls, damage or extra turns.

## Phase 5 — Playable Combat and Resumable Activations

**Goal:** Make the five-dice encounter playable and interruptible without changing committed outcomes.

**Plan alignment:** Completes Milestone 2; game-plan sections 10–14; [battle.md](gameplay/battle.md) sections 3 and 9 and [stats.md](gameplay/stats.md) sections 3 and 7.

Tasks:

- [ ] Build the battle HUD with Scene2D tables/skins: five persistent dice slots with kept markers, a remaining-rerolls label, pip total, combination/multiplier with a compact combination reference, skill/rank selection showing costs and face probabilities, target selection, HP/MP/SP current/max/reserved, final costs, status icons with remaining affected-actor activations and the end-turn control.
- [ ] Provide separate Roll, Reroll and Use Skill controls with clear availability; explain which pool blocks an unaffordable skill and expose the stat sources behind the damage preview.
- [ ] Connect HUD view models to `RunController` commands; UI selection and animation remain separate from authoritative dice/combat data, and previews reuse the committed stat/damage resolvers without consuming gameplay RNG.
- [ ] Support tap-based keep/reroll selection and keyboard focus; provide a non-drag alternative if drag gestures are added.
- [ ] Map domain events into bounded presentation tracks for movement/attacks, floating damage, death, camera feedback, SFX and haptics through service interfaces.
- [ ] Reconcile intermediate event animations to the final snapshot, honoring event-time visibility and preventing hidden-enemy information leaks.
- [ ] Gate duplicate input while resolving/presenting, and make skip/reduced-motion behavior consume presentation events once without changing rules.
- [ ] Extend checkpoint DTOs to the whole dice activation: phase, five stable die IDs/faces, kept flags, reroll budget, selected/locked skill/rank/target, locked stat inputs and profile, pools and reservations, status sources/durations, cooldowns and RNG continuation after each accepted dice command.
- [ ] Gate subsequent gameplay after rolls/rerolls until their checkpoint is durable or the save failure is explicitly handled; reloading must never refund a cost or restore a spent reroll.
- [ ] Restore mid-activation and during presentation by rebuilding the HUD from committed state; reopening a panel or retrying a command never rerolls, refills resources, refreshes durations or double-applies effects.
- [ ] When minimal run-inventory consumption exists, enable `USE_ITEM` with one restorative potion and one potion carrying a temporary side effect as a pre-roll full action; otherwise record the deferral and its disposition against the inventory phase.
- [ ] Exercise encounter start, victory, defeat, retry and return flows on desktop, Android and iOS, with command-to-HUD and restore integration checks.

Exit criteria:

- [ ] A player can win or lose the starter battle on each target through real controls, using skill selection, keep/reroll decisions and pass.
- [ ] Saving after a roll/reroll and resuming preserves dice, kept flags, reroll budget, locked inputs, reservations, statuses and the future deterministic continuation.
- [ ] Animation skip, interruption or replay cannot alter damage, grants, dice, statuses or turn order.

## Phase 6 — Durable Saves, Migrations, and Lifecycle Recovery

**Goal:** Harden the incremental checkpoint system into reliable offline storage and recovery.

**Plan alignment:** Begins Milestone 3; game-plan sections 4 and 12–14.

Tasks:

- [ ] Complete the project-owned JSON bundle for schema/rules/content/generator versions and revisions; the profile (hero/life identity, level/XP/cumulative level, AP, skills/objective counts, talent, current-life growth, starting age and processed aging intervals, inventory/equipment/bags/placements/locks, page records, currencies, overflow, installed enchant values, hub pools, enchanting RNG and operation results, quests/stages/evidence/milestones, tracked quests and reward IDs, discovered/earned title IDs with acquisition source/outcome IDs, title evidence/counters, First/Second title selections, talent display and favorites); the run (generated map, entity DTOs, explored cells, counters, scheduler, full RNG states, the dice activation with locked skill/rank/target/profile, five stable dice, kept flags and reroll budget, pools/reservations, stat sources, effect timing, cooldowns, enabled skill-extension state, run inventory origins/reservations/consumption, quest snapshot/pending evidence, equipped base-title snapshot and pending title discovery/award evidence, pending XP/training/loot and the committed result ID); and the RP-mission section (attempt ID, isolated session state, outcome status) reserved for Phase 9.
- [ ] Implement explicit codecs and validation with LibGDX JSON utilities; exclude artemis-odb internals, transient intents, caches, textures and animation clocks.
- [ ] Finish alternating-slot writes with increasing revision, checksum, close/verification and newest-valid-slot recovery; retain the previous good slot after a torn write.
- [ ] Serialize saves through one application-owned writer and keep revision/callback ordering when coalescing. Never overwrite a newer save with an older queued result.
- [ ] Add typed operational failures and recoverable loading/save UI; reject unsupported future schemas without overwriting the original file.
- [ ] Add sequential schema migrations and fixtures for every shipped version; preserve rules/content compatibility or provide a deliberate migration/recovery policy. Content changes that shrink storage or alter progression thresholds must migrate so every item and record is preserved rather than recalculating shipped characters or deleting items that no longer fit.
- [ ] Implement pause checkpoints, bounded flush, resume reconstruction and stale-session callback guards; required saves continue to belong to the application across screen changes.
- [ ] Preserve the last stable floor if generation fails/is interrupted, and checkpoint before installing a new floor.
- [ ] Establish the combined profile/run/grant-ID transition used by Phase 7 so completion rewards cannot be independently saved twice; record hub operation IDs (learning, pages, AP advancement, enchanting, coupon title unlocks, rebirth) with their inputs, outputs, results and RNG state atomically.
- [ ] Test corruption, torn slots, delayed/out-of-order requests, save failure/retry, migration, unsupported versions and interruption at dice/floor/reward boundaries; verify loads rebuild effective stats from saved sources without reapplying instant effects, re-awarding growth, refreshing statuses or duplicating reservations.
- [ ] Compare restored and uninterrupted runs on JVM, Android and RoboVM, including complete RNG continuation and initiative ties; verify actual device storage/lifecycle behavior.

Exit criteria:

- [ ] A failed or interrupted write leaves a valid recovery path, and an older save cannot supersede newer durable progress.
- [ ] Load/migration restores the complete logical run while rebuilding only derived state; future-version data is preserved.
- [ ] Resume and replay produce equivalent outcomes on the tested targets, with device evidence distinct from simulator evidence.

## Phase 7 — Progression, Inventory, and the Offline Run Loop

**Goal:** Complete the durable loop around the starter dungeon before expanding its content.

**Plan alignment:** Completes Milestone 3; game-plan sections 14–16; [inventory.md](gameplay/inventory.md), [skills.md](gameplay/skills.md) and [character.md](gameplay/character.md).

Tasks:

- [ ] Decide and record the victory/defeat/abandonment retention policy for brought gear/supplies, new loot, gold, XP, training, quest evidence and title evidence in Open Decisions before inventory-backed results ship.
- [ ] Add thin title/home, dungeon selection, hero (character/skills/inventory/equipment), settings and results screens through the existing screen coordinator, including the skill journal and character screens.
- [ ] Implement the grid inventory: provisional 6 × 10 backpack, fixed rectangular footprints, stack keys with run provenance, one ordinary non-nesting bag, deterministic placement (saved bag-priority order, then backpack, scanned left-to-right/top-to-bottom), whole-transfer validation with explicit smaller-quantity partial pickup, gather/sort preserving counts/variants/locks/provenance with a failed sort retaining the old layout, and favorites as markers versus enforced item locks.
- [ ] Implement equipment slots (main/off hand, head, body, hands, feet, two accessories), two-handed off-hand reservation counted once, paired swords as two legal instances, sword/shield support for shield skills, mutually exclusive body armor categories, atomic equip transactions validating every displaced item's destination, and effects only while equipped and eligible with no automatic drop or resource refill.
- [ ] Implement the three learning routes: NPC instruction, complete-book reading (consumes one book on success; duplicates consume nothing) and page assembly (any order, no expiry, wrong/duplicate pages rejected without consumption); learning grants Rank F with 0 training and spends no AP.
- [ ] Implement training and advancement: at least 100 current-rank points plus authored AP per rank-up, capped objectives counted once per resolved outcome and reset on advancement, excess training discarded, AP unable to buy training or auto-advance, rank 1 terminal, passives training from eligible events under their own objective IDs, and a journal distinguishing training-complete/insufficient-AP/ready/max-rank states with visible prototype caps.
- [ ] Implement character progression: XP thresholds with multi-level crossing, 1 AP per earned level up to the content-defined cap (proposed 200) discarding overflow, cumulative level `1 + earned level-ups across all lives`, age/talent growth bundles stored with grant-time precision, initial Close Combat and Magic talents, and mastery derived for every talent from current skill ranks with no second AP payment and inactive-talent bonuses preserved.
- [ ] Implement aging: one year per seven elapsed real days reconciled once per interval at hub/results boundaries including offline time, destination-age rewards (11–20: 5 AP plus authored growth; 21–25: 5 AP plus base growth; 26+: neither), idempotency against repeated menus and backward clock changes, a controllable test clock, and the recorded clock-trust decision.
- [ ] Implement titles per [titles.md](gameplay/titles.md): one collection per hero with Unknown → Known → Earned states and separate hint/award conditions, First/Second base slots plus a cosmetic talent display, hub-only equip/swap with no cost or cooldown and no auto-equip on award, effects as removable modifier sources entering at the equipment/direct stat stages with benefits and penalties and no pool refill, and a character-screen Titles section with stat previews (including current-pool clamping), filters/favorites and a "Change titles in the hub" state during a run.
- [ ] Award titles from run achievements, committed character milestones (level-up, age-up, cumulative, rebirth) and hub coupon consumption only; snapshot the equipped base titles into each new run as fixed for its duration; evaluate award conditions at the outcome boundary from committed facts under the retention decision; process multiple qualifying awards in stable title-ID order where duplicate awards are no-ops.
- [ ] Copy a validated loadout and provisions into a new run with exact origin reservations (including bag contents as one contained hierarchy); account/menu changes cannot silently mutate an active character; in-run layout commands cost no initiative and are unavailable while dice are locked.
- [ ] Implement world pickup as one full action with quantity/fit validation; failed pickups stay on the ground without a turn or loot reroll; implement validated currency/cost/grant operations rejecting negative, duplicate, unaffordable or invalid inventory/equipment operations, with outputs placed only after simulated input consumption.
- [ ] Implement withdraw-only saved reward overflow for grants that do not fit, accepting only authoritative grants and reconciliation returns, unusable until withdrawn, and required to be cleared before a new run or optional reward activity while preserving already-earned results.
- [ ] Commit run completion in one save-bundle transition: reconciled brought-item consumption/returns and released reservations, retained loot/XP/training (and quest evidence once quests exist), saved overflow, updated profile and grant ID; apply retained XP with run-start age/talent, then training, then elapsed aging; show results only from the committed outcome.
- [ ] Implement start, continue, abandon, defeat, complete and return flows, including loading/empty/error/save-recovery states, and add repeat-completion/retry/load tests proving a result is granted once and the next run receives the intended progression/loadout.

Exit criteria:

- [ ] The player can select a hero and loadout, explore/fight, finish or lose a run, receive the defined progression, learn/advance skills through all three routes, manage grid inventory/equipment and start again.
- [ ] Restart/retry at results or hub operation boundaries cannot double-grant loot, XP, AP, training or currency, or restore consumed supplies.
- [ ] Titles can be earned, equipped and previewed in the hub, survive save/load and rebirth, apply only while equipped, and never alter an active run's stats mid-run.
- [ ] The offline loop requires no authentication, purchase or gacha service.

## Phase 8 — Quests, Enchanting, and Rebirth

**Goal:** Build the hub progression systems — quests, enchanting, and rebirth — on top of the durable loop.

**Plan alignment:** Begins Milestone 4; game-plan sections 15–16; [quests.md](gameplay/quests.md) and [enchants.md](gameplay/enchants.md).

Tasks:

- [ ] Implement quest state (Locked → Available/Active → Ready to complete → Completed), Chapters/Generations with explicit prerequisites, eligibility separate from automatic versus NPC delivery, authored-order rank comparisons, one completion per hero with no expiry, non-abandonable mainstream quests and authored sidequest abandonment preserving committed delivery checkpoints.
- [ ] Deliver the first quest slice: one short Chapter/Generation story chain, one NPC sidequest, one automatic rank-milestone Skill Quest and one NPC-offered skill-unlock quest, with journal tabs (Chapter-named storylines containing Generations, plus Sidequests and Skills with an RP badge), a tracker, and explicit Complete/final-NPC-dialogue claims.
- [ ] Implement objectives and evidence: stable objective IDs, ordered stages, capped/deduplicated evidence from dialogue, interaction, defeats, skill outcomes, acquisition/delivery and mission success; event objectives count only after stage activation; item requirements recheck legal current inventory; hand-ins consume items and checkpoint objectives together; triggers process after the initiating transaction in stable quest-ID order with idempotent catch-up after load.
- [ ] Implement atomic quest claims: revalidate final objectives and hand-in costs, consume items, grant XP/AP/items/Rank F skill unlocks and quest-awarded titles (slot-typed definitions whose hint/award predicates resolve to authored quests, encounters, stats and coupons), record the completion ID and unlock successors; route full-backpack grants into saved reward overflow without regranting XP/AP; a quest skill reward grants only an unknown Rank F and completes without refund when already known.
- [ ] Add the instructor-taught Enchant skill using the shared training/AP progression (at least two playable ranks) plus scroll, powder and enchant-definition catalogs with slot/rank/condition tables and authored rank ordering.
- [ ] Implement hub-only enchant application: one prefix and one suffix per eligible item, replacement only on success, the Rank 5–1 scroll gate at Enchant skill Rank 5+, conditional clauses reading progression snapshots, variable values rolled once on installation and persisted, effects feeding the equipment stat stage once with independent penalties staying active, and the basis-point chance resolver with the 90% cap under Protect Equipment (failure consumes scroll, powder and MP while preserving the item and both enchants).
- [ ] Add the hub MP pool with an explicit authored recovery/rest loop as a prerequisite for enchant operations.
- [ ] Implement enchant burning as a separate destructive operation: consume the item, materials and MP regardless of recovery; independent prefix-then-suffix recovery checks on the dedicated enchanting RNG; reserved output capacity for the maximum possible recovered scrolls before spending or drawing; recovered scrolls retain definitions, not old rolled values.
- [ ] Persist enchant operations atomically — costs, equipment/output changes, training, operation ID and the dedicated enchanting RNG state — before revealing; retry returns the recorded result; previews consume no RNG.
- [ ] Settle rebirth eligibility/cost/cooldown in Open Decisions, then implement hub rebirth: preview and atomically reset current level/XP, starting age, talent and life growth while preserving cumulative level, learned ranks/training, unspent AP, mastery, committed items/pages/enchants, quests and claimed rewards; settle run results and aging first and move newly illegal equipment into storage/overflow.
- [ ] Record the qualifying rebirth event's life ID and talent for rebirth-gated quest delivery, and snapshot the resulting progression/loadout for the next run.
- [ ] Test quest delivery/deduplication/catch-up, enchant chance boundaries, failure preservation, persistent rolled values, burn recovery and output capacity, rebirth preservation, quest-awarded title grants without duplicates or consumed coupons on retry, and interrupted save/retry without duplicate grants, charges or rolls.

Exit criteria:

- [ ] Saved quests, enchant application/protected failure/burning and rebirth operate in the hub loop with exactly-once claims and operations.
- [ ] Quest, enchant and rebirth triggers cannot double-deliver, double-grant, double-charge or reroll persisted values, including after reload, retry or interruption.
- [ ] Rebirth preserves the defined progression and cannot bypass unfinished-run result or aging rules.

## Phase 9 — Role-Playing Missions and Skill Extensions

**Goal:** Add the isolated RP mission mode and stage the remaining combat skill catalog behind their authored dependencies.

**Plan alignment:** Milestone 4; game-plan section 16; [quests.md](gameplay/quests.md) section 7, the [skills.md](gameplay/skills.md) combat catalog and [titles.md](gameplay/titles.md) sections 2 and 5.

Tasks:

- [ ] Implement the RP mission mode: a hub-started, isolated session (scenario/NPC template versions, attempt ID, fixed stats/skills/gear/supplies, map, objectives, outcome) requiring no other active run, using the normal movement and five-dice rules through the NPC's authored abilities while the hero profile remains untouched.
- [ ] Enforce RP boundaries: no hero XP/training/loot by default, borrowed items/skills never leak to the hero, hub progression/rebirth/equipment export disabled during the mission, and only the recorded scenario outcome advances its eligible quest.
- [ ] Implement the RP lifecycle: success saves the outcome once and returns to the hub; failure/exit leaves the quest retryable at its authored checkpoint; retry creates a fresh attempt; loading resumes the same suspended attempt (HP, supplies, dice, objectives); app closure is neither failure nor reset.
- [ ] Add equipment defense passives (Shield Mastery, Heavy/Light Armor Mastery with mutually exclusive body categories and penalty relief at the source, no Shield absorption pool) and Final Hit as a paid temporary melee buff with its resolved magnitude/duration saved while later attacks still pay and roll normally.
- [ ] Add Counterattack's one-charge prepared retaliation only with synchronous reaction ordering inside the attacking transaction, stance expiry at the start of the owner's next activation, and no counter/critical recursion.
- [ ] Add Windmill with frozen Manhattan-area targets resolved by stable ID, one payment and hand, and separate full resolutions per frozen defense; add Charge with a validated straight empty lane, frozen destination, and movement plus one hit as one atomic action.
- [ ] Add Critical Hit only with the critical-resolution extension: the learned passive supplies bonus damage, authored chance in basis points drawn once per eligible target after counter interception using combat RNG, bonus applied to `comboDamage` before Protection and shield, and no draw for countered or zero-chance hits.
- [ ] Add dual wielding with two distinct one-handed instances whose contributions combine once; two weapons still produce one five-dice action, and Charge's shield requirement stays excluded from the paired loadout initially.
- [ ] Stage Master Titles as a later extension (per-skill Rank 1 mastery checklists tracked separately from rank-up training, granting the title without another rank or AP payment, occupying the First Title slot, requiring current Rank 1 to equip) and vanity presentation (appearance-only slot overrides with no extra stats) after their content passes exist.
- [ ] Stage each extension behind its authored rules, content values, reachable training and dependencies; keep unavailable skills visibly labeled in the journal without fake Use or training paths.
- [ ] Save cooldowns, prepared reactions, area targets/paths and critical results with the run state; outcome IDs prevent retries or reloads from reapplying damage or training.
- [ ] Test passive activation/removal, one mastery contribution with two weapons, armor exclusivity, Counterattack consumption/expiry without reaction loops, Final Hit timing, blocked Charge routes, Windmill target order and training counts, and critical RNG/multiplier order when enabled.

Exit criteria:

- [ ] One RP scenario completes, fails and resumes without hero-state leakage, borrowed-progression leaks or duplicate outcomes.
- [ ] Enabled skill extensions obey their gating, and save/retry cannot reapply their effects, cooldowns or training.
- [ ] Disabled extensions remain visible but inert, with the dependency keeping each one disabled recorded.

## Phase 10 — Dungeon Depth and Expanded Encounters

**Goal:** Extend the proven loop with multiple floors and richer content using the same simulation contracts.

**Plan alignment:** Milestone 4; game-plan sections 7–10 and 15–16.

Tasks:

- [ ] Add data-driven generation profiles, cave/authored-room options and placement constraints behind the existing generator interface.
- [ ] Expand doors/keys, traps, pickups, stairs and environmental content with explicit movement, opacity and action-cost rules.
- [ ] Add encounter/loot tables, boss rooms and multi-floor dungeon definitions with stable content references.
- [ ] Implement floor transitions with derived seeds, explicit health/status/inventory carry-over and checkpoint-before-install behavior.
- [ ] Define and implement multi-enemy encounter participation/joining, targeting, perception/memory and richer deterministic AI using the existing initiative queue.
- [ ] Add hero abilities, dice/status combinations and enemy policies without duplicating formulas or storing gameplay state in screens.
- [ ] Implement in-run consumable use only through the explicit pre-roll full-action command with content-defined costs and validation; equipment changes remain hub/loadout operations.
- [ ] Test reachable spawn/exit/key placement, bounded generation failures, multi-actor cleanup, loot legality and full multi-floor replay through completion or defeat.

Exit criteria:

- [ ] A player can traverse multiple floors, resolve varied encounters and complete or lose the expanded run with correct durable rewards.
- [ ] Generation cannot install an invalid floor, and interruptions preserve the prior stable state.
- [ ] Identical versioned inputs reproduce floors, combat, loot and results without remote requests during rules.

## Phase 11 — Presentation Polish, Input, Audio, and Haptics

**Goal:** Replace prototype presentation while preserving command authority and resource budgets.

**Plan alignment:** Milestone 4; game-plan sections 11–13 and 18.

Tasks:

- [ ] Replace temporary art with organized atlases/animations and validate identifiers through offline build tooling rather than the shipped runtime.
- [ ] Refine sprite animation, camera focus/clamping/pixel snapping, transitions, fog and bounded particles/floating text.
- [ ] Implement audio preloading, music/SFX channels, volume settings, pause/resume and graceful failure handling through `AudioService`.
- [ ] Implement Android/iOS haptic adapters and desktop no-op behavior through `HapticsService`; honor user settings.
- [ ] Add tap-to-walk preview with one-step revalidation and cancellation on danger/interaction/manual input; add controller mapping if selected for release.
- [ ] Implement key remapping, keyboard/controller focus, scalable text, large touch targets, non-drag alternatives, reduced motion and color-independent cues.
- [ ] Validate viewport unprojection, modal consumption, safe insets, resizing and pixel clarity across supported screen sizes/densities.
- [ ] Design and verify platform accessibility integration where required; Scene2D widgets alone do not establish native screen-reader support.
- [ ] Add reward/level-up/rank-up/quest-claim/title-award/enchant-result/menu reveals that animate known committed outcomes. Introduce optional Spine/text-effect/interpolation libraries only for a demonstrated art/UI need.
- [ ] Remove the temporary in-app frame-capture/auto-demo verification aid introduced in Phase 1 once real-device evidence covers it.
- [ ] Profile startup, assets, presentation queues and repeated screen transitions; optimize batching/copying only for measured problems.

Exit criteria:

- [ ] Audio, haptics and cosmetic effects can be disabled or interrupted without changing gameplay state.
- [ ] Controls remain usable across the selected input methods and display sizes, with actual accessibility evidence recorded.
- [ ] Rendering/resource lifetime stays within agreed frame-time and memory budgets on baseline devices.

## Phase 12 — Offline Quality, Balance, and Device Acceptance

**Goal:** Validate the expanded offline game as a release-quality foundation for later services.

**Plan alignment:** Completes Milestone 4; game-plan section 18.

Tasks:

- [ ] Consolidate rule/adapter/controller/save coverage for system registration order, structural changes, coordinate translation, occupancy, FOV, initiative, combat, titles (discovery/award/equip) and canonical replay.
- [ ] Run complete start-to-result, save/resume, floor-change, defeat/abandon and repeat-run checks against actual backends.
- [ ] Use seeded simulations to measure generation validity, encounter difficulty, progression pacing, loot and five-dice distributions against documented targets.
- [ ] Set budgets for startup, dungeon entry, ordinary command latency, generation worst cases, frame time, memory, event queues and save size/latency.
- [ ] Profile release/minified Android builds and iOS AOT builds on representative physical devices, including a mid-range Android baseline; record device models and refresh rates.
- [ ] Verify interruption during generation, animation, dice checkpoints, slot writes and result grants, including app recreation and unavailable/corrupt storage paths.
- [ ] Exercise text scaling, remapping/focus, reduced motion, non-drag controls, contrast/color cues and native accessibility behavior; record limitations and fixes.
- [ ] Verify localization/long-text layouts where supported and triage remaining offline correctness/performance/accessibility defects.

Exit criteria:

- [ ] The full offline loop and deterministic recovery pass on supported targets with explicit device/release evidence.
- [ ] Agreed performance and balance targets are met, and no known offline release blocker remains.
- [ ] New service work can rely on stable save/content versions, reward semantics and platform lifecycle behavior.

## Phase 13 — Local Gacha Simulator and Reveal Flow

**Goal:** Exercise banner and reveal behavior through a development-only repository before production integration.

**Plan alignment:** Milestone 5 preparation; game-plan section 16. This phase is not a prerequisite for completing the offline Milestone 4.

Tasks:

- [ ] Define validated banner/rate/pity/guarantee/duplicate-conversion catalogs and versioned pull request/result DTOs.
- [ ] Add a provider-neutral `GachaRepository` interface and a development-only local implementation with its own RNG stream and currency namespace.
- [ ] Implement pull commands with idempotency keys and one durable transition for local spend, grants, pity/guarantees and pull history.
- [ ] Build banner details, rates, confirmation, result/reveal, history and collection updates in Scene2D without exposing repository implementation details to widgets.
- [ ] Resolve and persist a result before revealing it; replay an interrupted reveal from its recorded result without rerolling or charging again.
- [ ] Test invalid/expired banners, insufficient currency, guarantee/pity boundaries, duplicate conversion, duplicate requests and interrupted saves/reveals.
- [ ] Gate the simulator out of production commerce paths and document how Phase 15 replaces it with a remote repository.

Exit criteria:

- [ ] Development pulls are valid, durable and idempotent, including after interrupted reveals.
- [ ] Reveal timing cannot change inventory, balance, pity or the pull result.
- [ ] Local RNG/currency cannot authorize production premium grants.

## Phase 14 — Authentication, Backend, and Cloud Synchronization

**Goal:** Add production services through Java interfaces and platform adapters without changing deterministic rules.

**Plan alignment:** Milestone 5; game-plan sections 4, 13 and 16.

Tasks:

- [ ] Select an identity/network integration that supports the chosen desktop/Android/RoboVM targets and define provider-neutral auth/session/API contracts.
- [ ] Implement guest/sign-in/session-expiry/sign-out/account-switch behavior and initial session loading through application controllers.
- [ ] Store session secrets through appropriate platform secure-storage adapters; keep provider types out of simulation and saves.
- [ ] Validate API payloads, map expected errors, bound requests/retries and give each retry policy one owner; hand results to the render thread with session checks.
- [ ] Define cloud-save conflict rules, ownership/revision checks and schema/content compatibility before implementing synchronization.
- [ ] Implement sync so stale responses cannot overwrite newer progress, and account changes cannot apply another account's outstanding work.
- [ ] Add analytics/crash-reporting/remote-configuration boundaries and test enablement, failures and redacted diagnostics.
- [ ] Test offline/expired-session/retry/conflict/account-switch flows, including late callbacks after screen or run replacement.

Exit criteria:

- [ ] Auth and sync work on the selected targets without leaking provider SDK types into shared game rules.
- [ ] Conflicts and stale responses have explicit behavior and cannot silently overwrite newer or another account's progress.
- [ ] Offline dungeon play stays deterministic; secrets and production tokens are absent from game bundles/logs.

## Phase 15 — Verified Purchases and Production Gacha

**Goal:** Make paid grants and pulls server-authoritative, idempotent and recoverable.

**Plan alignment:** Milestone 5; game-plan section 16.

Tasks:

- [ ] Select Android/iOS billing integrations and any entitlement provider only after confirming Java/RoboVM integration; define the desktop commerce scope separately.
- [ ] Implement `PurchaseRepository` and platform adapters for product loading, pending/success/cancel/failure, restore and interruption behavior.
- [ ] Verify platform transactions and grant entitlements server-side; never grant premium currency from a client callback alone.
- [ ] Replace production gacha with a remote transaction using server RNG/time, banner versions and idempotency keys.
- [ ] Return authoritative spend, balance, pity/guarantees, ownership, result and transaction ID consistently; persist/reconcile before animating the reveal.
- [ ] Recover transactions whose response was lost after server commit, and handle duplicate callbacks, reconnects, restores and revoked/refunded entitlements.
- [ ] Remove development-grant paths from production configuration and validate the actual release backend/billing environment.
- [ ] Test store sandbox accounts and backend flows for duplicate requests, interrupted purchases/reveals, insufficient funds, expired banners and reconciliation.

Exit criteria:

- [ ] Client RNG, UI callbacks or reveal completion cannot authorize premium grants.
- [ ] A logical transaction cannot double-charge or double-grant under retries, duplicated callbacks or response loss.
- [ ] Android/iOS purchase restore and interrupted-transaction recovery have recorded sandbox/device evidence.

## Phase 16 — Release Readiness and Live Operations

**Goal:** Package and operate compatible desktop/mobile releases with verified updates and recovery.

**Plan alignment:** Completes Milestone 5; game-plan sections 1–2, 16 and 18–19.

Tasks:

- [ ] Finalize application identifiers, versions, icons, launch assets, orientation, permissions, entitlements and signing configuration per target.
- [ ] Produce desktop JAR/Construo distributions, Android release artifacts and an iOS archive through the documented workflows; verify bundled native libraries and runtime requirements.
- [ ] Keep Graal Native Image optional; if selected, complete a separate native-image/resource/reflection compatibility gate rather than treating desktop JVM success as proof.
- [ ] Verify previous-release save/schema/content migrations and interrupted-run recovery across binary/content updates; preserve incompatible data and a recovery path.
- [ ] Define compatible client/API/content versions, staged rollout, rollback, incident response, support and content-update procedures with clear owners.
- [ ] Recheck store, account/privacy, age-rating, purchase and probability-disclosure requirements for the chosen launch regions at release time.
- [ ] Run internal/closed testing for the complete offline and online flows on representative devices and fix all release blockers.
- [ ] Verify operational diagnostics, dashboards, remote configuration and access controls using the production configuration.
- [ ] Publish the authorized signed artifacts and complete launch/install/update/purchase/save smoke checks; record released versions and evidence.

Exit criteria:

- [ ] Desktop distributions and signed Android/iOS artifacts pass the supported install, launch, update and lifecycle checks.
- [ ] Purchase/account/save/content compatibility and applicable launch requirements are verified for the production configuration.
- [ ] Monitoring, rollback, support and migration procedures have owners and have been exercised.

## Milestone Map

These milestones match game-plan section 19. Each requires its listed phases and all earlier prerequisites; later quality work does not replace per-phase verification.

| Game-plan milestone                          | Required phases | Outcome                                                                     |
|----------------------------------------------|-----------------|-----------------------------------------------------------------------------|
| 0 — Repair and prove the dependency baseline | 0–1             | Repaired dependency graph and visible lifecycle-safe screen on each backend |
| 1 — Playable dungeon movement                | 2–3             | Validated content/RNG, deterministic movement/turns/FOV and basic reload    |
| 2 — Five-dice encounter, resources, and resumable activation | 4–5 | Playable five-dice battle with locked inputs, reserved costs, statuses and activations preserved across interruption |
| 3 — Durable run, inventory, and progression loop | 6–7         | Robust recovery, grid inventory/equipment and a repeatable offline loop with skills/XP/aging granted exactly once |
| 4 — Hub systems, quests, and dungeon depth   | 8–12            | Quests, enchanting, rebirth, RP missions, staged skill extensions, expanded content and measured device acceptance |
| 5 — Production services and delivery         | 13–16           | Gacha/service integration, verified commerce and releasable distributions   |

## Decisions Already Set by the Game Plan

| Decision             | Baseline to implement                                                                          |
|----------------------|------------------------------------------------------------------------------------------------|
| Source compatibility | Java 8 shared code; build JVM selection remains separate                                       |
| Simulation authority | One artemis-odb `World` and `RunSession` per run                                               |
| Initial algorithms   | SquidSquad `DungeonProcessor`, `DijkstraMap`/Manhattan movement, `FOV.reuseFOV`/diamond radius |
| RNG                  | Explicit Juniper AceRandom streams; persist all state words and algorithm/version IDs          |
| Initiative           | Project queue with logical ticks and stable tie-breaks; initial activation cost 100            |
| Contact combat       | Bump starts the current player's dice activation without movement or immediate damage          |
| Dice activation      | Exactly five d6 power one selected active skill; skill/target/inputs lock at the first roll; one initial roll plus two batch rerolls; whole-hand commit or paid pass |
| Combat resources     | HP/MP/SP tracked as current/max/reserved; positive authored costs; nonlethal HP payments; activation-boundary durations and regeneration |
| Run inventory        | Hero-owned run snapshot with origin reservations; hub inventory mutation unavailable during a run; withdraw-only saved reward overflow |
| In-run equipment     | Equip/unequip are hub/loadout operations in the initial battle design; in-run consumable use is a gated pre-roll full action |
| Titles               | Per-hero collection; First/Second base slots equipped hub-only; effects as removable stat-modifier sources; talent display cosmetic; vanity and Master Titles deferred |
| Save format          | Project-owned versioned JSON profile/run bundle in alternating slots                           |
| Presentation         | SpriteBatch world, Scene2D HUD/menus, animations of committed events                           |
| Initial layout       | Landscape and 16-pixel tiles; exact logical resolution/scaling still needs validation          |
| Production grants    | Server-authoritative purchases/gacha, idempotent results before reveals                        |

## Open Decisions

Resolve these when their phase needs them. Do not reopen the settled contracts above merely because the old tracker listed them as undecided.

| Decision                                                             | Needed by | Status              | Resolution/evidence                                                                                                                                                                                                                                                                                                                                                                                                     |
|----------------------------------------------------------------------|-----------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Duplicate-artifact repair and reviewed minimal dependency graph      | Phase 0   | Resolved 2026-09-02 | Narrow exclusion of `com.github.tommyettinger.jdkgdxds:build` in root `build.gradle` (all subproject configurations); retained `:jdkgdxds` module with identical transitive deps. Runtime reduced to gdx 1.14.2, artemis-odb 2.3.0 (replacing ashley 1.7.4 same day), squidcore/grid/place/path 4.0.12, jdkgdxds 2.1.8, juniper 0.10.5. README "Dependencies"; `*/gradle.lockfile`; `gradle/verification-metadata.xml`. |
| Test/check tooling and CI setup                                      | Phase 0   | Resolved 2026-09-02 | JUnit 4.13.2 pinned for `:core:test` (plain JVM, no Gdx.app/OpenGL); Checkstyle 10.20.2 with `config/checkstyle/` (formatting hygiene + `ImportControl` banning `com.badlogic.gdx` under `game/`); `--release 8` guards the Java 8 API surface. `.github/workflows/ci.yml.backup` runs shared tests/checks, desktop compile and Android packaging; iOS verification documented as manual macOS-host steps in README.           |
| Logical world resolution/scaling and initial test-device matrix      | Phase 1   | Resolved 2026-09-04 | World: `ExtendViewport` with 320x180 logical minimum (20x11.25 tiles at 16px, y-up camera clamped to the floor rect; 960x540 desktop window scales 3x integer). UI: separate `ScreenViewport` `Stage` (1 unit = 1 pixel), HUD padded by `Graphics.getSafeInset*`. Verified on desktop 960x540, Android `Medium_Phone` AVD (2400x1080 landscape), iPhone 16 Pro simulator (iOS 18.6). Broader physical-device matrix stays open for Phase 12. |
| Resource limits: map size, automatic actions and presentation queues | Phase 3   | Open                | Bound before enabling untrusted/generated content sizes                                 |
| Starter combat balance: reroll allowance, multipliers, damage scaling, skill costs/cooldowns and rank probability tables | Phase 4 | Open | Command/activation contracts are fixed; provisional values from battle.md/stats.md ship as authored balance content, not inferred Dicero formulas |
| Skills/AP/title-collection ownership (hero vs account) and XP/AP economy targets | Phase 7 | Open | Specifications propose individual-hero ownership; settle before hub progression ships |
| Victory/defeat/abandonment retention for gear, supplies, loot, XP, training, quest and title evidence | Phase 7 | Open | Decide before inventory-backed results ship (Milestone 3); align this tracker with the decision |
| Title catalog balance, discovery/spoiler rules and coupon sources | Phase 7 | Open | Starter slice needs two competing First Titles, one Second Title, a hinted achievement and quest or coupon awards |
| Aging clock trust and forward-clock policy | Phase 7 | Open | Explicit application-level decision required before player-facing age rewards |
| Rebirth eligibility, cost and cooldown | Phase 8 | Open | Rebirth implementation is gated on this decision |
| Skill-extension and title staging: Counterattack, Windmill, Charge, Critical Hit, dual wielding, Master Titles, vanity | Phase 9 | Open | Enable only when authored rules, content values, reachable training and dependencies exist |
| Multi-enemy joining and richer encounter rules                       | Phase 10  | Open                | Reuse the current initiative queue and run authority                                    |
| Release input/accessibility scope and any native bridge              | Phase 11  | Open                | Record actual platform verification                                                     |
| Auth provider, desktop auth support and cloud conflict policy        | Phase 14  | Open                | Validate Java/Android/RoboVM compatibility                                              |
| Billing/entitlement integration and desktop commerce scope           | Phase 15  | Open                | Server verification and idempotency are required                                        |
| Launch regions, device support and distribution channels             | Phase 16  | Open                | Recheck requirements at release time                                                    |

## Verification Guide

These are verification entry points, not claims that all pass today. Use the relevant checks for the changed phase; do not run every platform build for a documentation-only update.

```sh
./gradlew --version
./gradlew :core:dependencies --configuration runtimeClasspath
./gradlew :lwjgl3:dependencies --configuration runtimeClasspath
./gradlew :android:dependencies --configuration debugRuntimeClasspath
./gradlew :ios:dependencies --configuration runtimeClasspath
./gradlew :core:compileJava :lwjgl3:compileJava
./gradlew :core:test
./gradlew :android:checkDebugDuplicateClasses :android:assembleDebug
./gradlew :lwjgl3:run
./gradlew :ios:launchIPhoneSimulator
```

A `NO-SOURCE` test task does not satisfy the test gate. A dependency report or successful compile does not establish native launch, device performance, accessibility, signing or release compatibility. Use the platform's documented release tasks and real target devices when a phase requires that evidence.

## Completion Log

Phases 0–1 are complete as recorded below; their numbers were not changed by the 2026-09-05 realignment. Add a row only after all phase tasks and exits are verified; include the date, target and exact evidence.

| Phase                                      | Completed date | Verified by                                                  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|--------------------------------------------|----------------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0 — Dependency repair and build foundation | 2026-09-02     | Local Gradle wrapper 9.7.1 (daemon JDK 21), macOS arm64 host | `:android:checkDebugDuplicateClasses` FAILED before repair, PASS after; `:core:check` = 6/6 tests + Checkstyle clean; `:core:compileJava :lwjgl3:compileJava :android:assembleDebug` pass (`android/build/outputs/apk/debug/android-debug.apk`); dependency reports for core/lwjgl3/android/ios resolve with no `FAILED`; lockfiles x4 + `gradle/verification-metadata.xml` (sha256). Repaired graph and rationale in README "Dependencies"; reports cached in `.firecrawl/phase0-logs/`. |
| 1 — Lifecycle, assets, and rendering integration | 2026-09-04 | Local Gradle wrapper 9.7.1 (daemon JDK 25 via mise temurin-25.0.4), macOS arm64 host; Android emulator; iOS simulator | Battery green after review fixes: `:core:check` 28/28 tests + Checkstyle clean (`SquidDungeonGeneratorTest` seeded reproducibility/no-transposition/detachment, `DungeonSimulationTest` one-process-per-command + rejection immutability + idle frames step nothing, `SessionWorkerTest` stale-session rejection, plus prior smoke tests); `:core:compileJava :lwjgl3:compileJava :ios:compileJava :android:checkDebugDuplicateClasses :android:assembleDebug` pass. Desktop (LWJGL3, macOS arm64, 960x540): menu/dungeon/menu/dungeon transition loop with accepted move, wall-rejection status text, and clean exit — in-app frame captures (F12/auto-demo, `assets/screenshots/`, gitignored). Android: `Medium_Phone` AVD, APK `android-debug.apk`, real `input tap` on Enter Dungeon and D-pad (Stage consumed the tap; wall-reject surfaced "Blocked." with Steps 0), DPAD keyevents advanced Steps 1→2, HOME pause + resume restored the dungeon render. iOS: RoboVM 2.3.23 AOT/link succeeded (`IOSLauncher.app` signed) for iPhone 16 Pro simulator (iOS 18.6, Xcode 27 beta) after removing stale force-link leftovers; app installed/launched via `simctl`, full demo loop (2x menu⇄dungeon, moves, rejection status) ran with clean exit; menu and dungeon (room, player, HUD, "Blocked." status) captured via the simulator composite. |

## Work Notes

- **2026-09-05 — Gameplay alignment update (documentation only; no implementation claimed).** Re-aligned the phase checklist with the game plan's September 5 gameplay update and the seven gameplay specifications. Phase 4/5 re-scoped to the five-dice contract: skill-before-roll selection, first-roll lock of skill/rank/target/inputs/profile, kept flags, one initial roll plus two batch rerolls via `REROLL_DICE`, whole-hand `USE_ABILITY` commit, paid post-roll pass; `ASSIGN_DIE`/`UNASSIGN_DIE` and the singular `REROLL_DIE` removed; `USE_ITEM` gated on inventory consumption; scoring/damage/resource/stat/status tasks follow battle.md and stats.md. Phase 6 save-bundle contents expanded to the game-plan section 14 profile/run/mission shape. Phase 7 expanded to grid inventory/equipment, the three learning routes with the 100-point-plus-AP gate, XP/levels/cumulative level/talents/mastery, weekly aging with the provisional reward cutoffs, world pickup, and withdraw-only reward overflow. New Phase 8 (quests, enchanting, rebirth) and Phase 9 (RP missions, staged skill extensions) split the old Phase 8 scope; former phases 8–14 renumbered 10–16. Milestone map updated to the renamed game-plan milestones (M2–M4); Open Decisions updated with the retention policy, hero-vs-account AP ownership, aging clock trust, rebirth economy and extension-staging decisions, and renumbered entries. RNG stream reservations updated (hub-enchanting stream → Phase 8; development-gacha stream → Phase 13). Phases 0–1 completion evidence unchanged. Note: the Phase 1 work note below references the frame-capture aid "marked for removal in Phase 9"; after renumbering that removal belongs to Phase 11, where it is now an explicit task.
- **2026-09-05 — Titles specification folded into the tracker (documentation only; no implementation claimed).** Added [titles.md](gameplay/titles.md) to the alignment list and placed title work: Phase 2 defers the title catalog; Phase 6 persists collection state, selections, evidence and the equipped-title run snapshot; Phase 7 implements the per-hero collection (First/Second slots plus cosmetic talent display, Unknown/Known/Earned with separate hint/award conditions, achievement/milestone/coupon acquisition, stat-stage effects with penalties and no refill, character-screen Titles section, fixed run snapshot, outcome-boundary evaluation) with a matching exit criterion; Phase 8 adds quest-awarded titles with predicate/content validation; Phase 9 stages Master Titles and vanity; Phase 11 adds title-award reveals; Phase 12 consolidates title coverage. Open Decisions extended: ownership folded into the hero-vs-account row, title evidence folded into the retention row, Master Titles/vanity added to the staging row, and a new catalog/discovery/coupon row. Note: game-plan.md does not yet reference titles.md — its specification table and sections 14–16 need a matching titles pass.
- **2026-09-04 — Phase 1 completed (lifecycle, assets, and rendering integration).** New shared code, all paths per game-plan section 17: `game/` (Gdx-free, Checkstyle-guarded) gained the command-driven spike — `commands/` (MoveCommand, CommandResult, PendingCommand), `ecs/components/` (GridPosition, PlayerControlled), `ecs/systems/` (CommandValidationSystem slot 100 → MovementSystem slot 200 → CleanupSystem slot 800, registration order = pipeline order), `grid/` (immutable row-major y-up FloorMap + GeneratedFloor), `algorithms/DungeonGenerator` (detached-data contract), `squidsquad/SquidDungeonGenerator` (one `DungeonProcessor(width, height, new AceRandom(seed))` per call; x-first `char[x][y]` → y-up row-major translation pinned by tests against the raw library grid), and `DungeonSimulation` (one synchronous `world.process()` per command; `StepCounterSystem` proves idle frames step nothing). `bootstrap/SessionWorker` owns the worker-thread → `postRunnable` handoff with session-token stale-callback rejection and executor shutdown on hide/dispose. `presentation/` gained LoadingScreen (drains the app AssetManager; actionable failure text + quit before any gameplay screen activates) and DungeonScreen (world `ExtendViewport` 320x180 min + clamped camera, private SpriteBatch, Scene2D `ScreenViewport` Stage with skin buttons/D-pad, `InputMultiplexer` stage-first, safe-inset padding, zero-size resize guards, worker-generated floors installed only on the render thread). `RebirthDungeon` now owns the `AssetManager` (dungeon atlas, uiskin atlas + skin) and acts as screen coordinator: `navigateTo` disposes the previous screen; managed assets are never disposed by screens. `FirstScreen` deleted. Assets: `assets/atlases/dungeon.{png,atlas}` — six 16px tiles (floor/wall/door/exit/2 player walk frames), Nearest filtering declared in the atlas; generator script `tools/make_dungeon_atlas.py` (offline tooling). Two atlas-format findings recorded for future asset work: TexturePacker-format `.atlas` files must not contain blank lines (a blank line makes the parser treat the next bare name as a new page/image — this produced the first launch failure, surfaced correctly by the loading-failure UI), and `SkinLoader.SkinParameter("ui/uiskin.atlas")` loads the existing skin cleanly. Verification: desktop via LWJGL3 run; Android via emulator with real `input tap`/`keyevent`; iOS via RoboVM AOT + `simctl`. OS screen recording and Accessibility are denied for this session's automation helper and `osascript` keystrokes are denied, so desktop/iOS visuals were verified with an in-app frame-capture aid (F12 + a property/env-gated auto-demo driving the real `navigateTo`/`submitMove` paths; `Screenshots`/`AutoDemo`, marked for removal in Phase 9) plus, on iOS, the simulator composite via DeviceHub. Android interaction used real injected touches (no automation workaround needed). Code review found and fixed: a per-activation `BitmapFont` leak in LoadingScreen and duplicated HUD label adds in DungeonScreen; `NO_PENDING_COMMAND` and an unused `WorldConfiguration.register` were removed. Battery re-run green after fixes (28/28 tests, Checkstyle clean, all compiles, Android duplicate-class check + debug APK).
- **2026-09-04 — iOS toolchain repairs and Xcode 27 launch procedure.** Two stale RoboVM force-link leftovers from the pre-reset scaffold broke `:ios:launchIPhoneSimulator` ("Root class ... not found"): `ios/src/main/resources/META-INF/robovm/ios/robovm.xml` (vis-ui patterns — file deleted; the module-level `ios/robovm.xml` already carries the real patterns) and the exact-class pattern `com.badlogic.gdx.controllers.IosControllerManager` in `ios/robovm.xml` (gdx-controllers was intentionally removed in Phase 0). After removal, RoboVM 2.3.23 AOT compile + link + signing succeeded on Xcode 27 beta (27A5194q) for the iOS 18.6 simulator runtime. RoboVM's final `open -a Simulator` step fails on Xcode 27 ("Unable to find application named 'Simulator'" — Simulator.app was replaced by DeviceHub.app); the documented workaround is `xcrun simctl install <UDID> ios/build/robovm.tmp/IOSLauncher.app` then `xcrun simctl launch <UDID> cloud.vinh.rebirthsaga` (optionally `SIMCTL_CHILD_*` env passthrough for debug flags; note `booted` is ambiguous when several simulators are up — pin the UDID). README's iOS section updated accordingly. Known presentation caveat (recorded, not a Phase 1 gate): `ScreenUtils.getFrameBufferPixmap` on the MetalANGLE backend returns an incomplete frame (early draw calls only), so in-app framebuffer captures are not reliable visual evidence on iOS — use the simulator composite (`xcrun simctl io <UDID> screenshot`) with DeviceHub running.

- **2026-09-02 — Jackson added for content-definition JSON (user decision).** `com.fasterxml.jackson.core:jackson-databind:2.22.2` + `jackson-annotations:2.22` (annotations version line has no patch component) pinned in `gradle.properties`, declared in `core` as `implementation`. Verified Java 8 bytecode before pinning (class file major 52) and Android debug packaging after. Role split recorded in game-plan sections 2/14/15: Jackson = versioned content definitions with strict default binding (unknown fields/enum values fail the load; dice notation like `"1d6+1"` stays a string at the boundary); LibGDX JSON remains the save-bundle codec (Phase 6). `JacksonContentBindingTest` (4 tests) pins the binding shape against the `rusted_sword` item example: field/enum binding, actionable unknown-field failure, unknown-enum rejection, serialize/restore round trip. Battery re-run green (`:core:check` 10/10, compiles, `:android:checkDebugDuplicateClasses`, `:android:assembleDebug`); lockfiles and verification metadata regenerated. Deferred deliberately: R8 keep rules for content DTO packages (no such package exists yet — required at the Android release/minify gate), and RoboVM reflection behavior for DTOs is covered by the Phase 1/6 iOS gates.
- **2026-09-02 — ECS framework swap to artemis-odb (user decision, same day as Phase 0).** Replaced `com.badlogicgames.ashley:ashley:1.7.4` with `net.onedaybeard.artemis:artemis-odb:2.3.0` (latest Maven Central release; the README's "2.4.0" is a snapshot-era claim, verified against repo1.maven.org). Documentation fetched with Firecrawl and cached under `.firecrawl/artemis-odb-*.md`; key contracts verified in the resolved source jar: no per-system priority field — the default `InvocationStrategy` runs systems in registration order and flushes entity-state updates to subscriptions before each system and after the last; the builder accepts one instance per system class; components are created reflectively and need public constructors; entity ids are `int`s, recycled after deletion. The Ashley smoke fixture was replaced by `ArtemisWorldStepTest` (registration order + aspect filtering; both framework contracts above caught by the first test run). Docs updated (every Ashley reference across game-plan sections 1–20, README, and this tracker). Lockfiles and `gradle/verification-metadata.xml` regenerated; full battery re-run green: `:core:check` 6/6, `:core:compileJava`, `:lwjgl3:compileJava`, `:android:checkDebugDuplicateClasses`, `:android:assembleDebug` (macOS arm64 host, wrapper 9.7.1, daemon JDK 21). Unmet prerequisite preserved: iOS AOT/simulator verification remains for Phase 1.
- **2026-09-02 — Phase 0 completed (dependency repair and build foundation).** Host: macOS arm64 (Darwin 27), Gradle wrapper 9.7.1, daemon JDK 21 per `gradle/gradle-daemon-jvm.properties`, Android SDK 36 via `local.properties`. Evidence sequence: (1) reproduced the audit blocker — `./gradlew :android:checkDebugDuplicateClasses` failed on `com.github.tommyettinger.jdkgdxds:build:2.1.8` vs `:jdkgdxds:2.1.8` (533 identical classes); (2) confirmed both artifacts' POMs declare the same deps (funderby 0.1.2, digital 0.10.2), so the root-build exclusion of the `:build` module drops no code — applied in root `build.gradle` for every subproject configuration; (3) reduced `core` to gdx 1.14.2 (`api`) + ashley, juniper, jdkgdxds, squidcore/grid/place/path (`implementation`), junit 4.13.2 (test); removed Box2D + lights + all their natives, gdx-controllers backends, and every deferred library from the scaffold; (4) moved `gdx-tools` to the `gdxTools` configuration with a `:lwjgl3:gdxToolsClasspath` task (verified absent from all runtime classpaths); (5) repositories: Maven Central + JitPack kept, `mavenLocal()` opt-in via `-Prebirth.enableMavenLocal=true`, snapshot repo removed; (6) lockfiles for all four modules + `gradle/verification-metadata.xml` (sha256) committed; (7) Java 8 API surface enforced with `--release 8` (probe: `List.of` rejected at compile); (8) 6 smoke tests under `core/src/test/.../smoke/` pinned the then-Ashley stack (superseded the same day by the artemis-odb swap note above, with the battery re-verified), AceRandom seed reproduction and five-word state restore, and jdkgdxds collection behavior — no Gdx.app/OpenGL/natives; (9) Checkstyle (hygiene + `ImportControl` game/ boundary, probe-verified) and `.github/workflows/ci.yml.backup` added; README rewritten with per-platform prerequisites and verification commands. Final battery all green: `:core:check`, `:core:compileJava`, `:lwjgl3:compileJava`, `:android:checkDebugDuplicateClasses`, `:android:assembleDebug`, `:lwjgl3:jar`. Dispositions: `vis-ui` and `gdx-controllers` intentionally removed (optional; no controller input implemented — re-add per feature); `digital`/`regexodus`/`crux`/`funderby` left transitive per game-plan section 2 guidance. iOS AOT/simulator build remains unverified by design — only the iOS dependency graph resolution was checked; iOS build evidence belongs to Phase 1.
- **2026-09-02 — Tracker reset:** All checkboxes cleared; the active focus returned to Phase 0. Prior completion logs, test totals, device/signing claims and implementation notes were removed because they describe the previous stack. This reset edits the tracker only; it does not implement any phase.
- **2026-09-02 — Current build blocker:** The game-plan audit recorded duplicate classes from `com.github.tommyettinger.jdkgdxds:build:2.1.8` and `com.github.tommyettinger.jdkgdxds:jdkgdxds:2.1.8`. Next action: repair/review the resolved graph, then repeat duplicate-class checking and Android assembly. Audit evidence is described in game-plan sections 2 and 20; no new build result is claimed by this tracker reset. *(Resolved same day — see Phase 0 completion note above.)*
- **2026-09-02 — Current source baseline:** Only the shared application/empty screen and platform launchers exist in Java. Content catalogs, gameplay systems, controllers, save codecs and phase tests must be implemented or inspected before any new completion claim.
