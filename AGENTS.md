# Agent Instructions

This repository is a **Defold** game project written primarily in Lua. The project root is this repository, containing `game.project`.

Use **Defold Automation Bridge** for runtime inspection, interaction, screenshots, and gameplay verification. Keep gameplay logic separate from rendering/UI logic when practical; preserve the message-based GUI separation described below.

## Project map

- **Root config**: `game.project`
- **Main game content**: `main/` (collections, game objects, scripts)
- **Assets**: `assets/` (app icons, images)
- **Dependencies (read-only context)**: `.deps/`
- **Automation Bridge Python wrapper (installer-managed)**: `automation-bridge-python/`
- **Project automation scripts**: `tools/` (including `tools/check_automation.py`)
- **Screens**: `screens/<screen_name>/`
- **Popups**: `popups/<popup_name>/`

Key Defold settings from `game.project`:

- **Bootstrap collection**: `/main/main.collection`

**Resource paths in `game.project`**: Values like `main_collection`, `game_binding`, `app_icon` use Defold resource identifiers. A trailing `c` suffix denotes compiled resources and is expected — do not treat it as a typo.

## Include directories

- Use `.deps/` as an include directory for resolving module references and understanding dependency APIs.
- **NEVER modify any files inside `.deps/`** - these are downloaded dependencies provided strictly as read-only context.
- **NEVER modify files inside `automation-bridge-python/`** - this directory is managed by the Automation Bridge installer. Keep project automation scripts and customizations outside it, normally in `tools/`.

## Defold file formats

- **Lua scripts**: `.lua`, `.script`, `.gui_script`, `.render_script`, `.editor_script`.
- **Metadata assets** (Protocol Buffer Text Format): `.collection`, `.go`, `.sprite`, `.tilemap`, `.tilesource`, `.atlas`, `.font`, `.particlefx`, `.sound`, `.label`, `.gui`, `.model`, `.mesh`, `.material`, `.collisionobject`, `.texture_profiles`, `.display_profiles`.
- **Manifests** (YAML): `.appmanifest`, `.manifest` - platform-specific libraries and build flags.
- **Buffers** (JSON): `.buffer` - streams of data (positions, colors, etc.) used as input for Mesh components.
- **Shaders** (GLSL): `.vp`, `.fp`, `.glsl`.
- **Project config** (INI): `game.project`.
- **Properties** (INI): `game.properties`, `ext.properties` - parameters available in `game.project`.
- **2D assets**: `.png`, `.jpg`.
- **3D assets** (GTLF): `.gltf`, `.glb`.
- **Sound assets**: `.ogg`, `.wav`, `.opus` (OPUS requires modification of the appmanifest).

## Sharp Sprite materials

When the project includes the `defold-sharp-sprite` dependency, use RGSS materials from `/sharp_sprite/rgss/` instead of builtins for all supported component types: Sprite, Spine, GUI, ParticleFX, Tilemap, Font, Label.

## Editing Defold assets

When creating or editing Defold asset files, use the corresponding `defold-*-editing` skill to get the correct file format and structure. Always load the skill **before** writing or modifying the file.

When creating new screens, popups, or setting up navigation between them, load the `monarch-screen-setup` skill first.

When writing performance-critical math code or optimizing vector/quaternion/matrix operations, load the `xmath-usage` skill first.

## Code style guidelines

### Lua scripts (.lua, .script, .gui_script, .render_script, .editor_script)

- **Indentation**: 1 tab (4 spaces).
- **Naming**: `snake_case` for variables, functions, files, and folders. Keep resource paths absolute (`/assets/...`) where Defold expects them.
- **Comments**:
  - Use **LuaCATS** (`---@...`) annotations for types, module/public API docs.
- **Whitespace**:
  - Empty lines must be truly empty (no spaces/tabs).
  - Avoid trailing whitespace.
