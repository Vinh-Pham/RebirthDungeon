# TypeScript Turn-Based RPG Battle Libraries — AI Handoff Guide

> Purpose: This document defines how to use **XState**, **pure-rand**, **Immer**, **Zod**, **Vitest**, **fast-check**, and **rot.js** in a TypeScript turn-based RPG battle system.
>
> It is written as a handoff document for AI coding assistants. Treat the architectural rules and invariants in this document as project guidance unless the existing codebase clearly establishes a different convention.

## 1. Goals

The battle system should be:

- deterministic when given the same seed and player/AI decisions;
- easy to unit test without rendering the game UI;
- safe to save, load, replay, and debug;
- strongly typed;
- data-driven for skills, enemies, items, and status effects;
- able to support buffs, debuffs, damage-over-time, healing, elemental interactions, counters, multi-hit skills, passives, deaths, revives, and enemy AI;
- able to support either simple round-based turns or speed-based initiative;
- independent from the rendering framework.

The UI should display battle state and animate battle events. The UI should **not** contain authoritative combat rules.

---

## 2. Recommended Responsibility Map

| Library | Primary responsibility | Do not make it responsible for |
|---|---|---|
| **XState v5** | Battle phase/turn orchestration | Damage formulas or content definitions |
| **pure-rand** | Seeded deterministic randomness | Battle state management |
| **Immer** | Immutable battle-state transitions | Workflow orchestration |
| **Zod 4** | Runtime validation of external/data-driven content | Hot-path combat calculations |
| **Vitest** | Example-based unit/integration tests | Generating broad randomized test cases |
| **fast-check** | Property-based testing and edge-case generation | Runtime game randomness |
| **rot.js** | Optional initiative/speed scheduling | Authoritative battle state or skill rules |

### Core rule

Each library solves one concern. Avoid creating a system where the same rule exists in several layers.

For example:

- XState decides **when** an action may happen.
- The battle engine decides **what the action does**.
- pure-rand decides **which random result occurs**.
- Immer produces the **next immutable battle state**.
- Zod validates **content entering the engine**.
- Vitest/fast-check prove **the rules stay correct**.
- rot.js optionally decides **who acts next** in a speed-based system.

---

## 3. Installation

```bash
npm install xstate pure-rand immer zod rot-js
npm install --save-dev vitest fast-check @fast-check/vitest
```

Recommended TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true
  }
}
```

XState v5 requires TypeScript 5+.

---

# 4. Suggested Battle Architecture

A useful high-level structure is:

```text
UI / Renderer
    |
    | sends player choices
    v
XState Battle Machine
    |
    | issues BattleCommand
    v
Battle Engine
    |
    |-- validates command
    |-- obtains RNG results
    |-- calculates effects
    |-- updates state through Immer
    |-- emits BattleEvent[]
    v
Next BattleState + BattleEvent[]
    |
    +--> XState decides next phase
    |
    +--> UI animates BattleEvent[]
```

For speed-based battles:

```text
rot.js Scheduler
      |
      | next actor id
      v
XState Battle Machine
      |
      v
Battle Engine
```

The battle engine should remain usable without React, React Native, Phaser, Pixi, Expo, a browser, or any rendering system.

---

# 5. Shared Domain Model

Start with explicit domain types.

```ts
export type ActorId = string;
export type AbilityId = string;
export type StatusId = string;

export type Team = "player" | "enemy";

export interface Stats {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  magic: number;
  resistance: number;
  speed: number;
  critChance: number;
}

export interface ActiveStatus {
  id: StatusId;
  stacks: number;
  remainingTurns: number;
  sourceId?: ActorId;
}

export interface Combatant {
  id: ActorId;
  name: string;
  team: Team;
  hp: number;
  mp: number;
  stats: Stats;
  statuses: ActiveStatus[];
  alive: boolean;
}

export interface BattleState {
  battleId: string;
  round: number;
  turnNumber: number;
  activeActorId: ActorId | null;
  actors: Record<ActorId, Combatant>;
  turnOrder: ActorId[];
  winner: Team | null;
}
```

Prefer normalized actor storage:

```ts
actors: Record<ActorId, Combatant>
```

over repeatedly searching large arrays.

For small games either representation is acceptable, but IDs should remain stable.

---

# 6. Commands and Events

Keep **commands** separate from **events**.

A command is an intent:

```ts
export type BattleCommand =
  | {
      type: "USE_ABILITY";
      actorId: ActorId;
      abilityId: AbilityId;
      targetIds: ActorId[];
    }
  | {
      type: "DEFEND";
      actorId: ActorId;
    }
  | {
      type: "PASS_TURN";
      actorId: ActorId;
    };
```

An event is something that actually happened:

```ts
export type BattleEvent =
  | {
      type: "ABILITY_USED";
      actorId: ActorId;
      abilityId: AbilityId;
      targetIds: ActorId[];
    }
  | {
      type: "DAMAGE_DEALT";
      sourceId: ActorId;
      targetId: ActorId;
      amount: number;
      critical: boolean;
    }
  | {
      type: "HEALED";
      sourceId: ActorId;
      targetId: ActorId;
      amount: number;
    }
  | {
      type: "STATUS_APPLIED";
      sourceId: ActorId;
      targetId: ActorId;
      statusId: StatusId;
    }
  | {
      type: "ACTOR_DEFEATED";
      actorId: ActorId;
    }
  | {
      type: "BATTLE_ENDED";
      winner: Team;
    };
