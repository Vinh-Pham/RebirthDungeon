# Defold migration verification

Verified locally on 2026-11-24 with Defold 1.14.1, macOS ARM64 and Chromium.
The Godot reference revision is `54abc9b7b586648874aaeed0904ca9657b3914cf`.
The build, native launch, and playtests were verified using
[`game.project`](../game.project) at the repository root. Godot players start a
new Defold character.

| Check | Result |
| --- | --- |
| Host LuaJIT model/integration suites | 123 tests passed, including sword-only training and tonic loot at capacity |
| Native DefTest collection | 123 passed with zero failures, errors or unassertive cases |
| Complete natural-stat dungeon journey | Eight rooms, boss, treasure, quest reward, both gates, reload passed without artificial health/damage changes |
| Physical desktop playtest | 31 checks passed, including keyboard character creation, pixel-snapped camera scrolling, inventory focus, armory search, encounter queue replacement, loot and save/reload |
| Town amenity art | All six landmarks use the original oven, loom, spinning wheel, windmill and fishing artwork; three-seed regression and native screenshot inspection passed; captions centered/wrapped |
| HTML5 | 18 Chromium checks passed, including canvas picking at two sizes, inventory drag, and IndexedDB reload of the new stack position |
| Libraries | 20 source packages pinned/installed; runtime registry load checks and LPeg/Automation Bridge registration passed |
| MCP | Defold 27-tool handshake; Exa 3-tool handshake; pinned version/project/Java checks passed |
| Project skills | Both skill-creator validations passed |
| Art build | 425 generated frames, the atlas and both fonts match the retained source exports |
| Historical Godot baseline | 149/149 GUT tests passed in an isolated reference checkout with Beckett disabled |

Reproduce the main checks from the repository root:

```sh
luajit tests/run.lua
python3 tools/defold/check-dependencies.py
node tools/defold/verify-mcp.mjs --tests --run
python3 tools/defold/playtest.py \
  "bundle/verification/Rebirth Dungeon.app/Contents/MacOS/RebirthDungeon" \
  --output /tmp/rebirth-desktop-playtest
uv run --with playwright python tools/defold/playtest-web.py \
  bundle/html5/RebirthDungeon --output /tmp/rebirth-browser-playtest
```

Build the browser directory first using versioned Defold MCP `defold_bundle`,
platform `wasm-web`, variant `debug`, output `bundle/html5`. The scripts
produce JSON summaries, logs, screenshots and input receipts. Tests use injected
memory stores or isolated browser contexts; personal character data is not needed.
Each runtime check owns and stops its processes. No site or game was published.

Runtime checks found and resolved font-batch exhaustion, linear GUI sampling,
input-focus churn, unbundled dynamic library requires, stale native archives,
failed transaction rollback, and restart backup recovery. Browser input checks
wait for real key/mouse delivery across engine frames. Expected browser-only
diagnostics include the unavailable native debug web server and screenshot-related
software-GPU stalls; browser, Lua and renderer errors fail verification.

Verified targets are macOS ARM64 desktop and Chromium HTML5. Other operating
systems, browsers and release/signing configurations need their own target runs.
New procedural runs use a versioned Lua RNG. Defold's profile and backup
recovery paths preserve saves made in Defold.

See the [dependency inventory](defold-dependencies.md) for exact licenses/source
evidence and the upstream Automation Bridge license-file omission. Installed
alternatives are load-tested, while the game's primary UI and session model own
input and state; installing two frameworks does not make them both active.
