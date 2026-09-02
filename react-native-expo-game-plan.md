# Rebirth Dungeon: React Native + Expo Game Plan

## Overview

Rebirth Dungeon is a **2D pixel-art, grid-based roguelike dungeon crawler with dice combat, progression, loot, and gacha mechanics**. It runs on Expo SDK 57 and React Native.

The in-dungeon game is turn-based. A player action advances the simulation; rendering can continue at 60/120 Hz without changing game rules.

The core stack is:

- **Expo SDK 57 + React Native + TypeScript** for the application shell
- **Expo Router** for navigation
- **`@esengine/ecs-framework`** for the authoritative in-run entity/component/system model
- **`rot-js`** for dungeon generation, four-way pathfinding, field of view, seeded RNG, and actor turn ordering
- **Effect** for typed operational errors, dependency wiring, async workflows, retries, scoped background fibers, and wall-clock schedules
- **React Native Skia** for the dungeon, sprites, particles, and combat VFX
- **Reanimated** for presentation interpolation, camera motion, and per-frame animation
- **React Native Gesture Handler** for swipes, taps, drag/drop, and gesture composition
- **Zustand** for UI-facing projections and application screen state, not authoritative simulation state
- **Expo SQLite + Drizzle ORM** for local persistence and migrations
- **Zod** for the existing content/save/API validation boundaries
- **Expo Audio, Haptics, Asset, and SecureStore** behind Effect services

The central rule is:

> **The ECS decides what exists and what happens. `rot-js` supplies roguelike algorithms. Effect runs fallible and asynchronous work. Skia and Reanimated show the result.**

Do not duplicate authoritative positions, health, turn order, or combat state in React state, Zustand, Skia, or Reanimated.

---

# 1. Documentation Findings and Architectural Consequences

The project currently resolves these package versions (the manifest still uses ranges):

```text
Expo                         57.0.19
@esengine/ecs-framework      2.11.2
effect                       4.0.0-rc.112
rot-js                       2.2.1
```

## `@esengine/ecs-framework`

The framework is renderer-agnostic. Its documented model uses `Component` data classes, `EntitySystem` processors, `Matcher` queries, a `Scene`, explicit `updateOrder`, a deferred command buffer, and scene serialization.

Consequences for this game:

- One active dungeon run maps naturally to one ECS `Scene`.
- Dynamic actors and interactive objects are entities.
- Components contain mutable game data only.
- Systems resolve synchronous, deterministic rules in a fixed order.
- Entity structural changes during processing go through the ECS command buffer.
- The ECS scene is the source of truth for a live run.
- Effect, React, and rendering APIs must not be called from an ECS system.

The framework requires component subclasses to use `@ECSComponent` for stable registration and serialization. Systems should use `@ECSSystem` and explicit `updateOrder` values.

## Effect

Effect 4 models a computation as `Effect<Success, Error, Requirements>`. Its documentation distinguishes expected typed failures from unexpected defects, and provides structured concurrency, interruption, retry, repetition, and composable `Schedule` values.

Consequences for this game:

- Repository and platform failures belong in Effect's typed error channel.
- Bugs and broken invariants remain defects and are reported at the app boundary.
- App/route lifetime owns Effect fibers; leaving a dungeon interrupts its scoped work.
- `Schedule` handles wall-clock retry/repetition such as remote sync and save coalescing.
- Effect does not run deterministic ECS rules and does not replace the roguelike turn scheduler.
- An Effect fiber cannot keep JavaScript alive after iOS or Android suspends the app. Lifecycle saves must be requested immediately; true OS background work still requires the relevant Expo/native API.

The project currently uses an Effect 4 release candidate. Pin the exact RC during the prototype rather than allowing caret upgrades, then perform an intentional upgrade when Effect 4 stabilizes.

## `rot-js`

The official manual and TypeDoc expose map generators, FOV, A*/Dijkstra pathfinding, seeded RNG state, event queues, schedulers, and an asynchronous engine.

Consequences for this game:

- Use `ROT.Map.Digger` first, with `Uniform` or `Cellular` as later floor styles.
- Use `ROT.Path.AStar` with topology `4` for cardinal grid movement.
- Use `ROT.FOV.PreciseShadowcasting` with the same topology and an opacity callback.
- Use `ROT.Scheduler.Speed` for actor order initially; hide it behind a project-owned interface.
- Do not use `ROT.Display`; Skia remains the renderer.
- Do not use `ROT.Engine`; manually advance the scheduler so React Native input, ECS stepping, Effect lifetimes, and animation gating remain explicit.
- Treat the module-level `ROT.RNG` as shared mutable state. Generation must run in a synchronous save/seed/run/capture/restore wrapper.

