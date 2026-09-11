# Phase 0 baseline

Verified 2026-09-10. Phase 0 establishes an executable development baseline, not gameplay or mobile delivery acceptance.

## Engine and host

- Exact editor: **4.7.2.stable.official.ed1daf0bf**, commit `ed1daf0bf001b61586d9930840f2f1394092c079`.
- Machine-readable editor pin: [godot-version.txt](../tools/godot-version.txt). Verification refuses a different build.
- Matching template pin: **4.7.2.stable**, archive `Godot_v4.7.2-stable_export_templates.tpz`; file requirements in [export-templates.json](../tools/export-templates.json). Templates are **not installed** on this host. No template binary/checksum is claimed verified.
- Host: macOS 27.0 (26A428), arm64; editor at `/Applications/Godot.app/Contents/MacOS/Godot`.
- Host editor executable SHA-256: `c7cccbf8fb143e34e02fd6521e09be2c2b974f0d5db080b19071c9c570718ccf`.
- Content/rules versions: **not introduced (Phase 2)**. No catalog, gameplay rules or save schema ships in this baseline.

## Configuration decisions

Use **Compatibility** for both desktop and mobile. This minimal 2D project needs no Mobile renderer features; Compatibility is the baseline to evaluate on devices. This choice is consistent with Godot's [renderer guidance](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html), not a claim that mobile hardware has passed.

Retain `canvas_items` stretch and `expand` aspect at a 1280×720 logical baseline, with landscape orientation (Godot default). Containers fill the viewport and keep text centered. Tests cover 1280×720, 960×540 and 1560×720 logical viewports; pixel-perfect integer scaling and safe areas remain later work.

Remove the explicit Windows D3D12 override and unused Jolt 3D physics override. Compatibility does not use that RenderingDevice driver choice. Phase 3 will use Godot's separate 2D physics. Enable ETC2/ASTC texture imports because the pinned macOS exporter requires them for universal/arm64 exports.

`scenes/main.tscn` is the assigned entry scene, containing only a centered baseline message. There is no application session or navigation yet. The pre-existing Beckett addon remains enabled; its autoload now uses a stable resource path so a fresh import does not depend on a pre-existing UID cache.

## Conventions and commands

Use lowercase snake_case paths; PascalCase node names and descriptive PascalCase GDScript classes; typed GDScript. Application scripts will live in `scripts/application/`, scenes in `scenes/`, runners in `tests/`, fixtures in `tests/fixtures/`, and command wrappers in `tools/`. Create other folders when first used. Save data belongs in `user://`.

Run from the project root with Python 3 and the pinned editor:

```sh
python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

On other hosts, pass that host's exact pinned executable or set `GODOT_BIN`. The wrapper checks version, imports, runs the fixture, proves the negative exit, smoke-launches the main scene, exports each preset's resource ZIP and checks its file manifest. It fails on timeouts, unexpected exit codes, engine/script errors, missing result markers or leaked development files. Logs and ZIPs go to ignored `build/verification/`. Headless editor subprocesses disable Beckett's server/config rewriting through environment variables; the addon export filter still runs. The runtime stub also honors `BECKETT_ENABLE=0/false`, preventing headless test processes from connecting to the active editor bridge.

Equivalent individual commands (set `GODOT_BIN` first):

```sh
"$GODOT_BIN" --version
BECKETT_ENABLE=0 BECKETT_AUTO_CONFIG=0 "$GODOT_BIN" --headless --path . --editor --import
"$GODOT_BIN" --headless --path . --script res://tests/run_tests.gd
"$GODOT_BIN" --headless --path . --script res://tests/run_tests.gd -- --prove-failure
"$GODOT_BIN" --headless --path . --quit-after 60
"$GODOT_BIN" --path .
```

The negative fixture intentionally changes an anchor on the in-memory scene instance. It must exit **1**, with layout/clipping failures; it never changes the saved scene. Normal tests must exit **0**. A script parse error or crash cannot masquerade as a pass in the wrapper.

## Export prerequisites

All five development presets exist in [export_presets.cfg](../export_presets.cfg). IDs use `org.rebirthdungeon.game` as a provisional development identifier; verify ownership/uniqueness before distribution. No signing credentials are stored.

| Preset | Baseline configuration | Host result and remaining prerequisites |
| --- | --- | --- |
| macOS | Universal, ad-hoc signing, no notarization | Asset pack passes. Executable export blocked by missing `macos.zip`. Distribution later needs an appropriate Developer ID/signing and notarization setup. |
| Windows Desktop | x86_64, unsigned, resource modification disabled | Asset pack passes. Missing matching debug/release EXE templates. Resource metadata editing can be enabled with its host tooling later. Windows runtime untested. |
| Linux | x86_64 | Asset pack passes. Missing matching debug/release Linux templates. Linux runtime untested. |
| Android | arm64, debug APK, standard non-Gradle export | Asset pack passes. Missing matching APK templates. SDK path exists, but editor Java path points to Temurin **JRE 24**, not a validated JDK. Shell Java is OpenJDK 26; JDK 17 is not installed in the inspected Homebrew locations. Set a validated JDK path, check debug signing/device access, and validate actual export/install. Release keystore and AAB/Gradle setup remain later work. |
| iOS | arm64, Xcode-project-only | Asset pack passes. Missing `ios.zip`. Xcode 27.0 beta (27A5194q) is selected. Team ID/provisioning are deliberately unset; select the user's team and validate signing/device support before export/install. |

The inspected Android SDK contains platform 35, build-tools 35.0.1 and platform-tools 37.0.1. Godot's [Android guide](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html) recommends JDK 17 and lists CMake 3.10.2.4988404 / NDK 28.1.13356709; those exact CMake/NDK versions are absent (other versions are installed). Reconcile requirements with the pinned exporter when enabling Gradle/native builds. The [iOS guide](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html) requires macOS/Xcode, templates and an application team/identifier. SDK/signing configuration and physical-device acceptance are not inferred from resource packs.

Each preset excludes docs, research, tests, tools and build output. Actual exported resource ZIP manifests prove exclusion; the Beckett export plugin retains only its inert autoload stub. Resource ZIP success does **not** prove executable export, installation, signing or runtime acceptance on that target.

See the [retained verification record](evidence/phase-0/README.md).
