# Rebirth Dungeon: Java + LibGDX Game Plan

Rebirth Dungeon is a **2D pixel-art, grid-based roguelike dungeon crawler with dice combat, loot, progression, and a later gacha meta game**. Build it in Java using the existing LibGDX project, with desktop as the fastest development target and Android/iOS as delivery targets.

The game is turn-based: commands advance the simulation; frames advance presentation. The same initial state, content version, rules version, and commands must reproduce the same outcomes regardless of frame rate.

> Ashley owns live dungeon entities and rules. SquidSquad supplies dungeon algorithms. The application controller coordinates commands, persistence, and platform services. LibGDX renders and receives input.

This plan replaces the previous Expo/React Native architecture. It describes a target implementation, not completed gameplay. The dependency audit below reflects the working tree checked on **September 2, 2026**.

## 1. What exists today

The repository is a gdx-liftoff scaffold. `RebirthDungeon extends Game` opens an empty `FirstScreen`; dungeon generation, combat, saving, and tests have not been implemented in Java. Shared code uses the package `cloud.vinh.rebirthsaga`.

| Module or path | Current role |
| --- | --- |
| `core/` | Shared Java game code; currently the application and empty screen |
| `lwjgl3/` | Desktop launcher, executable JAR tasks, Construo packaging, optional Graal Native Image configuration |
| `android/` | Native Android launcher, manifest, SDK configuration, native library packaging |
| `ios/` | RoboVM launcher, MetalANGLE backend, native libraries, plist and linking configuration |
| `assets/` | Shared resources; currently a UI skin and bitmap fonts, without dungeon content or sprite atlases |
| `gradle.properties` | Explicit library version values |

There is no web backend in `settings.gradle`. Android currently forces landscape; iOS currently advertises portrait and landscape. Adopt landscape for the first slice and align the platform configuration before device acceptance.

### Toolchain baseline

| Setting | Checked value | Consequence |
| --- | --- | --- |
| Gradle wrapper | `9.7.1` | Use the checked-in wrapper |
| Gradle daemon criteria | Java `21` | Build JVM selection is separate from application language level |
| Shared Java source/target | `8` | Use Java 8 syntax and compatible APIs; no records, sealed classes, or virtual threads |
| Desktop compiler | `--release 8` on newer JDKs | Desktop compilation checks the Java 8 API surface |
| Android Gradle Plugin | `8.9.3` | Validate Android packaging separately from JVM compilation |
| Android SDK | min `21`, compile/target `36` | These are configured targets, not a verified device support matrix |
| Android desugaring | `desugar_jdk_libs:2.1.5` | Does not make arbitrary modern JVM APIs portable to all targets |
| RoboVM | `2.3.23` | iOS needs its own AOT/linking and device checks |
| iOS plist minimum | `12.0` | Confirm against the selected Xcode/RoboVM/backend before claiming support |
| Construo | `2.1.0`, bundled JDK downloads `21.0.10+7` | Desktop distribution runtime is distinct from source compatibility |
| Graal Native Image | `enableGraalNative=false` | Optional later desktop experiment; not the iOS runtime |

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

| Check | Result |
| --- | --- |
| Core and desktop Java compilation | Passed for the scaffold |
| Core, Android debug, iOS, and desktop dependency reports | Resolved without `FAILED` entries |
| Android debug packaging | **Failed at `:android:checkDebugDuplicateClasses`** |
| iOS AOT build/device launch, desktop launch, release/minified builds | Not verified in this audit |

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

| Dependency | Version | Target role |
| --- | --- | --- |
| `com.badlogicgames.gdx:gdx` | `1.14.2` | Application lifecycle, graphics, audio, input, Scene2D, assets, files, JSON |
| `com.badlogicgames.ashley:ashley` | `1.7.4` | Authoritative run entities, components, families, ordered systems |
| SquidSquad `squidcore` | `4.0.12` | Base utilities and supporting dependency graph |
| SquidSquad `squidgrid` | `4.0.12` | Coordinates, regions, FOV and grid helpers |
| SquidSquad `squidplace` | `4.0.12` | Dungeon generation and processing |
| SquidSquad `squidpath` | `4.0.12` | Cardinal pathfinding with `DijkstraMap` |
| `com.github.tommyettinger:juniper` | `0.10.5` | Explicit seeded RNG instances and state capture |
| `com.github.tommyettinger:jdkgdxds` | `2.1.8` | Collections dependency; repair duplicate publication path first |
| `digital`, `regexodus`, `crux`, `funderby` | `0.10.2`, `0.1.21`, `0.1.3`, `0.1.2` | Supporting dependencies; declare directly when project code imports them |
| `com.kotcrab.vis:vis-ui` | `1.5.9` | Optional tooling/debug widgets; Scene2D UI is already in LibGDX |

