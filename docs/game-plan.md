# Rebirth Dungeon: Kotlin + LibGDX Game Plan

> **Active migration (2026-09-10):** [Free exploration and separate battles](free-exploration.md) supersedes the grid-world, shared dungeon/battle screen, spatial combat, and legacy-save contracts below. Earlier phase evidence is retained as history.

Rebirth Dungeon is a **2D pixel-art roguelike with free exploration and separate dice battles, loot, progression, and a later gacha meta game**. Build it in Kotlin using the existing LibGDX project (ported from the original Java gdx-liftoff scaffold on 2026-09-06), with desktop as the fastest development target and Android/iOS as delivery targets.

The game is turn-based: commands advance the simulation; frames advance presentation. The same initial state, content version, rules version, and commands must reproduce the same outcomes regardless of frame rate.

> The artemis-odb `World` owns live dungeon entities and rules. SquidSquad supplies dungeon algorithms. The application controller coordinates commands, persistence, and platform services. LibGDX renders and receives input.

Gameplay alignment updated **September 5, 2026** from the design documents below. These documents define planned rules, not completed features; numeric examples and proposed defaults remain provisional. The architecture and dependency audit retain their original verification dates. Drift corrections dated **2026-09-07** come from the [documentation audit](audit.md): implementation status and toolchain values were re-checked against the repository, sections describing the September 2 audit are labeled historical, and the titles specification is integrated below.

| Gameplay specification | Owns |
| --- | --- |
| [Battle](gameplay/battle.md) | Five-dice skill selection, keep/reroll, scoring, damage, activation commands |
| [Stats](gameplay/stats.md) | HP/MP/SP, costs, attributes, equipment contributions, buffs/debuffs |
| [Skills](gameplay/skills.md) | Acquisition, training plus AP, ranks, active/passive combat catalog |
| [Character](gameplay/character.md) | XP, levels, talents, aging, proposed rebirth |
| [Inventory](gameplay/inventory.md) | Grid storage, bags, stacks, equipment, overflow, run provisions |
| [Enchants](gameplay/enchants.md) | Equipment prefix/suffix effects, application and burning transactions |
| [Quests](gameplay/quests.md) | Chapters/Generations, delivery, objectives, claims, NPC role-playing missions |
| [Titles](gameplay/titles.md) | Achievement discovery/awards, First/Second title slots, equipped-title stat sources, cosmetic talent display |

Use these specifications for detailed gameplay contracts and this plan for system ownership and implementation order. The skills catalog defines later reaction, area, movement, and critical extensions to the starter battle rules; enable them only when their dependencies and authored values exist. The titles specification is integrated with the profile, run snapshots, saves, stats sources, character UI, and validation coverage below; it adds no separate progression subsystem. Mabinogi and Dicero reference mechanics are not automatically Rebirth Dungeon requirements.

This plan replaces the previous Expo/React Native architecture. It describes a target implementation, not completed gameplay. The dependency audit below reflects the working tree checked on **September 2, 2026**.

## 1. What exists today

Current architecture: `SessionCoordinator` owns the town/expedition and durable save bundle. `ExplorationSimulation` advances fixed-point positions through polygon navigation at explicit 60 Hz ticks. `BattleSimulation` owns one artemis World for one encounter. `ExplorationScreen` and `BattleScreen` consume detached observations. See [free-exploration.md](free-exploration.md) for migration status and verification; earlier phase documents preserve historical evidence.

### Toolchain baseline

Values re-checked against the repository on **2026-09-07**. The original September 2 audit recorded wrapper `9.7.1` and daemon JVM `21`; the 2026-09-06 work notes corrected the wrapper to **9.5.1**, and Phase 1 onward runs use daemon JVM **25** (`gradle/gradle-daemon-jvm.properties`).