---

# 2. Target Architecture

```text
React Native screens and accessible controls
                    │
                    ▼
       Zustand UI projection / route state
                    │
                    ▼
          RunController (Effect program)
          ├── serial command mailbox
          ├── persistence services
          ├── audio/haptics services
          └── lifecycle and retry policies
                    │
             synchronous boundary
                    ▼
        @esengine ECS Scene (source of truth)
          ├── entities and components
          ├── ordered gameplay systems
          ├── turn/encounter phase
          └── emitted domain events
                    │
       ┌────────────┴─────────────┐
       ▼                          ▼
 rot-js adapters             scene projector
 map/FOV/path/RNG/turns      snapshots + events
       │                          │
       └────────────┬─────────────┘
                    ▼
        Skia + Reanimated presentation
```

Dependency direction:

```text
presentation ────────→ application ────────→ game simulation
Effect services ─────→ application              ↑
rot-js adapters ────────────────────────────────┘
data implementations → application ports
```

The simulation may depend on small project-owned interfaces implemented with `rot-js`. It must not depend on React, Zustand, Expo modules, SQLite, Skia, Reanimated, or Effect.

---

# 3. Four Different Kinds of Time

These mechanisms solve different problems and must stay separate.

| Mechanism | Owns | Must not own |
| --- | --- | --- |
| ECS `updateOrder` | Ordering systems inside one simulation step | Actor initiative or wall-clock work |
| `rot-js` scheduler | Which actor receives the next turn | Network retries, autosave timers, animation frames |
| Effect `Schedule` and fibers | Retries, repetition, delays, cancellation, async jobs | Combat outcomes or grid movement |
| Reanimated frame callbacks | Interpolation, camera, particles, VFX | Authoritative coordinates, turns, damage, loot |

Turn cooldowns and status durations are integer turn counters in ECS components. They are not JavaScript timers or Effect sleeps.

---

# 4. ECS World Model

## Entity scope

Create ECS entities for dynamic or interactive objects:

```text
player
enemies
NPCs
doors
traps
loot drops
projectiles that participate in rules
temporary combat effects that participate in rules
```

Do not make every floor and wall tile an entity. Keep the mostly static tile grid in a compact `DungeonGrid` owned by the run scene/service. This avoids thousands of entities and makes `rot-js` callbacks cheap.

## Initial components

```text
StableId                 save-stable identifier, distinct from runtime entity ID
GridPosition             integer x/y cell
PreviousGridPosition     prior committed cell for presentation
Actor                    actor metadata
PlayerControlled         player tag
EnemyBrain               AI policy/content ID
BlocksMovement           occupancy tag
BlocksVision             opacity tag
Speed                    actor scheduling speed
Vision                   radius and perception flags
Health                   current/max HP
Stats                    attack, defense, modifiers
DicePool                 rolled/available/assigned dice
AbilityLoadout           ability IDs
StatusSet                poison, shield, stun, and turn durations
InventoryRef             reference to run inventory state
EncounterMember          encounter ID/team
Door                     open/locked state
Trap                     armed/type state
Pickup                   item and quantity
MoveIntent               transient requested step
AttackIntent             transient attack request
AbilityIntent            transient dice/ability request
PendingRemoval           optional cleanup marker
```

Use components as data containers. Keep formulas, pathfinding, side effects, and state transitions in systems or pure helper functions.

Example shape:

```ts
import {
  Component,
  ECSComponent,
  Serializable,
  Serialize,
} from '@esengine/ecs-framework';

@ECSComponent('GridPosition')
@Serializable({ version: 1 })
export class GridPosition extends Component {
  @Serialize()
  x = 0;

  @Serialize()
  y = 0;
}

@ECSComponent('MoveIntent')
export class MoveIntent extends Component {
  dx = 0;
  dy = 0;
}
```

Before implementation, confirm decorators compile under the project's Expo/TypeScript/Babel configuration on Hermes in both development and production builds.

## Run-level state

Keep small run-wide values in a dedicated singleton entity or typed scene service:

```text
run ID and floor ID
turn number
current actor stable ID
run phase: generating | awaitingInput | resolving | animating | complete
active encounter ID
pending presentation event sequence
```

Prefer an explicit singleton component when the value participates in gameplay or saving. Use `sceneData` only for infrastructure/configuration that systems need but do not query as ordinary game state.

---

# 5. Ordered ECS Systems

Use explicit, well-spaced order ranges so new systems can be inserted without renumbering everything.

| Order | System | Responsibility |
| ---: | --- | --- |
| 100 | `InputIntentSystem` | Validate and normalize the current actor's submitted command |
| 150 | `EnemyIntentSystem` | Create an intent when the active actor is AI-controlled |
| 200 | `MovementSystem` | Resolve one-cell movement and occupancy |
| 300 | `InteractionSystem` | Doors, pickups, stairs, and traps |
| 400 | `EncounterSystem` | Start/advance/finish an encounter |
| 500 | `DiceSystem` | Roll, reroll, assign, and consume dice |
| 600 | `AbilitySystem` | Resolve ability targeting and costs |
| 700 | `DamageSystem` | Shield, resistance, HP, death markers |
| 800 | `StatusEffectSystem` | Apply/tick/expire turn-based statuses |
| 900 | `VisibilitySystem` | Recompute FOV after movement/opacity changes |
| 1000 | `TurnFinalizationSystem` | Consume action cost and advance turn state |
| 1100 | `CleanupSystem` | Apply deferred removals and transient-component cleanup |
| 1200 | `EventExportSystem` | Finalize ordered domain events for presentation/persistence |

System execution is synchronous. A system may request an external action by emitting a domain event, but it must not `await`, start a fiber, write SQLite, play audio, call haptics, or mutate a Zustand store.

The ECS command buffer should handle entity/component structural changes made while iterating a system query.

---

# 6. Grid-Based Movement Contract

Start with a rectangular, cardinal grid:

```text
topology            4
legal step          abs(dx) + abs(dy) === 1
authoritative cell  integer GridPosition
visual position     interpolated presentation value
```

One movement command resolves as follows:

1. Reject input unless the run is awaiting the player.
2. Validate that the delta is exactly one cardinal cell.
3. Check map bounds.
4. Check the static tile's movement rule.
5. Check the dynamic occupancy index.
6. If the destination is empty, commit `PreviousGridPosition` and `GridPosition`.
7. If it contains a closed door, resolve the door interaction according to content rules.
8. If it contains a hostile actor, convert the move into a bump attack or encounter command; do not overlap actors.
9. Resolve traps/pickups/stairs after a successful move.
10. Recompute visibility if position or opacity changed.
11. Emit ordered domain events.
12. Consume the player's action only according to an explicit rule for that result.

Define early whether these consume a turn:

```text
walking into a wall
trying a locked door
failed ability targeting
inventory interaction in a dungeon
opening a menu
```

Recommended default: invalid UI input does not consume a turn; an intentional in-world attempt may consume one when the content rule says so.

## Input methods

Support all of these through the same `MoveCommand`:

- On-screen D-pad for discoverability and accessibility
- Swipe gesture for quick play
- Optional tap-to-walk path preview
- Keyboard arrows/WASD for web, simulator, and accessibility hardware

Tap-to-walk submits one step at a time. Revalidate after every step because an enemy, door, trap, or new FOV result can invalidate the remaining path.

Disable or queue further gameplay input while a command is resolving. Presentation animations may be skippable, but they must never decide whether movement succeeded.

---

# 7. `rot-js` Integration

Wrap every `rot-js` feature behind a small project-owned adapter. This keeps library types out of ECS components and save files.

## Dungeon generation

Start with `ROT.Map.Digger`.

Adapter output:

```ts
export interface DungeonGrid {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint16Array;
  readonly rooms: readonly RoomSnapshot[];
  readonly corridors: readonly CorridorSnapshot[];
  readonly spawn: GridPoint;
  readonly exit: GridPoint;
}
```

Generation pipeline:

1. Derive a floor seed from the run seed and floor index.
2. Run `Digger.create(callback)` synchronously.
3. Translate rot.js cell values into project-owned tile IDs inside the adapter.
4. Convert `getRooms()` and `getCorridors()` output into plain snapshots.
5. Choose spawn, exit, encounters, and loot using the dungeon RNG stream.
6. Validate that spawn and exit are connected.
7. Validate minimum room count, walkable area, and encounter constraints.
8. Retry with a derived attempt seed up to a fixed limit, then return a typed generation failure.

