# Rebirth Dungeon Project Phases

This is the implementation queue for the Kotlin/LibGDX game described by [overview.md](overview.md). [game-plan.md](game-plan.md) owns architecture, [directory.md](directory.md) owns package placement, and the nine [gameplay specifications](gameplay/) own rules. This tracker orders their delivery and records implementation evidence. Reference-game mechanics and illustrative numbers are not automatically shipping requirements.

**Re-aligned 2026-09-07:** incorporate the walkable-town/menu-bar model, carried and banked gold, commerce, explicit recovery, and gathering; make dependencies and unresolved rule conflicts visible. Preserve the 17 phase numbers, completed Phases 0–1, and their historical evidence. Phase 2 remains the earliest unfinished phase. The September 5 five-dice/progression/title alignment remains in scope. This revision changes planning only; it neither implements features nor refreshes build/device evidence.

The [documentation audit](audit.md) supplies validation priorities, and [references.md](references.md) qualifies the design inspiration. They are dated review/research inputs, not overrides of subsequently updated specs. Resolve disagreements in the owning docs before implementing the affected rule; the town reconciliation gate below remains open until the architecture and gameplay contracts agree.

## Tracking Rules

- Complete the earliest unfinished phase by default; record user-directed priority changes and preserve unmet prerequisites.
- An unchecked box means work or verification remains; a checked box means implemented and verified against the current Kotlin architecture.
- Keep the overview phase unchecked until its tasks and exit criteria are complete. Existing scaffold files do not automatically satisfy a phase.
- Record the commands, target/device, result, and relevant file paths when verifying a task. Distinguish dependency resolution, compilation, packaging, simulator launch, physical-device testing, and release testing.
- Keep dated blockers and the next action in Work Notes. A missing device or credential is an unmet gate, not a successful check.
- Update the phase checklist, overview, Current Focus, and Completion Log together when finishing a phase.
- If a conditional feature is intentionally omitted, record its disposition and rationale against that item before closing it. Do not silently skip required behavior or introduce an optional library solely to complete a checkbox.
- Keep future-feature save/content shapes as design contracts; implement their DTOs, migrations and fixtures when a real consumer arrives. Do not make an earlier phase depend on scaffolding every later system.
- Add dependencies and folders only for a concrete feature. Use the Gradle wrapper, reviewed version pins, and documentation matching the selected library version.
- Verify rules and persistence as they are implemented. Later quality phases consolidate evidence; they do not postpone basic correctness checks.

## Current Focus

- **Current phase:** Phase 3 — Grid simulation, turns, and basic checkpoints.
- **Status:** Phase 2 completed and verified on 2026-09-07: strict starter catalog, immutable run inputs, stable IDs/events and restorable independent RNG streams. All 39 JVM tests, shared boundary checks, desktop compilation/demo and Android debug packaging pass; see Completion Log and [Phase 2 format/values](phase2-foundations.md).
- **Next objective:** Phase 3 authoritative grid/occupancy, bounded generation, path/FOV, deterministic turns and basic movement checkpoints. Preserve the Phase 2 pinned catalog/RNG contracts and keep full combat/progression/town features in their scheduled phases.
- **Planning gates:** starter recovery/exhaustion and encounter-versus-run completion before Phase 4; town architecture, gold reward capacity, outcome retention and recovery access before Phase 7. These do not block Phase 2 foundations.
- **Known blocker:** None for starting Phase 3. Phase 2 adds current desktop runtime and Android debug packaging evidence, but Android emulator/device interaction and full iOS AOT/simulator validation with the current sources/dependency set remain open. Earlier mobile launches, current packaging and cross-platform replay acceptance are distinct gates.
- **Repository state verified 2026-09-07 (documentation audit):** shared sources are Kotlin under `src/main/kotlin` (application spike, loading/prototype screens, Gdx-free `game/` slice); `RebirthDungeon` extends `KtxGame<KtxScreen>`; wrapper 9.5.1, daemon JVM 25, Kotlin 2.4.10, ktx `io.github.quillraven.libktx` 1.14.2-rc1. No phase claims change.

## Existing Architecture and Working Boundaries

| Location/owner | Responsibility and adoption |
| --- | --- |
| `core/src/main/kotlin/cloud/vinh/rebirthdungeon/` | Existing shared Kotlin root; adopt nested packages as features arrive |
| `RebirthDungeon.kt`, `bootstrap/` | Lifecycle, composition, workers, fresh screen instances and navigation |
| `application/run`, `application/profile`, `application/persistence` | Serialized run requests, committed profile/town transactions, repository contracts and one save writer |
| `game/` | Pure deterministic rules; one artemis-odb `World` per run plus non-component `RunSession`; `game/town` does not use dungeon initiative |
| `data/content`, `data/save` | Strict Jackson content DTOs/loaders constructing immutable game definitions; LibGDX JSON save codecs/repository |
| `presentation/screens`, `presentation/dungeon`, `presentation/town` | Screen composition and rendering of immutable observations |
| `presentation/hud`, `presentation/windows` | Shared status/menu bar and reusable Character, Skills, Quests, Inventory and service windows |
| `platform/`, `lwjgl3/`, `android/`, `ios/` | Shared native contracts and launcher-specific adapters; desktop remains the primary development target |
| `assets/`, `tools/`, test resources | Shipped content/art, offline tooling, and separate content/save/replay fixtures; runtime saves stay outside assets |

These are ownership targets, not claims that all packages or features exist. Keep one shared production source root and the existing Gradle modules. Combat owns skill execution; progression owns learning/ranks/training, talents and titles; inventory owns item identity and installed enchants. Application profile transactions compose these rules and publish town events only after durability. Observed projections must not expose hidden entities through full restore exports.

Shared code is Kotlin pinned to JVM 1.8 bytecode and the Java 8 API surface (`jvmTarget=1.8` + `-Xjdk-release=1.8`); the Gradle daemon criteria select Java 25. Follow the game plan's toolchain/dependency audit rather than equating the build JVM with supported application APIs.

Simulation code uses artemis-odb and project-owned algorithm interfaces, with SquidSquad/Juniper implementations behind adapters. It must not call `Gdx`, graphics/audio, Scene2D, file I/O, networking or provider SDKs. One logical command resolves synchronously on the render thread; only then are snapshots/events exported and external work requested. Worker results return via `Gdx.app.postRunnable(...)` and are checked against the current session token.

Keep live gameplay out of UI state and animation clocks. Use explicit constructor wiring and Kotlin service interfaces; one application-owned serialized save writer survives screen changes. Follow [directory.md](directory.md) and game-plan section 17 without scaffolding unused folders; keep content IDs independent of filenames and catalog loading order explicit.

## Phase Overview

- [x] Phase 0 — Dependency repair and build foundation
- [x] Phase 1 — Lifecycle, assets, and rendering integration
- [x] Phase 2 — Validated content and deterministic RNG
- [ ] Phase 3 — Grid simulation, turns, and basic checkpoints
- [ ] Phase 4 — Deterministic five-dice combat
- [ ] Phase 5 — Playable combat and resumable activations
- [ ] Phase 6 — Durable saves, migrations, and lifecycle recovery
- [ ] Phase 7 — Walkable town, inventory, and the progression loop
- [ ] Phase 8 — Rebirth, quests, enchanting, and town expansion
- [ ] Phase 9 — Role-playing missions and skill extensions
- [ ] Phase 10 — Dungeon depth and expanded encounters
- [ ] Phase 11 — Presentation polish, input, audio, and haptics
- [ ] Phase 12 — Offline quality, balance, and device acceptance
- [ ] Phase 13 — Local gacha simulator and reveal flow
- [ ] Phase 14 — Authentication, backend, and cloud synchronization
- [ ] Phase 15 — Verified purchases and production gacha
- [ ] Phase 16 — Release readiness and live operations

## Delivery Dependencies and Specification Coverage

Keep phase numbers stable for existing links and logs. Within Phase 7, deliver the following slices in order, verifying each before broadening content; the phase stays open until all its tasks and exits pass.

| Order | Deliverable | Prerequisites / source |
| --- | --- | --- |
| 2 → 3 | Validated starter content/RNG → movement and basic checkpoints | [battle](gameplay/battle.md), [game plan](game-plan.md) §§5–9, [directory](directory.md) §7 |
| 4 → 5 | Pure combat → playable, resumable battle | [battle](gameplay/battle.md), [stats](gameplay/stats.md); authored starter values, exhaustion policy and terminal scope |
| 6 | Durable save/profile transaction infrastructure | Existing movement/dice checkpoints; future feature fields arrive with their consumers |
| 7A | Reconcile town contracts; inventory/equipment and outcome policy | [towns](gameplay/towns.md), [inventory](gameplay/inventory.md), [directory](directory.md) §7; gold capacity and recovery-access decisions |
| 7B | One town, menu/windows, bank, shops, recovery, instructor services | 7A + Phase 6; safe traversal and atomic transactions before paid services |
| 7C | One retained result → XP/AP/training → rank-up → stronger next run | 7B; shared [skills](gameplay/skills.md)/[character](gameplay/character.md) rules and fixed run snapshots |
| 7D | All three learning routes, talents/aging, base titles, overflow escape | 7C; reachable content, clock policy, [titles](gameplay/titles.md); verify before closing Phase 7 |
| 8A | Rebirth preview and controlled end-to-end demonstration | Phase 7; eligibility/cost/cooldown decision; prove reset/preserve behavior before broader town content |
| 8B | Quest delivery/claims and expanded NPC integration | [quests](gameplay/quests.md); Phase 7 town/inventory; rebirth triggers only after 8A |
| 8C | Enchant application/burning and first gathering spot | [enchants](gameplay/enchants.md), [towns](gameplay/towns.md); recovery, materials, capacity, durable RNG/boundary counters |
| 9 → 10 | RP isolation and enabled skill extensions → dungeon depth | Quest/NPC templates; reaction/area/path/critical dependencies and explicit encounter/floor/run outcomes |
| 11 → 12 | Presentation polish → offline device acceptance | All required offline slices; no deferred feature silently enabled to fill a checklist |
| 13 → 16 | Development gacha → services/commerce → release | Offline game remains usable without these services |

**Town delivery:** Phase 7 provides the first map and Healer, Grocery, Blacksmith, General Store, Bank, Inn and School instructor pair, one small gold-bag tier, and dialogue shells with one Talk topic each. Phase 8 completes the first-town slice with graveyard-herb gathering and adds quest/rebirth/material-service NPCs as needed. Windmill/oven remain deferred station contracts until a cooking specification exists; further gathering types and a second town are later additive content. Touch presentation polish is Phase 11, but playable touch controls remain part of feature/platform acceptance.

