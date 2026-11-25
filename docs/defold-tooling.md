# Defold tooling and verification

The playable game is at the repository root. See [README](../README.md),
[migration notes](defold-migration-plan.md), and [dependencies](defold-dependencies.md).

## Toolchain and AI assistants

| Component | Configuration |
| --- | --- |
| Defold | 1.14.1, engine `ee283d4dad9fa451dd6399d83602e1dc25133681` |
| Java | JDK 25+ required by the pinned Bob's class-file version; an older JDK can pass upstream doctor but fail the actual build |
| Defold MCP | Fulviuus server 1.0.2, commit `59f4bcbff636643daf413b6bec959313b37426db`, local sibling checkout `/Users/vinhpham/Projects/defold-mcp` |
| Exa MCP | `exa-mcp-server@3.5.1`, stdio, inherits only the named `EXA_API_KEY` variable; key never written to this repo |
| Aseprite MCP | Existing project entry retained for original art authoring |
| Project skills | `.agents/skills/rebirth-defold-development/SKILL.md` and `.agents/skills/rebirth-defold-verify/SKILL.md` |

The pins are recorded in [toolchain.json](../tools/defold/toolchain.json),
[dependencies.lock.json](../dependencies.lock.json), and
[.codex/config.toml](../.codex/config.toml). The Defold launcher selects stdio,
computes the project root relative to its own location, and discovers a macOS
JDK 25+ when `JAVA_HOME` is absent. The config's launcher path is absolute;
update it when moving the repository. `DEFOLD_MCP_DIR`, `DEFOLD_PROJECT_ROOT`
and `JAVA_HOME` can be configured explicitly in the MCP env table.

The configured MCP servers require a reload/new agent session for tool discovery.
Defold's 27-tool handshake and Exa's three-tool handshake were exercised. Both
project skills pass the skill-creator validator. The existing Aseprite workflow
and Dungeon-20 constraints continue to apply; exported art is repackaged by
`tools/sync-defold-content.py` without changing the authored source pixels.

## Reproduce installation

For a fresh server installation:

```sh
git clone https://github.com/Fulviuus/defold-mcp.git /Users/vinhpham/Projects/defold-mcp
git -C /Users/vinhpham/Projects/defold-mcp checkout --detach 59f4bcbff636643daf413b6bec959313b37426db
cd /Users/vinhpham/Projects/defold-mcp
npm ci --ignore-scripts --no-fund --no-audit
npm test
```

Inspect an existing checkout before reusing it rather than cloning over it.
The verifier checks HEAD, cleanliness and package version before starting the
server. Its source/dependencies, file operations, process launching, download
hosts and transports were reviewed before installation. It remains a local
control integration rather than a sandbox. The [official AI agents guide](https://defold.com/manuals/ai-agents/)
identifies it as a community integration.

The game dependencies are checked in at reviewed commits. To reproduce their
source installation, use `python3 tools/defold/install-sources.py`; validate with
`python3 tools/defold/check-dependencies.py`. Defold resolves the 10 archive
libraries declared in `game.project`. Portable Lua adapters and authoring tools
are included separately. Defold Event uses GitHub's codeload archive endpoint
for the same immutable commit after the normal archive endpoint returned HTTP
500 during verification. No dependency pin was relaxed.

## Build and test

From the repository root:

```sh
luajit tests/run.lua
python3 tools/defold/check-dependencies.py
node tools/defold/verify-mcp.mjs --tests --run
```

The verifier checks the MCP handshake, Java/project root, pinned engine metadata,
API search and dependency resolution; builds with `archive: true`; creates and
runs an isolated DefTest native bundle; and creates, launches and checks the main
native bundle. It inspects engine version/revision, registered runtime libraries,
Automation Bridge health, published game state, and runtime errors/render warnings,
then stops its own process. First use needs network access. macOS desktop runs
need a graphical session. Build/editor output is ignored by Git.

**Native engine selection matters:** the upstream `defold_run` always selects a
stock cached engine. This game includes the debug Automation Bridge, so
launch the generated native bundle instead. `verify-mcp.mjs --run` does that
through `run-native.py`. It parses `CFBundleExecutable` rather than assuming the
app's display name is its executable name. A normal `defold_build` without
`archive: true` can also leave a stale `game.dmanifest`; archive before runtime
verification. Exact engine SHA in the lock is release provenance, not a binary
checksum/integrity enforcement scheme.

For engine tests, `tests/test.settings` selects the separate DefTest
collection. Gameplay rules are exercised under both host LuaJIT and the actual
Defold runtime. The natural-stat journey covers all eight rooms, the boss,
treasure, Spindle Hollow's one-time quest reward, both gates and save/reload.
Failed transactions are tested for profiles, combat, movement and inventory.

The desktop playtest and HTML5 playtest commands are in [README](../README.md).
They capture screenshots, structured checks/receipts, and logs in the chosen
output directory. They use isolated saves/browser contexts. Browser input must
use real key events for the canvas; `insert_text` on a non-editable canvas does
not reproduce typed input. Automation Bridge key/type helpers default to queued
input, so wait for release/completion before asserting resulting state.

## Agent workflow

Follow [Defold's AI guide](https://defold.com/manuals/ai-agents/) and
[project instructions](../AGENTS.md):

1. Inspect the relevant Lua models and tests. Define the expected behavior and
   the narrowest useful acceptance check.
2. Use Exa to discover and read official manuals and upstream library docs.
   Retrieve relevant pages rather than sending the full combined documentation.
   Use versioned MCP API docs for 1.14.1 signatures and resource formats.
3. Edit small, reviewable changes. Run model tests, then versioned MCP builds.
   Inspect structured compile errors. Keep repair loops bounded per failure.
4. Bundle the correct engine and exercise actual input/state. Inspect logs and
   screenshots for rendering changes. A compilation alone does not prove play.
5. Stop processes you launched and report specific evidence and unresolved targets.

When an editor is open, read `.internal/editor.port` and discover its current
`/openapi.json`. Editor and engine are separate services. The debug Automation
Bridge's matched Python wrapper is retained under `vendor/automation-bridge/`;
its runtime health/version/capabilities are checked before use. The project
registers semantic state/command routes instead of unrestricted Lua evaluation.
HTML5 debug builds use a small browser-side state/command queue for tests;
release builds do not enable that debug queue. Keep tokens and personal saves
out of prompts, reports and version control.

The game runtime and editor-only tools are separated. The
[architecture guide](architecture.md) lists the playable source directories.
The [dependency inventory](defold-dependencies.md) records runtime uses, exact
pins and source licenses.
