# React Native Game Engine Plan

## Purpose

Build a reusable 2D game-engine layer on top of React Native and Expo, with a strong focus on RPGs, turn-based combat, tactical systems, tile-based worlds, deterministic simulation, and data-driven content.

The engine should **not** be tightly coupled to React components. React Native should provide the application shell and UI, while the game simulation should run in a headless TypeScript layer that can be tested without rendering the app.

This document is intended to be handed to AI coding assistants as the architectural source of truth.

---

# 1. Primary Goals

The engine should support:

- 2D sprite rendering
- Tilemaps
- Animated sprites
- Camera movement
- Touch input
- Menus and HUDs
- Turn-based combat
- Tactical/grid-based combat
- Character stats
- Skills and abilities
- Status effects
- Items and equipment
- Inventory systems
- Enemy AI
- NPCs
- Dialog systems
- Quests
- Save/load
- Seeded deterministic randomness
- Procedural generation
- Pathfinding
- Field of view
- Audio
- Particles and effects
- Automated testing

The engine should also be designed so that more action-oriented gameplay can be added later without rewriting the architecture.

---

# 2. Architectural Principles

## 2.1 Keep the simulation independent from React

Do not place core game logic inside React components or hooks.

Avoid designs like:

```text
React component
    ↓
useState()
    ↓
combat calculation
    ↓
component rerender
    ↓
next game action
```

Prefer:

```text
Input
    ↓
Command
    ↓
Game Engine
    ↓
Systems
    ↓
ECS World
    ↓
Events
   / | \
  /  |  \
UI  Audio Renderer
           ↓
          Skia
```

The simulation should be usable like this:

```ts
const engine = createGameEngine({
  seed: 12345,
});

engine.dispatch({
  type: 'ATTACK',
  attackerId: 'player',
  targetId: 'slime-1',
});

const slime = engine.getEntity('slime-1');

console.log(slime.health?.current);
```

No React tree should be required for the code above.

---

## 2.2 Separate simulation from presentation

The game simulation decides **what happened**.

The renderer decides **how it looks when it happens**.

Example:

```text
SIMULATION

Player casts Fireball
Hit succeeds
Damage = 37
Enemy HP becomes 63
```

Presentation:

```text
0ms     casting animation starts
200ms   projectile launches
550ms   projectile hits enemy
600ms   enemy flashes
650ms   "-37" damage number appears
800ms   HP bar finishes animating
```

The engine should know the outcome immediately.

The presentation layer may take hundreds of milliseconds to display that outcome.

Do not make gameplay calculations depend on animation timing.

---

## 2.3 Prefer deterministic game logic

All gameplay randomness should come from a seeded pseudo-random number generator.

Do not use:

```ts
Math.random();
```

inside core game systems.

Instead use something like:

```ts
engine.random.int(1, 100);
```

This makes it possible to reproduce bugs, replay battles, test AI behavior, and eventually support deterministic multiplayer or replays.

---

## 2.4 Make game content data-driven

Avoid hardcoding every enemy, item, spell, or status effect into TypeScript logic.

Prefer data files such as:

```text
game-data/
├── skills/
├── items/
├── enemies/
├── classes/
├── status-effects/
├── loot-tables/
├── quests/
└── maps/
```

Example:

```json
{
  "id": "fireball",
  "name": "Fireball",
  "manaCost": 8,
  "power": 32,
  "element": "fire",
  "target": "enemy"
}
```

Validate this data at runtime using Zod.

---

# 3. Recommended Technology Stack

## Core application

Use:

- React Native
- Expo
- TypeScript

Expo should provide the application shell, native packaging, asset handling, audio, file system access, SQLite support, and development workflow.

---

## Rendering

### `@shopify/react-native-skia`

Use Skia as the main 2D renderer.

Responsibilities:

- tilemaps
- sprites
- sprite sheets
- particles
- visual effects
- battle effects
- damage numbers
- world rendering
- shader effects
- camera transforms
- large batches of repeated textures

