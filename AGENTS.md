# AGENTS.md

Guidance for AI assistants working in this repository.

## What this project is

**RebirthDungeon** (JVM package `cloud.vinh.rebirthdungeon`) is a 2D pixel-art, grid-based, turn-based roguelike dungeon crawler with **five-dice dice combat**, loot, progression, and a later gacha meta-game. It is built in **Kotlin** with **libGDX** (project scaffolded with gdx-liftoff in Java, fully ported to Kotlin after Phase 1). Combat is inspired by Dicero (roll five dice, keep, reroll, commit a hand); progression, inventory, skills, enchants, quests, and titles are inspired by Mabinogi. The references are design inspiration, not literal requirements.

Two principles shape everything:

1. **Determinism.** The same initial state + content version + rules version + command sequence must reproduce identical outcomes regardless of frame rate. Commands advance the *simulation*; frames advance only *presentation*.
2. **A hard simulation/presentation boundary.** Code under `.../game/` (the deterministic simulation) must **never import `com.badlogic.gdx`** or touch Scene2D, `AssetManager`, file I/O, networking, or platform SDKs. The `checkSimulationBoundary` Gradle task (in `core/build.gradle.kts`) catches direct Gdx imports via `./gradlew :core:check`; review must also enforce I/O restrictions and dependency direction.

## Documentation map (read before designing anything)

| Document                               | Role                                                                                                                                                                                                                                  |
|----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `docs/game-plan.md`                    | **The architecture contract.** Dependency audit, system ownership, threading model, artemis-odb world model, ordered rule pipeline, grid/dice/combat contracts, persistence, target package structure, validation matrix, milestones. |
| [docs/directory.md](docs/directory.md) | **The directory and package placement guide.** Follow its responsibility boundaries, feature ownership, dependency direction, asset/test layout, and incremental adoption guidance when adding or moving files.                       |
| `docs/project-phases.md`               | **The implementation tracker.** 17 phases (0–16) with task/exit checkboxes, tracking rules, Current Focus, Completion Log, and Work Notes.                                                                                            |
| `docs/gameplay/*.md`                   | Nine gameplay specs: `battle`, `stats`, `skills`, `character`, `inventory`, `enchants`, `quests`, `titles`, `towns`. These are **planned designs, not implemented features**; numeric defaults are provisional.                       |
| `.firecrawl/`                          | Cached web research (artemis-odb wiki, libGDX wiki, Mabinogi wiki, Dicero) used as source material for the plan. Reference only — not project code.                                                                                   |
| `README.md`                            | Build prerequisites per platform, dependency policy, and platform verification procedures.                                                                                                                                            |

When gameplay behavior is in question, the gameplay spec owns the rule, `game-plan.md` owns system design, `docs/directory.md` owns directory/package placement, and `project-phases.md` owns implementation order. The directory guide extends game-plan.md section 17; its target paths are not claims of implementation. `gameplay/titles.md` is integrated into game-plan.md (specification index, ownership, save shape, progression and validation coverage, 2026-09-07); project-phases.md folds its implementation into phases 6–9.

## Directory structure

Gradle multi-module project (Gradle wrapper **9.5.1**; daemon JVM is Java 25 via `gradle/gradle-daemon-jvm.properties`, but **shared code is Kotlin pinned to JVM 1.8 bytecode and the Java 8 API surface** — `jvmTarget = 1.8` plus `-Xjdk-release=1.8` in the root `build.gradle.kts`; no newer JDK APIs in `core`, because the Android dexer and the RoboVM iOS compiler do not consume newer bytecode).

Follow [docs/directory.md](docs/directory.md) for the full target tree. This condensed map describes responsibilities; create nested packages only as their features arrive.

```text
core/src/main/kotlin/cloud/vinh/rebirthdungeon/
  RebirthDungeon.kt            Lifecycle entry point; delegates wiring/navigation
  bootstrap/                   Composition root: services, workers, controllers, screens
  application/
    run/                       Run orchestration, floor transitions, results
    profile/                   Committed profile, town transactions, aging reconciliation
    persistence/               Repository contracts, checkpoints, write coordination
  game/                        Deterministic values and rules; no Gdx or I/O
    DungeonSimulation.kt       Existing World facade
    RunSession.kt              Target non-component authoritative run state
    identity/, content/        Stable IDs and immutable validated definition values
    commands/, events/         Run commands/results and immutable ordered outcomes
    projection/, replay/       Observations/restore exports, logs, canonical hashes
    ecs/components/            Mutable no-arg Component classes; never data classes
    ecs/systems/               Explicitly ordered systems delegating feature calculations
    grid/, algorithms/         Terrain/occupancy and generator/path/FOV/RNG interfaces
    squidsquad/, turns/        Library adapters and initiative/activation rules
    combat/                    dice/, abilities/, stats/, statuses/
    progression/               character/, skills/, talents/, titles/
    inventory/, enchanting/    Item ownership/reconciliation and enchant rules
    quests/missions/           RP rules within the quest feature
    town/                      Safe traversal/services; commerce/, gathering/
  data/
    content/                   Strict loaders, dto/, validation/; constructs game values
    save/                      Local repository, dto/, codec/, migration/
  presentation/
    screens/                   Loading/title/town/dungeon/results composition
    dungeon/, town/            World rendering and interaction presentation
    hud/                       Shared status/menu bar, dice panel, quest tracker
    windows/                   character/, skills/, inventory/, quests/, services/
    input/, animation/, audio/ Input translation and cosmetic presentation
  platform/                    Shared native capability interfaces

core/src/test/kotlin/         JVM tests mirroring game/application/data/bootstrap; smoke/
core/src/test/resources/      content/, saves/, replay/ fixtures as needed
lwjgl3/                      Desktop launcher, adapters, packaging; primary dev target
android/                     Android launcher/adapters (minSdk 21, compile/target 36)
ios/                         RoboVM launcher/adapters (MetalANGLE, min iOS 12.0)
assets/                      Shipped data/, atlases/, ui/, audio/ resources
tools/                      Offline tooling, including make_dungeon_atlas.py
docs/                       Architecture, directory guide, tracker, gameplay/ specs
gradle/                     Wrapper, JVM criteria, dependency verification
.github/                    CI and repository automation
```

