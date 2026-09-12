# Phase 5 verification — 2026-09-11 PDT / 2026-09-12 UTC

Host: macOS 27.0 (26A428), Apple M2 Max / arm64. Godot: **4.7.2.stable.official.ed1daf0bf**, Compatibility renderer. Catalog versions: schema 1, content 3, rules 1, generator 1, RNG 1.

Installed stack: Godot State Charts 0.22.5 with the existing Phase 1 compatibility patch; Phantom Camera 0.11.0.3; LimboAI 1.8.1; Dialogue Manager 4.1.0; QuestSystem 2.0.2; Beckett 1.15.0. No addon/vendor changes were made for this phase.

## Automated run

From the project root:

```sh
BECKETT_ENABLE=0 BECKETT_AUTO_CONFIG=0 python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

The environment flags isolate the headless verifier from the interactive Beckett editor connection.

- Exact engine version, import, positive fixtures, intentional-negative fixture (expected exit 1), and headless main-scene smoke pass.
- Catalog: 117 checks; independent RNG: 333; commands: 56; combat: 7,883; exploration: 77; battle UI: 148.
- Manual LimboAI, addon smoke, application shell and content-loading fixtures pass.
- All five resource packs pass strict exclusions: macOS, Windows Desktop, Linux, Android, iOS; 665 included files each. Docs, screenshots, tests and Beckett development resources are excluded.

Retained logs: [verification summary](verification.txt), [positive fixtures](tests-pass.log), [intentional failure](tests-failure.log), [import](import.log), [headless smoke](runtime-smoke.log), [rendered error query](rendered-log.txt), and the five \`pack-*.log\` files in this directory.

The UI fixture covers stable dice, legal actions, chart guards, repeated gestures, stale callbacks, focus-loss/deferred-command races, one owning touch across publication, drag cancellation, keyboard keep, controller focus/activation, inspection paging, safe areas, six size/text combinations including rejection feedback, all-kept reroll rejection, exact save-candidate retry, gate reconstruction, view replacement, camera priority/lifetime, independent camera tween Resources, and identical normal/reduced-motion checkpoints including RNG/operations/activation timing.

## Rendered Beckett playtest

Used Beckett's UI knowledge pack, parse-validated authoring, runtime calls, input injection, screenshots, UI audit and game logs.

Run `res://tests/fixtures/battle_preview.tscn`; it uses the real Main and battle scene inside a separate viewport with a deterministic training encounter. The fixture explicitly authorizes entry for layout tests; the existing exploration integration separately verifies guarded world entry/return.

1. Select Sword, then Roll: hand 3/4/6/3/4; two pairs, 20 pips, ×2, 50 damage preview, 5 SP reserved. Inspect at 1920×1080 and at 960×540 with 140% text and safe insets 24/10/24/10.
2. Open inspection: costs, face odds, exact effect breakdown, statuses and action reasons remain scrollable. Rendered Escape focused CloseSheet; Tab moved to PageUp; controller B closed the sheet. Automated input also proves controller A activates paging.
3. Set the development boundary to pending, then Reroll. Revision stays 6 and the original hand remains visible with mutation locked. Complete with failure: Retry appears. Retry publishes revision 7, hand 2/5/1/2/2, one reroll remaining, and unchanged reservation. [Published observation](retry-observation.json) is retained; the automated fixture compares the full candidate and RNG before/after retry.
4. Commit, observe one enemy response, select/roll/commit again: victory. Return reconstructs exploration. No runtime script errors were reported.

Screenshots:

- [Wide locked HUD](wide-locked.png)
- [960×540, 140% text, simulated safe area](compact-140-safe-locked.png)
- [Scrollable inspection and accessible paging](compact-inspection.png)
- [Pending candidate](save-pending.png)
- [Failure with Retry](save-failed.png)
- [Rejection feedback preserves the compact action area](compact-rejection.png)
- [Victory](victory.png)
- [Return to exploration](return.png)

## Audit interpretation

The retained [Beckett UI audit](ui-audit.json) is from the rendered harness at 1558×720, matched to the host viewport. It reports no offscreen controls, overlap, text overflow, zero-size controls or mouse-only buttons.

Its remaining findings were inspected against `addons/beckett/runtime/ui_inspect.gd`: four read-only ProgressBars are classified as interactive small targets; two disabled buttons (Choose skill/Roll during Locked) are included in focus reachability; the audit queries the host viewport's focus owner rather than the harness SubViewport. The inline read-only RichTextLabel was also flagged in this retained intermediate audit; final code removes it from the focus chain and exposes the same content through the paged inspection sheet. Real SubViewport focus ownership and navigation are checked by input events in the fixture and by the rendered Escape/Tab/B sequence above. An earlier audit at 1920×1080 against the smaller host viewport produced coordinate-space offscreen false positives, so the matrix uses direct logical-rectangle assertions in the owning viewport.

## Scope

This closes host battle presentation and simulated persistence behavior. It does **not** certify disk writes, crash recovery, saved settings, executable exports, signing, installation or actual Android/iOS interaction. Matching export-template and SDK/device prerequisites remain as recorded in earlier evidence. Phase 6 implements durable storage; mobile delivery acceptance remains separate.