Prefer Skia over rendering the game world as hundreds or thousands of React Native `<View>` or `<Image>` components.

React Native components should mostly be used for normal application UI.

---

## Animation

### `react-native-reanimated`

Use Reanimated for high-performance presentation animations.

Responsibilities:

- smooth UI-thread animations
- camera tweening
- sprite movement
- screen shake
- HP bar animations
- menu transitions
- combat effects
- frame callbacks when needed

Do not use React state to update visual positions every frame.

---

## Input

### `react-native-gesture-handler`

Use Gesture Handler for:

- taps
- double taps
- long presses
- dragging
- swipes
- pinch zoom
- virtual joysticks
- touch-based targeting
- map interaction

Input should be converted into game commands instead of directly mutating game state.

Example:

```text
Tap enemy
    ↓
SELECT_TARGET command
    ↓
Battle system validates target
    ↓
Battle state changes
```

---

## Entity Component System

### `miniplex`

Use Miniplex as the primary ECS.

Entities should be plain TypeScript objects.

Example:

```ts
export type Entity = {
  id: string;

  position?: {
    x: number;
    y: number;
  };

  sprite?: {
    atlas: string;
    frame: number;
  };

  health?: {
    current: number;
    max: number;
  };

  combatant?: {
    attack: number;
    defense: number;
    speed: number;
  };

  player?: true;
  enemy?: true;
};
```

World:

```ts
import { World } from 'miniplex';

export const world = new World<Entity>();
```

Query:

```ts
const enemies = world.with('enemy', 'health');

for (const enemy of enemies) {
  // Process enemy
}
```

Use ECS for things that **exist in the world**.

Examples:

- players
- enemies
- NPCs
- projectiles
- traps
- treasure chests
- summons
- interactable objects
- status-effect entities
- map objects

Do not force every application concept into ECS.

---

## State machines

### `xstate`

Use XState for higher-level game flow.

Good uses:

- battle phases
- turn flow
- dialog state
- cutscenes
- scene transitions
- menu workflows
- boss phases
- quest workflows
- AI behavior states

Example battle flow:

```text
Battle
├── starting
├── playerTurn
│   ├── selectingAction
│   ├── selectingTarget
│   └── executing
├── enemyTurn
├── victory
└── defeat
```

General distinction:

```text
Miniplex
"What entities currently exist?"

XState
"What state or phase is the game currently in?"
```

---

## React-facing UI state

### `zustand`

Use Zustand for state that React components actually need.

Good examples:

- open menu
- selected inventory tab
- selected enemy
- selected skill
- UI settings
- dialog visibility
- HUD preferences
- accessibility settings
- debug overlay settings

Example:

```ts
type UIState = {
  menuOpen: boolean;
  selectedEnemyId?: string;
  selectedSkillId?: string;

  openMenu(): void;
  closeMenu(): void;
};
```

Do not use Zustand as the authoritative storage for every entity, world tile, animation frame, or combat simulation value.

---

## Runtime validation

### `zod`

Use Zod to validate all external and data-driven content.

Create schemas for:

- skills
- enemies
- classes
- items
- weapons
- armor
- status effects
- quests
- loot tables
- maps
- save files
- configuration

Example:

```ts
import { z } from 'zod';

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),

  manaCost: z.number().nonnegative(),
  power: z.number().nonnegative(),

  element: z.enum(['physical', 'fire', 'ice', 'lightning']),

  target: z.enum(['self', 'ally', 'enemy', 'allEnemies']),
});

export type Skill = z.infer<typeof SkillSchema>;
```

Invalid game data should fail early during development.

---

## Deterministic RNG

### `pure-rand`

Use `pure-rand` for all simulation randomness.

Wrap it behind an engine-owned API.

Example:

```ts
export interface GameRandom {
  int(min: number, max: number): number;
  float(): number;
  chance(probability: number): boolean;
  pick<T>(values: readonly T[]): T;
}
```

The rest of the engine should depend on `GameRandom`, not directly on the library.

