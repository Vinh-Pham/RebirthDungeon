# Defold/Lua dependency research for Rebirth Dungeon

Implementation update: the user subsequently requested the full assessed list.
All 20 upstream packages are now installed and pinned; see the
[installed inventory](defold-dependencies.md) and [implementation status](defold-migration-plan.md).
The recommendations below preserve the original research rationale, including
which alternatives should share no automatic ownership of input or state.

Research date: 2026-11-24. This is the original dependency assessment. Web discovery and page/source retrieval used Exa `/search` and `/contents`, with direct Git tag and repository-tree checks to corroborate Druid's current versions and packaging. Primary upstream repositories, source files, release pages and engine manuals support the external findings below. The subsequent [tooling setup](defold-tooling.md) records actual installation and runtime verification rather than the research-only observations.

## Recommendation

Start with Defold's built-in GUI, input, camera, tilemap and sprite facilities, **Druid plus its matching Defold Event dependency** for UI components, and **DefTest** in the test build. Evaluate **Monarch** for screen navigation after the first modal flow. Keep combat, inventory, quest progression, save migration and dungeon rules in project-owned Lua modules. Add a library only when its focused integration test demonstrates a benefit.

Treat Orthographic, defold-input, RichText, Narrator and Asefold as conditional additions. Defer an ECS and a general roguelike toolkit until the migrated gameplay needs them. Gooey is an alternative to Druid, rather than an additional UI layer. This selection is an engineering recommendation based on the actual integrations below, not a claim that the libraries replace Godot scenes or GDScript automatically.

## Integrations observed in the Godot reference

The installed list overstates the amount of third-party behavior that needs replacing. The source paths below refer to the [historical Godot revision](defold-migration-plan.md).

| Godot integration | Observed code and behavior | Migration implication |
| --- | --- | --- |
| GLoot | `sword_satchel.gd` builds an 8×7 `Inventory` with `GridConstraint`, item footprints, stacks, gold pouches, main-hand and other equipment slots. It copies candidate storage and commits saves before adopting state. | Port the storage rules and transaction behavior. A UI grid is not an inventory model. |
| LimboAI | `dungeon_enemy_movement.gd` computes a shared, four-direction distance field out to six tiles, then evaluates pursuit/wander/hold per enemy after a player step. `combat_intent_ai.gd` selects Defend/Attack/Smash by action count, with a defensive fallback. | Small deterministic Lua selectors can preserve the present trees without a behavior-tree dependency. Keep movement ticks separate from ATB time. |
| Phantom Camera | `dungeon_town.gd` uses a `SubViewport`, damped following, pixel snapping and map bounds inside the HUD's map panel. | The demanding replacement is viewport composition and picking, not merely a camera following a sprite. |
| Gaea | Installed for later use; `threshold_rooms.gd` and `lantern_rest_map.gd` contain custom seeded generation. | Port the generators first. Preserve existing-run layout/save behavior explicitly; a different RNG or algorithm will not recreate Godot seeds automatically. |
| GECS | Autoload/plugin is enabled in `project.godot`; no gameplay `Entity`/component/system integration was found in the inspected `scripts/` and `tests/`. | An ECS is optional architecture, not a demonstrated migration requirement. |
| Dialogue Manager | Autoload/plugin is enabled, but town conversations currently come from `_say()` and callback dictionaries in `dungeon_town.gd`; no authored `.dialogue` assets were found in the inspected assets/scenes. | Port the existing choices first; adopt Ink when narrative authoring warrants it. |
| QuestSystem | Autoload is configured, but gameplay/journal still read and update the integer `world.quest`. No `QuestSystem` calls were found in gameplay scripts. `character_store.gd` also owns per-character visited towns, registered gates, inventory and progression. | Preserve the current quest stages and saves. Stable quest IDs, pools and committed event handling remain a separate feature, not an existing addon integration to translate. |
| Maaack's Input Remapping | Current screens predominantly inspect `InputEventKey` and `KEY_*` directly. The documented rebinding menu is future work. | Introduce a common action layer while preserving shortcuts and modal consumption. A mapper alone does not supply a settings UI. |
| GUT | `tests/unit/` covers model behavior, save compatibility, inventory, map/path behavior and UI contracts. | Translate assertions and fixtures; keep pure model tests independent of the renderer. |
| Aseprite Wizard | Existing `.aseprite` sources coexist with exported PNG assets. | Preserve sources and export/import metadata; no need for a runtime Aseprite decoder. |
| Beckett / Plugin Updater / Beehave | Beckett is Godot tooling; Plugin Updater maintains addons; Beehave is bundled and disabled. | These do not require gameplay runtime replacements. No Beckett-equivalent Defold automation bridge was validated in this research. |

