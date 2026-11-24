# Installed Defold dependency sources

All twenty requested packages are installed under `vendor/`, pinned to full upstream commits in `dependencies.lock.json`. Original upstream licenses and notices are retained in each source tree. `tools/defold/dependencies.settings` declares the fourteen packages which expose Defold libraries and are applicable as archive dependencies. Pure Lua packages and Asefold remain source/authoring tools rather than invented runtime plugins.

Run `python3 tools/defold/check-dependencies.py` to check the source inventory. Review each pinned package's LICENSE before redistribution. Reproduce a source installation by downloading its lockfile archive and extracting into its recorded directory; do not silently replace a pinned version with a branch head.

Druid/Event is the primary UI path. Gooey is an available alternative. Narrator and defold-ink are separate narrative alternatives. tiny-ecs, Jumper, rotLove and lua-state-machine are available source packages; their upstream module layout must be adapted at the call site. rotLove's display layer targets LÖVE and must not be loaded in Defold; algorithm reuse requires an isolated loader. This installation does not claim untested algorithm compatibility.

Asefold is an Aseprite-side authoring tool; follow its upstream installation instructions in vendor/asefold before using its UI. DAS provides Defold editor scripts and needs an Aseprite executable. Neither is a runtime sprite renderer. Existing PNG atlases remain the game rendering input.

Automation Bridge is a native extension intended for debug builds. Its native build requires Defold's extension builder and a matching generated engine. Do not run an extension-dependent game with the stock dmengine from another build. Preserve its debug-only configuration and discover health/version/capabilities before automation requests. Its matching Python wrapper is included in the pinned source checkout.

Project skills are installed at `.agents/skills/rebirth-defold-development/SKILL.md` and `.agents/skills/rebirth-defold-verify/SKILL.md`. They use the configured MCP, pinned engine, Exa discovery and explicit deterministic verification rather than a fixed editor API snapshot.

## Runtime adapters

Portable runtime copies are installed at `game/lib/tiny.lua`, `game/lib/jumper/`, `game/lib/luaunit.lua`, `game/lib/statemachine.lua` and `game/lib/rot.lua`. Their source licenses remain in the pinned vendor trees. The rotLove adapter deliberately exposes RNG, Arena generation and Precise FOV, excluding LÖVE display modules and upstream global table/string mutations. All five load successfully with LuaJIT. `game.integrations.libraries.check()` reports actual require success/failures; it never silently labels an unavailable runtime usable.

`game.integrations.automation.attach({state=function,command=function})` registers debug semantic commands `rebirth.state` and `rebirth.command`, and publishes `rebirth.game`. The host must enable `automation_bridge.application_api = 1`. Commands pass through the game's own validation; the adapter grants no raw evaluator. The vendor includes the matching Python wrapper; add its `automation-bridge-python` directory to a local Python path to use it. Native game verification can run `python3 tools/defold/run-native.py <bundled executable>`.

An Exa MCP fragment is provided at `tools/defold/exa-mcp.settings.toml`, pinning exa-mcp-server 3.5.1 and forwarding only the environment variable name `EXA_API_KEY`. No credential is committed.

Bob discovers Lua resources through literal `require("module")` calls. The integration registry therefore wraps literal imports in protected loader functions and lists the selected Jumper/rotLove dependency closure explicitly. Dynamic `pcall(require, path)` alone is insufficient and would produce a build with missing optional modules. The unused upstream Jumper `core/lookuptable.lua` contains an invalid declaration and is excluded; it is not part of the pathfinder dependency closure. Native verification fails on any logged unavailable runtime package rather than treating a source checkout as runtime readiness.