- **Defold API**: strictly follow the Defold API - always verify against the official documentation using the `defold-api-fetch` skill. There are no hidden or undocumented APIs - only use functions, messages, and properties that are explicitly described in the docs. For conceptual guidance on how Defold features work (components, physics, rendering, input, etc.), use the `defold-docs-fetch` skill. For practical implementation patterns and sample code, use the `defold-examples-fetch` skill.
- **Defensive checks**: Do NOT assume data is missing or constantly re-check field existence in tables. If YOU set a field, it EXISTS. Similarly, do NOT check for standard Lua API availability (e.g., `io` and `io.open` always exist in standard Lua). Avoid unnecessary defensive programming.
- **Paradigm**: do not use metatables or imitate classes. Use functional, data-based structures only.
- **Logging**: use `print()` to look at the game state. Add logs for transactions, initializations, important events.
- **GUI and game state separation**: GUI scripts (`.gui_script`) should NOT directly access game logic modules. All communication between game logic and UI must be message-based (`msg.post()`) to maintain clear separation of concerns. GUI should be purely data-driven, receiving all necessary data through messages and updating its display accordingly. This ensures UI remains decoupled from game implementation details.
- **Script instance state**: In `.script`, `.gui_script`, `.render_script` files, store instance-specific state in the `self` table, NOT in local module variables. Local variables at the module level are shared across ALL instances of the script, which causes bugs when multiple instances exist. Use `self.my_variable` instead of `local my_variable`. Not applicable for local functions - keep them local. If you need to call local function that it's defined below, to use forward declarations or reorganize the functions.
- **Local functions**: NEVER create local functions inside other functions. Local functions are only allowed at module scope. Anonymous lambda functions (inline callbacks) are acceptable.
- **require**: 
  - Always call `require` with parentheses: `require("module")`, NOT `require "module"`.
  - Use dot notation for module paths: `require("screens.flappy_bird.gameplay")`, NOT `require("/screens/flappy_bird/gameplay")`.
  - Module paths are relative to the project root and use dots (`.`) instead of slashes (`/`) as separators.
  - Do NOT use leading slashes in require paths.
  - Examples: `require("monarch.monarch")`, `require("screens.flappy_bird.gameplay")`, `require("main.utils")`.
- **Hash values**: `hash("...")` can be left inline without premature optimization. It's acceptable to use `message_id == hash("trigger_response")` directly. If you need to reuse a hash value multiple times, you can declare it as a module-level constant in `UPPER_CASE` format: `local TRIGGER_RESPONSE = hash("trigger_response")`.
- **Constants**: Module-level constants can be declared as local variables in `UPPER_CASE` format: `local TRIGGER_RESPONSE = hash("trigger_response")`, `local MAX_HEALTH = 100`.
- **msg.url format**: Always remember the format `[socket:][path][#fragment]`:
  - `socket` - collection name (world)
  - `path` - game object instance id (can be relative or global)
  - `fragment` - component id
  - Shorthands: `"."` for current game object, `"#"` for current component
  - Examples: `msg.url("#my_component")`, `msg.url("collection:/path/to/go#component")`, `msg.url(socket, path, fragment)`, `msg.url(nil, hash("id"), hash("script"))`, `msg.url(nil, go.get_id("physics"), "collisionobject")`

### Python

- Write for Python 3.11. Do NOT write code to support earlier versions of Python. Always use modern Python practices appropriate for Python 3.11. Always use full type annotations, generics, and other modern practices.

## Shell

- **Windows**: use PowerShell.
- **Linux**: use bash.
- **macOS**: use zsh.

## Commands

All commands run from the project root (the folder with `game.project`).

- **Run Python automation scripts**: `PYTHONPATH=automation-bridge-python python3 <script>`. Use this environment for all Python automation scripts. On Windows, set `$env:PYTHONPATH = "automation-bridge-python"` in PowerShell before running `python3 <script>`.
- **Check Automation Bridge setup**: `PYTHONPATH=automation-bridge-python python3 tools/check_automation.py`. Run this before diagnosing bridge problems. A failed `engine_connection` check is expected when the game is not running; interpret it alongside the other checks.
- **Build & Run via Automation Bridge**: connect to the existing editor and call `project.build_and_run()` as shown below. This builds the project, launches the game, and returns a runtime client.
- **Fallback editor build**: use the `defold-project-build` skill if the bridge cannot build. A successful fallback build does not replace runtime behavior verification for gameplay/UI changes.

