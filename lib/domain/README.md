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
