# Phase 2 foundations

Implemented 2026-09-07. The architecture and gameplay specifications remain the owning contracts. This document records the concrete starter format and provisional values, not completed combat, inventory, progression or save systems.

## Content boundary

`JacksonContentRepository` implements `ContentRepository`. A supplied `ContentSource` reads paths relative to `assets/data`; the simulation performs no reads. Loading order is always `manifest.json`, its `rules` file, then its `visuals` file. There is no filesystem enumeration. Publication is atomic: failed binding, validation or required visual resolution prevents run entry.

The manifest separately identifies schema, content and rules versions. Schema 1 and rules 1 are currently supported. Content version 1 is the bundled revision; change the content version whenever authored rules data changes, and preserve the matching catalog for any future replay. Schema changes require a new loader contract; algorithm changes require rules/generator/seed-derivation version changes as appropriate. A seed alone is not a replay identity. Save compatibility and content retention across application upgrades arrive with persistence.

Content IDs are lowercase namespaced strings (for example `skill.sword`), independent of source filenames. IDs are globally unique across definition categories; references also check the required category. Rank order is explicit, contiguous and zero-based; rank names are unique within a skill and its declared prototype cap is the last authored rank. The prototype entry points are `generation.starter` and `actor.hero`; terrain IDs/codes remain wall=0, floor=1, door=2 and exit=3 until the grid slice replaces that contract. Existing door traversal behavior is still the Phase 1 spike, not Phase 3 door-opening rules.

DTOs remain mutable nullable Jackson beans in `data/content/dto`. Missing required fields, explicit nulls, unknown fields/enums, numeric enum values, duplicate JSON keys, trailing documents, fractional integers, invalid paths, invalid ranges and broken references fail with source/field diagnostics. Six integer face weights must be nonnegative and total 1..2,147,483,647. Loot probabilities use basis points totaling exactly 10,000. Scoring has exactly the eight defined combinations, five dice and two rerolls. Stat terms must reference existing stats, have positive denominators, and form an acyclic graph; primary stats cannot depend on other stats. Progression curves are strictly increasing cumulative thresholds starting at zero.

Game definitions contain no asset paths. Validated collection containers are copied and wrapped as unmodifiable collections, and all elements are immutable values. A `RunSession` pins the catalog object and its version alongside its seed and mutable, serially owned RNG streams. `DungeonSimulation.create` accepts this session; the original session-free overload/default remains for isolated movement fixtures.

`visuals.json` maps definition IDs to a separately validated queued atlas, animation ID and ordered frame names. Terrain uses `static`, actors use `idle`. Loading checks required tile/actor bindings and resolves every frame against the loaded atlas before enabling entry. `DungeonRenderer` consumes those bindings. The enemy temporarily shares the hero's art; enemy gameplay/rendering arrives later.

## Provisional starter data

- Generation: 48×27, generator version 1, four-attempt budget for the later bounded generation pipeline. The prototype Rebuild action remains a manual attempt; automatic reachability checks/retries belong to Phase 3.
- Sword Attack: ranks F and E, visible cap E. F has fair `[1,1,1,1,1,1]` weights; E has `[1,1,1,1,2,2]`. Both cost 5 SP; base power 2/4, pip scale 1, physical-attack contribution. The HP/MP/SP cost vector is explicit at each rank, with zero HP and MP for this sword example. No unimplemented passive, acquisition or equipment dependency is claimed usable.
- Scoring: exact rational multipliers 10, 5, 7/2, 3, 5/2, 2, 3/2, 1 in the specification's combination order. Classification/sampling/damage resolution are Phase 4 work.
- Stats: five primary attributes; authored linear terms for HP/MP/SP maxima, attacks and defenses; bounded percentage protection. These definitions do not implement the modifier/resource calculation pipeline. Resource recovery/regen is not implicit.
- Status examples: +3 STR, −3 STR and −2 WIL for three owner activation ends, each with an explicit stacking group and priority. Future status resolution follows the specification's skip-application-boundary, refresh/replace, expiry and run-end rules.
- Potions: Health Potion restores 20 HP; Unstable Elixir restores 20 MP with the WIL penalty. Consumption and inventory placement are not implemented.
- One hero/enemy, one encounter and one loot table: health potion 75%, elixir 25%, one item per result. Hero cumulative XP thresholds are 0/100/250; the illustrative training curve is 0/100. No rewards or learning are granted yet.

