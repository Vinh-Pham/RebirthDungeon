# Phase 8 evidence — 2026-09-12

Host: macOS arm64, Godot `4.7.2.stable.official.ed1daf0bf`. Beckett MCP authored/validated scripts and drove the rendered acceptance. No new art was required.

## Automated acceptance

Run `BECKETT_ENABLE=0 BECKETT_AUTO_CONFIG=0 python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot`.

[Verification summary](verification.log), [full suite](tests-pass.log), [focused final progression run](progression-focused.log), [intentional failure](tests-failure.log), [import](import.log), [version](version.log) and [runtime](runtime-smoke.log) retain the acceptance output. The final focused run passes 99 unit and 13 application checks after the last focus-chain adjustment.

The retained logs cover pinned version, import, positive suite, intentional failing suite, runtime smoke and all five resource-pack exclusions. The progression unit fixture includes 99 checks; the application integration fixture verifies checkpoint failure/retry, stale callbacks, focus dismissal and three fresh-process continuations, including a locked inventory-backed hand. Earlier phase fixtures explicitly retain their legacy-economy setup so they continue testing the original compatibility contract.

Coverage includes lessons and complete/assembled books, duplicate pages/learning, one-rank AP spending, source/mastery changes, no refill, rectangular rejection, bag nesting, protected sales, split/gather conservation, bank capacity, pending training/XP, deduplicated encounter evidence, successful/failure reconciliation, title slots, overflow save/withdrawal, malformed saved containers/provenance, v2 locked-hand migration and idempotent town conversion.

## Rendered Beckett acceptance

The isolated `tests/fixtures/progression_preview.tscn` uses its own save folder. Only its seed fixture supplies a known legacy balance and potions. Navigation, keeper services, combat, return and rank/title changes travel through normal application commands and durable checkpoints.

1. Resume the migrated fixture with 200 banked gold and three physical potions.
2. Approach the keeper, traverse the actual Dialogue Manager service cue, withdraw 100 and purchase an Iron sword for 20. Equip it; Strength changes from 3 to 6 without healing.
3. Enter the Undercrypt, navigate revealed rooms, use Fortify/Sword with the normal five-dice resolver and manually scheduled enemy AI, and defeat both sentinels. Fortify and Sword training remain pending during the expedition.
4. Exit commits 25 gold, 150 XP, level 2, 1 AP, both Focus pages and the two clear titles. Carried gold becomes 105; bank remains 100.
5. Return to town; explicitly rank Sword F → E, consuming 100 training and 1 AP. Stop and restart the play process, Continue, and verify E / training 0 / AP 0.
6. Equip First Delver. Maximum HP increases 32 → 42 while current HP remains 25. Character shows the separate growth, rank, mastery, equipment and title sources.

Screenshots: [bank](bank.png), [purchase preview](purchase-preview.png), [clear](clear.png), [rank preview](rank-preview.png), [ranked](ranked.png), [fresh-process rank](resumed-rank.png), [title/stat sources](title-sources.png). The earlier purchase/clear images predate the final confirmation placement and richer Results wording; later images show the final progression panel layout.

Rendered verification exposed a resize callback reaching a detached world and synchronous Results navigation invalidating Beckett's clicked node. The final code guards camera resize after removal and defers mode-button callbacks. A clean restarted session exercised the final rank/title panels with no runtime error entries.

Resource-pack checks are not executable exports or device acceptance. Matching export templates, Android/iOS SDK/signing and physical-device verification remain the previously documented platform gaps. No mobile-runtime acceptance is claimed.