```

Why this matters:

- commands are validated before execution;
- battle events create a clean animation queue;
- battle logs become readable;
- replay/debugging becomes easier;
- audio and VFX can react to events without knowing combat formulas.

---

# 7. XState v5

Official docs: https://stately.ai/docs

## 7.1 What XState should do

Use XState for battle workflow and legal phase transitions.

Good responsibilities:

- battle initialization;
- determining whether the battle is waiting for player input;
- enemy decision phase;
- resolving actions;
- processing start/end-of-turn effects;
- checking victory/defeat;
- moving to the next combatant;
- preventing invalid phase transitions.

Suggested state graph:

```text
initializing
    |
    v
turnStart
    |
    +--> incapacitated? --> resolveSkippedTurn
    |
    +--> player --> waitingForPlayer
    |
    +--> enemy --> choosingEnemyAction
                       |
                       v
                   resolvingAction
                       |
                       v
                 resolvingEffects
                       |
                       v
                   checkBattleEnd
                   /          \
                ended        turnEnd
                               |
                               v
                           nextTurn
```

## 7.2 What XState should NOT do

Avoid embedding large damage formulas directly inside machine configuration.

Bad:

```ts
entry: assign({
  battle: ({ context }) => {
    // 150 lines of crit, armor, elemental, status, and death logic
  },
});
```

Better:

```ts
entry: assign({
  battle: ({ context, event }) =>
    executeBattleCommand(context.battle, event.command).state,
});
```

The machine owns orchestration. The battle engine owns rules.

## 7.3 Typed XState setup

Prefer XState v5's `setup()` API.

```ts
import { setup, assign, createActor } from "xstate";

interface BattleMachineContext {
  battle: BattleState;
  pendingCommand: BattleCommand | null;
  pendingEvents: BattleEvent[];
}

type BattleMachineEvent =
  | { type: "PLAYER_COMMAND"; command: BattleCommand }
  | { type: "ANIMATIONS_COMPLETE" }
  | { type: "CONTINUE" };

export const battleMachine = setup({
  types: {
    context: {} as BattleMachineContext,
    events: {} as BattleMachineEvent,
    input: {} as { initialBattle: BattleState },
  },
}).createMachine({
  id: "battle",
  initial: "initializing",

  context: ({ input }) => ({
    battle: input.initialBattle,
    pendingCommand: null,
    pendingEvents: [],
  }),

  states: {
    initializing: {
      always: "turnStart",
    },

    turnStart: {
      always: [
        {
          guard: ({ context }) =>
            context.battle.winner !== null,
          target: "ended",
        },
        {
          guard: ({ context }) => {
            const id = context.battle.activeActorId;
            if (!id) return false;
            return context.battle.actors[id]?.team === "player";
          },
          target: "waitingForPlayer",
        },
        {
          target: "choosingEnemyAction",
        },
      ],
    },

    waitingForPlayer: {
      on: {
        PLAYER_COMMAND: {
          actions: assign({
            pendingCommand: ({ event }) => event.command,
          }),
          target: "resolvingAction",
        },
      },
    },

    choosingEnemyAction: {
      // Enemy AI can produce a BattleCommand here.
      // Keep AI decision logic in a separate module.
    },

    resolvingAction: {
      // Call the battle engine, store the next state and emitted events.
      // Then wait for UI animation or continue immediately in headless tests.
    },

    resolvingEffects: {},
    checkBattleEnd: {},
    turnEnd: {},
    nextTurn: {},

    ended: {
      type: "final",
    },
  },
});
```

## 7.4 Running the machine

```ts
const actor = createActor(battleMachine, {
  input: {
    initialBattle,
  },
});

actor.subscribe((snapshot) => {
  console.log(snapshot.value);
  console.log(snapshot.context.battle);
});

actor.start();
```

## 7.5 Guards

Use guards for phase-level legality.

Examples:

- battle already ended;
- active actor is player-controlled;
- actor is stunned and must skip;
- command is available in the current phase.

Do not rely only on guards for combat validation. The engine should still validate commands because engine functions may be called from tests, AI simulation, servers, or replay tools without XState.

## 7.6 XState + Immer

XState context is conceptually immutable. Immer fits well inside `assign`.

```ts
import { assign } from "xstate";
import { produce } from "immer";

const applyDamage = assign({
  battle: ({ context }) =>
    produce(context.battle, (draft) => {
      const target = draft.actors["slime-1"];
      if (!target) return;

      target.hp = Math.max(0, target.hp - 25);
      target.alive = target.hp > 0;
    }),
});
```

For nontrivial logic, call a battle-engine function instead of writing it inline.

---

# 8. pure-rand

Official repository: https://github.com/dubzzz/pure-rand

## 8.1 Why seeded RNG matters

Do not scatter `Math.random()` throughout battle code.

Seeded RNG enables:

- reproducible bug reports;
- deterministic automated simulations;
- replay systems;
- deterministic enemy AI tie-breaking;
- consistent crit/miss/status rolls;
- easier multiplayer synchronization if the architecture later needs it.

Typical random decisions:

- hit/miss;
- critical hit;
- damage variance;
- status application chance;
- random target selection;
- loot after battle;
- AI choice among equally weighted actions.

## 8.2 Current recommended generator

The pure-rand project recommends Xoroshiro128+ for general use.

Current imports are available through package subpaths:

```ts
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import { uniformInt } from "pure-rand/distribution/uniformInt";

const rng = xoroshiro128plus(12345);

const roll1 = uniformInt(rng, 1, 100);
const roll2 = uniformInt(rng, 1, 100);
```

## 8.3 Prefer an RNG abstraction

Do not import pure-rand all over the combat code.

Create a small project-level interface:

```ts
export interface BattleRng {
  int(min: number, max: number): number;
  chance(probability: number): boolean;
}
```

Implementation:

```ts
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import { uniformInt } from "pure-rand/distribution/uniformInt";

