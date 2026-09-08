# Recommended Game Directory Structure

Recommendation dated **2026-09-07**. Keep the existing Gradle modules and use **responsibility boundaries at the top, gameplay features inside those boundaries**. Extend [game-plan.md section 17](game-plan.md#17-target-project-structure) rather than replacing it with a new architecture.

This is a target layout, not an inventory of implemented systems. Create directories only when their feature arrives in [project-phases.md](project-phases.md). Phases 2–3 have since implemented the content/RNG and movement/checkpoint foundations; see the phase tracker for current verification. The remaining target tree is guidance, not a claim that later features exist.

## 1. What the documentation implies

| Documentation | Structural consequence |
| --- | --- |
| [Game plan](game-plan.md), [phase tracker](project-phases.md) | Preserve the Gdx-free `game/` boundary, one authoritative run World, ordered systems, immutable exports, and application-owned persistence. |
| [Battle](gameplay/battle.md), [stats](gameplay/stats.md) | Keep dice, activation, resource costs, damage, and statuses together in `game/combat/`; expose one shared stat calculation to both town previews and run rules. |
| [Skills](gameplay/skills.md), [character](gameplay/character.md), [titles](gameplay/titles.md) | Group persistent mastery, current-life growth, and titles under progression. Skill execution belongs to combat; learning, training, and rank advancement belong to progression. Titles are part of progression, not another profile subsystem. |
| [Inventory](gameplay/inventory.md), [enchants](gameplay/enchants.md) | Give item identity, placement, equipment, and reservations one owner. Enchant rules use those items and shared stat effects; they do not own another inventory. |
| [Quests](gameplay/quests.md) | Separate quest rules from dialogue widgets. NPC role-playing missions reuse run simulation with isolated starting state and result policy. |
| [Towns](gameplay/towns.md) | Add authored town traversal and service rules, reusable menu windows, commerce, banking, and explicit recovery. Town movement consumes no dungeon turns; town services commit saved profile transactions. |
| [Overview](overview.md) | Distinguish an activation, encounter, floor, run, and life. Their state and completion decisions must not collapse into one screen or one generic game manager. |
| [Audit](audit.md), [reference research](references.md) | Preserve unresolved rules and historical evidence. Reference-game mechanics and provisional balance do not justify additional systems or directories. |

The existing source layout already has `bootstrap/`, `game/`, and `presentation/`, including `DungeonSimulation`, grid values, movement systems, and a SquidSquad adapter. Build on that working slice. Avoid a wholesale rename to `domain/`, `engine/`, or `features/` that would obscure the established boundary and its build check.

## 2. Repository layout

```text
RebirthDungeon/
├── core/                    Shared Kotlin rules, application, data, presentation
├── lwjgl3/                  Desktop launcher, adapters, packaging
├── android/                 Android launcher, adapters, manifest, packaging
├── ios/                     RoboVM launcher, adapters, plist, linking
├── assets/                  Shipped content and presentation resources
├── tools/                   Offline atlas/content tooling; not shipped
├── docs/                    Architecture, tracker, gameplay specifications
├── gradle/                  Wrapper, JVM criteria, dependency verification
├── .github/                 CI and repository automation
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties        Reviewed dependency pins
```

Keep one shared production source root: `core/src/main/kotlin/cloud/vinh/rebirthdungeon/`. Shared code retains the Java 8 API and bytecode constraints. Additional Gradle modules are unnecessary for the present slice; consider extraction only when an actual build or dependency-isolation need warrants it.

## 3. Shared Kotlin packages

Every path below is relative to `core/src/main/kotlin/cloud/vinh/rebirthdungeon/`. Names of future classes are illustrative. Nested packages should remain flat until enough related code exists to justify splitting them.

```text
RebirthDungeon.kt                 Lifecycle entry point; delegates wiring/navigation
bootstrap/                       Construct services, workers, controllers, screens

application/                     Coordinate use cases and durable state transitions
  run/                           RunController, start/continue/abandon, floor/results flow
  profile/                       Profile ownership, town operations, aging reconciliation
  persistence/                   SaveRepository contract, checkpoint/write coordination

game/                            Deterministic values and rules; no Gdx or I/O
  DungeonSimulation.kt           Existing run World facade; evolve with the run slice
  RunSession.kt                  Authoritative non-component run state
  identity/                      Typed content/instance/run/operation IDs as needed
  content/                       Immutable project-owned definitions/catalog values
  commands/                      Explicit run command values and results
  events/                        Immutable ordered domain outcomes
  projection/                    Observed render/HUD exports and full restore exports
  replay/                        Accepted command records, canonical state hashing

  ecs/
    components/                  Mutable no-arg artemis Component classes
    systems/                     Explicitly ordered systems; delegate feature calculations

  grid/                          Cells, terrain, occupancy, movement legality
  algorithms/                    Generator, path, FOV, RandomSource interfaces
  squidsquad/                    SquidSquad and Juniper implementations
  turns/                         Initiative, actor activation boundaries
  combat/
    dice/                        Five-die hand, weights, combination scoring
    abilities/                   Frozen activation, targeting, effect resolution
    stats/                       Attributes, modifiers, pools, cost and damage math
    statuses/                    Stacking, expiration, periodic effects
  progression/
    character/                   XP, current life, cumulative level, aging, rebirth
    skills/                      Learning, books/pages, ranks, training, AP spending
    talents/                     Selected talent and derived mastery
    titles/                      Discovery, awards, slots, eligibility, modifier sources
  inventory/                     Items, grids, bags, stacks, equipment, overflow,
                                 origin reservations and reconciliation rules
  enchanting/                    Application/burning, conditions, chance, rolled values
  quests/                        Eligibility, stages, evidence, claims
    missions/                    RP scenario rules and isolated outcome policy
  town/                          Safe traversal, adjacency, service eligibility
    commerce/                    Buy/sell, carried/banked gold, capacity validation
    gathering/                   Authored yields and boundary-based respawn rules

data/                            External representations and concrete storage
  content/                       Load, strictly bind, validate, construct game catalog
    dto/                         Jackson input shapes only
    validation/                  Cross-reference and catalog validation
  save/                          Versioned save bundles and local repository
    dto/                         Explicit serialized profile/run/RNG shapes
    codec/                       LibGDX JSON encoding/decoding
    migration/                   Sequential schema migrations

presentation/                    Input and display; never authoritative rules
  screens/                       Loading, title, town, dungeon, results composition
  dungeon/                       Existing dungeon renderer, camera, fog
  town/                          Town rendering and NPC interaction presentation
  hud/                           Persistent status/menu bar, dice panel, quest tracker
  windows/                       Reusable Scene2D windows across town and dungeon
    character/                   Stats, equipment, titles, talent/age presentation
    skills/                      Journal, training and rank-up interface
    inventory/                   Item grids, bag views, overflow
    quests/                      Quest journal and detail views
    services/                    Dialogue shell, shop, bank, healing, rest, enchanting
  input/                         Keyboard/touch/controller-to-command translation
  animation/                     Committed event-to-animation mapping and tracks
  audio/                         Music/SFX playback and settings

platform/                        Shared native capability interfaces
```

### Dependency direction

- `bootstrap` is the composition root: it may construct application, data, presentation, and platform implementations.
- `application` calls `game` rules and repository/platform contracts. It owns the live committed profile and serializes commands and transactions; it does not put gameplay formulas in controllers.
- `data` implements application repository contracts and maps serialized representations to/from project-owned values. `game` never imports `data` or serializer DTOs.
- `presentation` submits requests through application controllers and consumes immutable observations. It never edits ECS components, the profile, or repository state directly.
- `game` depends on project-owned rule/value types, artemis, and its explicit algorithm adapters. It never imports application, presentation, data, platform SDKs, Gdx, file/network APIs, or reads the system clock.
- Native adapters live in the relevant launcher module and implement `core/platform` interfaces. Shared LibGDX audio belongs in presentation, not duplicated across launchers.

These are package conventions within `core`, not separate compiler-enforced modules. The existing `checkSimulationBoundary` check catches direct Gdx imports; review must also enforce I/O and dependency direction. Kotlin `internal` provides module visibility, not package isolation.

`game/content/` is the principal addition to the existing plan's layout: it gives immutable validated definitions a home that the simulation can consume without importing the loader. The tracker still gets its loader/catalog construction under `data/content/`. JSON fields and annotations stay in DTOs; stable game IDs and immutable definition values cross the boundary.

## 4. Ownership decisions that prevent duplication

### Run state and persistent profile

Keep dynamic run entities in the artemis World and non-component run state in `RunSession`, as the architecture contract requires. `DungeonSimulation` encapsulates World assembly and processing; `application/run` coordinates it and exports state only after processing returns. Do not introduce another mutable combat model for the dice window or a second World for an encounter.

The application owns the committed profile aggregate. Its values use the corresponding pure progression, inventory, quest, and town types; the on-disk schema belongs to `data/save/dto`. Pure rules can calculate a proposed transition, but only the application coordinates committing the full bundle and publishing successful results. A cached UI view is never a writable profile.

At run start, copy the permitted progression/loadout/title values and reserve brought possessions. At results, commit retention, inventory reconciliation, XP/training, quest evidence, IDs, and the cleared/finished run together. Do not let individual feature repositories save each part independently.

### Towns share rules without using dungeon initiative

Town movement is a validated, zero-turn operation. Reuse cell/terrain primitives where useful, but keep town traversal separate from hostile contact, fog, combat ticks, and the dungeon scheduler. A town does not require another persistent ECS World just because it has a grid.

Place stat and recovery calculations in the shared combat/stat rules, inventory capacity in inventory rules, quest offers in quests, and learning in progression. `game/town` owns service location/adjacency and town-specific rules; `application/profile` coordinates the saved operation across those owners. NPC panels display the outcome.

Banked and carried gold are authoritative balances, with carried capacity derived from eligible gold bag items. UI totals are projections. Deterministic town movement and commerce do not draw combat RNG; enchanting keeps its separate saved stream. Clock observations for aging enter through the application and produce recorded outcomes.

### Skills, stats, titles, and enchants

One skill definition links its progression ranks to combat effect definitions. Avoid parallel mutable `CombatSkill` and `ProgressionSkill` records that disagree about rank. Progression owns the learned rank; a run activation freezes the allowed rank and inputs.

Use one modifier/resource calculation for equipment, titles, installed enchants, and statuses. Each feature supplies typed sources; `combat/stats` applies the calculation order and pool clamping. Town previews and dungeon actions call the same calculation. Installed enchant values belong to item instances; owning a title alone adds no stats.

### ECS systems and pure feature rules

Keep the existing central `ecs/components` and `ecs/systems` layout so pipeline registration remains easy to inspect. Systems coordinate ECS reads/writes and call feature functions such as hand classification, damage resolution, or inventory placement. Do not repeat those algorithms in systems, previews, and serializers.

Keep run commands under `game/commands` and immutable outcomes under `game/events`; use subpackages only when the lists become difficult to navigate. Town request types can live beside their application use case, with pure inputs/results beside the relevant game rule. Do not force profile transactions through `World.process()`.

### Windows, screens, and exports

Character, Skills, Quests, and Inventory are reusable windows, not full-screen lifecycle owners by default. The town and dungeon screens compose the same menu bar and windows, exposing the spec's unavailable-during-run states. Controllers still enforce those restrictions even when a button is disabled.

Keep observed snapshots separate from full restore exports within `game/projection`: rendering must not receive live hidden-enemy positions through a save snapshot. Detached collection contents must also be immutable; Kotlin `val` alone does not make an exported mutable list safe.

An RP mission uses the dungeon presentation and simulation with its scenario context; put mission-specific briefings or overlays beside quest presentation when needed. A separate battle screen, RP engine, or formula set is unnecessary.

## 5. Content, resources, and tooling

Suggested growth under `assets/`; each category is introduced with its feature:

```text
assets/
  data/
    manifest.json               Content version and explicit catalog references
    world/                      Tiles, dungeon profiles, encounters, loot tables
    actors/                     Hero/enemy definitions and NPC scenario templates
    combat/                     Dice scoring/weights, abilities, stats, costs, statuses
    progression/                Skills/ranks/acquisition, XP/age/talents, titles
    inventory/                  Items, equipment, bags
    enchanting/                 Enchants and application/burning recipes
    quests/                     Chapters, Generations, quests, RP scenarios
    towns/                      Authored maps, NPC/service lists, shops, gathering spots
  atlases/                      Packed sprite sheets and atlas descriptors
  ui/                           Skins and bitmap fonts
  audio/
    music/
    sfx/

tools/
  make_dungeon_atlas.py          Existing offline atlas tool
```

The manifest and category names are recommendations, not a settled content schema. Use stable content IDs independent of filenames, validate references across catalogs, and load in explicit order rather than filesystem enumeration order. Keep each definition authoritative in one catalog: an instructor references a skill ID; an item references an enchant definition; a town does not embed another skill table.

Preserve existing resource paths until a consuming feature needs a change, including current font resources outside `assets/ui`. Authored map format remains a separate content decision; this layout does not require Tiled or another dependency. Source art can live under a future `tools/art/` directory when the art workflow needs it; ship packed outputs only.

Runtime profiles, checkpoints, and account tokens never belong in `assets/`. The save repository resolves a writable platform location. Test saves and replays belong in test resources; `.firecrawl/` remains research evidence rather than runtime content.

## 6. Tests and documentation

Mirror production responsibilities under `core/src/test/kotlin/cloud/vinh/rebirthdungeon/`:

```text
game/                           Rules, ECS order, adapters, deterministic replay
application/                    Result/town transactions, retries, stale callbacks
data/                           Strict content loading, save recovery, migrations
bootstrap/                      Existing worker/lifecycle coordination tests
smoke/                          Existing pinned-dependency behavior tests

core/src/test/resources/
  content/                      Small valid and deliberately invalid catalogs
  saves/                        Versioned recovery/migration fixtures
  replay/                       Recorded commands and expected canonical outcomes
```

Tests remain ordinary JVM tests without Gdx application startup, OpenGL, or provider SDKs. Prioritize interrupted-versus-uninterrupted replay, transaction deduplication, inventory conservation, and shared preview/resolution calculations. Renderer, mobile lifecycle, and native integrations retain their platform acceptance gates.

Keep `docs/` mostly flat: the existing architecture, tracker, overview, audit, references, and this directory recommendation are easy to find. Keep detailed rules in `docs/gameplay/`. Use relative Markdown links; add `docs/decisions/` only when a concrete architectural decision needs a durable record beyond the tracker. Avoid rearranging documentation solely to mirror source packages.

## 7. Adopt incrementally and reconcile the town specification

1. **Phase 2:** add only the IDs, immutable starter definitions, strict loading/validation, explicit RNG interfaces/adapters, and command/event values needed by that phase. Keep existing simulation and renderer names unless implementation establishes a reason to change them.
2. **Phases 3–5:** grow turns, combat, projection, application run coordination, and checkpoint support with playable movement/dice features. Extract pure calculations as their consumers appear.
3. **Phases 6–9:** expand durable save/profile operations, progression, inventory, titles, quests, enchanting, and RP isolation. Introduce the town/menu packages with explicitly tracked town features and prerequisites.
4. **Later phases:** expand dungeon content and presentation. Local gacha belongs to an isolated application feature with its own simulator state/RNG; remote repositories and auth/purchase orchestration arrive with their phases. Production grants remain server-authoritative, with native adapters in launchers. Do not scaffold them now.

Before implementing towns, align [game-plan.md](game-plan.md) and [project-phases.md](project-phases.md) with [towns.md](gameplay/towns.md). The current architecture specification index lists eight gameplay specs and omits towns; the tracker has town boundaries but not the complete new walkable-town/banking/gathering slice. Record its placement without silently expanding or closing phases.

Specific rules need reconciliation: towns replaces the former single currency balance with carried/banked gold; it rejects gold rewards exceeding capacity while inventory/quests preserve earned grants through overflow; and its recovery services settle the recovery mechanism while fees and access when broke remain unresolved. Preserve those decisions as open where needed rather than encoding an accidental policy in a directory or generic transaction helper. Cooking stays deferred until its separate rules exist.

The historical audit predates some same-day corrections, including titles integration, and some overview/reference links still use imported wiki syntax. Treat it as dated findings, not an override of the corrected architecture. This proposal uses local specifications and a source-layout inspection; it does not revalidate external reference-game claims or report new build/device verification.