**Town architecture gate (before 7A closes):** update the game plan's specification index, ownership, content catalog, save shape, validation and milestones to include towns, following directory §7. Reconcile gold rewards versus item overflow and recovery access in the owning specs. This tracker records placement, not a resolution of those conflicts; no town implementation is authorized to invent an implicit policy.

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

- [x] Define stable content/entity IDs, Kotlin command/result/event values, version conventions and immutable snapshot conventions without presentation or backend types.
- [x] Define project `RandomSource` interfaces and a Juniper `AceRandom` adapter with explicit seeds plus sequence-backed test doubles.
- [x] Derive independent generation, AI, combat/dice, loot and cosmetic streams with stable identifiers; keep cosmetic randomness outside authoritative replay state; commerce and initial deterministic gathering use no RNG. Reserve the profile-owned town-enchanting stream for Phase 8 and a separate development-gacha stream for Phase 13.
- [x] Capture and restore algorithm ID, state-format version and all five AceRandom state words losslessly; reject unknown algorithms or invalid state counts.
- [x] Define stable floor/attempt seed derivation from run seed, floor index, generator version and attempt number.
- [x] Add Jackson-bound JSON DTOs and immutable definitions under `game/content` with strict loaders/DTOs/validation under `data/content`, backed by `ContentRepository`; validation is explicit rather than assumed from JSON parsing (unknown fields/enum values already fail the Jackson binding; keep that strictness).
- [x] Add a minimal `assets/data` set for tiles, generation profiles, a hero/enemy, the five-dice combination/scoring table with per-skill/rank face-weight profiles, the starter sword skill at two illustrative ranks (fair and weighted), HP/MP/SP stat/cost definitions, statuses, the two starter potions, encounters, loot and progression curves. Defer the full skills, inventory/equipment, enchant, quest and title catalogs to their phases and banner/pity catalogs to Phase 13.
- [x] Validate required fields, versions, IDs, ranges, cross-references, six nonnegative face weights with a positive total per skill/rank, authored rank ordering, probability totals, acyclic stat derivation and progression curves with actionable file/field diagnostics. Add reachable-training/acquisition validation when those catalogs arrive; unsupported dependencies must not masquerade as usable content.
- [x] Separate visual asset references from rules and validate required atlas/animation IDs before starting a run.
- [x] Test seeded repeatability, full-state round trips, stream independence, malformed content and broken references in ordinary JVM tests. `JacksonContentBindingTest` already pins the content JSON binding shape (item definitions with dice-notation strings, enum rarities, tag arrays).

Exit criteria:

- [x] Every bundled definition validates, and malformed fixtures fail at the content boundary with useful diagnostics.
- [x] RNG restore continues the exact sequence, and cosmetic draws cannot change generation, combat, AI or loot outcomes.
- [x] A run can receive a pinned immutable catalog and RNG streams without loading graphics or platform services.

**Implementation evidence:** [Phase 2 foundations](phase2-foundations.md) records the format, provisional values, RNG algorithm/seed contract and feature deferrals. `data/content/ContentRepositoryTest` validates the actual bundled JSON, targeted malformed mutations, visual references and pinned run exports; `game/RandomSourceTest` verifies full-state/hex continuation, malformed states, stream independence, bounded sampling and a seed golden vector. Verification and remaining platform limits are in the Completion Log.

## Phase 3 — Grid Simulation, Turns, and Basic Checkpoints

**Goal:** Deliver a playable, reproducible floor with a basic reload path before scarce random rewards are introduced.

**Plan alignment:** Completes Milestone 1; game-plan sections 5–9, 11 and 14.

Tasks:

- [ ] Create one artemis-odb `World` plus `RunSession` per run, with stable IDs, position/player/AI/blocker/vision/health components and authoritative run/floor/counter state.
- [ ] Implement a y-up `DungeonGrid` with flattened `IntArray` tile IDs and an O(1) occupancy index; keep static floor/wall tiles out of the ECS.
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

- [ ] Author the starter skill IDs, two playable rank profiles, effects/costs/cooldowns and recovery/exhaustion rule before enabling combat. Test SP/MP depletion and legal continuation; town Inn rest does not by itself resolve in-dungeon exhaustion, and no free basic attack is implied.
- [ ] Define encounter participation and completion separately from floor objectives and run completion. An empty room/floor or the last hostile in one encounter must not automatically grant a whole expedition result; defeat takes precedence when terminal conditions coincide.
- [ ] Add `DiceHand` (five stable dice), `ResourcePools`, `Stats`, `AbilityLoadout`, `StatusSet`, `Shield` and `Cooldowns` alongside existing health/identity components; do not introduce a separate authoritative combat world.
- [ ] Implement the chosen contact contract: bumping a hostile opens a dice activation for the current player turn without movement or immediate damage.
- [ ] Implement pre-roll skill/target selection: validate the learned active skill, its rank snapshot, equipment legality, range/target, cooldown and combined SP/MP/HP affordability; selection, panel and target changes before the first roll are free and cannot reset anything after it.
- [ ] Implement `ROLL_DICE`: lock skill, rank, target, effective attack/mitigation inputs, cost vector and face-weight profile, reserve every required pool cost, and sample five dice independently in stable die order from the locked profile.
- [ ] Implement kept-die flags (no RNG, cost or initiative) and batch `REROLL_DICE`: atomically replace a chosen nonempty subset of unkept dice for one of two reroll actions under the same locked profile, keeping every replacement result; reject empty, pre-roll and exhausted-budget rerolls with no budget carry-over and no automatic attack at zero rerolls. `ASSIGN_DIE`, `UNASSIGN_DIE` and the old singular `REROLL_DIE` are removed from this mode's contract.
- [ ] Implement `USE_ABILITY` (deduct reserved costs once before effects, consume the whole hand, resolve the locked skill and end the activation exactly once) and `END_TURN` (free pass before rolling; after rolling pay reserved costs and discard the hand; no skill-use training). Keep `USE_ITEM` gated until minimal inventory consumption exists (Phase 5).
- [ ] Implement pure Kotlin scoring: pip total 5–30 and exactly one of the eight combination classes with the provisional multiplier table; no overlapping bonuses, four-die straights or wildcards.
- [ ] Implement the starter damage rule `B + A + K × P` with flat defense subtracted before the multiplier floor, clamped Protection resistance, shield absorbed last and HP clamped at zero; use exact rational/fixed-point arithmetic at the defined rounding boundaries and one shared resolver for previews and commitment.
- [ ] Enforce resource contracts: current/max/reserved HP/MP/SP, effective cost `max(1, ceil((rankCost + flat) × max(0, 1 + pct)))` per positive pool, all pools validated together before rolling, HP payment bypassing mitigation/shield while leaving at least 1 HP, and a skill never financing its own upfront cost.
- [ ] Resolve STR/INT/DEX/WIL/LUK and derived stats in dependency order (progression baseline → equipment/status modifiers → derived maxima/attack/defenses → direct derived modifiers) with additive flat/percent aggregation, explicit bounds/rounding and no refill when a maximum rises.
- [ ] Implement statuses with source IDs, stacking groups/priorities (refresh/replace rules), durations in affected-actor completed activations, periodic effects before expiry, stat recomputation/clamping and authored regeneration for living actors at eligible activation ends; nothing ticks at application and dice commands never tick or expire effects.
- [ ] Fill the dice 400, ability 500, damage 600 and status 700 pipeline slots; resolve status-generated damage before cleanup through the shared synchronous helpers.
- [ ] Implement deterministic enemy decisions through the same effect/damage helpers; remove dead actors from occupancy/initiative before selecting the next actor; finalize the player activation once even when the last hostile dies, evaluating defeat before encounter victory; only the application run policy may turn an eligible outcome into run completion.
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

- [ ] Complete the currently consumed project-owned JSON bundle for schema/rules/content/generator versions and revisions. Document its extension contract (implement fields/codecs/migrations with Phases 7–9, rather than empty future DTOs): the profile (hero/life identity, level/XP/cumulative level, AP, skills/objective counts, talent, current-life growth, starting age and processed aging intervals, inventory/equipment/bags/placements/locks, page records, carried/banked gold, gold-bag capacity definitions/instances, overflow, gathering respawn counters and durable reconciliation IDs, service operation results, installed enchant values, town pools, enchanting RNG and operation results, quests/stages/evidence/milestones, tracked quests and reward IDs, discovered/earned title IDs with acquisition source/outcome IDs, title evidence/counters, First/Second title selections, talent display and favorites); the run (generated map, entity DTOs, explored cells, counters, scheduler, full RNG states, the dice activation with locked skill/rank/target/profile, five stable dice, kept flags and reroll budget, pools/reservations, stat sources, effect timing, cooldowns, enabled skill-extension state, run inventory origins/reservations/consumption, quest snapshot/pending evidence, equipped base-title snapshot and pending title discovery/award evidence, pending XP/training/loot and the committed result ID); and the RP-mission section (attempt ID, isolated session state, outcome status) reserved for Phase 9.
- [ ] Implement explicit codecs and validation with LibGDX JSON utilities; exclude artemis-odb internals, transient intents, caches, textures and animation clocks.
- [ ] Finish alternating-slot writes with increasing revision, checksum, close/verification and newest-valid-slot recovery; retain the previous good slot after a torn write.
- [ ] Serialize saves through one application-owned writer and keep revision/callback ordering when coalescing. Never overwrite a newer save with an older queued result.
- [ ] Add typed operational failures and recoverable loading/save UI; reject unsupported future schemas without overwriting the original file.
- [ ] Add sequential schema migrations and fixtures for every shipped version; preserve rules/content compatibility or provide a deliberate migration/recovery policy. Content changes that shrink storage or alter progression thresholds must migrate so every item and record is preserved rather than recalculating shipped characters or deleting items that no longer fit.
- [ ] Implement pause checkpoints, bounded flush, resume reconstruction and stale-session callback guards; required saves continue to belong to the application across screen changes.
- [ ] Preserve the last stable floor if generation fails/is interrupted, and checkpoint before installing a new floor.
- [ ] Establish the combined profile/run/grant-ID transition used by Phase 7 so completion rewards cannot be independently saved twice; record town operation IDs (learning, pages, AP advancement, enchanting, coupon title unlocks, rebirth, bank, shop, heal/rest and gathering as enabled) with their inputs, outputs, results and RNG state atomically.
- [ ] Test corruption, torn slots, delayed/out-of-order requests, save failure/retry, migration, unsupported versions and interruption at dice/floor/reward boundaries; verify loads rebuild effective stats from saved sources without reapplying instant effects, re-awarding growth, refreshing statuses or duplicating reservations.
- [ ] Compare restored and uninterrupted runs on JVM, Android and RoboVM, including complete RNG continuation and initiative ties; verify actual device storage/lifecycle behavior.