export function createBattleRng(seed: number): BattleRng {
  const rng = xoroshiro128plus(seed);

  return {
    int(min, max) {
      return uniformInt(rng, min, max);
    },

    chance(probability) {
      if (probability <= 0) return false;
      if (probability >= 1) return true;

      const roll = uniformInt(rng, 1, 1_000_000);
      return roll <= Math.floor(probability * 1_000_000);
    },
  };
}
```

Then battle functions depend on your interface:

```ts
export function rollCritical(
  critChance: number,
  rng: BattleRng,
): boolean {
  return rng.chance(critChance);
}
```

This makes tests easy because they can inject a fake RNG.

## 8.4 Testing with deterministic fake RNG

```ts
const alwaysCritRng: BattleRng = {
  int: (min) => min,
  chance: () => true,
};
```

This is often better for unit tests than relying on a particular PRNG sequence.

Use actual seeded pure-rand instances for deterministic integration tests and simulations.

## 8.5 Pure usage

pure-rand also supports a purely functional style through `purify`.

```ts
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import { uniformIntDistribution } from "pure-rand/distribution/UniformIntDistribution";
import { purify } from "pure-rand/utils/purify";

const pureUniformInt = purify(uniformIntDistribution);

const rng1 = xoroshiro128plus(42);
const [roll1, rng2] = pureUniformInt(rng1, 1, 100);
const [roll2, rng3] = pureUniformInt(rng2, 1, 100);
```

This is useful when you want RNG state to behave like another explicit input/output of a reducer.

## 8.6 Serialization warning

Avoid assuming a live PRNG object is automatically safe to put inside JSON save data.

Recommended options:

1. Persist the initial seed plus enough battle information to deterministically rebuild the sequence.
2. Persist a project-defined serializable RNG state if your wrapper supports it.
3. For durable replays across future balance/code changes, record the resolved random outcomes in the battle event log.

A replay that only stores a seed may change if combat code later consumes random numbers in a different order.

## 8.7 Randomness rule

All runtime battle randomness should pass through one battle-scoped RNG abstraction.

Never mix:

```ts
battleRng.int(...)
Math.random()
crypto.getRandomValues(...)
```

inside the same deterministic combat simulation.

---

# 9. Immer

Official docs: https://immerjs.github.io/immer/

## 9.1 Why Immer helps

Battle state quickly becomes deeply nested:

```text
BattleState
  actors
    actor
      hp
      mp
      statuses
      cooldowns
      temporary modifiers
```

Without Immer, immutable updates can become noisy.

Instead of manually cloning several levels:

```ts
const next = {
  ...state,
  actors: {
    ...state.actors,
    [targetId]: {
      ...state.actors[targetId],
      hp: nextHp,
    },
  },
};
```

use `produce`:

```ts
import { produce } from "immer";

const next = produce(state, (draft) => {
  const target = draft.actors[targetId];
  if (!target) return;

  target.hp = nextHp;
});
```

The original state remains unchanged while Immer creates the next state with structural sharing.

## 9.2 Recommended reducer pattern

Create small reusable state transition functions.

```ts
import { produce } from "immer";

export function applyDamage(
  state: BattleState,
  targetId: ActorId,
  amount: number,
): BattleState {
  return produce(state, (draft) => {
    const target = draft.actors[targetId];
    if (!target || !target.alive) return;

    target.hp = Math.max(0, target.hp - amount);

    if (target.hp === 0) {
      target.alive = false;
    }
  });
}
```

## 9.3 Keep calculations outside mutations

Prefer:

```ts
const damage = calculateDamage(attacker, target, ability, rng);

const nextState = produce(state, (draft) => {
  draft.actors[target.id].hp = Math.max(
    0,
    draft.actors[target.id].hp - damage.amount,
  );
});
```

rather than hiding calculations in a large mutation block.

Pure calculation functions are easier to test.

## 9.4 Readonly domain types

Immer works well with readonly TypeScript types.

Example:

```ts
export interface Combatant {
  readonly id: ActorId;
  readonly name: string;
  readonly team: Team;
  readonly hp: number;
  readonly statuses: readonly ActiveStatus[];
}
```

Inside an Immer draft, those values can still be edited safely.

This discourages accidental mutation elsewhere.

## 9.5 Event generation

A useful command execution shape is:

```ts
export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
}
```

Example:

```ts
export function executeAttack(
  state: BattleState,
  actorId: ActorId,
  targetId: ActorId,
  rng: BattleRng,
): CommandResult {
  const events: BattleEvent[] = [];

  const attacker = state.actors[actorId];
  const target = state.actors[targetId];

  if (!attacker || !target) {
    throw new Error("Invalid actor or target");
  }

  const critical = rng.chance(attacker.stats.critChance);
  const amount = calculateBasicAttackDamage(attacker, target, critical);

  const nextState = produce(state, (draft) => {
    const draftTarget = draft.actors[targetId];
    if (!draftTarget) return;

    draftTarget.hp = Math.max(0, draftTarget.hp - amount);

    events.push({
      type: "DAMAGE_DEALT",
      sourceId: actorId,
      targetId,
      amount,
      critical,
    });

    if (draftTarget.hp === 0 && draftTarget.alive) {
      draftTarget.alive = false;
      events.push({
        type: "ACTOR_DEFEATED",
        actorId: targetId,
      });
    }
  });

  return {
    state: nextState,
    events,
  };
}
```

For large systems, consider separating event calculation from mutation so the Immer recipe stays focused.

---

# 10. Zod 4

Official docs: https://zod.dev/

## 10.1 What Zod should validate

Use Zod at runtime boundaries where TypeScript alone cannot guarantee data safety.

Good candidates:

- JSON skill files;
- enemy definitions;
- item definitions;
- status-effect definitions;
- mod/user-created data;
- server payloads;
- save files;
- imported battle scenarios;
- configuration files.

TypeScript types disappear at runtime. Zod makes unknown runtime data trustworthy before it enters the engine.

## 10.2 Ability schema

```ts
import * as z from "zod";

