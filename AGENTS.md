# AGENTS.md

Guidance for AI assistants working in this repository.

## What this project is

**RebirthDungeon** (JVM package `cloud.vinh.rebirthdungeon`) is a 2D pixel-art, grid-based, turn-based roguelike dungeon crawler with **five-dice dice combat**, loot, progression, and a later gacha meta-game. It is built in **Kotlin** with **libGDX** (project scaffolded with gdx-liftoff in Java, fully ported to Kotlin after Phase 1). Combat is inspired by Dicero (roll five dice, keep, reroll, commit a hand); progression, inventory, skills, enchants, quests, and titles are inspired by Mabinogi. The references are design inspiration, not literal requirements.

Two principles shape everything:

1. **Determinism.** The same initial state + content version + rules version + command sequence must reproduce identical outcomes regardless of frame rate. Commands advance the *simulation*; frames advance only *presentation*.
2. **A hard simulation/presentation boundary.** Code under `.../game/` (the deterministic simulation) must **never import `com.badlogic.gdx`** or touch Scene2D, `AssetManager`, file I/O, networking, or platform SDKs. This is enforced by the `checkSimulationBoundary` Gradle task (in `core/build.gradle.kts`) via `./gradlew :core:check`.

## Documentation map (read before designing anything)

| Document | Role |
|---|---|
| `docs/game-plan.md` | **The architecture contract.** Dependency audit, system ownership, threading model, artemis-odb world model, ordered rule pipeline, grid/dice/combat contracts, persistence, target package structure, validation matrix, milestones. |
| `docs/project-phases.md` | **The implementation tracker.** 17 phases (0–16) with task/exit checkboxes, tracking rules, Current Focus, Completion Log, and Work Notes. |
| `docs/gameplay/*.md` | Eight gameplay specs: `battle`, `stats`, `skills`, `character`, `inventory`, `enchants`, `quests`, `titles`. These are **planned designs, not implemented features**; numeric defaults are provisional. |
| `.firecrawl/` | Cached web research (artemis-odb wiki, libGDX wiki, Mabinogi wiki, Dicero) used as source material for the plan. Reference only — not project code. |
| `README.md` | Build prerequisites per platform, dependency policy, and platform verification procedures. |

When gameplay behavior is in question, the gameplay spec owns the rule and game-plan.md owns the system design and implementation order. `gameplay/titles.md` is integrated into game-plan.md (specification index, ownership, save shape, progression and validation coverage, 2026-09-07); project-phases.md folds its implementation into phases 6–9.

## Directory structure

Gradle multi-module project (Gradle wrapper **9.5.1**; daemon JVM is Java 25 via `gradle/gradle-daemon-jvm.properties`, but **shared code is Kotlin pinned to JVM 1.8 bytecode and the Java 8 API surface** — `jvmTarget = 1.8` plus `-Xjdk-release=1.8` in the root `build.gradle.kts`; no newer JDK APIs in `core`, because the Android dexer and the RoboVM iOS compiler do not consume newer bytecode).

```
core/                  Shared game code (all gameplay lives here)
  src/main/kotlin/cloud/vinh/rebirthdungeon/
    RebirthDungeon.kt          Game subclass; owns assets/services/screens
    bootstrap/                 service and screen wiring, session workers
    game/                      THE DETERMINISTIC SIMULATION (no libGDX imports)
      ecs/components/          artemis-odb Component data classes
      ecs/systems/             ordered rule systems (registration order = execution order)
      algorithms/              generator/path/FOV/random interfaces
      squidsquad/              SquidSquad + Juniper adapters
      grid/                    DungeonGrid, occupancy, movement rules
      commands/, events/       plain command types; immutable domain events
      combat/, progression/, inventory/, enchanting/, quests/, turns/, replay/
    data/                      content loaders/DTOs; save codecs and migrations
    presentation/              screens, SpriteBatch dungeon renderer, Scene2D HUD, animation
    platform/                  shared platform-service interfaces
  src/test/kotlin/             JVM tests (must NOT start Gdx.app/OpenGL/native UI)
lwjgl3/                Desktop launcher — primary development target
android/               Android launcher (minSdk 21, compile/target 36)
ios/                   RoboVM launcher (MetalANGLE backend, min iOS 12.0)
assets/                Shared resources: ui/ (skin, fonts), atlases/, data/ (content JSON), audio/
tools/                 Offline tooling (e.g. make_dungeon_atlas.py — atlas packing, not shipped)
docs/                  game-plan.md, project-phases.md, gameplay/ specs
.github/workflows/     CI (ci.yml.backup): core checks, desktop compile, Android packaging
```

