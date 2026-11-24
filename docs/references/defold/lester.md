# Lester

[Upstream documentation](https://github.com/edubart/lester) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and installation

Lester is **edubart/lester**, a self-contained Lua test framework supporting Lua 5.1+. It is a Lua module, not a native engine extension and not the unrelated DefTest library.

Vendor a pinned `lester.lua` plus its license under `tests/vendor/`, or use a verified test-only package. Upstream documents copying the single file and requiring it; no Defold dependency archive is assumed here. Keep it outside the release entry-point dependency graph.

## API and runner

The documented module exports `describe`, `it`, `expect`, `before`, `after`, `report`, and `exit`. A proposed plain Lua runner uses:

```lua
local lester = require("tests.vendor.lester")
local describe, it, expect = lester.describe, lester.it, lester.expect

describe("test harness", function()
    it("runs an assertion", function()
        expect.equal(2 + 2, 4)
    end)
end)

lester.report()
lester.exit()
```

This is a harness example, not a gameplay test or a file already installed. Upstream's `exit()` is appropriate for the standalone runner. In an engine test collection, adapt result reporting to the pinned engine's supported shutdown/exit mechanism; do not terminate a running game from an imported test module.

## Project contract

Test pure Lua rules with explicit clocks, random inputs, persistence fakes, and fixtures. Tests should assert behavior: same state after a rejected command, a single resource charge, valid turn ordering, or no duplicate reward on retry.

Engine APIs, native RNG/A*, GUI focus, timers, and actual save backends require the Defold integration harness. A mocked `rng` or GUI cannot establish extension compatibility. Plain Lua tests should load domain code without requiring `go`, `gui`, or other engine globals.

Lester does not itself provide a GUI automation driver, coverage measurement, shrinking property tests, or native-engine mocks. Add those separately only when needed. Before CI adoption, deliberately fail a test and verify a nonzero exit, then verify passing runs return success and leave no state between suites.

## Consuming project contract

Use the [verification gates](../../verification.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