Particularly useful parity fixtures: `test_spider_encounter.gd`, `test_battle_ui.gd`, `test_dungeon_enemy_movement.gd`, `test_sword_satchel.gd`, `test_gold.gd`, `test_click_to_move.gd`, `test_map_position.gd` and `test_threshold_progress.gd`. Preserve gauge independence, command replacement, items leaving the gauge intact, counters, deterministic snapshots, rejected-operation rollback and exact inventory placement.

## Runtime compatibility boundaries

**Built-in engine facilities** are different from Defold library dependencies. Druid, Monarch, Orthographic, RichText, Gooey, defold-input, DefTest and def-behavior-tree are projects intended for Defold and use its APIs/resources; being written in Lua does not make them standalone Lua libraries. tiny-ecs, Jumper and lua-state-machine are standalone Lua candidates. rotLove is mixed: portable algorithm code plus LÖVE-specific rendering/examples. Narrator has a Lua runtime and an LPeg-dependent parser, with documented Defold integration.

Defold recommends Lua 5.1 language features across targets: its manual distinguishes LuaJIT targets from HTML5's Lua 5.1.4 and restrictions on JIT compilation. Do not infer compatibility from “Lua” alone, depend on desktop-only FFI, or assume LuaRocks installation produces a Defold dependency. Vendored modules still need module-path, packaging and target-runtime checks. [Defold Lua manual](https://defold.com/manuals/lua/)

## UI, navigation, text and input

### Druid — adopt after a keyboard-first spike

Druid provides buttons, scrolling, visible-row data lists, input fields, progress, layout and hotkey components over GUI nodes. Its stack-based input and reusable GUI/Lua widgets suit the inventory, journal, shops and battle controls. It depends on Defold Event; both projects report MIT licensing. Use the project's fonts and visual assets, not the demo theme. [Druid upstream](https://github.com/Insality/druid), [Defold Event](https://github.com/Insality/defold-event)