SquidSquad is modular and succeeds SquidLib. Its documentation distinguishes `squidpath` from the Gand-based `squidseek`, and currently recommends `squidpath` between those two modules. The plan selects that one pathfinding implementation. [SquidSquad module guide](https://github.com/yellowstonegames/SquidSquad).

### Dependencies already present but outside the first slice

Treat these as candidates for removal from the initial runtime, not as requirements just because the generator selected them.

| Current dependency group | Version(s) | Decision |
| --- | --- | --- |
| `squidlib`, `squidlib-util`, `squidlib-extra` | `3.0.6` | Remove from the target baseline; use SquidSquad consistently |
| `squidseek`, `gand`, `gdcrux` | `4.0.12`, `0.3.7`, `0.1.2` | Defer unless replacing the chosen pathfinding adapter |
| `gdx-ai` | `1.8.2` | Defer; first enemies need a small deterministic state machine |
| `gdx-box2d`, platform Box2D natives, `box2dlights` | `1.14.2`, commit `76536bb895` | Defer; tile collision and FOV do not need a physics world |
| `squidstorecore/grid/path/text`, `jdkgdxds_interop` | `4.0.12`, `2.1.8.0` | Optional JSON serializers for library objects; unnecessary for the initial project-owned DTO format |
| `squidwrathcore/grid/path`, `fory-core`, `tantrum-digital/jdkgdxds/regexodus` | `4.0.12`, `1.6.1`, `1.6.1.0` | Defer the binary serialization stack; require separate Android/RoboVM compatibility evidence before adopting it |
| `squidsmooth` | `4.0.12` | Optional interpolation helpers; start with project presentation tracks and LibGDX interpolation |
| `squidpress` | `4.0.12` | Optional input helpers; start with one LibGDX input pipeline |
| `squidtext` | `4.0.12` | Later procedural names/text |
| `spine-libgdx` | `4.2.10` | Later only if art uses Spine; ordinary sprite animation is sufficient initially |
| `blade-ink` | `1.3.2` | Later authored dialogue/narrative |
| `typing-label` | commit `6f1198f7cc` | Later text effects; keep out of simulation timing |
| `anim8-gdx` | `0.7.0` | Later image/animation export; not required to play sprite animations |
| `gdx-kiwi`, `libgdx-utils` | `1.10.1.12.1`, `0.13.7` | Keep only for a concrete API need |
| `sjInGameConsole` | `1.0.1` | Development tooling; gate debug commands out of release builds |
| `gdx-controllers-core` and platform backends | `2.2.4` | Retain if controller input is implemented; keep backend dependencies platform-specific |

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
   RunSession: Ashley Engine + run state + grid + scheduler
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

| Owner | Authoritative data |
| --- | --- |
| Ashley components | Dynamic actor/object state: cells, health, dice, abilities, statuses |
| `RunSession` | Grid, run phase, active actor, initiative queue, RNG streams, command index, run rewards |
| Profile repository/application model | Permanent progression, inventory, settings and balances |
| Screen/HUD view model | Selection, dialogs, focus, loading/error state, projected game data |
| Presentation tracks | Interpolated positions, camera, particles, floating text, reveal progress |

Components and `RunSession` together form the authoritative simulation. The occupancy index is a derived lookup maintained alongside position/blocking changes and rebuilt on load. UI snapshots are read-only copies, never a second mutable gameplay model.

The simulation may depend on Ashley and project-owned algorithm interfaces. It must not reference `Gdx`, `Screen`, `Stage`, `SpriteBatch`, `AssetManager`, platform SDKs, networking, or file I/O. Backend implementations belong in their platform modules; pure repositories and adapters can live in `core`.

Use constructor injection and small Java interfaces. An async framework is not necessary for this scope.

## 4. Simulation time, presentation time, and threading

| Mechanism | Responsibility |
| --- | --- |
| Ashley system priority | Order within one logical simulation step |
| Project `TurnScheduler` | Which actor acts next and the logical action cost |
| Java worker/executor and platform callbacks | Saves, loads, generation jobs if needed, network work |
| `render(delta)`, `Stage.act(delta)`, animation tracks | Visual progression only |

Run command resolution and Ashley mutation on the LibGDX render thread, serially. A frame drains available controller work, updates presentation, and draws. With no command or automatic actor pending, the simulation does not advance.

Call `engine.update(0f)` only for an explicit rule step. Ordinary turn systems must ignore elapsed seconds; do not use Ashley `IntervalSystem` to drive turn cooldowns. Never recursively call `Engine.update()`.

LibGDX lifecycle callbacks run on the render thread. Worker results return through `Gdx.app.postRunnable(...)`; workers must not operate on Ashley entities, Scene2D actors, graphics, or audio. Give each screen/run a generation token so stale callbacks cannot affect a replaced session. [LibGDX threading](https://libgdx.com/wiki/app/threading).

Use a bounded executor for I/O and one serialized writer for saves. Capture detached immutable data before submitting work. Cancellation is cooperative: cancel owned jobs when appropriate, and still reject late results by session ID. Required durable writes belong to the application, so changing screens does not silently discard them.

## 5. Ashley world model

Use one `Engine` per active run initially. Introduce `PooledEngine` only if measured allocation pressure justifies it; pooled components then need complete reset behavior, and presentation must never retain pooled object references.

Ashley uses `Component`, `Entity`, `Family`, `ComponentMapper`, and `EntitySystem`/`IteratingSystem`. Lower numeric system priorities run first. No component decorators or automatic game-save schema are part of this design. [Ashley guide](https://github.com/libgdx/ashley/wiki/How-to-use-Ashley).

Create entities for players, enemies, doors, traps, pickups, and other objects that participate in rules. Keep floors and walls in a compact grid rather than making every tile an entity.

| Component group | Initial data |
| --- | --- |
| Identity and placement | `StableId`, `GridPosition`, `Actor`, `PlayerControlled`, `BlocksMovement`, `BlocksVision` |
| Perception and AI | `Vision`, `EnemyBrain` with content IDs and deterministic memory |
| Combat | `Health`, `Stats`, `DicePool`, `AbilityLoadout`, `StatusSet`, `Shield` |
| Interactions | `Door`, `Trap`, `Pickup`, `InventoryRef` |
| Transient resolution | `MoveIntent`, `AbilityIntent`, `PendingDamage`, `PendingRemoval` |

Minimal component shape:

```java
package cloud.vinh.rebirthsaga.game.ecs.components;

import com.badlogic.ashley.core.Component;

public final class GridPosition implements Component {
    public int x;
    public int y;
}
```

Use project-generated stable IDs for saves, events, targeting, and replay. Ashley entity object identity and family iteration order must never determine persistent identity or initiative ties.

Ashley applies component changes immediately but defers family/listener updates while systems run; queued entity operations are processed between system updates. This is not the old framework's end-of-scene command buffer. Use `Entity.add/remove` and `Engine.addEntity/removeEntity`, copy event values before removal, and finish cleanup before projecting or saving. [Ashley update considerations](https://github.com/libgdx/ashley/wiki/How-to-use-Ashley#special-considerations).

`RunSession` holds run/floor IDs, rules/content versions, turn and command counters, active actor, logical phase, scheduler, grid, RNG streams, visibility/exploration state, run inventory, and pending rewards. Rendering's `isAnimating` flag is not a saved gameplay phase.

## 6. Ordered rule pipeline

Each command or automatic actor action resolves through an explicit context. Systems process only the active action and its effects; a system pass does not give every entity a turn.

| Priority | System | Responsibility |
| ---: | --- | --- |
| 100 | `CommandValidationSystem` | Validate actor, phase, targets and costs; reject without partial mutation |
| 150 | `EnemyIntentSystem` | Choose an AI action when the active actor is an enemy |
| 200 | `MovementSystem` | Commit legal cardinal movement and occupancy changes |
| 300 | `InteractionSystem` | Doors, traps, pickups, stairs, contact with an enemy |
| 400 | `DiceSystem` | Roll once per activation, reroll, assign and consume dice |
| 500 | `AbilitySystem` | Validate committed ability use and calculate effects |
| 600 | `DamageSystem` | Apply shield, resistance, HP changes and death markers |
| 700 | `StatusEffectSystem` | Apply statuses and process explicit turn-boundary triggers |
| 800 | `CleanupSystem` | Remove dead actors from occupancy/initiative, clear transient intents |
| 900 | `VisibilitySystem` | Refresh visibility after movement or opacity changes |
| 1000 | `TurnFinalizationSystem` | Finalize action cost, select the next actor, update terminal state |

Project snapshots/export event batches in the controller **after** `Engine.update()` returns and Ashley has processed pending operations. Save only at those completed command boundaries.

An ability can produce several effects; resolve them in a stable order. A status tick that deals damage must use the same synchronous damage resolver before cleanup, rather than leaving pending damage for an accidental future command. Pass explicit `activationStarted`/`activationEnded` signals so rolling or assigning dice cannot tick poison repeatedly.

Expected invalid commands return an `ActionResult` and reason. Invariant failures halt the session with seed/command diagnostics; do not continue from a half-applied action or save it as healthy state. Systems emit events for external work and never perform I/O themselves.

## 7. Grid movement and interaction contract

Use `int` coordinates, cardinal movement, and a project-owned `DungeonGrid` with flattened `int[]` tile IDs indexed by `x + y * width`. Choose a y-up world convention and translate input/asset orientation at the edges.

A `MOVE(dx, dy)` requires `abs(dx) + abs(dy) == 1`, map bounds, valid terrain, and no blocking occupant. On success, commit the new cell and update occupancy together. Events contain both old and new cells for interpolation.

| Action/result | Initial rule |
| --- | --- |
| Move to an empty walkable cell | One standard action; resolve entry traps and pickups |
| Move into a closed unlocked door | Open it, remain in place, consume one standard action |
| Wall, out-of-bounds, locked door without a key | Reject without spending initiative |
| Contact an adjacent hostile | Enter the dice-action flow below; never overlap cells |
| Wait | One standard action |
| Invalid target or insufficient ability resources | Reject without spending dice or initiative |
| Open settings, inspect inventory, select a target | UI-only; no simulation time |
| Consume an item or change equipment during a run | Explicit gameplay command with a defined cost; unavailable in the first combat slice |
| Descend stairs | Explicit interaction after arrival; checkpoint before changing floor |

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

Keep distinct streams for generation, AI decisions, combat/dice, loot, cosmetic presentation, and local development gacha. Explicitly seed each stream using fixed stream identifiers. Cosmetics must never consume gameplay RNG.

Save the RNG algorithm ID, state format version, and **all** state words, not just the original seed. Encode long words losslessly, such as hexadecimal strings. Restore only recognized algorithms/state counts. Capture state after every accepted randomness-consuming command, including rerolls.

Never use `Math.random()`, `MathUtils.random`, system time, unordered hash iteration, or Ashley entity order for authoritative decisions. Cross-platform replay fixtures must survive JVM, Android, and RoboVM execution before deterministic portability is claimed.

## 9. Turn scheduler and command runner

Implement a small project-owned `TurnScheduler`; the selected libraries do not supply the previous plan's rot.js scheduler contract.

Use an initiative queue ordered by `(dueTick, insertionSequence, stableActorId)`. Store `long` logical ticks and persist tie-break values. For the first slice every completed activation costs `100` ticks; introduce integer-based speed/action-cost rules later without using wall time or floating-point timestamps.

Snapshot the queue, current tick, active actor, next insertion sequence, and any in-progress player activation. Remove dead actors before selecting the next actor. An active actor is not also queued as waiting for a duplicate turn.

```text
Input command
  -> validate expected session and current actor
  -> resolve one synchronous Ashley command step
  -> commit snapshot/events and request a checkpoint
  -> if activation ended, run scheduled automatic actors in order
  -> stop when player input is needed or the run ends
  -> present the committed event sequence
```

A logical activation can contain several dice commands. Only commands that finish it advance initiative. Roll/assign/reroll have their own resource and phase rules but cannot silently give enemies extra turns.

Add an automatic-action count guard to detect an invalid scheduler loop. If a valid burst needs to be spread over render frames, yield only between complete logical actions; retain deterministic order and block additional gameplay input until the player is due.

Keep command sequence numbers for accepted commands and event sequence numbers for exported events. Include run/session identity on callbacks and animation acknowledgements. A replay identifies initial state or seed, generator/rules/content versions, and ordered accepted commands; a seed alone is insufficient after rules or content changes.

## 10. Dice combat vertical slice

Start with one hero, one adjacent enemy type, a small dice pool, one damage ability and one defensive ability. Health, shields, dice and statuses remain in Ashley throughout exploration and combat.

Choose one initial contact rule: bumping an enemy enters a **dice activation for the current player turn**, without moving or immediately dealing damage. This command selects the target; a player cannot reset the activation by closing the panel or changing targets. The same initiative queue continues to govern all actors.

| Command | Contract |
| --- | --- |
| `ROLL_DICE` | Allowed once per dice activation; store the committed values immediately |
| `REROLL_DIE` | Spend the specified reroll resource and replace that die's value |
| `ASSIGN_DIE` / `UNASSIGN_DIE` | Edit legal assignments within the existing activation; no new random draw |
| `USE_ABILITY` | Validate target/cost, consume assigned dice, apply effects, emit events |
| `END_TURN` | Discard remaining activation resources, tick end-of-turn rules once, spend the standard action cost |

Enemy activations use deterministic policy and the same effect/damage helpers, then end once. Ending the last hostile encounter returns the UI to exploration; define and test automatic player-turn completion on victory so killing the target cannot award an extra free activation. Multi-enemy joining and more elaborate encounter rules belong to the dungeon-depth milestone.

Use pure Java helpers for dice matching, damage, armor, criticals, shield absorption and status stacking. Every modifier has an explicit evaluation order. Turn-based duration means an identified actor's activation boundary, not every command, frame, or global actor turn.

Save stable dice-command boundaries so loading after a roll or reroll restores the result and resource expenditure. The first encounter should be fully playable without a gacha service.

## 11. LibGDX presentation and input

### Dungeon rendering

Use `SpriteBatch`, `TextureAtlas`, `TextureRegion`, `OrthographicCamera`, and a world viewport. Begin with 16-pixel tiles and nearest-neighbor filtering; choose a small logical world resolution and test integer scaling/letterboxing across target screens.

Draw terrain, remembered terrain/fog, visible props, visible actors, and effects in an explicit order. Batch sprites sharing atlas textures. Use a stable depth rule such as layer, cell y, stable ID; never depend on entity creation order to resolve draw ties.

`ACTOR_MOVED` provides a copied source and destination cell. A presentation track interpolates the sprite while the authoritative actor is already at its destination. Animation completion can release input gating but cannot grant damage, loot, currency or a turn. Skipping animations snaps to the committed state and consumes each event only once.

After a command burst, movement/events may describe intermediate positions while the snapshot is the final state. Animate from the event sequence and reconcile at the end, rather than teleporting to the final snapshot before playing the sequence. Use observed visibility at event time to avoid revealing hidden actions.

Start with drawing visible map cells each frame; introduce chunk caches or a low-resolution framebuffer only if measurements justify them. Sprite animations use LibGDX animation utilities; Spine is optional future art tooling.

### HUD and menus

Use a separate `Stage` and UI viewport for dice, ability slots, HP, inventory, dialogs, pause and progression screens. Build layouts with `Table` and `Skin`, using the existing `assets/ui` resources as prototype assets. Scene2D UI does not require adding another UI framework. [Scene2D UI guide](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui).

Call `stage.act(clampedDelta)` for UI animation and `stage.draw()` for display. Stage actions animate widgets only. Update widget content from committed view models; listeners submit commands instead of mutating components.

An `InputMultiplexer` routes input to modal/UI controls first and world controls second. Ensure a consumed touch cannot both press an ability and move the hero. Convert touches using the relevant viewport's unprojection, including letterboxing and HUD exclusion areas. In `resize`, update both viewports and preserve the existing zero-size guard.

Provide remappable keys, keyboard focus, clear selection states, large touch targets, scalable text, reduced motion and color-independent dice/status cues. Scene2D widgets are rendered game UI; screen-reader support must be separately designed and verified on Android/iOS, not assumed from the old native-widget plan.

## 12. Events, assets, and resource lifetime

Domain events are plain immutable Java values: `ActorMoved`, `DoorOpened`, `DiceRolled`, `AbilityUsed`, `DamageDealt`, `StatusApplied`, `ActorDefeated`, `ItemCollected`, `FloorChanged`, and `RunCompleted`.

Include stable IDs, copied payloads, event order, and enough visibility/position information for presentation. A controller-owned presentation bridge maps these into animation, SFX and haptics. Render code does not subscribe to mutable Ashley entities or retain component references.

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

Use **project-owned, versioned JSON DTOs** for the first offline implementation. LibGDX already includes `JsonReader`, `JsonValue`, `JsonWriter`, and custom serialization support; SQLite and a Java database abstraction are not present in the current dependencies. [LibGDX JSON guide](https://libgdx.com/wiki/utils/reading-and-writing-json).

Decode explicit fields and validate them before building a run. Prefer explicit codecs/custom serializers over serializing Ashley, reflection-driven class names, scheduler internals or arbitrary library graphs. This keeps schema changes deliberate and reduces reflection/linker dependence on Android and RoboVM.

A save bundle contains:

```text
schemaVersion, rulesVersion, contentVersion, generatorVersion
saveRevision, profileRevision, updatedAt (metadata only)
profile: progression, inventory, currencies, committed reward IDs
run: ID, floor index, original seed, generated tile data, entity DTOs
     explored cells, logical phase, active actor, turn/command counters
     initiative queue and tie-break state
     each gameplay RNG algorithm + complete state
     current dice activation, assignments, reroll resources
     run inventory, pending rewards and completion status
```

Save the actual generated map and changes; do not depend on regenerating an old floor with a future library version. Rebuild occupancy, family indexes, resistance/FOV caches and presentation state after load. Exclude transient intents, in-progress system effects, textures and animation clocks.

For the first slice, use one logical bundle containing both profile and run, stored in two alternating local save slots. A serialized writer writes the inactive slot with an increasing revision and checksum, closes it, and verifies it before reporting durability. On load, validate both slots and select the newest complete supported revision. A torn write must leave the previous good slot usable; platform-specific flush/replace behavior still needs interruption testing.

This combined bundle makes a local run-completion grant one persisted transition: updated profile, consumed pending reward, completed run and grant ID together. A load/retry cannot grant the same reward twice. Preferences may hold volume/control settings but do not replace the run-save mechanism.

Checkpoint after accepted gameplay commands, floor transitions, completed rewards and lifecycle pause. Preserve order so an older write cannot overwrite a newer revision. If coalescing saves, keep the newest complete snapshot and retain durability callbacks; for rolls, rerolls and reward grants, gate subsequent gameplay until the checkpoint succeeds or the player explicitly handles the save failure.

On `pause`, request a bounded flush of the last committed snapshot. If suspension arrives during animation, the save already describes the completed rules. If it arrives while generation is pending, retain the previous stable floor. Do not rely on a background executor continuing after the OS suspends the app.

Schema migrations are explicit and sequential. Reject unsupported future versions without overwriting them; preserve a recoverable copy and offer a clear load error. Keep migration/replay fixtures for every shipped schema/content/rules combination. Consider SQLite later only when query or transaction needs justify a vetted cross-platform implementation.

## 15. Data-driven content

Create validated catalogs under `assets/data/` for tiles, heroes, enemies, dice, abilities, statuses, items, loot/encounters, generation profiles, progression curves, and later banners/pity rules.

Use stable content IDs and explicit schema versions. Parse into Java DTOs and validate required fields, ranges, enum values, referenced IDs, probability totals, progression monotonicity and reachable generation constraints. Parsing JSON alone does not validate game rules.

Load an immutable catalog before starting a run. Pin a run to its rules/content version; do not refresh definitions in the middle of a command. Keep retired content or a deliberate migration policy for resumable shipped runs.

Separate content from visuals: a monster definition references an animation/atlas ID rather than embedding a `TextureRegion`. A missing visual asset should fail loading with a useful diagnostic before entering the dungeon.

## 16. Progression, gacha, and online services

First deliver an offline loop: select a hero/loadout, descend, win dice encounters, collect loot, complete or lose the run, and commit progression. Define what survives defeat and test the reward transaction before expanding content.

Permanent inventory, account balances, authentication, purchases and gacha belong to application/repository services. Starting a run copies a validated loadout into simulation state; live account changes cannot silently rewrite an active character.

Development gacha can use a clearly separate local simulator and currency. Production pulls require a server-owned transaction and RNG, with an idempotency key, authoritative balance/pity/inventory result, and durable reconciliation after interruption. Purchase grants require verified platform transactions and server-side entitlement handling.

A reveal animates a known committed result using Scene2D/sprite effects initially. Closing the reveal, losing network connectivity or restarting the app must not duplicate or discard the grant. Native billing/auth/secure storage need Android and RoboVM integrations behind interfaces; they are not supplied by the current dependency set.

Cloud save, analytics, crash reporting and live content updates are later features. Specify conflict/version rules before syncing local profiles; replacing a save file with whichever network response finishes last is not a sync policy.

## 17. Target project structure

Grow this structure by feature; the paths below are proposed within the existing modules.

```text
core/src/main/java/cloud/vinh/rebirthsaga/
  RebirthDungeon.java
  bootstrap/                 service and screen wiring
  application/               RunController, results, repository interfaces
  game/
    ecs/components/          Ashley data components
    ecs/systems/             ordered rule systems
    RunSession.java
    grid/                    DungeonGrid, occupancy, movement rules
    algorithms/              generator/path/FOV/random interfaces
    squidsquad/              SquidSquad and Juniper adapters
    turns/                   initiative and activation rules
    combat/                  dice, abilities, damage, statuses
    commands/                plain Java command types
    events/                  immutable domain events
    projection/              observed HUD/render snapshots
    replay/                  command logs and state hashes
  data/
    content/                 catalog loaders and validation
    save/                    DTOs, codecs, migrations, local repository
  presentation/
    screens/                 loading, title, dungeon, progression
    dungeon/                 SpriteBatch renderer and camera
    hud/                     Scene2D controls and view models
    animation/               presentation tracks and event mapping
  platform/                  shared platform service interfaces

core/src/test/java/cloud/vinh/rebirthsaga/
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

| Area | Required evidence |
| --- | --- |
| Movement/occupancy | Cardinal-only steps, bounds/walls, doors, traps, no actor overlap, correct action costs |
| Generation | Bounded attempts, reachable spawn/exit, correct x/y translation, stable seeded fixtures |
| Path/FOV | Four-way routes, dynamic blockers, door invalidation, corner visibility, explored memory |
| Ashley | Priority behavior, structural changes between systems, cleanup before projection, no stale IDs |
| Turns/combat | Stable initiative ties, single turn-boundary ticks, no extra turns from dice commands, no reroll/reset exploit |
| Determinism | Same inputs yield identical canonical state/events; save/load mid-activation preserves the continuation |
| Persistence | Torn slot recovery, ordered writes, migrations, future-version rejection, reward deduplication |
| Async/lifecycle | Late callbacks ignored, durable saves survive screen changes, pause/resume during animation/generation |
| Presentation/input | Touch consumption, viewport unprojection, focus/remapping, animation skip, hidden-actor privacy |
| Platforms | Desktop launch, Android debug/release packaging, RoboVM AOT build and actual device lifecycle checks |

Use canonical ordering for state hashes and replay comparisons. Test a restored run against an uninterrupted run, including RNG continuation and initiative order, rather than merely comparing a saved DTO to itself.

Target 60 fps presentation on selected baseline devices. Measure ordinary turn latency and generation worst cases separately. Keep occupancy lookup O(1), FOV change-driven, pathfinding decision-driven, and all I/O outside rule resolution. Reuse rendering buffers and bound particles, floating text and event queues. Optimize snapshot copying/map batching only after measuring representative maps and enemy counts.

Test UI and rendering on actual desktop and mobile backends; a headless test cannot validate texture filtering, audio, touch behavior or native accessibility. Run Android minified builds and iOS linking checks before expanding optional reflection-heavy libraries.

## 19. Implementation milestones

### Milestone 0 — Repair and prove the dependency baseline

- Repair the duplicate jdkgdxds artifact graph and verify Android assembly.
- Remove/defer overlapping optional libraries from the first-slice runtime; keep associated native dependencies consistent.
- Separate desktop build tools, preserve reviewed version pins, and capture the resulting dependency graph.
- Create a visible loading/prototype screen that loads the existing skin, draws with `SpriteBatch`, and accepts one Scene2D input.
- Prove an ordered Ashley step, seeded SquidSquad generation and disposal/recreation of a screen.
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

### Milestone 2 — Dice encounter and resumable activation

- Add the chosen contact flow, dice pool, attack/defense abilities, enemy action, damage and statuses.
- Implement roll/reroll/assignment/ability/end-turn contracts and input gating.
- Add ordered SFX/haptics and skippable animation.
- Persist dice-command checkpoints and restore mid-activation without changing rolls or resources.

**Exit:** one complete encounter can be won or lost, interrupted and resumed with the same outcome.

### Milestone 3 — Durable run and progression loop

- Complete versioned save bundles, alternating-slot recovery, migrations and failure UI.
- Commit profile progression and run rewards together with grant IDs.
- Exercise lifecycle interruption, stale async results and floor-transition failure.
- Validate saved-run replay on desktop, Android and iOS.

**Exit:** a complete offline run survives interruption and cannot duplicate completion rewards through ordinary save/load/retry flows.

### Milestone 4 — Dungeon depth and presentation quality

Add more floor profiles, traps, loot, stairs, hero abilities, enemy policies, multi-enemy encounter rules, inventory and progression screens. Add tap-to-walk/controller support as needed, refine art/audio, and meet measured performance/input/accessibility targets.

**Exit:** the offline game loop is coherent across supported devices, with validated content and release-build smoke coverage.

### Milestone 5 — Production services and delivery

Add server-authoritative gacha, verified purchases, account/secure storage integrations, cloud-save policy, result reveals, analytics/crash reporting and live-content controls. Produce desktop packages, Android release artifacts and an iOS archive with platform-specific validation.

**Exit:** interruption and retries preserve purchases/grants, save/content migrations work from prior releases, and store/device requirements have been checked at release time. Graal Native Image remains optional and gets its own compatibility gate.

## 20. Documentation and audit evidence

Official documentation was retrieved with the Firecrawl skill. Exact Ashley `1.7.4`, SquidSquad `4.0.12` and Juniper `0.10.5` signatures were also checked in resolved Gradle source JARs, so current README examples do not silently substitute newer APIs.

| Source | Use in this plan | Local Firecrawl cache |
| --- | --- | --- |
| [Ashley usage and update behavior](https://github.com/libgdx/ashley/wiki/How-to-use-Ashley) | Components, families, system priority and deferred notifications | `.firecrawl/ashley-guide.md` |
| [SquidSquad repository/module guide](https://github.com/yellowstonegames/SquidSquad) | Module selection, algorithm ownership, serialization choices | `.firecrawl/squidsquad-readme.md` |
| [jdkgdxds publication guidance](https://github.com/tommyettinger/jdkgdxds) | JitPack publication and upgrade context | `.firecrawl/jdkgdxds-readme.md` |
| [LibGDX threading](https://libgdx.com/wiki/app/threading) | Render-thread ownership and worker handoff | `.firecrawl/libgdx-threading.md` |
| [Scene2D UI](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui) | Stage, Table, Skin and UI layout | `.firecrawl/libgdx-scene2d-ui.md` |
| [Managing assets](https://libgdx.com/wiki/managing-your-assets) | Loading, reference counts, disposal and static-resource pitfalls | `.firecrawl/libgdx-assets.md` |
| [Application lifecycle](https://libgdx.com/wiki/app/the-life-cycle) | Pause/resume and save boundaries | `.firecrawl/libgdx-lifecycle.md` |
| [Reading and writing JSON](https://libgdx.com/wiki/utils/reading-and-writing-json) | Explicit JSON parsing and custom codecs | `.firecrawl/libgdx-json.md` |

The cache is ignored by Git. Local build logs are saved in `.firecrawl/gradle-core-dependencies.log`, `.firecrawl/gradle-platform-verification.log`, `.firecrawl/gradle-android-assemble-debug.log`, and `.firecrawl/gradle-version.log`. These command results and the duplicate-class diagnosis are local build evidence, independent of upstream documentation. Keep this plan's checked versions and verification table updated when Milestone 0 changes the build.
