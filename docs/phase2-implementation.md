# Phase 2 implementation contracts

Implemented 2026-09-11. Completion belongs in [the phase tracker](project-phases.md); verification is in [Phase 2 evidence](evidence/phase-2/README.md).

## Authored catalog

[content/catalog.tres](../content/catalog.tres) explicitly references twelve definitions: two actors, three skills, two stats, two statuses, one item, one encounter and one room. Typed Resource scripts live in `scripts/data/definitions/`. IDs are namespaced lowercase strings independent of filenames and runtime instance IDs.

The starter catalog is a **foundation fixture**, not accepted combat balance. Hero pools are 30 HP / 10 MP / 20 SP, STR 3 and Defense 1; the training enemy has 18 HP / 0 MP / 10 SP, STR 2 and Defense 0. Encounter gold is zero until Phase 4 authors rewards. The training room is metadata only, without geometry/navigation. The sword item's footprint is 1×3; inventory behavior remains Phase 8.

Sword F/E and Fortify F use the provisional costs, weights and effect values from [Phase 4](phase4-combat.md). Enemy Strike records its physical effect and weakened-status reference. Physical damage and shield are the accepted skill effect kinds in schema 1; shield and stat modifier are accepted status descriptions. These are validated data, not effect execution. Spark, Focus, Blood, other skills and complete rank tables are not enabled. Sword visibly declares an E prototype cap in its definition; other skills cap at F. The complete F→1 rank order is still required.

All visual bindings deliberately reuse the existing shell marker as placeholder art. No new assets were needed, so SpriteCook generation was not used.

`ContentCatalog.publish(manifest)` validates all definitions before replacing its previous catalog. Failure returns a `PackedStringArray` of `resource path [ID].property: reason` diagnostics and leaves the previous publication intact. Successful publication deep-copies the authored graph; `definition(id)` returns another detached copy. Runtime callers cannot mutate the internal catalog through a returned nested Resource. Definitions remain read-only by convention.

Validation covers missing/null categories and visuals, duplicate/malformed IDs, category-correct references, supported effects/targets/weapons, contiguous authored ranks/caps, costs, six nonnegative integer weights with positive total, numeric bounds, eight ordered scoring categories with increasing positive rational multipliers, and strictly increasing XP thresholds starting at zero. The provisional XP thresholds are 0 and 100; progression is not implemented.

## Versions and arithmetic

Schema, content, rules, generator and RNG versions start at **1**. Engine/template build is **4.7.2.stable.official.ed1daf0bf**. The validator checks both the manifest declaration and actual running engine. Unknown schema/rules/generator/RNG versions reject. Content revisions may increase, but the application's existing session rejects a different content version on reload. Bump content revision whenever changing authored rules or balance.

`RuleLimits` caps ordinary authored values and each weight at 1,000,000. Six weights sum to at most 6,000,000. Basis-point stat bounds cannot exceed 10,000. Base power plus 30 times pip scale must fit 1,000,000. Individual rational operands are bounded before multiplication; two factors can produce at most 10^12, well below signed int64 overflow. Scoring-order cross products use the same bound.

`floor_ratio(value, numerator, denominator)` uses integer division on nonnegative values, rejects invalid inputs with -1, and never multiplies oversized operands. This is an arithmetic foundation; Phase 4 still owns the complete damage/mitigation/clamp pipeline.

## Runtime ownership

The existing application-owned `SessionShell` now owns a `HeroState`, optional `BattleState`, `RngStreams`, content versions and accepted-operation revisions. It retains the existing mode/identity API for State Charts.

`ActorState` owns independent HP/MP/SP current/max/reserved arrays, stats, learned ranks, training and `StatusState` instances. `HeroState` adds item instances and committed gold. `ItemState` owns its instance ID, quantity and rolled modifiers. Battle enemies own their pools; the hero's pools live **only** in the session hero, never a second battle copy. Battle data includes phase, selection, target, hand, kept flags, reroll allowance and locked inputs. Phase 4 will implement their transitions and effects.

Explicit copies isolate nested runtime state and RNG; observations contain only copied values. No Nodes, State Charts states, LimboAI blackboards, dialogue objects or quest pools enter authoritative state. The shell initializes a hero once after valid loading and does not refill it on subsequent catalog loads. Domain seeds currently use a fixed development seed of zero; expedition seed selection is a later consuming feature.

## Randomness

`RngStreams` owns only `generation`, `combat`, `ai` and `loot`. Enchanting remains reserved for its profile-owned Phase 9 stream; cosmetic randomness is outside this collection.

Derivation version 1:

1. Encode UTF-8 `rebirth-rng-v1\n<signed decimal root seed>\n<stream name>`, with no trailing newline.
2. Compute SHA-256.
3. Read the first eight digest bytes in big-endian order and clear the highest bit.

The resulting nonnegative 63-bit seed initializes a Godot `RandomNumberGenerator`. Fixed seed-42 vectors were calculated independently with Python hashlib and frozen in the tests. Dictionary insertion order and Godot's general-purpose hash never participate.

`RngStream.bounded(n)` uses raw uint32 rejection sampling: discard samples at or above `2^32 - (2^32 mod n)`, then reduce modulo n. It rejects invalid bounds before drawing. `WeightedDice` maps the bounded integer into cumulative weight intervals, validates the complete hand/subset/profile first, and samples indices in increasing order. It returns a replacement hand without modifying the input. Finite test sources report exhaustion rather than wrap; a failed batch restores their cursor.

Snapshots contain engine, RNG version, root seed and four seed/state pairs. RNG version and all int64 transport fields are canonical decimal **strings**, preserving JSON round trips. Restore validates all streams first, verifies each derived seed, sets seed before state, and publishes without drawing. Bad metadata, overflow, missing/extra streams or numeric/coerced seed/state values leave the existing collection unchanged. This is same-engine in-memory continuation, not a durable save implementation.

## Command and addon boundary

The first domain command is `select_skill`. Its exact intent fields are:

```text
session_id: int
expected_revision: int
operation_id: String
kind: "select_skill"
actor_id: String
skill_id: String
target_id: String
```

`CommandResolver.parse_intent` rejects missing/extra fields and type coercion. `resolve` checks session/revision, duplicate operation, supported command, active living hero, pre-roll battle phase, content versions, learned/authored rank, weapon, living encounter target and affordability. It constructs a candidate session and ordered `skill_selected` event only after validation. Neither rejection nor accepted selection draws RNG or pays/reserves resources. Phase 4 will add rolls, costs and turns.

`DungeonApplication.submit_intent` is the inward boundary for future adapters. It publishes the accepted candidate once, updates view identity, and emits copied observations and accepted-result dictionaries. Reentrant publication callbacks are blocked. Rejected commands emit no accepted event. The pure resolver exposes its candidate only to application code; presentation receives only result observations. State Charts remains the sole application mode chart. No production LimboAI, QuestSystem or Dialogue Manager gameplay integration was added.

The shell's battle destination still advertises a navigation fixture and does not create a playable battle. Tests construct an isolated in-memory battle to verify this boundary. Phase 6 must insert checkpoint durability before candidate/event publication; there is no disk-save guarantee here.

## Verification

Run `python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot`. It runs catalog, RNG, command, loading, baseline, shell and addon fixtures, the intentional negative run, runtime smoke and all five resource-pack checks. Packs must retain every authored content Resource and exclude tests/docs/research/tools. See [the evidence record](evidence/phase-2/README.md) for exact results and rendered invalid-content fixtures.