Keep the existing Gradle modules and one shared production source root. **Do not scaffold unused folders or add dependencies without a concrete feature**, a reviewed version pin (in `gradle.properties`), and matching natives on every launcher. Preserve existing source/resource paths until a consuming feature needs a change. Keep runtime saves outside `assets/`, test fixtures under test resources, and offline tools outside shipped code. Content IDs must be independent of filenames; catalog loading order must be explicit.

### Package dependencies and feature ownership

- `bootstrap` wires concrete implementations. `application` uses pure `game` rules and repository/platform contracts; `data` implements repository contracts. `presentation` submits application requests and reads immutable observations.
- `game` must not import `application`, `data`, `presentation`, or platform services, and must not read the system clock. Jackson DTOs stay in `data/content/dto`; immutable validated definitions cross into `game/content`. Save representations stay in `data/save/dto`. Package conventions require review; Kotlin `internal` is module-wide, not package isolation.
- The application owns the committed profile and atomic save-bundle transitions. Pure feature rules calculate transitions; individual features must not independently save fragments of one result or town transaction.
- Keep ECS systems together for visible pipeline order, with calculations delegated to feature rules. Combat owns skill execution; progression owns learning/ranks/training, character growth, talents, and titles. Inventory owns item identity and installed enchant values. Share stat/resource calculations across town previews and dungeon actions.
- Town movement consumes no dungeon turns. `game/town` owns adjacency/service eligibility and town-specific rules; `application/profile` coordinates saved operations using inventory, progression, quest, and stat rules. Do not force town transactions through the dungeon World or scheduler.
- Character, Skills, Quests, and Inventory are reusable `presentation/windows` composed by town/dungeon screens. Controllers enforce unavailable-during-run actions. RP missions reuse the run simulation with isolated state and outcome policy, not a separate combat engine.
- Native implementations belong in launcher modules and implement shared `platform` interfaces. Shared LibGDX audio belongs in `presentation/audio`.

## Architecture rules that must not be broken

- **ECS:** one artemis-odb `World` per active run, assembled with `WorldConfigurationBuilder`; execution order is registration order (one system instance per class — the builder rejects duplicates). Components are plain Kotlin classes extending `Component` with a public no-arg constructor (give every primary-constructor parameter a default and Kotlin generates it); never `data class` (artemis components are mutable state). Entity ids are recycled — never use them as persistent identity (use project stable IDs).
- **Threading:** command resolution and artemis-odb mutation happen serially on the LibGDX render thread. Worker results return only via `Gdx.app.postRunnable(...)` and are validated against a session generation token. Never call `World.process()` recursively; no `IntervalSystem`-driven turn cooldowns.
- **Snapshots/events:** presentation and saves consume immutable snapshots and ordered domain events exported *after* `World.process()` completes — never a second mutable gameplay model. Keep observed render/HUD exports separate from full restore exports so hidden entities cannot leak through save data; detach collection contents as well as their containers. Town events publish only after their profile transaction commits.
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

- **Follow `docs/project-phases.md` as the work queue.** Complete the earliest unfinished phase by default (currently Phase 5 — playable combat and resumable activations; phases 0–4 are done and verified). Preserve unmet prerequisites if priorities change, and record the change.
- Before implementing towns, reconcile the architecture/tracker with `docs/gameplay/towns.md` as described in directory.md section 7, including carried/banked gold, reward capacity, and recovery access. Record phase placement and unresolved rules; directory adoption does not settle balance or authorize skipping prerequisites.
- **A checked box means implemented *and* verified.** Record commands, targets/devices, results, and file paths as evidence. A missing device or credential is an unmet gate, not a pass.
- When finishing a phase, update the phase checklist, Phase Overview, Current Focus, and Completion Log **together**; keep dated blockers and next actions in Work Notes.
- If a planned feature is intentionally omitted, record its disposition and rationale against that item — never silently skip required behavior or add a library just to close a checkbox.
- Design docs distinguish *requirements* from *provisional defaults*; implemented behavior must trace to the specs, and Mabinogi/Dicero reference mechanics are not automatically requirements.
- Keep verification claims honest and scoped: distinguish dependency resolution, compilation, packaging, simulator launch, physical-device testing, and release testing.