Exit criteria:

- [ ] A failed or interrupted write leaves a valid recovery path, and an older save cannot supersede newer durable progress.
- [ ] Load/migration restores the complete logical run while rebuilding only derived state; future-version data is preserved.
- [ ] Resume and replay produce equivalent outcomes on the tested targets, with device evidence distinct from simulator evidence.

## Phase 7 — Walkable Town, Inventory, and the Progression Loop

**Goal:** Prepare in a safe walkable town, complete a dungeon, invest retained rewards in mastery, and start a measurably different next run. Deliver 7A–7D in the dependency order above.

**Plan alignment:** Completes Milestone 3; game-plan sections 14–16; [inventory.md](gameplay/inventory.md), [skills.md](gameplay/skills.md), [character.md](gameplay/character.md), [titles.md](gameplay/titles.md), [towns.md](gameplay/towns.md) §§2–8 and [directory.md](directory.md) §§4/7. Town prerequisites refine Milestone 3; architecture reconciliation remains required.

Tasks:

- [ ] Decide and record the victory/defeat/abandonment retention policy for brought gear/supplies, new loot, gold, XP, training, quest evidence and title evidence in Open Decisions before inventory-backed results ship.
- [ ] Close the town architecture/reward-capacity/recovery-access gate recorded above before implementing town transactions; settle starting gold/bag access, defeat arrival pools and retained-item policy alongside the outcome matrix.
- [ ] Build one authored, fully visible 16-pixel cardinal town map with no enemies, fog or dungeon turns. Validate map bounds, walkability, adjacent NPC service access and edge entrance links; start a run by interacting at its entrance. Keep town traversal rules in `game/town`, profile operations in `application/profile`, and presentation in `presentation/town`.
- [ ] Compose title/loading, town, dungeon and committed-results screens through the existing coordinator. Add a persistent HP/MP/SP, level/XP and carried-gold readout plus Character (C), Skills (Z), Quests (Q), Inventory (I) and Menu buttons. Reuse `presentation/windows` in town and dungeon; keep the Quests window explicitly unavailable until Phase 8. Controllers reject run-unavailable mutations even when requested outside the UI; inspection remains available.
- [ ] Add Healer, Grocery, Blacksmith, General Store, Bank, Inn and the School's melee/magic instructor pair, with adjacent interaction, short skippable greetings, one authored Talk topic each and direct service panels. Validate service/item/skill references; do not sell unusable placeholder goods as completed functionality.
- [ ] Implement two gold balances: nonnegative banked gold and aggregate carried gold capped by owned eligible gold bags. Begin with the small nonstackable gold bag; ordinary storage bags and capacity-granting gold bags are distinct. Validate bag removal against remaining capacity; reserve brought bags/gold and reconcile them at results. Bank deposits/withdrawals use exact chosen amounts, no fees/interest, and capacity checks; banked funds cannot pay remote shop costs.
- [ ] Implement RNG-free shops with authored buy/sell prices and initial infinite consumable/starter-gear stock. Spend carried gold only; reject locked/reserved items and nonempty bag sales; simulate consumed inputs, gold capacity and output rectangles before committing. Persist costs, goods and operation result once before display; retries return that result.
- [ ] Implement Healer HP recovery and Inn full HP/MP/SP rest to current maxima, using authored fees and the resolved broke-player access rule. Save pool changes/payment together; preview through the shared stat/resource rules. Test returning from defeat with zero carried gold and depleted pools without stranding the player.
- [ ] Validate town content and test adjacency, no dungeon initiative/RNG consumption, bank transfer conservation, no-bag/full-capacity cases, capacity-lowering bag removal, shop output failure, item locks and interrupted service retries.
- [ ] Implement the grid inventory: provisional 6 × 10 backpack, fixed rectangular footprints, stack keys with run provenance, one ordinary non-nesting bag, deterministic placement (saved bag-priority order, then backpack, scanned left-to-right/top-to-bottom), whole-transfer validation with explicit smaller-quantity partial pickup, gather/sort preserving counts/variants/locks/provenance with a failed sort retaining the old layout, and favorites as markers versus enforced item locks.
- [ ] Implement equipment slots (main/off hand, head, body, hands, feet, two accessories), two-handed off-hand reservation counted once, paired-sword identity/slot validation (Dual Wield Mastery and enabled dual-wield combat remain Phase 9), sword/shield support for shield skills, mutually exclusive body armor categories, atomic equip transactions validating every displaced item's destination, and effects only while equipped and eligible with no automatic drop or resource refill.
- [ ] First prove one retained run result supplying XP/AP and reachable training, explicit rank-up and a changed next-run snapshot; then implement the three learning routes: NPC instruction, complete-book reading (consumes one book on success; duplicates consume nothing) and page assembly (any order, no expiry, wrong/duplicate pages rejected without consumption); learning grants Rank F with 0 training and spends no AP. Author two playable ranks for each demonstration skill, available instructors/book/page sources, capped objectives able to reach 100 points and visible prototype caps; integrate Smash and Combat/Sword Mastery when their required content is ready.
- [ ] Implement training and advancement: at least 100 current-rank points plus authored AP per rank-up, capped objectives counted once per resolved outcome and reset on advancement, excess training discarded, AP unable to buy training or auto-advance, rank 1 terminal, passives training from eligible events under their own objective IDs, and a journal distinguishing training-complete/insufficient-AP/ready/max-rank states with visible prototype caps.
- [ ] Implement character progression: XP thresholds with multi-level crossing, 1 AP per earned level up to the content-defined cap (proposed 200) discarding overflow, cumulative level `1 + earned level-ups across all lives`, age/talent growth bundles stored with grant-time precision, initial Close Combat and Magic talents, and mastery derived for every talent from current skill ranks with no second AP payment and inactive-talent bonuses preserved.
- [ ] Implement aging: one year per seven elapsed real days reconciled once per interval at town/results boundaries including offline time, destination-age rewards (11–20: 5 AP plus authored growth; 21–25: 5 AP plus base growth; 26+: neither), idempotency against repeated menus and backward clock changes, a controllable test clock, and the recorded clock-trust decision.
- [ ] Implement titles per [titles.md](gameplay/titles.md): one collection per hero with Unknown → Known → Earned states and separate hint/award conditions, First/Second base slots plus a cosmetic talent display, town-only equip/swap with no cost or cooldown and no auto-equip on award, effects as removable modifier sources entering at the equipment/direct stat stages with benefits and penalties and no pool refill, and a character-screen Titles section with stat previews (including current-pool clamping), filters/favorites and a "Change titles in town" state during a run.
- [ ] Award titles from run achievements, committed character milestones (level-up, age-up, cumulative; rebirth awards join in Phase 8) and town coupon consumption only; snapshot the equipped base titles into each new run as fixed for its duration; evaluate award conditions at the outcome boundary from committed facts under the retention decision; process multiple qualifying awards in stable title-ID order where duplicate awards are no-ops.
- [ ] Copy a validated loadout and provisions into a new run with exact origin reservations (including bag contents as one contained hierarchy); account/menu changes cannot silently mutate an active character; in-run layout commands cost no initiative and are unavailable while dice are locked.
- [ ] Implement world pickup as one full action with quantity/fit validation; failed pickups stay on the ground without a turn or loot reroll; implement validated currency/cost/grant operations rejecting negative, duplicate, unaffordable or invalid inventory/equipment operations, with outputs placed only after simulated input consumption.
- [ ] Implement withdraw-only saved reward overflow for grants that do not fit, accepting only authoritative item grants and reconciliation returns, unusable until withdrawn, and required to be cleared before a new run or optional reward activity while preserving already-earned results.
- [ ] Provide a tested overflow-clearing path through legal inventory management, withdrawal and selling/destruction (with item/quantity confirmation and lock checks). Banking and essential recovery must remain reachable under the resolved gate policy. Exercise full inventory, locked items, ordinary bags and gold bags together; never discard an earned result to unblock the next run.
- [ ] Implement dungeon gold pickup into carried capacity with an explicit partial amount and an unchanged world remainder on failure. Settle its action/interaction semantics with ordinary pickup before enabling it; do not infer a free pickup from automatic routing. Apply the chosen gold loss percentage once at defeat, with banked gold untouched, and preserve pending results under the resolved capacity policy.
- [ ] Commit run completion in one save-bundle transition: reconciled brought-item consumption/returns and released reservations, retained loot/XP/training (and quest evidence once quests exist), saved overflow, updated profile and grant ID; apply retained XP with run-start age/talent, then training, then elapsed aging; show results only from the committed outcome.
- [ ] Implement start, continue, abandon, defeat, complete and return flows, including loading/empty/error/save-recovery states, and add repeat-completion/retry/load tests proving a result is granted once and the next run receives the intended progression/loadout.

Exit criteria:

- [ ] The player can select a hero and loadout, explore/fight, finish or lose a run, receive the defined progression, learn/advance skills through all three routes, manage grid inventory/equipment and start again.
- [ ] Restart/retry at results or town operation boundaries cannot double-grant loot, XP, AP, training or currency, or restore consumed supplies.
- [ ] Titles can be earned, equipped and previewed in town and survive save/load (rebirth preservation is verified in Phase 8), apply only while equipped, and never alter an active run's stats mid-run.
- [ ] Town traversal, shared menu gating, bank/shop/recovery transactions and an overflow-clearing route work through real controls; no save retry duplicates gold/items or recovery, and a depleted/broke return can continue under the authored policy.
- [ ] The offline loop requires no authentication, purchase or gacha service.

## Phase 8 — Rebirth, Quests, Enchanting, and Town Expansion

**Goal:** Prove mastery across a new life, then expand the durable town loop with quests, enchanting and the first gathering activity. Follow 8A–8C above; all remain required before phase closure.

**Plan alignment:** Begins Milestone 4; game-plan sections 15–16; [character.md](gameplay/character.md), [quests.md](gameplay/quests.md), [enchants.md](gameplay/enchants.md) and [towns.md](gameplay/towns.md) §§4/9–12.

Tasks:

- [ ] Settle rebirth eligibility/cost/cooldown in Open Decisions, then implement town rebirth: preview and atomically reset current level/XP, starting age, talent and life growth while preserving cumulative level, learned ranks/training, unspent AP, mastery, committed items/pages/enchants, quests and claimed rewards; settle run results and aging first and move newly illegal equipment into storage/overflow.
- [ ] Record the qualifying rebirth event's life ID and talent for rebirth-gated quest delivery, and snapshot the resulting progression/loadout for the next run.
- [ ] Record a before/after rebirth fixture showing reset level/XP/life growth, retained skills/AP/mastery/items/base-title collection and selections, recomputed eligibility, and no duplicate AP or extra cumulative level. Measure early-life XP/AP pacing with provisional eligibility before expanding content; extend this fixture to quest and enchant preservation when 8B/8C land.
- [ ] Add Chief's House quest offers/rebirth ceremony and the quest board as their services arrive; bind NPC dialogue offers and claims to the shared Quests window. Author quest stages around town result boundaries so newly activated objectives never depend on already-consumed run events.
- [ ] Implement quest state (Locked → Available/Active → Ready to complete → Completed), Chapters/Generations with explicit prerequisites, eligibility separate from automatic versus NPC delivery, authored-order rank comparisons, one completion per hero with no expiry, non-abandonable mainstream quests and authored sidequest abandonment preserving committed delivery checkpoints.
- [ ] Deliver the first quest slice: one short Chapter/Generation story chain, one NPC sidequest, one automatic rank-milestone Skill Quest and one NPC-offered skill-unlock quest, with journal tabs (Chapter-named storylines containing Generations, plus Sidequests and Skills with an RP badge), a tracker, and explicit Complete/final-NPC-dialogue claims.
- [ ] Implement objectives and evidence: stable objective IDs, ordered stages, capped/deduplicated evidence from dialogue, interaction, defeats, skill outcomes, acquisition/delivery and mission success; event objectives count only after stage activation; item requirements recheck legal current inventory; hand-ins consume items and checkpoint objectives together; triggers process after the initiating transaction in stable quest-ID order with idempotent catch-up after load.
- [ ] Implement atomic quest claims: revalidate final objectives and hand-in costs, consume items, grant XP/AP/items/Rank F skill unlocks and quest-awarded titles (slot-typed definitions whose hint/award predicates resolve to authored quests, encounters, stats and coupons), record the completion ID and unlock successors; route full-backpack grants into saved reward overflow without regranting XP/AP; a quest skill reward grants only an unknown Rank F and completes without refund when already known.
- [ ] Add the instructor-taught Enchant skill using the shared training/AP progression (at least two playable ranks) plus scroll, powder and enchant-definition catalogs with slot/rank/condition tables and authored rank ordering.
- [ ] Implement town-only enchant application: one prefix and one suffix per eligible item, replacement only on success, the Rank 5–1 scroll gate at Enchant skill Rank 5+, conditional clauses reading progression snapshots, variable values rolled once on installation and persisted, effects feeding the equipment stat stage once with independent penalties staying active, and the basis-point chance resolver with the 90% cap under Protect Equipment (failure consumes scroll, powder and MP while preserving the item and both enchants).
- [ ] Reuse Phase 7 town pools and Inn recovery as a prerequisite for enchant operations. Provide reachable scroll/powder/herb/holy-water sources through authored loot and town services (including the Church when burning needs it); validate training reachability and prices rather than enabling an unusable service.
- [ ] Implement enchant burning as a separate destructive operation: consume the item, materials and MP regardless of recovery; independent prefix-then-suffix recovery checks on the dedicated enchanting RNG; reserved output capacity for the maximum possible recovered scrolls before spending or drawing; recovered scrolls retain definitions, not old rolled values.
- [ ] Persist enchant operations atomically — costs, equipment/output changes, training, operation ID and the dedicated enchanting RNG state — before revealing; retry returns the recorded result; previews consume no RNG.
- [ ] Test quest delivery/deduplication/catch-up, enchant chance boundaries, failure preservation, persistent rolled values, burn recovery and output capacity, rebirth preservation, quest-awarded title grants without duplicates or consumed coupons on retry, and interrupted save/retry without duplicate grants, charges or rolls.
- [ ] Complete the first town slice with one graveyard-herb gathering type: deterministic yields, legal output capacity and required-tool/input checks, saved spot cooldown counters reconciled at town-entry/results boundaries, and an exactly-once operation ID. Define the cooldown-count unit and boundary identity before implementation; menus, re-entry and reload must not reset depletion or manufacture yields.
- [ ] Record deferred town content explicitly: further gathering types, higher gold-bag tiers, finite stock and second-town data wait for authored values; Windmill/oven keep only documented station contracts until cooking/recipes/food effects have a specification. Do not scaffold unused station code or treat cooking as a closed requirement.
- [ ] Test gathering capacity and cooldown boundaries, bank/shop/recovery interaction with quest rewards and overflow, and persistence through interruption and rebirth.

Exit criteria:

- [ ] Saved quests, enchant application/protected failure/burning and rebirth operate in the town loop with exactly-once claims and operations.
- [ ] Quest, enchant and rebirth triggers cannot double-deliver, double-grant, double-charge or reroll persisted values, including after reload, retry or interruption.
- [ ] Rebirth preserves the defined progression, possessions and titles and cannot bypass unfinished-run result or aging rules; its reset/preserve fixture and provisional pacing evidence are recorded.
- [ ] The first town includes repeatable safe gathering with durable depletion/reconciliation; unavailable cooking and later amenities have recorded dispositions.

## Phase 9 — Role-Playing Missions and Skill Extensions

**Goal:** Add the isolated RP mission mode and stage the remaining combat skill catalog behind their authored dependencies.

**Plan alignment:** Milestone 4; game-plan section 16; [quests.md](gameplay/quests.md) section 7, the [skills.md](gameplay/skills.md) combat catalog and [titles.md](gameplay/titles.md) sections 2 and 5.

Tasks:

- [ ] Implement the RP mission mode: a town-started, isolated session (scenario/NPC template versions, attempt ID, fixed stats/skills/gear/supplies, map, objectives, outcome) requiring no other active run, using the normal movement and five-dice rules through the NPC's authored abilities while the hero profile remains untouched.
- [ ] Enforce RP boundaries: no hero XP/training/loot by default, borrowed items/skills never leak to the hero, town progression/rebirth/equipment export disabled during the mission, and only the recorded scenario outcome advances its eligible quest.
- [ ] Implement the RP lifecycle: success saves the outcome once and returns to town; failure/exit leaves the quest retryable at its authored checkpoint; retry creates a fresh attempt; loading resumes the same suspended attempt (HP, supplies, dice, objectives); app closure is neither failure nor reset.
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
- [ ] Expand the Phase 5 in-run consumable implementation only through the explicit pre-roll full-action command with content-defined costs and validation; equipment changes remain town/loadout operations.
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

- [ ] Consolidate town traversal/menu gating, bank/carried-gold conservation, bag capacity/loss, shop/recovery retry, broke-player recovery, overflow escape and gathering-boundary coverage alongside rule/adapter/controller/save coverage for system registration order, structural changes, coordinate translation, occupancy, FOV, initiative, combat, titles (discovery/award/equip) and canonical replay.
- [ ] Run complete start-to-result, save/resume, floor-change, defeat/abandon and repeat-run checks against actual backends.
- [ ] Use seeded simulations to measure generation validity, encounter difficulty, progression pacing, loot and five-dice distributions against documented targets. Compare keep/reroll strategies and full turns-to-defeat distributions across rank, equipment, titles and enchants; measure runs to first rank-up and AP per play time across repeated lives, not only average pips.
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

**Goal:** Add production services through Kotlin interfaces and platform adapters without changing deterministic rules.

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

These milestone names follow game-plan section 19; town placement refines Milestones 3–4 and must be reflected there when the town architecture gate closes. Each requires its listed phases and all earlier prerequisites; later quality work does not replace per-phase verification.

| Game-plan milestone                          | Required phases | Outcome                                                                     |
|----------------------------------------------|-----------------|-----------------------------------------------------------------------------|
| 0 — Repair and prove the dependency baseline | 0–1             | Repaired dependency graph and visible lifecycle-safe screen on each backend |
| 1 — Playable dungeon movement                | 2–3             | Validated content/RNG, deterministic movement/turns/FOV and basic reload    |
| 2 — Five-dice encounter, resources, and resumable activation | 4–5 | Playable five-dice battle with locked inputs, reserved costs, statuses and activations preserved across interruption |
| 3 — Durable run, inventory, and progression loop | 6–7         | Robust saves, a walkable service town/bank/recovery, grid inventory and a repeatable progression loop with exactly-once results |
| 4 — Town systems, quests, and dungeon depth   | 8–12            | Rebirth, quests, enchanting, first gathering, RP missions, staged skills, expanded content and measured device acceptance |
| 5 — Production services and delivery         | 13–16           | Gacha/service integration, verified commerce and releasable distributions   |

## Settled Contracts and Provisional Defaults

| Decision             | Baseline to implement                                                                          |
|----------------------|------------------------------------------------------------------------------------------------|
| Source compatibility | Kotlin shared code on JVM 1.8 bytecode/API surface; build JVM selection remains separate |
| Simulation authority | One artemis-odb `World` and `RunSession` per run                                               |
| Initial algorithms   | SquidSquad `DungeonProcessor`, `DijkstraMap`/Manhattan movement, `FOV.reuseFOV`/diamond radius |
| Town/menu            | Safe, fully visible cardinal town traversal consumes no dungeon turns; adjacent service interaction and physical dungeon entrances; shared windows retain run mutation gates |
| Gold/recovery        | Carried gold is bag-capped; banked gold is separate and safe; shops spend carried gold; Healer fills HP and Inn fills HP/MP/SP to current maxima. Fees, loss percentage, reward-capacity reconciliation and broke-player access remain open |
| RNG                  | Explicit Juniper AceRandom streams; persist all state words and algorithm/version IDs          |
| Initiative           | Project queue with logical ticks and stable tie-breaks; initial activation cost 100            |
| Contact combat       | Bump starts the current player's dice activation without movement or immediate damage          |
| Dice activation      | Exactly five d6 power one selected active skill; skill/target/inputs lock at the first roll; one initial roll plus an authored reroll budget (provisionally two); whole-hand commit or paid pass |
| Combat resources     | HP/MP/SP tracked as current/max/reserved; positive authored costs; nonlethal HP payments; activation-boundary durations and regeneration |
| Run inventory        | Hero-owned run snapshot with origin reservations; town inventory mutation unavailable during a run; withdraw-only saved reward overflow |
| In-run equipment     | Equip/unequip are town/loadout operations in the initial battle design; in-run consumable use is a gated pre-roll full action |
| Titles               | Per-hero collection; First/Second base slots equipped town-only; effects as removable stat-modifier sources; talent display cosmetic; vanity and Master Titles deferred |
| Save format          | Project-owned versioned JSON profile/run bundle in alternating slots                           |
| Presentation         | SpriteBatch world, Scene2D HUD/menus, animations of committed events                           |
| Initial layout       | Landscape and 16-pixel tiles; logical resolution/scaling resolved 2026-09-04 as `ExtendViewport` 320 × 180 minimum with a separate UI viewport (see the resolved decision below). Broader physical-device coverage stays open for Phase 12 |
| Production grants    | Server-authoritative purchases/gacha, idempotent results before reveals                        |