Later floor families can use `ROT.Map.Uniform`, `ROT.Map.Cellular`, or hand-authored room templates without changing ECS movement or rendering.

## Pathfinding

Use `ROT.Path.AStar` with `{ topology: 4 }`.

The passability callback combines:

```text
in bounds
static tile is walkable
dynamic blocker is absent
the intended target cell may be allowed when occupied by the target
```

Cache only when profiling shows a need. Dynamic occupancy and doors can invalidate paths cheaply in a turn-based game.

## Field of view

Use `ROT.FOV.PreciseShadowcasting` with `{ topology: 4 }`.

Maintain two bitsets:

```text
visibleNow   recomputed for the current player position
explored     persistent OR of every visibleNow result
```

The light-pass callback checks map opacity plus dynamic `BlocksVision` entities. Recompute after the player moves, a door opens/closes, or another opacity-changing event occurs—not every render frame.

## Actor scheduling

Start with a project-owned `TurnScheduler` interface backed by `ROT.Scheduler.Speed`:

```ts
export interface TurnScheduler {
  add(actor: ScheduledActor): void;
  remove(stableActorId: string): void;
  next(): string | null;
  snapshot(): TurnOrderSnapshot;
  restore(snapshot: TurnOrderSnapshot): void;
}
```

Store lightweight actor records keyed by stable ECS IDs. At stable turn boundaries, snapshot the current actor plus project-owned relative due times obtained through the scheduler adapter's public surface, then reconstruct the rot.js scheduler on load. Do not persist raw ECS entities or private rot.js queue internals.

If actions later need different costs, replace the adapter with `ROT.Scheduler.Action`. The rest of the simulation should not know which rot.js scheduler is used.

Do not use `ROT.Engine`. Its lock/unlock loop obscures who owns async execution and makes route cancellation, animation gating, and deterministic command tests harder.

## RNG and deterministic streams

Keep separate serializable streams for dungeon generation, enemy AI, combat/dice, loot, cosmetics, and local development gacha.

`ROT.RNG` exposes seed/state APIs, but the default export is shared by map generators. The dungeon adapter must:

1. Save the current module-level RNG state.
2. Set the floor generation state.
3. Generate synchronously with no `await`.
4. Capture the new floor RNG state.
5. Restore the prior module-level state in `finally`.

Never generate two floors concurrently against the shared rot.js RNG. Do not let Effect concurrency reorder deterministic RNG draws.

Production paid gacha remains server-authoritative and must not use client rot.js RNG.

---

# 8. Deterministic Turn Runner

The controller advances the simulation only after a command, not on every animation frame.

```text
Player command arrives
        │
        ▼
RunController serializes command processing
        │
        ▼
Set player intent component
        │
        ▼
Core.update(0) → ordered ECS systems resolve one action
        │
        ▼
rot scheduler chooses next actor
        │
        ├── enemy: compute AI intent and step ECS again
        │
        └── player: stop at awaitingInput
        │
        ▼
Project scene → immutable UI/render snapshot + ordered events
```

Rules:

- Only one command resolution runs at a time.
- `Core.update(0)` is a logical step; rules must not depend on wall-clock `deltaTime`.
- Enemy AI may use pathfinding, visible/remembered targets, and seeded AI RNG.
- Add a maximum automatic-actor-step guard to detect scheduler bugs.
- Commit the authoritative result before playing its animation.
- A replay is run seed + starting content version + ordered commands.

If continuous environmental effects are later added, represent them as scheduled actor/system turns rather than frame-time mutations.

---

# 9. Dice Combat in ECS

Keep combat formulas as pure TypeScript functions, but invoke them from ECS systems operating on components.

Recommended commands:

```text
ROLL_DICE
REROLL_DIE
ASSIGN_DIE
USE_ABILITY
END_TURN
MOVE
INTERACT
```

Recommended combat components:

```text
EncounterMember
DicePool
AbilityLoadout
SelectedTarget
Health
Stats
StatusSet
Shield
PendingDamage
PendingHeal
```

The dice and ability systems emit `DICE_ROLLED`, `ABILITY_ACTIVATED`, `DAMAGE_DEALT`, `CRITICAL_HIT`, `STATUS_APPLIED`, `ACTOR_DEFEATED`, `COMBAT_WON`, and `PLAYER_DEFEATED` events.