const targetTypeSchema = z.enum([
  "self",
  "singleAlly",
  "singleEnemy",
  "allAllies",
  "allEnemies",
]);

const damageEffectSchema = z.object({
  type: z.literal("damage"),
  power: z.number().positive(),
  element: z.enum([
    "physical",
    "fire",
    "ice",
    "lightning",
    "holy",
    "dark",
  ]),
});

const healEffectSchema = z.object({
  type: z.literal("heal"),
  power: z.number().positive(),
});

const statusEffectSchema = z.object({
  type: z.literal("applyStatus"),
  statusId: z.string().min(1),
  chance: z.number().min(0).max(1),
  duration: z.number().int().positive(),
});

const abilityEffectSchema = z.discriminatedUnion("type", [
  damageEffectSchema,
  healEffectSchema,
  statusEffectSchema,
]);

export const abilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mpCost: z.number().int().nonnegative(),
  target: targetTypeSchema,
  effects: z.array(abilityEffectSchema).min(1),
});

export type AbilityDefinition = z.infer<typeof abilitySchema>;
```

Example content:

```json
{
  "id": "fireball",
  "name": "Fireball",
  "mpCost": 12,
  "target": "singleEnemy",
  "effects": [
    {
      "type": "damage",
      "power": 45,
      "element": "fire"
    },
    {
      "type": "applyStatus",
      "statusId": "burn",
      "chance": 0.25,
      "duration": 3
    }
  ]
}
```

## 10.3 Parse at the boundary

Throwing parse:

```ts
const ability = abilitySchema.parse(rawJson);
```

Non-throwing parse:

```ts
const result = abilitySchema.safeParse(rawJson);

if (!result.success) {
  console.error(result.error);
} else {
  const ability = result.data;
}
```

## 10.4 Avoid repeated validation in hot paths

Do this once:

```text
load JSON
   |
   v
Zod validation
   |
   v
trusted AbilityDefinition
   |
   v
battle runtime uses typed object repeatedly
```

Avoid parsing the same ability with Zod every time the player presses Attack.

## 10.5 Cross-record validation

After individual Zod parsing, add domain-level validation.

Example checks:

- every `statusId` referenced by an ability exists;
- every enemy ability ID exists;
- no duplicate IDs;
- damage elements are registered;
- progression tables are internally valid.

Zod validates shape well. Referential integrity usually belongs in a separate content validation pass.

---

# 11. Vitest

Official docs: https://vitest.dev/

## 11.1 What to test with Vitest

Use Vitest for explicit examples and regressions.

High-value battle tests include:

- exact damage calculation;
- defense mitigation;
- crit multiplier;
- elemental weakness/resistance;
- MP cost validation;
- dead actors cannot act;
- dead actors cannot normally be targeted;
- healing cannot exceed max HP;
- damage cannot reduce HP below zero;
- poison ticks exactly once when intended;
- stun skips exactly the intended number of turns;
- revive restores valid state;
- victory occurs when all opponents are defeated;
- defeat occurs when all player combatants are defeated;
- counters trigger in the correct order;
- start/end-of-turn effects fire once;
- deterministic seed produces deterministic results.

## 11.2 Example damage tests

```ts
import { describe, expect, test } from "vitest";
import { calculatePhysicalDamage } from "./damage";

describe("calculatePhysicalDamage", () => {
  test("defense reduces damage", () => {
    const damage = calculatePhysicalDamage({
      attack: 100,
      defense: 50,
      power: 1,
      critical: false,
    });

    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThan(100);
  });

  test("critical hits deal more damage", () => {
    const normal = calculatePhysicalDamage({
      attack: 100,
      defense: 40,
      power: 1,
      critical: false,
    });

    const critical = calculatePhysicalDamage({
      attack: 100,
      defense: 40,
      power: 1,
      critical: true,
    });

    expect(critical).toBeGreaterThan(normal);
  });
});
```

## 11.3 Battle command integration test

```ts
import { expect, test } from "vitest";

test("an attack can defeat an enemy", () => {
  const rng: BattleRng = {
    int: () => 100,
    chance: () => false,
  };

  const initial = createTestBattle({
    enemyHp: 10,
  });

  const result = executeBattleCommand(
    initial,
    {
      type: "USE_ABILITY",
      actorId: "hero",
      abilityId: "basic-attack",
      targetIds: ["slime"],
    },
    rng,
  );

  expect(result.state.actors.slime.hp).toBe(0);
  expect(result.state.actors.slime.alive).toBe(false);

  expect(result.events).toContainEqual({
    type: "ACTOR_DEFEATED",
    actorId: "slime",
  });
});
```

## 11.4 Test battle builders

Avoid giant fixtures copied between tests.

Create builders:

```ts
export function createTestCombatant(
  overrides: Partial<Combatant> = {},
): Combatant {
  return {
    id: "actor",
    name: "Actor",
    team: "player",
    hp: 100,
    mp: 50,
    alive: true,
    statuses: [],
    stats: {
      maxHp: 100,
      maxMp: 50,
      attack: 20,
      defense: 10,
      magic: 10,
      resistance: 10,
      speed: 10,
      critChance: 0.05,
    },
    ...overrides,
  };
}
```

This keeps tests readable and AI-generated tests smaller.

---

# 12. fast-check

Official docs: https://fast-check.dev/

For Vitest projects, the current fast-check documentation recommends the dedicated `@fast-check/vitest` connector.

## 12.1 Why property-based testing is valuable for RPG combat

A manually written unit test checks a few examples.

Property-based tests generate many combinations automatically.

Combat systems have huge input spaces:

```text
attack
x defense
x skill power
x hp
x buffs
x debuffs
x crit
x elemental modifier
x status stacks
x turn count
```

This is exactly where property-based testing is useful.

## 12.2 Important invariants

Good properties include:

- HP never becomes negative;
- HP never exceeds max HP after normal healing;
- MP never becomes negative after a valid cast;
- damage is never negative;
- dead actors cannot become active without revive logic;
- applying zero damage does not change HP;
- identical seed + commands produce identical results;
- turn order contains no nonexistent actor IDs;
- a resolved battle has exactly one valid winner;
- status duration never decreases below zero;
- an invalid target never silently receives damage;
- state passed into a reducer remains unchanged.

## 12.3 Basic fast-check with Vitest

Classic integration:

```ts
import { expect, test } from "vitest";
import fc from "fast-check";