| Setting                   | Checked value                              | Consequence                                                                           |
|---------------------------|--------------------------------------------|---------------------------------------------------------------------------------------|
| Gradle wrapper            | `9.5.1`                                    | Use the checked-in wrapper                                                            |
| Gradle daemon criteria    | Java `25`                                  | Build JVM selection is separate from application language level                       |
| Shared language           | Kotlin `2.4.10`, JVM `1.8` target          | Kotlin sources compile to JVM 1.8 bytecode; the API surface is capped at Java 8 via `-Xjdk-release=1.8` (port: 2026-09-06) |
| Shared compiler guard     | `jvmTarget=1.8` + `-Xjdk-release=1.8`      | Compilation rejects newer JDK APIs, keeping the Android dexer and RoboVM AOT compiler working                        |
| Android Gradle Plugin     | `8.13.2`                                   | Validate Android packaging separately from JVM compilation                            |
| Android SDK               | min `21`, compile/target `36`              | These are configured targets, not a verified device support matrix                    |
| Android desugaring        | `desugar_jdk_libs:2.1.5`                   | Does not make arbitrary modern JVM APIs portable to all targets                       |
| RoboVM                    | `2.3.23`                                   | iOS needs its own AOT/linking and device checks                                       |
| iOS plist minimum         | `12.0`                                     | Confirm against the selected Xcode/RoboVM/backend before claiming support             |
| Construo                  | `2.1.0`, bundled JDK downloads `25.0.4+1`  | Desktop distribution runtime is distinct from source compatibility                    |
| Graal Native Image        | `enableGraalNative=false`                  | Optional later desktop experiment; not the iOS runtime                                |

Enforced now: the Kotlin compiler flag `-Xjdk-release=1.8` (set in the root `build.gradle.kts`) rejects newer JDK APIs in shared code; the boundary/format gate is the `checkSimulationBoundary` task wired into `:core:check`.

## 2. Gradle dependency audit

> **Historical record (September 2, 2026).** This section and its tables describe the working tree as checked on 2026-09-02, not a current installed-dependency inventory. Two later changes supersede parts of it (both recorded in [project phases](project-phases.md) Work Notes): the Phase 0 repair (2026-09-02, recorded at the end of this section) closed the Android duplicate-class blocker, and the user-directed 2026-09-06 adoption of the full gdx-liftoff **Kotlin + KTX dependency set** reversed the "remove/defer" disposition for most of the "already present" list — with `org.apache.fory:fory-core` and the `com.github.tommyettinger.tantrum` group excluded at graph level because Fory requires Android API 26+. Current pins live in `gradle.properties` and the per-module lockfiles.

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

No Gradle dependency changes were applied by the original audit. The proposed repair below was implemented on 2026-09-02 (see the "Phase 0 repair record"); the proposed runtime reductions were partially reversed by the 2026-09-06 user-directed dependency adoption, which is why this audit's tables no longer describe the current graph.

### Confirmed Android blocker: duplicate jdkgdxds artifacts

*(Resolved 2026-09-02 — see the "Phase 0 repair record" at the end of this section. The narrative below is retained as the historical diagnosis.)*

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

Resolved versions moved after this table was checked: the 2026-09-06 adoption accepted transitive bumps of juniper `0.10.5` → `0.10.6`, jdkgdxds `2.1.8` → `2.1.9`, and digital `0.10.2` → `0.10.3` (pins updated to match resolution), and added the KTX modules at `io.github.quillraven.libktx` `1.14.2-rc1` plus the rest of the liftoff set. `gradle.properties` is authoritative for current pins.

### Dependencies already present but outside the first slice

Treat these as candidates for removal from the initial runtime, not as requirements just because the generator selected them. *(September 2 disposition. The 2026-09-06 user-directed adoption re-declared most of this list — SquidLib, the full SquidSquad set, gdx-ai, Box2D/lights, controllers, spine, blade-ink, vis-ui, typing-label, anim8, libgdx-utils, console and more — as `implementation` dependencies staged for upcoming phases; only `fory-core`/`tantrum` remain excluded. See the section note above and the 2026-09-06 work note.)*

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
- All current core libraries are exposed with `api`. Keep `api` where launcher compilation requires an exposed type, such as LibGDX's `Game`; prefer `implementation` for internal libraries after checking the public surface. *(September 2 state: the rule is now "only `gdx` is `api`", plus `ktx-app` since 2026-09-06 because `KtxGame` is a public supertype.)*
- Add dependency locking/verification after repairing and reducing the graph. Pin new test libraries deliberately; the project currently has no explicit test framework dependency. *(Done 2026-09-02: per-module lockfiles, `gradle/verification-metadata.xml`, and JUnit 4.13.2.)*

### Phase 0 repair record (2026-09-02)