Grid contact can either trigger bump-to-attack or switch the run phase into a dice-combat encounter. Choose one rule set per dungeon mode, but keep actors in the same ECS scene so health, statuses, loot, and death do not need a second authoritative model.

Do not keep a separate mutable `CombatState` in Zustand. Zustand receives a projected combat HUD snapshot from ECS.

---

# 10. Effect Application Runtime

Create one app-scoped Effect runtime and provide services for platform/data boundaries:

```text
RunRepository
ProfileRepository
GachaRepository
PurchaseRepository
AuthRepository
AssetService
AudioService
HapticsService
TokenStorage
Clock/UUID/Logger services where needed
```

The application-level shape is:

```ts
import type { Effect } from 'effect';

type AppProgram<A, E> = Effect.Effect<A, E, AppServices>;
```

## Typed errors

Use tagged expected errors for recoverable operational failures:

```text
RunLoadError
RunSaveError
InvalidSaveError
AssetLoadError
NetworkError
AuthError
PurchaseError
GachaRequestError
GenerationError
```

An ordinary rejected move is usually a domain result/event, not an Effect failure. An impossible occupancy state is a defect: report it with the run seed, command index, and ECS diagnostics.

Map errors to UI at the controller boundary. Do not show raw third-party exceptions.

## Scoped background work

Use scoped fibers for work that should end when the owning screen/run ends:

```text
coalesced save worker
remote profile sync
content refresh while a meta screen is active
telemetry upload
audio preload
```

Interrupt and clean up route-owned work when leaving the dungeon. Do not create detached fibers without an explicit app-lifetime owner.

## Scheduling and retry

Use Effect schedules for wall-clock concerns:

```text
retry transient idempotent requests with bounded exponential backoff and jitter
repeat a foreground refresh while a screen remains active
coalesce/debounce noncritical save requests
time out a best-effort lifecycle flush
```

Do not retry invalid input, save schema incompatibility, non-idempotent purchase/gacha grants without an idempotency key, or programming defects.

Give each retry policy one owner. Do not stack Effect retries with TanStack Query retries or native SDK retries accidentally.

---

# 11. React Native, Zustand, and Presentation

## Zustand owns

```text
current route-level loading/error state
immutable projected run snapshot
inventory/profile/meta-game projections
open dialogs and selected menu items shared across components
settings
save/sync status
```

## ECS owns

```text
grid positions and occupancy
actors and interactive objects
health, stats, dice, abilities, statuses
turn order and current actor
encounter phase
current floor state
run rewards not yet committed
```

## Reanimated/Skia own

```text
interpolated sprite coordinates
camera transform and shake
animation clocks
particles and floating text
temporary opacity/scale values
```

The store exposes commands that invoke the controller; it does not implement gameplay rules. Use narrow selectors so tile, actor, HUD, and menu updates do not rerender unrelated UI.

---

# 12. Rendering the Grid

Use a fixed logical tile size, initially 16 or 32 pixels.

```text
logical cell         ECS integer x/y
logical pixel        cell × TILE_SIZE
screen pixel         camera transform × logical pixel
```

Render with Skia:

```text
GameCanvas
├── TileAtlasLayer
├── ExploredFogLayer
├── PropsLayer
├── ActorLayer
├── CurrentFovLayer
├── EffectsLayer
└── CameraTransform
```

On `ACTOR_MOVED`, Reanimated interpolates from the old cell center to the new cell center. ECS already contains the committed destination. Animation completion only unlocks or advances presentation; it cannot change the simulation result.

Use native React components above the canvas for HUD, dice, abilities, inventory, dialogs, and accessible movement controls.

Use Rive only for gacha/reward/level-up UI sequences. It is not a dungeon renderer or source of truth.

---

# 13. Domain-to-Presentation Events

After every command batch, export ordered domain events from the simulation:

```ts
export type GameEvent =
  | { type: 'ACTOR_MOVED'; actorId: string; from: GridPoint; to: GridPoint }
  | { type: 'DOOR_OPENED'; doorId: string }
  | { type: 'DAMAGE_DEALT'; targetId: string; amount: number }
  | { type: 'ACTOR_DEFEATED'; actorId: string }
  | { type: 'FOV_CHANGED' }
  | { type: 'ITEM_COLLECTED'; itemId: string; quantity: number };
```