All quantities are authored prototype values. Full acquisition/training/AP tables, additional active/passive skills, equipment, town/recovery catalogs, enchants, quests and titles remain in their consuming phases. Starter exhaustion and encounter-versus-run outcome decisions remain prerequisites for combat; Phase 2 does not settle them.

## Randomness and replay values

`RandomSource.nextInt` uses exclusive positive bounds and rejection sampling from the upper 63 bits of `nextLong`, avoiding modulo bias. Invalid bounds consume no draws. `SequenceRandomSource` is a finite JVM test double and fails on exhaustion.

The adapter's project algorithm ID is `juniper.ace`, state format 1, with five ordered signed 64-bit words from the pinned Juniper `AceRandom`. Restore rejects unknown algorithms, formats, or state counts. Hex transport uses exactly 16 digits per word (including leading zeros); unsigned parsing preserves every bit of negative signed words. Restoring sets all words before the first draw. Future save DTOs must preserve this lossless representation.

Seed derivation version 1 uses the SplitMix64 finalizer with wrapping 64-bit multiplication:

1. `z = (z xor (z >>> 30)) * 0xbf58476d1ce4e5b9`
2. `z = (z xor (z >>> 27)) * 0x94d049bb133111eb`
3. return `z xor (z >>> 31)`

Stream seeds are `mix(runSeed xor fixedTag)`. Tags are generation `0x47454e01`, AI `0x41490001`, combat/dice `0x44494345`, loot `0x4c4f4f54`, and cosmetics `0x56495301`. Never substitute enum ordinals or string hashes. Reserve `0x454e4348` for profile-owned enchanting in Phase 8 and `0x47414348` for isolated development gacha in Phase 13; neither is a run stream. Commerce and initial deterministic gathering draw no randomness.

A floor-attempt seed starts from the generation stream seed, then successively mixes XOR with the zero-based floor index, positive generator version, and zero-based attempt number. Each SquidSquad attempt owns a fresh seeded generator, so failed generation cannot disturb combat/AI/loot. The generation stream is available for future generation decisions; attempt generation never shares its mutable object across workers.

`RunRandomStreams` exports exactly generation, AI, combat and loot states in fixed order. Cosmetics are created separately and cannot be included in authoritative exports/restores. The JVM fixtures prove exact restore continuation and stream independence, including after cosmetic draws. Cross-platform replay portability is not yet claimed.

`MoveCommand` and `CommandResult` are immutable values. `EntityId` is positive and run-local, independent of artemis indices; the one-actor prototype assigns 1. Successful moves export `ActorMoved` with copied old/new cells and an ordered event after `World.process()` finishes. `MovementSnapshot` contains observed movement only, with the latest accepted command/event sequence. Rejections do not change that export; consumers deduplicate by sequence. Future actor allocation, full observations, accepted command logs and restore exports grow in Phase 3.

## Verification

Ordinary JVM tests in `RandomSourceTest` and `data/content/ContentRepositoryTest` cover seeded continuation, full signed/hex state, malformed states, stream isolation, the seed derivation golden vector, bounded sampling rejection, malformed catalogs, references/cycles, actual bundled atlas region names, visual IDs, manifest order and immutable run/snapshot values. Malformed catalogs are generated by focused mutations of the actual bundled JSON, so they exercise the shipping schema. Existing dependency and simulation fixtures remain in the same `:core:check` run.