The duplicate blocker was reproduced and repaired. The JitPack root POM for `com.github.tommyettinger:jdkgdxds:2.1.8` depends on both `com.github.tommyettinger.jdkgdxds:build` and `com.github.tommyettinger.jdkgdxds:jdkgdxds`, whose JARs and dependency lists (funderby, digital) are identical; the root build now excludes exactly the `:build` module from every subproject configuration, retaining `:jdkgdxds`. After also reducing the runtime to the first-slice table above (Box2D/lights/natives, controllers, and all deferred libraries removed), `:android:checkDebugDuplicateClasses` and `:android:assembleDebug` pass, and core/lwjgl3/android/ios dependency reports resolve without `FAILED`. The graph is pinned by per-module `gradle.lockfile` files and `gradle/verification-metadata.xml`; full evidence lives in project-phases.md and the README "Dependencies" section.

## 3. Architecture and ownership

Bootstrap wires content and the session repository. `application/session` exclusively coordinates exploration, battle, supplies, gold and outcome commits. `application/run/BattleController` serializes combat commands and saves each player/automatic action. The application survives screen transitions.

`game/exploration` owns navigation, generation, collision, discovery and encounter triggers. `BattleSession` plus ECS components own active battle state. Outside battle, one detached hero record belongs to the session coordinator; during battle it is absent and only the World owns mutable resources. Presentation receives immutable observations, never full restore exports.

## 4. Simulation time, presentation time, and threading

Exploration uses explicit 60 Hz steps and tick/sequence-indexed commands. Fixed-point positions and exact geometric predicates are independent of rendering; frames interpolate adjacent observations. Catch-up is bounded to eight steps per frame without dropping queued ticks; pause/resume discards suspended wall time. Battle advances only through explicit commands and automatic scheduled actions.

Mutations remain serial on the render thread. Game code imports no Gdx, clock, I/O or platform APIs. No recursive World processing. Future worker results must return through postRunnable with session identity checks. Screens never own save jobs or gameplay lifetimes.

## 5. artemis-odb world model

One World per active battle, built with WorldConfigurationBuilder. Plain no-arg mutable components hold health, pools, stats, dice, statuses, cooldowns, abilities and stable identity. Grid position, blocker and vision components have been removed. Entity IDs are recycled framework handles; project IDs identify battle participants and saves.

Exploration is a separate pure simulation, not another combat engine or a second mutable hero model.

## 6. Ordered battle rule pipeline

Validation → enemy intent → dice → ability → damage → status → cleanup → turn finalization. Existing costs, frozen inputs, activation timing, defeat precedence and event ordering remain. Snapshots and checkpoints are exported after World.process completes. There are no movement, interaction, occupancy or visibility systems in battle.

## 7. Free movement and interaction

Positions have 256 subpixels per world pixel. Convex navigation polygons already describe center clearance from obstacles. Project-owned A* searches stable polygon IDs with deterministic cost/tie ordering; portal funneling produces continuous waypoints. Exact rational segment clipping prevents tunneling. Near-edge clicks project only onto a reachable visible boundary; blocked destinations reject.

Mouse/touch destinations and normalized keyboard directions share collision rules. Replacing a route cancels its prior interaction. NPC clicks approach authored service points. Modal surfaces, menus, suspension and battle entry stop movement. NPCs/enemies are stationary in the slice. Towns are safe; dungeon detection uses distance, observation eligibility and unobstructed geometry.

## 8. World generation, discovery and RNG

Strict `world.json` content supplies town geometry, NPC services, potion offers and room templates with entry/exit connectors. Seeded bounded assembly joins compatible room connectors, rejects overlaps and verifies required reachability. No cell-based generation or hidden movement grid remains. Current content uses four rooms, narrow connecting approaches and three required encounters.

Rooms become discovered at their doorway; discovered geometry persists, while live actors are projected only from the current observable room. Gold frontier markers expose only entrances adjacent to discovered rooms. Hidden navigation topology is never sent to presentation.

Retain independent generation, AI, combat and loot AceRandom streams and explicit captures. Navigation uses no randomness. Exploration does not consume battle RNG or tick statuses.

## 9. Turn scheduler and command runner

TurnScheduler is battle-only. Rolls, keeps and rerolls do not finish an activation; commit, Pass and pre-roll potion use do. The battle controller checkpoints each accepted action before automatic enemies advance. Expected rejections change no state or RNG. Invariant failure halts the controller. Required save failure blocks further actions; Retry saves the same state.