The presentation bridge maps these into animation/audio/haptic instructions. Keep the mapping pure and testable.

Do not subscribe React components directly to the ECS event system. Publish one stable projected snapshot plus an ordered presentation batch through the controller.

---

# 14. Persistence and Resume

Use normalized SQLite tables for permanent account data and a versioned snapshot for the active run.

```text
Permanent profile/inventory/currency
    → normalized SQLite + Drizzle tables

Active dungeon run
    → one versioned snapshot envelope
```

Snapshot envelope:

```text
runId
schemaVersion
contentVersion
floorSeed
floorIndex
dungeon grid and room metadata
ECS scene data or project-owned component DTOs
rot RNG states for each deterministic stream
project-owned scheduler snapshot
turn number and command index
pending/committed rewards
last stable phase
updatedAt
```

ESEngine supports JSON/binary scene serialization and version migration, but do not persist an unversioned raw scene blob. Wrap it in the project envelope; mark persisted component classes with `@Serializable`, persisted fields with `@Serialize`, register the components, validate the envelope, and test migrations. Transient intent components should not be serialized.

Prefer saving at stable command boundaries. Do not save halfway through system processing. If the app backgrounds during presentation, save the already-committed simulation state and regenerate or skip presentation on resume.

The save flow is an Effect program:

```text
project ECS state
→ encode versioned snapshot
→ validate
→ SQLite transaction
→ update save status projection
```

Serialize save requests so an older write cannot finish after a newer one. Flush immediately on AppState background/inactive notification, while acknowledging that the OS may suspend the process quickly.

---

# 15. Content, Validation, and Migrations

Keep tile definitions, heroes, monsters, dice, abilities, statuses, items, loot/encounter tables, generation profiles, banners/pity rules, and progression curves data-driven.

Keep Zod as the single runtime schema system for the current prototype because it is already in the plan and dependencies. Effect error handling does not require migrating to Effect Schema.

If the team later adopts Effect Schema, migrate one boundary deliberately and remove the matching Zod schema. Do not maintain two schema definitions for the same payload.

Save and content migrations are explicit, sequential, and tested from every shipped version.

---

# 16. Gacha, Purchases, and Meta Game

Gacha, purchases, authentication, and permanent inventory stay outside the dungeon ECS unless a value is copied into a new run at start.

Effect owns their workflows and typed failures; repository interfaces keep provider SDKs at the edge.

Production gacha flow:

```text
UI request with idempotency key
→ Effect GachaRepository program
→ server-authoritative transaction and RNG
→ authoritative pull result, pity, balance, inventory
→ persist/update projections
→ play known Rive reveal
```

Production purchases must be verified and granted server-side or through RevenueCat. Never grant premium currency from a client callback alone. Do not delay authoritative persistence until a reveal animation completes.

---

# 17. Suggested Project Structure

```text
app/
├── _layout.tsx
├── (main)/
└── dungeon/[id].tsx

src/
├── bootstrap/
│   ├── effect-runtime.ts
│   ├── app-services.ts
│   └── initialize-ecs.ts
├── game/
│   ├── ecs/
│   │   ├── components/
│   │   ├── systems/
│   │   ├── run-scene.ts
│   │   └── system-order.ts
│   ├── grid/
│   │   ├── dungeon-grid.ts
│   │   ├── occupancy-index.ts
│   │   └── movement-rules.ts
│   ├── rot/
│   │   ├── rot-dungeon-generator.ts
│   │   ├── rot-pathfinder.ts
│   │   ├── rot-fov.ts
│   │   ├── rot-turn-scheduler.ts
│   │   └── rot-random.ts
│   ├── combat/
│   ├── commands/
│   ├── events/
│   ├── projection/
│   ├── replay/
│   └── serialization/
├── application/
│   ├── run-controller.ts
│   ├── programs/
│   ├── errors/
│   └── services/
├── data/
│   ├── db/
│   ├── repositories/
│   ├── secure-storage/
│   ├── purchases/
│   └── remote/
├── stores/
│   ├── run-view-store.ts
│   ├── player-store.ts
│   └── settings-store.ts
└── presentation/
    ├── dungeon/
    ├── canvas/
    ├── hud/
    ├── inventory/
    ├── gacha/
    └── components/
```

Grow this structure by vertical slice. Do not create every folder before its first feature.

