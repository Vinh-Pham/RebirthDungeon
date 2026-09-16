# Phase 13 evidence — Regression, balance and release candidate hardening

All records below are from fresh runs on this machine with the pinned engine.

- Engine: Godot `4.7.2.stable.official.ed1daf0bf` (matches `tools/godot-version.txt`)
- Host: macOS desktop (Apple M2 Max), headless verification plus rendered editor-runtime regression through Beckett
- Frozen candidate (asserted by automation): engine pin, schema/rules/generator/rng = 1, catalog content = 3, addon stack per `tests/unit/release_fixture.gd` FROZEN_ADDONS

## Full regression record

Command: `godot --headless --path . --script res://tests/run_tests.gd`
Retained log: [logs/runner.log](logs/runner.log), summary in [logs/tests-pass.txt](logs/tests-pass.txt).

Final state: `TEST_RESULT: PASS`, zero `SCRIPT ERROR` lines. Complete table:

| Fixture | Result |
| --- | --- |
| CATALOG | PASS (117 checks) |
| SETTINGS | PASS (23 checks) |
| RNG | PASS (397 checks) |
| PROGRESSION / QUEST ×2 / ENCHANT ×3 / REBIRTH ×2 / COMMAND | PASS (99 / 35+22 / 14+7+12 / 25+15 / 56 checks) |
| **RELEASE (new)** | **PASS (14 checks)** |
| DUNGEON ×3 | PASS (24 + 20 + 10 checks) |
| COMBAT | PASS (7,883 checks) |
| COMBAT10 / COMBAT_AI / BATTLE_UI | PASS (118 / – / 148 checks) |
| **BALANCE (new)** | **PASS (57 checks)** |
| **HARDENING (new)** | **PASS (92 checks)** |
| **MATRIX (new)** | **PASS (35 checks)** |
| SAVE / TOWN_SERVICES / SHELL / CONTENT_LOADING / EXPLORATION | PASS (97 / 64 / – / – / 95 checks) |

`tools/verify.py` gate: **BASELINE_VERIFICATION: PASS** — version, strict
import, tests-pass, intentional-negative `tests-failure` (exit 1 with FAIL
marker), runtime smoke, and all five resource-pack exclusions (883 files).
Retained: [logs/verify.txt](logs/verify.txt).

## Balance playtest record (10 scripted expeditions)

Retained table: [logs/balance-pacing.txt](logs/balance-pacing.txt).
Summary: 21 battles, 164 activations, required guardians 13/13, optional
tolls 4, deaths 4, clean exits 6.

Findings:
- Battle length: full clears take 21–25 activations (2–3 guardians); all
  21 battles terminated inside the 60-activation budget.
- Resource exhaustion: the 5-potion / 5-gold-per-potion economy binds; the
  scripted policy buys to the cap when gold allows and drinks at low HP.
- Reward pacing: pending gold per clean exit is 25–33 (authored per-encounter
  values); defeat loses exactly 30% of carried gold; free recovery restores
  the loop with no resource injection.
- Training/AP access: activation-driven training accrues at the authored
  50-per-use pace; AP remains gated on level-ups and quest rewards.
- Rebirth motivation: the 700-XP level cap is a long-horizon goal — 10 full
  clears + optional tolls produce ~1,050 raw encounter XP before quest
  rewards; with quest gold/AP and enchanting the cap arrives within a few
  further sessions, matching the Phase 9 authored 2-week cooldown economy.
- Accepted balance: the optional Twin Watch toll on the only exit path is the
  authored difficulty spike (2 enemies, 78 HP vs a rank-F starter); deaths
  cluster there by design and free recovery keeps the loop sustainable.

## Hardening record (repeated transitions, long session, upgrades)

- 12 × (TOWN→DUNGEON→MENU→LOADING→TOWN): each explicit hop publishes exactly
  once; LOADING self-advances into town; object count returns to baseline
  (drift −273, transient) with zero orphan growth.
- Long session: 30 consecutive real battles (all three encounter shapes,
  78 HP dual included) with strictly increasing revisions, stable object
  counts (drift +2), and a checkpoint round trip at the end of the run.
- Save upgrades: v1 legacy (no potions/growth/bindings) and v2
  (growth-free) checkpoints decode on the current candidate with authored
  defaults restored; the upgraded hero re-saves on the current format.

## Missing assets and load failures

- Missing required font (path remapped to a nonexistent file): actionable
  "Required resource missing" diagnostic, LOADING blocks entry, TOWN
  unreachable, and the retry after restoring the file enters town cleanly.
- Invalid catalog: unchanged from Phase 2 — precise `schema_version`
  diagnostic, no hero published, retry works (content_loading fixture).

## Automation exit-code contract

- `run_tests.gd`: exit 1 + `TEST_RESULT: FAIL` on any failed check;
  `--prove-failure` proves the failure path end-to-end.
- `tools/verify.py`: **BASELINE_VERIFICATION: PASS** (version, import,
  tests-pass, tests-failure exit 1, runtime smoke, five pack exclusions).
  Any `SCRIPT ERROR`/`ERROR` line or missing marker fails the gate — proven
  during development when a debug print's format error failed the gate.

## Known limitations (reviewed)

- Optional toll guardians sit on the only exit path; walking past them is
  not possible at authored radii. Recorded as authored difficulty; revisit
  placement if wider playtesting shows frustration.
- Screen-reader support requires explicit design + platform validation.
- Executable exports, device acceptance and representative-device profiling
  remain Phase 14 work (matching export templates still not installed).
