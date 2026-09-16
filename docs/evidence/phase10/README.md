# Phase 10 evidence — Role-playing missions and advanced combat

All records below are from fresh runs on this machine with the pinned engine.

- Engine: Godot `4.7.2.stable.official.ed1daf0bf` (matches `tools/godot-version.txt`)
- Host: macOS (desktop), headless verification plus one rendered editor-session playtest
- Content/rules versions: catalog `content_version = 3` (additive Phase 10 content; no bump, per the Phase 9 structural-migration policy), `rules_version = 1` with new validated skill/status fields

## Automated verification

Command: `godot --headless --path . --script res://tests/run_tests.gd`

Final state: `TEST_RESULT: PASS` with zero `SCRIPT ERROR` lines in the log. Fixture summary:

| Fixture | Result |
| --- | --- |
| CATALOG (incl. Phase 10 content, new objective types, lessons, missions) | PASS (117 checks) |
| RNG | PASS (397 checks) |
| PROGRESSION (incl. `missions` growth field validation) | PASS (99 checks) |
| QUEST / QUEST2 (incl. `quest.rp.defender`, `quest.skill.windmill`) | PASS (35 + 22 checks) |
| ENCHANT 1–3 | PASS (14 + 7 + 12 checks) |
| REBIRTH 1–2 | PASS (25 + 15 checks) |
| COMMAND | PASS (56 checks) |
| COMBAT (7,776-hand scoring, all prior combat contracts) | PASS (7,880 checks) |
| **COMBAT10 (new Phase 10 fixture)** | **PASS (113 checks)** |
| BATTLE_UI (incl. multi-enemy HUD at compact/large scales) | PASS (148 checks) |
| SAVE (fresh-process write/resume/retry/torn/world/town ×2) | PASS (97 checks) |
| TOWN_SERVICES (incl. lessons list, mission service gating) | PASS (64 checks) |
| ADDON smoke (State Charts, LimboAI, Phantom Camera, Dialogue Manager, QuestSystem) | PASS |
| SHELL / CONTENT_LOADING / EXPLORATION | PASS |

Phase 10 coverage in `tests/unit/combat10_fixture.gd`: multi-enemy begin/order/victory, Windmill frozen target sets (living members, order, per-action training and `multi:` facts), Counterattack prepare/negate/retaliate/one-draw/expiry/training (`counter:` fact), critical math (combo replacement before protection) and chance gating (no draw at zero chance, passive-gated authored chance, one draw per valid target), Combat/Sword/Shield mastery contributions and shield gating, exactly-once passive training per action, Final Hit stored magnitude/recast lock/expiry, Charge disabled (no authored definition, injected rank cannot select), RP mission isolation (champion damage never touches the hero, borrowed skills never export, no hero training inside missions), mission commit exactly-once (ledger fact, authored gold, claim record, quest readiness), defeat leaves no evidence and the scenario retryable, multi-enemy/mission save round-trips, and legacy capture migration (missing Phase 10 fields default).

## Full verification wrapper

Command: `python3 tools/verify.py --godot "$GODOT_BIN"` — `BASELINE_VERIFICATION: PASS`

- `PASS version`, `PASS import`, `PASS tests-pass`, `PASS tests-failure` (intentional negative still fails with its marker), `PASS runtime-smoke`
- `PASS pack-0..pack-4` (macOS, Windows, Linux, Android, iOS) — each 845 files with development/demo exclusions intact (logs under `build/verification/`)

## Rendered playtest (Beckett, editor runtime)

1. Launched the main scene; resumed the retained Phase 9-era checkpoint via Continue — the migrated session exposed the new `growth.missions`, `hero.reaction` and `hero.shield_equipped` fields with correct defaults (structural v3 migration confirmed on real save data).
2. Walked to the keeper; the dialogue menu shows the new "Relive a memory" option gated on unclaimed missions.
3. Confirmed "Enter the memory": the isolated mission battle rendered with the borrowed champion panel ("Memory · Sentinel Warden") and two enemy resource blocks ("Memory Shade", "Crypt Acolyte"), header `WARDEN_TRIAL / Selection`, five dice and the standard action row. Session observation confirmed `mode = BATTLE`, `mission_id = mission.defenders_memory`, `battle.champion.definition_id = actor.warden`, and `session.hero` pools untouched.

## Post-acceptance fix (2026-09-15, same day): stuck "Save failed" in battle

A player report hit a hard-stuck `Save failed · Retry keeps the same result` screen after the enemy's first hit in the Gallery fight. Diagnosis on the real checkpoint (`user://profile/checkpoint_1.json`, seq 122) reproduced the failing candidate: the Phase 10 rewrite of the activation call had dropped the Phase 4 `source == hero` guard, so **enemy strikes wrote run training for `skill.enemy_strike` into the hero's expedition ledger**. The save validator correctly rejects training for skills the hero never learned, so every subsequent write failed and Retry re-saved the same poisoned candidate.

Fixes:

1. `battle_rules._apply` now gates every `Progression.activation` call on `source == participant(session)` — enemy and mission-champion activations never write hero progression (champions were already isolated by the null exploration check).
2. `save_codec.restore` drops run-training keys for skills the hero never learned, so already-poisoned sessions self-heal: the next Retry (or the re-fired enemy turn after a restart) saves normally with no player loss.

Regression coverage added to `tests/unit/combat10_fixture.gd` (fixture now 118 checks): enemy strikes write no hero training, the post-strike session saves, and a hand-poisoned run ledger heals on the next save/restore cycle. The exact stuck state was reproduced from the player's checkpoint before the fix (`Invalid saved state: progression or inventory`, first failure `training skill missing skill.enemy_strike`) and re-verified healing after the fix (`candidate decode: ok`).

## Notes and limitations

- The embedded editor session initially rejected `mission_enter` with `unsupported_command` because the editor process pinned pre-Phase 10 compiled scripts for `progression_rules.gd`/`command_resolver.gd`; fresh headless/CLI processes (the verification gate above) load the current scripts and pass the identical flow. Restarting the editor rebuilds its cache.
- Executable export and mobile device acceptance remain Phase 14 work; `verify.py` pack exclusions cover content packaging only.
