# Phase 11 evidence — Procedural dungeons and content expansion

All records below are from fresh runs on this machine with the pinned engine.

- Engine: Godot `4.7.2.stable.official.ed1daf0bf` (matches `tools/godot-version.txt`)
- Host: macOS (desktop), headless verification plus rendered editor-session playtests driven through Beckett
- Content versions: catalog `content_version = 3` unchanged (additive Phase 11 content, per the Phase 9 structural-migration policy); generator tables validated at publication with `generator_version = 1`

## Automated verification

Command: `godot --headless --path . --script res://tests/run_tests.gd`
Retained log: [logs/runner.log](logs/runner.log), summary in [logs/tests-pass.txt](logs/tests-pass.txt).

Final state: `TEST_RESULT: PASS`, zero `SCRIPT ERROR` lines. Fixture highlights:

| Fixture | Result |
| --- | --- |
| CATALOG (incl. new `dungeons` group, connector validation, fallback proof) | PASS (117 checks) |
| RNG | PASS (397 checks) |
| **DUNGEON (new Phase 11 fixture: determinism, 120-seed sweep, attempt budget/fallback, validator negatives, resolver RNG isolation, session-identity seeds, drop tables, exit gate, codec round trips, legacy migration)** | **PASS (20 + 10 checks)** |
| COMBAT (all prior combat contracts, drops call sites) | PASS (7,883 checks) |
| COMBAT10 / BATTLE_UI / SAVE / TOWN_SERVICES | PASS (118 / 148 / 97 / 64 checks) |
| SHELL / CONTENT_LOADING / ADDON smoke | PASS |
| EXPLORATION (binding-driven generated-dungeon sweep) | PASS |

The full `tools/verify.py` wrapper passes: pinned-version check, strict import,
positive and intentional-negative fixtures, headless runtime smoke and all five
resource-pack exclusion reports.

## New Phase 11 fixture coverage (tests/unit/dungeon_fixture.gd)

- Determinism: same seed and session identity reproduce one layout; seed sweep
  of 120 seeds validates every layout and exercises both pacing lengths, all
  pool rooms (gallery, nave, oratory, crypt, hall) and optional-presence variety.
- Attempt budget: a hostile mid pool exhausts 24 attempts and returns the
  known-valid fallback `[threshold, gallery, nave, sanctum]` with the requested
  run seed preserved; unsatisfiable tables report an explicit generator error.
- Validator negatives: overlap, off-template positions, unresolved/duplicate
  rooms, exit access, missing/duplicate/unhosted/foreign bindings, minimum
  depth, run-seed range, world and layout-id mismatches each produce errors.
- Resolver: generation draws only on the accepted candidate (rejected entries
  leave session RNG unchanged), entry records `undercrypt.g1`, re-resolution is
  pure, session identity varies the run seed.
- Loot: required drops grant in authored order with zero RNG; bonus drops
  follow the pinned chance→quantity draw order on the independent loot stream
  (final stream state asserted against an independent probe).
- Exit gate: one outstanding guardian seals the exit; optional guardians never
  block; migrated authored expeditions keep their exit condition.
- Persistence: generated layouts survive the in-memory checkpoint and the disk
  codec byte-for-byte; overlapping, foreign-bound and over-discovered payloads
  are rejected; pre-Phase-11 captures migrate to authored bindings/exit/seed.

## Rendered playtest (Beckett, editor runtime)

1. Resumed a pre-Phase-11 checkpoint from `user://profile`: the codec migrated
   the authored layout in place (bindings, exit room, zero seed) and the world
   rebuilt the authored chain with the vault exit; the dangling finished battle
   from the old save stayed legal.
2. Abandoned that run through the real Dialogue Manager confirm flow, returned
   to Haven through results, approached the entrance arch and confirmed
   "Enter the Undercrypt" through the service-confirm step.
3. The resolver generated a fresh five-room expedition
   `threshold → oratory → crypt → hall → sanctum` with gallery (required) bound
   to the oratory, sanctum (required) to the crypt and the optional Twin Watch
   in the pillared hall — recorded in [generated-entry.png](generated-entry.png).
4. Triggered a movement checkpoint, stopped the process, relaunched, chose
   Continue: the same generated layout was restored from disk unchanged, with
   discovery and position intact — recorded in
   [generated-restored.png](generated-restored.png). Game logs held no errors.

## Known gaps (unchanged scope)

- Executable exports and device acceptance remain Phase 14 prerequisites.
- Floors, additional towns, gathering and cooking stay excluded until authored
  consuming rules exist (recorded disposition in the phase checklist).
