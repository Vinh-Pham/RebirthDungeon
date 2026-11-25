# Installed Defold dependency sources

All twelve pinned packages are installed under `vendor/`, pinned to full upstream commits in `dependencies.lock.json`. Original upstream licenses and notices are retained in each source tree. `tools/defold/dependencies.settings` declares the ten packages which expose Defold libraries and are applicable as archive dependencies. Pure Lua packages and Asefold remain source/authoring tools rather than invented runtime plugins.

Run `python3 tools/defold/check-dependencies.py` to check the source inventory. Review each pinned package's LICENSE before redistribution. Reproduce a source installation by downloading its lockfile archive and extracting into its recorded directory; do not silently replace a pinned version with a branch head.

Flow owns the interactive GUI. The requested gameplay libraries are used as
follows.

| Library | Playable use |
| --- | --- |
| [Defold Saver](https://github.com/Insality/defold-saver) | Persistent character data and resume checkpoints through the profile service. Tag 10 is pinned to `36bdd1fc90da9175eb19a01948c02d157f45134e`. |
| [rotLove](https://github.com/paulofmandown/rotLove) | Room and Corridor generate the seeded Threshold floor plan. Arena supplies town perimeters and IceyMaze restores earlier dungeon runs. |
| [Decore](https://github.com/Insality/decore) | Per-session ECS landmark index supports service proximity checks. |
| [defold-ink](https://github.com/abadonna/defold-ink) | Reads the compiled Ilex intro from `game/data/dialogue/`. |
| [Defold RichText](https://github.com/britzl/defold-richtext) | Renders the Chronicle with the project's prose font. |
| [Monarch](https://github.com/britzl/monarch) | Tracks playable screen lifetimes through collection proxies. |

The RichText pin includes its upstream update to the Defold 1.14 font metrics API.
Decore's pinned tag 4 declares MIT in its README. The archive's license-file
omission is recorded in its [source notice](../assets/licenses/decore/SOURCE.txt).

Asefold is an Aseprite-side authoring tool; follow its upstream installation instructions in vendor/asefold before using its UI. DAS provides Defold editor scripts and needs an Aseprite executable. Neither is a runtime sprite renderer. Existing PNG atlases remain the game rendering input.

Automation Bridge is a native extension intended for debug builds. Its native build requires Defold's extension builder and a matching generated engine. Do not run an extension-dependent game with the stock dmengine from another build. Preserve its debug-only configuration and discover health/version/capabilities before automation requests. Its matching Python wrapper is included in the pinned source checkout.

Project skills are installed at `.agents/skills/rebirth-defold-development/SKILL.md` and `.agents/skills/rebirth-defold-verify/SKILL.md`. They use the configured MCP, pinned engine, Exa discovery and explicit deterministic verification rather than a fixed editor API snapshot.

## Runtime adapters

The portable rotLove adapter is installed at `game/vendor/rot.lua` with modules
under `game/vendor/rot/`. Source licenses remain in the pinned vendor tree. The
adapter exposes RNG, Room, Corridor, Arena, IceyMaze and Precise FOV. Its portable algorithms
run under LuaJIT. `game.integrations.libraries.check()` reports actual import
success or failure for retained runtime libraries.

`game.integrations.automation.attach({state=function,command=function})` registers debug semantic commands `rebirth.state` and `rebirth.command`, and publishes `rebirth.game`. The host must enable `automation_bridge.application_api = 1`. Commands pass through the game's own validation; the adapter grants no raw evaluator. The vendor includes the matching Python wrapper; add its `automation-bridge-python` directory to a local Python path to use it. Native game verification can run `python3 tools/defold/run-native.py <bundled executable>`.

An Exa MCP fragment is provided at `tools/defold/exa-mcp.settings.toml`, pinning exa-mcp-server 3.5.1 and forwarding only the environment variable name `EXA_API_KEY`. No credential is committed.

Bob discovers Lua resources through literal `require("module")` calls. The
integration registry and rotLove adapter use literal imports so Bob includes
their dependencies. Native verification fails on any logged unavailable runtime
package.

The dependency audit removed Gooey, Narrator, LPeg, Defold Orthographic, Defold
Input, Defold Behavior Tree, Jumper, standalone tiny-ecs, Lua State Machine and
LuaUnit. Flow, project-owned input and gameplay rules, Decore's internal ECS,
and the existing test runners cover their former optional roles.