This makes the RNG implementation replaceable and easy to mock.

---

## Procedural generation and pathfinding

### `rot-js`

Use useful algorithms from `rot-js` where appropriate.

Potential uses:

- A* pathfinding
- Dijkstra maps
- dungeon generation
- maze generation
- field of view
- procedural maps
- turn scheduling

Do not use rot.js as the renderer.

Skia remains the renderer.

---

## Physics

Physics should be optional.

For most traditional RPGs and grid games, custom collision is preferable.

Example:

```ts
if (map.isWalkable(nextX, nextY)) {
  entity.position.x = nextX;
  entity.position.y = nextY;
}
```

If full physics becomes necessary:

### Preferred

`planck`

Good for:

- platformers
- rigid bodies
- Box2D-style physics
- collisions
- joints

### Alternative

`matter-js`

Good for:

- physics-heavy games
- puzzle games
- rigid bodies
- constraints

Do not add a physics engine until gameplay requires it.

---

## Persistence

Use:

- `expo-sqlite`
- `expo-file-system`

SQLite should store structured persistent game state such as:

```text
save_slots
characters
inventory
equipment
quests
world_flags
discovered_locations
settings
```

File system storage can handle:

- downloaded content
- screenshots
- exported saves
- mod-like data
- cached maps
- large serialized content

---

## Assets

Use Expo asset handling for:

- sprite sheets
- textures
- sounds
- fonts
- map files
- JSON content
- animation data

Build an internal `AssetManager` so the rest of the engine does not directly depend on Expo asset APIs.

---

## Audio

Use `expo-audio`.

Create an engine-level audio service.

Example responsibilities:

```ts
audio.playSound('sword-hit');
audio.playMusic('battle-theme');
audio.stopMusic();
audio.setMusicVolume(0.5);
audio.setSfxVolume(0.8);
```

Game systems should emit audio-related events instead of directly invoking native APIs whenever practical.

---

## Testing

Use:

- `vitest`
- `fast-check`

Vitest should handle normal unit and integration tests.

Fast-check should handle property-based testing.

---

# 4. High-Level Architecture

```text
┌────────────────────────────────────────────┐
│               React Native                 │
│                                            │
│  Screens / Navigation / HUD / Menus        │
└────────────────────┬───────────────────────┘
                     │
                     │ Commands / subscriptions
                     ▼
┌────────────────────────────────────────────┐
│               Game Engine                  │
│                                            │
│  Command Bus                               │
│  Event Bus                                 │
│  Game Random                               │
│  XState Machines                           │
│  ECS World                                 │
│  Systems                                   │
└───────────────┬──────────────┬─────────────┘
                │              │
                │ Events       │ State
                ▼              ▼
       ┌───────────────┐   ┌───────────────┐
       │ Audio Manager │   │ Skia Renderer │
       └───────────────┘   └───────────────┘
                                 │
                                 ▼
                          Reanimated layer
```

---

# 5. Engine Core

Create a central engine class.

Example:

```ts
export interface GameSystem {
  update(engine: GameEngine, dt: number): void;
}

export class GameEngine {
  readonly world: GameWorld;
  readonly random: GameRandom;
  readonly events: EventBus;
  readonly commands: CommandBus;

  private systems: GameSystem[] = [];

  constructor(options: GameEngineOptions) {
    // Initialize services
  }

  addSystem(system: GameSystem): void {
    this.systems.push(system);
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(this, dt);
    }
  }

  dispatch(command: GameCommand): void {
    this.commands.dispatch(command);
  }
}
```

The engine should own or coordinate:

- ECS world
- random number generator
- command processing
- event dispatch
- systems
- battle state machines
- game clock
- save/load hooks

---

# 6. Command System

User intent should enter the simulation as commands.

Examples:

```ts
type GameCommand =
  | {
      type: 'MOVE';
      entityId: string;
      dx: number;
      dy: number;
    }
  | {
      type: 'ATTACK';
      attackerId: string;
      targetId: string;
    }
  | {
      type: 'USE_SKILL';
      sourceId: string;
      targetId: string;
      skillId: string;
    }
  | {
      type: 'USE_ITEM';
      sourceId: string;
      targetId: string;
      itemId: string;
    };
```

