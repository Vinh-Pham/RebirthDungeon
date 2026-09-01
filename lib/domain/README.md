# domain/

The pure-Dart game rules: combat, dice, dungeon generation, loot,
progression, economy, and gacha. This package is the actual game and must
stay importable from any Dart host (tests, CLI simulations, a future server).

Rules:

- No Flutter, Flame, Rive, or other rendering dependencies — ever.
- No imports from `application`, `data`, `game`, `presentation`, or `app`.
- No direct I/O; engines receive abstractions (randomness, time, storage).
- All randomness is injected as a `RandomSource` (Phase 1); never call
  `Random()` inside engines. Combat and gacha always receive separate
  instances (derive per-subsystem streams with `deriveSeed`).
- Commands in, immutable state plus events out.

Violations fail `dart run tool/check_architecture_boundaries.dart`, which runs
in CI.

## Model conventions (established in Phase 1)

- State, commands, and events are immutable: freezed unions/classes for
  models with variants, plain `const` classes for small logic-bearing values.
- Commands extend `core/engine`'s `GameCommand`; events extend `GameEvent`.
  Events are facts in the past tense (`DiceRolled`, `MonsterDefeated`).
- Engines implement `DomainEngine<S, C, E>` (or expose per-command methods)
  and return `EngineResult<S, E>` — new state plus events — for every
  resolved command.
- Illegal commands throw `DomainException` carrying a `Failure`
  (`notFound`, `validation`, `invalidOperation`, `unexpected`).
- Value objects (e.g. `IntRange`) validate at construction and compare by
  value; identifiers follow the `ContentId` convention (lowercase
  snake_case) and may be wrapped in zero-cost extension types.
- Time comes from an injected `TimeSource`; generated ids from an injected
  `IdGenerator`.

## Data-driven content (Phase 2)

`content/` holds the content schemas (`HeroData`, `MonsterData`, `DieData`,
`AbilityData`, `StatusEffectData`, `ItemData`, `LootTableData`,
`DungeonData`, `BannerData`, `RarityTableData`, `ExperienceCurveData`) and
`GameContent`, which parses and validates the decoded JSON of every
`assets/data/*.json` file.

- Every file is wrapped in `{ "schemaVersion": 1, "entries": [...] }`;
  `GameContent.currentSchemaVersion` is bumped together with a migration
  path when a format changes after saves exist.
- Ids follow the `ContentId` convention; references resolve across tables;
  weights must be positive; numeric ranges are bounds-checked; banner dates
  must be ISO-8601 and ordered.
- All problems are collected into one `DomainException` whose failure
  details list every issue with a `file[index].field` path.
- `GameContent.parse` stays pure Dart — reading/decoding the asset bundle is
  the data layer's job (wired up in Phase 5).

## Dice combat (Phase 3)

`combat/` holds the headless dice combat engine built on the Phase 1
contracts.

- `CombatState` (combatants, dice pool, statuses, turn, phase) is immutable
  and fully serializable for run snapshots; the combat RNG is *not* part of
  the state — the engine receives a combat-channel `RandomSource`
  (`deriveSeed(runSeed, 'combat')`).
- Commands: `StartCombat`, `RollDice`, `RerollDice` (once per turn),
  `AssignDieToAbility`, `UseAbility`, `EndTurn`, `EnemyAct` (one per acting
  enemy during `enemyTurn`).
- Damage = `power roll + effective attack` (attack + buff potencies); any
  consumed die on its max face crits (doubles). Mitigation: defense first
  (min 1 remains), shield absorbs before HP.
- Debuffs tick their potency at the start of the bearer's turn (bypassing
  defense/shield); buffs add potency to attack; effects expire after their
  duration. Abilities with a `statusId` apply that status as a rider;
  reapplication keeps the higher potency and longer duration.
- Enemies act deterministically: strongest ability by
  `(power.max, power.min, id)` descending, else a basic strike derived from
  the monster's attack stat.
- Illegal commands throw `DomainException` before any randomness is
  consumed.

## Dungeon runs (Phase 4)

`dungeon/` holds seeded procedural generation and the run model on top of
the combat engine.

- `generateDungeonFloor` grows a room tree on a grid (every room reachable
  from the entry, doors reciprocal), puts the boss in the room farthest
  from the entry, assigns kinds (combat/treasure/event) to middle rooms,
  and pre-rolls encounters (from the monster pool) and treasure (weighted
  picks from the dungeon's loot table). Same seed → same floor.
- `DungeonRunState` is immutable and fully serializable (run snapshots,
  Phase 8): root seed, hero HP between combats, current floor's rooms,
  collected loot, and the active `CombatState` if any. Subsystems derive
  their RNG streams from the root seed (`dungeon`, `loot`, `combat`).
- `RunEngine` commands: `StartRun`, `EnterRoom` (combat/boss rooms start a
  blocking combat, treasure grants pre-rolled loot, event rooms are shrines
  healing 30% of max HP), `CombatAction` (bridges a `CombatCommand` into
  the active combat; victory clears the room, defeat fails the run), and
  `Descend` (after the boss: next floor, or run victory on the last floor).
- Hand-authored room templates are intentionally deferred — the prototype
  generates all rooms procedurally; `DungeonData` can carry template
  references later without changing the run model.