## 10. Dice combat vertical slice

The [Phase 4 starter contract](phase4-combat.md) supplies content-v2 values, encounter participation, recovery/exhaustion, and the command-only checkpoint gate.

Follow [battle.md](gameplay/battle.md) and [stats.md](gameplay/stats.md): exactly **five six-sided dice power one selected active skill**. Begin with one hero, one enemy, and a sword skill at two illustrative ranks with fair and weighted profiles; add a defensive skill after its effect and duration are authored. This replaces per-die allocation across abilities. Health, mana, stamina, shields, dice and statuses stay in the same run simulation during exploration and combat.

Bumping an adjacent hostile opens a dice activation for the current player turn without moving or dealing damage. Before rolling, allow a legal skill/target change; the first accepted roll locks skill, rank, target, effective attack and mitigation inputs, cost vector, and six-face probability profile. The same initiative queue governs all actors.

| Command or intent | Contract |
| --- | --- |
| Select skill/target | Before rolling; validate learned active skill, equipment, encounter membership, target, cooldown and resource affordability |
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

ExplorationScreen composes town/dungeon rendering, world viewport, camera, feet-anchored sprites, depth sorting and service dialogs. Input unprojects through that viewport; UI gestures never become world clicks. BattleScreen stages combatants cosmetically and composes BattleHud, modal potion selection, feedback tracks and keyboard/touch ownership. No combat distance is inferred from sprite placement.

AssetManager owns shared skins, atlases, fonts and sounds. Screens own their batches, Stages and shapes and dispose them on navigation. Session state survives fresh screen instances. Inspect/skip/animation completion never issues gameplay commands.

## 12. Events, assets, and resource lifetime

Domain events are plain immutable Kotlin values: `ActorMoved`, `DoorOpened`, `DiceRolled`, `AbilityUsed`, `DamageDealt`, `StatusApplied`, `ActorDefeated`, `ItemCollected`, `FloorChanged`, and `RunCompleted`. Add stable outcome IDs and relevant skill/rank, equipment, target and mission context for training and quest evidence. Town transactions emit learning/rank-up, equipment-change, level/age/rebirth, enchant-result, title award/equip and quest delivery/claim events only after their state is committed; notifications never grant progression.

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

Represent expected failures with explicit Kotlin result/error types, for example `LoadFailure`, `SaveFailure`, `InvalidContent`, `GenerationFailure`, and later `NetworkFailure`. Normal rejected movement is a domain result. An invalid navigation state is a defect with diagnostic context.

Bound retries and give each operation one retry owner. Retry only transient operations that are safe to repeat. Save failures retain the latest pending snapshot and expose a retry state; malformed content and unsupported save versions are not transient errors.

## 14. Persistence, recovery and reward consistency

SessionCodec stores only new version-3 primitive session records in alternating version-2 checksummed envelopes. Content schema/rules are version 2 and the catalog is version 3. No old movement codec, compatibility engine or migration remains. The bundle includes mode, expedition/operation IDs, placed room templates and offsets, fixed-tick position/path/remainder, discoveries, defeated encounters, hero or full battle restore, RNG, supplies, gold and pending rewards.

Validate both slots before selecting the newest; never overwrite the latest valid slot. Read back writes and check checksum/payload. Required saves cover battle entry/actions/outcome, services and exits. Movement saves every 120 simulation ticks and at lifecycle/menu boundaries. Screens cannot discard the application writer. Transaction operation and battle revision checks reject stale repeats.

Victory resolves the encounter once, stores pending loot/gold, and clears walking intent. The authored required encounters unlock the exit; exit commits rewards once. Defeat discards pending rewards and preserves remaining brought supplies. Recovery is explicit and free for this slice. Insufficient potion capacity blocks exit reward claim until supplies are used; no silent loss or partial grant.

## 15. Data-driven content

Jackson strictly binds nullable content DTOs with unknown field/enum/coercion/duplicate detection. Load order is manifest, starter combat catalog, actor visuals, then world geometry. Immutable validated values cross into game code; Gdx JSON is used only for save records. IDs remain independent of filenames. The first slice deliberately authors world.json as the fixed world catalog entry.

