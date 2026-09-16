extends RefCounted
## Phase 11 seeded dungeon assembly. Pure rules: explicit authored tables, one
## RNG adapter and a definition lookup; no nodes, input, files or wall time.
## Layout payloads are plain value data and persist inside the exploration
## capture, so a run restores its exact generated layout instead of regenerating.
const Stream = preload("res://scripts/domain/rules/rng_stream.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")

const GENERATOR_VERSION := 1
## The shared room template is 480 px wide and authored rooms join at x+560.
const SPACING := 560.0
const ROOM_WIDTH := 480.0
const ROOMS_MIN := 2
const ROOMS_MAX := 8
## Pending run item cap shared with encounter drops; nothing grants past it.
const MAX_DROPS := 64
## Canonical wire shapes:
##   rooms    [{"room_id": String, "x": float, "y": float, "label": String}]
##   bindings [{"encounter_id": String, "room_id": String, "required": bool, "label": String}]
## Labels carry the authored display names so the world adapter rebuilds the
## exact presentation from the saved layout without consulting the catalog.

## Generated layout identifier; authored layouts keep "undercrypt.v1".
static func layout_id(def: Resource) -> String:
	return "%s.g%d" % [str(def.id).trim_prefix("dungeon."), GENERATOR_VERSION]

## One seeded expedition layout. Draws happen in a pinned order: mid-slot count,
## then per attempt the room picks, then per empty mid room one optional draw.
## Exhausted attempts fall back to the deterministic known-valid layout, so the
## command still yields a traversable dungeon. Returns {"error": String} only
## when even the fallback cannot satisfy the authored tables (blocked at publish).
static func generate(def: Resource, lookup: Callable, stream: Stream, run_seed: int, world_id: String) -> Dictionary:
	if def == null or not stream is Stream or lookup == null or not lookup.is_valid():
		return {"error": "dungeon_tables"}
	var span: int = int(def.mids_max) - int(def.mids_min) + 1
	if span < 1: return {"error": "dungeon_tables"}
	var drawn: int = stream.bounded(span)
	if drawn < 0: return {"error": "dungeon_tables"}
	var mids: int = int(def.mids_min) + drawn
	for attempt: int in maxi(1, int(def.attempts)):
		var rooms: Array = _assemble_rooms(def, lookup, stream, mids)
		if rooms.is_empty(): continue
		var bindings: Variant = _place_encounters(def, lookup, stream, rooms)
		if bindings == null: continue
		var payload := _payload(def, rooms, bindings, run_seed, world_id)
		if not validate(payload.rooms, payload.bindings, payload.exit_room_id, def, lookup).is_empty():
			continue
		return payload
	var fallback := fallback_layout(def, lookup, world_id, run_seed)
	if fallback.is_empty() or not validate(fallback.rooms, fallback.bindings, fallback.exit_room_id, def, lookup).is_empty():
		return {"error": "dungeon_generation_unavailable"}
	return fallback

## Known-valid fallback: the first depth-first chain through the authored pool
## with the minimum mid count and no optional encounters. Deterministic and
## RNG-free; catalog publication proves it validates, so generated runs always
## keep a completable shape even under a hostile seed. The requested run seed
## is kept so the saved layout still records its expedition identity.
static func fallback_layout(def: Resource, lookup: Callable, world_id: String, run_seed: int = 0) -> Dictionary:
	if def == null or lookup == null or not lookup.is_valid(): return {}
	var entry: Resource = lookup.call(str(def.entry_room_id))
	var exit_room: Resource = lookup.call(str(def.exit_room_id))
	if entry == null or exit_room == null: return {}
	var chain := _first_chain(def, lookup, int(def.mids_min), str(entry.east_connector))
	if chain.is_empty(): return {}
	var rooms := _rooms_payload(chain, lookup)
	var bindings: Array = []
	var occupied := {}
	for required_id: String in def.required_encounters:
		var host := _first_host(rooms, lookup, required_id, occupied)
		if host.is_empty(): return {}
		var encounter: Resource = lookup.call(required_id)
		if encounter == null: return {}
		bindings.append(_binding(required_id, host, true, str(encounter.display_name)))
		occupied[host] = true
	return _payload(def, rooms, bindings, run_seed, world_id)

