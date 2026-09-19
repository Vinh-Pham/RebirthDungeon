# Turn-based battle rework

## Summary

Replace dice combat with individual turns in a fixed Speed order. Each player turn allows **one optional inventory item**, followed by **Attack, Skill, or Defend**. The main action ends the turn.

Remove dice mechanics completely. Convert existing saves immediately, preserving characters and dungeon progress without retaining a legacy combat engine.

Implement the library responsibilities in [the battle-library handoff](turn-based-rpg-battle-libraries.md), adapted to this repository's [transaction and save boundaries](architecture.md). The gameplay rules below take precedence over the handoff's illustrative formulas, `PASS_TURN` command, folder tree, and installation examples. This contract is implemented in the client; validation results are recorded in [verification](verification.md).

## Library integration

### Dependencies and scope

| Library                             | Repository baseline                          | Responsibility                                                                                                        |
| ----------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **XState v5**                       | Already installed                            | Extend the existing session machine with typed battle phases, command guards, enemy scheduling, and commit handling.  |
| **pure-rand**                       | Installed in client runtime dependencies     | Supply all authoritative randomness through a serializable project adapter using Xoroshiro128+.                       |
| **Immer**                           | Already installed                            | Keep one immutable transaction for the actor outcome, resource spending, progression, RNG state, and turn transition. |
| **Zod 4**                           | Installed in client runtime dependencies     | Validate battle content and versioned save data at their entry boundaries; retain domain integrity checks.            |
| **Vitest**                          | Already installed                            | Extend existing unit, regression, and persistence suites; keep coverage gates.                                        |
| **fast-check + @fast-check/vitest** | Installed in client development dependencies | Generate valid battle states and command sequences to test invariants through the real engine.                        |
| **rot.js (`rot-js`)**               | Defer; do not install for this rework        | Optional future scheduling only if the design changes to variable action frequency or action durations.               |

