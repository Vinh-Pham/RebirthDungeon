# Rebirth Dungeon Implementation Phases

This checklist converts `dart-game-plan.md` into an implementation sequence. Phases are ordered by dependency; later phases should not begin until their required earlier phases are stable.

## How AI Assistants Should Use This File

- `[ ]` means the phase is not complete.
- `[x]` means every completion criterion for the phase has been implemented and verified.
- Update the phase checkbox only after running the relevant tests and checks.
- If a phase is partially implemented, leave its phase checkbox unchecked and check only its completed tasks.
- Add a short note under a phase when work is intentionally deferred or blocked.
- Keep pure-Dart game rules independent of Flutter and Flame throughout every phase.

## Phase Overview

- [ ] Phase 0 — Project bootstrap and engineering baseline
- [x] Phase 1 — Core domain foundations and deterministic randomness
- [x] Phase 2 — Data-driven game content
- [ ] Phase 3 — Dice combat engine
- [ ] Phase 4 — Dungeon generation and run model
- [ ] Phase 5 — Flutter application shell and Riverpod orchestration
- [ ] Phase 6 — Flame dungeon presentation and event bridge
- [ ] Phase 7 — Playable vertical slice
- [ ] Phase 8 — Local persistence and save recovery
- [ ] Phase 9 — Progression, inventory, equipment, and economy
- [ ] Phase 10 — Local gacha prototype
- [ ] Phase 11 — Presentation polish, audio, and Rive
- [ ] Phase 12 — Authentication, purchases, and production gacha boundaries
- [ ] Phase 13 — Testing, balancing, performance, and accessibility
- [ ] Phase 14 — Release readiness and future online services

---

## Phase 0 — Project Bootstrap and Engineering Baseline

- [x] Create the Flutter project and the initial feature-oriented `lib/` and `test/` structure.
- [x] Add only the first-prototype dependencies: Flame, Riverpod, go_router, Freezed/JSON serialization, Drift, SharedPreferences, Rive, and Flame Audio.
- [x] Configure code generation, static analysis, formatting, and test commands.
- [x] Establish the architectural boundaries between presentation, application, domain, data, and Flame game code.
- [x] Add a minimal continuous-integration check for analysis and tests.

Note (2026-08-31): `flame_riverpod` was omitted from the dependency set — its
current release pins Riverpod 2.x, which conflicts with the Riverpod 3 /
Freezed 3 toolchain and with `riverpod_generator`. The Phase 6 event bridge
will use plain stream subscriptions instead; revisit this package then.
Toolchain: `mise.toml` pins dart 3.13.1 / flutter 3.47.0-stable for this
project, and the `Makefile` resolves `dart` from the active Flutter SDK so
formatting and codegen always match the app's Dart version. See
`ARCHITECTURE.md` for layer rules and `tool/check_architecture_boundaries.dart`
for their enforcement.

Completion criteria:

- The app builds and launches on every initially supported platform.
- Code generation, formatting, static analysis, and the empty test suite run successfully.
- Domain code can be imported without importing Flutter or Flame.

## Phase 1 — Core Domain Foundations and Deterministic Randomness

- [x] Define shared identifiers, value objects, failures, and immutable model conventions.
- [x] Implement `RandomSource`, a seeded implementation, and a controllable fake for tests.
- [x] Keep combat RNG and gacha RNG as separate dependencies.
- [x] Define the base command/result/event pattern used by domain engines.
- [x] Define time and ID abstractions where deterministic tests require them.

Note (2026-08-31): foundations live in `lib/core/` (`random/`, `time/`,
`ids/`, `errors/`, `engine/`, `value_objects/`). Channel separation is done
with `deriveSeed(rootSeed, 'combat' | 'gacha')` so a run keeps a single root
seed while subsystem streams stay independent. Model conventions are
documented in `lib/domain/README.md`.

Completion criteria:

- Seeded randomness produces repeatable results.
- Tests can supply exact random values without using `Random()` directly.
- No domain engine depends on platform or rendering packages.

## Phase 2 — Data-Driven Game Content

- [x] Define serializable schemas for heroes, monsters, dice, abilities, status effects, items, loot tables, dungeons, banners, rarity rates, and experience curves.
- [x] Add a small starter content set under `assets/data/`.
- [x] Implement content loading, validation, ID/reference resolution, and useful validation errors.
- [x] Version content formats that may change after saves exist.
- [x] Add validation tests for malformed data and broken references.

