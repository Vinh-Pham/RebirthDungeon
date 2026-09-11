# Phase 2: Godot content and deterministic rule foundations

Reset **2026-09-10**. [Project Phases](project-phases.md) owns completion. The implemented APIs, version/number contracts, fixture scope and addon boundary are documented in [Phase 2 implementation](phase2-implementation.md), with [retained verification](evidence/phase-2/README.md).

## Definitions and validation

Use typed custom `Resource` scripts and authored `.tres` files for `SkillDefinition`, rank data, `ActorDefinition`, `StatDefinition`, `StatusDefinition`, `ItemDefinition`, `EncounterDefinition` and `RoomDefinition`. A manifest Resource explicitly references the catalog. Publish the validated catalog only after every required definition and visual binding resolves. [Godot Resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html).

Use stable namespaced IDs such as `skill.sword`, distinct from paths and Node instance IDs. Validate uniqueness, reference category, supported effects, numeric bounds, strictly ordered ranks, nonnegative costs, six integer face weights with positive sum, exactly eight scoring combinations and increasing XP thresholds starting at zero. Reject unknown schema/rules versions. Report the resource path, ID and property on failure.

Definitions are shared and read-only by project convention. Mutable item instances, rank training, HP, reservations and status durations live in separately constructed runtime state. Do not assume loading a Resource or instantiating a scene creates an independent copy of its nested state. Test two actors using one definition without sharing mutable pools.

## Versioning and numbers

Record schema, content, rules, generator, RNG and engine build versions. Content changes do not silently rewrite an active hand. Use bounded integer stats, basis-point percentages and rational combo factors with explicit rounding. Declare safe multiplication limits and reject oversized inputs before overflow. Keep exact 64-bit save values as decimal strings when using JSON.

Prototype balance belongs in [Phase 4](phase4-combat.md). Start with one hero, one enemy, sword/defensive skills and one encounter; add richer item/progression catalogs only with their consumers. The complete skill rank order remains required even if authored prototype skills stop at E with a visible cap.

## RNG contract

Wrap `RandomNumberGenerator` behind a small testable adapter. Own separate generation, combat, AI and loot streams; reserve a profile-owned enchanting stream for its feature. Cosmetic draws never affect authoritative streams. Author and fixture a versioned seed derivation using stable stream names and a specified hash/byte encoding; do not depend on dictionary order or process-dependent hashes.

Save actual seed/state values and restore seed before state without drawing. The RNG algorithm is an engine implementation detail, so exact continuation is scoped to a pinned engine/RNG version until broader fixtures pass. [Godot RNG](https://docs.godotengine.org/en/stable/classes/class_randomnumbergenerator.html).

Weighted dice use cumulative integer intervals and an unbiased bounded sample. Reject invalid weights/subsets before drawing. Reroll selected indices in increasing order. Test doubles use finite explicit sequences and fail on exhaustion. Seed derivation, stream independence, weighted-boundary behavior and exact restore continuation need headless fixtures.

## Commands and acceptance

Commands carry stable session/revision identities and explicit inputs. Validate first, resolve a candidate state, then publish ordered events. Invalid commands change neither state nor RNG. Rules depend on Godot value types and GDScript helpers, not Nodes, timers, file access or input singletons.

Acceptance requires valid and invalid catalog fixtures, shared-resource isolation, integer bounds, deterministic command fixtures, RNG restore/independence and a visible loading error for invalid required content. Import success alone does not complete this phase.
