---
name: rebirth-defold-development
description: Implement or debug Rebirth Dungeon's Defold Lua gameplay, GUI and resources with the project's pinned engine and parity requirements.
---
Read AGENTS.md and the relevant migration milestone. Use Lua 5.1-compatible pure models and thin engine adapters. Preserve serialized zero-based IDs and per-character state. Use Exa to discover and read official APIs and library source, then versioned Defold MCP API documentation for 1.14.1. Bob requires JDK25+.

Inspect relevant Lua tests before changing behavior. The migration notes identify the historical Godot revision when a comparison is needed. Build through the Defold MCP with version 1.14.1 and archive enabled. Use `node tools/defold/verify-mcp.mjs --tests --run` to bundle debug and launch its generated native executable with the project extensions. Inspect runtime logs after engine changes and screenshots after UI changes. Use the declared dependency lock. Keep editor tokens local and discover editor APIs from .internal/editor.port and /openapi.json. Run deterministic tests before runtime checks. Preserve existing Defold profiles.