---

# 18. Testing Strategy

## Deterministic simulation

```text
cardinal movement changes exactly one cell
diagonal and multi-cell movement is rejected
walls and blocking entities prevent overlap
bump-to-attack never moves into an occupied hostile cell
doors update movement and vision consistently
FOV changes only after relevant state changes
the same seed and commands produce the same map, events, and final projection
save/load preserves RNG streams, scheduler order, ECS state, and command index
```

## rot.js adapters

```text
generated spawn and exit are connected
all generated cells translate to valid project tile IDs
A* respects topology 4 and dynamic blockers
FOV respects opaque tiles and closed doors
shared ROT.RNG state is restored even when generation fails
scheduler snapshot/restore preserves the next actor sequence
```

## ECS

```text
systems execute in declared order
transient intents are removed after resolution
structural changes use deferred commands safely
death removes scheduling/occupancy participation
status durations tick once per logical turn
projecting the scene does not mutate it
```

## Effect

```text
typed save/load failures map to recoverable UI states
retry policies retry only transient/idempotent failures
route cancellation interrupts owned fibers
serialized saves cannot complete out of order
lifecycle flush is bounded
```

Use Effect's test clock/scheduler facilities for time-based programs rather than real sleeps.

## Presentation and E2E

```text
D-pad, swipe, tap-path, and keyboard produce the same commands
input gating prevents double turns
resume during presentation restores committed state
reduced motion can skip interpolation without changing results
screen readers can operate movement and combat controls
pixel output remains crisp across representative sizes
```

Profile production builds on a mid-range Android device and at least one iPhone.

---

# 19. Performance Rules

- Keep the tile grid in typed arrays with a stable reference.
- Maintain an O(1) occupancy lookup keyed by cell.
- Recompute FOV only when position or opacity changes.
- Run pathfinding only for actors that need a new decision.
- Batch tiles and repeated sprites with Skia Atlas.
- Project one immutable render snapshot after a command batch, not after every component mutation.
- Never write per-frame positions to ECS or Zustand.
- Cap particles, floating text, and queued presentation events.
- Keep ECS systems synchronous and small.
- Never run async I/O or remote fetching during turn resolution.
- Measure map-generation worst cases and enforce a generation time/attempt limit.

Target 60 fps presentation on supported baseline devices; simulation work should complete well below one frame for ordinary turns.

---

# 20. Expo SDK 57 and Native Delivery

The project targets Expo SDK 57 / React Native 0.86 / React 19.2.3. Use the exact SDK 57 documentation when adding or changing Expo APIs.

Use Expo development builds, Continuous Native Generation, EAS Build/Update/Submit, and separate development/preview/production profiles.

Install Expo/RN ecosystem packages with `npx expo install` when Expo provides compatibility selection. Install pure TypeScript packages such as Effect and rot.js with the project's package manager.

Development builds are required early because the final native dependency set will exceed Expo Go's fixed runtime.

Before shipping an OTA update:

- Respect runtime-version compatibility.
- Ensure required native modules exist in the installed binary.
- Test previous-production save migrations.
- Test deterministic run resume across the update.
- Keep a rollback plan for live content.

---

# 21. Implementation Milestones

## Milestone 0: Compatibility and architecture spike

Deliver:

- Pin the three gameplay libraries to reviewed versions for the spike.
- Confirm ESEngine decorators compile and execute on Hermes.
- Create/dispose a `Core` + `Scene` cleanly through React route lifecycle.
- Run a minimal ordered ECS system step.
- Generate a seeded rot.js dungeon and restore RNG state.
- Run/cancel an Effect fiber from the app-scoped runtime.
- Validate production minification on Android and iOS.

Exit condition: all three libraries work together in development and production builds without Node-only globals or browser DOM APIs.

## Milestone 1: Grid roguelike vertical slice

Deliver:

- `DungeonGrid` from `ROT.Map.Digger`
- Player and one enemy as ECS entities
- Cardinal D-pad/swipe movement
- Collision and occupancy
- `ROT.Path.AStar` enemy pursuit
- `ROT.FOV.PreciseShadowcasting` fog of war
- Manual `ROT.Scheduler.Speed` turn advancement
- Skia tile/sprite rendering and Reanimated cell interpolation
- Seeded deterministic tests

Exit condition: the same seed and commands reproduce the same floor and final state.

## Milestone 2: Dice combat slice

