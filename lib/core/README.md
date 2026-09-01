# core/

Cross-cutting primitives shared by every layer: randomness, time, errors,
logging, and small utilities.

Rules:

- Pure Dart only — no Flutter, Flame, or rendering dependencies.
- No imports from `application`, `data`, `game`, `presentation`, or `app`.

Violations fail `dart run tool/check_architecture_boundaries.dart`, which runs
in CI. First contents arrive with Phase 1 (`RandomSource`, seeded randomness).
