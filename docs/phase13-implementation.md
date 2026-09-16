# Phase 13: Regression, balance and release candidate hardening

Status: **Complete for host acceptance (2026-09-15).** Dependencies: 8, 9, 10, 11, 12.

## Candidate freeze

`tests/unit/release_fixture.gd` asserts the frozen release-candidate manifest
so any drift fails automation:

- Engine pin `4.7.2.stable.official.ed1daf0bf` equals the running editor.
- `RuleLimits` SCHEMA/RULES/GENERATOR/RNG all frozen at 1; catalog content
  frozen at 3 (phase 8–13 additions were structurally compatible, so no
  content bump was required).
- Addon stack frozen and parsed from the vendored version files at test time:
  State Charts 0.22.5 (+ local patch), LimboAI v1.8.1, Dialogue Manager 4.1.0,
  QuestSystem 2.0.2, Phantom Camera 0.11.0.3, Beckett 1.15.0.
- The runner keeps its `--prove-failure` switch with a nonzero exit;
  `tools/verify.py`'s `tests-failure` step proves it end-to-end.

Automation failures propagate: `verify.py` treats any nonzero exit, any
`SCRIPT ERROR`/`ERROR` line, or a missing `TEST_RESULT: PASS` marker as a
gate failure. This guard is proven, not assumed — during development a stray
debug print in the balance fixture failed the gate until removed.

## Regression suites

All 24 prior fixture suites pass unchanged alongside three new ones:

- **Balance (57 checks):** 10 scripted expeditions through the real resolver
  measure battle length (21 battles, all inside the 60-activation budget),
  resource exhaustion (5-potion cap consumed at 5 gold each from carried
  gold), reward pacing (exact pending-gold accounting per run; 30% carried
  loss on defeat), training/AP access, and the rebirth horizon (level cap =
  700 cumulative XP by the authored table — a long-horizon goal consistent
  with the Phase 9 50-gold + cooldown economy).
- **Hardening (92 checks):** missing asset → actionable "Required resource
  missing" diagnostic with blocked entry and clean retry; 12 repeated guarded
  transition cycles publishing exactly once each with object-count baseline
  restored; a 30-battle long session with strictly-accounted revisions and a
  checkpoint round trip at the end; the supported save upgrade chain (v1
  legacy checkpoint → current format → upgraded hero re-save; growth-free v2
  hero stays growth-free).
- **Matrix (35 checks):** the frozen-stack integration matrix — chart
  re-entry cycles, manual AI scheduling determinism (isolated enemy-turn
  probe immune to Main's scheduler race), conversation camera handoff
  (priority 30 over exploration, restored on close), dialogue mutation retry
  (stale serial rejected, exactly-once purchase), quest accept → checkpoint
  round trip → QuestSystem active-pool mirror, and autoload teardown
  cleanliness (QuestSystem pools empty, Phantom Camera registrations empty).

Existing suites continue to cover content validation, exhaustive 7,776-hand
scoring, save fault injection (open/truncate/readback/after-write × retry),
and progression regression (quests, enchants, rebirth, generated dungeons).

## Missing assets, load failures, long sessions

- Missing required file (font remapped to a nonexistent path): actionable
  "Required resource missing" diagnostic, entry blocked in LOADING, town
  unreachable; restoring the file retries cleanly (hardening fixture).
- Invalid catalog: precise `schema_version` diagnostic, no hero published,
  town unreachable, corrected-catalog retry initializes exactly one hero
  (content_loading fixture, still passing).
- Long sessions: 30 consecutive real battles plus 36 guarded mode
  transitions with zero orphan growth and object-count baseline restored.
- Save upgrades: v1 legacy checkpoints decode with authored bindings
  restored and no invented progression; upgraded heroes re-save cleanly.

## Balance findings (accepted)

Scripted competent play over 10 expeditions (21 battles, 164 activations):
- Required guardians: 13/13 won — the authored rank-F difficulty is beatable
  with the starter kit.
- The optional Twin Watch toll (2 enemies, 78 HP) adds real risk: 4 of the
  10 runs died there. This is the authored difficulty spike; free recovery
  keeps the loop sustainable and the required path stays beatable.
- Full clears take 21–25 activations; pending gold per clear is 25–33.
- The 5-potion cap costs 25 gold — affordable from the second clear onward.
- Rebirth (level cap 700 XP + 50 gold + cooldown) is a long-horizon goal,
  matching the authored motivation design.

## Feature matrix and known limitations

| Feature | Status |
| --- | --- |
| Guarded State Charts shell, mode chart, input ownership | Verified (1, 13 matrix) |
| Movement, discovery, generated dungeons, encounter tolls | Verified (3, 11, 13) |
| Five-dice combat, multi-enemy, reactions, criticals, masteries | Verified (4, 10) |
| Durable two-slot saves, fault injection, interrupted recovery | Verified (6, 13) |
| Inventory, skills, titles, XP | Verified (8, 13) |
| Quests, enchanting, rebirth, aging | Verified (9, 13) |
| Procedural generation, persisted layouts, tolls | Verified (11, 13) |
| Settings, audio, reduced motion, text scale, rebinding | Verified (12, 13) |
| Regression, balance, freeze, integration matrix | Verified (13) |
| Master Titles | Deferred (no reachable Rank-1 objective) |
| Charge | Disabled (no authored definition) |
| Floors/towns/gathering/cooking | Excluded (no consuming rules) |
| Screen readers | Explicit design + platform validation required |
| Android/iOS device acceptance | Phase 14 (templates not installed) |

## Engine references

Audio bus routing and InputMap runtime rebinding follow the official docs
retained at `.firecrawl/godot-audio-buses.md` and
`.firecrawl/godot-inputmap.md`; save-schema upgrade behavior follows
`.firecrawl/godot-saving.md`.

## Verification

See [evidence](evidence/phase13/README.md): full runner pass with zero script
errors across 28 fixture suites, complete `tools/verify.py` gate (import,
positive/negative, runtime smoke, five packs), and the rendered settings +
loop regression.
