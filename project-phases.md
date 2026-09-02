# Rebirth Dungeon Project Phases

This checklist turns [`react-native-expo-game-plan.md`](react-native-expo-game-plan.md) into an ordered implementation tracker for AI assistants. The phases are dependency-ordered: complete the earliest unfinished phase before starting later work unless the user explicitly changes the priority.

The project targets [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Check the exact SDK 57 documentation before adding or configuring Expo packages.

The architecture is ECS-first: one active dungeon run is one `@esengine/ecs-framework` `Scene` and the source of truth for the run. `rot-js` supplies generation, FOV, pathfinding, and turn order behind project-owned adapters. Effect runs fallible and asynchronous work at the application boundary. Skia and Reanimated only show committed results.

## Tracking Rules for AI Assistants

- `[ ]` means incomplete; `[x]` means implemented **and verified**.
- The first unchecked phase in the overview is the default phase to work on.
- A phase remains unchecked while any task or exit criterion is incomplete.
- Check tasks only after inspecting the implementation and running relevant tests or builds. Do not trust a stale checkbox by itself.
- Keep notes under partially completed or blocked phases. Include the date, blocker, and next action.
- When completing a phase, update the overview, its task checklist, the current-focus section, and the completion log in the same change.
- Record concrete evidence such as test commands, build targets, device checks, migration versions, or file paths.
- Dependency direction: presentation → application → game simulation; Effect services → application; rot-js adapters → simulation; data implementations → application ports. The game simulation (ECS scene, components, systems, grid code, rot-js adapters) must not import React, React Native, Expo modules, Zustand, SQLite, Skia, Reanimated, Effect, or provider SDKs. `@esengine/ecs-framework` and `rot-js` are the simulation's only library dependencies, and rot-js is reached only through project-owned adapters.
- Respect the synchronous boundary: a command enters the run, the ECS and rot-js adapters resolve it deterministically, and only then does Effect perform external work and presentation animate the committed result. ECS systems never `await`, start fibers, write SQLite, play audio, call haptics, or mutate Zustand stores.
- Do not add `ROT.Display`, `ROT.Engine`, a second ECS, another game loop, or a second source of gameplay truth.
- Add dependencies only when their phase begins. Use `npx expo install` where Expo supplies a compatible version; install pure TypeScript packages such as Effect and rot.js with the project's package manager. Pin the exact Effect RC; no caret upgrades during the prototype.
- Do not mark a phase complete because a placeholder screen, mock, or happy-path demo exists when its exit criteria require production behavior.

## Current Focus

- **Current phase:** Phase 3 — Grid roguelike core: ECS world, movement, FOV, and turns.
- **Status:** Phase 2 completed on 2026-09-02: the content/RNG foundations from the earlier plan were audited against the reworked tasks and the gaps closed — `enemyAi` added as a sixth RNG stream; tile-definition, generation-profile, and pity-rule schemas with starter data, catalog indexing, and cross-validation (banner→pity references, contiguous tile ids); a fast-check property test proving corrupted references always fail with the file named; tile-definitions contract-tested against the grid's `TileId` space and the atlas manifest. 120 tests green in the plain Node environment. Phase 1 remains open **only** for the physical-device frame-time measurement (hardware/credentials blocker below).
- **Phase 1 remaining blocker (unchanged):** the paired iPhone 14 Pro Max needs an Apple ID signed into Xcode (free personal team suffices) before `npx expo run:ios --device`; a mid-range Android phone with USB debugging is needed for `dumpsys gfxinfo`. Emulator/simulator smokes all pass (see Work Notes) but do not satisfy the criterion.
- **Next objective:** Implement the Phase 3 run scene: the real component set, the typed-array `DungeonGrid` consuming tile rules from content, the ordered system pipeline, the movement contract, the rot-js pathfinder/FOV/scheduler adapters, and the command-driven RunController.
- **Baseline inspected:** 2026-09-02

## Phase Overview

- [x] Phase 0 — Project bootstrap and architecture baseline
- [ ] Phase 1 — Compatibility and rendering spike
- [x] Phase 2 — Content system and deterministic random streams
- [ ] Phase 3 — Grid roguelike core: ECS world, movement, FOV, and turns
- [ ] Phase 4 — Dice combat in the ECS
- [ ] Phase 5 — Playable combat slice
- [ ] Phase 6 — Dungeon depth and the complete run loop
- [ ] Phase 7 — Effect runtime, persistence, and deterministic recovery
- [ ] Phase 8 — Meta-game, progression, inventory, and economy
- [ ] Phase 9 — Local gacha prototype
- [ ] Phase 10 — Presentation polish, audio, haptics, and Rive
- [ ] Phase 11 — Authentication, backend, and cloud synchronization
- [ ] Phase 12 — Purchases and production-authoritative gacha
- [ ] Phase 13 — Quality, balance, performance, and accessibility
- [ ] Phase 14 — Release readiness and live operations

---

## Phase 0 — Project Bootstrap and Architecture Baseline

**Goal:** Create a reliable Expo SDK 57 foundation with the pinned gameplay libraries, enforceable architectural boundaries for the ECS/rot-js/Effect layering, and a repeatable native-development workflow.

- [x] Initialize an Expo SDK 57 TypeScript project.
- [x] Configure Expo Router as the application entry point with typed routes.
- [x] Install the SDK-compatible animation baseline: Gesture Handler, Reanimated, and Worklets.
- [x] Replace or remove the `create-expo-app` example UI and assets that are not part of the game.
- [x] Pin `@esengine/ecs-framework`, `effect` (exact release candidate), and `rot-js` to reviewed versions; install Skia, Zustand, Zod, Expo Asset, Expo Audio, Expo Haptics, and test tooling.
- [x] Establish the initial `app`/`src` structure for bootstrap, game simulation, application, data, stores, and presentation code; create folders only as features need them (see the plan's project-structure section).
- [x] Define and document dependency-direction rules per the updated layering, including an automated boundary check (lint zones) where practical.
- [x] Configure formatting, linting, TypeScript checks, unit tests, and continuous integration.
- [x] Configure EAS development, preview, and production profiles.
- [x] Produce and launch development builds on both Android and iOS.

Exit criteria:

- The starter app launches through an Expo development build on Android and iOS.
- Formatting, linting, type checking, and the initial test suite pass from documented commands.
- The three gameplay libraries resolve together at their pinned versions, and an Effect RC upgrade is an intentional act rather than a caret bump.
- A pure TypeScript module can be imported and tested without loading React Native or Expo.
- The repository documents how later assistants should install SDK-compatible Expo dependencies and verify native changes.

## Phase 1 — Compatibility and Rendering Spike

**Goal:** Retire the highest-risk integration questions — ECS, rot-js, Effect, and Skia coexisting on Hermes in production builds — and prove the rendering boundary before building game systems.

- [x] Confirm `@ECSComponent`/`@ECSSystem` decorators (and `@Serializable`/`@Serialize` where used) compile and execute on Hermes in both development and production builds.
- [x] Create and dispose an ECS `Core` + `Scene` cleanly through a React route lifecycle; run a minimal step through two systems with explicit `updateOrder`.
- [x] Generate a seeded rot.js dungeon through the synchronous save/seed/run/capture/restore wrapper; assert the module-level `ROT.RNG` state is restored, including when generation fails.
- [x] Run and cancel an Effect fiber from an app-scoped runtime; verify interruption when the owning route unmounts.
- [x] Validate production minification on Android and iOS with all libraries present and no Node-only globals or browser DOM APIs.
- [x] Choose and document the portrait logical resolution and base tile size.
- [x] Render one dungeon room from a Skia tile atlas using nearest-neighbor sampling.
- [x] Render animated player and monster sprites from atlas metadata.
- [x] Implement a small camera module with target focus, map clamping, logical-pixel snapping, and screen shake.
- [x] Place an accessible React Native HUD over the Skia canvas.
- [x] Use a Reanimated frame callback only for presentation state such as sprite clocks, interpolation, particles, and camera motion.
- [x] Keep authoritative positions and game outcomes out of Skia and Reanimated objects.
- [x] Preload critical assets through an asset manifest and fail clearly when an asset is missing.
- [ ] Measure frame time on representative physical Android and iOS devices, including a mid-range Android target.
  - 2026-09-02: Blocked on hardware/credentials, not code. iPhone 14 Pro Max (00008120-000858561AE0C01E) is paired and reachable over the local network with Developer Mode enabled, but cannot be signed: Xcode has no Apple ID account and the keychain holds no Apple-issued identity — sign into Xcode (Settings → Accounts), then `npx expo run:ios --device`. For Android, no physical device is attached; a mid-range phone with USB debugging is needed (`npx expo run:android` + `adb shell dumpsys gfxinfo com.anonymous.RebirthDungeon`). Emulator/simulator equivalents all pass post-fix (see Work Notes).

Exit criteria:

- All four library stacks work together in development and production builds without Node-only globals or browser DOM APIs.
- The ECS scene lifecycle is owned by the route, and a logical step advances systems in declared order.
- Seeded rot.js generation is reproducible and the shared module RNG is restored even on failure.
- A development build displays a crisp, animated room with a working camera and native HUD on Android and iOS.
- The renderer consumes an immutable scene snapshot and cannot mutate gameplay state.
- The spike meets an initial 60 fps budget on the supported baseline device or has a documented remediation plan.

## Phase 2 — Content System and Deterministic Random Streams

**Goal:** Establish data-driven, validated content models and serializable RNG streams (including the rot.js RNG contract) that the simulation consumes as plain data.

- [x] Define shared IDs, branded content types, immutable-update conventions, errors, engine results, flat discriminated-union commands, and domain-event conventions under the new layering (no React, Effect, or React Native types).
- [x] Implement `RandomSource`, a serializable seeded generator, RNG snapshots/draw indexes, and a sequence-backed test fake.
- [x] Derive separate RNG streams for dungeon generation, enemy AI, combat/dice, loot, cosmetics, and local development gacha.
- [x] Implement the rot.js RNG adapter contract: save module state, set the floor state, generate synchronously with no `await`, capture the new state, restore the prior state in `finally`; never run two generations concurrently against the shared RNG.
- [x] Define typed, Zod-validated schemas for tile definitions, heroes, monsters, dice, abilities, status effects, items, equipment, loot and encounter tables, dungeons, generation profiles, banners, rarity tables, pity rules, and experience curves.
- [x] Add a minimal starter content set under `assets/data/`.
- [x] Validate content versions, IDs, cross-references, ranges, rates, and weights during tests or a build step.
- [x] Define repository interfaces (for example `ContentRepository`) at the application boundary without importing concrete storage or network types.
- [x] Add unit and property-based tests for randomness, stream independence, and content validation.

Exit criteria:

- Seed and restored RNG state reproduce the same random sequence, and the rot.js wrapper restores module RNG state even when generation fails.
- Every bundled content file passes validation; malformed or broken references fail with actionable paths.
- Content and RNG tests run in a plain TypeScript environment with no React Native, Expo, Skia, Zustand, ECS, rot-js, or Effect imports.
- Gameplay definitions can change through data rather than engine source edits.

## Phase 3 — Grid Roguelike Core: ECS World, Movement, FOV, and Turns

**Goal:** Build the authoritative run scene: entities and components, ordered systems, the movement contract, fog of war, pathfinding, turn scheduling, and the deterministic turn runner.

- [ ] Define the initial component set (`StableId`, `GridPosition`, `PreviousGridPosition`, `Actor`, `PlayerControlled`, `EnemyBrain`, `BlocksMovement`, `BlocksVision`, `Speed`, `Vision`, `Health`, `Stats`, `StatusSet`, `Door`, `Trap`, `Pickup`, `MoveIntent`, `AttackIntent`, `PendingRemoval`, …) as data-only `@ECSComponent` classes; keep formulas and transitions in systems or pure helpers.
- [ ] Keep the static tile grid in a compact typed-array `DungeonGrid` with an O(1) occupancy index; do not make floor or wall tiles entities.
- [ ] Model run-level state (run/floor IDs, turn number, current actor, run phase, active encounter, pending presentation sequence) in a singleton component or typed scene service; use `sceneData` only for infrastructure.
- [ ] Create the ordered system pipeline with well-spaced `updateOrder` ranges (InputIntent, EnemyIntent, Movement, Interaction, Visibility, TurnFinalization, Cleanup, EventExport), leaving slots for the later combat systems.
- [ ] Implement the movement contract: reject input unless awaiting the player, one-cardinal-cell validation, bounds, tile rules, dynamic occupancy, door interactions, hostile-cell bump handling, post-move traps/pickups/stairs, FOV recompute, ordered events, and explicit turn-consumption rules (invalid UI input does not consume a turn).
- [ ] Implement the rot-js adapters behind project-owned interfaces: `ROT.Map.Digger` generation producing a plain `DungeonGrid` snapshot with rooms/corridors/spawn/exit, derived attempt seeds with a retry limit and typed generation failure, and spawn/exit connectivity validation.
- [ ] Implement `ROT.Path.AStar` (topology 4, static walkability + dynamic blockers, target-cell allowance) and `ROT.FOV.PreciseShadowcasting` (topology 4, opacity callback including `BlocksVision`, `visibleNow` + persistent `explored` bitsets).
- [ ] Implement a project-owned `TurnScheduler` over `ROT.Scheduler.Speed` with add/remove/next/snapshot/restore; do not use `ROT.Engine` or `ROT.Display`.
- [ ] Implement the RunController with a serial command mailbox: set intent → `Core.update(0)` → scheduler loop (enemy AI intents via pathfinding, visible/remembered targets, and the AI RNG stream) → stop at `awaitingInput`; add a maximum automatic-actor-step guard.
- [ ] Support D-pad, swipe, tap-to-walk (one step at a time with revalidation), and keyboard arrows/WASD through the same move command; gate further input while a command resolves.
- [ ] Project the scene after each command batch into one immutable snapshot plus an ordered domain-event batch; React components never subscribe directly to ECS events.
- [ ] Interpolate movement with Reanimated from `PreviousGridPosition` to `GridPosition` on `ACTOR_MOVED`; recompute FOV only after position or opacity changes.
- [ ] Add tests for movement legality, occupancy, doors, FOV, adapter behavior (RNG restore, scheduler snapshot/restore, passability), and seed/command determinism.

Exit criteria:

- The same seed and command sequence reproduces the same map, turn order, FOV, event log, and final projection.
- Simulation code imports no React, React Native, Expo, Zustand, SQLite, Skia, Reanimated, or Effect; rot-js is reached only through the adapters.
- Command resolution is synchronous; no `await`, timers, or async I/O occur during a turn, and animation never decides outcomes.
- Every generated floor has connected spawn/exit, valid project tile IDs, and the generation attempt limit is enforced.
- D-pad, swipe, tap-path, and keyboard produce identical commands.

## Phase 4 — Dice Combat in the ECS

**Goal:** Implement dice combat as components and systems inside the same run scene — deterministic, replayable, and free of presentation concerns.

- [ ] Add combat components: `EncounterMember`, `DicePool`, `AbilityLoadout`, `SelectedTarget`, `Shield`, `PendingDamage`, `PendingHeal` (reusing `Health`, `Stats`, `StatusSet`).
- [ ] Insert the combat systems into the order table: EncounterSystem (400), DiceSystem (500), AbilitySystem (600), DamageSystem (700), StatusEffectSystem (800).
- [ ] Implement the combat commands (`ROLL_DICE`, `REROLL_DIE`, `ASSIGN_DIE`, `USE_ABILITY`, `END_TURN`, plus `MOVE`/`INTERACT`) as flat discriminated unions; reject commands illegal for the current phase without corrupting state.
- [ ] Keep combat formulas (damage, healing, criticals, shields, resistances, status application/timing) as pure TypeScript functions invoked from systems; turn cooldowns and status durations are integer turn counters, never timers or sleeps.
- [ ] Choose and implement the grid-contact rule — bump attack or encounter-phase transition, one rule set per dungeon mode — keeping actors in the same ECS scene so health, statuses, loot, and death need no second model.
- [ ] Implement deterministic enemy combat decisions using the seeded AI RNG stream.
- [ ] Emit ordered combat events (`DICE_ROLLED`, `ABILITY_ACTIVATED`, `DAMAGE_DEALT`, `CRITICAL_HIT`, `STATUS_APPLIED`, `ACTOR_DEFEATED`, `COMBAT_WON`, `PLAYER_DEFEATED`) through the existing EventExport system.
- [ ] Define replay as run seed + starting content version + ordered commands, and add tests for phase transitions, critical/status/shield/defeat edge cases, replay, and seeded repeatability.
- [ ] Add property tests for invariants such as nonnegative HP, valid dice ownership, and terminal-state behavior.

Exit criteria:

- A complete encounter runs headlessly from start to victory or defeat through commands alone.
- The same initial state, RNG states, and commands produce identical states and event logs.
- Status durations tick exactly once per logical turn and combat outcomes never depend on wall-clock time.
- Combat code contains no React, React Native, Expo, Zustand, Skia, Reanimated, audio, haptics, or Effect dependencies.

## Phase 5 — Playable Combat Slice

**Goal:** Connect the combat systems to real controls and presentation without compromising authority boundaries.

- [ ] Implement a focused combat controller/store that receives projected HUD snapshots from the scene; Zustand never holds a mutable authoritative combat state.
- [ ] Build the dice tray, health display, turn indicator, ability controls, and enemy targeting as React Native UI with narrow selectors.
- [ ] Implement drag/drop die assignment with Gesture Handler and a non-drag tap alternative.
- [ ] Map combat domain events to explicit presentation instructions through a pure, testable presentation bridge.
- [ ] Add a bounded presentation queue for attack, damage-number, death, particle, and camera effects while committing authoritative state immediately.
- [ ] Gate inputs during required visual sequences, support reduced-motion skipping, and never let animation completion decide gameplay.
- [ ] Add initial SFX and haptic adapters behind application-facing interfaces (full services arrive in Phase 10).
- [ ] Support victory, defeat, retry, and return flows for a single encounter.
- [ ] Add integration tests covering command-to-store-to-presentation behavior and accessibility of the controls.

Exit criteria:

- A player can finish one polished dice battle on Android and iOS.
- Skipping, delaying, or replaying presentation does not alter the combat result.
- High-frequency animation values do not write to Zustand every frame.
- Controls are usable with touch, screen readers, and a non-drag interaction.

## Phase 6 — Dungeon Depth and the Complete Run Loop

**Goal:** Expand the combat slice into a complete deterministic dungeon run with traversal, encounters, loot, floors, and a boss.

- [ ] Make generation profiles data-driven so a dungeon definition selects its floor style (`Digger` first; `Uniform`/`Cellular` and hand-authored templates as later families) without changing movement or rendering.
- [ ] Implement content-driven interactions through the InteractionSystem: doors (open/locked), traps (armed/type), pickups, and stairs.
- [ ] Place encounters from encounter tables during generation; resolve loot into run inventory and award progression rewards.
- [ ] Implement floor transitions with derived floor seeds and explicit carry-over rules for health and statuses.
- [ ] Add boss rooms, treasure/events where content defines them, and run completion.
- [ ] Implement current-run controls for start, resume, abandon, defeat, and completion.
- [ ] Render the generated map, fog (`ExploredFogLayer`/`CurrentFovLayer`), props, and encounter markers through immutable scene snapshots.
- [ ] Test generation validity, seed repeatability, reachability, reward legality, bump/encounter integration with movement, and full headless runs.

Exit criteria:

- A player can select a dungeon, traverse multiple rooms and floors, fight encounters, defeat a boss, receive rewards, and finish or lose the run.
- Every generated floor is traversable and contains valid entry, encounter, and boss/exit structures.
- Replaying a seed and command sequence reproduces the same floors, combat, loot, and event log.
- Remote requests are not required during combat or dungeon generation.

## Phase 7 — Effect Runtime, Persistence, and Deterministic Recovery

**Goal:** Formalize the Effect application runtime and persist permanent progress and active runs safely across app interruption and schema changes.

- [ ] Formalize the app-scoped Effect runtime and `AppServices`; provide `RunRepository`, `ProfileRepository`, `AssetService`, `AudioService`, `HapticsService`, and Clock/UUID/Logger services where needed.
- [ ] Introduce tagged typed errors (`RunLoadError`, `RunSaveError`, `InvalidSaveError`, `AssetLoadError`, `GenerationError`, …), map them to UI at the controller boundary, and report defects with run seed, command index, and diagnostics.
- [ ] Add Expo SQLite, Drizzle ORM, and Drizzle Kit via `npx expo install`, plus a tested migration workflow.
- [ ] Create normalized tables for profile, characters, inventory, currencies, equipment, progression, quests, pity, completed dungeons, and save metadata; map rows to domain types so Drizzle types never leak inward.
- [ ] Store the active run as a versioned snapshot envelope: run ID, schema version, content version, floor seed/index, grid and room metadata, ECS component data (project-owned DTOs or registered `@Serializable` components — never an unversioned raw scene blob; transient intents excluded), per-stream RNG states including the rot.js states, scheduler snapshot, turn number and command index, pending/committed rewards, last stable phase, and update time.
- [ ] Validate loaded envelopes with Zod and implement explicit corrupt/incompatible-save behavior.
- [ ] Save only at stable command boundaries; serialize save requests so an older write cannot finish after a newer one; run a coalesced save worker as a scoped Effect fiber with a bounded lifecycle flush on AppState background/inactive.
- [ ] Use transactions when committing run rewards or changing currency, ownership, inventory, or equipment.
- [ ] Store only small, noncritical preferences in `expo-sqlite/kv-store` or AsyncStorage.
- [ ] Own route-scoped fibers for save/sync/content work and interrupt them when leaving the dungeon; use Effect's test clock/scheduler facilities in tests.
- [ ] Add round-trip, interruption, corruption, atomicity, out-of-order-save, and migration tests from every shipped schema version, plus a replay fixture for a complete run.

Exit criteria:

- Permanent progression survives restart and an interrupted run resumes equivalently.
- Save/load preserves every RNG stream, scheduler order, ECS state, and the command index.
- At least one forward migration path is tested without deleting the database.
- Premium currency, ownership, pity, and active-run data are never treated as simple preferences.
- Typed save/load failures map to recoverable UI states; retries apply only to transient/idempotent work.

## Phase 8 — Meta-Game, Progression, Inventory, and Economy

**Goal:** Build the durable player loop around dungeon runs.

- [ ] Create thin Expo Router routes and layouts for home, dungeon selection, characters, inventory, equipment, settings, gacha, shop, and run results.
- [ ] Implement focused Zustand stores/controllers for player, inventory, current-run projection, gacha, settings, and save/sync status; keep dialog/form-only state local to components.
- [ ] Implement character ownership, leveling, experience curves, and derived combat stats copied into a new run at start.
- [ ] Implement item stacking, equipment slots, equip/unequip validation, and loadouts.
- [ ] Implement currencies, costs, grants, sinks, and validated economy transactions.
- [ ] Apply run loot and experience exactly once through an atomic run-result transaction.
- [ ] Add loading, empty, error, and recovery states for every meta-game screen.
- [ ] Add a Rive or temporary reward/level-up sequence that consumes already-known results.

Exit criteria:

- The full local loop works: prepare a character, start a run, finish it, apply rewards once, improve the loadout, and start another run.
- Invalid, duplicate, negative, and unaffordable economy operations are rejected and tested.
- Route files remain thin and no single store owns unrelated application areas.
- Equipment and progression affect subsequent runs only through domain rules applied at run start or through run-result transactions.

## Phase 9 — Local Gacha Prototype

**Goal:** Prove banner, pity, reward, and interruption behavior behind a repository that can later become remote.

- [ ] Model versioned banners, server-style availability inputs, costs, rates, featured units, pity, guarantees, and duplicate conversion.
- [ ] Define `GachaRepository` as an Effect service and implement a local seeded repository for development only (never the production RNG path).
- [ ] Implement single-pull and ten-pull commands with idempotency keys.
- [ ] Atomically spend local currency, update pity/guarantee state, grant rewards, and append pull history.
- [ ] Build banner details, rate disclosure, confirmation, reveal, history, and collection-update screens.
- [ ] Resolve and persist results before starting the reveal animation.
- [ ] Recover a completed result if the app closes during the reveal.
- [ ] Test rate tables, pity, guarantees, reset rules, duplicate handling, insufficient currency, retry, and idempotency.

Exit criteria:

- Local pulls always produce valid, recoverable, transactionally applied results.
- The UI depends on `GachaRepository`, not the local engine or RNG implementation.
- Reveal animation timing cannot change inventory, currency, pity, or results.
- The local implementation is visibly and technically separated from production real-money behavior.

## Phase 10 — Presentation Polish, Audio, Haptics, and Rive

**Goal:** Replace prototype presentation with production-quality assets and feedback while respecting settings and performance budgets.

- [ ] Replace temporary art with organized sprite sheets/atlases and validated metadata.
- [ ] Add sprite animations, pixel VFX, bounded particle pools, floating text, transitions, and screen feedback in Skia.
- [ ] Implement `AudioService` with preloading, music/SFX channels, volume, lifecycle handling, and graceful failures.
- [ ] Implement `HapticsService` and map presentation events through user settings.
- [ ] Add Rive summon, reward, rarity-reveal, level-up, loading, or menu sequences where they improve the experience; Rive is never a dungeon renderer or source of truth.
- [ ] Keep heroes, monsters, dungeon objects, attacks, and pixel VFX in Skia rather than Rive unless an exception is documented.
- [ ] Implement music, SFX, haptics, graphics, language, reduced-motion, and accessibility preferences.
- [ ] Verify logical scaling, safe areas, atlas sampling, and pixel clarity on small phones, tall phones, tablets, and high-refresh displays.

Exit criteria:

- Audio, haptics, Rive, and optional effects can be disabled without changing game state.
- Critical assets are preloaded before dungeon entry and no visible fetch occurs after the transition starts.
- UI remains legible and pixel-crisp across supported sizes and densities.
- Presentation remains within the established frame-time and memory budgets.

## Phase 11 — Authentication, Backend, and Cloud Synchronization

**Goal:** Introduce production services without coupling game rules or UI to a specific provider.

- [ ] Finalize provider-neutral `AuthRepository`, session models, and route guards; retain guest mode where product requirements allow it.
- [ ] Implement `TokenStorage` with Expo SecureStore for small session secrets only.
- [ ] Choose and integrate the production identity provider behind the repository.
- [ ] Add a remote data layer and TanStack Query for server-cache/request state.
- [ ] Define versioned API contracts, runtime validation, error mapping, cancellation, and idempotency behavior; give each retry policy one owner (Effect schedules or TanStack Query, never stacked accidentally).
- [ ] Design and implement a cloud-save/sync strategy with explicit conflict resolution and content/save compatibility rules.
- [ ] Hydrate sessions before initial routing to avoid incorrect route flashes.
- [ ] Add privacy-conscious analytics, crash reporting, and remote configuration boundaries behind Effect services.

Exit criteria:

- Provider SDK types and APIs do not escape the data layer.
- Expired session, offline, retry, conflict, sign-out, and account-switch behavior are tested.
- Local and cloud saves cannot silently overwrite newer progress.
- Secrets are not stored in SQLite game tables, preferences, logs, or source control.

## Phase 12 — Purchases and Production-Authoritative Gacha

**Goal:** Make commerce and paid-resource rewards server-verified, idempotent, auditable, and recoverable.

- [ ] Choose RevenueCat or `expo-iap` and document the backend/operations tradeoff.
- [ ] Implement `PurchaseRepository` behind the selected provider.
- [ ] Handle product loading, purchase pending, success, failure, cancellation, restore, and interrupted flows.
- [ ] Verify store transactions on the backend or through RevenueCat before granting premium value.
- [ ] Implement idempotent server-side grants and authoritative balance refresh.
- [ ] Replace local production gacha with a remote repository using server time and server-side randomness — never client RNG.
- [ ] Return pull results, updated currency, pity, ownership, banner version, and audit/receipt ID atomically; play Rive reveals only of committed results.
- [ ] Test store sandboxes, duplicate callbacks, retries, restores, revoked purchases, and app interruption.

Exit criteria:

- The client cannot grant premium currency or paid rewards from a local callback or local RNG.
- Retrying a purchase or gacha request cannot double-charge or double-grant.
- Purchase restore and interrupted-transaction recovery work on Android and iOS store test accounts.
- Production pull history and pity updates are server-authoritative and auditable.

## Phase 13 — Quality, Balance, Performance, and Accessibility

**Goal:** Turn the feature-complete build into a stable, measurable, inclusive release candidate.

- [ ] Complete domain coverage for movement, FOV, scheduling, combat, statuses, loot, generation, progression, economy, persistence, and gacha — including the ECS tests (system order, transient-intent cleanup, deferred structural changes, death removing scheduling/occupancy, per-turn status ticks, projection purity) and rot-js adapter tests.
- [ ] Add application/controller, repository, migration, presentation-mapping, route, and critical end-to-end tests.
- [ ] Add seeded simulations for combat balance, loot distribution, dungeon generation, and gacha-rate invariants.
- [ ] Define and enforce budgets for startup, dungeon entry, command execution, frame time, memory, snapshot size, map-generation worst cases, and React rerenders.
- [ ] Profile production-mode builds on representative physical Android and iOS devices at 60 Hz and high refresh rates.
- [ ] Test app background/resume during combat, snapshot writes, purchases, and gacha reveals.
- [ ] Audit screen readers, semantic labels, focus order, larger text, reduced motion, non-drag alternatives, contrast, and color-independent indicators.
- [ ] Verify localization and long-text layouts.
- [ ] Triage all release-blocking correctness, performance, accessibility, security, and privacy defects.

Exit criteria:

- Critical start-run-to-result, save/resume, pull-to-inventory, purchase-restore, and account-recovery flows have automated coverage.
- Statistical simulations stay within documented tolerances.
- Production builds meet agreed budgets on baseline devices.
- No known release-blocking correctness, accessibility, security, privacy, or performance issues remain.

## Phase 14 — Release Readiness and Live Operations

**Goal:** Ship safely with tested platform configuration, compliance, monitoring, rollback, and compatibility procedures.

- [ ] Finalize identifiers, signing, EAS profiles, icons, splash assets, permissions, entitlements, and store metadata.
- [ ] Define Expo Update runtime-version policy and prevent OTA bundles from assuming unavailable native modules.
- [ ] Test migration and resume behavior from the previous production binary and content version, including deterministic run resume across an OTA update.
- [ ] Create deployment, staged rollout, rollback, incident, support, and save/content compatibility runbooks.
- [ ] Complete privacy policy, terms, account deletion/export, age rating, purchase disclosures, and regional gacha probability requirements.
- [ ] Run internal and closed testing on representative devices and fix launch blockers.
- [ ] Verify analytics, crash reporting, operational dashboards, remote configuration, and live-ops access controls.
- [ ] Submit signed production builds through EAS Submit and perform post-release smoke checks.

Exit criteria:

- Signed Android and iOS production builds pass smoke tests on representative physical devices.
- Store, privacy, purchase, account, and probability-disclosure requirements are satisfied for every launch region.
- Migration, monitoring, support, rollback, and content/save compatibility procedures have named owners and have been rehearsed.
- The released binary, OTA runtime version, backend API, and content schemas are mutually compatible.

---

## Milestone Map

| Milestone                | Required phases | Outcome                                                            |
| ------------------------ | --------------: | ------------------------------------------------------------------ |
| Foundation proven        |             0–1 | Native workflow plus ECS, rot-js, Effect, and Skia compatibility   |
| Deterministic simulation |             2–4 | Validated content, seeded streams, grid movement, and combat rules |
| First playable           |             5–6 | Playable combat and a complete local dungeon run                   |
| Local MVP                |            7–10 | Persistence, meta-game, local gacha, and polished presentation     |
| Production candidate     |           11–13 | Online services, verified commerce, and release-quality behavior   |
| Public release           |              14 | Store-ready build with operational safeguards                      |

## Open Decisions

Resolve each decision in the phase where it becomes necessary; do not block earlier phases prematurely.

| Decision                                                                              | Needed by | Status | Resolution/evidence                            |
| ------------------------------------------------------------------------------------- | --------: | ------ | ---------------------------------------------- |
| Logical game resolution and tile size                                                 |   Phase 1 | Open   | —                                              |
| Supported baseline Android/iOS devices                                                |   Phase 1 | Open   | —                                              |
| Grid-contact combat rule: bump attack vs encounter phase (per dungeon mode)           |   Phase 4 | Open   | Keep one rule set per mode and one ECS scene   |
| ECS snapshot style: project-owned component DTOs vs serialized scene data in envelope |   Phase 7 | Open   | Never an unversioned raw scene blob            |
| AsyncStorage vs `expo-sqlite/kv-store` for preferences                                |   Phase 7 | Open   | Prefer SQLite KV if SQLite is already core     |
| Production authentication provider                                                    |  Phase 11 | Open   | Repository boundary must be defined first      |
| Cloud-save conflict policy                                                            |  Phase 11 | Open   | —                                              |
| RevenueCat vs `expo-iap`                                                              |  Phase 12 | Open   | —                                              |
| Launch regions and gacha compliance scope                                             |  Phase 14 | Open   | —                                              |

## Completion Log

Add one row only when a phase is fully complete. Evidence should identify the exact verification performed.

| Phase | Completed date | Verified by | Evidence |
| ----- | -------------- | ----------- | -------- |
| 0     | 2026-09-01     | ZCode audit | `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test -- --ci` all pass (10 suites / 94 tests; pure-TS suites run on the `jest-expo/node` preset with no React Native loaded). Exact pins verified with `npm ls`: `@esengine/ecs-framework@2.11.2`, `effect@4.0.0-rc.112`, `rot-js@2.2.1`. Boundary zones negative-tested: importing `rot-js` outside `src/game/rot` and `effect` inside `src/game` both fail `npm run lint`. Development builds produced on both platforms on 2026-09-01: `android/app/build/outputs/apk/debug/app-debug.apk` and the iOS simulator `.app` in Xcode DerivedData; launch workflow (incl. the JDK 17 Android override and iOS 26 simctl workaround) documented in README → "Native workflow", and SDK-compatible dependency installation in README → "Dependencies". |
| 2     | 2026-09-02     | ZCode audit + implementation | Full CI-parity suite green: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- --ci` — 15 suites / 120 tests, all content+RNG suites on `jest-expo/node` with no React Native/ECS/rot-js/Effect loaded (eslint zones also forbid `rot-js`/`effect` imports in `src/core` and `src/domain`). Exited criteria: seeded snapshot/restore + draw-count reproducibility property-tested (`__tests__/core/random/random-source.test.ts`); stream independence, per-stream derivation, and six-stream set (incl. new `enemyAi`) tested (`__tests__/domain/rng-streams.test.ts`); rot.js wrapper restore-on-failure tested (`__tests__/game/rot-random.test.ts`, `rot-dungeon-generator.test.ts`); all 15 bundled files validate through `BundledContentRepository` with cross-references, version literals, ranges, rates, and weights checked by `buildContentCatalog` (`__tests__/domain/content-catalog.test.ts`, `__tests__/data/bundled-content-repository.test.ts`); new fast-check property test proves corrupted references always fail naming file + id. Added: `tile-definitions`/`generation-profiles`/`pity-rules` schemas + starter data, banner→pity cross-refs, contiguous-tile-id validation, and a tile-definitions ↔ `TileId`/atlas-manifest contract test (`__tests__/game/tile-definitions.test.ts`). |

## Work Notes

Use this section for short, temporary handoff notes. Remove resolved notes after their evidence is captured in the relevant phase or completion log.

- 2026-09-02: Phase 2 implementation notes — most content/RNG work carried over from the earlier plan and re-verified; the deltas were: `enemyAi` added to `RNG_STREAM_NAMES` (Phase 3's enemy-intent system and Phase 4's AI decisions must draw from it, never from `combat`); new `tile-definitions` (numeric ids, contiguous-from-0 enforced by the catalog), `generation-profiles` (`floorStyle` enum currently only `'digger'` — Uniform/Cellular join in Phase 6), and `pity-rules` (rates in [0,1], soft-pity pair refinement) schemas plus starter data; `banner.pityRuleId` is an optional catalog-checked reference; `indexById` now accepts numeric ids so `tileDefinitions` indexes by tile id. Content/RNG layers stay rot-js-free — the module-RNG contract lives only in `src/game/rot/rot-random.ts`, where full synchronicity makes concurrent generation structurally impossible (nested calls unwind correctly). Content-schema extension point remains `contentFileSchemas` in `src/domain/content/schemas.ts` — adding a collection means: schema there, a file under `assets/data/`, an entry in `BundledContentRepository`, and a `validInput()` entry in the catalog test.

- 2026-09-02: Phase 1 second pass found and fixed a **production dispose bug**: on Android release cold start, the ticker `useEffect` re-ran ~17 ms after mount (React may legally drop a `useMemo` identity — the effect depended on the `presentation` memo object), and its cleanup disposed the ECS `Core` while the restarted ticker kept calling `Core.update()` on the destroyed singleton — logcat showed `Core实例未创建` every ~515 ms and the patrol simulation was dead while rendering stayed alive at 62 fps. Fix (`src/presentation/spike/render-spike-screen.tsx`): the lifecycle effect now depends only on the `useState`-held `controller`; `presentation` is read through a `useRef` refreshed by a separate effect. Verified on Android emulator release + dev and iOS simulator release (logcat clean, slimes patrol between screenshots, 62 fps / 16.7 ms in all three). Lesson generalized: **never put a `useMemo` object that gates a teardown-only cleanup into effect dependencies** — route owned lifecycles must depend on stable state identities only. Rebuild note: Android release needs both overrides this time — `ANDROID_HOME` in addition to the JDK 17 (`JAVA_HOME`/`GRADLE_OPTS`) override.
- 2026-09-02: Android emulator environment discovered present (Work Notes from 09-01 said none): `Medium_Phone`/`Medium_Tablet`/`7_Inch_tablet` AVDs exist with HVF acceleration; release APK installs and cold-starts cleanly via `adb install` + monkey launch. Emulator fps numbers are **not** physical-device evidence — the 62 fps on the emulator reflects the host Mac's GPU, not a baseline phone.
- 2026-09-01: Tracker re-baselined to the updated game plan (`@esengine/ecs-framework` + `rot-js` + `Effect`). All checkboxes reset and the completion log cleared. Work completed under the previous plan (bootstrap, rendering spike, content/RNG foundations) remains in the tree but must be re-verified against the reworked exit criteria — in particular, the old "pure TypeScript domain, headless combat state machine" conventions are superseded by the ECS run scene as source of truth.
- 2026-09-01: Phase 0 audit realignment — gameplay libraries pinned exactly (`@esengine/ecs-framework@2.11.2`, `effect@4.0.0-rc.112`, `rot-js@2.2.1`; RC upgrades are manual `package.json` edits, never caret bumps). ESLint zones rewritten to the new layering: `src/game` is the pure simulation (`@esengine/ecs-framework` allowed only there; `rot-js` only inside `src/game/rot/**`; Effect banned from `src/core`, `src/domain`, and `src/game`), and README → "Architecture" documents the same table. The renderer/asset spike code moved from `src/game/{render,assets}` to `src/presentation/canvas` (`__tests__/game/asset-manifest.test.ts` moved to `__tests__/presentation/` accordingly). The first `src/game/rot` adapter lands in Phase 1 (seeded rot.js generation wrapper).
- 2026-09-02: Phase 1 spike implemented. Simulation: `src/game/rot/rot-random.ts` (module-RNG save/seed/run/capture/restore, restore-on-throw tested), `src/game/rot/rot-dungeon-generator.ts` (Digger → project tile IDs, connectivity-validated, deterministic attempt seeds, typed `GenerationError`), `src/game/grid/dungeon-grid.ts`, `src/game/ecs/` (decorated components, PatrolSystem@100 → SpriteSystem@200 with a `sceneData` order log, `Core`+`Scene` lifecycle owned by the route; **one run = one Scene — the ECS Core is an app-wide singleton and must be `dispose()`d before the next run**), `src/game/projection/` (frozen `SceneSnapshot`). Application/bootstrap: `src/application/spike/spike-controller.ts`, `src/bootstrap/effect-runtime.ts` (`ManagedRuntime` + `startTicker`; the route interrupts the fiber on unmount — tested). Presentation: the spike screen renders the generated dungeon; legacy `demo-scene` deleted. Gotchas that cost time: tsconfig needs `experimentalDecorators` (babel-preset-expo already applies legacy decorators automatically); `effect` ships ESM-only, so the Jest `unit` project transforms it via `transformIgnorePatterns: ['node_modules/(?!effect/)']` (Metro handles it natively; the preset's default `import.meta` polyfill keeps Hermes safe); `useSpikePresentation` must return a memoized object or the route's lifecycle effect re-runs every render and disposes the scene.
- 2026-09-02: Phase 1 verification evidence — `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test -- --ci` all green (14 suites / 111 tests, including rot wrapper restore-on-failure, generator determinism/connectivity/attempt-limit, system order, seed determinism, projection immutability, and ticker interruption). `npx expo export --platform ios` bundles clean. iOS **debug** build launched on the iPhone 16 Pro simulator: dungeon renders, slimes patrol between screenshots, HUD reads 62 fps / 16.7 ms. iOS **release** build (`expo run:ios --configuration Release`, minified, no Metro) launched on the same simulator with identical rendering and fps — decorators, ECS, rot-js, Effect, and Skia all execute in production Hermes. Android `./gradlew assembleRelease` succeeded (`android/app/build/outputs/apk/release/app-release.apk`; run with the documented JDK 17 override plus `ANDROID_HOME`). Still open: physical-device frame-time measurement and Android on-device smoke (no Android emulator/device on this machine).
- 2026-09-01: Conventions from the earlier content/RNG work expected to carry into Phases 2/4, but verify before reuse: `deriveRngStreams(seed)` per-system streams (never share a stream), flat discriminated-union commands, `deepFreeze`d states, `SequenceRandomSource` for pinned rolls, and `contentFileSchemas` as the single content-schema extension point. The old "engine returns `{ state, events }`" pattern is replaced by the ECS scene plus exported event batches.
- 2026-09-01: Environment notes that remain true: Android builds require the JDK 17 override documented in README (user-global `~/.gradle/gradle.properties` pins Temurin 25, which breaks AGP's Prefab step); iOS 26 simulators block the first dev-client deep link behind a system confirmation — use the documented `simctl launch --args --initialUrl` workaround; `expo-dev-client` is installed; the two planning markdown files are excluded from Prettier via `.prettierignore`.
- 2026-09-01: Runtime note — the render spike fails with "Skia is unavailable in this runtime" under Expo Go (Expo Go no longer bundles Skia's native module). This is by design; always use development builds (`npx expo run:ios|android`). No canvaskit-wasm branch may enter the native bundle (Metro cannot tree-shake the deep import).
- 2026-09-01: Rendering/codegen gotchas likely still relevant: functions called inside worklets need the `'worklet'` directive and inner `Array.map` callbacks are not reliably auto-workletized — use plain loops; React Compiler's `react-hooks/immutability` rule cannot model Reanimated `.value` writes (centralize mutations with a scoped lint exemption); atlases are generated by `scripts/generate-spike-atlases.mjs` (deterministic, re-run after editing).