## Full structural validation for saved or freshly generated layouts: bounds,
## template-chain positions, overlap, connector matching, room reachability via
## the entry chain, encounter hosting, required coverage and exit access. Used
## by the generator, the save codec and tests; authored legacy layouts keep
## their own strict equality records instead of this generator contract.
static func validate(rooms: Variant, bindings: Variant, exit_room_id: Variant, def: Resource, lookup: Callable) -> PackedStringArray:
	var errors := PackedStringArray()
	if def == null or lookup == null or not lookup.is_valid():
		errors.append("dungeon: missing tables or lookup")
		return errors
	if not rooms is Array or not bindings is Array or not exit_room_id is String:
		errors.append("layout: wrong wire shape")
		return errors
	if rooms.size() < ROOMS_MIN or rooms.size() > ROOMS_MAX:
		errors.append("layout: expected %d..%d rooms" % [ROOMS_MIN, ROOMS_MAX])
		return errors
	var ids := {}
	var depths := {}
	var room_defs := {}
	for index: int in rooms.size():
		var entry: Variant = rooms[index]
		if not entry is Dictionary or not _room_shape(entry):
			errors.append("layout[%d]: wrong room shape" % index)
			return errors
		var room_id := str(entry.room_id)
		if room_id.is_empty() or ids.has(room_id):
			errors.append("layout[%d]: missing or duplicate room id" % index)
			continue
		ids[room_id] = true
		depths[room_id] = index
		var definition: Resource = lookup.call(room_id)
		if definition == null:
			errors.append("layout[%d]: unresolved room %s" % [index, room_id])
			continue
		room_defs[room_id] = definition
		if not _same_number(entry.x, float(index) * SPACING) or not _same_number(entry.y, 0.0):
			errors.append("layout[%d]: position leaves the template chain" % index)
	for index: int in rooms.size():
		for other: int in range(index + 1, rooms.size()):
			if absf(float(rooms[index].x) - float(rooms[other].x)) < ROOM_WIDTH:
				errors.append("layout: rooms %d and %d overlap" % [index, other])
	if str(rooms[0].room_id) != str(def.entry_room_id):
		errors.append("layout: entry must be " + str(def.entry_room_id))
	if exit_room_id.is_empty() or exit_room_id != str(def.exit_room_id) or str(rooms[rooms.size() - 1].room_id) != exit_room_id:
		errors.append("layout: exit must close the chain at " + str(def.exit_room_id))
	# Connector matching keeps the shared template corridor at navigation clearance.
	var entry_def: Resource = room_defs.get(str(rooms[0].room_id))
	if entry_def != null and not str(entry_def.west_connector).is_empty():
		errors.append("connectors: entry room must open west-free")
	for index: int in range(rooms.size() - 1):
		var left: Resource = room_defs.get(str(rooms[index].room_id))
		var right: Resource = room_defs.get(str(rooms[index + 1].room_id))
		if left == null or right == null: continue
		var east := str(left.east_connector)
		if east.is_empty() or east != str(right.west_connector):
			errors.append("connectors: %s does not join %s" % [rooms[index].room_id, rooms[index + 1].room_id])
	var exit_def: Resource = room_defs.get(exit_room_id)
	if exit_def != null and not str(exit_def.east_connector).is_empty():
		errors.append("connectors: exit room must end the chain")
	# Encounter bindings: stable catalog ids, one host each, whitelisted hosting.
	var seen := {}
	var hosts := {}
	var required_seen := {}
	for index: int in bindings.size():
		var record: Variant = bindings[index]
		if not record is Dictionary or not _binding_shape(record):
			errors.append("bindings[%d]: wrong shape" % index)
			return errors
		var encounter_id := str(record.encounter_id)
		var room_id := str(record.room_id)
		if encounter_id.is_empty() or seen.has(encounter_id):
			errors.append("bindings[%d]: missing or duplicate encounter" % index)
			continue
		seen[encounter_id] = true
		if lookup.call(encounter_id) == null:
			errors.append("bindings[%d]: unresolved encounter %s" % [index, encounter_id])
		if not ids.has(room_id) or hosts.has(room_id):
			errors.append("bindings[%d]: unknown or occupied host room" % index)
			continue
		hosts[room_id] = true
		var room: Resource = room_defs.get(room_id)
		var whitelist: PackedStringArray = room.encounter_ids if room != null else PackedStringArray()
		if not whitelist.is_empty() and not whitelist.has(encounter_id):
			errors.append("bindings[%d]: %s refuses %s" % [index, room_id, encounter_id])
		if bool(record.required):
			required_seen[encounter_id] = true
			if not PackedStringArray(def.required_encounters).has(encounter_id):
				errors.append("bindings[%d]: %s is not an authored required encounter" % [index, encounter_id])
		else:
			if not _optional_ids(def).has(encounter_id):
				errors.append("bindings[%d]: %s is not in the optional pool" % [index, encounter_id])
			elif _optional_min_depth(def, encounter_id) > int(depths.get(room_id, 0)):
				errors.append("bindings[%d]: %s is too shallow for its minimum depth" % [index, encounter_id])
	for required_id: String in def.required_encounters:
		if not required_seen.has(required_id):
			errors.append("bindings: required encounter %s is missing" % required_id)
	return errors