The proposed spike pin is **Druid 1.4.2 + Defold Event 21**. A direct tag check
and Exa live retrieval of the tagged README and `game.project` resolved an initial
stale release-page extraction: both tagged files specify this pair, and the
library declares minimum Defold 1.11.2. The example project's other dependencies
are not a list to copy into this game. [Tagged README](https://github.com/Insality/druid/blob/1.4.2/README.md), [tagged project](https://github.com/Insality/druid/blob/1.4.2/game.project)

Keyboard support needs a precise qualification. Upstream setup documents key bindings for a Navigation Handler widget and Tab for input focus switching; buttons separately expose key triggers. This establishes keyboard facilities, **not** a Godot-style automatically generated directional focus graph across every control. The 1.4.2 repository tree has no navigation-named implementation, so the documentation's referenced navigation widget cannot be assumed available. Build an explicit project focus controller if necessary. [Tagged input setup](https://github.com/Insality/druid/blob/1.4.2/wiki/advanced-setup.md), [button API](https://github.com/Insality/druid/blob/1.4.2/api/components/base/button_api.md)

Acceptance checks: arrows/Tab/Shift-Tab/Enter/Escape, hidden/disabled controls, scrolling focus into view, focus restoration after a shop/modal closes, and no map movement or combat shortcut leakage while typing. The 8×7 inventory needs a spatial cursor and footprint-aware commands owned by the game. Druid's grid arranges nodes; GLoot's placement, stacking and equipment rules still need porting.

### Monarch — evaluate for major screens; use local UI panels for small overlays

Monarch manages screen stacks, transitions, popups, loading/preloading and input focus through collections/proxies or collection factories. Use it for title/character selection/world screens and deliberate modal lifecycles; it need not represent every HUD panel as a new collection. MIT. [Monarch upstream](https://github.com/britzl/monarch)

Two important constraints from that documentation: a proxy screen can set the timestep below a popup, while factory screens do not list the same timestep facility; nested child screens receive input only when their parent uses a collection factory. Screen registration must complete before navigation begins. Explicitly decide whether a battle options panel pauses simulation; do not accidentally freeze enemy ATB clocks through a generic popup default. Character/world state should live outside disposable screens.

### Orthographic — optional; native camera first

Defold already supplies an orthographic camera component and coordinate conversion. The Orthographic library adds follow interpolation, bounds, deadzones, recoil/shake and viewport helpers; its recent versions wrap the built-in camera. It is Defold-specific Lua/resources, MIT, not a native binary extension. [Native camera manual](https://defold.com/manuals/camera/), [Orthographic upstream](https://github.com/britzl/defold-orthographic)

The library explicitly requires a modified or supplied render script for custom viewports/multiple cameras. For Lantern Rest, test the map rectangle inside the fixed HUD, aspect/resize/high-DPI behavior, viewport-relative screen-to-cell conversion, edge bounds and interpolation followed by pixel snapping. Neither a default camera nor adding this library alone establishes parity with Godot's `SubViewport`. Retain nearest filtering and inspect fractional camera/zoom behavior visually.

### RichText — optional after measuring Druid's text facilities

Defold-RichText supplies markup, multiple fonts, inline images, wrapping/alignment and text reveal. It is Defold GUI-specific and MIT. It normally creates a node per word; `combine_words` reduces node count at the expense of per-word operations, and `remove()` disposes generated nodes. This matters for a long message log and journal: cap or virtualize displayed history, and do not continuously rebuild all previous messages. [RichText upstream/API](https://github.com/britzl/defold-richtext)

Druid also lists rich text/input components, so avoid adopting two text layout systems by default. Evaluate Source Code Pro wrapping, Departure Mono controls, font changes, inline skill/item annotations and explicit line breaks before selecting one. Neither renderer provides dialogue/quest semantics.

### defold-input — optional when implementing remapping

Its Mapper maps bound device-action IDs to game actions and supports player/gamepad distinctions; other modules handle gestures, button state and cursor interactions. MIT; a Defold library, not a replacement for native input dispatch. Mapper's documentation recommends a comprehensive input binding resource so keys can be remapped. [Upstream](https://github.com/britzl/defold-input), [Mapper documentation](https://github.com/britzl/defold-input/blob/master/in/mapper.md)

Defold's native input uses an acquired-focus stack and permits consumption by `on_input()`. Route physical actions once into UI or gameplay; keep Druid's expected input names consistent with the mapping layer. Add project-owned rebind capture, conflict/default handling, persistence and displayed shortcut labels. Verify text entry separately from navigation. [Native input](https://defold.com/manuals/input/)

### Gooey — optional alternative, defer while using Druid

Gooey supplies input/state handling for buttons, checkboxes, radio buttons, text input and lists, with presentation supplied by the game. It is a smaller possible choice for a hand-built GUI, MIT and Defold-specific. Its API documents input acquisition/release and text-field focus, but that is not evidence of a complete cross-control keyboard navigation solution. A Druid/Gooey combination would duplicate widget state and focus responsibilities. [Gooey upstream](https://github.com/britzl/gooey)

## Simulation, roguelike algorithms and AI

### tiny-ecs — defer; suitable portable ECS if later needed

Upstream tiny-ecs represents entities as Lua tables, with worlds, filters and ordered systems; the implementation is a vendorable `tiny.lua`. Its LÖVE demo does not make the core LÖVE-dependent. MIT. The author explicitly describes the low commit rate as a mature/finished implementation rather than abandonment. [tiny-ecs upstream](https://github.com/bakpakin/tiny-ecs)

A [Defold wrapper](https://github.com/ivanquirino/defold-tiny-ecs) exists and says it packages 1.3-3, but its README installation example incorrectly points at `britzl/defold-input`. Do not copy that dependency URL. Prefer an audited upstream file pinned to a tag/commit if ECS is selected. Since current gameplay does not demonstrate GECS usage, tables and explicit model updates are the lower-risk starting point. An ECS still requires project decisions about save ownership, system order and when grid versus ATB simulation runs.

### rotLove — defer full toolkit; selectively port only proven algorithms

Upstream provides generators, RNG, FOV, A*/Dijkstra, lighting and schedulers. Its README states that only display modules need LÖVE. The checked sources substantiate the distinction: `Display:init()` uses `love.graphics`/`love.window`, while precise shadowcasting accepts a transparency callback. The top-level loader still imports display/text-display modules, and algorithm files require the parent ROT module. Selective reuse therefore needs an audited loader/dependency closure, rather than copying one file and assuming independence. [Overview](https://github.com/paulofmandown/rotLove), [loader](https://github.com/paulofmandown/rotLove/blob/master/src/rot.lua), [display source](https://github.com/paulofmandown/rotLove/blob/master/src/rot/display.lua), [FOV source](https://github.com/paulofmandown/rotLove/blob/master/src/rot/fov/precise.lua)

The loader also imports helpers that modify standard `table`/`string` functions. Avoid those global side effects in project model tests unless deliberately accepted. The license file contains MIT-style rotLove/30log notices, a BSD three-clause rot.js notice and RandomLua's MIT attribution; preserve the notices for the code actually incorporated. [Helper source](https://github.com/paulofmandown/rotLove/blob/master/src/rot/newFuncs.lua), [license file](https://github.com/paulofmandown/rotLove/blob/master/LICENSE.txt)

Current generation and six-tile pursuit are small enough to port directly. Do not substitute rotLove's turn scheduler for the game's independent ATB clocks. No current FOV integration was found in inspected gameplay scripts; visibility/lighting can remain a later feature. If selected then, test blocked corners, topology, opaque origin/edges, saved exploration and a seeded RNG adapter on each target.

### Jumper — optional pathfinding alternative, not a dungeon/FOV toolkit

Jumper is explicitly pure Lua and framework-independent, with grid pathfinding algorithms including A* and Jump Point Search. MIT. It is a candidate to replace click-to-move's `AStarGrid2D`; the existing shared BFS is simpler for nearby enemy pursuit. Use orthogonal routing and verify every tile in returned paths, dynamic blockers, unreachable targets and coordinate conversion. Its quick-start JPS example returns paths with gaps between waypoints, so expand/interpolate steps before feeding a grid movement queue. [Jumper upstream](https://github.com/Yonaba/Jumper)

### Behavior trees/state helpers — port current selectors; defer a framework

The two LimboAI trees are selectors over a few immediate actions, so project Lua functions can preserve branch order, seeded tie-breaking, intent cadence and defensive fallback. ATB readiness, damage, stamina and counter outcomes remain combat-model rules.

If future enemies need authorable branching, [def-behavior-tree](https://github.com/s-kania/def-behavior-tree) is a Defold-targeted MIT candidate: sequence, selector, random/decorator nodes, payload state and resumable node IDs. Its tasks complete through success/fail callbacks; it is not a direct translation of LimboAI's tick/blackboard/resource format. Verify cancellation, asynchronous completion, deterministic RNG injection and save restoration before adoption. Its README's branch download example also uses `master` while the repository reports `main`; prefer the verified release tag.

For explicit finite states, [lua-state-machine](https://github.com/kyleconroy/lua-state-machine) is a standalone MIT micro-framework with transition callbacks and asynchronous transitions. It provides neither a behavior-tree editor nor a combat scheduler. Defold also publishes a [small FSM example](https://defold.com/examples/animation/animation_states/). Present selectors are simpler than either dependency; defer both until state complexity justifies them.

## Dialogue, quests and persistence

### Narrator — optional narrative-authoring choice

Narrator parses raw Ink into a Lua-table book and runs independent story instances. It documents choices, tags, external functions, variable observers, state save/load and book-version migration. MIT; it is a Lua implementation with explicit Defold usage, not Inkle's official runtime. LPeg is required for parsing; upstream recommends parsing in development and shipping generated books so production can avoid the parser dependency. Its Defold installation example includes `defold-lpeg`, so prove that the selected runtime require path works without LPeg before omitting it from a build. [Narrator upstream](https://github.com/astrochili/narrator)

Do not promise full Ink compatibility: upstream lists unsupported threads, divert-target variables, string evaluations assigned to variables and parallel flows, plus missing `TURNS()`/`TURNS_SINCE()` queries. Validate every Ink construct used by this project with fixtures. Keep quests, inventories, gold and gate state in the character model; dialogue external functions should request validated gameplay transactions. Save narrative state per character and preserve existing `world.quest` migration separately.

### defold-ink — optional alternative, not a second narrative runtime

This Defold-targeted Lua implementation reads compiled Ink JSON; its README specifies Inky 0.14.1 / Ink 1.1.1 compatibility and warns about JSON format changes. It reports the Unlicense. Saving can replay choices and saved random results; restoration can optionally invoke externals. That needs careful integration so loading a story cannot repeat gold/item/quest rewards. Its alternative variable serialization requires an explicit jump path. The README also advertises parallel flows. [defold-ink upstream](https://github.com/abadonna/defold-ink)

Prefer Narrator if its supported subset and precompiled-book workflow fit the intended writing. Prefer defold-ink only after testing the exact Inky compiler version and restoration semantics. Neither library replaces QuestSystem's IDs/pools or the existing save normalizer. No third-party quest package is required to port the present integer quest stage.

## Tests and art tooling

### DefTest — adopt in development/test builds

DefTest packages Telescope for Defold and documents a separate test collection, a headless engine/Bob runner, deep comparison assertions and optional LuaCov-based coverage. MIT. Its documentation recommends extracting complex behavior into Lua modules and distinguishes model testing from script/GUI integration. Pin Bob and the engine together; adapt its example runner rather than allowing it to download an unspecified latest engine for each CI run. [DefTest upstream](https://github.com/britzl/deftest)

Translate the GUT model assertions first, using injected RNG and storage adapters. Test sprite picking, focus order, clipping, camera snapping and visual text behavior in an actual graphical Defold build as well; headless logic tests cannot demonstrate these. No new game tests were run for this documentation-only task.

### LuaUnit — optional alternative for standalone model tests

LuaUnit is a standalone single-file xUnit-style framework with table-aware assertions and text/TAP/JUnit outputs. Its upstream test matrix includes Lua 5.1 and LuaJIT. The license file is BSD two-clause. It suits a separate command-line model suite; it is not a ready-made Defold GUI integration harness. [LuaUnit upstream](https://github.com/bluebird75/luaunit), [license](https://github.com/bluebird75/luaunit/blob/main/LICENSE.txt)

Use one primary assertion framework unless an independent host-Lua suite offers a concrete advantage. LuaUnit's normal process-exit/file output conventions need adapting if embedded in the engine; do not infer that host-Lua success exercises Defold resource loading.

### Aseprite — native export pipeline first; Asefold optional

Defold's built-in atlases/tile sources and flipbooks render the exported frames; no Aseprite runtime package is needed. The Aseprite CLI documents batch export, frame/tag selection, sheets and metadata. Preserve the project's Aseprite MCP authoring workflow, Dungeon-20 palette, 16×24 frame canvas and nearest filtering. PNGs already present provide the first import path. [Atlas manual](https://defold.com/manuals/atlas/), [flipbook manual](https://defold.com/manuals/flipbook-animation/), [Aseprite CLI](https://www.aseprite.org/docs/cli/)

[Asefold](https://github.com/Kaiqgs/asefold) is an Aseprite-side tool, Apache 2.0, rather than a game runtime extension. Its README explains source/output folder conventions and tag-to-animation mapping; its v0.3 release adds `.atlas` export alongside `.tilesource`. Test layer/tag naming, pivot/canvas alignment, durations, ping-pong/repeat behavior and generated file stability. The release notes specifically reject underscores in layer/tag names because they separate animation identifiers. Do not assume per-frame Aseprite timing survives an exporter automatically. [Asefold releases](https://github.com/Kaiqgs/asefold/releases)

[Defold Aseprite Scripts (DAS)](https://github.com/masakazu-k/defold-aseprite-scripts) is an alternative MIT editor-script tool requiring Aseprite on PATH, with commands to extract frames/metadata and create an atlas. Its retrieved release is an old beta. Prefer a reproducible CLI export step or evaluate Asefold before introducing this additional editor dependency. Neither imports Godot `.tscn`, `.tres` or `.import` files.

## Verifiable version and maintenance evidence

These are **observed upstream artifacts**, not a lockfile or a guarantee that every entry is the newest release. Retrieval requested live crawling. GitHub extraction often omitted release years; the table does not manufacture full dates from month/day labels. A short hash is useful evidence, but adoption should record the full resolved SHA/archive checksum and license files.

| Candidate | Verified evidence | Source |
| --- | --- | --- |
| Druid / Defold Event | Direct Git tags: Druid 1.4.2 → `425f7c7db17ae544a59686a312cd4cf8e5f10221`; Event 21 → `384813497c25ff41d34ab1efdb1163217dc9dd26`. Exa live retrieval of Druid's 1.4.2 README/project confirms this pair. An initial older release-page result was superseded by these checks. | [Tagged README](https://github.com/Insality/druid/blob/1.4.2/README.md), [tagged project](https://github.com/Insality/druid/blob/1.4.2/game.project), [Event tag](https://github.com/Insality/defold-event/tree/21) |
| Monarch | 6.0.3 / `5c33c39`; notes include an HTML5 coroutine fix for `clear()`. | [Releases](https://github.com/britzl/monarch/releases) |
| Orthographic | 3.6.4 / `ea8437b`; 3.5.0 notes describe use of the built-in camera and deprecated projection conversion helpers. | [Releases](https://github.com/britzl/defold-orthographic/releases) |
| RichText | 5.22.1 / `adab8c8`; fixes node leakage during dry-run layout. | [Releases](https://github.com/britzl/defold-richtext/releases) |
| defold-input | 4.9.0 / `964428d`; notes include cursor screen-to-world and multitouch changes. | [Releases](https://github.com/britzl/defold-input/releases) |
| Gooey | 10.5.3 / `e19df8f`; removes deprecated config API usage. | [Releases](https://github.com/britzl/gooey/releases) |
| tiny-ecs | No GitHub Releases entries; wrapper declares 1.3-3. Upstream tags and mature-project statement exist; latest exact upstream tag-to-SHA was not established. | [Tags](https://github.com/bakpakin/tiny-ecs/tags), [wrapper](https://github.com/ivanquirino/defold-tiny-ecs) |
| Jumper | README recommends stable 1.8.1; tag listing associates the v1.8.1 entry with `a2be178`, 2013-03-02. Old stable code requires target tests. | [Tags](https://github.com/Yonaba/Jumper/tags) |
| rotLove | Retrieved commit history starts at `4e0d9bf`, 2022-04-03. This is an observed history head, not proof of current maintenance/support. | [Commit history](https://github.com/paulofmandown/rotLove/commits/master/) |
| Narrator | 1.8 / `a3abcab`; release changes public API from camelCase to snake_case. | [Releases](https://github.com/astrochili/narrator/releases) |
| defold-ink | No GitHub Releases entries retrieved; compiler-format compatibility is documented in README. A full commit pin remains to be chosen. | [Releases](https://github.com/abadonna/defold-ink/releases), [README](https://github.com/abadonna/defold-ink) |
| DefTest | 2.9.0 / `a75fedc`; notes include runner/download and bootstrap-documentation fixes. | [Releases](https://github.com/britzl/deftest/releases) |
| LuaUnit | `LUAUNIT_V3_5` / `9678c93`; README dates version 3.5 to 2026-03-26. | [Releases](https://github.com/bluebird75/luaunit/releases), [README](https://github.com/bluebird75/luaunit) |
| def-behavior-tree | 1.0.0 / `0647d82`. | [Releases](https://github.com/s-kania/def-behavior-tree/releases) |
| lua-state-machine | Standalone source/docs verified; no release/commit freshness claim established here. | [Upstream](https://github.com/kyleconroy/lua-state-machine) |
| Asefold | v0.3 / `a77add9`; atlas support and naming restrictions documented in release notes. | [Releases](https://github.com/Kaiqgs/asefold/releases) |
| DAS | 0.1.0 / `fdf7066`, described as beta. Release year omitted in retrieved text. | [Releases](https://github.com/masakazu-k/defold-aseprite-scripts/releases) |

## Remaining uncertainty before adoption

1. The migration plan pins Defold 1.14.1 and starts with desktop, then HTML5. Test the exact pinned libraries on those targets; none were compiled or executed during this research.
2. Test the verified Druid 1.4.2/Event 21 pair and implement any missing focus/navigation behavior. Demonstrate keyboard-only inventory, shops and battle panels before adopting it throughout the UI.
3. Prototype the inset map renderer and screen-to-cell conversion; decide whether native camera code or Orthographic gives the simpler correct implementation.
4. Decide whether narrative authoring needs Ink now. Test the selected supported subset, compiler/parser version, per-character state and reward-safe restoration before introducing either runtime.
5. Prove sprite tag/timing fidelity in one exported animation. Retain generated output in a reproducible workflow and record tool versions.
6. Audit exact pinned licenses and transitive dependencies when installing. Repository license labels and observed release hashes are evidence, not a substitute for preserving the actual shipped notices.
