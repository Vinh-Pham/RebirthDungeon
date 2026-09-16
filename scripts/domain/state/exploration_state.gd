extends RefCounted
## Explicit continuation; never contains scenes, Nodes, Resources or RIDs.
## The Phase 10 nave adds the optional dual-sentinel encounter east of the vault.
const LAYOUT = [{"room_id":"room.threshold","x":0.0,"y":0.0},{"room_id":"room.gallery","x":560.0,"y":0.0},{"room_id":"room.sanctum","x":1120.0,"y":0.0},{"room_id":"room.nave","x":1680.0,"y":0.0}]
## Captures written before the nave exist keep restoring: the layout is
## validated against this legacy record as well as the current one.
const LEGACY_LAYOUT = [{"room_id":"room.threshold","x":0.0,"y":0.0},{"room_id":"room.gallery","x":560.0,"y":0.0},{"room_id":"room.sanctum","x":1120.0,"y":0.0}]
## Phase 11 authored bindings for the legacy layout records. Captures written
## before generated layouts keep restoring through these defaults, which mirror
## the authored Undercrypt scene exactly (the exit sits inside the vault).
const LEGACY_BINDINGS = [
	{"encounter_id":"encounter.gallery","room_id":"room.gallery","required":true,"label":"Crypt sentinel"},
	{"encounter_id":"encounter.sanctum","room_id":"room.sanctum","required":true,"label":"Crypt sentinel"},
	{"encounter_id":"encounter.dual","room_id":"room.nave","required":false,"label":"Twin watch"}]
const LEGACY_EXIT = "room.sanctum"
const LEGACY_SMALL_BINDINGS = [
	{"encounter_id":"encounter.gallery","room_id":"room.gallery","required":true,"label":"Crypt sentinel"},
	{"encounter_id":"encounter.sanctum","room_id":"room.sanctum","required":true,"label":"Crypt sentinel"}]
## Authored layouts keep this id; generated expeditions write "undercrypt.g1"
## with the bounded run seed drawn on the generation stream. Restoration never
## regenerates: the saved layout is authoritative across engine changes.
var layout_id: String = "undercrypt.v1"
var rooms: Array = LAYOUT.duplicate(true)
var bindings: Array = LEGACY_BINDINGS.duplicate(true)
var exit_room_id: String = LEGACY_EXIT
## Zero marks an authored layout.
var run_seed: int = 0
var pending_gold: int = 0
var progression: Dictionary = {}
var world_id: String = "dungeon.undercrypt"
var position_x: float = 96.0
var position_y: float = 160.0
var discovered: Array[String] = ["room.threshold"]
var resolved: Array[String] = []
var active_encounter: String = ""

func entry_room_id() -> String:
	return str(rooms[0].room_id) if not rooms.is_empty() else "room.threshold"

func required_encounters() -> Array[String]:
	var result: Array[String] = []
	for record: Variant in bindings:
		if record is Dictionary and bool(record.required): result.append(str(record.encounter_id))
	return result

func outstanding_required() -> Array[String]:
	var result: Array[String] = []
	for id: String in required_encounters():
		if not resolved.has(id): result.append(id)
	return result

func capture() -> Dictionary:
	return {"progression":progression.duplicate(true),"layout_id":layout_id,"layout":rooms.duplicate(true),
		"bindings":bindings.duplicate(true),"exit_room_id":exit_room_id,"run_seed":run_seed,
		"pending_gold": pending_gold, "world_id": world_id, "position": {"x": position_x, "y": position_y},
		"discovered": discovered.duplicate(), "resolved": resolved.duplicate(),
		"active_encounter": active_encounter}

func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.layout_id = layout_id
	result.rooms = rooms.duplicate(true)
	result.bindings = bindings.duplicate(true)
	result.exit_room_id = exit_room_id
	result.run_seed = run_seed
	result.pending_gold = pending_gold
	result.progression = progression.duplicate(true)
	result.world_id = world_id
	result.position_x = position_x
	result.position_y = position_y
	result.discovered = discovered.duplicate()
	result.resolved = resolved.duplicate()
	result.active_encounter = active_encounter
	return result
