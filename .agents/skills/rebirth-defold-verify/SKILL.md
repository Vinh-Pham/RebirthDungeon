---
name: rebirth-defold-verify
description: Verify Rebirth Dungeon's Defold build, model tests, gameplay flow, screenshots and runtime logs before reporting implementation results.
---
Use tools/defold/toolchain.json and JDK25+. Run the model test runner, dependency validation and versioned MCP build before launching. Resolve libraries when settings change. Native extensions require the matching generated engine, not an unrelated stock engine.

Run `node tools/defold/verify-mcp.mjs --tests --run`: it resolves/builds/archives/bundles through MCP, then launches the matching generated macOS executable with bounded native verification. Do not use MCP `defold_run`, which launches the stock engine without the project native extensions. For an existing debug bundle use `python3 tools/defold/run-native.py <executable>`; inspect logs for initialization and script/resource errors. Exercise character creation, town movement, combat queue replacement, counters, inventory, loot and save/reload. Test failed transactions preserve state. Inspect a screenshot for map clipping, readable focus and both project fonts. Stop processes launched for verification. Report exact checks and unresolved platform limitations; a successful build alone is not gameplay parity.
