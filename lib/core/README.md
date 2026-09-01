# core/

Cross-cutting primitives shared by every layer. Pure Dart only — no Flutter,
Flame, or rendering dependencies, and no imports from `application`, `data`,
`game`, `presentation`, or `app`. Violations fail
`dart run tool/check_architecture_boundaries.dart`, which runs in CI.

Contents (Phase 1):

- `random/` — `RandomSource` abstraction, `SeededRandomSource`
  (deterministic), `FakeRandomSource` (test double with queued exact
  values), and `deriveSeed` for splitting one run seed into independent
  subsystem streams (`combat`, `gacha`, ...).
- `time/` — `TimeSource` abstraction with `SystemTimeSource` and a
  controllable `FakeTimeSource`.
- `ids/` — `IdGenerator` abstraction (`SystemIdGenerator`,
  `FakeIdGenerator`) and the shared content-id convention
  (`ContentId`, `isValidContentId`).
- `errors/` — the `Failure` union and `DomainException`, the only exception
  type domain code throws.
- `engine/` — the command/result/event pattern: `GameCommand`, `GameEvent`,
  `EngineResult`, `DomainEngine`.
- `value_objects/` — small validated immutable values shared across engines,
  e.g. `IntRange`.