The slice replaces tile/generation catalog fields and skill range with polygon templates, service objects, shop offers and encounter membership. Spatial skill extensions remain disabled. Future equipment/progression/banking catalogs retain their own validation requirements when delivered.

## 16. Progression, inventory, quests, and online services

First deliver an offline loop: prepare a hero/loadout in town, explore and resolve five-dice encounters, collect eligible loot and training, commit the run outcome, then learn/advance skills and continue quests. A life can contain many runs; victory, defeat or starting a run does not trigger rebirth. Use hero-owned progression and inventory as the proposed default; settle account sharing and victory/defeat/abandonment retention before shipping inventory-backed runs.

### Skills and character progression

Follow [skills.md](gameplay/skills.md): NPC instruction, reading a complete book, or assembling a book from distinct pages can learn a skill at **F with 0 training**. Learning spends no advancement AP; a successful read consumes one book, and duplicate learning consumes nothing. Pages may arrive in any order without expiry; insertion consumes one matching copy, wrong/duplicate pages change nothing, and completion creates the book once. Lessons, reading, assembly and rank-ups happen between runs.

Ranks use F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1. A skill needs **at least 100 current-rank training points plus the authored AP cost** to advance one rank. Count capped objectives from resolved outcomes once per objective, reset counts on advancement, and discard excess training rather than carrying it forward. AP cannot buy training or automatically advance a skill. Rank 1 has no further Rank Up action. Run training is pending until its outcome; passives train from eligible events under their own objective IDs.

Follow [character.md](gameplay/character.md): start at level 1, process committed XP across every crossed threshold, and provisionally grant 1 AP per earned level up to a content-defined cap (proposed 200). At cap discard XP overflow. Cumulative level is `1 + earned level-ups across all lives`; rebirth itself adds nothing. Store life growth using the age/talent at each grant, preserving fractional precision. Skills outside the active talent remain usable. Derive mastery for all talents from current associated skill ranks, with no second AP payment; inactive talent mastery bonuses persist. Initial talents are Close Combat and Magic; training multipliers and Grandmaster challenges are deferred.

Proposed starting/rebirth ages are 10–17. Reconcile one age year per seven elapsed real-world days at town/results boundaries, including offline intervals, once each. Destination ages 11–20 grant 5 AP plus authored base/talent growth; 21–25 grant 5 AP and base growth; 26+ grant neither, though age and level growth can continue. Repeated menus and backward clock changes cannot re-award intervals. Clock trust and forward-clock policy remain open and need an explicit application-level decision.

Rebirth remains gated on defined eligibility/cost/cooldown rules. Preview and atomically reset current level/XP, starting age/talent and life-growth stats while preserving cumulative level, learned ranks/training, unspent AP, mastery, committed items/pages/enchants, quests and claimed rewards. Settle run results and aging first; move newly illegal equipment into storage/overflow. A new run snapshots the resulting progression and loadout; live buffs/debuffs can modify effective run stats, but town progression cannot replace that baseline.

### Inventory and equipment

Follow [inventory.md](gameplay/inventory.md): begin with a provisional 6 × 10 backpack, fixed rectangular item footprints, stacks, one ordinary bag and dedicated equipment slots. Items have stable IDs and exactly one authoritative location. Bags occupy backpack space, retain stable contents grids and cannot nest; nonempty bags cannot be removed into inaccessible storage. Physical books, uninserted pages, scrolls and materials take space; only authored nonphysical quest records do not.

Use deterministic placement: fill compatible stacks in saved bag-priority order then backpack, then scan free rectangles left-to-right/top-to-bottom. Validate a whole requested transfer before moving anything; an explicit smaller quantity enables partial pickup. Sorting/splitting/merging preserve item counts, variants, locks and run provenance. If a proposed sorted layout fails, retain the old one. Favorites organize; item locks protect against sale, destruction and recipe/enchant consumption or replacement.

Start with main/off hand, head, body, hands, feet and two accessories. A two-handed weapon reserves off hand but contributes once; paired swords require two legal instances; sword/shield supports shield skills. Validate every displaced item's destination as one equip transaction. Equipment and enchants affect stats only while eligible and equipped. No automatic drop or free resource refill completes a swap.

A run reserves exact brought instances/quantities, including bag contents, and tracks origins and consumption separately from new loot. Town mutation is unavailable while the run is active. Result reconciliation accounts for used supplies and returns/forfeits remaining gear under the authored outcome policy; it never restores consumed provisions or duplicates equipment.

