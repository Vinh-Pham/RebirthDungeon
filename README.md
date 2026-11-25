# Rebirth Dungeon

A keyboard-friendly, science-fantasy dungeon crawler. Open
[`game.project`](game.project) to play or develop the game.

If you played the Godot version, create a new character in Defold. Godot saves
do not carry over. Existing Defold characters can still be loaded.

## Play and verify

Use Defold **1.14.1**, Node 18+, **JDK 25+**, and LuaJIT for the host tests.
The MCP server, exact engine revision and dependencies are pinned. Follow the
[tooling guide](docs/defold-tooling.md) for a fresh machine.

```sh
luajit tests/run.lua
node tools/defold/verify-mcp.mjs --tests --run
open "bundle/verification/Rebirth Dungeon.app"
```

The verification command builds the game and the in-engine DefTest collection,
then launches and checks the generated macOS native bundle. Native dependencies
require its generated engine; the upstream MCP's stock `defold_run` engine does
not contain them. You can also open `game.project` in the matching editor
and use Build & Run.

The game includes character creation/selection, both Dungeon Towns, the Threshold's
eight combat rooms and treasure chamber, ATB encounters, equipment and spatial
inventory, skills/AP/training, town services, quests, Moon Gates and character
saves. Original sprites, Departure Mono and Source Code Pro are retained.

Move with WASD/arrows; interact with E/Enter. I opens inventory, K skills, Q the
journal, C character stats, and G registered Moon Gates. Combat uses 1–5 for
Attack/Defend/Smash/Counterattack/Windmill and 6 for a tonic. F1–F4 use assigned
quick slots. Space strikes the nearby practice post. Tab/Shift-Tab moves focus;
Escape closes panels. Keyboard bindings can be changed in Settings.

## Migration and tools

- [Defold migration and reference revision](docs/defold-migration-plan.md)
- [Playable architecture](docs/architecture.md)
- [Installed dependency inventory and licenses](docs/defold-dependencies.md)
- [Original plugin research](docs/defold-plugin-research.md)
- [MCP and verification workflow](docs/defold-tooling.md)
- [Verification results](docs/defold-verification.md)
- [Defold agent instructions](AGENTS.md)

The project pins 11 upstream packages. Flow handles the interactive UI and
Monarch manages screen lifetimes. The playable game uses Decore for its landmark
index, rotLove for town perimeter generation, defold-ink for arrival dialogue and
Defold RichText for the Chronicle. Asefold and Defold Aseprite Scripts support
art authoring.

The configured AI tools are Defold MCP, Exa MCP and Aseprite MCP. Repository
skills live under `.agents/skills/`.
Reload MCP servers/new agent sessions after changing configuration. Exa obtains
`EXA_API_KEY` from the client environment; no key is stored in the repository.

Editable Aseprite artwork and source PNGs live in [`assets/art/`](assets/art/).
To rebuild the Defold atlas after editing the source art, run:

```sh
uv run --with pillow python tools/sync-defold-content.py
```

Desktop and browser smoke tests use isolated character storage/browser contexts
and keep their evidence outside the repository:

```sh
python3 tools/defold/playtest.py \
  "bundle/verification/Rebirth Dungeon.app/Contents/MacOS/RebirthDungeon" \
  --output /tmp/rebirth-desktop-playtest
python3 tools/defold/playtest-restart.py \
  "bundle/verification/Rebirth Dungeon.app/Contents/MacOS/RebirthDungeon"
uv run --with playwright python tools/defold/playtest-web.py \
  bundle/html5/RebirthDungeon --output /tmp/rebirth-browser-playtest
```

Build the HTML5 directory first with Defold MCP `defold_bundle`, engine 1.14.1,
platform `wasm-web`, and an output directory of `bundle/html5`.
The browser test owns and closes its temporary loopback server and browser.
Debug automation bridges are excluded from release control flows.