The `game/` package tree grows by feature toward the target structure in game-plan.md section 17. **Do not scaffold unused folders or add dependencies without a concrete feature**, a reviewed version pin (in `gradle.properties`), and matching natives on every launcher.

## Architecture rules that must not be broken

- **ECS:** one artemis-odb `World` per active run, assembled with `WorldConfigurationBuilder`; execution order is registration order (one system instance per class — the builder rejects duplicates). Components are plain Kotlin classes extending `Component` with a public no-arg constructor (give every primary-constructor parameter a default and Kotlin generates it); never `data class` (artemis components are mutable state). Entity ids are recycled — never use them as persistent identity (use project stable IDs).
- **Threading:** command resolution and artemis-odb mutation happen serially on the LibGDX render thread. Worker results return only via `Gdx.app.postRunnable(...)` and are validated against a session generation token. Never call `World.process()` recursively; no `IntervalSystem`-driven turn cooldowns.
- **Snapshots/events:** presentation and saves consume immutable snapshots and ordered domain events exported *after* `World.process()` completes — never a second mutable gameplay model.
- **Dependencies:** only `gdx` is exposed as `api`; everything else is `implementation`. The jdkgdxds `build` artifact duplicate is excluded in the root build, as are `org.apache.fory:fory-core` and the `com.github.tommyettinger.tantrum` group (Fory requires Android API 26+; the SquidSquad serialization modules pull them in transitively) — both are graph repairs, not packaging rules; do not hide duplicate bytecode with packaging rules. Dependency locking and checksum verification are on; regenerate locks/metadata after intentional bumps (note: `--write-verification-metadata` drops comments in `verification-metadata.xml`; the trusted-artifacts trust rules survive). The full gdx-liftoff KTX module set (`io.github.quillraven.libktx`, `1.14.2-rc1`, matching the gdx/artemis/kotlin pins) and third-party liftoff libraries are available to all core code. `RebirthDungeon` extends `KtxGame` (hence ktx-app is `api`: a public supertype must be on consumers' compile classpaths); the class-keyed screen registry stays unused — navigation hands fresh single-activation instances to the inherited current-screen slot via the dispose-on-navigate coordinator (`RebirthDungeon.navigateTo`).
- **Content vs saves:** versioned content JSON in `assets/data` binds strictly through Jackson DTOs (unknown fields/enum values fail the load). Save bundles use LibGDX JSON.
- **Platform launches:** landscape is the adopted orientation; align platform configuration before device acceptance.

## Build, test, and verification

```sh
./gradlew :core:test                                   # JVM tests (no OpenGL/Gdx.app)
./gradlew :core:check                                  # tests + simulation boundary/format checks
./gradlew :core:compileKotlin :lwjgl3:compileKotlin    # shared + desktop compilation
./gradlew :lwjgl3:run                                  # run the desktop game (dev target)
./gradlew :android:checkDebugDuplicateClasses :android:assembleDebug  # Android packaging gate
```

- JVM compilation alone does **not** verify Android packaging or iOS builds. iOS verification is a manual full AOT build on a macOS host (`:ios:launchIPhoneSimulator` + `simctl`; see README) — never report `:ios:compileKotlin` as an iOS build, and account for the Xcode 27+ "Simulator.app → DeviceHub.app" quirk.
- Tests must not start `Gdx.app`, OpenGL, native UI, or provider SDKs. `core/src/test/kotlin/.../smoke/` pins the selected stack's behavior (artemis ordering, Jackson strict binding, Juniper `AceRandom` determinism, jdkgdxds collections).

## Working conventions for this repo

- **Follow `docs/project-phases.md` as the work queue.** Complete the earliest unfinished phase by default (currently Phase 2 — validated content and deterministic RNG; phases 0–1 are done and verified). Preserve unmet prerequisites if priorities change, and record the change.
- **A checked box means implemented *and* verified.** Record commands, targets/devices, results, and file paths as evidence. A missing device or credential is an unmet gate, not a pass.
- When finishing a phase, update the phase checklist, Phase Overview, Current Focus, and Completion Log **together**; keep dated blockers and next actions in Work Notes.
- If a planned feature is intentionally omitted, record its disposition and rationale against that item — never silently skip required behavior or add a library just to close a checkbox.
- Design docs distinguish *requirements* from *provisional defaults*; implemented behavior must trace to the specs, and Mabinogi/Dicero reference mechanics are not automatically requirements.
- Keep verification claims honest and scoped: distinguish dependency resolution, compilation, packaging, simulator launch, physical-device testing, and release testing.