Failed world pickups stay on the ground without a turn or loot reroll. Durable result/quest grants place what fits and save exact remainder in withdraw-only reward overflow with no expiry. Overflow also accepts system reconciliation returns, never player deposits; its items cannot be used until withdrawn. Clear it before a new run or optional reward-producing activity, while preserving already-earned results. Purchases, assembly and recipes require legal output placement after simulated input consumption and cannot use overflow to evade capacity.

### Titles

Follow [titles.md](gameplay/titles.md): one collection per hero moving through Unknown → Known → Earned, with a separate hint condition and award condition per title. First and Second are base slot types (a definition occupies exactly one), alongside a cosmetic talent display that grants no stats. Equip, remove, or change titles in town between runs at no cost or cooldown; awards never auto-equip, and empty slots are valid.

Equipped base titles are removable stat-modifier sources identified by title ID and slot. They enter at the equipment and direct derived-stat stages of the [stats](gameplay/stats.md) calculation order, applying authored benefits and penalties exactly once — no pool refill, no AP/rank/dice-probability effects, no double-count against skill growth or other sources. A new run snapshots the validated base-title selections, resolved effects and content version, and selection stays fixed for that run; in-run achievements accumulate as pending evidence evaluated at the outcome boundary under the retention decision. Quest claims, character milestones, coupons and later Rank 1 mastery checklists award titles exactly once, in stable title-ID order, with duplicate awards as no-ops. Master Titles and vanity overrides are later extensions ([project phases](project-phases.md) stages them in phase 9).

### Enchanting

Follow [enchants.md](gameplay/enchants.md): instructor-taught Enchant uses the same training/AP progression. Town-only application installs a prefix or suffix on one equipment instance; its rank is distinct from Enchant skill rank. Rank 5–1 scrolls provisionally require skill Rank 5 or better, with no lower-enchant chaining. Conditional clauses read progression snapshots; variable values roll once on successful installation and persist through equip/load/rebirth. Effects feed the equipment stat stage once, including independent penalties when a benefit is inactive.

Application consumes one scroll, one powder and authored positive MP on every accepted attempt. The initial Protect Equipment mode preserves gear and both old enchants on failure; success replaces only the selected slot. Use the specification's basis-point chance resolver with its provisional 90% cap and shared preview logic. Town MP and an explicit recovery loop are prerequisites.

Burning is a separate destructive operation: consume the item, materials and MP regardless of recovery, checking occupied slots independently in prefix/suffix order. Reserve capacity for maximum possible recovered scrolls after consumed inputs before spending or drawing RNG. Recovered scrolls retain definitions, not old rolled values. Preview losses, chances and all costs. Persist the dedicated enchanting RNG, operation result, costs, equipment/output changes and training together before revealing the result. Protect Scroll, durability damage and multiplayer entrusting are deferred.

### Quests and NPC role-playing missions

Follow [quests.md](gameplay/quests.md): mainstream storylines contain Chapters and Generations with explicit prerequisites; optional sidequests do not block them unless authored. Skill Quests may recognize committed rank milestones or introduce skills through equipment/rebirth eligibility. Rank comparisons use authored order, not labels. Equipping may deliver a lesson quest, not instantly teach mastery; receiving a book does not read it. A skill reward grants only unknown Rank F, preserving an already-known skill without an automatic refund.

Separate eligibility from automatic delivery or NPC acceptance. Persist state-based unlocks and evidence for event-based triggers, including life ID/talent for rebirth; reconcile catch-up eligibility idempotently after load. Retain unlocked quests through unequipping or rebirth. Process triggers after their initiating transaction, in stable quest-ID order.

Quest state is Locked → Available/Active → Ready to complete → Completed. Ordered stages use stable objective IDs and capped/deduplicated evidence from dialogue, interaction, defeats, skill outcomes, acquisition/delivery and mission success. Event objectives count only after their stage activates; item requirements recheck legal current inventory. Hand-ins consume items and checkpoint objectives together. Initial quests complete once per hero with no expiry, through explicit Complete/final NPC dialogue. Preview and atomically claim the bundle, costs, completion ID and successors; overflow withdrawal never regrants XP/AP. Mainstream quests cannot be abandoned; authored sidequest abandonment preserves committed delivery checkpoints.

