# Phase 9 evidence

**Date:** 2026-09-15 · **Host:** macOS (Apple Silicon), desktop build · **Engine:** Godot `4.7.2.stable.official.ed1daf0bf` (pinned, verified by the runner and content validation) · **Addon versions:** Godot State Charts 0.22.5 (+ local compatibility patch), LimboAI v1.8.1 GDExtension, Phantom Camera 0.11.0.3, Dialogue Manager 4.1.0, QuestSystem 2.0.2, Beckett 1.15.0 · **Content:** catalog content version 3, progression contract version 2 (growth schema), RNG contract version 1 with the added derived `enchant` stream.

## Commands

```sh
export GODOT_BIN=/Applications/Godot.app/Contents/MacOS/Godot
"$GODOT_BIN" --headless --path . --editor --import
"$GODOT_BIN" --headless --path . --script res://tests/run_tests.gd
python3 tools/verify.py --godot "$GODOT_BIN"
```

## Scope verified

- **QuestSystem integration (first consuming phase per [addon ownership](../../project-phases.md#addon-ownership-and-delivery-order)):** game-owned `DomainQuest` subclass and `scripts/application/quest_adapter.gd` mirror committed `hero.growth.quests` into the QuestSystem available/active/completed pools after published checkpoints only; pool state was asserted by numeric id from a fresh Godot process (`QUEST_FRESH_PROCESS`/`QUEST_POOLS` in the runner log), including reconstruction without replaying rewards, locked quests absent from every pool, and per-session pool resets without instance leakage.
- **Quest slice:** mainstream Chapter 1 chain (`quest.main.seal` → `quest.main.expedition`), keeper hand-in sidequest (`quest.side.record` with `item.focus_book` hand-in and `title.scribe` reward), NPC-offered `Words of Focus` skill unlock, auto rank-milestone (`quest.skill.focus_milestone`, Focus rank E), great-sword equipment trigger and magic-talent rebirth trigger skill quests.
- **Evidence policy:** pending run facts stay in `exploration.progression.facts`; a successful exit merges them into the committed global ledger (`hero.growth.ledger`) exactly once; defeat/abandonment discard them. Changed inventory invalidates hand-in readiness; claims revalidate, consume, grant, record the claim operation id, unlock successors and refresh pools in one transaction. Plugin completion signals grant nothing.
- **Enchants:** prefix/suffix application with scroll+powder+MP costs on success and failure, variable rolls inside authored ranges, replacement preserving the opposite slot, overflow/missing-material rejections preserving state and RNG, destructive burning with independent per-slot recovery (full/zero windows), empty slots never drawing, output-space abort keeping state and RNG identical, locked equipment refusing to burn, and a dedicated `enchant` RNG stream whose continuation is identical across an encode/decode round trip.
- **Aging and rebirth:** town-boundary reconciliation with a one-AP-per-year watermark, backward-clock immunity, maximum-age clamp, legacy heroes keeping their age with an unanchored clock; rebirth gates (level cap, 50 carried gold, 2-week cooldown, ages 10–17), retained ranks/cumulative/titles/quests versus reset level/XP/life growth, `title.reborn` on first rebirth, and conditional enchant clauses re-evaluated after a talent switch.
- **Save compatibility:** Phase 8 v3 checkpoints migrate structurally (growth v2 fields, item enchants, run facts, `clock_week`, four-stream RNG captures deriving the `enchant` stream) with no content-version bump; enchanted items and claimed quest records survive encode/decode exactly.
- **Dialogue:** keeper menu gains an evidence-gated work branch; offers and hand-ins confirm through the game-owned balloon and commit through validated commands only.

## Results

- Full runner: `TEST_RESULT: PASS` — all pre-existing suites (catalog, RNG, progression, command, combat 7,883 checks, combat AI, battle UI, save, town services, progression integration, addon, shell, content loading, exploration) plus the new quest/enchant/rebirth fixtures and `QUEST_INTEGRATION` pass; two fresh-process quest scenarios (`tests/fixtures/quest_process.gd`) reconstruct identical quest state and QuestSystem pools from the combined save without replaying rewards. The intentional `--prove-failure` negative run still fails with its expected marker.
- `tools/verify.py`: clean import, runtime smoke, positive/negative fixtures, and resource-pack exclusions for all five presets (log retained under `build/verification/`).

## Outstanding

- Beckett rendered playtesting of the new journal, enchant workbench and rebirth controls (focus order, long text, reduced motion) — same caveat recorded for Phase 8's panels.
- Executable export and Android/iOS device acceptance remain blocked by absent matching templates (Phase 0/1 prerequisite record), unchanged by this phase.
- Repeatable/daily quests, RP missions, Master Titles and broader enchant economies stay deferred to their phases.
