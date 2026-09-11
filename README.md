# Rebirth Dungeon

A single-player, offline-first 2D pixel-art RPG built with **Godot and typed GDScript**. Explore dungeons, turn five dice into a chosen skill, and build mastery that lasts across lives.

The intended loop is **town preparation → dungeon exploration → turn-based battles → expedition results → persistent progression → deliberate rebirth**. Choose a skill and target before rolling five d6, keep useful faces, reroll a subset up to twice, and commit the hand to one action. Learned skills and mastery carry across lives; rebirth is a deliberate choice.

Desktop is the first development target, with landscape Android and iOS planned. See the [game overview](docs/overview.md) and [battle specification](docs/gameplay/battle.md) for the design.

## What runs today

The repository currently provides a persistent application shell, guarded State Charts navigation, shared UI resources, isolated addon smoke fixtures, a headless test runner and export presets. Town, dungeon, battle and results screens are **development navigation fixtures**. Exploration, combat, rewards, progression and disk saves are not implemented; shell state is in memory only.

The [project phase tracker](docs/project-phases.md) is the authority for implementation status and next steps. Consult it before older status statements in the design docs. Dated [host qualification evidence](docs/evidence/phase-1/README.md) records the shell and addon checks and their limits.

## Requirements

- **Godot 4.7.2**, exact build **`4.7.2.stable.official.ed1daf0bf`**, as pinned in [tools/godot-version.txt](tools/godot-version.txt). Use the standard GDScript editor; this project does not require the .NET editor.
- **Python 3** for repository verification and addon inventory tooling.
- The bundled `addons/` directory, including LimboAI's native GDExtension binaries. Keep it intact when checking out or copying the project.

[project.godot](project.godot) configures the **Compatibility** renderer, a **1280 × 720** base viewport, nearest texture filtering, and `canvas_items` stretch with `expand` aspect. The exact engine pin matters: the verifier rejects other builds.

## Open and run

1. Open the pinned Godot editor.
2. Import this repository's `project.godot` through the Project Manager.
3. Allow the initial asset and dialogue imports to finish. Preserve the configured plugins and autoloads.
4. Press **F5** to run the project, whose entry point is [scenes/main.tscn](scenes/main.tscn).

The debug shell exposes buttons for navigating its placeholder modes. Use mouse clicks or keyboard focus/accept actions; Escape goes back. Controller support includes D-pad navigation, A to accept and B to go back. Touch is routed through mouse emulation. These controls exercise the shell; there is no world movement or dice combat yet. Development navigation fixtures are hidden in release builds.

You can also import, open and run from a terminal. Run these commands from the repository root; this example uses the macOS application path:

```sh
export GODOT_BIN="/Applications/Godot.app/Contents/MacOS/Godot"
"$GODOT_BIN" --version
"$GODOT_BIN" --headless --path . --editor --import
"$GODOT_BIN" --editor --path .
```

To launch the project directly:

```sh
"$GODOT_BIN" --path .
```

On other systems, replace `GODOT_BIN` with the pinned executable's path, or use `godot` if that exact build is on your `PATH`. Python is needed for the tools below, not for running the project in the editor.

## Verification

Run the repository wrapper from the project root:

```sh
python3 tools/verify.py --godot "$GODOT_BIN"
```

It checks the exact engine version, imports the project, runs the positive fixtures and an intentional failure fixture, smoke-launches the main scene headlessly, and checks resource-pack contents and development-asset exclusions for all five export presets. Logs and pack manifests are written to `build/verification/`. Success ends with `BASELINE_VERIFICATION: PASS`.

The negative fixture must exit with its expected failing-test marker; a parse error does not count as a successful negative test. For a focused test run after import:

```sh
"$GODOT_BIN" --headless --path . --script res://tests/run_tests.gd
```

To refresh the addon/native-library/template inventory:

```sh
python3 tools/qualify_addons.py --godot "$GODOT_BIN"
```

UI, camera and dialogue changes also need a rendered playtest for input, focus and transition cleanup. Headless checks do not certify those behaviors. See [AGENTS.md](AGENTS.md) for contribution rules and required verification.

## Exports and platform support

[export_presets.cfg](export_presets.cfg) defines macOS, Windows Desktop, Linux, Android and iOS presets. Executable exports require matching **`4.7.2.stable` export templates**; the archive and required files are pinned in [tools/export-templates.json](tools/export-templates.json).

The retained 2026-09-11 host evidence reports resource-pack checks passing, while executable export attempts were blocked by missing templates. Windows/Linux runtime testing, mobile SDK compatibility, signing, installation and device acceptance remain outstanding. See the [per-target prerequisite record](docs/evidence/phase-1/README.md#per-target-prerequisites-not-device-acceptance). Successful resource packs alone do not establish a runnable or shippable build.

## Bundled addons

| Addon | Installed version | Responsibility |
| --- | --- | --- |
| Godot State Charts | 0.22.5 + local compatibility patch | Application modes; later battle presentation flow |
| LimboAI | 1.8.1 | Later manually scheduled enemy decisions |
| Phantom Camera | 0.11.0.3 | Later exploration, dialogue and battle framing |
| Dialogue Manager 4 | 4.1.0 | Later NPC dialogue and town service UI |
| QuestSystem 2 | 2.0.2 | Later quest lifecycle and journal integration |
| Beckett | 1.15.0 | Godot editor/runtime inspection and playtesting through MCP |

Host smoke fixtures qualify the addons without implementing their planned gameplay features. The [addon integration guide](AGENTS.md) and [qualification evidence](docs/evidence/phase-1/README.md) cover local APIs, ownership, licenses and the State Charts compatibility patch. Beckett is development tooling; [INSTALL.md](INSTALL.md) documents its MCP setup.

## Project layout and documentation

| Path | Contents |
| --- | --- |
| `scenes/` | Persistent main scene and shell UI scenes/resources |
| `scripts/application/` | Application coordination, input registration and addon lifecycle |
| `scripts/domain/` | Current in-memory session shell; future authoritative state and pure rules |
| `scripts/presentation/` | Views that render copied observations and submit intents |
| `assets/` | Presentation assets and third-party notices |
| `addons/` | Vendored dependencies |
| `tests/` | Baseline, shell and addon fixtures; rendered playtest definitions |
| `tools/` | Engine/template pins, verification and addon inventory |
| `docs/` | Design specifications, delivery tracker and dated evidence |

Start with the [documentation index](docs/directory.md), [overview](docs/overview.md), [architecture plan](docs/game-plan.md) and [phase tracker](docs/project-phases.md). Detailed rules live in the [exploration specification](docs/free-exploration.md) and [gameplay specification index](docs/directory.md#gameplay-specifications). The directory document also describes planned folders that will be created with their first consuming feature.

Keep generated `.godot/` and `build/` output, `.firecrawl/` research caches, local MCP credentials and signing material out of commits and shipping content. Preserve vendor licenses; the root [LICENSE](LICENSE) is Beckett's commercial EULA, and [third-party notices](assets/licenses/third_party_notices.txt) record bundled dependency terms.
