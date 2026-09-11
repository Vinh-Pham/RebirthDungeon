# Phase 2 verification — 2026-09-11

Host: macOS 27.0 (26A428), arm64, Apple M2 Max. Engine: **4.7.2.stable.official.ed1daf0bf**, full commit `ed1daf0bf001b61586d9930840f2f1394092c079`. Renderer: Compatibility. Beckett: **1.15.0 Full**. Existing qualified addon versions are unchanged: State Charts 0.22.5 with its existing compatibility patch, LimboAI 1.8.1, Phantom Camera 0.11.0.3, Dialogue Manager 4.1.0, QuestSystem 2.0.2. No vendor code or addon configuration was changed in Phase 2.

Schema/content/rules/generator/RNG versions: **1 / 1 / 1 / 1 / 1**. Content is explicitly provisional foundation data; this record does not certify combat, progression, disk saves or mobile devices.

## Automated checks

From `/Users/vinhpham/Projects/RebirthDungeon` (the active Beckett editor project):

```sh
python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

The wrapper checks the engine pin, clean error output, expected exit codes and fixture markers. The negative fixture must produce its intended failures rather than merely crash. [verification.log](verification.log) retains the aggregate result; individual logs retain exact commands and outputs.

| Check | Result | Evidence |
| --- | --- | --- |
| Engine pin / import | Pass, exit 0 | [version.log](version.log), [import.log](import.log) |
| Catalog fixtures | 105 checks: valid publication, 46 invalid mutations, null/file diagnostics, publication/lookup isolation and arithmetic | [tests-pass.log](tests-pass.log) |
| RNG fixtures | 333 checks: independent SHA-256 seed vectors, stream independence, continuation, JSON exactness, atomic invalid restore, unbiased/weighted boundaries, subset validation and finite exhaustion | [tests-pass.log](tests-pass.log) |
| Command/state fixtures | 56 checks: independent pools/training/items/statuses/battle/RNG, deterministic candidates, invalid and duplicate commands, copied results | [tests-pass.log](tests-pass.log) |
| Content loading integration | Invalid content blocks hero/town; repair/retry works; reload does not refill; accepted events publish once; malformed/duplicate/reentrant intents reject | [tests-pass.log](tests-pass.log) |
| Existing addon, shell and layout fixtures | Pass | [tests-pass.log](tests-pass.log) |
| Intentional negative baseline | Exit 1 with expected fixture failures | [tests-failure.log](tests-failure.log) |
| Headless main-scene runtime smoke | Pass, exit 0, no script/engine errors | [runtime-smoke.log](runtime-smoke.log) |
| All five resource packs | Pass; 574 files per target, authored content retained and development assets excluded | `pack-0.log` through `pack-4.log`; `assets-0.txt` through `assets-4.txt` |
| Fresh-copy full verification | Pass without prior .godot/import/UID cache | [clean-verification.log](clean-verification.log), [clean-logs](clean-logs/) |

Fresh-copy procedure: copy the project into a temporary directory, excluding `.git`, `.godot`, `build`, `.firecrawl`, `.beckett`, `.cursor`, `.vscode`, `.mcp.json` and Python caches; run the same verifier there; retain logs/manifests before removing the temporary copy. The fresh-copy wrapper also checks that each authored `content/**/*.tres` exists in every exported pack, either directly or through a compiled-resource remap.

Pack indices are macOS, Windows Desktop, Linux, Android and iOS. Generated ZIPs remain under ignored `build/verification/`; manifests are retained here. Resource-pack success is not executable export or device acceptance. Previously recorded template/SDK/signing prerequisites remain separate.

## Beckett rendered verification

1. `play_scene` the normal main scene, wait for `game_connected`, and use `simulate_input` with `ui_accept` pressed then released.
2. Confirm the valid catalog reaches Town, revision 2, and the UI still labels it a development navigation fixture. Observe the live UI and game logs.
3. Play `res://tests/fixtures/invalid_content_preview.tscn`. It instantiates Main with the authored invalid catalog whose schema version is 999.
4. Use the same keyboard intent. Confirm the screen remains in Loading, shows the exact invalid resource/property and repair instruction, and offers only Back to menu.
5. Restart the normal main scene, repeat the valid navigation, and leave it running.

Artifacts: [valid-content-town.png](valid-content-town.png), [valid-runtime.json](valid-runtime.json), [invalid-content-menu.png](invalid-content-menu.png), [invalid-content-loading.png](invalid-content-loading.png), [runtime.json](runtime.json). The captured viewport was 1466×720 logical pixels in the embedded editor window. Headless layout tests additionally cover compact and wide sizes.

An initial `click_button_by_text` call successfully navigated but Beckett then tried to obtain the path of the synchronously detached old button, logging an addon `get_path_to` error. This was isolated to that helper. The retained final runs use input events, with **no game log entries**, and no vendor workaround was applied.

## Scope

[Implementation contracts](../../phase2-implementation.md) describe the twelve authored definitions, numerical bounds, RNG encoding and command/event API. The only accepted domain command is pre-roll skill selection. No dice UI, combat resolution, enemy AI execution, room navigation, reward delivery, disk persistence or production quest/dialogue integration was added. Existing art was sufficient; SpriteCook generation was unnecessary.