## Validate one decoded layout payload dictionary (save codec entry point).
static func validate_payload(payload: Dictionary, def: Resource, lookup: Callable) -> PackedStringArray:
	for key: String in ["layout_id", "world_id", "run_seed", "rooms", "bindings", "exit_room_id"]:
		if not payload.has(key): return PackedStringArray(["layout: missing " + key])
	if str(payload.layout_id) != layout_id(def): return PackedStringArray(["layout: unknown layout id"])
	if typeof(payload.run_seed) != TYPE_INT or int(payload.run_seed) < 0 or int(payload.run_seed) > Limits.VALUE_MAX:
		return PackedStringArray(["layout: run seed out of range"])
	if str(payload.world_id) != str(def.id): return PackedStringArray(["layout: world mismatch"])
	return validate(payload.rooms, payload.bindings, payload.exit_room_id, def, lookup)

## Seeded chain assembly: one weighted pick per mid slot. Rooms must join the
## previous east connector, must not repeat unless authored, and the final mid
## room must also join the authored exit. Any dead end fails the attempt.
static func _assemble_rooms(def: Resource, lookup: Callable, stream: Stream, mids: int) -> Array:
	var entry: Resource = lookup.call(str(def.entry_room_id))
	var exit_room: Resource = lookup.call(str(def.exit_room_id))
	if entry == null or exit_room == null: return []
	var chain: Array[String] = [str(def.entry_room_id)]
	var used := {str(def.entry_room_id): true}
	var previous_east := str(entry.east_connector)
	for slot: int in range(1, mids + 1):
		var candidates: Array = []
		for pick: Variant in def.mid_pool:
			if not pick is Dictionary: continue
			var room_id := str(pick.get("room_id", ""))
			var room: Resource = lookup.call(room_id)
			if room == null: continue
			if previous_east.is_empty() or str(room.west_connector) != previous_east: continue
			if slot == mids and str(room.east_connector) != str(exit_room.west_connector): continue
			if not bool(pick.get("allow_repeat", false)) and used.has(room_id): continue
			candidates.append({"room_id": room_id, "weight": int(pick.get("weight", 0))})
		var index := _weighted(stream, candidates)
		if index < 0: return []
		chain.append(str(candidates[index].room_id))
		used[str(candidates[index].room_id)] = true
		previous_east = str(lookup.call(str(candidates[index].room_id)).east_connector)
	chain.append(str(def.exit_room_id))
	return _rooms_payload(chain, lookup)

## Required encounters first (depth order, whitelisted hosts), then one optional
## draw per remaining mid room whose authored minimum depth is met. Returns
## null only when a required encounter cannot be hosted; the attempt retries.
static func _place_encounters(def: Resource, lookup: Callable, stream: Stream, rooms: Array):
	var bindings: Array = []
	var occupied := {}
	var placed := {}
	for required_id: String in def.required_encounters:
		var host := _first_host(rooms, lookup, required_id, occupied)
		if host.is_empty(): return null
		var encounter: Resource = lookup.call(required_id)
		if encounter == null: return null
		bindings.append(_binding(required_id, host, true, str(encounter.display_name)))
		occupied[host] = true
		placed[required_id] = true
	for depth: int in range(1, rooms.size()):
		var room_id := str(rooms[depth].room_id)
		if occupied.has(room_id): continue
		var candidates: Array = []
		for pick: Variant in def.optional_pool:
			if not pick is Dictionary: continue
			var encounter_id := str(pick.get("encounter_id", ""))
			if encounter_id.is_empty() or placed.has(encounter_id): continue
			if int(pick.get("min_depth", 1)) > depth: continue
			if not _hosts(lookup.call(room_id), encounter_id): continue
			candidates.append({"encounter_id": encounter_id, "weight": int(pick.get("weight", 0))})
		# One reserved outcome means "leave this room empty"; it keeps pacing honest.
		var index := _weighted(stream, candidates, 1)
		if index <= 0: continue
		var chosen: String = str(candidates[index - 1].encounter_id)
		var encounter: Resource = lookup.call(chosen)
		if encounter == null: continue
		bindings.append(_binding(chosen, room_id, false, str(encounter.display_name)))
		occupied[room_id] = true
		placed[chosen] = true
	return bindings

## First unoccupied room at depth 1+ that can host the encounter. Entry rooms
## never host; the exit room can, matching the authored vault guardian.
static func _first_host(rooms: Array, lookup: Callable, encounter_id: String, occupied: Dictionary) -> String:
	for depth: int in range(1, rooms.size()):
		var room_id := str(rooms[depth].room_id)
		if occupied.has(room_id): continue
		if _hosts(lookup.call(room_id), encounter_id): return room_id
	return ""

static func _hosts(room: Resource, encounter_id: String) -> bool:
	if room == null: return false
	var whitelist: PackedStringArray = room.encounter_ids
	return whitelist.is_empty() or whitelist.has(encounter_id)

