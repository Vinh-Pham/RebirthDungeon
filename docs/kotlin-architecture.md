# Kotlin architecture and current ownership

This is the architecture contract for RebirthDungeon.Ktx. The user removed the earlier `game-plan.md`, `directory.md`, `project-phases.md` and `free-exploration.md`; their accepted simulation boundaries and unmet platform gates continue here. Browser/TypeScript implementation descriptions elsewhere are reference material and do not describe this runtime.

## Packages and time

Keep the Gradle `core`, `lwjgl3`, `android` and `ios` modules. Shared production code lives under `core/src/main/kotlin/cloud/vinh/rebirthdungeon`; tests mirror it under `core/src/test/kotlin`. Create feature packages only when used. Keep data under `assets/data`, test fixtures under test resources and offline tools outside shipped code. Shared Kotlin targets Java 8 APIs and bytecode despite the JDK 25 build daemon.

- `bootstrap` wires content, storage, sessions, workers and screens.
- `application/session/SessionCoordinator` owns town/expedition state, supplies, pending rewards, exploration and battle entry/exit. It is the sole complete-session persistence owner.
- `application/run/BattleController` serializes battle requests and automatic work, checkpoints each accepted command, and publishes only saved observations/events.
- `game` contains pure deterministic values/rules, fixed-point 60 Hz exploration, and one artemis World per encounter. No Gdx, I/O, clock or dependency on application/data/presentation/platform services.
- `game/turns` owns fixed round order; `game/combat/abilities`, `stats` and `statuses` own eligibility, costs, effects and enemy command selection. ECS systems remain visibly ordered under `game/ecs/systems`.
- `game/events`, `projection` and `replay` own immutable events, separate observed/full-restore exports and canonical deterministic state. Stable project IDs identify actors, never ECS indices.
- `data/content` strictly loads Jackson DTOs into validated definitions. `data/save/codec` uses LibGDX JSON primitive records; save types do not enter game rules.
- `presentation/screens`, `hud`, `input`, `animation` and `audio` render committed observations and submit requests. Screens do not own sessions or a second mutable combat model. Animation, frame rate and Skip never advance rules.
- `platform` contains shared native interfaces; implementations belong to launchers. Future progression owns learning/ranks/training; inventory owns item identity; application profile transactions will commit their combined results. These features must not create independent save paths.

Exploration uses project-owned continuous polygon navigation and fixed ticks. Battle freezes exploration and advances only through commands. World processing and application mutation remain serial on the render thread. Worker results return through `Gdx.app.postRunnable` with generation-token validation. No recursive `World.process`, interval-system battle timer or per-frame battle mutation.

## Battle and dependencies

The ordered pipeline is validation → turn start → ability/payment → damage/effects → owner-end status work → casualty reporting → finalization. Pure calculations are shared with the UI and enemy policy. Fixed order is captured by descending Speed with one seeded shuffle per tie group; every living actor acts once per round. The complete behavior is in [battle.md](gameplay/battle.md).

Use existing artemis-odb, Juniper AceRandom, Jackson, KTX/Scene2D and JUnit. No new dependency was needed for this rework. Retain reviewed pins, locks, checksum verification, native matching and graph exclusions. `game/squidsquad/AceRandomSource.kt` is a historical package name for the Juniper adapter; it does not reintroduce SquidSquad. RNG generation/AI/combat/loot stream tags and five-word restore formats remain stable.

## Saves and failures

Only new saves are supported. Versions: content schema/content/rules **3/4/3**, session payload **4**, nested battle **3**, combat record **2**, checksum envelope **2**. HP/MP are integers. Resource SP amounts use `spTenths`; stat catalog `max_sp` and `regen_sp` remain whole-SP stats and convert once at the resource boundary. Percentage modifiers use the separate `CostPercent` basis-point value, never SP units.

Alternating `session-a.json`/`session-b.json` bundles retain checksums, monotonically increasing revisions, semantic validation and read-back checks. Invalid compatible slots may fall back to a valid compatible slot. Unsupported versions abort without overwriting either file or silently choosing an older incompatible format.

A battle command resolves once into the mutable World, then freezes its pending export. Failed writes block dependent work and retain the prior committed view. Retry saves that result without reapplying commands, costs, item consumption or RNG. Session-owned supply changes share the battle checkpoint. Entry and terminal reward/return transitions build detached candidates and publish only after the complete session write succeeds. A terminal checkpoint can resume the transition once after a process restart. Loot RNG and rewards commit together.

Battle events carry battle, round, turn, operation and sequence identity. The active history retains at most 100 events, removing oldest whole operations and marking truncation. The final retained history also survives return in `lastBattleEvents`; it is not a per-character archive. Render/audio consumers deduplicate sequences within battle identity and skip replaying old effects when reopening a screen.

Town exploration still uses one temporary gold balance, bounded potion supplies and free recovery. Dungeon gold/loot remain pending until a successful exit; defeat discards pending rewards. Full inventory/banking, quests/RP and progression are explicitly deferred. Their future transactions must reuse the same application-owned complete-bundle boundary.

## Queue and acceptance

[The turn-based plan](turn-based-plan.md) is the current queue. Checked items require implementation and scoped evidence. Keep historical phase completion historical. [Verification](evidence/turn-based/verification.md) distinguishes JVM checks, desktop interaction, Android packaging, simulator/AOT and physical-device/release gates. Never describe Kotlin compilation as an iOS build or packaging as touch/lifecycle acceptance.