Deliver:

- Dice, abilities, health, damage, and statuses as ECS data/systems
- Bump/encounter transition from grid movement
- One player ability and one enemy action
- Ordered presentation events, SFX, and haptics
- Input gating and reduced-motion skip

## Milestone 3: Effect workflows and persistence

Deliver:

- App-scoped Effect runtime and services
- Typed repository/platform errors
- Versioned ECS/run snapshot
- SQLite + Drizzle transaction and migrations
- Serialized/coalesced save worker
- foreground/background lifecycle recovery
- replay fixture for a complete run

## Milestone 4: Dungeon depth and meta game

Deliver multiple generation profiles, doors, traps, pickups, stairs, loot, progression, meta-game routes, content validation, and performance budgets.

## Milestone 5: Gacha and production services

Deliver server-authoritative gacha, idempotent purchase flows, Rive reveals of committed results, auth, cloud save/sync, analytics, crash reporting, and live-ops controls.

---

# 22. Dependency Guidance

Core prototype dependencies:

```text
@esengine/ecs-framework
effect
rot-js
@shopify/react-native-skia
react-native-reanimated
react-native-worklets
react-native-gesture-handler
zustand
zod
expo-asset
expo-audio
expo-haptics
```

Add `expo-sqlite`, `drizzle-orm`, and `drizzle-kit` when persistence begins. Add Rive, auth, remote cache, SecureStore, and purchases only when those milestones begin.

Do not add `ROT.Display`, another game loop, another ECS, or a second source of gameplay truth.

---

# 23. Final Ownership Summary

```text
@esengine/ecs-framework
    authoritative live-run entities, components, queries, and ordered rule systems

rot-js
    dungeon generation, four-way A*, FOV, seeded RNG support, and actor turn order

Effect
    typed operational errors, services, async workflows, cancellation, retries, repetition

Zustand
    UI projections and screen/application state

Skia + Reanimated
    pixel-art rendering and visual interpolation

Expo + React Native
    app shell, navigation, accessible input, lifecycle, native capabilities, delivery

SQLite + Drizzle
    durable local profile data and versioned run snapshots
```

The most important implementation constraint is the synchronous boundary:

> **A command enters the run, the ECS and rot.js adapters resolve it deterministically, and only then does Effect perform external work and presentation animate the committed result.**

---

# Official References

Documentation was reviewed on September 1, 2026.

## ESEngine ECS Framework

- [ESEngine repository and quick start](https://github.com/esengine/esengine)
- [ECS Framework guide](https://esengine.cn/en/guide/)
- [System guide and update ordering](https://esengine.cn/guide/system)
- [Entity queries and Matcher](https://esengine.cn/guide/entity-query)
- [Scene serialization](https://esengine.cn/guide/serialization)
- [`@esengine/ecs-framework` on npm](https://www.npmjs.com/package/@esengine/ecs-framework)

## Effect 4

- [The Effect type](https://www.effect.website/docs/v4/getting-started/the-effect-type)
- [Expected errors and defects](https://www.effect.website/docs/v4/error-management/two-error-types)
- [Basic concurrency and interruption](https://www.effect.website/docs/v4/concurrency/basic-concurrency)
- [Scheduling](https://www.effect.website/docs/v4/scheduling/introduction/)
- [Repetition](https://www.effect.website/docs/v4/scheduling/repetition/)
- [Retrying](https://www.effect.website/docs/v4/error-management/retrying)

## rot.js 2.2.1

- [Official interactive manual](https://ondras.github.io/rot.js/manual/)
- [`ROT.Map.Digger` API](https://ondras.github.io/rot.js/doc/classes/map_digger.default.html)
- [`ROT.FOV.PreciseShadowcasting` API](https://ondras.github.io/rot.js/doc/classes/fov_precise_shadowcasting.default.html)
- [`ROT.Path.AStar` API](https://ondras.github.io/rot.js/doc/classes/path_astar.default.html)
- [`ROT.Scheduler.Speed` API](https://ondras.github.io/rot.js/doc/classes/scheduler_speed.default.html)
- [`ROT.RNG` API](https://ondras.github.io/rot.js/doc/modules/rng.html)

## Expo SDK 57

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [React Native Skia for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/skia/)
- [Expo SQLite for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
- [Expo Asset for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/asset/)
- [Expo Audio for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
- [Expo Haptics for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/)
