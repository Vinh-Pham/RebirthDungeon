# Phase 0 verification — 2026-09-10

Engine: **4.7.2.stable.official.ed1daf0bf**; full commit `ed1daf0bf001b61586d9930840f2f1394092c079`.
Host: **Apple M2 Max, arm64, macOS 27.0 (26A428)**. Editor rendering: **OpenGL 4.1 Metal / Compatibility**.
Content and rules versions: **not introduced; Phase 2 pending**.
Scope: Phase 0 only. Templates are pinned to 4.7.2.stable but absent; no executable export or mobile acceptance is claimed.

## Automated evidence

Run from the repository root:

```sh
python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

[verification.log](verification.log) retains the initial aggregate passing result; individual logs record the exact command, engine build, output and exit code.

| Check | Observed result | Artifact |
| --- | --- | --- |
| Editor pin | Exact match, exit 0 | [version.log](version.log) |
| Headless import | Exit 0, no engine/script errors | [import.log](import.log) |
| Actual main-scene fixture | Layout fills three sizes; title stays visible; exit 0 | [tests-pass.log](tests-pass.log) |
| Deliberately broken anchor | Six reported layout/clipping failures; exit 1 | [tests-failure.log](tests-failure.log) |
| Main-scene runtime smoke | 60 iterations, exit 0, no engine/script errors | [runtime-smoke.log](runtime-smoke.log) |
| All five preset resource packs | Exit 0; each contains main scene and project configuration; no docs/tests/tools/research/build assets | [assets-0.txt](assets-0.txt), [assets-1.txt](assets-1.txt), [assets-2.txt](assets-2.txt), [assets-3.txt](assets-3.txt), [assets-4.txt](assets-4.txt) |
| Fresh-copy verification | Same suite with no .godot/import/UID cache | [clean-verification.log](clean-verification.log), [clean-logs](clean-logs/) |

Pack indices map to macOS, Windows Desktop, Linux, Android, iOS. ZIPs are reproducible outputs under ignored `build/verification/`; their manifests and logs are retained here.

The fresh-copy check initially exposed Beckett runtime socket errors while its server was disabled. The verifier rejected the run despite a passing fixture/exit 0. The runtime stub now honors `BECKETT_ENABLE=0/false`, and the fresh-copy suite was repeated. The normal editor MCP bridge remains enabled. This is a small local addon integration change to preserve when upgrading Beckett.

## Godot MCP observation

Using Beckett 1.15 Lite: author the main scene with `create_node` / `set_property` / `save_scene`; set the project entry scene; run `play_scene`, then `wait_until(game_connected)`, `ui_snapshot`, `game_logs` and `screenshot`. After saving and reopening the editor, the main scene launches again.

Observed: centered title and baseline subtitle, full viewport Control, no game log errors. [main.png](main.png) retains the rendered game; [runtime.json](runtime.json) retains structured UI and game logs. The embedded game screenshot may differ slightly from the nominal 1280×720 viewport because of the editor panel. These are visual/runtime observations, separate from the headless layout fixture.

## Export attempts and prerequisites

Actual `--export-debug` attempts for each preset exited **1** on missing matching export templates:

- [export-0.log](export-0.log): macOS
- [export-1.log](export-1.log): Windows Desktop
- [export-2.log](export-2.log): Linux
- [export-3.log](export-3.log): Android
- [export-4.log](export-4.log): iOS

An earlier macOS attempt also reported missing ETC2/ASTC import support; that project setting was corrected before the retained attempts. Missing templates prevent later export checks from establishing SDK/signing readiness. The complete host inventory and per-target prerequisites are in [Phase 0 baseline](../../phase0-baseline.md). Mobile installation, device input, suspension, signing, release assets and gameplay remain unverified.