## Automation Bridge

The Defold editor should normally already be running with this project open. Prefer connecting to it rather than attempting to launch Defold from a sandboxed agent:

```python
from automation_bridge import editor

project = editor.open_project(".", start_if_needed=False)
game = project.build_and_run()
```

For inspection of an already-running game without rebuilding, use `project.connect_engine()`. Only call `game.close_engine()` when the automation script intentionally owns engine cleanup.

Consult `automation-bridge-python/README.md`, `automation-bridge-python/best_practices.py`, and the wrapper's public docstrings for supported signatures and examples. Use package-root imports such as `from automation_bridge import editor, engine` and prefer named helpers over raw requests.

Useful runtime APIs:

- **Health and screen**: `game.health()`, `game.screen()`.
- **Element inspection**: `game.elements()`, `game.element()`, `game.maybe_element()`.
- **Input**: `game.click()`, `game.drag()`, `game.type_text()`, `game.key()`.
- **Visual evidence**: `game.screenshot(wait=True, resolution_multiplier=0.5)` returns a capture receipt with the saved image path. Inspect the image when verifying appearance.
- **Runtime errors and diagnostics**: `game.logs`; also inspect the editor console and any build errors returned by the build operation.

Prefer semantic selectors such as `automation_id` over hard-coded screen coordinates. Element objects are snapshots: re-query after UI or scene changes and pass the resulting elements to `click()` and both ends of `drag()` where applicable. If an element is stale, re-query it before retrying. `elements()` is paginated; use `count()` for a complete match count or `elements_page()` to traverse all results.

Use application state/events, command acknowledgements, element waits, or frame waits instead of arbitrary sleeps whenever appropriate synchronization is available. Discover game-specific contracts with `game.application_catalog()`.

### Application API

This project enables the application API with the following setting in `game.project`:

```ini
[automation_bridge]
application_api = 1
```

Prefer semantic automation hooks for important game systems. The Lua APIs include `automation_bridge.publish()`, `automation_bridge.emit()`, `automation_bridge.command()`, and `automation_bridge.annotate()`; consult the installed bridge documentation for their contracts before adding hooks.

- Add stable `automation_id` values to important interactive UI elements when practical.
- Expose useful semantic state for battles, menus, loading, dialogue, and inventory when it improves automated testing.
- Keep state publication with the system that owns the state. Automation hooks must preserve the existing separation between gameplay logic and message-driven GUI code.

## Required development workflow

For gameplay or UI changes:

1. Inspect the existing implementation before making changes.
2. Make the smallest coherent change.
3. Build and run the game using Automation Bridge.
4. Check Defold build errors and runtime errors.
5. Inspect the relevant game elements when useful.
6. Interact through Automation Bridge when the feature requires input.
7. Capture and inspect a screenshot when visual verification is relevant.
8. Verify the requested behavior using observable results instead of assuming the implementation works.
9. Fix discovered problems and rerun the affected verification.

Do not consider a gameplay/UI task complete merely because the Lua code looks correct. If runtime verification is blocked, report the blocker and what remains unverified.

### Testing philosophy

Prefer deterministic tests and verify actual state transitions and results. For turn-based combat, check the relevant active actor, battle phase, selected action, selected target, damage dealt, current HP, applied status effects, turn number, and battle outcome.

When semantic game state is available, assert against it instead of relying only on screenshots. Use screenshots to verify appearance and layout alongside behavior checks.

## Validation checklist

- Build via the running editor succeeds, using Automation Bridge as the primary workflow.
- No relevant Defold build or runtime errors remain.
- For gameplay/UI changes, the requested behavior is verified through runtime inspection and interaction as applicable.
- Relevant visual changes are verified with an inspected screenshot.

## Important repo-specific caveats

- **Git commit messages**: use the following format: `Short description` in English language ONLY.
