# Phase 12 evidence — Presentation, accessibility and performance

All records below are from fresh runs on this machine with the pinned engine.

- Engine: Godot `4.7.2.stable.official.ed1daf0bf` (matches `tools/godot-version.txt`)
- Host: macOS desktop (Apple M2 Max), Compatibility renderer, headless verification plus rendered editor-runtime playtests through Beckett
- Content versions: catalog `content_version = 3` unchanged (presentation-only phase); new assets are repository-generated (see `assets/audio/ATTRIBUTION.md`)

## Automated verification

Command: `godot --headless --path . --script res://tests/run_tests.gd`
Retained log: [logs/runner.log](logs/runner.log), summary in [logs/tests-pass.txt](logs/tests-pass.txt).

Final state: `TEST_RESULT: PASS`, zero `SCRIPT ERROR` lines. Highlights:

| Fixture | Result |
| --- | --- |
| **SETTINGS (new Phase 12 fixture)** | **PASS (23 checks)** |
| SHELL (updated release-gating contract) | PASS |
| CATALOG / RNG / PROGRESSION / QUEST / ENCHANT / REBIRTH / COMMAND | PASS (117 / 397 / 99 / 35+22 / 14+7+12 / 25+15 / 56 checks) |
| DUNGEON (Phase 11 regressions) | PASS (24 + 20 + 10 checks) |
| COMBAT / COMBAT10 / BATTLE_UI | PASS (7,883 / 118 / 148 checks) |
| SAVE / TOWN_SERVICES / ADDON smoke / CONTENT_LOADING / EXPLORATION | PASS (97 / 64 / – / – / 95 checks) |

The full `tools/verify.py` wrapper passes: pinned version, strict import,
positive and intentional-negative fixtures, headless runtime smoke and all
five resource-pack exclusions (the nine WAV files ship in every pack).

## New settings fixture coverage (tests/unit/settings_fixture.gd)

- Defaults: audio levels, accessibility values, WASD+arrow bindings.
- Round trip through `user://settings.cfg` for every field, including a
  rebinding that keeps the authored key beside the added one.
- Corrupt values (wrong types, out-of-range numbers, malformed arrays) fall
  back or clamp per field; nothing crashes or adopts hostile values.
- `AudioServer` application: bus volume follows the service, zero mutes.
- InputMap application: listed keys are added while authored keys and
  joystick bindings survive; Reset restores the authored defaults.

## Rendered verification (Beckett, editor runtime)

1. Title screen exposes Start Game and Settings
   ([settings-panel.png](settings-panel.png) shows the full panel: audio
   sliders, reduced motion, text size, key rebinding, reset and back).
2. Toggling reduced motion persists to `user://settings.cfg` and applies
   live: exploration camera damping, encounter-marker pulses and the hero
   walk bob all honor the flag; the battle stage runs its reduced path.
3. Battle text scale stepped to the 1.4 maximum through the battle's own
   controls — persisted through settings and restored on later battle views
   ([battle-130.png](battle-130.png) shows the 140% HUD).
4. Audio: the town pad plays on the Music bus during menu/town; dice/hit/
   sting effects route through the six-voice SFX pool (voices observed with
   the correct streams and bus assignments after accepted events).
5. Reduced motion (persisted from step 2) was active for the whole run.

## Measured performance (editor runtime, desktop budget 60 FPS)

Beckett performance monitors, 4–5 s windows, generated five-room dungeon
resumed from a real saved run (`run_seed` 233521):

| Scenario | FPS | Draw calls | Process time | Static memory | Orphans |
| --- | --- | --- | --- | --- | --- |
| Dungeon idle | 60 (min 60) | 25 | 17.4 ms avg | 73 MB | 0 |
| Traversal with discoveries (nodes 201→219) | 60 (min 60) | 25→52 | 32 ms avg, 61 ms p95 | 76–81 MB | 0 |
| Battle idle (pre-roll) | 60 (min 60) | 52 | 17.6 ms avg | 81 MB | 0 |

Physics p95 0.13 ms (navigation resync on discovery). No orphan node growth
in any window; video memory ~72–75 MB. All scenarios hold the 60 FPS budget
with large headroom on draw calls; no optimization was required or applied.
Mobile/representative-device measurement remains Phase 14 work.

## Known gaps (unchanged scope)

- Screen-reader support requires explicit design and platform validation
  (per the UI plan, rendered controls alone are not acceptance evidence).
- Representative mobile-device performance and safe-area physical checks
  remain Phase 14 acceptance work.