test("damage never reduces HP below zero", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 100_000 }),
      fc.integer({ min: 0, max: 100_000 }),
      (hp, damage) => {
        const nextHp = Math.max(0, hp - damage);
        expect(nextHp).toBeGreaterThanOrEqual(0);
      },
    ),
  );
});
```

## 12.4 Recommended Vitest connector

```ts
import { expect } from "vitest";
import { test, fc } from "@fast-check/vitest";

test.prop([
  fc.integer({ min: 1, max: 9999 }),
  fc.integer({ min: 0, max: 9999 }),
])("damage is never negative", (attack, defense) => {
  const damage = calculatePhysicalDamage({
    attack,
    defense,
    power: 1,
    critical: false,
  });

  expect(damage).toBeGreaterThanOrEqual(0);
});
```

## 12.5 Battle-state arbitrary

As the project grows, create reusable generators.

```ts
import fc from "fast-check";

export const statsArbitrary = fc.record({
  maxHp: fc.integer({ min: 1, max: 9999 }),
  maxMp: fc.integer({ min: 0, max: 999 }),
  attack: fc.integer({ min: 0, max: 999 }),
  defense: fc.integer({ min: 0, max: 999 }),
  magic: fc.integer({ min: 0, max: 999 }),
  resistance: fc.integer({ min: 0, max: 999 }),
  speed: fc.integer({ min: 1, max: 999 }),
  critChance: fc.double({ min: 0, max: 1, noNaN: true }),
});
```

Then create combatants from constrained values.

Prefer generating **valid states directly** over generating arbitrary garbage and filtering most of it out.

## 12.6 Reproducibility

fast-check reports a seed and counterexample when a property fails. Preserve those details in bug reports.

A useful regression workflow:

```text
property test fails
      |
      v
fast-check shrinks failure
      |
      v
small reproducible counterexample
      |
      v
create permanent Vitest regression test
      |
      v
fix bug
```

Use fast-check to discover unexpected cases; use a targeted Vitest test to permanently document important regressions.

## 12.7 fast-check is NOT runtime RNG

Do not use fast-check to roll critical hits in the real game.

Use:

- **pure-rand** for runtime battle RNG;
- **fast-check** for generating test inputs.

---

# 13. rot.js

Official manual: https://ondras.github.io/rot.js/manual/

Repository: https://github.com/ondras/rot.js

## 13.1 When rot.js is useful

rot.js includes timing and scheduling utilities that can help with turn order.

Use it if the game has concepts such as:

- agility/speed determines action frequency;
- fast characters act more often than slow characters;
- initiative is a continuously advancing timeline;
- different actions consume different amounts of time;
- roguelike-style scheduling.

For a strict round system like:

```text
Hero 1
Hero 2
Enemy 1
Enemy 2
repeat
```

you may not need rot.js at all.

## 13.2 Scheduler.Speed

The current rot.js source exposes `Scheduler.Speed`. A speed actor implements:

```ts
interface SpeedActor {
  getSpeed(): number;
}
```

The speed scheduler uses a delay based on approximately:

```text
1 / actor.getSpeed()
```

so higher speed means more frequent turns.

Example:

```ts
import { Scheduler } from "rot-js";

interface TurnActor {
  id: ActorId;
  getSpeed(): number;
}

const actors: TurnActor[] = [
  {
    id: "knight",
    getSpeed: () => 80,
  },
  {
    id: "rogue",
    getSpeed: () => 140,
  },
  {
    id: "goblin",
    getSpeed: () => 95,
  },
];

const scheduler = new Scheduler.Speed<TurnActor>();

for (const actor of actors) {
  scheduler.add(actor, true);
}

const nextActor = scheduler.next();

if (nextActor) {
  console.log(nextActor.id);
}
```

## 13.3 Dynamic speed

Because the scheduler calls `getSpeed()`, a project can resolve current effective speed instead of permanently copying the base stat.

Example concept:

```ts
function createTurnActor(
  id: ActorId,
  getBattleState: () => BattleState,
): TurnActor {
  return {
    id,
    getSpeed() {
      const actor = getBattleState().actors[id];
      if (!actor) return 1;
      return calculateEffectiveSpeed(actor);
    },
  };
}
```

This allows haste/slow effects to influence future scheduling.

Be careful about lifecycle and deterministic reconstruction.

## 13.4 Do not let the scheduler own combatants

Prefer putting IDs or lightweight turn handles in the scheduler rather than making scheduler objects the authoritative actor data.

Bad architecture:

```text
rot.js scheduler object
  owns HP
  owns status effects
  owns equipment
  owns skill cooldowns
```

Better:

```text
BattleState
  owns all combat state

rot.js
  identifies which actor acts next