Accept and claim in town. Normal runs snapshot eligible active stages and accumulate pending evidence; result retention determines what commits, while a clear objective always requires success. Until mission-local stage progression has its own rollback rules, fresh gameplay stages start after results in town. Repeatable/daily quests, timers and branching replay rewards remain deferred.

An RP mission temporarily controls a fixed authored NPC in an isolated session started from town, with no other active run. Use normal movement/dice rules with the NPC's versioned stats, skills, gear and supplies; preserve the hero profile separately. Ordinary hero XP/training/loot do not accrue by default. Only the recorded scenario outcome advances its eligible quest, whose later claim grants hero rewards. Success returns to town once; failure/exit leaves the quest retryable; loading resumes the same attempt rather than resetting it. Borrowed items/skills cannot leak to the hero.

### Gacha and online services

Permanent profile state, account balances, authentication, purchases and gacha belong to application/repository services. Development gacha can use a separate local simulator and currency. Production pulls require a server-owned transaction and RNG, an idempotency key, authoritative balance/pity/inventory results, and durable reconciliation. Purchase grants require verified platform transactions and server entitlement handling.

A reveal animates a committed result using Scene2D/sprite effects. Closing it or restarting must not duplicate or discard the grant. Native billing/auth/secure storage require Android and RoboVM interfaces; the current dependencies do not supply them. Cloud save, analytics, crash reporting and live content updates are later features; define conflict/version policies before syncing profiles.

## 17. Target project structure

Grow this structure by feature; the paths below are proposed within the existing modules.

```text
core/src/main/kotlin/cloud/vinh/rebirthdungeon/
  RebirthDungeon.kt
  bootstrap/                 service and screen wiring
  application/               RunController, results, repository interfaces
  game/
    ecs/components/          artemis-odb data components
    ecs/systems/             ordered rule systems
    RunSession.kt
    exploration/             Fixed-point navigation, movement, discovery, room assembly
    algorithms/              random interfaces
    squidsquad/              SquidSquad and Juniper adapters
    turns/                   initiative and activation rules
    combat/                  five-dice hands, abilities, stats, damage, statuses, reactions
    progression/             skills/training, XP, talent mastery, aging/rebirth rules
    inventory/               placement, stacks, equipment, reservations, reconciliation
    enchanting/              conditions, recipes, chance and operation results
    quests/                  prerequisites, stages, evidence, claims, RP mission rules
    commands/                plain Kotlin command types
    events/                  immutable domain events
    projection/              observed HUD/render snapshots
    replay/                  command logs and state hashes
  data/
    content/                 catalog loaders and validation
    save/                    DTOs, codecs, migrations, local repository
  presentation/
    screens/                 loading, title, town, dungeon, progression, quests, RP missions
    dungeon/                 SpriteBatch renderer and camera
    hud/                     Scene2D controls and view models
    animation/               presentation tracks and event mapping
  platform/                  shared platform service interfaces

core/src/test/kotlin/cloud/vinh/rebirthdungeon/
  game/                      deterministic rule/adapter tests
  data/                      content, save and migration tests

assets/
  data/                      versioned content JSON
  atlases/                   packed dungeon and actor sprites
  audio/                     sound and music
  ui/                        existing skin and bitmap fonts

lwjgl3/src/main/kotlin/.../   desktop launcher and platform adapters
android/src/main/kotlin/.../  Android launcher and platform adapters
ios/src/main/kotlin/.../      RoboVM launcher and platform adapters
```

The Phase 1 loading/prototype screens replaced `FirstScreen`; grow them toward the first playable slice. Keep build-time atlas tooling outside the shipped game runtime. Do not create a second source root or copy platform code into `core`.

## 18. Validation and performance

The pinned JVM test framework (JUnit 4.13.2) is in place under `core`. Most simulation/adapter tests should run as ordinary JVM tests without `Gdx.app`, an OpenGL context or native platform startup. Add the LibGDX headless backend explicitly as a **test dependency** only for tests that need it; its transitive presence in desktop tooling does not provide a core test setup or validate rendering.