Commands should be validated before modifying authoritative game state.

This helps with:

- replay systems
- AI
- networking
- testing
- debugging
- undo systems
- scripted events

---

# 7. Event System

Systems should communicate important results through game events.

Example:

```ts
type GameEvent =
  | {
      type: 'DAMAGE_DEALT';
      sourceId: string;
      targetId: string;
      amount: number;
      critical: boolean;
    }
  | {
      type: 'ENTITY_DIED';
      entityId: string;
    }
  | {
      type: 'SKILL_USED';
      sourceId: string;
      skillId: string;
    }
  | {
      type: 'BATTLE_ENDED';
      result: 'victory' | 'defeat';
    };
```

Consumers may include:

- renderer
- audio manager
- combat log
- quest system
- achievement system
- analytics
- UI

---

# 8. Systems

Start with focused systems.

Possible systems:

```text
InputSystem
MovementSystem
CollisionSystem
AISystem
TurnSystem
CombatSystem
AbilitySystem
StatusEffectSystem
CooldownSystem
DeathSystem
LootSystem
QuestSystem
AnimationRequestSystem
CleanupSystem
```

Systems should be small and composable.

Do not create a single enormous `GameSystem` that controls everything.

---

# 9. Turn-Based Combat Architecture

Turn-based gameplay should be mostly event-driven.

Do not run unnecessary combat calculations at 60 FPS.

Example flow:

```text
Player selects Fireball
        ↓
USE_SKILL command
        ↓
Validate source
        ↓
Validate target
        ↓
Validate mana
        ↓
Roll hit chance
        ↓
Roll critical chance
        ↓
Calculate damage
        ↓
Apply damage
        ↓
Apply status effects
        ↓
Emit events
        ↓
Advance battle state
```

The renderer can independently animate those results.

---

## Suggested battle machine

```text
battle
├── initializing
├── waitingForTurn
├── playerTurn
│   ├── selectingAction
│   ├── selectingTarget
│   ├── confirming
│   └── resolving
├── enemyTurn
│   ├── selectingAction
│   └── resolving
├── checkingOutcome
├── victory
└── defeat
```

Do not put damage formulas inside the XState machine.

XState controls orchestration.

Dedicated combat services calculate the actual results.

---

# 10. Combat Services

Recommended modules:

```text
battle/
├── BattleMachine.ts
├── BattleContext.ts
├── TurnQueue.ts
├── DamageCalculator.ts
├── HitCalculator.ts
├── CriticalCalculator.ts
├── Targeting.ts
├── SkillResolver.ts
├── StatusEffectResolver.ts
└── BattleResult.ts
```

Example API:

```ts
const result = resolveSkill({
  source,
  target,
  skill,
  random,
});
```

Possible result:

```ts
{
  hit: true,
  critical: false,
  damage: 37,
  appliedStatuses: ["burn"],
}
```

---

# 11. Turn Queue

Create a dedicated turn queue rather than embedding initiative logic throughout the code.

Possible strategies:

- simple alternating turns
- speed-based initiative
- active-time-battle-like scheduling
- timeline-based actions
- tactical round order

Suggested abstraction:

```ts
interface TurnScheduler {
  initialize(entities: Entity[]): void;
  current(): EntityId;
  advance(): EntityId;
  remove(entityId: EntityId): void;
}
```

---

# 12. Status Effect System

Treat status effects as data-driven definitions plus runtime instances.

Definition example:

```ts
{
  id: "burn",
  duration: 3,
  tickTiming: "turnEnd",
  stacking: "refresh",
  effects: [
    {
      type: "damage",
      amount: 5
    }
  ]
}
```

Runtime status:

```ts
{
  id: "burn",
  sourceId: "mage-1",
  remainingTurns: 2
}
```

Support:

- buffs
- debuffs
- poison
- burn
- stun
- silence
- shields
- stat modifiers
- damage-over-time
- healing-over-time

---

# 13. World and Map System

Suggested modules:

```text
world/
├── TileMap.ts
├── Tile.ts
├── MapLoader.ts
├── Collision.ts
├── Pathfinding.ts
├── FieldOfView.ts
├── EncounterManager.ts
└── SpawnManager.ts
```

Represent the logical map independently from the renderer.

Example:

```ts
type Tile = {
  id: string;
  walkable: boolean;
  blocksVision: boolean;
  movementCost: number;
};
```

The Skia renderer only needs the visual representation.

---

# 14. Renderer Architecture

Suggested renderer modules:

```text
renderer/
├── GameCanvas.tsx
├── Camera.ts
├── RenderWorld.ts
├── TileRenderer.tsx
├── SpriteRenderer.tsx
├── EffectRenderer.tsx
├── ParticleRenderer.tsx
├── DamageNumberRenderer.tsx
├── DebugRenderer.tsx
└── animations/
```

The renderer should read game state but should not become authoritative game state.

---

## Camera

Create a dedicated camera abstraction.

Example:

```ts
type Camera = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
};
```

World-to-screen conversion:

```ts
screenX = (worldX - camera.x) * camera.zoom;
screenY = (worldY - camera.y) * camera.zoom;
```

The renderer should apply this consistently.

---

# 15. React UI Architecture

Use React Native UI for:

- HUD
- inventory
- equipment screen
- pause menu
- settings
- quest log
- character sheet
- skill tree
- shop UI
- save/load menus
- dialogs when appropriate

Do not draw every menu inside Skia unless there is a gameplay-specific reason.

React Native is better for normal interactive application UI.

---

# 16. Save System

Design save files with explicit versions.

Example:

```ts
type SaveFile = {
  version: number;
  createdAt: string;
  updatedAt: string;

  player: PlayerSaveData;
  inventory: InventorySaveData;
  quests: QuestSaveData;
  world: WorldSaveData;
};
```

Validate every loaded save with Zod.

Provide migrations:

```text
save v1
    ↓
migration
    ↓
save v2
    ↓
migration
    ↓
save v3
```

Never assume old save data has the latest schema.

---

# 17. Testing Strategy

## Unit tests

Test:

- damage formulas
- critical hit rules
- hit chance
- healing
- status effects
- skill costs
- cooldowns
- initiative
- pathfinding wrappers
- item effects
- loot tables
- save migrations

Example:

```ts
it('reduces target health when an attack lands', () => {
  const engine = createTestEngine({
    seed: 12345,
  });

  const player = spawnTestPlayer(engine);
  const slime = spawnTestSlime(engine);

  engine.dispatch({
    type: 'ATTACK',
    attackerId: player.id,
    targetId: slime.id,
  });

  expect(slime.health.current).toBeLessThan(slime.health.max);
});
```

---

## Determinism test

Given the same:

- initial state
- seed
- command sequence

the game should produce the same final state.

Example concept:

```ts
const run1 = simulateBattle({
  seed: 847291,
  commands,
});

const run2 = simulateBattle({
  seed: 847291,
  commands,
});

expect(run1).toEqual(run2);
```

This should become a core regression test.

---

## Property-based testing

Use `fast-check` for invariants.

Examples:

- HP never exceeds max HP unless explicitly allowed
- HP never becomes negative after normalization
- mana cannot be spent below zero
- dead units cannot take normal turns
- inventory counts cannot become negative
- turn scheduler does not return removed entities
- damage formulas never return `NaN`
- save/load round trips preserve state

Example:

```ts
fc.assert(
  fc.property(arbitraryCombatState(), (state) => {
    const result = simulateBattle(state);

    return result.entities.every((entity) => {
      if (!entity.health) {
        return true;
      }

      return entity.health.current >= 0 && entity.health.current <= entity.health.max;
    });
  }),
);
```

---

# 18. Recommended Project Structure

