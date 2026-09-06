# Rebirth Dungeon: Java + LibGDX Game Plan

Rebirth Dungeon is a **2D pixel-art, grid-based roguelike dungeon crawler with dice combat, loot, progression, and a later gacha meta game**. Build it in Java using the existing LibGDX project, with desktop as the fastest development target and Android/iOS as delivery targets.

The game is turn-based: commands advance the simulation; frames advance presentation. The same initial state, content version, rules version, and commands must reproduce the same outcomes regardless of frame rate.

> The artemis-odb `World` owns live dungeon entities and rules. SquidSquad supplies dungeon algorithms. The application controller coordinates commands, persistence, and platform services. LibGDX renders and receives input.

Gameplay alignment updated **September 5, 2026** from the design documents below. These documents define planned rules, not completed features; numeric examples and proposed defaults remain provisional. The architecture and dependency audit retain their original verification dates.

| Gameplay specification | Owns |
| --- | --- |
| [Battle](gameplay/battle.md) | Five-dice skill selection, keep/reroll, scoring, damage, activation commands |
| [Stats](gameplay/stats.md) | HP/MP/SP, costs, attributes, equipment contributions, buffs/debuffs |
| [Skills](gameplay/skills.md) | Acquisition, training plus AP, ranks, active/passive combat catalog |
| [Character](gameplay/character.md) | XP, levels, talents, aging, proposed rebirth |
| [Inventory](gameplay/inventory.md) | Grid storage, bags, stacks, equipment, overflow, run provisions |
| [Enchants](gameplay/enchants.md) | Equipment prefix/suffix effects, application and burning transactions |
| [Quests](gameplay/quests.md) | Chapters/Generations, delivery, objectives, claims, NPC role-playing missions |

Use these specifications for detailed gameplay contracts and this plan for system ownership and implementation order. The skills catalog defines later reaction, area, movement, and critical extensions to the starter battle rules; enable them only when their dependencies and authored values exist. Mabinogi and Dicero reference mechanics are not automatically Rebirth Dungeon requirements.

This plan replaces the previous Expo/React Native architecture. It describes a target implementation, not completed gameplay. The dependency audit below reflects the working tree checked on **September 2, 2026**.

## 1. What exists today

The repository is a gdx-liftoff scaffold. `RebirthDungeon extends Game` opens an empty `FirstScreen`; dungeon generation, combat, saving, and tests have not been implemented in Java. Shared code uses the package `cloud.vinh.rebirthdungeon`.

| Module or path      | Current role                                                                                          |
|---------------------|-------------------------------------------------------------------------------------------------------|
| `core/`             | Shared Java game code; currently the application and empty screen                                     |
| `lwjgl3/`           | Desktop launcher, executable JAR tasks, Construo packaging, optional Graal Native Image configuration |
| `android/`          | Native Android launcher, manifest, SDK configuration, native library packaging                        |
| `ios/`              | RoboVM launcher, MetalANGLE backend, native libraries, plist and linking configuration                |
| `assets/`           | Shared resources; currently a UI skin and bitmap fonts, without dungeon content or sprite atlases     |
| `gradle.properties` | Explicit library version values                                                                       |

There is no web backend in `settings.gradle`. Android currently forces landscape; iOS currently advertises portrait and landscape. Adopt landscape for the first slice and align the platform configuration before device acceptance.

### Toolchain baseline

| Setting                   | Checked value                              | Consequence                                                                           |
|---------------------------|--------------------------------------------|---------------------------------------------------------------------------------------|
| Gradle wrapper            | `9.7.1`                                    | Use the checked-in wrapper                                                            |
| Gradle daemon criteria    | Java `21`                                  | Build JVM selection is separate from application language level                       |
| Shared Java source/target | `8`                                        | Use Java 8 syntax and compatible APIs; no records, sealed classes, or virtual threads |
| Desktop compiler          | `--release 8` on newer JDKs                | Desktop compilation checks the Java 8 API surface                                     |
| Android Gradle Plugin     | `8.9.3`                                    | Validate Android packaging separately from JVM compilation                            |
| Android SDK               | min `21`, compile/target `36`              | These are configured targets, not a verified device support matrix                    |
| Android desugaring        | `desugar_jdk_libs:2.1.5`                   | Does not make arbitrary modern JVM APIs portable to all targets                       |
| RoboVM                    | `2.3.23`                                   | iOS needs its own AOT/linking and device checks                                       |
| iOS plist minimum         | `12.0`                                     | Confirm against the selected Xcode/RoboVM/backend before claiming support             |
| Construo                  | `2.1.0`, bundled JDK downloads `21.0.10+7` | Desktop distribution runtime is distinct from source compatibility                    |
| Graal Native Image        | `enableGraalNative=false`                  | Optional later desktop experiment; not the iOS runtime                                |

Add an equivalent Java 8 API check for `core` when tightening the build: source/target compatibility alone does not stop code from calling newer JDK APIs.

## 2. Gradle dependency audit

### Verification performed

The following commands were run against the current files:

```sh
./gradlew --version
./gradlew :core:dependencies --configuration runtimeClasspath
./gradlew :core:compileJava :lwjgl3:compileJava
./gradlew :android:dependencies --configuration debugRuntimeClasspath
./gradlew :ios:dependencies --configuration runtimeClasspath
./gradlew :lwjgl3:dependencies --configuration runtimeClasspath
./gradlew :android:assembleDebug
```

| Check                                                                | Result                                              |
|----------------------------------------------------------------------|-----------------------------------------------------|
| Core and desktop Java compilation                                    | Passed for the scaffold                             |
| Core, Android debug, iOS, and desktop dependency reports             | Resolved without `FAILED` entries                   |
| Android debug packaging                                              | **Failed at `:android:checkDebugDuplicateClasses`** |
| iOS AOT build/device launch, desktop launch, release/minified builds | Not verified in this audit                          |

No Gradle dependency changes are applied by this document. The proposed cleanup and repair below are implementation work for Milestone 0.

### Confirmed Android blocker: duplicate jdkgdxds artifacts

The resolved POM for `com.github.tommyettinger:jdkgdxds:2.1.8` pulls in both:

```text
com.github.tommyettinger.jdkgdxds:build:2.1.8
com.github.tommyettinger.jdkgdxds:jdkgdxds:2.1.8
```

Both JARs contain the same **533 class entries, with identical class bytes**. Android reports duplicate classes such as `com.github.tommyettinger.ds.Arrangeable`. This is a duplicate artifact problem even though Gradle resolves the graph and Java compilation succeeds.

Repair this before feature work. A candidate for the current graph is a narrowly scoped exclusion of `com.github.tommyettinger.jdkgdxds:build`, applied to the consuming configurations in every subproject, while retaining `com.github.tommyettinger.jdkgdxds:jdkgdxds` and its dependencies. Alternatively, select a reviewed publication whose metadata supplies only one implementation. Re-run Android duplicate-class checking and assembly after the change; this audit has not validated either repair.

Do not remove jdkgdxds entirely: SquidSquad depends on it. Do not use packaging exclusions to hide duplicate bytecode. Desktop's existing `DuplicatesStrategy.EXCLUDE` can conceal this kind of overlap in a fat JAR.

