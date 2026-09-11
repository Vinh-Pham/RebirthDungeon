# Beckett — MCP for Godot

> *Stop waiting for Godot.*

[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/pBAugYuerR)
[![Godot 4.2+](https://img.shields.io/badge/Godot-4.2%2B-478CBF?logo=godotengine&logoColor=white)](https://godotengine.org)
[![MCP](https://img.shields.io/badge/MCP-server-5A45FF)](https://modelcontextprotocol.io)

**Beckett** is a **zero-sidecar** Model Context Protocol (MCP) server embedded directly in the **Godot 4** editor as a GDScript `EditorPlugin`. AI agents (Claude and others) drive the editor over HTTP — no Node/Python bridge, no second process, no cloud.

## Demo

[![Watch Beckett drive Godot](https://img.youtube.com/vi/oUHrA4ojqdg/maxresdefault.jpg)](https://www.youtube.com/watch?v=oUHrA4ojqdg)

## Why

Existing Godot MCP servers either shell out to the CLI (can't play the game, screenshot, or inspect runtime) or run a Node/Python **sidecar** that relays to a thin in-editor addon. This one makes the **addon itself the MCP server**, and exposes **reflection-generic** tools that work on *any* class via `ClassDB` — instead of hundreds of hand-coded per-domain wrappers (an anti-pattern: LLMs degrade past ~40 tools).

## Highlights

- **Zero-sidecar** — `TCPServer` HTTP/JSON-RPC server polled on the editor main thread. No marshalling, nothing extra to install beyond the addon.
- **Reflection-first + discovery** — `find_classes` / `describe_class` / `find_methods` make the whole engine surface searchable; `describe_object` / `set_property` / `call_method` then drive any `Node` / `Resource` / `Object`. Reaches TileMap, GPUParticles, AnimationTree, NavMesh, shaders… with no per-domain code.
- **GDScript dev-loop with validate-before-write** — `write_script` parses the code first and refuses to write what doesn't compile (closing the #1 AI-on-Godot failure: hallucinated GDScript). Godot's edge over UE: reload needs no compile step.
- **Undoable authoring** — every scene/node mutation goes through `EditorUndoRedoManager` (atomic + undoable).
- **One-step install** — enabling the plugin auto-starts the server and writes `.mcp.json`, so `claude`/Cursor connects with zero hand-editing (no Node.js to install at all).
- **Security** — localhost-only with `Origin` validation (anti DNS-rebind) + optional bearer token; read-only / allowlist / confirm-destructive gates; auto-start is opt-out (`beckett/autostart=false`).
- **Autonomous play-test loop** — `play_scene` → `screenshot` / `get_remote_tree` → `simulate_input` → `wait_until` → fix, driving the *running* game over a runtime channel (the gap every free Godot MCP has). New: `time_control` — freeze the game, step exact physics frames, or run until a live-state condition is true (frame-perfect playtests). Plus **MCP Resources + Prompts**.
- **Dock panel** — status, one-click Start/Stop, copy-client-config, and an **AI-effort selector** (1–6) that caps how many tools are advertised: cheaper model context when you only need a slice. New: an **Active tools** list with a **per-tool on/off switch** — flip any tool off and it drops from `tools/list` *and* is blocked at the gate — plus a Read-only / Write / Destructive badge per tool, grouped by effort tier. **Applies live, no reconnect** — the server pushes `notifications/tools/list_changed` over its SSE stream and list-changed-aware clients (Claude Code, Cursor, …) re-fetch on the spot. **Skills** — 46 bundled knowledge packs cover the domains (particles, animation, ui, physics…) so reflection reaches them with no per-domain tools.
- **Background jobs** — `export_project` runs as a subprocess job (live output streaming, cancel, exit code) so the editor never freezes mid-export; poll `job_status`.
- **Responsive even unfocused** — while MCP traffic is active the server clamps the editor's low-processor sleep, so calls stay fast when you're focused on the terminal instead of the editor (the usual agent setup).
- **Spec-current MCP** — protocol version negotiation, tool **annotations** (`readOnlyHint`/`destructiveHint`/`openWorldHint`) on every tool, and `structuredContent` (2025-06-18) alongside text results. An **audit ring** (`audit://recent`) records the last 200 tool calls — see everything the AI did.
- **Error echo** (Godot 4.5+) — engine errors raised *while a tool call runs* are attached to that call's response (`engine_errors`, per step inside `batch_execute`), so "the call returned ok but the engine errored" can't slip past the agent silently.
- **UI playtesting that matches a real player** — `ui_snapshot` reads a whole screen as structured state in one call; `click_control` refuses covered/disabled clicks instead of faking success; `ui_audit` measures layout *and* walks the **focus graph** (what a gamepad user can actually reach: unreachable controls, dead ends, menus that open with nothing focused); `type_text per_frame=true` streams one character per frame so `text_changed` fires per keystroke.
- **It tells you what it costs your context** (1.13+) — `doctor` prices Beckett's own tool surface in the same bytes the wire carries, per effort tier, so the dial is a number instead of a guess. Measured on the Full edition (`~` tokens at ~4 bytes/token, an approximation; the byte figures are exact):

  | Tier | Tools | tools/list bytes | ~tokens | vs 1.13 |
  |---|---|---|---|---|
  | 1 Inspect | 16 | 7,413 | ~1.9k | +1,004 |
  | 2 Author | 41 | 20,150 | ~5.0k | +1,004 |
  | 3 Run | 46 | 22,889 | ~5.7k | +625 |
  | 4 See | 57 | 32,252 | ~8.1k | -849 |
  | 5 Drive | 83 | 55,660 | ~13.9k | **-7,712 (-12.2%)** |
  | 6 Max (default) | 91 | 60,782 | ~15.2k | **-7,779 (-11.3%)** |

  The free Lite edition tops out at tier 4: **55 tools, 31,549 bytes, ~7.9k tokens** (-849 vs 1.13). Even the largest possible surface is ~15.2k tokens, under the ~20k (10% of a 200k window) at which Claude Code swaps direct tool access for a tool-search index. Run `doctor` on your own project and engine to reproduce every number in one call - these were measured that way, on Godot 4.6.2.

  **The 1.14 diet, stated honestly.** Every tool description over 600 characters was rewritten to name its *capability* and move its *catalogue* behind `help(tool="NAME")`. The tools that were fat are the ones that drive and inspect a running game, so the saving lands where agents actually work - tiers 5 and 6 drop over 11%. The low tiers *gain* about a kilobyte, because they pay for the `help` tool itself and for `doctor`'s new `outputSchema` while having almost nothing fat to trim. That is the trade this release made on purpose, and `doctor` will print it back to you either way.
- **It stays out of your shipped game** (1.15+) - Beckett registers an autoload, so Godot would bake it into every export. The autoload is a stub that names nothing but `Node`/`OS`/`ResourceLoader` and goes inert unless it is running under the editor, and an `EditorExportPlugin` drops every other addon file from the pack: **~480 KB of Beckett becomes a 1 KB stub**, no setup, every preset, CI included. That last part matters if you compile Godot with a build profile: GDScript resolves class names at *parse* time, so an autoload naming a class your custom engine stripped fails to load and prints errors before your main scene does. A unit test pins the stub's dependency list so it cannot regress. See [Exports](INSTALL.md#exports).
- Roadmap: gdUnit4 tests, more skill packs, packaging.

## Tools (91) · Resources (6) · Prompts (6) · Skills (46)

> **Fewer tools, on purpose — that's the moat, not a limitation.** Most Godot MCPs hand-code one tool per task (`create_sprite`, `add_collision`, `make_timer`…) — hundreds that *still* miss classes and flood the model's context (LLMs measurably degrade past ~40 tools). Beckett's are **reflection-generic**: `describe_class` / `set_property` / `call_method` drive *any* of Godot's 1000+ classes through `ClassDB` — TileMap, GPUParticles, AnimationTree, shaders, your own `class_name` — with no per-domain code. **Don't count tools, count coverage:** a smaller, sharper toolset that reaches the *whole* engine beats a hundred narrow wrappers that don't.

- **Reflection / discovery:** `get_godot_version`, `find_classes`, `describe_class`, `find_methods`, `describe_object`, `set_property`, `call_method`, `get_scene_tree`
- **Scene authoring (undoable):** `create_node`, `delete_node`, `rename_node`, `reparent_node`, `duplicate_node`, `move_node`, `instance_scene`, `scatter_nodes` (Scene-Paint-style mass placement), `save_scene`, `open_scene`
- **GDScript dev-loop:** `validate_script`, `write_script`, `read_script`, `attach_script`
- **C#/.NET dev-loop:** `build_csharp` — `dotnet build` compile-check returning structured diagnostics (file:line:col + CS-code), isolated so it's safe while the editor is open. Write `.cs` then `build_csharp`; reflection + the runtime tools also drive C# nodes. Zero new dependency (the .NET SDK is already required for C# in Godot).
- **Signals:** `connect_signal`, `disconnect_signal`, `list_signals`
- **Resource assets:** `create_resource`, `set_resource`
- **Files / project:** `read_file`, `write_file`, `list_dir`, `search_files`, `get_project_setting`, `set_project_setting`
- **Templates:** `apply_template` — scaffold a bundled or project template (game starter, UI screen, settings menu, test harness) into `res://` in one call
- **Runtime play-test loop:** `play_scene`, `stop_scene`, `get_play_state`, `wait_until`, `game_logs`, `screenshot`, `simulate_input`, `get_remote_tree`, `find_nodes`, `runtime_get_property`, `runtime_set_property`, `runtime_call`, `wait_for_node`, `find_ui_elements`, `click_button_by_text`, `click_control`, `click_node3d`, `click_world`, `get_control_rect`, `scroll`, `drag`, `monitor_properties`, `record_input`, `replay_input`, `time_control`
- **QA / assertions:** `assert_node_state`, `assert_scene` (verify a saved `.tscn`'s structure), `assert_screen_text`, `compare_screenshots`
- **Profiling / code-analysis:** `get_performance_monitors` (game or editor), `get_project_statistics`, `find_unused_resources`, `detect_circular_dependencies`
- **Export & jobs:** `list_export_presets`, `export_project` (background by default), `job_status` (poll / list / cancel)
- **Asset Store / Library:** `asset_lib_search`, `asset_lib_info`, `asset_lib_install` — browse the Godot **Asset Store** (`store.godotengine.org`, 4.7+) or the legacy **Asset Library** (≤4.6), auto-selected by engine version, and install an addon straight into `res://` (downloads + extracts in-editor, optional plugin enable). Each search hit returns a `ref` for info/install.
- **Skills (knowledge packs):** `list_skills`, `load_skill` — 46 bundled: gdscript, csharp, reflection-discovery, signals, scene-management, save-load, threading-async-resource-loading, input, input-devices, mobile, settings-menu, profiling, renderer-tuning, occlusion-visibility-performance, http-networking; 2D — physics2d, tilemap, lighting2d; 3D — node3d, physics3d, skeleton3d, raycast, navigation, gridmap, import-3d; visual — particles, particles3d, shaders, animation, animationtree, tween, viewport-camera; audio; ui, theme, localization; multiplayer; custom-resources, export-presets; testing — gdunit4, playtest, qa-report; **one-shot game layer** — game-oneshot (idea→spec→blueprint router with verify gates) + genre blueprints game-platformer-2d, game-topdown-2d, scene-3d-oneshot (project override at `res://.beckett/skills/`)
- **MCP Resources:** `scene://tree`, `scene://selection`, `project://settings`, `assets://list`, `log://output`, `audit://recent`, `status://connection`, plus `capture://<id>` entries for frames parked by `screenshot deliver=link` (served as binary `blob`)
- **MCP Prompts:** `inspect_node`, `audit_scene`, `setup_2d_player`, `fix_script_errors`, `build_test_fix`, `make_game`

The runtime loop talks to the running game through a small autoload (`BeckettRuntime`) that the plugin registers; `screenshot` of the game needs a normal (non-headless) play session.

## Use

1. Copy `addons/beckett/` into your Godot 4.2+ project (4.4+ recommended; CI-verified on 4.4.1, and on 4.6.2 & 4.7.2 across Windows, macOS and Linux) and enable **Beckett — MCP for Godot** in *Project → Project Settings → Plugins*. The dock panel opens as a **Beckett** tab in the right-hand dock (next to the Inspector).
2. Done — enabling the plugin **auto-starts** the server and **writes `.mcp.json`**. (Opt out: `beckett/autostart=false`, `beckett/auto_write_client_config=false`. Other options: `BECKETT_PORT` default `8770`, `BECKETT_TOKEN`, `BECKETT_READONLY=1`, `BECKETT_ALLOWLIST`, `BECKETT_CONFIRM_DESTRUCTIVE=1`. Panel has Start/Stop.)
3. Connect your client. For **Claude Code**, just run `claude` in the project — the auto-written [`.mcp.json`](.mcp.json) wires it up (`/mcp` → **beckett**). For Cursor/others, point at `http://127.0.0.1:8770/mcp` (Streamable HTTP) or use the panel's **Set up …** buttons. See [INSTALL.md](INSTALL.md).

## Status

Transport, reflection/discovery, scene & script authoring, **signals**, **resource create/assign**, **files & project settings**, the **runtime play-test loop** (play → ui_snapshot/live tree → input → wait → assert), **QA assertions**, **skills**, **background export jobs**, and **Resources + Prompts + dock panel** are all built and verified live on Godot 4.4.1, 4.6.2 and 4.7 (headless editor + a real HTTP MCP client). **91 tools · 46 skill packs**. Run the regression harness yourself: `powershell -File tests/smoke.ps1` (parse-checks every script, runs the unit suite, boots a headless editor, and asserts the live protocol).

**CI** runs on every push, headless on **Windows, macOS and Linux**, against pinned engines: the **4.4.1** floor (Linux), **4.6.2** and the current stable **4.7.2** (all three OSes). Each lane parse-checks every addon script, runs the headless unit suite, then boots the editor and probes the live MCP endpoint over HTTP — on the free [Lite edition's public repo](https://github.com/beckettlab/beckett-godot-mcp), which is where the workflow and its badge live. A **4.8-dev** snapshot lane runs alongside them as an early warning for the next engine; it is marked *(experimental)* and is deliberately allowed to fail, so when 4.8 is what you care about, read the [job list](https://github.com/beckettlab/beckett-godot-mcp/actions/workflows/ci.yml) rather than a green badge alone.

## License

Commercial — one-time purchase with lifetime updates. Single-purchaser use; not for redistribution. See [LICENSE](LICENSE).