```

## 13.5 Save/load considerations

rot.js scheduler internals should not automatically be treated as your save-game format.

If exact mid-battle save/load is required, define how initiative is serialized.

Options:

- store a project-owned initiative timeline and rebuild the scheduler;
- store enough timing metadata to reconstruct it;
- avoid mid-turn save if design allows;
- use your own serializable scheduler if exact persistence becomes more important than rot.js convenience.

## 13.6 Action-time systems

If attacks should consume different amounts of time, inspect `Scheduler.Action` in rot.js rather than forcing all actions through `Scheduler.Speed`.

Example design:

```text
quick attack       cost 0.7
normal attack      cost 1.0
heavy attack       cost 1.5
spell              cost 1.2
item               cost 0.8
```

Do not add this complexity unless the battle design actually needs it.

---

# 14. Recommended Battle Engine API

Keep the central engine small and explicit.

```ts
export interface BattleEngineDependencies {
  rng: BattleRng;
  abilities: ReadonlyMap<AbilityId, AbilityDefinition>;
}

export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
}

export function executeBattleCommand(
  state: BattleState,
  command: BattleCommand,
  dependencies: BattleEngineDependencies,
): CommandResult {
  validateBattleCommand(state, command, dependencies);

  switch (command.type) {
    case "USE_ABILITY":
      return executeAbility(state, command, dependencies);

    case "DEFEND":
      return executeDefend(state, command);

    case "PASS_TURN":
      return executePassTurn(state, command);
  }
}
```

This API can be called from:

- XState;
- unit tests;
- AI battle simulation;
- a multiplayer server;
- replay tools;
- debugging/dev tools.

---

# 15. Command Validation

The engine should validate actions even when XState already constrains the UI.

```ts
export class InvalidBattleCommandError extends Error {}

export function validateBattleCommand(
  state: BattleState,
  command: BattleCommand,
  dependencies: BattleEngineDependencies,
): void {
  if (state.winner !== null) {
    throw new InvalidBattleCommandError(
      "Cannot execute a command after the battle has ended",
    );
  }

  const actor = state.actors[command.actorId];

  if (!actor) {
    throw new InvalidBattleCommandError("Actor does not exist");
  }

  if (!actor.alive) {
    throw new InvalidBattleCommandError("Defeated actor cannot act");
  }

  if (state.activeActorId !== actor.id) {
    throw new InvalidBattleCommandError("Actor is not active");
  }
}
```

Validate again inside specialized commands where necessary:

- target legality;
- MP/resource cost;
- cooldown;
- silence/stun restrictions;
- ability ownership;
- target team;
- alive/dead requirements.

---

# 16. Damage Calculation Pattern

Damage formulas should be pure whenever possible.

```ts
export interface DamageInput {
  attack: number;
  defense: number;
  power: number;
  critical: boolean;
  elementalMultiplier: number;
  varianceMultiplier: number;
}

export function calculateDamage(input: DamageInput): number {
  const raw = input.attack * input.power;
  const mitigated = raw * (100 / (100 + Math.max(0, input.defense)));
  const critMultiplier = input.critical ? 1.5 : 1;

  return Math.max(
    0,
    Math.floor(
      mitigated *
        critMultiplier *
        input.elementalMultiplier *
        input.varianceMultiplier,
    ),
  );
}
```

The exact formula is game-design-specific. The important architectural point is that the formula accepts inputs and returns an output without touching UI or global state.

Then randomness is resolved separately:

```ts
const critical = rng.chance(attacker.stats.critChance);
const variancePercent = rng.int(95, 105);

const damage = calculateDamage({
  attack: attacker.stats.attack,
  defense: target.stats.defense,
  power: abilityPower,
  critical,
  elementalMultiplier,
  varianceMultiplier: variancePercent / 100,
});
```

---

# 17. Status Effect Pattern

Treat statuses as data plus lifecycle hooks/handlers.

Example definition:

```ts
export interface StatusDefinition {
  id: StatusId;
  name: string;
  maxStacks: number;
  defaultDuration: number;
  timing: "turnStart" | "turnEnd" | "onDamage" | "passive";
}
```

Runtime status:

```ts
export interface ActiveStatus {
  id: StatusId;
  stacks: number;
  remainingTurns: number;
  sourceId?: ActorId;
}
```

Prefer explicit processing functions:

```ts
processTurnStartStatuses(...)
processTurnEndStatuses(...)
processBeforeDamageStatuses(...)
processAfterDamageStatuses(...)
```

Avoid creating one giant generic `processAllEffects()` function whose ordering becomes impossible to reason about.

Effect ordering should be documented and tested.

---

# 18. Turn Resolution Pipeline

A scalable action pipeline is:

```text
1. Validate command
2. Resolve actor
3. Resolve legal targets
4. Pay costs
5. Roll hit/miss if applicable
6. Resolve pre-action hooks
7. Resolve each effect in defined order
8. Emit damage/heal/status events
9. Resolve reactions/counters
10. Resolve defeats/revives
11. Check battle end
12. Emit final events
13. Return next state
```

For multi-hit abilities, each hit should have clearly defined RNG and reaction behavior.

Example question that must be explicit in design:

> Does a 4-hit attack roll critical chance once for the whole ability, or independently for each hit?

Do not leave ordering behavior accidental.

---

# 19. Battle Event Queue and UI

The battle engine should not call animation code.

Instead:

```ts
const result = executeBattleCommand(...);

result.events;
```

may contain:

```ts
[
  {
    type: "ABILITY_USED",
    actorId: "mage",
    abilityId: "fireball",
    targetIds: ["slime"],
  },
  {
    type: "DAMAGE_DEALT",
    sourceId: "mage",
    targetId: "slime",
    amount: 83,
    critical: false,
  },
  {
    type: "STATUS_APPLIED",
    sourceId: "mage",
    targetId: "slime",
    statusId: "burn",
  },
]
```

The UI can then animate:

```text
Mage cast animation
      |