```text
src/
│
├── app/
│   ├── navigation/
│   ├── screens/
│   └── providers/
│
├── engine/
│   ├── GameEngine.ts
│   ├── GameClock.ts
│   ├── EventBus.ts
│   ├── CommandBus.ts
│   ├── Random.ts
│   │
│   ├── ecs/
│   │   ├── Entity.ts
│   │   ├── World.ts
│   │   ├── components/
│   │   └── systems/
│   │
│   ├── battle/
│   │   ├── BattleMachine.ts
│   │   ├── TurnQueue.ts
│   │   ├── DamageCalculator.ts
│   │   ├── HitCalculator.ts
│   │   ├── Targeting.ts
│   │   ├── SkillResolver.ts
│   │   └── StatusEffectResolver.ts
│   │
│   ├── world/
│   │   ├── TileMap.ts
│   │   ├── MapLoader.ts
│   │   ├── Collision.ts
│   │   ├── Pathfinding.ts
│   │   └── Encounters.ts
│   │
│   ├── inventory/
│   ├── equipment/
│   ├── quests/
│   ├── dialogue/
│   ├── save/
│   └── data/
│
├── renderer/
│   ├── GameCanvas.tsx
│   ├── Camera.ts
│   ├── TileRenderer.tsx
│   ├── SpriteRenderer.tsx
│   ├── ParticleRenderer.tsx
│   ├── EffectRenderer.tsx
│   └── animations/
│
├── audio/
│   └── AudioManager.ts
│
├── ui/
│   ├── hud/
│   ├── battle/
│   ├── inventory/
│   ├── equipment/
│   ├── quests/
│   └── dialogue/
│
├── state/
│   └── uiStore.ts
│
├── data/
│   ├── schemas/
│   ├── skills/
│   ├── items/
│   ├── enemies/
│   ├── classes/
│   ├── quests/
│   ├── status-effects/
│   └── maps/
│
└── tests/
    ├── battle/
    ├── world/
    ├── inventory/
    ├── save/
    └── property/
```

---

# 19. Package Responsibilities

Use this as the architecture ownership table.

| Library             | Responsibility                       |
| ------------------- | ------------------------------------ |
| React Native        | Native app shell                     |
| Expo                | Build tooling and native services    |
| TypeScript          | Type safety                          |
| React Native Skia   | Game rendering                       |
| Reanimated          | High-performance visual animation    |
| Gesture Handler     | Touch input                          |
| Miniplex            | ECS and entity queries               |
| XState              | Game flow and state machines         |
| Zustand             | React-facing UI state                |
| Zod                 | Runtime validation                   |
| pure-rand           | Deterministic RNG                    |
| rot-js              | Pathfinding/FOV/procedural utilities |
| Planck or Matter.js | Optional physics                     |
| expo-sqlite         | Structured persistence               |
| expo-file-system    | File persistence                     |
| expo-audio          | Music/SFX                            |
| Vitest              | Unit/integration tests               |
| fast-check          | Property-based testing               |

---

# 20. Initial Dependency Plan

The first version should install only the core stack:

```text
@shopify/react-native-skia
react-native-reanimated
react-native-gesture-handler
miniplex
xstate
zustand
zod
pure-rand
vitest
fast-check
```

Add these when needed:

```text
rot-js
expo-sqlite
expo-file-system
expo-audio
planck
matter-js
```

Do not install every optional library at project creation time.

---

# 21. Implementation Roadmap

## Phase 1 — Engine foundation

Build:

- `GameEngine`
- `EventBus`
- `CommandBus`
- seeded `GameRandom`
- Miniplex world
- base entity types
- basic system interface
- deterministic test harness

Success criteria:

```text
A test can create an engine,
spawn two entities,
dispatch an attack command,
and receive deterministic results.
```

---

## Phase 2 — Basic combat

Build:

- health component
- combat stats
- attacks
- damage calculation
- hit chance
- critical hits
- death handling
- battle events
- simple turn queue

Success criteria:

