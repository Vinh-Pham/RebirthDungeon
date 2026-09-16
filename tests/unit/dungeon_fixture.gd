extends RefCounted
## Phase 11: seeded dungeon generation, structural validation, persistence,
## loot tables and the bindings-driven exit gate.
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const D = preload("res://scripts/domain/rules/dungeon_rules.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const Stream = preload("res://scripts/domain/rules/rng_stream.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")

var failures := PackedStringArray()
var checks := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Dungeon: " + label)

func catalog() -> RefCounted:
	return H.new().catalog()

func lookup(c: RefCounted) -> Callable:
	return Callable(c, "definition")

func seeded_layout(c: RefCounted, def: Resource, seed_value: int, session_id: int) -> Dictionary:
	return D.generate(def, lookup(c), Stream.new(seed_value), (seed_value * 7 + session_id) % (Limits.VALUE_MAX + 1), "dungeon.undercrypt")

func signature(payload: Dictionary) -> String:
	var rooms := PackedStringArray()
	for record: Variant in payload.rooms: rooms.append(str(record.room_id))
	var optional := PackedStringArray()
	for record: Variant in payload.bindings:
		if not bool(record.required): optional.append(str(record.encounter_id))
	return "%s|%s" % [";".join(rooms), ";".join(optional)]

## Synthetic valid chain for validator negatives: threshold -> oratory -> nave
## -> sanctum with two required guardians and the optional twin watch at depth 2.
func synthetic_rooms() -> Array:
	return [
		{"room_id":"room.threshold","x":0.0,"y":0.0,"label":"The threshold"},
		{"room_id":"room.oratory","x":560.0,"y":0.0,"label":"The echoing oratory"},
		{"room_id":"room.nave","x":1120.0,"y":0.0,"label":"The flooded nave"},
		{"room_id":"room.sanctum","x":1680.0,"y":0.0,"label":"The quiet vault"}]

func synthetic_bindings() -> Array:
	return [
		{"encounter_id":"encounter.gallery","room_id":"room.oratory","required":true,"label":"Crypt sentinel"},
		{"encounter_id":"encounter.sanctum","room_id":"room.sanctum","required":true,"label":"Crypt sentinel"},
		{"encounter_id":"encounter.dual","room_id":"room.nave","required":false,"label":"Twin watch"}]

func synthetic_payload(def: Resource) -> Dictionary:
	return {"layout_id":D.layout_id(def),"world_id":"dungeon.undercrypt","run_seed":42,
		"rooms":synthetic_rooms(),"bindings":synthetic_bindings(),"exit_room_id":"room.sanctum"}

func town_session(c: RefCounted, session_id: int = 1) -> SessionShell:
	var s := H.new().session(c)
	s.session_id = session_id
	s.battle = null
	s.exploration = null
	s.mode = SessionShell.Mode.TOWN
	return s

func enter_intent(s: SessionShell) -> Dictionary:
	return {"session_id":s.session_id,"expected_revision":s.revision,"operation_id":"enter:%d" % s.revision,
		"kind":"enter_dungeon","actor_id":"hero","skill_id":"","target_id":"entrance.undercrypt"}

func run() -> PackedStringArray:
	var c := catalog()
	var def: Resource = c.definition("dungeon.undercrypt")
	check(def != null, "authored dungeon tables publish with the catalog")
	if def == null: return finished()

	# Determinism: identical seed and session identity reproduce one layout.
	var first := seeded_layout(c, def, 11, 1)
	var again := seeded_layout(c, def, 11, 1)
	check(not first.has("error") and first == again, "same seed and session reproduce one layout")

	# Seed sweep: every layout validates; lengths and optional presence vary.
	var signatures := {}
	var lengths := {}
	var with_optional := 0
	var without_optional := 0
	for seed_value: int in range(1, 121):
		var payload := seeded_layout(c, def, seed_value, 1)
		var errors: PackedStringArray = D.validate_payload(payload, def, lookup(c))
		if not errors.is_empty():
			check(false, "seed %d produced an invalid layout: %s" % [seed_value, errors[0]])
			break
		var optional_count := 0
		for record: Variant in payload.bindings:
			if not bool(record.required): optional_count += 1
		if optional_count > 0: with_optional += 1
		else: without_optional += 1
		signatures[signature(payload)] = true
		lengths[int(payload.rooms.size())] = true
	check(signatures.size() > 1, "seeds produce varied layouts (%d distinct in 120)" % signatures.size())
	check(lengths.size() > 1, "layout length follows the authored pacing range")
	check(with_optional > 0 and without_optional > 0, "optional guardian presence varies with the seed")

	# Bounded attempt budget: a hostile pool exhausts attempts and the
	# deterministic known-valid fallback still produces a valid expedition.
	var hostile: Resource = def.duplicate()
	# Bounded attempt budget: a pool that cannot assemble the drawn depth
	# exhausts its attempts and returns the deterministic known-valid layout.
	var hostile_pool: Array[Dictionary] = [
		{"room_id":"room.gallery","weight":1,"allow_repeat":false},
		{"room_id":"room.nave","weight":1,"allow_repeat":false}]
	hostile.mid_pool = hostile_pool
	var fallback := seeded_layout(c, hostile, 5, 1)
	check(not fallback.has("error"), "hostile seed falls back instead of failing")
	check(str(fallback.get("layout_id","")) == D.layout_id(def), "fallback keeps the generated layout id")
	var fallback_errors := PackedStringArray()
	if fallback.has("error"):
		fallback_errors.append("error")
	else:
		fallback_errors = D.validate_payload(fallback, def, lookup(c))
	check(fallback_errors.is_empty(), "known-valid fallback passes structural validation")
	var ids := PackedStringArray()
	if not fallback.has("error"):
		for record: Variant in fallback.rooms: ids.append(str(record.room_id))
	check(";".join(ids) == "room.threshold;room.gallery;room.nave;room.sanctum", "fallback is the authored minimum chain")
	var impossible: Resource = def.duplicate()
	var impossible_pool: Array[Dictionary] = [{"room_id":"room.nave","weight":1,"allow_repeat":false}]
	impossible.mid_pool = impossible_pool
	impossible.required_encounters = PackedStringArray(["encounter.dual"])
	impossible.attempts = 2
	var broken := D.generate(impossible, lookup(c), Stream.new(3), 3, "dungeon.undercrypt")
	check(broken.has("error"), "unsatisfiable tables report an explicit generator error")

	# Validator negatives: each mutation lands on a fresh synthetic chain.
	var mutations := [
		["overlap", func(p: Dictionary) -> void: p.rooms[1].x = 100.0],
		["position", func(p: Dictionary) -> void: p.rooms[2].y = 8.0],
		["unresolved room", func(p: Dictionary) -> void: p.rooms[2].room_id = "room.atrium"],
		["duplicate room", func(p: Dictionary) -> void: p.rooms[2].room_id = "room.oratory"],
		["exit access", func(p: Dictionary) -> void: p.exit_room_id = "room.nave"],
		["missing required", func(p: Dictionary) -> void: p.bindings.remove_at(0)],
		["unknown encounter", func(p: Dictionary) -> void: p.bindings[0].encounter_id = "encounter.ghost"],
		["occupied host", func(p: Dictionary) -> void: p.bindings[0].room_id = "room.nave"],
		["run seed", func(p: Dictionary) -> void: p.run_seed = -1],
		["world mismatch", func(p: Dictionary) -> void: p.world_id = "dungeon.other"],
		["layout id", func(p: Dictionary) -> void: p.layout_id = "undercrypt.v9"]]
	for mutation: Variant in mutations:
		var payload := synthetic_payload(def)
		mutation[1].call(payload)
		var errors: PackedStringArray = D.validate_payload(payload, def, lookup(c))
		check(not errors.is_empty(), "validator rejects %s" % mutation[0])
	# Whitelist and minimum-depth refusals need their own chain.
	var mirror := {"layout_id":D.layout_id(def),"world_id":"dungeon.undercrypt","run_seed":1,
		"rooms":[{"room_id":"room.threshold","x":0.0,"y":0.0,"label":"t"},{"room_id":"room.gallery","x":560.0,"y":0.0,"label":"g"},
			{"room_id":"room.nave","x":1120.0,"y":0.0,"label":"n"},{"room_id":"room.sanctum","x":1680.0,"y":0.0,"label":"s"}],
		"bindings":[{"encounter_id":"encounter.gallery","room_id":"room.gallery","required":true,"label":"g"},
			{"encounter_id":"encounter.sanctum","room_id":"room.sanctum","required":true,"label":"s"},
			{"encounter_id":"encounter.dual","room_id":"room.nave","required":false,"label":"w"}],
		"exit_room_id":"room.sanctum"}
	check(D.validate_payload(mirror, def, lookup(c)).is_empty(), "authored mirror chain validates")
	var refuses: Dictionary = mirror.duplicate(true)
	refuses.bindings.remove_at(2)  # drop the optional twin watch
	refuses.bindings[0].room_id = "room.nave"  # free room, but a dual-only guardian hall
	check(str(D.validate_payload(refuses, def, lookup(c))).contains("refuses"), "guardian rooms refuse foreign encounters")
	var deep: Resource = def.duplicate()
	var deep_optional_pool: Array[Dictionary] = [{"encounter_id":"encounter.dual","weight":2,"min_depth":3}]
	deep.optional_pool = deep_optional_pool
	var shallow: Dictionary = mirror.duplicate(true)
	check(str(D.validate_payload(shallow, deep, lookup(c))).contains("shallow"), "optional guardians respect their minimum depth")
	return finished()

func run_part2() -> PackedStringArray:
	var c := catalog()

	# Resolver: generation runs on the candidate only; rejected entries draw
	# nothing that reaches the session.
	var s := town_session(c)
	var before: Dictionary = s.rng.capture()
	var result := R.resolve(s, R.parse_intent(enter_intent(s)), c)
	check(result.accepted, "generated expedition accepted: " + result.code)
	check(str(result.candidate.exploration.layout_id).begins_with("undercrypt.g"), "entry records a generated layout id")
	check(result.candidate.exploration.rooms.size() >= 3 and result.candidate.exploration.bindings.size() >= 2, "generated exploration carries rooms and bindings")
	var entry_discovered: Array = result.candidate.exploration.discovered
	check(entry_discovered.size() == 1 and str(entry_discovered[0]) == str(result.candidate.exploration.rooms[0].room_id), "only the entry room starts discovered")
	check(result.candidate.rng.capture().streams.generation != before.streams.generation, "generation stream advanced on the candidate")
	check(s.rng.capture() == before, "accepted entry leaves the published session untouched")
	# Resolution is pure: re-resolving the same command replays the same
	# candidate without touching the published session.
	var replay := R.resolve(s, R.parse_intent(enter_intent(s)), c)
	check(replay.accepted and replay.candidate.exploration.rooms == result.candidate.exploration.rooms, "re-resolution reproduces the same candidate")
	check(s.rng.capture() == before, "rejected entry leaves the session RNG unchanged")

	# Session identity mixes into the run seed.
	var twin := town_session(c, 2)
	var other := R.resolve(twin, R.parse_intent(enter_intent(twin)), c)
	check(other.accepted, "second session entry accepted")
	check(int(other.candidate.exploration.run_seed) != int(result.candidate.exploration.run_seed), "session identity varies the run seed")

	# Authored drop tables: guaranteed required drops draw no RNG; bonus rolls
	# follow the pinned order on the independent loot stream.
	var run := H.new().session(c)
	run.mode = SessionShell.Mode.DUNGEON
	run.exploration = Exploration.new()
	P.initialize(run.hero, c)
	P.begin(run)
	var battle: RefCounted = run.battle
	battle.encounter_id = "encounter.gallery"
	var fresh_loot: Dictionary = run.rng.stream("loot").capture()
	P.encounter(run, c)
	check(_pending(run, "item.focus_page_one") == 1, "first required victory grants its authored drop")
	check(run.rng.stream("loot").capture() == fresh_loot, "required drops draw no loot RNG")
	P.encounter(run, c)
	check(run.exploration.progression.items.size() == 1, "repeat victories grant nothing (evidence dedup)")
	battle.encounter_id = "encounter.sanctum"
	P.encounter(run, c)
	check(_pending(run, "item.focus_page_two") == 1, "second required victory grants its authored drop")
	battle.encounter_id = "encounter.dual"
	var probe := Stream.new()
	check(probe.restore(fresh_loot), "loot stream capture restores")
	var first_roll := probe.bounded(10000)
	var first_hit: bool = first_roll >= 0 and first_roll < 4000
	if first_hit: probe.bounded(1)
	var second_roll := probe.bounded(10000)
	var second_hit: bool = second_roll >= 0 and second_roll < 1500
	if second_hit: probe.bounded(1)
	P.encounter(run, c)
	check(run.rng.stream("loot").capture() == probe.capture(), "bonus draws follow the pinned order exactly")
	if first_hit: check(_pending(run, "item.powder") == 1, "chance hit grants the authored bonus item")
	else: check(_pending(run, "item.powder") == 0, "chance miss grants nothing")
	if second_hit: check(_pending(run, "item.scroll_fortunate") == 1, "second bonus roll grants its item")
	else: check(_pending(run, "item.scroll_fortunate") == 0, "second bonus miss grants nothing")

	# Exit gate: bindings decide; optional guardians never block.
	var gate := H.new().session(c)
	gate.mode = SessionShell.Mode.DUNGEON
	gate.exploration = Exploration.new()
	P.initialize(gate.hero, c)
	P.begin(gate)
	gate.battle.encounter_id = "encounter.gallery"
	P.encounter(gate, c)
	gate.exploration.resolved.append("encounter.gallery")
	check(not P.finish(gate, true, c).is_empty(), "one outstanding guardian seals the exit")
	gate.battle.encounter_id = "encounter.sanctum"
	P.encounter(gate, c)
	gate.exploration.resolved.append("encounter.sanctum")
	check(P.finish(gate, true, c).is_empty(), "required guardians resolved open the exit with the twin watch outstanding")
	return finished()

func run_part3() -> PackedStringArray:
	var c := catalog()

	# In-memory checkpoint preserves the whole generated layout.
	var s := town_session(c)
	var generated := R.resolve(s, R.parse_intent(enter_intent(s)), c).candidate
	var battle_session := H.new().session(c)
	battle_session.exploration = generated.exploration.copy()
	check(battle_session.exploration.required_encounters().has("encounter.gallery"), "generated layout always binds the authored sentinels")
	battle_session.exploration.active_encounter = "encounter.gallery"
	var entry: Array = battle_session.exploration.discovered
	entry.clear()
	entry.append(str(battle_session.exploration.rooms[0].room_id))
	var data: Dictionary = Capture.capture(battle_session)
	var restored: SessionShell = Capture.restore(data, c)
	check(restored != null and restored.exploration.capture() == battle_session.exploration.capture(), "in-memory checkpoint round-trips the generated layout")

	# Disk codec: generated layouts survive encode/decode and reject edits.
	var codec := Codec.new()
	var text := codec.encode(battle_session, 1)
	var decoded: Dictionary = codec.decode(text, c)
	check(decoded.status == "ok" and decoded.session.exploration.capture() == battle_session.exploration.capture(), "disk checkpoint round-trips the generated layout")
	var wire: Dictionary = Capture.capture(battle_session)
	wire.exploration.layout[1].x = 100.0
	check(codec.decode(H.new().rewrap(wire, 1), c).status != "ok", "overlapping saved layout rejected")
	var foreign: Dictionary = Capture.capture(battle_session)
	foreign.exploration.bindings[0].encounter_id = "encounter.ghost"
	check(codec.decode(H.new().rewrap(foreign, 1), c).status != "ok", "unresolved saved binding rejected")
	var distant: Dictionary = Capture.capture(battle_session)
	var seen: Array = distant.exploration.discovered
	seen.append("room.nave")
	check(codec.decode(H.new().rewrap(distant, 1), c).status != "ok", "discovery outside the saved layout rejected")

	# Legacy migration: authored captures gain bindings, exit and seed.
	var legacy: Dictionary = Capture.capture(H.new().session(c))
	legacy.exploration.erase("bindings")
	legacy.exploration.erase("exit_room_id")
	legacy.exploration.erase("run_seed")
	var migrated: Dictionary = codec.decode(H.new().rewrap(legacy, 1), c)
	check(migrated.status == "ok", "pre-phase-11 checkpoint decodes after migration")
	if migrated.status == "ok":
		var migrated_bindings: Array = migrated.session.exploration.bindings
		check(migrated_bindings == Exploration.LEGACY_BINDINGS, "authored layout migrates to its binding records")
		check(str(migrated.session.exploration.exit_room_id) == Exploration.LEGACY_EXIT and int(migrated.session.exploration.run_seed) == 0, "migrated expedition keeps the authored exit and zero seed")
		var open: SessionShell = migrated.session
		var resolved: Array = open.exploration.resolved
		resolved.assign(["encounter.gallery","encounter.sanctum"])
		check(P.finish(open, true, c).is_empty(), "migrated expedition keeps its exit condition")
	return finished()

func _pending(s: SessionShell, item_id: String) -> int:
	var total := 0
	for record: Variant in s.exploration.progression.items:
		if record is Dictionary and str(record.id) == item_id: total += int(record.quantity)
	return total

func finished() -> PackedStringArray:
	print("DUNGEON_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL", checks])
	return failures
