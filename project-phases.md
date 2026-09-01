# Rebirth Dungeon Project Phases

This checklist turns [`react-native-expo-game-plan.md`](react-native-expo-game-plan.md) into an ordered implementation tracker for AI assistants. The phases are dependency-ordered: complete the earliest unfinished phase before starting later work unless the user explicitly changes the priority.

The project targets [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Check the exact SDK 57 documentation before adding or configuring Expo packages.

## Tracking Rules for AI Assistants

- `[ ]` means incomplete; `[x]` means implemented **and verified**.
- The first unchecked phase in the overview is the default phase to work on.
- A phase remains unchecked while any task or exit criterion is incomplete.
- Check tasks only after inspecting the implementation and running relevant tests or builds. Do not trust a stale checkbox by itself.
- Keep notes under partially completed or blocked phases. Include the date, blocker, and next action.
- When completing a phase, update the overview, its task checklist, the current-focus section, and the completion log in the same change.
- Record concrete evidence such as test commands, build targets, device checks, migration versions, or file paths.
- Preserve the dependency rule: presentation, renderer, and data layers may depend inward on application/domain code; the pure TypeScript domain must not import React, React Native, Expo, Skia, Reanimated, Zustand, SQLite, or provider SDKs.
- Add dependencies only when their phase begins. Use `npx expo install` where Expo supplies a compatible version.
- Do not mark a phase complete because a placeholder screen, mock, or happy-path demo exists when its exit criteria require production behavior.

## Current Focus

- **Current phase:** Phase 1 — Rendering architecture spike (in progress)
- **Status:** All spike work implemented and verified on simulator/emulator; **one task remains**: measure the on-screen frame-time meter on physical Android/iOS devices (including a mid-range Android target). Everything else is complete — see the Phase 1 checklist and work notes for evidence.
- **Next objective:** Install a development build on the baseline physical devices, read the HUD frame-time meter in the spike screen, record the numbers, then close Phase 1 and start Phase 2 (domain foundations).
- **Baseline inspected:** 2026-09-01
- **Known baseline:** Phase 0 complete (see completion log). Rendering baseline decided and documented (240×320 logical, 16 px tiles, integer device-pixel scaling, nearest-neighbor sampling). Layer folders now exist for `src/game` (config, scene, camera, sprites, assets, render) and `src/presentation/spike`.

## Phase Overview

- [x] Phase 0 — Project bootstrap and architecture baseline
- [ ] Phase 1 — Rendering architecture spike
- [ ] Phase 2 — Domain foundations and data-driven content
- [ ] Phase 3 — Deterministic dice combat engine
- [ ] Phase 4 — Playable combat vertical slice
- [ ] Phase 5 — Dungeon generation and complete run loop
- [ ] Phase 6 — Local persistence and deterministic recovery
- [ ] Phase 7 — Meta-game, progression, inventory, and economy
- [ ] Phase 8 — Local gacha prototype
- [ ] Phase 9 — Presentation polish, audio, haptics, and Rive
- [ ] Phase 10 — Authentication, backend, and cloud synchronization
- [ ] Phase 11 — Purchases and production-authoritative gacha
- [ ] Phase 12 — Quality, balance, performance, and accessibility
- [ ] Phase 13 — Release readiness and live operations

---

## Phase 0 — Project Bootstrap and Architecture Baseline

**Goal:** Create a reliable Expo SDK 57 foundation with enforceable architectural boundaries and a repeatable native-development workflow.

- [x] Initialize an Expo SDK 57 TypeScript project.
- [x] Configure Expo Router as the application entry point with typed routes.
- [x] Install the SDK-compatible navigation and animation baseline: Gesture Handler, Reanimated, and Worklets.
- [x] Replace or remove the `create-expo-app` example UI and assets that are not part of the game.
- [x] Establish the initial `app`/`src` structure for bootstrap, core, domain, application, data, game, stores, and presentation code; create folders only as features need them.
- [x] Define and document dependency-direction rules, including an automated boundary check where practical.
- [x] Install only the remaining spike dependencies: Skia, Zustand, Zod, Expo Asset, Expo Audio, Expo Haptics, and test tooling.
- [x] Configure formatting, linting, TypeScript checks, unit tests, and continuous integration.
- [x] Configure EAS development, preview, and production profiles.
- [x] Produce and launch development builds on both Android and iOS.

Exit criteria:

- The starter app launches through an Expo development build on Android and iOS.
- Formatting, linting, type checking, and the initial test suite pass from documented commands.
- A pure TypeScript domain module can be imported and tested without loading React Native or Expo.
- The repository documents how later assistants should install SDK-compatible Expo dependencies and verify native changes.

## Phase 1 — Rendering Architecture Spike

**Goal:** Prove the highest-risk rendering and animation boundary before investing in full game systems.

- [x] Choose and document the portrait logical resolution and base tile size.
- [x] Render one dungeon room from a Skia tile atlas using nearest-neighbor sampling.
- [x] Render animated player and monster sprites from atlas metadata.
- [x] Implement a small camera module with target focus, map clamping, logical-pixel snapping, and screen shake.
- [x] Place an accessible React Native HUD over the Skia canvas.
- [x] Use a Reanimated frame callback only for presentation state such as sprite clocks, interpolation, particles, and camera motion.
- [x] Keep authoritative positions and game outcomes out of Skia and Reanimated objects.
- [x] Preload critical assets through an asset manifest and fail clearly when an asset is missing.
- [ ] Measure frame time on representative physical Android and iOS devices, including a mid-range Android target.
  - 2026-09-01: The on-device frame-time meter (60 fps · 16.7 ms UI-thread worst frame) was verified on the iPhone 16 Pro simulator and Android Medium_Phone emulator, but **physical devices were not reachable from this environment**. Remaining action: run the dev build on a baseline physical Android (mid-range) and an iOS device and record the meter readings; the meter itself requires no further code.

Exit criteria:

- A development build displays a crisp, animated room with a working camera and native HUD on Android and iOS.
- The renderer consumes an immutable scene snapshot and cannot mutate gameplay state.
- The team is comfortable owning the required camera, scene, atlas, and sprite lifecycle without a full game engine.
- The spike meets an initial 60 fps budget on the supported baseline device or has a documented remediation plan.

## Phase 2 — Domain Foundations and Data-Driven Content

**Goal:** Establish deterministic, platform-independent rules and validated content models.

- [ ] Define shared IDs, immutable-update conventions, errors, engine results, commands, and domain events.
- [ ] Implement `RandomSource`, a serializable seeded generator, RNG snapshots/draw indexes, and a sequence-backed test fake.
- [ ] Derive separate RNG streams for dungeon generation, combat, loot, cosmetics, and gacha.
- [ ] Define typed and Zod-validated schemas for heroes, monsters, dice, abilities, status effects, items, equipment, loot tables, dungeons, encounters, banners, rarity tables, and experience curves.
- [ ] Add a minimal starter content set under `assets/data/`.
- [ ] Validate content versions, IDs, cross-references, ranges, rates, and weights during tests or a build step.
- [ ] Define repository interfaces in the domain/application boundary without importing concrete storage or network types.
- [ ] Add unit and property-based tests for randomness and content validation.

Exit criteria:

- Seed and restored RNG state reproduce the same random sequence.
- Every bundled content file passes validation; malformed or broken references fail with actionable paths.
- Domain tests run in a plain TypeScript environment with no React Native, Expo, Skia, or Zustand imports.
- Gameplay definitions can change through data rather than engine source edits.

## Phase 3 — Deterministic Dice Combat Engine

**Goal:** Implement a headless, replayable combat state machine before attaching presentation behavior.

- [ ] Model combat state, combatants, dice, abilities, targets, status effects, turn count, and explicit combat phases.
- [ ] Implement discriminated commands for start, roll, reroll, assign die, use ability, enemy action, and end turn.
- [ ] Implement state transitions for damage, healing, critical hits, shields, buffs/debuffs, status timing, victory, and defeat.
- [ ] Return a new state plus domain events for every valid command.
- [ ] Reject commands that are illegal for the current phase without corrupting state.
- [ ] Implement deterministic enemy decisions suitable for the first playable build.
- [ ] Add focused tests for phase transitions, edge cases, replay, and seeded repeatability.
- [ ] Add property tests for invariants such as nonnegative HP, valid dice ownership, and terminal-state behavior.

Exit criteria:

- A complete combat can run headlessly from start to victory or defeat.
- The same initial state, RNG state, and commands produce identical states and event logs.
- Critical, poison/status, shield, enemy-defeat, and player-defeat cases are tested.
- Combat contains no React, React Native, Expo, Zustand, Skia, Reanimated, audio, or haptics dependencies.

## Phase 4 — Playable Combat Vertical Slice

**Goal:** Connect the headless combat engine to real controls and presentation without compromising authority boundaries.

- [ ] Implement a focused combat controller/store with narrow selectors.
- [ ] Build the dice tray, health display, turn indicator, ability controls, and enemy targeting as React Native UI.
- [ ] Implement drag/drop die assignment with a non-drag tap alternative.
- [ ] Map combat domain events to explicit presentation events.
- [ ] Add a presentation queue for attack, damage-number, death, particle, and camera effects while committing authoritative state immediately.
- [ ] Gate inputs during required visual sequences without letting animation completion decide gameplay.
- [ ] Add initial SFX and haptic adapters behind application-facing interfaces.
- [ ] Support victory, defeat, retry, and return flows for a single encounter.
- [ ] Add integration tests covering command-to-store-to-presentation behavior.

Exit criteria:

- A player can finish one polished dice battle on Android and iOS.
- Skipping, delaying, or replaying presentation does not alter the combat result.
- High-frequency animation values do not write to Zustand every frame.
- Controls are usable with touch, screen readers, and a non-drag interaction.

## Phase 5 — Dungeon Generation and Complete Run Loop

**Goal:** Expand the combat slice into a deterministic dungeon run with traversal, encounters, rewards, and a boss.

- [ ] Model dungeon floors, rooms, doors, encounters, treasure, events, boss rooms, and run state in pure TypeScript.
- [ ] Implement seeded procedural floor topology with reachability guarantees.
- [ ] Create two or three hand-authored room templates and a Tiled JSON validation/conversion pipeline.
- [ ] Combine procedural topology with validated room templates.
- [ ] Implement room traversal, encounter entry, loot resolution, progression rewards, floor transitions, and boss completion.
- [ ] Render generated maps and encounter markers through immutable scene snapshots.
- [ ] Implement current-run controls for start, resume, abandon, defeat, and completion.
- [ ] Test generation validity, seed repeatability, reachability, reward legality, and full headless runs.

Exit criteria:

- A player can select a dungeon, traverse multiple rooms, fight encounters, defeat a boss, receive rewards, and finish or lose the run.
- Every generated floor is traversable and contains valid entry, encounter, and boss/exit structures.
- Replaying a seed and command sequence reproduces the same floor, combat, loot, and event log.
- Remote requests are not required during combat or dungeon generation.

## Phase 6 — Local Persistence and Deterministic Recovery

**Goal:** Persist permanent progress and active runs safely across app interruption and schema changes.

- [ ] Add Expo SQLite, Drizzle ORM, Drizzle Kit, and a tested migration workflow.
- [ ] Create normalized tables for profile, characters, inventory, currencies, equipment, progression, quests, pity, completed dungeons, and save metadata.
- [ ] Map database rows to domain types rather than leaking Drizzle types into the domain.
- [ ] Store the active dungeon run as a versioned JSON snapshot containing run state, combat state when applicable, content version, and complete RNG state/draw indexes.
- [ ] Validate loaded snapshots with Zod and implement explicit corrupt/incompatible-save behavior.
- [ ] Save at deliberate checkpoints and app-background events; debounce noncritical writes.
- [ ] Use transactions when committing run rewards or changing currency, ownership, inventory, or equipment.
- [ ] Store only small, noncritical preferences in `expo-sqlite/kv-store` or AsyncStorage.
- [ ] Add round-trip, interruption, corruption, atomicity, and migration tests from every shipped schema version.

Exit criteria:

- Permanent progression survives restart and an interrupted run resumes equivalently.
- Save/load preserves deterministic RNG and active combat when mid-combat saving is supported.
- At least one forward migration path is tested without deleting the database.
- Premium currency, ownership, pity, and active-run data are never treated as simple preferences.

## Phase 7 — Meta-Game, Progression, Inventory, and Economy

**Goal:** Build the durable player loop around dungeon runs.

- [ ] Create thin Expo Router routes and authenticated-area layouts for home, dungeon selection, characters, inventory, equipment, settings, gacha, shop, and run results.
- [ ] Implement focused Zustand stores/controllers for account, player, inventory, current run, combat, gacha, and settings.
- [ ] Use narrow selectors and keep dialog/form-only state local to components.
- [ ] Implement character ownership, leveling, experience curves, and derived combat stats.
- [ ] Implement item stacking, equipment slots, equip/unequip validation, and loadouts.
- [ ] Implement currencies, costs, grants, sinks, and validated economy transactions.
- [ ] Apply run loot and experience exactly once through an atomic run-result transaction.
- [ ] Add loading, empty, error, and recovery states for every meta-game screen.
- [ ] Add a Rive or temporary reward/level-up sequence that consumes already-known results.

Exit criteria:

- The full local loop works: prepare a character, start a run, finish it, apply rewards once, improve the loadout, and start another run.
- Invalid, duplicate, negative, and unaffordable economy operations are rejected and tested.
- Route files remain thin and no single store owns unrelated application areas.
- Equipment and progression affect subsequent combat only through domain rules.

## Phase 8 — Local Gacha Prototype

**Goal:** Prove banner, pity, reward, and interruption behavior behind a repository that can later become remote.

- [ ] Model versioned banners, server-style availability inputs, costs, rates, featured units, pity, guarantees, and duplicate conversion.
- [ ] Define `GachaRepository` and implement a local seeded repository for development only.
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

## Phase 9 — Presentation Polish, Audio, Haptics, and Rive

**Goal:** Replace prototype presentation with production-quality assets and feedback while respecting settings and performance budgets.

- [ ] Replace temporary art with organized sprite sheets/atlases and validated metadata.
- [ ] Add sprite animations, pixel VFX, bounded particle pools, floating text, transitions, and screen feedback.
- [ ] Implement `AudioService` with preloading, music/SFX channels, volume, lifecycle handling, and graceful failures.
- [ ] Implement `HapticsService` and map presentation events through user settings.
- [ ] Add Rive summon, reward, rarity-reveal, level-up, loading, or menu sequences where they improve the experience.
- [ ] Keep heroes, monsters, dungeon objects, attacks, and pixel VFX in Skia rather than Rive unless an exception is documented.
- [ ] Implement music, SFX, haptics, graphics, language, reduced-motion, and accessibility preferences.
- [ ] Verify logical scaling, safe areas, atlas sampling, and pixel clarity on small phones, tall phones, tablets, and high-refresh displays.

Exit criteria:

- Audio, haptics, Rive, and optional effects can be disabled without changing game state.
- Critical assets are preloaded before dungeon entry and no visible fetch occurs after the transition starts.
- UI remains legible and pixel-crisp across supported sizes and densities.
- Presentation remains within the established frame-time and memory budgets.

## Phase 10 — Authentication, Backend, and Cloud Synchronization

**Goal:** Introduce production services without coupling game rules or UI to a specific provider.

- [ ] Finalize provider-neutral `AuthRepository`, session models, and route guards; retain guest mode where product requirements allow it.
- [ ] Implement `TokenStorage` with Expo SecureStore for small session secrets only.
- [ ] Choose and integrate the production identity provider behind the repository.
- [ ] Add a remote data layer and TanStack Query for server-cache/request state.
- [ ] Define versioned API contracts, runtime validation, error mapping, retries, cancellation, and idempotency behavior.
- [ ] Design and implement a cloud-save/sync strategy with explicit conflict resolution and content/save compatibility rules.
- [ ] Hydrate sessions before initial routing to avoid incorrect route flashes.
- [ ] Add privacy-conscious analytics, crash reporting, and remote configuration boundaries.

Exit criteria:

- Provider SDK types and APIs do not escape the data layer.
- Expired session, offline, retry, conflict, sign-out, and account-switch behavior are tested.
- Local and cloud saves cannot silently overwrite newer progress.
- Secrets are not stored in SQLite game tables, preferences, logs, or source control.

## Phase 11 — Purchases and Production-Authoritative Gacha

**Goal:** Make commerce and paid-resource rewards server-verified, idempotent, auditable, and recoverable.

- [ ] Choose RevenueCat or `expo-iap` and document the backend/operations tradeoff.
- [ ] Implement `PurchaseRepository` behind the selected provider.
- [ ] Handle product loading, purchase pending, success, failure, cancellation, restore, and interrupted flows.
- [ ] Verify store transactions on the backend or through RevenueCat before granting premium value.
- [ ] Implement idempotent server-side grants and authoritative balance refresh.
- [ ] Replace local production gacha with a remote repository using server time and server-side randomness.
- [ ] Return pull results, updated currency, pity, ownership, banner version, and audit/receipt ID atomically.
- [ ] Test store sandboxes, duplicate callbacks, retries, restores, revoked purchases, and app interruption.

Exit criteria:

- The client cannot grant premium currency or paid rewards from a local callback or local RNG.
- Retrying a purchase or gacha request cannot double-charge or double-grant.
- Purchase restore and interrupted-transaction recovery work on Android and iOS store test accounts.
- Production pull history and pity updates are server-authoritative and auditable.

## Phase 12 — Quality, Balance, Performance, and Accessibility

**Goal:** Turn the feature-complete build into a stable, measurable, inclusive release candidate.

- [ ] Complete domain coverage for combat, status effects, loot, generation, progression, economy, persistence, and gacha.
- [ ] Add application/controller, repository, migration, presentation-mapping, route, and critical end-to-end tests.
- [ ] Add seeded simulations for combat balance, loot distribution, dungeon generation, and gacha-rate invariants.
- [ ] Define and enforce budgets for startup, dungeon entry, command execution, frame time, memory, snapshots, and React rerenders.
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

## Phase 13 — Release Readiness and Live Operations

**Goal:** Ship safely with tested platform configuration, compliance, monitoring, rollback, and compatibility procedures.

- [ ] Finalize identifiers, signing, EAS profiles, icons, splash assets, permissions, entitlements, and store metadata.
- [ ] Define Expo Update runtime-version policy and prevent OTA bundles from assuming unavailable native modules.
- [ ] Test migration and resume behavior from the previous production binary and content version.
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

| Milestone            | Required phases | Outcome                                                          |
| -------------------- | --------------: | ---------------------------------------------------------------- |
| Architecture proven  |             0–1 | Native workflow and renderer risk retired                        |
| Headless game proven |             2–3 | Deterministic content and combat rules                           |
| First playable       |             4–5 | Complete local dungeon run                                       |
| Local MVP            |             6–9 | Persistence, meta-game, local gacha, and polished presentation   |
| Production candidate |           10–12 | Online services, verified commerce, and release-quality behavior |
| Public release       |              13 | Store-ready build with operational safeguards                    |

## Open Decisions

Resolve each decision in the phase where it becomes necessary; do not block earlier phases prematurely.

| Decision                                               | Needed by | Status | Resolution/evidence                        |
| ------------------------------------------------------ | --------: | ------ | ------------------------------------------ |
| Logical game resolution and tile size                  |   Phase 1 | Open   | —                                          |
| Supported baseline Android/iOS devices                 |   Phase 1 | Open   | —                                          |
| AsyncStorage vs `expo-sqlite/kv-store` for preferences |   Phase 6 | Open   | Prefer SQLite KV if SQLite is already core |
| Production authentication provider                     |  Phase 10 | Open   | Repository boundary must be defined first  |
| Cloud-save conflict policy                             |  Phase 10 | Open   | —                                          |
| RevenueCat vs `expo-iap`                               |  Phase 11 | Open   | —                                          |
| Launch regions and gacha compliance scope              |  Phase 13 | Open   | —                                          |

## Completion Log

Add one row only when a phase is fully complete. Evidence should identify the exact verification performed.

| Phase | Completed date | Verified by | Evidence                                                                                                                                                                                                                                                                                              |
| ----- | -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | 2026-09-01     | ZCode agent | Quality gates pass locally: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- --ci` (2 suites / 6 tests). `npx expo-doctor` 21/21; `npx expo install --check` clean; `expo prebuild` succeeds for iOS and Android. Dev builds launched and rendered on iPhone 16 Pro simulator (Metro `iOS Bundled`) and Android Medium_Phone emulator (`Android Bundled 3659ms`, 1807 modules). Boundary rules verified: probe file importing `react-native`/`zustand` in `src/domain` fails `npm run lint` with layer messages. Pure-layer test proven via `src/core/utils/result.ts` under the `jest-expo/node` project (plain Node environment). |

## Work Notes

Use this section for short, temporary handoff notes. Remove resolved notes after their evidence is captured in the relevant phase or completion log.

- 2026-09-01: Phase 0 complete. Notes for Phase 1: Android builds on this machine require the JDK 17 override documented in README (user-global `~/.gradle/gradle.properties` pins Temurin 25, which breaks AGP's Prefab step); iOS 26 simulators block the first dev-client deep link behind a system confirmation — use the documented `simctl launch --args --initialUrl` workaround for headless launches. `expo-dev-client` was added during Phase 0 verification (starter did not include it). The two planning markdown files are excluded from Prettier via `.prettierignore`.
- 2026-09-01: Phase 1 spike implemented. Evidence: dev builds on iPhone 16 Pro simulator (Zoom ×5, "62 fps · 0.0 ms") and Android Medium_Phone emulator (Zoom ×4, "62 fps · 16.7 ms") render the room, animated hero + patrolling slimes, working camera (Follow toggle pans/clamps), zoom cycling, and shake. HUD interactions exercised over adb (`input tap`): follow toggle + zoom cycle confirmed by screenshots. Quality gates: format/lint/typecheck clean, 40 tests pass across the `unit` and `ui` Jest projects. Two gotchas recorded in code comments: (1) functions called inside worklets need the `'worklet'` directive and inner `Array.map` callbacks are not reliably auto-workletized — use plain loops (`src/game/camera/camera-math.ts`, `src/game/render/use-spike-presentation.ts`); (2) React Compiler's `react-hooks/immutability` rule cannot model Reanimated `.value` writes — mutations are centralized in `useSpikePresentation` with a scoped lint exemption. Atlases are generated by `scripts/generate-spike-atlases.mjs` (re-run after editing; deterministic).