Fireball projectile
      |
83 damage number
      |
Burn icon appears
```

Headless tests can ignore animations entirely.

---

# 20. Enemy AI

Keep enemy AI separate from action execution.

AI outputs a normal `BattleCommand`:

```ts
export function chooseEnemyCommand(
  state: BattleState,
  actorId: ActorId,
  rng: BattleRng,
): BattleCommand {
  // Evaluate available moves.
  // Use battle RNG for randomized tie-breaking.
  // Return a command; do not mutate battle state.
}
```

Then execute it through the same engine as player actions:

```ts
const command = chooseEnemyCommand(state, enemyId, rng);
const result = executeBattleCommand(state, command, dependencies);
```

This prevents duplicated combat rules.

Do not create separate functions like:

```ts
playerAttack()
enemyAttack()
```

when both can use the same command pipeline.

---

# 21. Suggested Project Structure

```text
src/
  battle/
    domain/
      battle-types.ts
      commands.ts
      events.ts

    engine/
      execute-command.ts
      validate-command.ts
      damage.ts
      healing.ts
      targeting.ts
      victory.ts

    abilities/
      ability-schema.ts
      ability-registry.ts
      execute-ability.ts

    statuses/
      status-schema.ts
      status-registry.ts
      turn-start.ts
      turn-end.ts
      reactions.ts

    rng/
      battle-rng.ts
      pure-rand-rng.ts

    turns/
      turn-order.ts
      rot-scheduler.ts

    ai/
      choose-enemy-command.ts
      scoring.ts

    machine/
      battle-machine.ts

    content/
      load-content.ts
      validate-content.ts

    __tests__/
      damage.test.ts
      abilities.test.ts
      statuses.test.ts
      battle-engine.test.ts
      determinism.test.ts
      invariants.property.test.ts
```

---

# 22. Integration Example

A simplified action execution flow:

```ts
export function resolvePlayerAbility(
  state: BattleState,
  command: Extract<BattleCommand, { type: "USE_ABILITY" }>,
  deps: BattleEngineDependencies,
): CommandResult {
  const ability = deps.abilities.get(command.abilityId);

  if (!ability) {
    throw new InvalidBattleCommandError(
      `Unknown ability: ${command.abilityId}`,
    );
  }

  validateAbilityCommand(state, command, ability);

  let nextState = state;
  const events: BattleEvent[] = [
    {
      type: "ABILITY_USED",
      actorId: command.actorId,
      abilityId: command.abilityId,
      targetIds: command.targetIds,
    },
  ];

  nextState = produce(nextState, (draft) => {
    draft.actors[command.actorId].mp -= ability.mpCost;
  });

  for (const effect of ability.effects) {
    const result = executeAbilityEffect(
      nextState,
      command.actorId,
      command.targetIds,
      effect,
      deps,
    );

    nextState = result.state;
    events.push(...result.events);
  }

  const victoryResult = resolveVictoryState(nextState);

  return {
    state: victoryResult.state,
    events: [...events, ...victoryResult.events],
  };
}
```

Then XState can call this function and transition to the next phase.

---

# 23. Determinism Test

One of the most valuable integration tests is proving the same seed and commands produce the same output.

```ts
import { expect, test } from "vitest";

test("battle sequence is deterministic", () => {
  const run = () => {
    const rng = createBattleRng(12345);
    let state = createInitialBattle();
    const log: BattleEvent[] = [];

    for (const command of deterministicCommandSequence) {
      const result = executeBattleCommand(state, command, {
        rng,
        abilities,
      });

      state = result.state;
      log.push(...result.events);
    }

    return { state, log };
  };

  expect(run()).toEqual(run());
});
```

If this fails, look for accidental nondeterminism such as:

- `Math.random()`;
- `Date.now()`;
- unstable object iteration where order matters;
- async race behavior;
- environment-dependent data;
- different random-number consumption order.

---

# 24. Property Tests to Add Early

Start with these:

```text
[ ] HP is always >= 0
[ ] normal healing never exceeds max HP
[ ] valid MP costs never result in MP < 0
[ ] damage is always an integer >= 0
[ ] dead actors cannot take normal actions
[ ] defeated targets cannot receive normal single-target attacks
[ ] same seed + same commands => same state and event log
[ ] original BattleState is not mutated
[ ] turn order never contains unknown actors
[ ] battle end emits only one winner
[ ] active actor is alive unless the current phase explicitly handles defeat
[ ] status duration never drops below zero
[ ] applying a status respects max stacks
[ ] effect ordering is deterministic
```

---

# 25. Rules for AI Coding Assistants

When modifying this battle system, follow these rules.

## 25.1 Preserve separation of concerns

Do not move combat formulas into React components, XState view integrations, or animation handlers.

Do not move turn orchestration into individual skill files.

## 25.2 No unseeded battle randomness

Do not introduce `Math.random()` into battle runtime code.

Use the injected `BattleRng`.

## 25.3 Do not mutate BattleState directly

Outside an Immer recipe, treat battle state as immutable.

Bad:

```ts
state.actors[id].hp -= damage;
```

Good:

```ts
const nextState = produce(state, (draft) => {
  draft.actors[id].hp -= damage;
});
```

## 25.4 Validate external data once

Use Zod when content enters the trusted runtime boundary.

Do not repeatedly parse already-valid ability definitions during every attack.

## 25.5 Commands must be validated by the engine

Do not trust UI state alone.

The engine may later run headlessly or server-side.

## 25.6 Emit events for presentation

When adding a visible combat outcome, consider whether a `BattleEvent` should be emitted so UI/audio/VFX can react without inspecting implementation details.

## 25.7 New rules require tests

For a new combat mechanic, normally add:

1. at least one successful example test;
2. at least one edge/failure test;
3. a property test if the mechanic has a broad numeric/state space.

## 25.8 Do not add rot.js unless scheduling complexity warrants it

For a basic fixed round order, a small project-owned turn-order module is simpler.

Use rot.js when speed/timing behavior actually benefits from a scheduler.

## 25.9 Keep runtime content data-driven

Prefer adding a new ability definition over creating a new hard-coded function for every skill, unless the skill has genuinely unique behavior.

## 25.10 Preserve deterministic event order

If multiple effects happen during one action, their order must be explicit and covered by tests.

---

# 26. Recommended Implementation Order

For a new project, implement in this order:

1. Define battle domain types.
2. Define commands and battle events.
3. Implement pure damage/healing calculations.
4. Add `BattleRng` and pure-rand implementation.
5. Implement immutable reducers with Immer.
6. Build ability/status Zod schemas and content registry.
7. Implement command validation and command execution.
8. Add Vitest unit tests.
9. Add fast-check invariant tests.
10. Add XState orchestration around the working battle engine.
11. Add enemy AI that returns normal commands.
12. Add rot.js only if the initiative design needs speed-based scheduling.
13. Connect the UI to machine snapshots and battle events.

This order keeps the battle engine testable before UI concerns are introduced.

---

# 27. Minimal Dependency Direction

Try to keep imports flowing like this:

```text
Domain types
    ^
    |