## Open Decisions

Numbers in the specs (including two rerolls, inventory dimensions, level/age rewards, prices and loss percentages) are provisional authored defaults. Resolve these decisions when their phase needs them. Do not reopen the settled contracts above merely because the old tracker listed them as undecided.

| Decision                                                             | Needed by | Status              | Resolution/evidence                                                                                                                                                                                                                                                                                                                                                                                                     |
|----------------------------------------------------------------------|-----------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Duplicate-artifact repair and reviewed minimal dependency graph      | Phase 0   | Resolved 2026-09-02 | Narrow exclusion of `com.github.tommyettinger.jdkgdxds:build` in root `build.gradle` (all subproject configurations); retained `:jdkgdxds` module with identical transitive deps. Runtime reduced to gdx 1.14.2, artemis-odb 2.3.0 (replacing ashley 1.7.4 same day), squidcore/grid/place/path 4.0.12, jdkgdxds 2.1.8, juniper 0.10.5. README "Dependencies"; `*/gradle.lockfile`; `gradle/verification-metadata.xml`. |
| Test/check tooling and CI setup                                      | Phase 0   | Resolved 2026-09-02 | JUnit 4.13.2 pinned for `:core:test` (plain JVM, no Gdx.app/OpenGL); Checkstyle 10.20.2 with `config/checkstyle/` (formatting hygiene + `ImportControl` banning `com.badlogic.gdx` under `game/`); `--release 8` guards the Java 8 API surface. `.github/workflows/ci.yml.backup` runs shared tests/checks, desktop compile and Android packaging; iOS verification documented as manual macOS-host steps in README.           |
| Logical world resolution/scaling and initial test-device matrix      | Phase 1   | Resolved 2026-09-04 | World: `ExtendViewport` with 320x180 logical minimum (20x11.25 tiles at 16px, y-up camera clamped to the floor rect; 960x540 desktop window scales 3x integer). UI: separate `ScreenViewport` `Stage` (1 unit = 1 pixel), HUD padded by `Graphics.getSafeInset*`. Verified on desktop 960x540, Android `Medium_Phone` AVD (2400x1080 landscape), iPhone 16 Pro simulator (iOS 18.6). Broader physical-device matrix stays open for Phase 12. |
| Starter content identities and scope | Phase 2 schema; Phase 4 values; Phase 7 acquisition | Open | Assign stable skill IDs; distinguish illustrative sword/Guard/spell names from authored Smash/masteries. Use two supported ranks per demonstration skill, reachable training/page sources and visible caps; no full catalog required in Phase 2. |
| Dungeon resource exhaustion and recovery | Phase 4 | Open | Town recovery mechanism is settled; define depleted-SP/MP continuation and exploration waiting/regen behavior without silently allowing free attacks. |
| Encounter, floor and run completion | Phase 4; extend Phase 10 | Open | Define hostile participation/objectives and which outcome ends an encounter versus grants run results; empty exploration and simultaneous defeat need explicit tests. |
| Town architecture reconciliation | Before Phase 7A closes | Open | Align game-plan index/ownership/save/content/validation/milestones with towns and directory §7. This tracker places the work; it does not close that prerequisite. |
| Gold capacity at reward/result boundaries | Phase 7; quest claims Phase 8 | Open | towns rejects over-capacity gold rewards; inventory protects earned item grants with overflow and quests keep invalid claims available. Specify pending gold/result handling, bag eligibility/ownership scope and no-bag cases without silently banking rewards, discarding earnings or treating item overflow as a gold wallet. |
| Town recovery access, fees and initial economy | Phase 7 | Open | Healer HP and Inn full-pool recovery are settled. Author fees, initial gold/bag access, defeat arrival resources and a continuation route with zero gold/full overflow; no free recovery policy is assumed. |
| Town content, commerce and gold pickup | Phase 7 | Open | Author first map, service catalogs, bag prices/capacities and sell fraction; settle dungeon gold pickup action timing versus automatic capacity routing and explicit partial quantities. |
| Gathering reconciliation and cooking | Phase 8 | Open | Define cooldown-count units and deduplicated town-entry/results boundaries, yields and output-capacity behavior. Cooking stays deferred pending its own specification; more gathering/second town are later content. |
| Resource limits: map size, automatic actions and presentation queues | Phase 3   | Open                | Bound before enabling untrusted/generated content sizes                                 |
| Starter combat balance: reroll count, multipliers, damage scaling, skill costs/cooldowns and rank probability tables | Phase 4 | Open | **Fixed command semantics; provisional numeric budget.** Activation commands and flow (one initial roll plus two batch `REROLL_DICE` subset rerolls, whole-hand commit or paid pass) are settled contracts; the numeric reroll allowance and all other values from battle.md/stats.md ship as authored balance content, not inferred Dicero formulas |
| Skills/AP/title-collection ownership (hero vs account) and XP/AP economy targets | Phase 7 | Open | Specifications propose individual-hero ownership; settle before town progression ships |
| Victory/defeat/abandonment retention for gear, supplies, loot, XP, training, quest and title evidence | Phase 7 | Open | One matrix must cover carried/banked gold, brought/consumed/remaining supplies, new rewards and evidence, and suspension versus abandonment. towns proposes floor(30% carried gold) on defeat with banked gold safe, but its out-of-scope item/XP-loss wording does not settle inventory/character retention. Reconcile in owning specs before results ship |
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
./gradlew :core:compileKotlin :lwjgl3:compileKotlin
./gradlew :core:test
./gradlew :core:check          # tests plus simulation-boundary and source-hygiene checks
./gradlew :android:checkDebugDuplicateClasses :android:assembleDebug
./gradlew :lwjgl3:run
./gradlew :ios:compileKotlin   # compile-only gate; full AOT is the manual macOS step below
./gradlew :ios:launchIPhoneSimulator
```

A `NO-SOURCE` test task does not satisfy the test gate. A dependency report or successful compile does not establish native launch, device performance, accessibility, signing or release compatibility. Use the platform's documented release tasks and real target devices when a phase requires that evidence.

## Completion Log

Phases 0–2 are complete as recorded below; their numbers were not changed by the 2026-09-05 realignment. Add a row only after all phase tasks and exits are verified; include the date, target and exact evidence.

| Phase                                      | Completed date | Verified by                                                  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|--------------------------------------------|----------------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0 — Dependency repair and build foundation | 2026-09-02     | Local Gradle wrapper 9.7.1 (daemon JDK 21), macOS arm64 host | `:android:checkDebugDuplicateClasses` FAILED before repair, PASS after; `:core:check` = 6/6 tests + Checkstyle clean; `:core:compileJava :lwjgl3:compileJava :android:assembleDebug` pass (`android/build/outputs/apk/debug/android-debug.apk`); dependency reports for core/lwjgl3/android/ios resolve with no `FAILED`; lockfiles x4 + `gradle/verification-metadata.xml` (sha256). Repaired graph and rationale in README "Dependencies"; reports cached in `.firecrawl/phase0-logs/`. |
| 1 — Lifecycle, assets, and rendering integration | 2026-09-04 | Local Gradle wrapper 9.7.1 (daemon JDK 25 via mise temurin-25.0.4), macOS arm64 host; Android emulator; iOS simulator | Battery green after review fixes: `:core:check` 28/28 tests + Checkstyle clean (`SquidDungeonGeneratorTest` seeded reproducibility/no-transposition/detachment, `DungeonSimulationTest` one-process-per-command + rejection immutability + idle frames step nothing, `SessionWorkerTest` stale-session rejection, plus prior smoke tests); `:core:compileJava :lwjgl3:compileJava :ios:compileJava :android:checkDebugDuplicateClasses :android:assembleDebug` pass. Desktop (LWJGL3, macOS arm64, 960x540): menu/dungeon/menu/dungeon transition loop with accepted move, wall-rejection status text, and clean exit — in-app frame captures (F12/auto-demo, `assets/screenshots/`, gitignored). Android: `Medium_Phone` AVD, APK `android-debug.apk`, real `input tap` on Enter Dungeon and D-pad (Stage consumed the tap; wall-reject surfaced "Blocked." with Steps 0), DPAD keyevents advanced Steps 1→2, HOME pause + resume restored the dungeon render. iOS: RoboVM 2.3.23 AOT/link succeeded (`IOSLauncher.app` signed) for iPhone 16 Pro simulator (iOS 18.6, Xcode 27 beta) after removing stale force-link leftovers; app installed/launched via `simctl`, full demo loop (2x menu⇄dungeon, moves, rejection status) ran with clean exit; menu and dungeon (room, player, HUD, "Blocked." status) captured via the simulator composite. |
| 2 — Validated content and deterministic RNG | 2026-09-07 | Gradle wrapper 9.5.1, daemon JVM 25, macOS arm64; ordinary JVM tests; desktop LWJGL3; Android debug packaging | `./gradlew :core:check :lwjgl3:compileKotlin :android:checkDebugDuplicateClasses :android:assembleDebug` PASS, 39/39 JVM tests, no simulation-boundary/format violations. Test XML/HTML: `core/build/test-results/test/`, `core/build/reports/tests/test/index.html`; APK: `android/build/outputs/apk/debug/android-debug.apk`. `REBIRTH_AUTODEMO=1 ./gradlew :lwjgl3:run --console=plain` PASS, clean exit after two menu/dungeon entries and movement; visually inspected `assets/screenshots/rebirth-menu-1788844286263.png` (content v1, F/E cap E) and `rebirth-dungeon-final-1788844288882.png` (rendered floor/actor, Steps 3). Bundled `assets/data/{manifest,starter,visuals}.json` validates before run entry. No new dependencies. No Android runtime, iOS AOT/runtime or cross-platform replay claim. |

## Work Notes

- **2026-09-07 — Phase 2 implemented and verified.** Added namespaced content and run-local entity IDs, immutable command/result/movement event and observation values, a pinned `RunSession`, `RandomSource`/Juniper adapter, exact five-word and hexadecimal RNG restore, fixed stream domains and versioned floor-attempt seed derivation. Added strict Jackson DTO/repository validation and detached rules catalogs with separate visual bindings; the existing loading failure path gates entry and the renderer consumes validated frame references. Starter data supplies the requested world/actor/dice/sword/stat/status/potion/encounter/loot/progression examples; the menu shows prototype ranks F/E and cap E. See [phase2-foundations.md](phase2-foundations.md) for provisional values, reserved enchanting/gacha tags, schema/version conventions and explicit later-feature dispositions. Tests mutate the real bundled catalog to exercise malformed input and cross-references, without graphics startup. Completion evidence above covers 39 tests, desktop runtime and Android packaging. Next: Phase 3; automatic generation retries/reachability, authoritative actors/turns and checkpoints remain unimplemented. Existing mobile runtime gaps and gameplay decision gates remain open.

- **2026-09-07 — Tracker reworked against updated docs (planning only).** Preserved Phase 2 focus, all 17 phase numbers, completed Phases 0–1 and historical evidence. Added source/ownership guidance from overview, directory and nine gameplay specs; ordered Phase 7A–D around town/inventory → services → one rank-up/next-run proof → broader acquisition/titles/aging, and Phase 8A–C around rebirth proof → quests → enchanting/gathering. Placed walkable town, shared menu/windows, carried/banked gold, shops and Healer/Inn in Phase 7; first gathering plus Chief/quest/material services in Phase 8; cooking remains deferred pending a spec. Added prerequisite decisions for town architecture reconciliation, gold rewards versus capacity, broke-player recovery, gold pickup timing, gathering counters, starter exhaustion and encounter/floor/run completion. Future save fields arrive with consuming features; Phase 7 no longer requires proving Phase 8 rebirth. Corrected Current Focus to recognize the later September 6 desktop auto-demo while preserving open mobile runtime gaps. Historical Java commands, dependency changes and runtime gaps remain historical; no builds, gameplay implementation or new phase completion are claimed. Verification for this edit: `git diff --check`, local Markdown target validation and phase/checkbox/history consistency checks; only `docs/project-phases.md` changed by this task. Next: Phase 2 foundations; close rule gates before their consuming phases.

- **2026-09-06 — KTX usage deepened in main sources (user-directed sweep over the dependency set).** `RebirthDungeon` now extends `ktx.app.KtxGame<KtxScreen>` (was `Game`): `navigateTo` keeps the dispose-on-navigate contract exactly (hide previous → swap the inherited protected `currentScreen` slot → show/resize new → dispose previous) while the class-keyed registry stays unused — fresh single-activation instances are handed in directly, and `dispose()` explicitly hides+disposes the current screen (KtxGame's own dispose only covers its registry). This forced one scoped policy change: **ktx-app is now `api`** because a public supertype must be on consumers' compile classpaths — with it as `implementation`, launcher compilation failed ("RebirthDungeon is not an ApplicationListener"); everything else stays implementation. `ktx.assets.disposeSafely` adopted in LoadingScreen/DungeonScreen disposal and `Screenshots.capture` — where it fixes a real leak (a throwing `Pixmap.dispose` previously skipped the second pixmap's release). Investigated and deliberately NOT adopted, with rationale: `ktx.assets.toInternalFile` (diagnostics/screenshot writes use *local* storage — internal is read-only APK content and would break them), `ktx.async.KtxAsync` (coroutine dispatch conflicts with the deterministic render-thread contract and the SessionWorker design, game-plan §4), ktx-math/collections/inject/json/preferences/i18n/reflect/tiled/vis*/box2d/freetype*/ai (no usage site yet — they are staged for upcoming phases; no fabricated usage). Evidence: `:core:check` 28/28 + boundary, `--dependency-verification strict` battery (desktop/iOS compiles, Android duplicate-class + assembleDebug, fat jar) green, and the desktop auto-demo (`REBIRTH_AUTODEMO=1 :lwjgl3:run`) exercised the new coordinator end-to-end: two full LoadingScreen activations (assets-ready logged ×2), menu⇄dungeon ×2, accepted/rejected moves, 11 frame captures, clean exit, final frame visually verified (HUD + Steps 2 after the demo's two accepted moves).
- **2026-09-06 — Full gdx-liftoff Kotlin + KTX dependency set adopted (user-directed; reverses the Phase 0 deferrals for these libraries).** Every library from a current liftoff "Kotlin + ktx" setup is now declared in `core` (implementation scope, per the only-gdx-is-api rule), with release versions resolved from Maven Central/JitPack metadata and pinned in `gradle.properties`: gdx-ai 1.8.2, gdx-box2d/freetype @ gdx 1.14.2, gdx-controllers 2.2.4 (core + desktop/android/ios backends, natives wired per launcher — desktop `-platform:natives-desktop` jars, android `-platform:natives-<abi>` through the `natives` config + `copyAndroidNatives`, iOS via `gdx-platform:natives-ios` and `gdx-controllers-ios`), box2dlights box2dlights-1.5, blade-ink 1.3.2, spine-libgdx 4.3.5, vis-ui 1.5.9, anim8-gdx 0.7.0, typing-label 1.0.6, libgdx-utils 0.13.7 (Maven Central — it moved off JitPack), sjInGameConsole 7bfba295f9 (commit build only — no tagged releases exist), squidlib/-util/-extra 3.0.6, the FULL SquidSquad set at 4.0.12 (press/seek/smooth/store×4/text/wrath×3 added), digital 0.10.3, crux 0.1.3, funderby 0.1.2, gand 0.3.7, gdcrux 0.1.2, regexodus 0.1.21, jdkgdxds_interop 2.1.9.0, kotlinx-coroutines 1.11.0. KTX migrated to the `io.github.quillraven.libktx` group at **1.14.2-rc1** — built against this project's exact pins (gdx 1.14.2 / artemis-odb 2.3.0 / kotlin-stdlib 2.4.10), removing the gdx-baseline mismatch from the first adoption. Accepted transitive bumps from the new set (declared pins updated to match resolution): jdkgdxds 2.1.8→2.1.9, juniper 0.10.5→0.10.6, digital 0.10.2→0.10.3. ONE EXCLUSION: `org.apache.fory:fory-core` + the `com.github.tommyettinger.tantrum` modules — Fory requires Android API 26+ (bytecode invokedynamic D8 cannot process at minSdk 21; verified empirically against fory 1.7.1/1.6.1/1.5.0 + tantrum 1.7.1.0/1.6.1.1/1.5.0.1, all failing `mergeExtDexDebug` identically, and https://fory.apache.org/docs/guide/java/android_support/ states "Fory Java supports Android 8.0+ (API level 26+)"). Because the SquidSquad serialization modules pull tantrum+fory transitively, both groups are excluded at graph level in the root build (same repair pattern as the jdkgdxds `:build` exclusion); restore if minSdk is ever raised to 26. Android natives coordinate gotcha recorded: extension android natives live in `gdx-box2d-platform`/`gdx-freetype-platform` classifiers, NOT `gdx-box2d:natives-*` (the latter do not exist for 1.14.2); the `natives` configuration's lock entries are only written by resolving it, so `:android:copyAndroidNatives --write-locks` is part of the regen flow now. Bytecode spot-checks (RoboVM/dex constraint): vis-ui, spine, squidlib-util, gdx-ai, blade-ink, ktx jars all class-file major 51–52 (Java 8). Evidence: `:core:dependencies/:lwjgl3:dependencies/:android:dependencies/:ios:dependencies --write-locks --write-verification-metadata sha256`, then `--write-locks --write-verification-metadata` battery (`:core:check` 28/28 + boundary, `:lwjgl3:compileKotlin`, `:ios:compileKotlin`, `:android:checkDebugDuplicateClasses` + `:android:assembleDebug` — including the previously-failing `mergeExtDexDebug` and `copyAndroidNatives`), then `--dependency-verification strict` over the same + `:lwjgl3:jar`, all green; `android/libs/arm64-v8a/` now contains `libgdx.so`, `libgdx-box2d.so`, `libgdx-freetype.so`. Honest gaps: no project code imports the new libraries yet (they are available for upcoming phases); Android release/R8 keep rules for the new libs are unaddressed until the release gate; iOS AOT with the new set (coroutines, vis-ui, spine, fory-free stack) is untested — manual macOS gate; desktop launch/emulator runs were not re-executed for this dependency change.
- **2026-09-06 — Build scripts converted to Kotlin DSL (user-directed).** `settings.gradle`, the root `build.gradle`, and all four module `build.gradle` files were rewritten as `settings.gradle.kts` / `build.gradle.kts` / `core|lwjgl3|android|ios/build.gradle.kts`; the Groovy originals deleted. Semantics preserved: plugin loading stays on the root buildscript classpath (AGP 8.13.2, `kotlin-gradle-plugin` via `${property(...)}` from `gradle.properties`), JVM-1.8/-Xjdk-release compiler options, dependency locking, the jdkgdxds `:build` exclusion, repositories, `checkSimulationBoundary`, `generateAssetList` (now a proper `doLast` action instead of configuration-time file writes; same output at gitignored `assets/assets.txt`), the lwjgl3 fat-jar/jarMac/jarLinux/jarWin/construo/distribution wiring (the gdx-liftoff `dependencies { exclude(...) }` quirks folded into the equivalent top-level `exclude(...)` lists), android natives extraction + desugaring + packaging, and the RoboVM iOS wiring. Kotlin-DSL specifics: type-safe `configure<T>` blocks replace dynamic Groovy (eclipse uses `EclipseModel.project`, android uses `AppExtension` with `compileSdkVersion(36)`, construo uses `ConstruoPluginExtension` with polymorphic `targets.register(name, Type::class.java)`); gradle.properties values are read via `by project` delegates and `property(...)` inside buildscript blocks. `lwjgl3/nativeimage.gradle` intentionally stays a Groovy script plugin: it is opt-in dead config (`enableGraalNative=false`) whose GraalVM DSL cannot be exercised while disabled — convert it if/when Graal is enabled. Verification metadata regenerated for Gradle's embedded Kotlin script-compilation artifacts (`kotlin-stdlib`/`kotlin-reflect` 2.3.20 etc., now resolved because the build itself is Kotlin); dependency graph unchanged so lockfiles needed no edits. Evidence: `./gradlew --write-verification-metadata sha256` battery (`help`, `:core:check` 28/28 + boundary, `:lwjgl3:compileKotlin`, `:ios:compileKotlin`, `:android:checkDebugDuplicateClasses` + `:android:assembleDebug`) green, then `--dependency-verification strict` over the same plus `:lwjgl3:jar` and `:lwjgl3:gdxToolsClasspath` green; `:core:processResources` output (`assets/assets.txt`, 23 entries) matches the Groovy build's format. Fix after IntelliJ sync surfaced it: the platform jar variants (jarMac/jarLinux/jarWin) initially reconfigured the shared `jar` task from inside their own configuration actions — legal under Groovy's dynamic dispatch, but Gradle task rules prohibit task-container access there, and IDE model building realizes every task (the CLI battery missed it because the variants were never realized). They now register plain tasks and reconfigure `jar` from the requested start parameters (`gradle.startParameter.taskNames`); verified with `./gradlew tasks --all` (realizes everything, as sync does), `:lwjgl3:jarMac` (17.4 MB `-mac.jar`, 0 root-level windows/linux binaries vs 6 windows DLLs in the full 26.6 MB `jar`). Second IDE-sync fix: IntelliJ resolves the Gradle distribution `gradle-9.5.1-src.zip` onto the buildscript classpath for Kotlin DSL script support — trusted by file pattern (`gradle-.*-src[.]zip`, plus `-docs[.]zip` preemptively) alongside the existing javadoc/sources-jar trust rules, since it is a navigation-only IDE download; note this also exposed that the wrapper is actually Gradle **9.5.1** and the live docs claimed 9.7.1 — AGENTS.md/README corrected to 9.5.1.
- **2026-09-06 — KTX adoption (user-directed; follows the same-day Kotlin migration).** Seven `io.github.libktx` modules at `1.13.1-rc1` (pinned as `ktxVersion`) were added to `core` as `implementation` deps and adopted at concrete usage sites: `ktx-artemis` (`world.entity { with<GridPosition> { ... }; with<PlayerControlled>() }` in `DungeonSimulation.create`, `world.mapperFor<GridPosition>()`, standalone `allOf(PlayerControlled::class)` aspects in the pipeline systems), `ktx-scene2d` (HUD/menu builders in both screens), `ktx-actors` (`onClick` listeners on every button), `ktx-app` (`clearScreen` in both screens, `KtxScreen` interface replacing raw `Screen`, `KtxInputAdapter` replacing `InputAdapter`), `ktx-graphics` (`batch.use(camera) { }` in `DungeonRenderer.render`), `ktx-log` (`info`/`error` replacing `Gdx.app.log/error` in `LoadingScreen`/`Screenshots`), and `ktx-assets` (`load<TextureAtlas>` scheduling + `getAsset` retrieval). Module dispositions — NOT adopted, with rationale: `ktx-ai`/`ktx-ashley`/`ktx-box2d`/`ktx-tiled`/`ktx-vis`/`ktx-vis-style` (wrap libraries this project deferred), `ktx-freetype`/`ktx-freetype-async` (require gdx-freetype natives on every launcher; no font-generation need), `ktx-async`/`ktx-assets-async` (coroutine-based concurrency conflicts with the deterministic render-thread model and the SessionWorker design, game-plan §4; would add kotlinx-coroutines), `ktx-collections` (wraps libGDX collections; project collections are jdkgdxds), `ktx-inject` (no service wiring until game-plan §13 lands), `ktx-json` (save codecs arrive Phase 6), `ktx-math` (no vector-arithmetic usage site), `ktx-preferences` (no settings storage yet), `ktx-reflect` (no gdx-reflection usage), `ktx-script` (desktop-only scripting; no use case), `ktx-style` (skin comes from the JSON asset; no programmatic styles). `KtxGame` (inside ktx-app) was evaluated and REJECTED: its class-keyed screen registry holds long-lived instances, never disposes on switch, forces a black clear and `Gdx.graphics.deltaTime` — all incompatible with the project's single-activation dispose-on-navigate lifecycle, clamped delta and per-screen clear colors; `RebirthDungeon.navigateTo` remains the coordinator. Compatibility facts: KTX 1.13.1-rc1's `ktx-artemis` compiles against artemis-odb 2.3.0 (exact pin match); the module family's gdx baseline is 1.13.1 while the project resolves gdx 1.14.2 — accepted for extension-only usage and verified by the runtime battery; jars built with Kotlin 2.1.10 run under the 2.4.10 toolchain. Porting findings: scene2d factories (`table`/`label`/`textButton`) are `KWidget` extensions and need `import ktx.scene2d.*`; widget-builder lambdas inside a `Table`-derived receiver see `Actor.left/right/top/bottom` as synthetic Float properties, which shadow same-named fields (the D-pad button fields are named `moveUp/moveDown/moveLeft/moveRight` for that reason); `ktx.log.error` takes `(throwable, tag)` in that order; libGDX `Label` writes still go through `setText`. Lockfiles (all four modules) and `gradle/verification-metadata.xml` regenerated. Evidence: `:core:check` 28/28 tests (artemis tests exercise the ktx entity path) + boundary clean; desktop runtime via the property/env-gated auto-demo (`REBIRTH_AUTODEMO=1 :lwjgl3:run`, macOS arm64): menu⇄dungeon ×2, accepted + rejected moves ("Blocked.", Steps 1) through the ktx-scene2d HUD, 12 frame captures in gitignored `assets/screenshots/`, clean exit; `:android:checkDebugDuplicateClasses` + `:android:assembleDebug` (APK with ktx jars, 13.6 MB); `:ios:compileKotlin` pass (full AOT remains the manual macOS gate — not re-run); `:lwjgl3:jar`; strict verification (`--dependency-verification strict`) green across the battery.
- **2026-09-06 — Language migration to Kotlin (user-directed; spans the whole codebase).** All Java sources were ported to Kotlin 2.4.10 and deleted: `core` main (19 files), `core` tests (7 files), and the lwjgl3/android/ios launchers (1 file each), now under `src/main/kotlin`/`src/test/kotlin` with unchanged packages and class names (launcher FQCNs, `robovm.properties` `app.mainclass` and the AndroidManifest activity name needed no edits). Build changes: `kotlin-gradle-plugin` added to the root buildscript and `org.jetbrains.kotlin.jvm` applied to core/lwjgl3/ios (`kotlin-android` on android), all pinned to `jvmTarget=1.8` plus `-Xjdk-release=1.8` so the Android dexer and RoboVM AOT compiler keep consuming Java-8 bytecode (verified: core classes are class-file major 52); `kotlin-stdlib` pinned in `gradle.properties` and declared in `core`. The Checkstyle gate was replaced by a zero-dependency `checkSimulationBoundary` Gradle task in `core/build.gradle` (same rules: `game/` must not import `com.badlogic.gdx`, plus tab/trailing-whitespace/CR hygiene) wired into `:core:check`; `config/checkstyle/` deleted and `checkstyleVersion` un-pinned. Behavior-preserving port notes: `MoveCommand`/`CommandResult` stay identity-compared (not data classes); artemis components are plain Kotlin classes with defaulted primary constructors (no-arg constructor generated for reflective creation); artemis mapper field injection works on Kotlin properties; libGDX 1.14.2 `Label.getText()` returns a read-only gdx `CharArray`, so status/step labels write through `setText(...)`; SquidSquad `Coord` fields are `short` and are widened with `toInt()`; the AceRandom smoke seed is written two's-complement (`-0x61C8864680B583EB`) because Kotlin hex literals cannot exceed `Long.MAX_VALUE`; RoboVM's `UIApplication.main` needs explicit type arguments (`main<UIApplication, IOSLauncher>(argv, null, ...)`) to keep the Java call's null-principal-class semantics. Lockfiles (all four modules) and `gradle/verification-metadata.xml` regenerated; stale `checkstyle` configuration entries dropped from `core/gradle.lockfile`. Docs updated: AGENTS.md, README (incl. kotlin-stdlib dependency entry), game-plan toolchain table + section 17 tree, CI commands (`compileKotlin`, plus `:ios:compileKotlin` retained as compile-only). Evidence: `./gradlew :core:check` (28/28 tests, boundary clean), `:lwjgl3:compileKotlin`, `:ios:compileKotlin`, `:android:checkDebugDuplicateClasses` + `:android:assembleDebug` (APK produced), and a strict verification re-run (`--dependency-verification strict`) all green on macOS arm64, wrapper 9.7.1, daemon JDK 25. Honest gaps: this was a port with no behavior change intended, but desktop launch, Android emulator interaction, and iOS AOT/simulator runs were NOT re-executed after the migration — the prior Phase 1 runtime evidence predates Kotlin; re-run the platform batteries before trusting runtime behavior on-device.
- **2026-09-05 — Gameplay alignment update (documentation only; no implementation claimed).** Re-aligned the phase checklist with the game plan's September 5 gameplay update and the seven gameplay specifications. Phase 4/5 re-scoped to the five-dice contract: skill-before-roll selection, first-roll lock of skill/rank/target/inputs/profile, kept flags, one initial roll plus two batch rerolls via `REROLL_DICE`, whole-hand `USE_ABILITY` commit, paid post-roll pass; `ASSIGN_DIE`/`UNASSIGN_DIE` and the singular `REROLL_DIE` removed; `USE_ITEM` gated on inventory consumption; scoring/damage/resource/stat/status tasks follow battle.md and stats.md. Phase 6 save-bundle contents expanded to the game-plan section 14 profile/run/mission shape. Phase 7 expanded to grid inventory/equipment, the three learning routes with the 100-point-plus-AP gate, XP/levels/cumulative level/talents/mastery, weekly aging with the provisional reward cutoffs, world pickup, and withdraw-only reward overflow. New Phase 8 (quests, enchanting, rebirth) and Phase 9 (RP missions, staged skill extensions) split the old Phase 8 scope; former phases 8–14 renumbered 10–16. Milestone map updated to the renamed game-plan milestones (M2–M4); Open Decisions updated with the retention policy, hero-vs-account AP ownership, aging clock trust, rebirth economy and extension-staging decisions, and renumbered entries. RNG stream reservations updated (hub-enchanting stream → Phase 8; development-gacha stream → Phase 13). Phases 0–1 completion evidence unchanged. Note: the Phase 1 work note below references the frame-capture aid "marked for removal in Phase 9"; after renumbering that removal belongs to Phase 11, where it is now an explicit task.
- **2026-09-05 — Titles specification folded into the tracker (documentation only; no implementation claimed).** Added [titles.md](gameplay/titles.md) to the alignment list and placed title work: Phase 2 defers the title catalog; Phase 6 persists collection state, selections, evidence and the equipped-title run snapshot; Phase 7 implements the per-hero collection (First/Second slots plus cosmetic talent display, Unknown/Known/Earned with separate hint/award conditions, achievement/milestone/coupon acquisition, stat-stage effects with penalties and no refill, character-screen Titles section, fixed run snapshot, outcome-boundary evaluation) with a matching exit criterion; Phase 8 adds quest-awarded titles with predicate/content validation; Phase 9 stages Master Titles and vanity; Phase 11 adds title-award reveals; Phase 12 consolidates title coverage. Open Decisions extended: ownership folded into the hero-vs-account row, title evidence folded into the retention row, Master Titles/vanity added to the staging row, and a new catalog/discovery/coupon row. Note: game-plan.md does not yet reference titles.md — its specification table and sections 14–16 need a matching titles pass.
- **2026-09-04 — Phase 1 completed (lifecycle, assets, and rendering integration).** New shared code, all paths per game-plan section 17: `game/` (Gdx-free, Checkstyle-guarded) gained the command-driven spike — `commands/` (MoveCommand, CommandResult, PendingCommand), `ecs/components/` (GridPosition, PlayerControlled), `ecs/systems/` (CommandValidationSystem slot 100 → MovementSystem slot 200 → CleanupSystem slot 800, registration order = pipeline order), `grid/` (immutable row-major y-up FloorMap + GeneratedFloor), `algorithms/DungeonGenerator` (detached-data contract), `squidsquad/SquidDungeonGenerator` (one `DungeonProcessor(width, height, new AceRandom(seed))` per call; x-first `char[x][y]` → y-up row-major translation pinned by tests against the raw library grid), and `DungeonSimulation` (one synchronous `world.process()` per command; `StepCounterSystem` proves idle frames step nothing). `bootstrap/SessionWorker` owns the worker-thread → `postRunnable` handoff with session-token stale-callback rejection and executor shutdown on hide/dispose. `presentation/` gained LoadingScreen (drains the app AssetManager; actionable failure text + quit before any gameplay screen activates) and DungeonScreen (world `ExtendViewport` 320x180 min + clamped camera, private SpriteBatch, Scene2D `ScreenViewport` Stage with skin buttons/D-pad, `InputMultiplexer` stage-first, safe-inset padding, zero-size resize guards, worker-generated floors installed only on the render thread). `RebirthDungeon` now owns the `AssetManager` (dungeon atlas, uiskin atlas + skin) and acts as screen coordinator: `navigateTo` disposes the previous screen; managed assets are never disposed by screens. `FirstScreen` deleted. Assets: `assets/atlases/dungeon.{png,atlas}` — six 16px tiles (floor/wall/door/exit/2 player walk frames), Nearest filtering declared in the atlas; generator script `tools/make_dungeon_atlas.py` (offline tooling). Two atlas-format findings recorded for future asset work: TexturePacker-format `.atlas` files must not contain blank lines (a blank line makes the parser treat the next bare name as a new page/image — this produced the first launch failure, surfaced correctly by the loading-failure UI), and `SkinLoader.SkinParameter("ui/uiskin.atlas")` loads the existing skin cleanly. Verification: desktop via LWJGL3 run; Android via emulator with real `input tap`/`keyevent`; iOS via RoboVM AOT + `simctl`. OS screen recording and Accessibility are denied for this session's automation helper and `osascript` keystrokes are denied, so desktop/iOS visuals were verified with an in-app frame-capture aid (F12 + a property/env-gated auto-demo driving the real `navigateTo`/`submitMove` paths; `Screenshots`/`AutoDemo`, marked for removal in Phase 9) plus, on iOS, the simulator composite via DeviceHub. Android interaction used real injected touches (no automation workaround needed). Code review found and fixed: a per-activation `BitmapFont` leak in LoadingScreen and duplicated HUD label adds in DungeonScreen; `NO_PENDING_COMMAND` and an unused `WorldConfiguration.register` were removed. Battery re-run green after fixes (28/28 tests, Checkstyle clean, all compiles, Android duplicate-class check + debug APK).
- **2026-09-04 — iOS toolchain repairs and Xcode 27 launch procedure.** Two stale RoboVM force-link leftovers from the pre-reset scaffold broke `:ios:launchIPhoneSimulator` ("Root class ... not found"): `ios/src/main/resources/META-INF/robovm/ios/robovm.xml` (vis-ui patterns — file deleted; the module-level `ios/robovm.xml` already carries the real patterns) and the exact-class pattern `com.badlogic.gdx.controllers.IosControllerManager` in `ios/robovm.xml` (gdx-controllers was intentionally removed in Phase 0). After removal, RoboVM 2.3.23 AOT compile + link + signing succeeded on Xcode 27 beta (27A5194q) for the iOS 18.6 simulator runtime. RoboVM's final `open -a Simulator` step fails on Xcode 27 ("Unable to find application named 'Simulator'" — Simulator.app was replaced by DeviceHub.app); the documented workaround is `xcrun simctl install <UDID> ios/build/robovm.tmp/IOSLauncher.app` then `xcrun simctl launch <UDID> cloud.vinh.rebirthdungeon` (optionally `SIMCTL_CHILD_*` env passthrough for debug flags; note `booted` is ambiguous when several simulators are up — pin the UDID). README's iOS section updated accordingly. Known presentation caveat (recorded, not a Phase 1 gate): `ScreenUtils.getFrameBufferPixmap` on the MetalANGLE backend returns an incomplete frame (early draw calls only), so in-app framebuffer captures are not reliable visual evidence on iOS — use the simulator composite (`xcrun simctl io <UDID> screenshot`) with DeviceHub running.

- **2026-09-02 — Jackson added for content-definition JSON (user decision).** `com.fasterxml.jackson.core:jackson-databind:2.22.2` + `jackson-annotations:2.22` (annotations version line has no patch component) pinned in `gradle.properties`, declared in `core` as `implementation`. Verified Java 8 bytecode before pinning (class file major 52) and Android debug packaging after. Role split recorded in game-plan sections 2/14/15: Jackson = versioned content definitions with strict default binding (unknown fields/enum values fail the load; dice notation like `"1d6+1"` stays a string at the boundary); LibGDX JSON remains the save-bundle codec (Phase 6). `JacksonContentBindingTest` (4 tests) pins the binding shape against the `rusted_sword` item example: field/enum binding, actionable unknown-field failure, unknown-enum rejection, serialize/restore round trip. Battery re-run green (`:core:check` 10/10, compiles, `:android:checkDebugDuplicateClasses`, `:android:assembleDebug`); lockfiles and verification metadata regenerated. Deferred deliberately: R8 keep rules for content DTO packages (no such package exists yet — required at the Android release/minify gate), and RoboVM reflection behavior for DTOs is covered by the Phase 1/6 iOS gates.
- **2026-09-02 — ECS framework swap to artemis-odb (user decision, same day as Phase 0).** Replaced `com.badlogicgames.ashley:ashley:1.7.4` with `net.onedaybeard.artemis:artemis-odb:2.3.0` (latest Maven Central release; the README's "2.4.0" is a snapshot-era claim, verified against repo1.maven.org). Documentation fetched with Firecrawl and cached under `.firecrawl/artemis-odb-*.md`; key contracts verified in the resolved source jar: no per-system priority field — the default `InvocationStrategy` runs systems in registration order and flushes entity-state updates to subscriptions before each system and after the last; the builder accepts one instance per system class; components are created reflectively and need public constructors; entity ids are `int`s, recycled after deletion. The Ashley smoke fixture was replaced by `ArtemisWorldStepTest` (registration order + aspect filtering; both framework contracts above caught by the first test run). Docs updated (every Ashley reference across game-plan sections 1–20, README, and this tracker). Lockfiles and `gradle/verification-metadata.xml` regenerated; full battery re-run green: `:core:check` 6/6, `:core:compileJava`, `:lwjgl3:compileJava`, `:android:checkDebugDuplicateClasses`, `:android:assembleDebug` (macOS arm64 host, wrapper 9.7.1, daemon JDK 21). Unmet prerequisite preserved: iOS AOT/simulator verification remains for Phase 1.
- **2026-09-02 — Phase 0 completed (dependency repair and build foundation).** Host: macOS arm64 (Darwin 27), Gradle wrapper 9.7.1, daemon JDK 21 per `gradle/gradle-daemon-jvm.properties`, Android SDK 36 via `local.properties`. Evidence sequence: (1) reproduced the audit blocker — `./gradlew :android:checkDebugDuplicateClasses` failed on `com.github.tommyettinger.jdkgdxds:build:2.1.8` vs `:jdkgdxds:2.1.8` (533 identical classes); (2) confirmed both artifacts' POMs declare the same deps (funderby 0.1.2, digital 0.10.2), so the root-build exclusion of the `:build` module drops no code — applied in root `build.gradle` for every subproject configuration; (3) reduced `core` to gdx 1.14.2 (`api`) + ashley, juniper, jdkgdxds, squidcore/grid/place/path (`implementation`), junit 4.13.2 (test); removed Box2D + lights + all their natives, gdx-controllers backends, and every deferred library from the scaffold; (4) moved `gdx-tools` to the `gdxTools` configuration with a `:lwjgl3:gdxToolsClasspath` task (verified absent from all runtime classpaths); (5) repositories: Maven Central + JitPack kept, `mavenLocal()` opt-in via `-Prebirth.enableMavenLocal=true`, snapshot repo removed; (6) lockfiles for all four modules + `gradle/verification-metadata.xml` (sha256) committed; (7) Java 8 API surface enforced with `--release 8` (probe: `List.of` rejected at compile); (8) 6 smoke tests under `core/src/test/.../smoke/` pinned the then-Ashley stack (superseded the same day by the artemis-odb swap note above, with the battery re-verified), AceRandom seed reproduction and five-word state restore, and jdkgdxds collection behavior — no Gdx.app/OpenGL/natives; (9) Checkstyle (hygiene + `ImportControl` game/ boundary, probe-verified) and `.github/workflows/ci.yml.backup` added; README rewritten with per-platform prerequisites and verification commands. Final battery all green: `:core:check`, `:core:compileJava`, `:lwjgl3:compileJava`, `:android:checkDebugDuplicateClasses`, `:android:assembleDebug`, `:lwjgl3:jar`. Dispositions: `vis-ui` and `gdx-controllers` intentionally removed (optional; no controller input implemented — re-add per feature); `digital`/`regexodus`/`crux`/`funderby` left transitive per game-plan section 2 guidance. iOS AOT/simulator build remains unverified by design — only the iOS dependency graph resolution was checked; iOS build evidence belongs to Phase 1.
- **2026-09-02 — Tracker reset:** All checkboxes cleared; the active focus returned to Phase 0. Prior completion logs, test totals, device/signing claims and implementation notes were removed because they describe the previous stack. This reset edits the tracker only; it does not implement any phase.
- **2026-09-02 — Current build blocker:** The game-plan audit recorded duplicate classes from `com.github.tommyettinger.jdkgdxds:build:2.1.8` and `com.github.tommyettinger.jdkgdxds:jdkgdxds:2.1.8`. Next action: repair/review the resolved graph, then repeat duplicate-class checking and Android assembly. Audit evidence is described in game-plan sections 2 and 20; no new build result is claimed by this tracker reset. *(Resolved same day — see Phase 0 completion note above.)*
- **2026-09-02 — Current source baseline:** Only the shared application/empty screen and platform launchers exist in Java. Content catalogs, gameplay systems, controllers, save codecs and phase tests must be implemented or inspected before any new completion claim.