```text
Two entities can complete a deterministic
turn-based battle entirely in unit tests.
```

No rendering should be required.

---

## Phase 3 — Battle state machine

Add XState.

Build:

- battle initialization
- player turn
- action selection
- target selection
- action resolution
- enemy turn
- victory
- defeat

Success criteria:

```text
A battle can advance through all states
using commands and deterministic simulation.
```

---

## Phase 4 — Rendering

Add Skia rendering.

Build:

- game canvas
- camera
- sprite rendering
- basic sprite atlas support
- simple map rendering
- battle sprites
- debug overlay

Success criteria:

```text
The engine state can be displayed without
moving authoritative simulation state into React.
```

---

## Phase 5 — Presentation animations

Add:

- attack animation requests
- damage numbers
- hit flash
- screen shake
- HP animations
- death animations
- Reanimated integration

Success criteria:

```text
The battle result is resolved immediately,
while presentation animations play afterward.
```

---

## Phase 6 — Data-driven content

Add Zod schemas.

Move:

- skills
- enemies
- items
- status effects
- classes

into validated external data.

Success criteria:

```text
A new enemy or skill can be added mostly
through data rather than engine code.
```

---

## Phase 7 — RPG systems

Build:

- inventory
- equipment
- stats
- progression
- experience
- levels
- loot
- status effects
- buffs/debuffs

---

## Phase 8 — World exploration

Build:

- tilemap system
- movement
- collision
- map transitions
- NPCs
- interactables
- pathfinding
- encounters

Add rot.js only where useful.

---

## Phase 9 — Persistence

Build:

- save slots
- save schema
- SQLite persistence
- save migrations
- autosave
- load validation

---

## Phase 10 — Audio and polish

Build:

- SFX manager
- music manager
- volume controls
- animation polish
- particles
- transitions
- haptics if desired

---

# 22. Performance Rules

AI assistants working on this project should follow these rules.

## Do not

- store the full game world in React state
- update React state every frame
- render large tilemaps using thousands of `<View>` elements
- call `Math.random()` in simulation code
- make animations authoritative
- calculate combat rules inside UI components
- directly mutate game data from React UI
- combine all systems into one giant class
- add a physics engine before it is needed

## Prefer

- Skia for the game world
- ECS queries for entities
- commands for user intent
- events for simulation results
- XState for high-level phases
- Zustand for React-facing UI state
- deterministic pure functions for combat calculations
- Zod validation at data boundaries
- seeded RNG
- focused systems
- unit tests for simulation
- property tests for invariants

---

# 23. Coding Style

Prefer small pure functions when implementing game rules.

Good:

```ts
const damage = calculateDamage({
  attack: attacker.stats.attack,
  defense: target.stats.defense,
  power: skill.power,
});
```

Avoid hiding every calculation inside stateful classes.

Prefer explicit dependency injection:

```ts
resolveAttack({
  attacker,
  target,
  random,
  rules,
});
```

over importing global services everywhere.

---

# 24. Recommended Domain Types

Create strong ID types or aliases where practical.

Example:

```ts
export type EntityId = string;
export type SkillId = string;
export type ItemId = string;
export type QuestId = string;
export type MapId = string;
```

Important domain objects should have clear interfaces rather than loose dictionaries.

---

# 25. Debugging Features Worth Building Early

Add a debug mode capable of displaying:

- current RNG seed
- entity IDs
- entity positions
- current battle phase
- turn order
- active state-machine state
- FPS
- entity count
- collision boxes
- current commands
- recent game events

A deterministic bug report should ideally include:

```text
seed
initial state
command history
game version
```

This should make many gameplay bugs directly reproducible.

---

# 26. Replay-Friendly Architecture

Store commands rather than visual frames.

Possible replay payload:

```ts
type Replay = {
  version: number;
  seed: number;
  initialState: SerializableGameState;
  commands: GameCommand[];
};
```

Replays should reconstruct the simulation by re-running the command sequence.