Schemas/content ------> Engine <------ RNG abstraction
                           ^
                           |
                        XState
                           ^
                           |
                          UI

rot.js ------> turn-order adapter ------> XState / Engine

Vitest + fast-check ------> tests only
```

Avoid circular dependencies such as:

```text
engine -> UI -> XState -> engine
```

---

# 28. Recommended Public Interfaces

Keep a small public surface.

```ts
// battle/index.ts
export type {
  BattleState,
  Combatant,
  BattleCommand,
  BattleEvent,
} from "./domain";

export {
  createInitialBattle,
  executeBattleCommand,
} from "./engine";

export {
  battleMachine,
} from "./machine/battle-machine";
```

Internal mechanics can remain private to the battle module.

This gives AI assistants a clear entry point to inspect before editing internals.

---

# 29. Notes on Replays and Save Files

If replays are a future goal, plan for them now.

At minimum record:

```ts
interface BattleReplay {
  version: number;
  initialScenarioId: string;
  seed: number;
  commands: BattleCommand[];
}
```

For stronger replay stability across code/balance updates, record resolved battle events or version the combat rules/content.

Example:

```ts
interface BattleReplayV2 {
  version: 2;
  rulesetVersion: string;
  contentVersion: string;
  initialScenarioId: string;
  seed: number;
  commands: BattleCommand[];
  events?: BattleEvent[];
}
```

Zod can validate replay and save-file formats before loading them.

---

# 30. Debugging Strategy

When a battle bug is reported, useful debug information includes:

```text
battle id
ruleset/content version
seed
initial state/scenario
command history
event history
current XState state
current BattleState
```

With deterministic RNG and commands, many combat bugs become reproducible rather than intermittent.

---

# 31. Final Recommended Stack

For most TypeScript turn-based RPGs:

```text
XState v5
    orchestration / battle phases

pure-rand
    deterministic battle RNG

Immer
    immutable BattleState transitions

Zod 4
    runtime validation of content and saves

Vitest
    example and regression tests

fast-check + @fast-check/vitest
    property-based invariant testing

rot.js
    optional initiative/speed scheduling
```

The most important architectural idea is not any individual library. It is keeping the combat engine deterministic and independent from the UI:

```ts
const result = executeBattleCommand(
  battleState,
  command,
  dependencies,
);

// result.state  -> next authoritative state
// result.events -> presentation/replay/debug information
```

Everything else should support that model.

---

# 32. Official References

- XState v5: https://stately.ai/docs
- XState setup API: https://stately.ai/docs/setup
- XState context: https://stately.ai/docs/context
- pure-rand: https://github.com/dubzzz/pure-rand
- Immer: https://immerjs.github.io/immer/
- Immer `produce`: https://immerjs.github.io/immer/produce/
- Zod: https://zod.dev/
- Vitest: https://vitest.dev/
- fast-check: https://fast-check.dev/
- fast-check with Vitest: https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/
- rot.js manual: https://ondras.github.io/rot.js/manual/
- rot.js repository: https://github.com/ondras/rot.js

---

# 33. Short AI Handoff Prompt

The following can be pasted into an AI coding assistant together with this document:

```text
You are helping implement a TypeScript turn-based RPG battle system.

Read this battle architecture document before changing combat code.

Key constraints:
- XState v5 orchestrates battle phases and turns.
- Combat calculations and command execution remain framework-independent.
- All runtime battle randomness goes through an injected BattleRng backed by pure-rand. Do not use Math.random() in combat code.
- BattleState is treated as immutable; use Immer for state transitions.
- Zod validates external/data-driven content at runtime boundaries.
- Vitest is used for unit/integration/regression tests.
- fast-check is used for property-based invariant tests.
- rot.js is optional and should only own initiative/scheduling, never authoritative combatant state.
- Player and enemy actions should use the same BattleCommand execution pipeline.
- Combat execution returns { state, events }.
- UI and animation code consume BattleEvent[] but must not own combat rules.
- Preserve deterministic ordering and add tests whenever adding a new combat mechanic.

Before implementing a feature, identify which layer owns it. Avoid duplicating battle rules across the state machine, UI, AI, and engine.
```