| Area               | Required evidence                                                                                              |
|--------------------|----------------------------------------------------------------------------------------------------------------|
| Exploration | Continuous collision-safe paths, corners, narrow portals, tick-indexed input and replacement destinations                        |
| Generation         | Bounded attempts, reachable spawn/exit, connector alignment, stable seeded fixtures                        |
| Navigation/discovery | Deterministic A*/funnel, unreachable projection, discovery memory, hidden actor/route privacy                       |
| artemis-odb        | Registration-order behavior, structural changes between systems, cleanup before projection, no stale IDs       |
| Turns/combat       | Stable initiative ties, single turn-boundary ticks, no extra turns from dice commands, no reroll/reset exploit |
| Skills/progression | Three learning routes, 100-point/AP gate, capped objective counts, duplicate outcome rejection, XP overflow, mastery, aging cutoffs and rebirth preservation |
| Titles | Discovery/award exactly-once including retries, town-only equip/swap, stat-stage application without double-count or pool refill, run snapshot fixed for its duration, persistence across save/load/rebirth |
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

Target 60 fps presentation on selected baseline devices. Measure ordinary turn latency and generation worst cases separately. Keep discovery change-driven, pathfinding decision-driven, and fixed-tick catch-up bounded without skipping authoritative ticks, and all I/O outside rule resolution. Reuse rendering buffers and bound particles, floating text and event queues. Optimize snapshot copying/map batching only after measuring representative maps and enemy counts.

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

**Exit:** the selected stack builds and displays a minimal screen on each target, with no duplicate classes and clear resource ownership. *(Closed: the duplicate-class failure was repaired on 2026-09-02, and Phases 0–1 completed on 2026-09-04 with all three backends launched — see [project phases](project-phases.md). Device/release checks remain tracked separately, and the 2026-09-06 Kotlin/dependency changes still owe a runtime re-verification.)*

### Milestone 1 — Playable dungeon movement

- Generate one seeded floor with player, enemy, spawn and exit.
- Implement fixed-point movement, polygon collision, destination commands and room discovery.
- Add seeded connector assembly, deterministic encounter triggers and separate battle initiative.
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

### Milestone 4 — Town systems, quests, and dungeon depth

- Build a short Chapter/Generation story chain, an NPC sidequest, an automatic rank-milestone Skill Quest and an NPC skill-unlock quest, with journal/tracker, pending run evidence and explicit exactly-once claims.
- Add equipment-triggered quest delivery and, after rebirth eligibility/economy are settled, talent-rebirth delivery. Preview rebirth resets, retained progression and equipment/condition changes.
- Implement Enchant learning/two ranks, fixed and conditional/variable effects, prefix/suffix replacement, protected failure and zero/partial/full burn recovery; require town MP recovery and saved RNG transactions first.
- Add equipment defenses and Final Hit; stage dual wielding, Counterattack, Windmill, Charge and Critical Hit after their equipment/reaction/area/path/RNG dependencies and reachable training exist.
- Add one isolated NPC RP scenario after quest and NPC ability support, including suspension, success and retry without hero-state leakage.
- Expand floor profiles, traps, loot, stairs and enemy policies; add tap-to-walk/controller support, refine art/audio and meet measured performance/input/accessibility targets.

**Exit:** the offline town/dungeon loop supports saved quests, enchant operations and an RP scenario, with validated content and release-build smoke coverage. Rebirth and advanced skills remain gated until their open rules are resolved.

### Milestone 5 — Production services and delivery

Add server-authoritative gacha, verified purchases, account/secure storage integrations, cloud-save policy, result reveals, analytics/crash reporting and live-content controls. Produce desktop packages, Android release artifacts and an iOS archive with platform-specific validation.

**Exit:** interruption and retries preserve purchases/grants, save/content migrations work from prior releases, and store/device requirements have been checked at release time. Graal Native Image remains optional and gets its own compatibility gate.

## 20. Documentation and audit evidence

The gameplay links at the start of this plan are the local design sources for the September 5 update; their research notes distinguish source-game references from proposed Rebirth Dungeon rules. This update does not re-run or refresh the earlier dependency audit. The separate [project phases](project-phases.md) was aligned to this update on September 5, 2026 (including the titles fold-in) and remains the detailed implementation tracker. The 2026-09-07 documentation audit ([audit.md](audit.md)) found drift against this plan — stale Java/first-screen status, superseded toolchain and dependency values, the missing titles integration, and broken gameplay links — and this revision corrects it.

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
