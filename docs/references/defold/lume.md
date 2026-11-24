# LUme (Lume)

[Upstream documentation](https://github.com/rxi/lume) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and installation

Lume is a general Lua utility module, not a native Defold extension. Use the upstream **rxi/lume** library for small math, table, and string helpers.

Upstream documents copying `lume.lua` into the project and requiring it. For this project, vendor a pinned revision at `vendor/lume.lua`, retain its license/provenance, and import `require("vendor.lume")`. This path is proposed, not already present. A generic Lua repository is not automatically a Defold library ZIP with configured `include_dirs`; do not invent a dependency archive installation contract.

## Useful APIs

- Math: `clamp`, `round`, `lerp`, `distance`.
- Strings: `trim`, `split`, `format`.
- Tables: `map`, `filter`, `find`, `count`, `keys`, `sort`, `clone`.

Consult the upstream function reference for exact arguments and whether a helper returns a new table or mutates its input. `lume.clone` is explicitly a **shallow** copy: nested tables remain shared. `lume.extend` mutates its target. Neither provides immutable domain transactions.

## Project contract

Keep authoritative random selection/shuffling in the Defold RNG adapter, excluding Lume's random helpers from dungeon, initiative, combat, and rewards. Do not use unspecified hash-table traversal order to determine combat effects or random draws.

Use DefSave plus explicit save validation for persistence, not Lume serialization as an alternative save subsystem. Use plain validated data and a project deep-copy routine where ownership isolation is required. Avoid introducing helpers into hot movement loops without measuring allocations.

Verify the selected helpers under the Lua runtime used by Defold. Test nested-state isolation and stable ordering in the callers that depend on them; do not build a duplicate test suite for every upstream utility.

## Consuming project contract

Use the [Lua ownership rules](../../architecture.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