The handoff explicitly permits a project-owned fixed-order queue. rot.js `Scheduler.Speed` requeues actors using `1 / getSpeed()`, so it would change the required one-turn-per-round behavior. Implement a small serializable turn-order module here. If a later design adopts rot.js, isolate it behind an actor-ID adapter and specify timeline reconstruction before enabling saves. Do not use rot.js RNG or store scheduler instances in saves. See [the scheduler source](https://github.com/ondras/rot.js/blob/master/src/scheduler/speed.ts).

During implementation, add dependencies from the repository root:

```sh
pnpm --filter client add pure-rand zod@^4
pnpm --filter client add -D fast-check @fast-check/vitest
```

Keep the single root lockfile, release-age policy, and build allowlist. Verify the selected pure-rand exports and connector peer compatibility with the installed Vitest version before adopting their APIs. Keep test libraries out of application imports; move the existing Vitest declaration to client development dependencies without an unrelated version upgrade. Preserve `strict: true`; the handoff's additional TypeScript flags are a separate tightening task unless they can be enabled without unrelated changes.

### Shared engine, commands, and events

- Extend `src/domain/model.ts`, `commands.ts`, and `combat.ts`; add focused modules under `src/domain/battle/` for turn order, events, command execution, and enemy profiles as needed. Use `src/domain/rng.ts` for the shared RNG adapter. Do not create a new workspace package or a second skill registry.
- Use stable actor, battle, skill, and turn IDs. Keep the existing character/enemy storage authoritative; use ID-based accessors for the shared engine instead of persisting duplicate combatant objects. Extend existing skill/status types and registries, preserving rank, race, and wiki mappings.
- Define a `BattleCommand` union for Attack, Skill, Defend, Item, and conditional Wait, carrying actor ID, expected turn ID, and relevant skill/item/target IDs. Preserve operation IDs at the outer transaction boundary. Internal begin-turn and enemy-turn commands must use the same guards and writer lock.
- Provide a headless engine entry point conceptually returning `{ state, events }` from immutable state, a command, and explicit dependencies. Integrate it into `reduceCommand` so the returned result also includes changes to inventory, training, rewards, and the active RP actor. No independent combat store or second persistence path.
- Validate battle/actor/turn identity, living actor, target legality, equipment, learned rank, cooldowns, resource affordability, item allowance, and Wait eligibility inside the engine even when XState guards already checked the phase. Invalid or stale commands leave state, RNG, and event history unchanged.
- Define serializable `BattleEvent` variants for action/item use, resource changes, damage, healing, status application/expiration, counters, defeats, turn boundaries, and battle end. Include battle/turn/operation identity and a sequence index; damage events carry actual HP loss, critical result, and hit index where applicable.
- Store the committed event batch with the same transaction as its outcome. Bound retained history, render readable log entries from those events, and consume each event ID once per presentation session. Reload reconstructs the committed state and may skip old animations; it never executes log entries as commands. Record rules/content and RNG-format versions for deterministic fixtures. A complete replay browser and cross-version replay engine are outside this change.

### XState v5 and Immer transaction contract

Use typed `setup()` in `src/runtime/machines.ts`, with `fromPromise` for the existing durable commit and `assign` to publish its successful result. Model battle routing, turn start, waiting for player, choosing enemy action, committing, presenting events, and ended/reward states. Keep formulas, status timing, and AI policy in domain functions. [XState setup](https://stately.ai/docs/setup) documents these typed sources.

1. Route from the last committed checkpoint and turn cursor. If the current turn has not started, submit a guarded begin-turn transaction that expires start-boundary effects, pays upkeep, recovers stamina, checks termination, and marks turn start complete.
2. Accept player commands only on a living player's initialized turn. An item transaction publishes its result and returns to the same turn; it does not run turn-end effects. Enemy AI chooses the same domain commands, including an optional item before its main action, from committed state.
3. Compute a main-action candidate with Immer: validate, pay once, resolve ordered effects/reactions, check defeats and termination, apply eligible owner turn-end effects, then advance the cursor if battle continues. Save the outcome, events, RNG continuation, and next turn's uninitialized marker together.
4. Publish and animate only after the write succeeds. Animation completion may release presentation pacing but cannot spend resources, resolve damage, or advance statuses. Headless and reduced-motion flows continue without renderer callbacks; interrupted animations cannot block reload recovery.
5. On write failure, discard the candidate and its events/RNG instance. Retry from the unchanged committed snapshot. On reload, route to the persisted boundary and resume only pending work; never grant recovery or enemy actions just because a machine entry action ran again.

Persist project-owned domain checkpoints, not a second XState actor snapshot. XState restoration can restart invocations, so actor persistence alone is not an exactly-once guarantee. See [XState persistence](https://stately.ai/docs/persistence).

Keep immutable inputs outside Immer recipes, with pure calculation helpers and draft-aware application helpers inside the existing outer producer. If an immutable sub-reducer uses `produce`, explicitly assign its returned state; never discard a nested producer's result. Avoid shared object aliases, live generators, actors, Maps, and renderer objects in persisted data. See [Immer produce](https://immerjs.github.io/immer/produce/) and [pitfalls](https://immerjs.github.io/immer/pitfalls/).

### pure-rand and deterministic continuation

- Expose a narrow `BattleRng` with inclusive `int(min, max)` and `chance(probability)` methods plus project-owned snapshot/restore functions. Only the adapter imports `pure-rand/generator/xoroshiro128plus` and `pure-rand/distribution/uniformInt`. The documented `uniformInt(rng, min, max)` advances its generator; create it per transaction from saved state, never as a shared singleton. See [pure-rand usage](https://github.com/dubzzz/pure-rand).
- Persist `{ formatVersion, algorithm: 'xoroshiro128plus', state }`, where `state` is a copied four-word signed 32-bit array from `getState()`. Restore with `xoroshiro128plusFromState` from the same generator subpath, after validation; reject an invalid length, out-of-range words, or all-zero state. Confirm this API against the installed release and add a known-sequence/JSON round-trip fixture. See [generator implementation](https://github.com/dubzzz/pure-rand/blob/main/src/generator/xoroshiro128plus.ts).
- Keep a battle-owned stream initialized once from the active world/RP stream at encounter creation; save both advances in that transaction. Dungeon generation and rewards use the same adapter with their own explicit stream inputs. Preserve RP isolation: a memory battle must not consume the real character's world stream.
- Migrate existing numeric world and RP RNG states deterministically into the new format. For an already-active battle, derive its initial stream from the legacy seed and stable battle identity using a documented, versioned derivation, then commit its initiative result during conversion. This is an intentional sequence change for future draws, not a promise to reproduce the old LCG sequence. Preserve generated dungeon layouts, existing loot, and committed outcomes.
- Generate initiative tie order once, using a seeded shuffle within equal-Speed groups with a stable initial actor-ID order; never call randomness from a sort comparator. Persist the final order and continuation. Define target/effect iteration order explicitly so array traversal and locale do not alter draws.
- Preserve the current critical policy of one roll per eligible target per action, shared by that target's hits. Keep Arrow Revolver's authored allocation; do not introduce new hit/miss, variance, or status-chance rolls merely because the handoff shows them. Specify consumption at probability 0/1 and lock it in fixtures.
- Previews, UI rendering, validation, and failed commands consume no authoritative draws. Previews use shared deterministic formulas and show critical possibilities rather than secretly rolling the result. Successful action events retain the resolved critical flags and amounts. Same initial snapshot, versions, and commands must yield the same final state, RNG continuation, and event sequence across reloads and failed-write retries.

### Zod 4 content and save boundaries

- Add schemas for executable skill/rank metadata, enemy profiles, consumable effects, and status definitions, using existing registries as their content source. Validate data fields once during catalog initialization/import, retaining special skill handlers in code. Original wiki snapshots and catalog-only/unverified skills remain reference data; do not invent required battle values or enable those skills.
- Use `z.discriminatedUnion` for effect/command variants, `z.infer` for schema-owned data types, finite numeric bounds, integer counters/durations, and stable nonempty IDs. Stamina and Attack costs must accept fractional values; do not copy the handoff's integer-only resource assumption. Run a separate integrity pass for duplicate IDs, missing skill/status references, supported ranks, equipment requirements, and enemy item permissions.
- Validate unknown saved input before migration using version-specific legacy shapes, then migrate and validate the complete schema-5 output before publication. Apply the same process to fallback snapshots and nested RP actors. Preserve the pre-upgrade backup and existing error/fallback behavior.
- Use complete strict schemas for current-format records and deliberate legacy schemas that retain fields migration needs. Zod objects strip unknown keys by default: never parse a partial save schema and cast its stripped output to `SaveData`. Do not use coercion, defaults, or catches to silently repair corrupt resource or RNG values. See [Zod objects, numbers, and discriminated unions](https://zod.dev/api).
- Retain existing inventory, quest, and stat validators as domain integrity checks after structural validation. Add turn-order uniqueness/references, cursor/round/turn markers, item allowance, effect timing, RNG state, and event identity checks. Validate at load/import and durable-write boundaries, not repeatedly for each hit or already-validated ability lookup.

### Vitest and fast-check

- Keep deterministic example tests in `tests/unit/`, including shared builders and fake RNGs for precise critical/no-critical outcomes. Exercise the real pure-rand adapter for seed/continuation, migrations, and persistence integration tests. Follow the existing [Vitest setup](https://vitest.dev/guide/).
- Add `*.property.test.ts` under the existing test include pattern. Use `test` and `fc` from `@fast-check/vitest`, and assertions from `vitest`; the connector supports incremental `test.prop(...)` adoption and integrates test lifecycle/timeouts. See [fast-check's Vitest guide](https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/).
- Build constrained arbitraries for valid actor states, ranks, fractional stamina, statuses, fixed queues, and bounded command sequences. Test production reducers and selectors, not reimplementations of their formulas. Generate invalid targets, stale turns, duplicate commands, and malformed saved input in dedicated rejection properties.
- Assert bounded resources, nonnegative integral damage, unchanged input snapshots, no dead actors acting, legal queue membership, at most one terminal event, and no costs/events/RNG advances on rejection. Sequence properties cover one item per turn, once-only boundaries, deterministic events, JSON save/restore equivalence, and failed-write retry equivalence.
- Bound case counts and command lengths so ordinary test runs remain useful. Preserve failing fast-check seed, shrink path, and counterexample separately from the game's RNG seed, and promote discovered failures into focused Vitest regressions. Property tests run with `test` and `test:coverage`; keep all four 90% thresholds. Test dependencies never supply runtime randomness.

## Battle rules

### Turn order and actions

- At encounter entry, calculate player **Speed = 10 + floor(DEX / 10)** using the current resolved stats and frozen run baseline.
- Initial enemy Speed: White Spider **9**, Red Spider **12**, Giant Spider **8**. Future human profiles default to **11**.
- Sort highest Speed first; break ties using seeded randomness once. Persist the resulting order.
- Every living combatant gets one turn per round. Skip defeated actors. Speed changes during battle do not reorder the queue.
- Display the order before the opening action and throughout battle, highlighting the current actor.
- Selecting menus or targets spends nothing. Confirming a valid main action pays its cost and resolves it atomically.
- Check victory and defeat after actions, reactions, and periodic effects; stop further turns immediately when battle ends.

### Player actions and progression

| Action     | Behavior                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Attack** | Uses the equipped weapon’s damage category, or unarmed melee. Combat Mastery determines its stamina cost.                        |
| **Skill**  | Uses a learned active skill with its existing rank, targeting, equipment restrictions, costs, and cooldown.                      |
| **Defend** | Uses the Defense skill’s rank-based stamina cost, Defense bonus, and Protection bonus until the start of the player’s next turn. |
| **Item**   | Uses one eligible consumable without ending the turn. Available only before the main action.                                     |

- Grant **Combat Mastery F** and **Defense F** to new characters and existing characters missing them, including the controlled actor in Aren’s memory. Preserve higher ranks.
- Keep Normal Attack’s persisted `normal` identifier, but give it no separate progression: its displayed rank and cost follow Combat Mastery.
- Normal Attack costs **2 + 0.1 × rankIndex SP**, where F is index 0 and rank 1 is index 14: **2.0–3.4 SP**.
- Every damaging Normal Attack trains Combat Mastery regardless of weapon type. Preserve existing melee training from other attacks without duplicate credit.
- Combat Mastery’s existing melee damage bonuses remain melee-only. Defense retains its existing training and AP progression.
- At the start of each player turn, recover stamina according to the frozen Combat Mastery rank:

| Ranks   | SP recovered |
| ------- | -----------: |
| F, E, D |          0.5 |
| C, B, A |          1.0 |
| 9, 8, 7 |          1.5 |
| 6, 5, 4 |          2.0 |
| 3, 2, 1 |          2.5 |

- Cap recovery at maximum stamina. Preserve fractional values; show sufficient precision in costs and resource displays.
- Apply existing cost modifiers to Attack, rounding its final cost upward to one decimal place. Preserve existing whole-number rounding for other skills.
- Remove Recover and ordinary Pass. Show **Wait** only when no legal main action is affordable. Wait is free, provides no extra recovery or defense, and ends the turn.
- Item use neither advances cooldowns nor triggers regeneration or periodic effects. A failed item use does not consume the allowance. Both inventory and battle-menu use share the same persisted allowance.

### Damage and effect timing

- Remove pip contributions, combination multipliers, weighted rolls, holds, and rerolls.
- Offensive power becomes the existing rank base plus the existing weapon/stat contribution and rank attack multiplier. Preserve current multi-hit allocation, including Arrow Revolver’s authored behavior.
- Keep mitigation, critical hits, shields, durability, training, and kill credit shared between previews and resolution.
- Healing restores `floor(rank.base × 5)` HP; Final Hit grants its rank base as the attack bonus. Counterattack uses direct skill power plus its existing opponent-attack contribution.
- Defense and unused Counterattack expire at the owner’s next turn start. Counterattack still negates and retaliates against the first eligible melee hit.
- Cooldowns and ordinary status durations advance once at the owner’s turn end, preserving the existing exclusion for the casting/application turn.
- Mana Shield lasts until the third subsequent owner turn begins, paying upkeep once at each such boundary. It never pays upkeep separately for each enemy.
- Combat Mastery recovery happens only at turn start; existing status-based regeneration remains at turn end. Neither can repeat after reload.

## Implementation changes

### Domain, enemy decisions, and runtime

- Replace the battle’s dice state with a serializable turn state: battle identity, rules/content versions, fixed actor order, captured Speed, cursor, round, unique turn ID, item-used flag, turn-start completion state, battle RNG continuation, and bounded committed events.
- Replace dice commands with typed main-action commands, battle item use, conditional Wait, and an internal enemy-turn command. Require the expected turn ID to reject stale submissions.
- Keep the existing command → XState → Immer → persistence → publication pipeline. Save each actor’s outcome and queue transition before publishing or animating it.
- Resume pending enemy turns after reload through the same guarded transaction path. A failed write leaves the previous committed turn intact.
- Replace the dice module's LCG with the pure-rand adapter and explicit stream migration described above. Update initiative, critical, dungeon, and reward callers; delete the dice module after all callers and fixtures have moved.
- Introduce enemy profiles containing Speed, resource pools, skills, cooldowns, guard strength, and optional finite consumables. Reuse shared cost, damage, status, and item-effect resolution.

**Initial enemy defaults:**

- Preserve current HP, attack, defense, rewards, and encounter composition.
- Spiders start with 20 SP, recover 0.5 SP per turn, spend 2 SP on Attack and 1 SP on Defend. Enemy Defend grants +2 Defense and +5 percentage points Protection until their next turn.
- White Spider gains Pounce: 1.25× attack. Red Spider gains Poison Bite: normal attack power plus existing poison. Giant Spider gains Armor Break: normal attack power plus the existing armor-break effect. Each costs 4 SP with a two-owner-turn cooldown.
- Move poison/armor-break application from every normal hit to these named skills.
- AI priority: use an eligible potion at or below 35% HP; then Defend at or below 25% HP unless it defended last turn; otherwise use a ready affordable skill, Attack, affordable Defend, or emergency Wait.
- Only profiles explicitly allowing items can use them, at most one before their main action. Test a human profile with one existing HP potion; do not add humans to dungeon encounters.
- Keep `src/domain/behavior.ts` focused on selecting commands from validated profiles and shared eligibility selectors. AI cannot bypass the shared engine, spend resources itself, or resolve its own damage. Persist an enemy's optional item before selecting its main action so reload respects the consumed allowance.

### Presentation

- Replace the dice panel with **Attack / Skills / Items / Defend**, a turn-order strip, target selection, action preview, and readable action log.
- Skills excludes the separate Attack and Defend entries and retains paging or scrolling.
- Show exact costs, cooldowns, disabled reasons, and “Item available” / “Item used.”
- Implement accessible React/HeroUI battle controls; retain Phaser for battlefield visuals and target highlighting. Both use the same domain selectors.
- Drive action logs, hit effects, audio, and resource feedback from committed `BattleEvent` batches. Deduplicate event IDs, clean up subscriptions, and rebuild visuals from the snapshot if animation is skipped or interrupted.
- Preserve keyboard focus, touch usability, reduced motion, window input ownership, and layouts down to 320px.
- Update Combat Mastery details with Attack cost and turn recovery; show Speed in character details.

### Save conversion and cleanup

- Upgrade schema 4 to **schema 5**, including nested RP actors and earlier supported save versions.
- Migrate numeric world/RP RNG fields, initialize active battle streams and empty event history, and validate all new fields with Zod plus domain integrity checks. Historical text logs can remain display-only; never reconstruct executable events from them.
- Preserve resources, inventory, ranks, training, enemy HP, statuses, cooldowns, rewards, quest progress, and frozen run data.
- Discard unfinished dice selections and unpaid reservations without charging or resolving them. Reopen the player’s turn with a fresh item allowance and mark turn start already complete, so neither migration nor its first reload grants recovery or charges upkeep.
- Compute the fixed order for converted battles, placing the cursor at the player and treating earlier positions as already passed for that partial round.
- Preserve already-applied effect magnitudes and remaining durations; convert temporary defenses/reactions to the new turn boundaries and remove obsolete combination fields.
- Add missing starter skills to profile and frozen run skill records. Add only their missing baseline contributions; do not rebuild the run from current profile stats or refill pools.
- Retain the pre-upgrade backup and explain the conversion through the existing migration notice.
- Remove dice commands, scoring, rank weights/pip fields, UI, tutorial text, and obsolete tests. Migration only reads/discards obsolete data; it never executes old combat.
- Update current gameplay, architecture, skill-adaptation, inventory, and verification documentation. Preserve original wiki source data.

## Implementation sequence

1. **Contracts and dependencies:** add the client dependencies, define battle commands/events and versioned RNG/turn data, and establish ownership within the existing domain/runtime folders. Verify package exports and connector compatibility without adding a package or lockfile.
2. **Headless engine:** implement the RNG adapter, pure formulas, shared validation, immutable command/effect resolution, and fixed initiative queue. Add exact gameplay examples and property invariants before attaching presentation. Preserve the critical/multi-hit policy and all balance rules above.
3. **Content and save conversion:** add Zod schemas and registry integrity checks, migrate every supported save to schema 5, and test numeric RNG conversion, frozen runs, pending old actions, RP isolation, and invalid-save fallback. Complete this before the runtime publishes new-format saves.
4. **Runtime and enemy turns:** wire the engine into the existing XState commit path, implement begin-turn/resume routing and command-producing AI, and verify retry, duplicate operation, enemy-item reload, and writer-lock behavior using persistence integration tests.
5. **Presentation and removal:** connect React/HeroUI controls and Phaser effects to committed selectors/events, replace the dice tutorial/UI, and remove obsolete dice code/tests after updating all callers. Update current documentation and verify browser journeys.
6. **Acceptance:** run the existing root Turborepo checks below, inspect failures, and record actual results. Completion requires the gameplay and library-specific cases; a headless prototype alone does not complete the rework.

## Validation and acceptance

- **Turn scheduling:** player-first/enemy-first battles, seeded ties, fixed order across rounds, dead actors skipped, counterattack kills, and immediate battle termination.
- **Economy:** every mastery rank’s Attack cost and recovery; fractional arithmetic; resource caps; Defense race/rank costs; universal mastery training; emergency Wait eligibility.
- **Items:** item then action, second item rejected through every entry point, failed use rollback, reload after use, finite human potion supply, and monsters unable to use items.
- **Effects:** identical preview/resolution calculations, single/multiple targets, critical hits, Defense expiration, Counterattack, Mana Shield upkeep, poison, regeneration, and cooldown timing.
- **Persistence:** every supported migration, unfinished old actions, frozen baselines, RP isolation, duplicate commands, reload between enemy turns, failed writes, and read-only tabs.
- **Library contracts:** pure-rand snapshot round-trips and known sequences; no RNG consumption by previews/rejections; Zod malformed content/save failures without silent data loss; Immer input immutability; XState publication only after commit; identical seeded state/events after reload/retry; fast-check counterexamples reproducible by seed/path.
- **Browser journeys:** complete dungeon and boss reward flow, all four controls, inventory integration, turn-order display, reloads, Aren’s memory, keyboard access, and narrow screens.
- Run lint, typecheck, coverage with existing 90% gates, production build, and affected browser suites. Report actual browser limitations and failures.
- No commits, pushes, or deployment. No party system, real-time gauges, dynamic initiative, or new human encounters in this change.

## Documentation verification

Library APIs were checked on **2026-09-19** using Firecrawl against the official pages linked above. New raw captures are cached under the repository's ignored `.firecrawl/` directory: `battle-xstate-setup.md`, `battle-pure-rand.md`, `battle-pure-rand-state.md`, `battle-zod-api.md`, `battle-fast-check-vitest.md`, and `battle-rot-speed.md`. Existing Firecrawl captures `xstate-persistence.md`, `immer.md`, `immer-pitfalls.md`, and `vitest.md` were also reviewed. These are research snapshots, not exact installed-version guarantees; verify APIs against the selected lockfile versions during implementation.