# Phase 6 evidence — 2026-09-12

Host: macOS 27.0 (26A428), Apple M2 Max arm64. Godot **4.7.2.stable.official.ed1daf0bf**, Compatibility renderer. Verification concluded after 07:01 UTC / 00:01 PDT. Content 3; schema/rules/generator/RNG 1; disk envelope `rebirth.session.v1`.

Addons retained: State Charts 0.22.5 with the existing Phase 1 compatibility patch, Phantom Camera 0.11.0.3, LimboAI 1.8.1, Dialogue Manager 4.1.0, QuestSystem 2.0.2 and Beckett 1.15.0. No vendor changes.

## Commands and results

```sh
BECKETT_ENABLE=0 BECKETT_AUTO_CONFIG=0 python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

The final run passes exact-version/import checks, positive fixtures, the intentional-negative fixture, headless main-scene smoke and all five resource-pack exclusion checks. Each macOS, Windows Desktop, Linux, Android and iOS pack contains 671 files; tests, docs, screenshots and development tools remain excluded.

Fixture counts: catalog 117, RNG 333, commands 56, combat 7,883, battle UI 148, persistence 96, exploration 77. Addon, manual AI, shell and content-loading integration also pass.

The 96 persistence checks include:

- Exact 64-bit IDs/sequences and full checkpoint/RNG continuation; duplicate operation rejection after restore.
- Malformed fields, wrong types, dice/kept/cost errors, unknown references, invalid RNG, nonfinite coordinates, unsupported versions, altered layouts, impossible mode/disposition and reward records.
- Both slot selection, open/truncate/read-back/post-write failure, original-slot retention, exact candidate retry, explicit fallback recovery and preserved archives.
- Real Main restore, chart/camera reconstruction, save-before-publication, focus suspension, periodic input preservation and authored exploration continuation.
- Failed town/dungeon/battle entry, failed victory/return/run exit, atomic gold transfers and duplicate Retry.
- Twelve independent Godot processes: write/resume for a locked hand, enemy turn/status, torn write, interruption after writing, dungeon position/discovery/layout and town position. The resume process compares the resulting checkpoint to uninterrupted continuation; the enemy case also requests scheduling repeatedly and verifies no second action.

Run only the persistence suite with:

```sh
BECKETT_ENABLE=0 BECKETT_AUTO_CONFIG=0 /Applications/Godot.app/Contents/MacOS/Godot --headless --path . --script res://tests/fixtures/save_runner.gd
```

Retained logs: [summary](verification.txt), [fixtures and fresh-process markers](tests-pass.log), [intentional failure](tests-failure.log), [import](import.log), [runtime smoke](runtime-smoke.log), and the five `pack-*.log` / `assets-*.txt` files here.

## Beckett rendered verification

Used Beckett's save/load knowledge pack, class inspection, parse-validated script authoring, runtime calls, button activation, actual game restart, screenshots and runtime error queries. The isolated preview harness uses `user://phase6-rendered`; the normal profile was not used for fault injection.

1. Seed a Fortify locked-hand fixture, then choose Continue: hand 3/4/6/3/4, first die kept, 4 SP reserved.
2. Inject an open failure and request Reroll: source revision remains 3, disk sequence remains 1 and the original hand remains visible. Mutation controls are disabled; Retry remains available.
3. Retry: revision becomes 4, sequence 2, hand 3/2/5/1/2. Stop the game, launch a new process and Continue: the same hand, kept flag and remaining reroll budget return.
4. Seed a torn newer slot: recovery explicitly offers the verified predecessor. Use verified checkpoint succeeds while archiving the original slot bytes.
5. Seed unsupported rules and then a corrupt sole slot: both show a blocking recovery message with Retry loading. Neither starts a new session or overwrites the files.
6. Final game error query reports no runtime errors.

Artifacts:

- [Continue](continue.png)
- [Write failure and Retry](write-failed.png)
- [Hand after a real restart](restarted-hand.png)
- [Verified fallback recovery](recovery.png)
- [Incompatible rules](incompatible.png)
- [Corrupt checkpoint](corrupt.png)
- [Restart state](restart-state.json)
- [Runtime error query](rendered-log.json)

See [implementation and storage contract](../../phase6-implementation.md). Executable exports, matching templates/SDK/signing prerequisites, mobile installation and hardware power-loss guarantees are not established by resource-pack or host-process tests.
