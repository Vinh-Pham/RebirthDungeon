# domain/

The pure-Dart game rules: combat, dice, dungeon generation, loot,
progression, economy, and gacha. This package is the actual game and must
stay importable from any Dart host (tests, CLI simulations, a future server).

Rules:

- No Flutter, Flame, Rive, or other rendering dependencies — ever.
- No imports from `application`, `data`, `game`, `presentation`, or `app`.
- No direct I/O; engines receive abstractions (randomness, time, storage).
- All randomness is injected as a `RandomSource` (Phase 1); never call
  `Random()` inside engines.
- Commands in, immutable state plus events out.

Violations fail `dart run tool/check_architecture_boundaries.dart`, which runs
in CI.