Note (2026-08-31): schemas live in `lib/domain/content/` (freezed +
json_serializable, enums serialized by name). Every content file is wrapped
as `{ "schemaVersion": 1, "entries": [...] }`; the supported version is
`GameContent.currentSchemaVersion`. `GameContent.parse` takes already-decoded
JSON per file (pure Dart) and fails with one aggregated `DomainException`
whose details list every issue with a `file[index].field` path. Rates are
weight-based; banner availability windows are ISO-8601 and order-checked.
Reading assets via rootBundle is deferred to the Phase 5 application wiring;
`test/domain/content/starter_content_test.dart` already exercises the shipped
`assets/data/` files end-to-end.

Completion criteria:

- Gameplay entities can be created from data rather than hardcoded engine values.
- All bundled starter content passes validation.
- Invalid IDs, rates, ranges, and references fail with actionable errors.

## Phase 3 — Dice Combat Engine

- [ ] Model immutable `CombatState`, combatants, dice pools, abilities, buffs, debuffs, turns, and combat phases.
- [ ] Implement commands for starting combat, rolling, rerolling, assigning dice, using abilities, ending turns, and enemy actions.
- [ ] Implement damage, healing, critical hits, shields, defeat, victory, and status-effect timing.
- [ ] Return updated state plus domain events for every resolved command.
- [ ] Implement deterministic enemy decision logic suitable for the first prototype.
- [ ] Add focused unit tests for rules, phase transitions, illegal commands, and edge cases.

Completion criteria:

- A complete combat can run headlessly from start to victory or defeat.
- The same starting state, commands, and random seed always produce the same state and events.
- Critical-hit, poison, shield, enemy-defeat, and player-defeat cases are covered by tests.

## Phase 4 — Dungeon Generation and Run Model

- [ ] Model dungeons, rooms, doors, encounters, treasure, events, floors, and boss rooms in pure Dart.
- [ ] Implement seeded procedural topology generation.
- [ ] Support hand-authored room templates if the prototype requires them.
- [ ] Model an immutable, serializable `DungeonRunState` containing the seed and current progress.
- [ ] Implement encounter and loot resolution using injected randomness.
- [ ] Add tests for generation validity, reachability, and seed repeatability.

Completion criteria:

- A seed generates a valid traversable dungeon with an entry, encounters, and an exit or boss.
- Reusing a seed produces the same dungeon.
- A run can advance through rooms without Flame or Flutter dependencies.

## Phase 5 — Flutter Application Shell and Riverpod Orchestration

- [ ] Create app routes for splash, login/guest entry, home, dungeon selection, game, characters, inventory, gacha, shop, and settings.
- [ ] Configure `go_router`, including placeholder guards and deep-link-safe route parameters.
- [ ] Create focused Riverpod providers/controllers for account, current run, combat, inventory, progression, gacha, shop, and settings.
- [ ] Keep long-lived game state in Riverpod/application state and transient visual state out of it.
- [ ] Implement loading, empty, and error states for the initial screens.

Completion criteria:

- All major screens are reachable through Flutter navigation.
- Controllers invoke pure-Dart engines and expose immutable state.
- No single global provider owns unrelated areas of game state.

## Phase 6 — Flame Dungeon Presentation and Event Bridge

- [ ] Create `DungeonGame`, `DungeonWorld`, a fixed-resolution camera, and initial world components.
- [ ] Establish a consistent tile size, integer-aligned world positions, and nearest-neighbor pixel rendering.
- [ ] Render player, monsters, rooms, chests, and environment from domain/application state.
- [ ] Translate domain events into presentation events through a dedicated bridge.
- [ ] Implement initial attack, damage-number, death, particle, camera, and screen-shake effects.
- [ ] Ensure Flame components never calculate authoritative combat outcomes.

Completion criteria:

- Flame renders a domain-generated room and reacts to combat events.
- Rebuilding or replaying presentation does not change gameplay results.
- Sprite positions and animation timers stay inside Flame rather than Riverpod.

## Phase 7 — Playable Vertical Slice

- [ ] Combine Flutter overlays with the Flame canvas for dice, abilities, health, turn state, and combat actions.
- [ ] Implement drag/drop or tap assignment of dice to abilities.
- [ ] Connect dungeon selection, room traversal, one or more encounters, loot, a boss, and run completion.
- [ ] Add a minimal home screen, character loadout, inventory view, and run-result screen.
- [ ] Handle victory, defeat, retry, abandon-run, and return-home flows.

Completion criteria:

- A player can start a run, traverse a small dungeon, fight with dice, receive loot, and finish or lose the run.
- Gameplay rules remain correct when animations are skipped or delayed.
- The complete slice works without authentication, purchases, or a remote server.

## Phase 8 — Local Persistence and Save Recovery

- [ ] Configure Drift and migrations for player profile, characters, inventory, currencies, equipment, progression, quests, pity, completed dungeons, and save metadata.
- [ ] Store the active dungeon run as a versioned snapshot rather than fully normalized tables.
- [ ] Use transactions for atomic progression, loot, currency, and inventory changes.
- [ ] Store only UI preferences such as audio, language, haptics, graphics, and tutorial state in SharedPreferences.
- [ ] Implement autosave, resume, schema migration, corrupt-save handling, and recovery behavior.

Completion criteria:

- Permanent progress survives restart.
- An interrupted active run resumes to an equivalent state.
- Save/load round trips and at least one migration path are covered by tests.
- Premium currency, ownership, pity, and critical run data are never stored in SharedPreferences.

## Phase 9 — Progression, Inventory, Equipment, and Economy

- [ ] Implement character ownership, leveling, experience curves, and stat calculation.
- [ ] Implement inventory, item stacking, equipment slots, equip/unequip rules, and derived stats.
- [ ] Implement loot rewards and durable run-result application.
- [ ] Define currencies, costs, grants, sinks, and validation rules in an economy domain.
- [ ] Build usable character, inventory, equipment, and progression screens.

Completion criteria:

- Loot and experience earned in a run update permanent progression exactly once.
- Equipment changes affect subsequent combat through domain rules.
- Invalid, duplicate, negative, or unaffordable economy operations are rejected and tested.

## Phase 10 — Local Gacha Prototype

- [ ] Model versioned banners, availability, costs, featured units, rarity rates, pity rules, and guarantees.
- [ ] Define `GachaRepository` and implement a local repository backed by a pure-Dart `GachaEngine`.
- [ ] Implement single and ten-pull flows with separate injected RNG.
- [ ] Persist pity and featured-guarantee state transactionally with currency spending and reward grants.
- [ ] Convert duplicate rewards according to an explicit, data-driven rule.
- [ ] Build banner, confirmation, pull-result, and collection-update UI.

Completion criteria:

- Rate, pity, guarantee, reset, insufficient-currency, and duplicate cases are tested.
- Pulls atomically spend currency, update pity, and grant valid rewards.
- The UI depends only on `GachaRepository`, allowing a remote implementation later.

## Phase 11 — Presentation Polish, Audio, and Rive

- [ ] Replace temporary images with sprite sheets or atlases and organize production asset directories.
- [ ] Add sprite animations, pixel VFX, transitions, feedback, and performance-conscious particles.
- [ ] Implement `AudioService` and map presentation events to music and SFX.
- [ ] Add Rive UI animations for summon sequences, rarity reveals, level-up moments, loading, or menus where they add value.
- [ ] Add settings for music, SFX, haptics, language, and graphics.
- [ ] Verify scaling and pixel clarity across supported aspect ratios and display densities.

Completion criteria:

- Game-world character animation remains sprite-based unless there is a documented exception.
- Audio and animation can be disabled without changing domain behavior.
- UI remains legible, responsive, and pixel-crisp on target device sizes.

## Phase 12 — Authentication, Purchases, and Production Gacha Boundaries

- [ ] Define provider-neutral `AuthRepository`, `TokenStorage`, and account-session models.
- [ ] Implement guest authentication before choosing a production identity provider.
- [ ] Store tokens and session secrets through `flutter_secure_storage`, not the game database or preferences.
- [ ] Define `PurchaseRepository` and integrate `in_app_purchase` behind it.
- [ ] Implement purchase loading, pending, success, failure, cancellation, and restore flows without client-authoritative currency grants.
- [ ] Define remote API contracts for purchase verification, server-authoritative gacha, cloud saves, and account sync.
- [ ] Replace local gacha with a remote repository before using real-money-derived currency in production.

Completion criteria:

- UI and application layers do not call provider SDKs directly.
- Premium rewards are granted only after server verification.
- Production gacha results and pity updates are server-authoritative and auditable.
- Offline, expired-session, retry, and idempotency behavior is specified and tested at repository boundaries.

## Phase 13 — Testing, Balancing, Performance, and Accessibility

