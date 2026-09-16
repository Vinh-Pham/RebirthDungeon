# Phase 11: Procedural dungeons and content expansion

Status: **Complete for host acceptance (2026-09-15).** Dependencies: 7; 8–10 for dependent rewards.

## Seeded generation contract

`scripts/domain/rules/dungeon_rules.gd` owns generation as pure static rules:
explicit authored tables (`content/dungeon/undercrypt.tres`), one RNG adapter
(the session's independent `generation` stream) and a definition lookup. It
never touches nodes, input, files or wall time. The generator:

1. Draws the mid-slot count inside the authored `mids_min..mids_max` pacing
   range with one bounded draw.
2. Assembles a chain entry → mids → exit with one weighted pick per slot. A
   candidate room must join the previous room's east connector kind
   (`arch.stone` / `arch.flooded`), must not repeat unless authored
   (`allow_repeat`), and the final mid room must also join the authored exit.
   Any dead end fails the attempt.
3. Places the authored required encounters (`encounter.gallery`,
   `encounter.sanctum`) in depth order into whitelisted host rooms, then draws
   at most one optional guardian per remaining mid room whose authored
   minimum depth is met; one reserved outcome leaves a room empty.
4. Repeats inside the authored attempt budget (`attempts`, 24). Exhausted
   attempts fall back to `fallback_layout`: a deterministic, RNG-free
   depth-first chain through the authored pool that catalog publication proves
   validates. The requested run seed is preserved on the fallback.

The run seed is `(bounded generation-stream draw + session_id) % 1_000_001`,
so expeditions differ across runs and sessions while staying reproducible.
`layout_id` records the generator version (`undercrypt.g1`); the save
envelope already pins schema, content, rules, generator, RNG and engine
versions, and the layout itself is persisted, so a run never regenerates.

## Validation

`DungeonRules.validate` is the single structural validator, used by the
generator, the save codec and the fixtures. It checks room count bounds,
exact template-chain positions (`x = index × 560`, `y = 0`), pairwise
overlap, entry/exit identity, connector matching along the whole chain
(which keeps the shared room template's corridor clearance), encounter
binding shapes, whitelisted hosting, one guardian per room, required
coverage, optional-pool membership and minimum depth, and the bounded run
seed. Invalid commands still change neither state nor RNG: generation runs
on the resolver's candidate, and a rejected entry discards it wholesale.

Authored-table feasibility is proven at catalog publication: the validator
requires every required encounter to have a possible host and runs
`fallback_layout` through full structural validation for every authored
dungeon. A hostile seed can only cost the attempt budget, never
completability.

## Persistence

`exploration_state.capture()` now records `layout_id`, `layout` (rooms with
stable IDs, template positions and authored display labels), `bindings`
(`encounter_id`, `room_id`, `required`, `label`), `exit_room_id` and
`run_seed`. The save codec validates authored layouts against their strict
legacy equality records and generated layouts against
`DungeonRules.validate_payload`, in addition to catalog membership,
discovery ⊆ saved rooms, and `active_encounter` ∈ saved bindings. Captures
written before Phase 11 migrate structurally (`_migrate_phase11`): authored
layouts gain their binding records, exit room and a zero run seed, without a
format or content-version bump. The in-memory checkpoint DTO carries the
same fields. Restoration never regenerates.

## Content, encounters and loot

New authored content: `DungeonDefinition` tables, connector fields on
`RoomDefinition`, rooms `oratory`, `crypt`, `hall` and the Undercrypt
tables in the catalog. `hall` (stone↔stone) exists because exhaustive seed
sweeps showed three-mid chains were impossible with only alternating arch
kinds — the fixtures exercise worst-case tables deliberately.

`Progression.encounter(session, catalog)` now consumes authored drop tables
instead of hardcoded sentinel pages:

- `required_drops` grant one entry per distinct required victory, in
  authored order, with no RNG (focus pages keep their quest pacing in every
  generated layout);
- `bonus_drops` roll per distinct victory on the independent `loot` stream
  in authored order: one chance draw, then one bounded quantity draw on a
  hit. A full pending bundle (64) skips further draws without consuming RNG.

The exit gate is bindings-driven: `finish()` and the HUD panel require every
required binding in `resolved`; optional guardians never block the return
arch.

## Presentation and addons

`dungeon.tscn` is now a shell; `world.gd` rebuilds rooms, discovery gates,
encounter markers and the exit arch from the saved layout (labelled records
keep presentation faithful without catalog access; authored titles cover
legacy records). Camera limits derive from the installed extent, and
discovery masking keeps hidden rooms out of view; no transition targets an
undiscovered room. Quest evidence continues to key on the same stable
catalog encounter IDs, so generated bindings satisfy the authored quest
objectives. LimboAI trees bind per encounter definition exactly as before —
generation only re-places them. Floors, additional towns, gathering and
cooking remain excluded: no complete consuming rules are authored yet
(recorded disposition, revisit with their own feature contracts).

Engine references used: navigation map synchronization before querying and
`RandomNumberGenerator.seed`/`state` determinism are documented in the
retained official snapshots `.firecrawl/godot-navigation.md`,
`.firecrawl/godot-rng.md` and `.firecrawl/godot-rng-class.md`.

## Verification

See [evidence](evidence/phase11/README.md). Fixture additions:
`tests/unit/dungeon_fixture.gd` (determinism, 120-seed sweep, attempt
budget/fallback, validator negatives, resolver RNG isolation, session-identity
mixing, drop tables with pinned loot-stream order, bindings-driven exit gate,
in-memory/disk round trips, legacy migration and mutated-payload rejection)
and a binding-driven rewrite of the exploration walk; save, town, quest,
progression and combat suites continue to pass unchanged in their contracts.