## Weighted pick over bounded authored weights. `extra` reserves one leading
## "none" outcome so callers can distinguish an authored skip from a candidate.
static func _weighted(stream: Stream, candidates: Array, extra: int = 0) -> int:
	var total: int = extra
	for candidate: Variant in candidates:
		if not candidate is Dictionary: return -1
		var weight := int(candidate.get("weight", 0))
		if weight < 1 or weight > Limits.WEIGHT_MAX: return -1
		total += weight
	if total < 1 or total > Limits.WEIGHT_MAX * (candidates.size() + 1): return -1
	var draw := stream.bounded(total)
	if draw < 0: return -1
	var cursor: int = extra
	for index: int in candidates.size():
		cursor += int(candidates[index].get("weight", 0))
		if draw < cursor: return index + extra
	return -1

## Deterministic RNG-free DFS in authored pool order for the fallback chain.
static func _first_chain(def: Resource, lookup: Callable, mids: int, entry_east: String) -> Array[String]:
	var exit_room: Resource = lookup.call(str(def.exit_room_id))
	if exit_room == null: return []
	var chain: Array[String] = [str(def.entry_room_id)]
	return _dfs(def, lookup, chain, {str(def.entry_room_id): true}, entry_east, mids, exit_room)

static func _dfs(def: Resource, lookup: Callable, chain: Array[String], used: Dictionary, previous_east: String, remaining: int, exit_room: Resource) -> Array[String]:
	if remaining == 0:
		if previous_east.is_empty() or str(exit_room.west_connector) != previous_east: return []
		var done: Array[String] = chain.duplicate()
		done.append(str(def.exit_room_id))
		return done
	for pick: Variant in def.mid_pool:
		if not pick is Dictionary: continue
		var room_id := str(pick.get("room_id", ""))
		var room: Resource = lookup.call(room_id)
		if room == null: continue
		if previous_east.is_empty() or str(room.west_connector) != previous_east: continue
		if not bool(pick.get("allow_repeat", false)) and used.has(room_id): continue
		chain.append(room_id)
		used[room_id] = true
		var found := _dfs(def, lookup, chain, used, str(room.east_connector), remaining - 1, exit_room)
		if not found.is_empty(): return found
		used.erase(room_id)
		chain.pop_back()
	return []

static func _rooms_payload(chain: Array[String], lookup: Callable) -> Array:
	var rooms: Array = []
	for index: int in chain.size():
		var definition: Resource = lookup.call(chain[index])
		var label := str(definition.display_name) if definition != null else chain[index]
		rooms.append({"room_id": chain[index], "x": float(index) * SPACING, "y": 0.0, "label": label})
	return rooms

static func _binding(encounter_id: String, room_id: String, required: bool, label: String) -> Dictionary:
	return {"encounter_id": encounter_id, "room_id": room_id, "required": required, "label": label}

static func _payload(def: Resource, rooms: Array, bindings: Array, run_seed: int, world_id: String) -> Dictionary:
	return {"layout_id": layout_id(def), "world_id": str(def.id) if world_id.is_empty() else str(world_id),
		"run_seed": run_seed, "rooms": rooms, "bindings": bindings, "exit_room_id": str(def.exit_room_id)}

static func _room_shape(entry: Dictionary) -> bool:
	if entry.size() != 3 and entry.size() != 4: return false
	for key: String in ["room_id", "x", "y"]:
		if not entry.has(key): return false
	if entry.has("label") and (typeof(entry.label) != TYPE_STRING or str(entry.label).strip_edges().is_empty()):
		return false
	if typeof(entry.x) not in [TYPE_FLOAT, TYPE_INT] or typeof(entry.y) not in [TYPE_FLOAT, TYPE_INT]: return false
	return is_finite(entry.x) and is_finite(entry.y)

static func _binding_shape(record: Dictionary) -> bool:
	if record.size() != 4: return false
	for key: String in ["encounter_id", "room_id", "required", "label"]:
		if not record.has(key): return false
	return typeof(record.required) == TYPE_BOOL

static func _optional_ids(def: Resource) -> PackedStringArray:
	var result := PackedStringArray()
	for pick: Variant in def.optional_pool:
		if pick is Dictionary: result.append(str(pick.get("encounter_id", "")))
	return result

static func _optional_min_depth(def: Resource, encounter_id: String) -> int:
	for pick: Variant in def.optional_pool:
		if pick is Dictionary and str(pick.get("encounter_id", "")) == encounter_id:
			return int(pick.get("min_depth", 1))
	return 1

static func _same_number(left: Variant, right: float) -> bool:
	return typeof(left) in [TYPE_FLOAT, TYPE_INT] and is_finite(left) and absf(float(left) - right) < 0.001