- [ ] Complete domain tests for combat, status effects, loot, dungeon generation, progression, economy, and gacha.
- [ ] Add application/controller, repository, migration, widget, and critical end-to-end tests.
- [ ] Add seeded simulations for combat balance, loot distribution, dungeon generation, and gacha-rate verification.
- [ ] Profile frame time, memory, asset loading, startup, database work, and battery-sensitive behavior on target devices.
- [ ] Add accessibility labels, scalable text handling, reduced-motion behavior, color-safe indicators, and non-drag alternatives.
- [ ] Add structured logging and privacy-conscious crash/error reporting hooks.

Completion criteria:

- The critical start-run-to-result and pull-to-inventory flows have automated coverage.
- Statistical simulations fall within documented tolerances.
- No known release-blocking correctness, accessibility, or performance issues remain.
- Analysis, tests, and release builds pass in continuous integration.

## Phase 14 — Release Readiness and Future Online Services

- [ ] Finalize platform configuration, signing, package metadata, icons, launch assets, permissions, and store disclosures.
- [ ] Verify data migration, backup/recovery, purchase restore, offline behavior, and account deletion/export requirements.
- [ ] Add privacy policy, terms, gacha probability disclosures, age-rating information, and regional compliance materials as required.
- [ ] Run closed testing, capture feedback, triage launch blockers, and complete a release checklist.
- [ ] Document operational plans for cloud saves, live events, analytics, remote configuration, social features, and content updates.
- [ ] Document rollback, compatibility, and content-versioning procedures.

Completion criteria:

- Signed release builds pass smoke tests on supported platforms and representative physical devices.
- Store, privacy, purchase, and probability-disclosure requirements are satisfied for target regions.
- Monitoring, support, rollback, and save/content compatibility plans exist before public launch.

---

## Recommended Milestones

- **Architecture milestone:** Phases 0–2 complete.
- **Headless gameplay milestone:** Phases 3–4 complete.
- **First playable milestone:** Phases 5–7 complete.
- **Local MVP milestone:** Phases 8–11 complete.
- **Production candidate milestone:** Phases 12–14 complete.

## Completion Log

Record phase completion here so later assistants can quickly identify when and why a checkbox changed.

| Phase | Completed date | Verified by | Evidence or notes |
|---|---|---|---|
| Phase 0 | 2026-08-31 (tasks) | ZCode assistant | All five tasks done and verified: `make check` green (format, `flutter analyze` no issues, boundary check, `flutter test` 1/1); builds verified — macOS debug `.app` (launched and quit cleanly), Android debug APK, iOS simulator Runner.app. Phase box intentionally left unchecked: Linux/Windows builds could not be verified on this macOS host (and `riverpod_generator` codegen path is exercised but no generated models exist until Phase 1+). Check the phase box after verifying Linux/Windows builds on a compatible host or in CI. |
| Phase 1 | 2026-08-31 | ZCode assistant | All five tasks done. Foundations in `lib/core/`: `RandomSource` + `SeededRandomSource` + `FakeRandomSource` + `deriveSeed` (combat/gacha channel separation), `TimeSource`/`IdGenerator` abstractions with fakes, `ContentId` convention, `Failure` union (freezed) + `DomainException`, `GameCommand`/`GameEvent`/`EngineResult`/`DomainEngine` contracts, `IntRange` value object (json_serializable). 54 tests green; `flutter analyze` clean; boundary check scans 12 pure-Dart files. Seeded repeatability, exact-value faking, and platform-free domains are covered by tests in `test/core/`. |
| Phase 2 | 2026-08-31 | ZCode assistant | All five tasks done. 11 schema types in `lib/domain/content/`; starter content set (2 heroes, 4 monsters incl. a boss, 2 dice, 6 abilities, 2 status effects, 4 items, 2 loot tables, 1 dungeon, 1 banner, 1 rarity table, 1 xp curve) under `assets/data/`, declared in pubspec and validated by a rootBundle-based test. `GameContent.parse` validates ids, cross-table references, weights, ranges, banner dates, and schemaVersion, aggregating all failures with `file[index].field` paths. 86 tests green; `flutter analyze` clean; boundary check scans 47 pure-Dart files. |
| Phase 1 |  |  |  |
| Phase 2 |  |  |  |
| Phase 3 |  |  |  |
| Phase 4 |  |  |  |
| Phase 5 |  |  |  |
| Phase 6 |  |  |  |
| Phase 7 |  |  |  |
| Phase 8 |  |  |  |
| Phase 9 |  |  |  |
| Phase 10 |  |  |  |
| Phase 11 |  |  |  |
| Phase 12 |  |  |  |
| Phase 13 |  |  |  |
| Phase 14 |  |  |  |
