# Lua and Defold static checks

**Planned tooling; no lint runner is configured by this documentation change.** Follow the [game plan](game-plan.md) and record actual tool versions when the foundation milestone installs them.

Check authored `.lua`, `.script`, and `.gui_script` files against Defold's selected Lua runtime. Use editor diagnostics and compilation now; select and pin a compatible Lua linter/formatter before adding command names or CI claims. Configure engine globals separately from pure domain modules, and explicitly account for native `rng`/`astar` globals in their adapters. Domain modules should load without engine globals.

Check accidental globals, unused locals, unreachable branches, lifecycle cleanup and unsupported Lua syntax. Scope justified suppressions to the smallest location. Exclude fetched libraries, vendored upstream modules, generated resources, `.internal/`, build output and `.firecrawl/` from authored-code style rules; validate their pins and packaging separately.

Lua annotations document table contracts but do not replace runtime validation. Catalog checks reject duplicate IDs, missing references, invalid rank order/costs, unsupported effects and unreachable progression. Save checks enforce structure, finite bounds, ownership, queue identities, RNG descriptors and versions. Lume's shallow copies must not leak candidate mutations.

The planned CI sequence is static/content checks, standalone Lester rules, pinned editor/Bob custom-engine build, engine integration, then release-bundle smoke tests. Add coverage tooling separately before setting numerical thresholds. Validate Markdown links and manifest JSON when editing docs.

Oxlint, TypeScript, React lint rules, pnpm and browser coverage gates are historical research in [references](references/README.md); they are not Defold project commands. See [verification](verification.md) for evidence requirements.
