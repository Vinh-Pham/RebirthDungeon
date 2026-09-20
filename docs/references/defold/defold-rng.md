# Defold RNG

[Upstream documentation](https://github.com/alchimystic/defold-rng) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use this native extension for independent seeded world, reward, and battle streams. It implements PCG32 and TinyMT32. The upstream dependency example is `https://github.com/alchimystic/defold-rng/archive/master.zip`; pin a tested revision and build a custom Defold engine for every shipping target.

## Documented API

The native global `rng` creates instances through `rng.pcg32(init_state, init_seq)` or `rng.tinymt32(seed)`. No Lua `require` is documented for this global. Instances expose `number()`, `range(min, max)`, `double()`, `double_range(min, max)`, `toss()`, `roll()`, and algorithm-specific `seed(...)` methods.

`number()` returns an unsigned 32-bit integer. The README describes `range` as an unsigned integer range. Constructors without explicit seeds use entropy; TinyMT32 seed zero also uses entropy. The author cautions against 64-bit Lua seed values, so constrain project seed fields to validated 32-bit integers.

## Persistence limitation and adapter design

The inspected README documents no generator-state export/import. A seed alone does not encode the current position in a stream. Never invent a `get_state()` API or serialize a native instance.

Proposed first adapter: persist algorithm/version, two PCG seeds, and a raw draw count. Route every sample through `number()`, including rejection sampling for unbiased integer ranges. Increment the counter for every underlying draw. Restore with the original seeds and discard exactly that many raw draws. Convenience methods are excluded from authoritative sampling because their consumption is not part of this counter contract.

This is a project strategy that must be validated against the pinned implementation. Record sampling/derivation versions, stable iteration order, and known outputs. Bound stream lifetimes and profile replay cost; use a verified native state API if later added and needed. Store generated layouts and offers as data.

## Project checks

Keep cosmetic randomness separate. Previews, failed commands, and failed writes leave committed RNG state unchanged. Test deterministic continuation and failed-write retry in the engine, including Windows/macOS targets selected for release. Test probability 0/1 behavior, endpoint bounds, rejection samples, seed validation, and draw-count corruption. Inject a fake RNG into plain Lua rule tests; it does not verify this native extension.

## Consuming project contract

Use the [battle contract](../../turn-based-plan.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