This design also helps future multiplayer, debugging, and automated battle simulation.

---

# 27. Suggested First Vertical Slice

Do not attempt to build every RPG feature immediately.

The first complete playable slice should contain:

1. One player entity
2. One enemy entity
3. One battle
4. Basic attack
5. One skill
6. HP
7. Turn order
8. Victory/defeat
9. Skia sprites
10. Damage animation
11. Seeded RNG
12. Unit tests
13. One save slot

Example gameplay:

```text
Launch game
    ↓
Start Battle
    ↓
Player attacks Slime
    ↓
Slime attacks Player
    ↓
Player uses Fireball
    ↓
Slime dies
    ↓
Victory screen
```

If this vertical slice has clean boundaries, expand the engine from there.

---

# 28. AI Assistant Handoff Rules

Any AI assistant modifying this project should follow these constraints.

## Architectural rules

1. Keep core game simulation independent from React.
2. Do not introduce React hooks into `src/engine`.
3. Do not use `Math.random()` for gameplay.
4. All gameplay randomness must go through the engine RNG.
5. Simulation code should remain deterministic when given the same seed and commands.
6. Prefer commands for player/AI intent.
7. Prefer events for reporting completed simulation outcomes.
8. Use Miniplex for world entities.
9. Use XState for state-machine workflows.
10. Use Zustand only for React-facing state.
11. Use Zod at external data boundaries.
12. Keep rendering read-only with respect to authoritative simulation state.
13. Do not make animation completion determine whether combat calculations happen.
14. Add tests for new gameplay rules.
15. Avoid adding dependencies unless they solve a specific need.

---

## Before implementing a new feature

The AI assistant should determine:

```text
Is this entity data?
→ ECS

Is this high-level workflow?
→ XState

Is this React UI state?
→ Zustand

Is this a game command?
→ Command system

Is this the result of simulation?
→ Event system

Is this game content?
→ Zod-validated data

Is this visual-only state?
→ Skia/Reanimated

Is this persistent?
→ Save/SQLite layer
```

This decision tree should prevent architecture drift.

---

# 29. Expected Long-Term Architecture

The desired end state is:

```text
                 ┌─────────────────┐
                 │ React Native UI │
                 └────────┬────────┘
                          │
                          ▼
                    UI Commands
                          │
                          ▼
┌─────────────────────────────────────────────┐
│                 GAME ENGINE                 │
│                                             │
│   Commands                                  │
│      ↓                                      │
│   XState orchestration                      │
│      ↓                                      │
│   ECS systems                               │
│      ↓                                      │
│   Game state                                │
│      ↓                                      │
│   Events                                    │
│                                             │
│   Seeded RNG                                │
│   Data schemas                              │
│   Save system                               │
└──────────┬──────────────────────┬───────────┘
           │                      │
           ▼                      ▼
    ┌────────────┐         ┌──────────────┐
    │ Skia      │         │ Audio        │
    │ Renderer  │         │ Manager      │
    └─────┬──────┘         └──────────────┘
          │
          ▼
    Reanimated effects
```

---

# 30. Recommended Final Stack

For this engine, use this as the default stack unless a later requirement justifies changing it:

```text
React Native
Expo
TypeScript

Rendering:
@shopify/react-native-skia

Animation:
react-native-reanimated

Input:
react-native-gesture-handler

ECS:
miniplex

State machines:
xstate

React UI state:
zustand

Validation:
zod

Deterministic RNG:
pure-rand

RPG algorithms:
rot-js

Persistence:
expo-sqlite
expo-file-system

Audio:
expo-audio

Testing:
vitest
fast-check

Optional physics:
planck
or
matter-js
```

The core philosophy is:

> Build the game as a deterministic TypeScript simulation first.  
> Use React Native for the application shell and UI.  
> Use Skia and Reanimated for presentation.  
> Keep gameplay logic independent, testable, and data-driven.

That architecture should work well for a turn-based RPG today while leaving room for tactical combat, exploration, procedural generation, richer animation, and more complex game systems later.