The upstream jdkgdxds README now describes JitPack publication and a newer version. That is upgrade context, not evidence that the newer version fixes this build. Keep any upgrade intentional and verify its resolved metadata. [Upstream publication guidance](https://github.com/tommyettinger/jdkgdxds).

### Dependencies to build the first slice around

These are checked declarations/resolutions, not claims about the latest available releases.

| Dependency                                                              | Version                              | Target role                                                                                                                                                                                                                                                              |
|-------------------------------------------------------------------------|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `com.badlogicgames.gdx:gdx`                                             | `1.14.2`                             | Application lifecycle, graphics, audio, input, Scene2D, assets, files, JSON                                                                                                                                                                                              |
| `net.onedaybeard.artemis:artemis-odb`                                   | `2.3.0`                              | Authoritative run entities, components, aspects, ordered systems                                                                                                                                                                                                         |
| SquidSquad `squidcore`                                                  | `4.0.12`                             | Base utilities and supporting dependency graph                                                                                                                                                                                                                           |
| SquidSquad `squidgrid`                                                  | `4.0.12`                             | Coordinates, regions, FOV and grid helpers                                                                                                                                                                                                                               |
| SquidSquad `squidplace`                                                 | `4.0.12`                             | Dungeon generation and processing                                                                                                                                                                                                                                        |
| SquidSquad `squidpath`                                                  | `4.0.12`                             | Cardinal pathfinding with `DijkstraMap`                                                                                                                                                                                                                                  |
| `com.github.tommyettinger:juniper`                                      | `0.10.5`                             | Explicit seeded RNG instances and state capture                                                                                                                                                                                                                          |
| `com.github.tommyettinger:jdkgdxds`                                     | `2.1.8`                              | Collections dependency; repair duplicate publication path first                                                                                                                                                                                                          |
| `com.fasterxml.jackson.core:jackson-databind` (+ `jackson-annotations`) | `2.22.2` / `2.22`                    | Versioned content definitions: `assets/data` JSON binds to plain DTOs with strict defaults (unknown fields/enum values fail the load). Java 8 bytecode; Android needs R8 keep rules for content DTOs at the release gate. Save bundles stay on LibGDX JSON (section 14). |
| `digital`, `regexodus`, `crux`, `funderby`                              | `0.10.2`, `0.1.21`, `0.1.3`, `0.1.2` | Supporting dependencies; declare directly when project code imports them                                                                                                                                                                                                 |
| `com.kotcrab.vis:vis-ui`                                                | `1.5.9`                              | Optional tooling/debug widgets; Scene2D UI is already in LibGDX                                                                                                                                                                                                          |

SquidSquad is modular and succeeds SquidLib. Its documentation distinguishes `squidpath` from the Gand-based `squidseek`, and currently recommends `squidpath` between those two modules. The plan selects that one pathfinding implementation. [SquidSquad module guide](https://github.com/yellowstonegames/SquidSquad).

### Dependencies already present but outside the first slice

Treat these as candidates for removal from the initial runtime, not as requirements just because the generator selected them.

| Current dependency group                                                      | Version(s)                    | Decision                                                                                                        |
|-------------------------------------------------------------------------------|-------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `squidlib`, `squidlib-util`, `squidlib-extra`                                 | `3.0.6`                       | Remove from the target baseline; use SquidSquad consistently                                                    |
| `squidseek`, `gand`, `gdcrux`                                                 | `4.0.12`, `0.3.7`, `0.1.2`    | Defer unless replacing the chosen pathfinding adapter                                                           |
| `gdx-ai`                                                                      | `1.8.2`                       | Defer; first enemies need a small deterministic state machine                                                   |
| `gdx-box2d`, platform Box2D natives, `box2dlights`                            | `1.14.2`, commit `76536bb895` | Defer; tile collision and FOV do not need a physics world                                                       |
| `squidstorecore/grid/path/text`, `jdkgdxds_interop`                           | `4.0.12`, `2.1.8.0`           | Optional JSON serializers for library objects; unnecessary for the initial project-owned DTO format             |
| `squidwrathcore/grid/path`, `fory-core`, `tantrum-digital/jdkgdxds/regexodus` | `4.0.12`, `1.6.1`, `1.6.1.0`  | Defer the binary serialization stack; require separate Android/RoboVM compatibility evidence before adopting it |
| `squidsmooth`                                                                 | `4.0.12`                      | Optional interpolation helpers; start with project presentation tracks and LibGDX interpolation                 |
| `squidpress`                                                                  | `4.0.12`                      | Optional input helpers; start with one LibGDX input pipeline                                                    |
| `squidtext`                                                                   | `4.0.12`                      | Later procedural names/text                                                                                     |
| `spine-libgdx`                                                                | `4.2.10`                      | Later only if art uses Spine; ordinary sprite animation is sufficient initially                                 |
| `blade-ink`                                                                   | `1.3.2`                       | Later authored dialogue/narrative                                                                               |
| `typing-label`                                                                | commit `6f1198f7cc`           | Later text effects; keep out of simulation timing                                                               |
| `anim8-gdx`                                                                   | `0.7.0`                       | Later image/animation export; not required to play sprite animations                                            |
| `gdx-kiwi`, `libgdx-utils`                                                    | `1.10.1.12.1`, `0.13.7`       | Keep only for a concrete API need                                                                               |
| `sjInGameConsole`                                                             | `1.0.1`                       | Development tooling; gate debug commands out of release builds                                                  |
| `gdx-controllers-core` and platform backends                                  | `2.2.4`                       | Retain if controller input is implemented; keep backend dependencies platform-specific                          |

The serialization choices are distinct: `squidstore*` integrates LibGDX JSON; `squidwrath*` integrates Apache Fory with Tantrum. They are not both needed for saving a run. The current Fory graph also brings in Janino. Its presence is not proof of mobile incompatibility, but JVM compilation alone does not establish AOT compatibility. [SquidSquad serialization modules](https://github.com/yellowstonegames/SquidSquad).

### Platform dependencies and build hygiene

- Desktop uses `gdx-backend-lwjgl3:1.14.2`, LibGDX/Box2D desktop natives, and constraints resolving the six declared LWJGL modules to `3.4.3`.
- Android uses `gdx-backend-android:1.14.2`; separate `natives` configurations package LibGDX/Box2D for ARM32, ARM64, x86, and x86_64. Runtime dependency reports alone do not validate those native artifacts.
- iOS uses `gdx-backend-robovm-metalangle:1.14.2`, LibGDX/Box2D iOS natives, and RoboVM runtime/CocoaTouch `2.3.23`.
- If removing Box2D, remove its core dependency, lights extension, and native dependencies together across all three launchers.
- Desktop currently puts `gdx-tools:1.14.2` on the runtime classpath. Move atlas packing and other offline utilities to a tooling task/configuration so the shipped game does not inherit their headless/FreeType tooling dependencies.
- Old transitive LibGDX requests converge on `1.14.2`; this is version selection, not proof that every optional extension works with that release.
- The graph promotes SquidSquad's jdkgdxds `2.1.5` to `2.1.8` and older Tantrum requests to `1.6.1.0`. Review these edges during cleanup rather than copying upstream defaults into the plan.
- Keep JitPack available for dependencies published there. Restrict repository content where practical; make `mavenLocal()` opt-in for reproducible builds and remove snapshot repositories when no selected dependency needs them.
- All current core libraries are exposed with `api`. Keep `api` where launcher compilation requires an exposed type, such as LibGDX's `Game`; prefer `implementation` for internal libraries after checking the public surface.
- Add dependency locking/verification after repairing and reducing the graph. Pin new test libraries deliberately; the project currently has no explicit test framework dependency.

### Phase 0 repair record (2026-09-02)

The duplicate blocker was reproduced and repaired. The JitPack root POM for `com.github.tommyettinger:jdkgdxds:2.1.8` depends on both `com.github.tommyettinger.jdkgdxds:build` and `com.github.tommyettinger.jdkgdxds:jdkgdxds`, whose JARs and dependency lists (funderby, digital) are identical; the root build now excludes exactly the `:build` module from every subproject configuration, retaining `:jdkgdxds`. After also reducing the runtime to the first-slice table above (Box2D/lights/natives, controllers, and all deferred libraries removed), `:android:checkDebugDuplicateClasses` and `:android:assembleDebug` pass, and core/lwjgl3/android/ios dependency reports resolve without `FAILED`. The graph is pinned by per-module `gradle.lockfile` files and `gradle/verification-metadata.xml`; full evidence lives in project-phases.md and the README "Dependencies" section.

## 3. Architecture and ownership

```text
Desktop / Android / iOS launchers
                |
       RebirthDungeon (Game)
       assets + service wiring + screens
                |
   Scene2D controls / keyboard / gestures
                |
       RunController command queue
       |                  |
       |                  +--> repositories / platform services
       v
   RunSession: artemis-odb World + run state + grid + scheduler
       |
       +--> ordered rule systems
       +--> SquidSquad adapters + explicit Juniper RNG streams
       |
       v
   immutable snapshots + ordered domain events
       |
       +--> DungeonRenderer (SpriteBatch)
       +--> HUD/menu presentation (Stage)
       +--> presentation tracks / audio / haptics
```

| Owner                                | Authoritative data                                                                       |
|--------------------------------------|------------------------------------------------------------------------------------------|
| artemis-odb components               | Dynamic actor/object state: cells, HP/MP/SP, stats, five dice, abilities, statuses                     |
| `RunSession`                         | Grid, run phase, active actor, initiative queue, RNG streams, command index, run rewards |
| Profile repository/application model | Hero progression, committed inventory/overflow, quests, hub resources, enchanting RNG, settings and balances                                  |
| Screen/HUD view model                | Selection, dialogs, focus, loading/error state, projected game data                      |
| Presentation tracks                  | Interpolated positions, camera, particles, floating text, reveal progress                |

Components and `RunSession` together form the authoritative simulation. The occupancy index is a derived lookup maintained alongside position/blocking changes and rebuilt on load. UI snapshots are read-only copies, never a second mutable gameplay model.

The simulation may depend on artemis-odb and project-owned algorithm interfaces. It must not reference `Gdx`, `Screen`, `Stage`, `SpriteBatch`, `AssetManager`, platform SDKs, networking, or file I/O. Backend implementations belong in their platform modules; pure repositories and adapters can live in `core`.

Use constructor injection and small Java interfaces. An async framework is not necessary for this scope.

## 4. Simulation time, presentation time, and threading

| Mechanism                                             | Responsibility                                        |
|-------------------------------------------------------|-------------------------------------------------------|
| artemis-odb system registration order                 | Order within one logical simulation step              |
| Project `TurnScheduler`                               | Which actor acts next and the logical action cost     |
| Java worker/executor and platform callbacks           | Saves, loads, generation jobs if needed, network work |
| `render(delta)`, `Stage.act(delta)`, animation tracks | Visual progression only                               |

Run command resolution and artemis-odb mutation on the LibGDX render thread, serially. A frame drains available controller work, updates presentation, and draws. With no command or automatic actor pending, the simulation does not advance.

Call `world.process()` only for an explicit rule step. Ordinary turn systems must ignore elapsed seconds; do not use artemis-odb `IntervalSystem` to drive turn cooldowns. Never recursively call `World.process()`.

LibGDX lifecycle callbacks run on the render thread. Worker results return through `Gdx.app.postRunnable(...)`; workers must not operate on artemis-odb entities, Scene2D actors, graphics, or audio. Give each screen/run a generation token so stale callbacks cannot affect a replaced session. [LibGDX threading](https://libgdx.com/wiki/app/threading).

Use a bounded executor for I/O and one serialized writer for saves. Capture detached immutable data before submitting work. Cancellation is cooperative: cancel owned jobs when appropriate, and still reject late results by session ID. Required durable writes belong to the application, so changing screens does not silently discard them.

## 5. artemis-odb world model

Use one artemis-odb `World` per active run, built through `WorldConfigurationBuilder` so system registration order is explicit. Keep the compile-time weaver off; use plain `Component` subclasses first and introduce `PooledComponent` only if measured allocation pressure justifies it. Pooled components then need complete reset behavior, and presentation must never retain pooled object references.

artemis-odb uses `Component` (with a required public constructor), `World`, `EntityEdit`, `ComponentMapper`, `Aspect`, and `BaseEntitySystem`/`IteratingSystem`. There is no per-system priority field: the default `InvocationStrategy` processes systems in registration order and flushes entity-state changes to aspect subscriptions before each system and after the last. The builder accepts at most one system instance per class, so each pipeline slot is its own class. Entities are `int` ids from `world.create()` and ids are recycled after deletion. No component decorators or automatic game-save schema are part of this design. [artemis-odb wiki](https://github.com/junkdog/artemis-odb/wiki).

Create entities for players, enemies, doors, traps, pickups, and other objects that participate in rules. Keep floors and walls in a compact grid rather than making every tile an entity.

| Component group        | Initial data                                                                              |
|------------------------|-------------------------------------------------------------------------------------------|
| Identity and placement | `StableId`, `GridPosition`, `Actor`, `PlayerControlled`, `BlocksMovement`, `BlocksVision` |
| Perception and AI      | `Vision`, `EnemyBrain` with content IDs and deterministic memory                          |
| Combat                 | `ResourcePools`, `Stats`, `DiceHand`, `AbilityLoadout`, `StatusSet`, `Shield`, `Cooldowns`                    |
| Interactions           | `Door`, `Trap`, `Pickup`, `InventoryRef`                                                  |
| Transient resolution   | `MoveIntent`, `AbilityIntent`, `PendingDamage`, `PendingRemoval`                          |

Minimal component shape:

```java
package cloud.vinh.rebirthdungeon.game.ecs.components;

import com.artemis.Component;

public class GridPosition extends Component {
    public int x;
    public int y;
}
```

Use project-generated stable IDs for saves, events, targeting, and replay. artemis entity ids are recycled after deletion, so entity id values and aspect subscription iteration order must never determine persistent identity or initiative ties.

Entity and component edits go through `EntityEdit` (`world.edit(id)`, `world.delete(id)`, `mapper.create(id)`) and are applied immediately to the entity, while subscription membership catches up at the strategy's `updateEntityStates()` points around each system. This is not an end-of-scene command buffer. Copy event values before deleting an entity, prefer `IteratingSystem` deferred deletion during iteration, and finish cleanup before projecting or saving. [artemis-odb wiki: InvocationStrategy](https://github.com/junkdog/artemis-odb/wiki/InvocationStrategy).

`RunSession` holds run/floor IDs, rules/content versions, turn and command counters, active actor, logical phase, scheduler, grid, RNG streams, visibility/exploration state, run inventory with origin references, quest-stage snapshots and pending evidence, and pending rewards. A dice activation also owns frozen skill/rank/target inputs, five die IDs/faces, kept flags, reroll allowance, and resource reservations. Rendering's `isAnimating` flag is not a saved gameplay phase.

## 6. Ordered rule pipeline

Each command or automatic actor action resolves through an explicit context. Systems process only the active action and its effects; a system pass does not give every entity a turn.

| Slot | System                    | Responsibility                                                            |
|-----:|---------------------------|---------------------------------------------------------------------------|
|  100 | `CommandValidationSystem` | Validate actor, phase, targets and costs; reject without partial mutation |
|  150 | `EnemyIntentSystem`       | Choose an AI action when the active actor is an enemy                     |
|  200 | `MovementSystem`          | Commit legal cardinal movement and occupancy changes                      |
|  300 | `InteractionSystem`       | Doors, traps, pickups, stairs, contact with an enemy                      |
|  400 | `DiceSystem`              | Lock five-dice hand/profile and costs, keep dice, batch reroll, consume hand                 |
|  500 | `AbilitySystem`           | Pay reserved costs once; resolve the locked skill and authored effects                      |
|  600 | `DamageSystem`            | Resolve defense, combo, resistance, shield, HP damage and defeat markers                    |
|  700 | `StatusEffectSystem`      | Resolve periodic effects, expiration, stat recomputation, regeneration and cooldowns                |
|  800 | `CleanupSystem`           | Remove dead actors from occupancy/initiative, clear transient intents     |
|  900 | `VisibilitySystem`        | Refresh visibility after movement or opacity changes                      |
| 1000 | `TurnFinalizationSystem`  | Finalize action cost, select the next actor, update terminal state        |

Slot numbers are documentation labels for the pipeline order; execution order is fixed by the order in which the systems are registered with `WorldConfigurationBuilder` (one instance per system class).

Project snapshots/export event batches in the controller **after** `World.process()` returns and artemis-odb has flushed pending entity operations. Save only at those completed command boundaries.

An ability can produce several effects; resolve them in a stable order. A status tick that deals damage must use the same synchronous damage resolver before cleanup, rather than leaving pending damage for an accidental future command. Pass explicit `activationStarted`/`activationEnded` signals so rolling, changing kept flags, or rerolling cannot tick poison repeatedly. At an eligible activation end, resolve periodic effects, expire statuses, recompute stats and clamp pools, then regenerate only living actors. Finish these effects and cleanup before deciding the outcome: player defeat takes priority if the player is dead; otherwise no remaining hostiles means victory.

Expected invalid commands return an `ActionResult` and reason. Invariant failures halt the session with seed/command diagnostics; do not continue from a half-applied action or save it as healthy state. Systems emit events for external work and never perform I/O themselves.

## 7. Grid movement and interaction contract

Use `int` coordinates, cardinal movement, and a project-owned `DungeonGrid` with flattened `int[]` tile IDs indexed by `x + y * width`. Choose a y-up world convention and translate input/asset orientation at the edges.

A `MOVE(dx, dy)` requires `abs(dx) + abs(dy) == 1`, map bounds, valid terrain, and no blocking occupant. On success, commit the new cell and update occupancy together. Events contain both old and new cells for interpolation.

| Action/result                                     | Initial rule                                                                         |
|---------------------------------------------------|--------------------------------------------------------------------------------------|
| Move to an empty walkable cell                    | One standard action; resolve entry traps and reveal available pickups                                 |
| Move into a closed unlocked door                  | Open it, remain in place, consume one standard action                                |
| Wall, out-of-bounds, locked door without a key    | Reject without spending initiative                                                   |
| Contact an adjacent hostile                       | Enter the dice-action flow below; never overlap cells                                |
| Wait                                              | One standard action                                                                  |
| Invalid target or insufficient ability resources  | Reject without spending dice or initiative                                           |
| Open settings, inspect inventory, select a target | UI-only; no simulation time                                                          |
| Use a consumable, when enabled | One full action before rolling; resolve recovery/statuses and end activation |
| Pick up world loot, when enabled | One full action from the actor cell or an adjacent reachable pickup; reject without a turn if quantity/fit fails |
| Rearrange/split/merge/sort carried inventory | Validated layout-only command with no initiative cost; unavailable while dice are locked |
| Change equipment during a run | Deferred; initial equip/unequip operations occur at the hub |
| Descend stairs                                    | Explicit interaction after arrival; checkpoint before changing floor                 |

The simulation remains the final validator even when the HUD disables a control. Resolve pickups/death/rewards in a defined order and clear occupancy before a dead actor can block later actions.

Input adapters all submit the same commands: keyboard arrows/WASD, on-screen D-pad, and swipe; add controller mapping and tap-to-walk after the first slice. Tap-to-walk submits one step per completed action, revalidates each step, and stops on danger, interaction, or manual input.

## 8. SquidSquad adapters and deterministic RNG

Keep library-specific grids, `Coord`, `Region`, path objects, and RNG implementations behind adapters. Components, content definitions, and saves use project-owned values.

### Dungeon generation

Start with `com.github.yellowstonegames.place.DungeonProcessor`, constructed with explicit dimensions and an `EnhancedRandom` instance. Version `4.0.12` exposes `DungeonProcessor(int, int, EnhancedRandom)`, `generate()`, and stair coordinates. These signatures were checked in the resolved source JAR.

Generation pipeline:

1. Derive a floor seed from the run seed, floor index, generator version, and attempt number using a documented stable mixing function.
2. Give that attempt its own seeded Juniper generator; never use an unseeded default constructor.
3. Generate a `char[x][y]` map and translate symbols into tile IDs, terrain properties, and door/entity spawn definitions.
4. Copy optional room/corridor metadata into project values only when a feature needs it.
5. Choose and validate spawn/exit, room constraints, walkable area and content placements.
6. Confirm spawn-to-exit reachability using the same movement/door rules as the game, including key availability where applicable.
7. Retry invalid output with a derived attempt seed up to a fixed limit; return `GenerationFailure` if exhausted.

SquidSquad arrays are x-first, while the game's flattened storage is row-major by y. Adapter tests must catch transposition, boundary, and coordinate-origin errors. Keep an existing floor intact until replacement generation succeeds.

Later add authored room templates, cave profiles, environmental decorations and biome rules behind the same generator interface. A worker may generate detached data; integrating it into the live run happens on the render thread.

### Pathfinding

Use `com.github.yellowstonegames.path.DijkstraMap` with `Measurement.MANHATTAN` for four-way movement. Start with one-step enemy pursuit and simple finite-state decisions: idle, investigate, pursue, attack.

Construct/reinitialize its terrain map from project walkability, representing blocked terrain as walls. Supply dynamic blockers for each query. Treat a hostile target cell as a goal when appropriate, but let the movement/interaction system prevent occupation of that cell. Closed doors must not become accidentally walkable merely because a character other than `#` was passed to the library.

Version `4.0.12` uses deterministic internal tie-breaking for path requests; do not assume the old SquidLib constructor taking an external RNG exists. Explicit AI randomness uses the AI stream, and adapter fixtures pin chosen paths for the selected library version. Treat mutable scans/caches as reconstructible data, not save state.

### Field of view

Use `com.github.yellowstonegames.grid.FOV.reuseFOV(...)` with reusable `float[x][y]` resistance and light arrays. Choose `Radius.DIAMOND` for the initial Manhattan-radius vision boundary; movement topology and vision radius are separate settings.

Build resistance from terrain plus dynamic opacity, including doors. Recompute on relevant changes, and maintain `visibleNow` plus persistent `explored` bits. Rendering fog consumes these values; decorative light never changes what the actor can see.

Test corner occlusion and wall visibility explicitly. Preserve explored terrain, but do not render currently hidden enemies from an unrestricted snapshot. Future last-seen markers must represent remembered observations rather than live hidden positions.

### RNG streams

Use a project `RandomSource` adapter backed initially by Juniper `AceRandom`. In the checked `0.10.5` source it exposes an algorithm tag and five state words through `getStateCount()`, `getSelectedState(int)`, and `setSelectedState(int, long)`.

Keep distinct streams for generation, AI decisions, combat/dice, loot, cosmetic presentation, hub enchanting, and local development gacha. The profile persists the enchanting stream independently of run streams; it covers application checks, variable enchant values, and burn recovery. Explicitly seed each stream using fixed stream identifiers. Cosmetics must never consume gameplay RNG.

Save the RNG algorithm ID, state format version, and **all** state words, not just the original seed. Encode long words losslessly, such as hexadecimal strings. Restore only recognized algorithms/state counts. Capture state after every accepted randomness-consuming command, including rerolls.

Never use `Math.random()`, `MathUtils.random`, system time, unordered hash iteration, or artemis entity id order for authoritative decisions. Cross-platform replay fixtures must survive JVM, Android, and RoboVM execution before deterministic portability is claimed.

## 9. Turn scheduler and command runner

Implement a small project-owned `TurnScheduler`; the selected libraries do not supply the previous plan's rot.js scheduler contract.

Use an initiative queue ordered by `(dueTick, insertionSequence, stableActorId)`. Store `long` logical ticks and persist tie-break values. For the first slice every completed activation costs `100` ticks; introduce integer-based speed/action-cost rules later without using wall time or floating-point timestamps.

Snapshot the queue, current tick, active actor, next insertion sequence, and any in-progress player activation. Remove dead actors before selecting the next actor. An active actor is not also queued as waiting for a duplicate turn.

```text
Input command
  -> validate expected session and current actor
  -> resolve one synchronous artemis-odb command step
  -> commit snapshot/events and request a checkpoint
  -> if activation ended, run scheduled automatic actors in order
  -> stop when player input is needed or the run ends
  -> present the committed event sequence
```

A logical activation can contain several dice commands. Only commands that finish it advance initiative. Roll/keep/batch-reroll have their own resource and phase rules but cannot silently give enemies extra turns.

Add an automatic-action count guard to detect an invalid scheduler loop. If a valid burst needs to be spread over render frames, yield only between complete logical actions; retain deterministic order and block additional gameplay input until the player is due.

Keep command sequence numbers for accepted commands and event sequence numbers for exported events. Include run/session identity on callbacks and animation acknowledgements. A replay identifies initial state or seed, generator/rules/content versions, and ordered accepted commands; a seed alone is insufficient after rules or content changes.

## 10. Dice combat vertical slice

Follow [battle.md](gameplay/battle.md) and [stats.md](gameplay/stats.md): exactly **five six-sided dice power one selected active skill**. Begin with one hero, one enemy, and a sword skill at two illustrative ranks with fair and weighted profiles; add a defensive skill after its effect and duration are authored. This replaces per-die allocation across abilities. Health, mana, stamina, shields, dice and statuses stay in the same run simulation during exploration and combat.

Bumping an adjacent hostile opens a dice activation for the current player turn without moving or dealing damage. Before rolling, allow a legal skill/target change; the first accepted roll locks skill, rank, target, effective attack and mitigation inputs, cost vector, and six-face probability profile. The same initiative queue governs all actors.

| Command or intent | Contract |
| --- | --- |
| Select skill/target | Before rolling; validate learned active skill, equipment, range, target, cooldown and resource affordability |
| `ROLL_DICE` | Once per activation: freeze inputs, reserve costs, independently roll all five dice in stable die order |
| Set kept dice | Edit kept flags without RNG, costs or initiative advancement |
| `REROLL_DICE` | Atomically replace a chosen nonempty subset of unkept dice using the locked profile; spend one reroll action |
| `USE_ABILITY` | Deduct reserved costs once before effects, consume the whole hand, resolve the locked skill and end activation once |
| `END_TURN` | Pass: before rolling, no skill cost; after rolling, pay reserved costs and discard the hand; no skill-use training |
| `USE_ITEM`, when enabled | Before rolling, consume one eligible item, resolve effects, and end activation |

The proposed allowance is one initial roll plus **two batch rerolls**. One subset costs one reroll whether it contains one die or all five. Keep all replacement results; no empty reroll, budget carry-over, automatic attack at zero rerolls, or panel-close reset. `ASSIGN_DIE`, `UNASSIGN_DIE`, and the old singular `REROLL_DIE` are not this mode's command contract. Enemies, consumables, equipment changes and timed effects cannot interleave a locked hand and its commit/pass.

### Scoring and damage

Sum all five faces for pip total `P` (5–30), and classify exactly one combination, independent of display order. The provisional multipliers are five of a kind ×10, four of a kind ×5, full house ×3.5, five-face straight ×3, three of a kind ×2.5, two pairs ×2, one pair ×1.5, and no combination ×1. No overlapping bonuses, four-die straights or wildcards apply.

For the starter damage rule:

```text
attackBeforeDefense = B + A + K × P
comboDamage = floor(max(0, attackBeforeDefense - D) × M)
damageAfterResistance = floor(comboDamage × (1 - resistance))
shieldAbsorbed = min(currentShield, damageAfterResistance)
hpDamage = damageAfterResistance - shieldAbsorbed
```

`B` and pip scaling `K` come from skill rank; `A` is that skill's allowed effective attack contribution, including weapons once; `M` is the hand multiplier. `D` is physical/magical Defense and resistance is the corresponding Protection, directly clamped to 0–100% and represented as a 0–1 fraction in the formula. Apply shield last and clamp HP at zero. Fully mitigated damage may be zero. Use exact rational/fixed-point arithmetic at the specified rounding boundaries, with the same pure resolver for preview and commitment. Rejected commands leave dice, pools, training, initiative and RNG unchanged.

Each skill/rank has six nonnegative integer face weights with a positive total, defaulting to fair odds. Sample dice independently in stable order using the locked profile for both rolls and rerolls. Expose weighted odds; Luck, equipment and passive ranks do not silently bias them. Previews consume no RNG. Damage, reroll allowance, multipliers, rank weights and defensive/utility formulas remain balance content, not inferred Dicero formulas.

### Resources, modifiers and activation boundaries

Track current, maximum and reserved HP/MP/SP separately; available is current minus reserved. Every activated skill, including attacks and buffs, has a positive authored cost in at least one pool. For each positive rank cost, use the proposed `max(1, ceil((rankCost + flatModifiers) × max(0, 1 + summedPercentModifiers)))`; a zero-cost pool stays zero. Validate all pools together before rolling. HP payment bypasses mitigation/shield and must leave at least 1 HP. Rerolls never charge again; a skill's healing cannot finance its upfront payment. AP is progression currency, not a combat pool.

Resolve STR/INT/DEX/WIL/LUK and derived stats in dependency order: progression baseline → primary-attribute equipment/status modifiers → derived maxima/attack/defenses → direct derived-stat modifiers. At each stage use the stats specification's additive flat/percentage aggregation and explicit bounds/rounding. Reject circular dependencies and double-counted weapon, mastery or enchant contributions. Increasing a maximum never refills a pool; decreasing it clamps current value without later restoring the lost amount.

Buffs/debuffs retain source IDs, stacking groups, priorities, magnitudes and timing counters. Default to one instance per group per target across sources: equal versions refresh, higher priority replaces, lower priority does not refresh, and equal priority replaces. Separate beneficial and harmful clauses for cleanse/dispel. Durations count affected-actor completed activations; a self-applied effect skips the casting activation's end. Periodic effects run before expiry, followed by stat recomputation/clamping and authored regeneration for living actors. No newly applied effect ticks at its application boundary. Exploration actions continue these clocks; menus and dice commands do not. Temporary effects clear at run end by default and persist on suspend/resume.

New buffs/debuffs affect subsequent actions, not the applying action's frozen inputs. Enemy turns use deterministic policies and the same effect/damage helpers. Finalize the player activation once even when the last enemy dies; resolve activation-end defeat before victory. Save accepted dice-command boundaries with the exact hand, kept flags, locked inputs/profile, budget, pools/reservations, statuses, cooldowns and RNG continuation.

### Skill catalog extensions

The [skills catalog](gameplay/skills.md#8-combat-skill-catalog) stages Smash and Combat/Sword Mastery first, then equipment defenses and Final Hit. Passives have no Use button, separate dice, per-trigger payment or extra turn; each eligible mastery contributes once, including when dual wielding. Shield Mastery does not create a Shield absorption pool, and body armor categories are mutually exclusive.

Final Hit is a paid temporary melee buff whose resolved magnitude/duration are saved; later attacks still pay and roll normally. Add Counterattack's one-charge prepared retaliation only with synchronous reaction ordering and no counter/critical recursion. Add Windmill with frozen Manhattan-area targets resolved by stable ID; add Charge with a validated straight empty lane and frozen destination, combining movement and one hit into one action. These features depend on their authored rules, not animation behavior.

Critical Hit is deferred from the starter slice. When enabled, the learned passive supplies bonus damage and authored equipment/content supplies chance. Check once per eligible target after counter interception, using combat RNG; no draw for countered or zero-chance hits. Apply its bonus to `comboDamage` before Protection and shield. Cooldowns start on committed skill use, skip the casting activation's end and decrement on subsequent owner activation ends. Save prepared reactions, area targets/paths and critical results as these extensions become available.

## 11. LibGDX presentation and input

### Dungeon rendering

Use `SpriteBatch`, `TextureAtlas`, `TextureRegion`, `OrthographicCamera`, and a world viewport. Begin with 16-pixel tiles and nearest-neighbor filtering; choose a small logical world resolution and test integer scaling/letterboxing across target screens.

Draw terrain, remembered terrain/fog, visible props, visible actors, and effects in an explicit order. Batch sprites sharing atlas textures. Use a stable depth rule such as layer, cell y, stable ID; never depend on entity creation order to resolve draw ties.

`ACTOR_MOVED` provides a copied source and destination cell. A presentation track interpolates the sprite while the authoritative actor is already at its destination. Animation completion can release input gating but cannot grant damage, loot, currency or a turn. Skipping animations snaps to the committed state and consumes each event only once.

After a command burst, movement/events may describe intermediate positions while the snapshot is the final state. Animate from the event sequence and reconcile at the end, rather than teleporting to the final snapshot before playing the sequence. Use observed visibility at event time to avoid revealing hidden actions.

Start with drawing visible map cells each frame; introduce chunk caches or a low-resolution framebuffer only if measurements justify them. Sprite animations use LibGDX animation utilities; Spine is optional future art tooling.

### HUD and menus

Use a separate `Stage` and UI viewport for five persistent dice slots, active skills, HP/MP/SP, inventory, dialogs, pause and progression screens. Build layouts with `Table` and `Skin`, using the existing `assets/ui` resources as prototype assets. Scene2D UI does not require adding another UI framework. [Scene2D UI guide](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui).

Show selected skill/rank, kept dice, remaining rerolls, pip total, combination/multiplier, face probabilities, target and effect breakdown. Separate Roll, Reroll and Use Skill controls. Show current/max/reserved resources, final costs, and status sources with remaining target activations. The journal distinguishes active skills from passives and explains inactive equipment conditions.

Hub screens expose training against 100 points and AP costs, book/page collections, level/XP/cumulative level, age and talent mastery, grid inventory/equipment and saved overflow, enchant replacement/burn previews, and quest tabs/tracker. Quest tabs use Chapter names with Generations inside, plus Sidequests and Skills; mark NPC role-playing missions with an RP badge. Inspecting, filtering and tracking remain presentation-only.

Call `stage.act(clampedDelta)` for UI animation and `stage.draw()` for display. Stage actions animate widgets only. Update widget content from committed view models; listeners submit commands instead of mutating components.

An `InputMultiplexer` routes input to modal/UI controls first and world controls second. Ensure a consumed touch cannot both press an ability and move the hero. Convert touches using the relevant viewport's unprojection, including letterboxing and HUD exclusion areas. In `resize`, update both viewports and preserve the existing zero-size guard.

Provide remappable keys, keyboard focus, clear selection states, large touch targets, scalable text, reduced motion and color-independent dice/status cues. Scene2D widgets are rendered game UI; screen-reader support must be separately designed and verified on Android/iOS, not assumed from the old native-widget plan.

## 12. Events, assets, and resource lifetime

Domain events are plain immutable Java values: `ActorMoved`, `DoorOpened`, `DiceRolled`, `AbilityUsed`, `DamageDealt`, `StatusApplied`, `ActorDefeated`, `ItemCollected`, `FloorChanged`, and `RunCompleted`. Add stable outcome IDs and relevant skill/rank, equipment, target and mission context for training and quest evidence. Hub transactions emit learning/rank-up, equipment-change, level/age/rebirth, enchant-result and quest delivery/claim events only after their state is committed; notifications never grant progression.

Include stable IDs, copied payloads, event order, and enough visibility/position information for presentation. A controller-owned presentation bridge maps these into animation, SFX and haptics. Render code does not subscribe to mutable artemis-odb entities or retain component references.

Create an application-owned `AssetManager` inside the game lifecycle. Use a loading screen and `AssetManager.update()` before activating screens that need queued resources. Keep atlases, skins, fonts, sounds and music managed through a clear ownership policy. Managed assets are released through the manager; do not manually dispose the same resource from a screen. [AssetManager guide](https://libgdx.com/wiki/managing-your-assets).

Screen-specific stages, private batches and framebuffers have explicit disposal owners. Switching a `Game` screen does not automatically dispose the old screen; the screen coordinator decides whether it is cached or disposed. Detach its input processor, stop presentation tracks, and cancel replaceable jobs when leaving it.

Avoid static GL resources and long-lived static references to a prior application instance. `pause()` checkpoints committed state, pauses audio, and clears held input. `resume()` rechecks resources/services, restores focus, and snaps unfinished cosmetic transitions if necessary. Persist throughout play because OS termination may occur without a final callback. [LibGDX lifecycle](https://libgdx.com/wiki/app/the-life-cycle).

## 13. Application services and failures

Start with interfaces that a feature actually uses:

```text
RunController        serialized command processing and snapshots
SaveRepository       load/save a versioned local bundle
ContentRepository    validated immutable content catalog
AudioService         sound/music commands on the appropriate thread
HapticsService       platform vibration implementation or desktop no-op
PlatformServices     lifecycle/platform capabilities exposed to shared code
```

Add authentication, cloud sync, purchase and gacha repositories when those features begin. Platform launchers inject implementations into `RebirthDungeon`; the current no-argument constructor will evolve with that wiring.

Represent expected failures with explicit Java result/error types, for example `LoadFailure`, `SaveFailure`, `InvalidContent`, `GenerationFailure`, and later `NetworkFailure`. Normal rejected movement is a domain result. An impossible occupancy state is a defect with diagnostic context.

Bound retries and give each operation one retry owner. Retry only transient operations that are safe to repeat. Save failures retain the latest pending snapshot and expose a retry state; malformed content and unsupported save versions are not transient errors.

## 14. Persistence, recovery, and reward consistency

Use **project-owned, versioned JSON DTOs** for the first offline implementation. LibGDX already includes `JsonReader`, `JsonValue`, `JsonWriter`, and custom serialization support; SQLite and a Java database abstraction are not present in the current dependencies. [LibGDX JSON guide](https://libgdx.com/wiki/utils/reading-and-writing-json). This save bundle intentionally uses LibGDX JSON, while versioned content definitions use Jackson (section 15); the two stacks have different jobs and must not drift into each other.

Decode explicit fields and validate them before building a run. Prefer explicit codecs/custom serializers over serializing artemis-odb internals, reflection-driven class names, scheduler internals or arbitrary library graphs. This keeps schema changes deliberate and reduces reflection/linker dependence on Android and RoboVM.

A save bundle contains:

```text
schemaVersion, rulesVersion, contentVersion, generatorVersion
saveRevision, profileRevision, updatedAt (metadata only)
profile: hero/life identity, level/XP/cumulative level, AP, skills/objective counts
         talent, current-life growth, starting age and processed aging intervals
         inventory/equipment/bags/placements/locks, page records, currencies, overflow
         installed enchant values, hub pools, enchanting RNG and operation results
         quests/stages/evidence/eligibility milestones, tracked quests, reward IDs
run: ID, floor index, original seed, generated tile data, entity DTOs
     explored cells, logical phase, active actor, turn/command counters
     initiative queue and tie-break state
     each gameplay RNG algorithm + complete state
     current dice activation: five stable dice/faces, kept flags, reroll budget
     locked skill/rank/targets/stats/profile, HP/MP/SP and reservations
     stat sources, active effect timing, cooldowns and enabled skill-extension state
     run inventory/origin reservations/consumption, quest snapshot/pending evidence
     pending XP/training/loot, completion status and committed result ID
mission, when RP is active: scenario/NPC template versions, attempt ID,
     isolated simulation/dice/supplies/objectives and outcome status
```

Save the actual generated map and changes; do not depend on regenerating an old floor with a future library version. Rebuild occupancy, aspect indexes, resistance/FOV caches and presentation state after load. Exclude transient intents, in-progress system effects, textures and animation clocks.

For the first slice, use one logical bundle containing both profile and run, stored in two alternating local save slots. A serialized writer writes the inactive slot with an increasing revision and checksum, closes it, and verifies it before reporting durability. On load, validate both slots and select the newest complete supported revision. A torn write must leave the previous good slot usable; platform-specific flush/replace behavior still needs interruption testing.

This combined bundle makes a local run-completion grant one persisted transition: reconciled brought-item consumption/returns and released reservations, retained loot/XP/training/quest evidence, saved overflow, updated profile, completed run and grant ID together. A load/retry cannot grant the same reward twice. Preferences may hold volume/control settings but do not replace the run-save mechanism.

Book learning/consumption, page insertion/completion, AP/rank advancement, equipment swaps, enchanting/burning, item hand-ins, quest claims and rebirth each save all inputs, outputs and operation IDs atomically. Retrying returns the recorded result, including RNG results, instead of paying or rolling twice. Save modifier sources rather than only effective totals; rebuilding must not restore resources, refresh effects or reroll enchants. Validate inventory ownership/placement and containment before restoring the simulation.

At a normal run result, apply the selected retention policy, then retained XP using run-start age/talent, retained skill training, and elapsed aging intervals in that order. Commit eligible quest evidence at this boundary; subsequent gameplay stages begin at the hub until mission-local staging is explicitly supported. Rank-ups, quest claims and rebirth occur afterward at legal hub boundaries. Replays use recorded progression outcomes; the dungeon simulation never reads the wall clock.

Checkpoint after accepted gameplay commands, floor transitions, completed rewards and lifecycle pause. Preserve order so an older write cannot overwrite a newer revision. If coalescing saves, keep the newest complete snapshot and retain durability callbacks; for rolls, rerolls, reward grants and random hub operations, gate subsequent gameplay until the checkpoint succeeds or the player explicitly handles the save failure.

On `pause`, request a bounded flush of the last committed snapshot. If suspension arrives during animation, the save already describes the completed rules. If it arrives while generation is pending, retain the previous stable floor. Do not rely on a background executor continuing after the OS suspends the app.

Schema migrations are explicit and sequential. Reject unsupported future versions without overwriting them; preserve a recoverable copy and offer a clear load error. Keep migration/replay fixtures for every shipped schema/content/rules combination. Consider SQLite later only when query or transaction needs justify a vetted cross-platform implementation.

## 15. Data-driven content

Create validated catalogs under `assets/data/` for tiles, heroes, enemies, five-dice scoring/profiles, abilities, skills/ranks/training/acquisition, stats/costs/statuses, inventory/equipment/bags, enchants/recipes, loot/encounters, generation profiles, XP/age/talent curves, quests/Chapters/Generations and NPC scenarios, and later banners/pity rules.

Validate the explicit F → E → D → C → B → A → 9 → … → 1 rank order; reachable 100-point training at every supported nonterminal rank; skill-book/page mappings; six integer face weights with positive totals; stat units, bounds and acyclic derivation; effect stacking/timing; inventory footprints, stack keys and hand compatibility; enchant slot/condition/chance tables; and quest prerequisite/stage references and attainable objectives. Detect acquisition cycles and unavailable dependencies, including critical training without critical chance, multi-target objectives in single-enemy content, or rebirth/RP quests before those systems exist. Prototype caps and unavailable skills must be visible.

Use stable content IDs and explicit schema versions. Content JSON is loaded with Jackson (`jackson-databind`, pinned in `gradle.properties`) into plain Java DTOs; its strict defaults are part of the contract — an unknown field or unknown enum value fails the load with the offending name, so typo'd definitions cannot silently default. Any dice notation used for other authored effects stays a string at the parsing boundary and is validated explicitly; the player battle hand is always five d6 with its skill/rank face weights, not an arbitrary notation-defined pool. Then validate required fields, ranges, enum values, referenced IDs, probability totals, progression monotonicity and reachable generation constraints. Parsing JSON alone does not validate game rules.

Load an immutable catalog before starting a run. Pin a run to its rules/content version; do not refresh definitions in the middle of a command. Keep retired content or a deliberate migration policy for resumable shipped runs.

Separate content from visuals: a monster definition references an animation/atlas ID rather than embedding a `TextureRegion`. A missing visual asset should fail loading with a useful diagnostic before entering the dungeon.

## 16. Progression, inventory, quests, and online services

First deliver an offline loop: prepare a hero/loadout in the hub, explore and resolve five-dice encounters, collect eligible loot and training, commit the run outcome, then learn/advance skills and continue quests. A life can contain many runs; victory, defeat or starting a run does not trigger rebirth. Use hero-owned progression and inventory as the proposed default; settle account sharing and victory/defeat/abandonment retention before shipping inventory-backed runs.

### Skills and character progression

Follow [skills.md](gameplay/skills.md): NPC instruction, reading a complete book, or assembling a book from distinct pages can learn a skill at **F with 0 training**. Learning spends no advancement AP; a successful read consumes one book, and duplicate learning consumes nothing. Pages may arrive in any order without expiry; insertion consumes one matching copy, wrong/duplicate pages change nothing, and completion creates the book once. Lessons, reading, assembly and rank-ups happen between runs.

Ranks use F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1. A skill needs **at least 100 current-rank training points plus the authored AP cost** to advance one rank. Count capped objectives from resolved outcomes once per objective, reset counts on advancement, and discard excess training rather than carrying it forward. AP cannot buy training or automatically advance a skill. Rank 1 has no further Rank Up action. Run training is pending until its outcome; passives train from eligible events under their own objective IDs.

Follow [character.md](gameplay/character.md): start at level 1, process committed XP across every crossed threshold, and provisionally grant 1 AP per earned level up to a content-defined cap (proposed 200). At cap discard XP overflow. Cumulative level is `1 + earned level-ups across all lives`; rebirth itself adds nothing. Store life growth using the age/talent at each grant, preserving fractional precision. Skills outside the active talent remain usable. Derive mastery for all talents from current associated skill ranks, with no second AP payment; inactive talent mastery bonuses persist. Initial talents are Close Combat and Magic; training multipliers and Grandmaster challenges are deferred.

Proposed starting/rebirth ages are 10–17. Reconcile one age year per seven elapsed real-world days at hub/results boundaries, including offline intervals, once each. Destination ages 11–20 grant 5 AP plus authored base/talent growth; 21–25 grant 5 AP and base growth; 26+ grant neither, though age and level growth can continue. Repeated menus and backward clock changes cannot re-award intervals. Clock trust and forward-clock policy remain open and need an explicit application-level decision.

Rebirth remains gated on defined eligibility/cost/cooldown rules. Preview and atomically reset current level/XP, starting age/talent and life-growth stats while preserving cumulative level, learned ranks/training, unspent AP, mastery, committed items/pages/enchants, quests and claimed rewards. Settle run results and aging first; move newly illegal equipment into storage/overflow. A new run snapshots the resulting progression and loadout; live buffs/debuffs can modify effective run stats, but hub progression cannot replace that baseline.

### Inventory and equipment

Follow [inventory.md](gameplay/inventory.md): begin with a provisional 6 × 10 backpack, fixed rectangular item footprints, stacks, one ordinary bag and dedicated equipment slots. Items have stable IDs and exactly one authoritative location. Bags occupy backpack space, retain stable contents grids and cannot nest; nonempty bags cannot be removed into inaccessible storage. Physical books, uninserted pages, scrolls and materials take space; only authored nonphysical quest records do not.

Use deterministic placement: fill compatible stacks in saved bag-priority order then backpack, then scan free rectangles left-to-right/top-to-bottom. Validate a whole requested transfer before moving anything; an explicit smaller quantity enables partial pickup. Sorting/splitting/merging preserve item counts, variants, locks and run provenance. If a proposed sorted layout fails, retain the old one. Favorites organize; item locks protect against sale, destruction and recipe/enchant consumption or replacement.

Start with main/off hand, head, body, hands, feet and two accessories. A two-handed weapon reserves off hand but contributes once; paired swords require two legal instances; sword/shield supports shield skills. Validate every displaced item's destination as one equip transaction. Equipment and enchants affect stats only while eligible and equipped. No automatic drop or free resource refill completes a swap.

A run reserves exact brought instances/quantities, including bag contents, and tracks origins and consumption separately from new loot. Hub mutation is unavailable while the run is active. Result reconciliation accounts for used supplies and returns/forfeits remaining gear under the authored outcome policy; it never restores consumed provisions or duplicates equipment.

Failed world pickups stay on the ground without a turn or loot reroll. Durable result/quest grants place what fits and save exact remainder in withdraw-only reward overflow with no expiry. Overflow also accepts system reconciliation returns, never player deposits; its items cannot be used until withdrawn. Clear it before a new run or optional reward-producing activity, while preserving already-earned results. Purchases, assembly and recipes require legal output placement after simulated input consumption and cannot use overflow to evade capacity.

### Enchanting

Follow [enchants.md](gameplay/enchants.md): instructor-taught Enchant uses the same training/AP progression. Hub-only application installs a prefix or suffix on one equipment instance; its rank is distinct from Enchant skill rank. Rank 5–1 scrolls provisionally require skill Rank 5 or better, with no lower-enchant chaining. Conditional clauses read progression snapshots; variable values roll once on successful installation and persist through equip/load/rebirth. Effects feed the equipment stat stage once, including independent penalties when a benefit is inactive.

Application consumes one scroll, one powder and authored positive MP on every accepted attempt. The initial Protect Equipment mode preserves gear and both old enchants on failure; success replaces only the selected slot. Use the specification's basis-point chance resolver with its provisional 90% cap and shared preview logic. Hub MP and an explicit recovery loop are prerequisites.

Burning is a separate destructive operation: consume the item, materials and MP regardless of recovery, checking occupied slots independently in prefix/suffix order. Reserve capacity for maximum possible recovered scrolls after consumed inputs before spending or drawing RNG. Recovered scrolls retain definitions, not old rolled values. Preview losses, chances and all costs. Persist the dedicated enchanting RNG, operation result, costs, equipment/output changes and training together before revealing the result. Protect Scroll, durability damage and multiplayer entrusting are deferred.

### Quests and NPC role-playing missions

Follow [quests.md](gameplay/quests.md): mainstream storylines contain Chapters and Generations with explicit prerequisites; optional sidequests do not block them unless authored. Skill Quests may recognize committed rank milestones or introduce skills through equipment/rebirth eligibility. Rank comparisons use authored order, not labels. Equipping may deliver a lesson quest, not instantly teach mastery; receiving a book does not read it. A skill reward grants only unknown Rank F, preserving an already-known skill without an automatic refund.

Separate eligibility from automatic delivery or NPC acceptance. Persist state-based unlocks and evidence for event-based triggers, including life ID/talent for rebirth; reconcile catch-up eligibility idempotently after load. Retain unlocked quests through unequipping or rebirth. Process triggers after their initiating transaction, in stable quest-ID order.

Quest state is Locked → Available/Active → Ready to complete → Completed. Ordered stages use stable objective IDs and capped/deduplicated evidence from dialogue, interaction, defeats, skill outcomes, acquisition/delivery and mission success. Event objectives count only after their stage activates; item requirements recheck legal current inventory. Hand-ins consume items and checkpoint objectives together. Initial quests complete once per hero with no expiry, through explicit Complete/final NPC dialogue. Preview and atomically claim the bundle, costs, completion ID and successors; overflow withdrawal never regrants XP/AP. Mainstream quests cannot be abandoned; authored sidequest abandonment preserves committed delivery checkpoints.

Accept and claim at the hub. Normal runs snapshot eligible active stages and accumulate pending evidence; result retention determines what commits, while a clear objective always requires success. Until mission-local stage progression has its own rollback rules, fresh gameplay stages start after results at the hub. Repeatable/daily quests, timers and branching replay rewards remain deferred.

An RP mission temporarily controls a fixed authored NPC in an isolated session started from the hub, with no other active run. Use normal movement/dice rules with the NPC's versioned stats, skills, gear and supplies; preserve the hero profile separately. Ordinary hero XP/training/loot do not accrue by default. Only the recorded scenario outcome advances its eligible quest, whose later claim grants hero rewards. Success returns to the hub once; failure/exit leaves the quest retryable; loading resumes the same attempt rather than resetting it. Borrowed items/skills cannot leak to the hero.

### Gacha and online services

Permanent profile state, account balances, authentication, purchases and gacha belong to application/repository services. Development gacha can use a separate local simulator and currency. Production pulls require a server-owned transaction and RNG, an idempotency key, authoritative balance/pity/inventory results, and durable reconciliation. Purchase grants require verified platform transactions and server entitlement handling.

A reveal animates a committed result using Scene2D/sprite effects. Closing it or restarting must not duplicate or discard the grant. Native billing/auth/secure storage require Android and RoboVM interfaces; the current dependencies do not supply them. Cloud save, analytics, crash reporting and live content updates are later features; define conflict/version policies before syncing profiles.

## 17. Target project structure

Grow this structure by feature; the paths below are proposed within the existing modules.

```text
core/src/main/java/cloud/vinh/rebirthdungeon/
  RebirthDungeon.java
  bootstrap/                 service and screen wiring
  application/               RunController, results, repository interfaces
  game/
    ecs/components/          artemis-odb data components
    ecs/systems/             ordered rule systems
    RunSession.java
    grid/                    DungeonGrid, occupancy, movement rules
    algorithms/              generator/path/FOV/random interfaces
    squidsquad/              SquidSquad and Juniper adapters
    turns/                   initiative and activation rules
    combat/                  five-dice hands, abilities, stats, damage, statuses, reactions
    progression/             skills/training, XP, talent mastery, aging/rebirth rules
    inventory/               placement, stacks, equipment, reservations, reconciliation
    enchanting/              conditions, recipes, chance and operation results
    quests/                  prerequisites, stages, evidence, claims, RP mission rules
    commands/                plain Java command types
    events/                  immutable domain events
    projection/              observed HUD/render snapshots
    replay/                  command logs and state hashes
  data/
    content/                 catalog loaders and validation
    save/                    DTOs, codecs, migrations, local repository
  presentation/
    screens/                 loading, title, hub, dungeon, progression, quests, RP missions
    dungeon/                 SpriteBatch renderer and camera
    hud/                     Scene2D controls and view models
    animation/               presentation tracks and event mapping
  platform/                  shared platform service interfaces

core/src/test/java/cloud/vinh/rebirthdungeon/
  game/                      deterministic rule/adapter tests
  data/                      content, save and migration tests

assets/
  data/                      versioned content JSON
  atlases/                   packed dungeon and actor sprites
  audio/                     sound and music
  ui/                        existing skin and bitmap fonts

lwjgl3/src/main/java/.../    desktop launcher and platform adapters
android/src/main/java/.../  Android launcher and platform adapters
ios/src/main/java/.../      RoboVM launcher and platform adapters
```

Replace `FirstScreen` through the first playable slice. Keep build-time atlas tooling outside the shipped game runtime. Do not create a second source root or copy platform code into `core`.

## 18. Validation and performance

Add a pinned Java 8-compatible test framework under `core` when implementing the first rules. Most simulation/adapter tests should run as ordinary JVM tests without `Gdx.app`, an OpenGL context or native platform startup. Add the LibGDX headless backend explicitly as a **test dependency** only for tests that need it; its transitive presence in desktop tooling does not provide a core test setup or validate rendering.

| Area               | Required evidence                                                                                              |
|--------------------|----------------------------------------------------------------------------------------------------------------|
| Movement/occupancy | Cardinal-only steps, bounds/walls, doors, traps, no actor overlap, correct action costs                        |
| Generation         | Bounded attempts, reachable spawn/exit, correct x/y translation, stable seeded fixtures                        |
| Path/FOV           | Four-way routes, dynamic blockers, door invalidation, corner visibility, explored memory                       |
| artemis-odb        | Registration-order behavior, structural changes between systems, cleanup before projection, no stale IDs       |
| Turns/combat       | Stable initiative ties, single turn-boundary ticks, no extra turns from dice commands, no reroll/reset exploit |
| Skills/progression | Three learning routes, 100-point/AP gate, capped objective counts, duplicate outcome rejection, XP overflow, mastery, aging cutoffs and rebirth preservation |
| Stats/resources | Mixed-pool reservation/payment, nonlethal HP costs, no refill from maxima changes, modifier/stacking order, self-buff timing, preview parity |
| Inventory/equipment | Rectangle fit, bags/no cycles, deterministic placement, atomic swaps, locks, provenance, consumed supplies, overflow withdrawal without regrant |
| Enchanting | Slot/rank restrictions, chance boundaries, failure preservation, persistent rolled values, burn capacity and recovery, operation/RNG retry consistency |
| Quests/RP | Rank/equipment/rebirth delivery, catch-up without duplicates, ordered objectives/hand-ins, explicit claim/overflow, outcome retention, isolated NPC state and suspended-attempt recovery |
| Determinism        | Same inputs yield identical canonical state/events; save/load mid-activation preserves the continuation        |
| Persistence        | Torn slot recovery, ordered writes, migrations, future-version rejection, reward deduplication                 |
| Async/lifecycle    | Late callbacks ignored, durable saves survive screen changes, pause/resume during animation/generation         |
| Presentation/input | Touch consumption, viewport unprojection, focus/remapping, animation skip, hidden-actor privacy                |
| Platforms          | Desktop launch, Android debug/release packaging, RoboVM AOT build and actual device lifecycle checks           |

Use canonical ordering for state hashes and replay comparisons. Exhaustively classify all 7,776 ordered five-die hands, verify one initial roll/two subset rerolls, frozen inputs and held faces, and test weighted probability boundaries and full damage distributions. Stage counter ordering/no loops, critical draw order, area training counts and Charge paths with their feature gates. Test a restored run against an uninterrupted run, including RNG continuation and initiative order, rather than merely comparing a saved DTO to itself.

Target 60 fps presentation on selected baseline devices. Measure ordinary turn latency and generation worst cases separately. Keep occupancy lookup O(1), FOV change-driven, pathfinding decision-driven, and all I/O outside rule resolution. Reuse rendering buffers and bound particles, floating text and event queues. Optimize snapshot copying/map batching only after measuring representative maps and enemy counts.

Test UI and rendering on actual desktop and mobile backends; a headless test cannot validate texture filtering, audio, touch behavior or native accessibility. Run Android minified builds and iOS linking checks before expanding optional reflection-heavy libraries.

## 19. Implementation milestones

### Milestone 0 — Repair and prove the dependency baseline

- Repair the duplicate jdkgdxds artifact graph and verify Android assembly.
- Remove/defer overlapping optional libraries from the first-slice runtime; keep associated native dependencies consistent.
- Separate desktop build tools, preserve reviewed version pins, and capture the resulting dependency graph.
- Create a visible loading/prototype screen that loads the existing skin, draws with `SpriteBatch`, and accepts one Scene2D input.
- Prove an ordered artemis-odb step, seeded SquidSquad generation and disposal/recreation of a screen.
- Add the minimal JVM test setup and Java API compatibility check.
- Run desktop, Android, and an iOS simulator build; track device/release checks separately.

**Exit:** the selected stack builds and displays a minimal screen on each target, with no duplicate classes and clear resource ownership. The audit's Android failure means this gate is currently open.

### Milestone 1 — Playable dungeon movement

- Generate one seeded floor with player, enemy, spawn and exit.
- Implement cardinal movement, occupancy, wait, doors and action costs.
- Add `DijkstraMap` pursuit, FOV/explored state and deterministic initiative.
- Render a pixel-art atlas, HUD, keyboard/D-pad input and movement interpolation.
- Capture replay fixtures and a minimal save/checkpoint path before introducing scarce random rewards.

**Exit:** a player can explore and reach the exit; identical commands reproduce map, turns and events, including after a basic reload.

### Milestone 2 — Five-dice encounter, resources, and resumable activation

- Implement skill-before-roll selection, exactly five dice, kept flags, two batch rerolls, whole-hand commit and paid post-roll pass; remove assignment assumptions.
- Prove a sword skill at two illustrative ranks with fair/weighted profiles, pip/combo damage and enemy response. Add Smash and Combat/Sword Mastery as their authored content becomes available.
- Implement HP/MP/SP, frozen stat inputs and cost reservations, nonlethal HP payment, equipment contributions, one skill buff and enemy stat debuff with activation-based expiration.
- Add the authored defensive effect, a mana skill and illustrative HP-cost case; include a restorative potion and a potion with a temporary side effect once minimal inventory consumption exists.
- Persist every accepted dice boundary and status/cooldown state; provide matching previews, ordered SFX/haptics and skippable animation.

**Exit:** an encounter can be won/lost and resumed with identical hand, costs, effects, RNG and initiative; all eight combinations and invalid-command invariants pass. Advanced counters, areas, Charge and criticals are separate extensions.

### Milestone 3 — Durable run, inventory, and progression loop

- Complete versioned save bundles, alternating-slot recovery, migrations, failure UI and cross-platform saved-run replay.
- Decide victory/defeat/abandonment retention for brought gear/supplies, new loot, XP, training and quest evidence before inventory-backed results ship; align the detailed implementation tracker with that decision.
- Prove grid footprints, stacks, one bag, deterministic placement/sorting, item locks, legal sword/shield/body loadouts and full-inventory reward overflow. Add explicit world pickup and provision reservations/consumption reconciliation.
- Implement NPC learning, book reading and page assembly with at least two playable ranks per demonstration skill, reachable training, AP spending and a skill journal.
- Add XP crossing multiple levels, AP grants, cumulative level, two talents and mastery; exercise aging/cutoffs with a controllable clock and settle clock policy before player-facing rewards.
- Commit retained result rewards/progression and inventory reconciliation together with IDs. Exercise lifecycle interruption, stale callbacks and floor-transition failure.

**Exit:** a complete offline run and all three acquisition routes feed durable hero progression without duplicate costs/rewards, lost retained items or restored consumed supplies. Exact loss rules and prototype caps are visible.

### Milestone 4 — Hub systems, quests, and dungeon depth

- Build a short Chapter/Generation story chain, an NPC sidequest, an automatic rank-milestone Skill Quest and an NPC skill-unlock quest, with journal/tracker, pending run evidence and explicit exactly-once claims.
- Add equipment-triggered quest delivery and, after rebirth eligibility/economy are settled, talent-rebirth delivery. Preview rebirth resets, retained progression and equipment/condition changes.
- Implement Enchant learning/two ranks, fixed and conditional/variable effects, prefix/suffix replacement, protected failure and zero/partial/full burn recovery; require hub MP recovery and saved RNG transactions first.
- Add equipment defenses and Final Hit; stage dual wielding, Counterattack, Windmill, Charge and Critical Hit after their equipment/reaction/area/path/RNG dependencies and reachable training exist.
- Add one isolated NPC RP scenario after quest and NPC ability support, including suspension, success and retry without hero-state leakage.
- Expand floor profiles, traps, loot, stairs and enemy policies; add tap-to-walk/controller support, refine art/audio and meet measured performance/input/accessibility targets.

**Exit:** the offline hub/dungeon loop supports saved quests, enchant operations and an RP scenario, with validated content and release-build smoke coverage. Rebirth and advanced skills remain gated until their open rules are resolved.

### Milestone 5 — Production services and delivery

Add server-authoritative gacha, verified purchases, account/secure storage integrations, cloud-save policy, result reveals, analytics/crash reporting and live-content controls. Produce desktop packages, Android release artifacts and an iOS archive with platform-specific validation.

**Exit:** interruption and retries preserve purchases/grants, save/content migrations work from prior releases, and store/device requirements have been checked at release time. Graal Native Image remains optional and gets its own compatibility gate.

## 20. Documentation and audit evidence

The gameplay links at the start of this plan are the local design sources for the September 5 update; their research notes distinguish source-game references from proposed Rebirth Dungeon rules. This update does not re-run or refresh the earlier dependency audit. The separate [project phases](project-phases.md) remains the detailed implementation tracker and needs the corresponding gameplay checklist alignment before those phases are implemented.

For the original technical audit, official documentation was retrieved with the Firecrawl skill. Exact artemis-odb `2.3.0`, SquidSquad `4.0.12` and Juniper `0.10.5` signatures were also checked in resolved Gradle source JARs, so current README examples do not silently substitute newer APIs.

| Source                                                                                                  | Use in this plan                                                                    | Local Firecrawl cache             |
|---------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|-----------------------------------|
| [artemis-odb wiki (World, BaseSystem, InvocationStrategy)](https://github.com/junkdog/artemis-odb/wiki) | World assembly, registration order, aspect subscriptions, entity-state flush points | `.firecrawl/artemis-odb-*.md`     |
| [SquidSquad repository/module guide](https://github.com/yellowstonegames/SquidSquad)                    | Module selection, algorithm ownership, serialization choices                        | `.firecrawl/squidsquad-readme.md` |
| [jdkgdxds publication guidance](https://github.com/tommyettinger/jdkgdxds)                              | JitPack publication and upgrade context                                             | `.firecrawl/jdkgdxds-readme.md`   |
| [LibGDX threading](https://libgdx.com/wiki/app/threading)                                               | Render-thread ownership and worker handoff                                          | `.firecrawl/libgdx-threading.md`  |
| [Scene2D UI](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui)                                    | Stage, Table, Skin and UI layout                                                    | `.firecrawl/libgdx-scene2d-ui.md` |
| [Managing assets](https://libgdx.com/wiki/managing-your-assets)                                         | Loading, reference counts, disposal and static-resource pitfalls                    | `.firecrawl/libgdx-assets.md`     |
| [Application lifecycle](https://libgdx.com/wiki/app/the-life-cycle)                                     | Pause/resume and save boundaries                                                    | `.firecrawl/libgdx-lifecycle.md`  |
| [Reading and writing JSON](https://libgdx.com/wiki/utils/reading-and-writing-json)                      | Explicit JSON parsing and custom codecs                                             | `.firecrawl/libgdx-json.md`       |

The cache is ignored by Git. Local build logs are saved in `.firecrawl/gradle-core-dependencies.log`, `.firecrawl/gradle-platform-verification.log`, `.firecrawl/gradle-android-assemble-debug.log`, and `.firecrawl/gradle-version.log`. These command results and the duplicate-class diagnosis are local build evidence, independent of upstream documentation. Keep this plan's checked versions and verification table updated when Milestone 0 changes the build.
