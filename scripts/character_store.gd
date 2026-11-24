extends RefCounted
## Local character profiles. All returned dictionaries are independent copies.

const DIRECTORY := "user://characters"
const MAX_SEED := 2147483647
const MAX_EXPERIENCE := 2_000_000_000
const LIMITS := {
	"lineage": [0, 2], "body": [0, 2], "age": [17, 25],
	"hair": [0, 3], "hair_color": [0, 3], "skin": [0, 3],
	"eyes": [0, 2], "eye_color": [0, 3], "face": [0, 2], "talent": [0, 2]
}
const TOWNS := ["lantern_rest", "spindle_hollow"]
const WORLD_DEFAULTS := {
	"location": "arrival", "visited": [], "gates": [], "quest": 0,
	"gold": 24, "tonics": 0, "health": -1, "dungeon_from": "lantern_rest",
	"quick_slots": ["", "", "", ""],
}
static var _selected_id: String = ""


static func list_characters() -> Array[Dictionary]:
	var characters: Array[Dictionary] = []
	var directory := DirAccess.open(DIRECTORY)
	if directory == null:
		return characters
	for filename in directory.get_files():
		if filename.ends_with(".json"):
			var profile := _read(filename.trim_suffix(".json"))
			if not profile.is_empty():
				characters.append(profile)
	characters.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return str(a["name"]).naturalnocasecmp_to(str(b["name"])) < 0)
	return characters


static func create(profile: Dictionary) -> Dictionary:
	var normalized := _normalize(profile)
	if normalized.is_empty():
		return {}
	var error := DirAccess.make_dir_recursive_absolute(DIRECTORY)
	if error != OK:
		push_error("Unable to create character storage.")
		return {}
	var crypto := Crypto.new()
	var id := crypto.generate_random_bytes(16).hex_encode()
	if id.length() != 32:
		return {}
	var destination := DIRECTORY.path_join(id + ".json")
	if FileAccess.file_exists(destination):
		return {}
	normalized["id"] = id
	normalized["seed"] = randi_range(1, MAX_SEED)
	normalized["experience"] = 0
	normalized["world"] = WORLD_DEFAULTS.duplicate(true)
	return normalized if _write_profile(normalized, destination) else {}


static func award_experience(amount: int, world_changes: Dictionary = {}) -> Dictionary:
	var profile := load_selected()
	if profile.is_empty() or amount < 0 or (amount == 0 and world_changes.is_empty()):
		return {}
	var world := _merge_world(profile["world"], world_changes)
	if world.is_empty():
		return {}
	profile["world"] = world
	var total := int(profile["experience"])
	profile["experience"] = total + mini(amount, MAX_EXPERIENCE - total)
	var destination := DIRECTORY.path_join(_selected_id + ".json")
	return profile if _write_profile(profile, destination) else {}


static func update_world(changes: Dictionary) -> Dictionary:
	var profile := load_selected()
	if profile.is_empty():
		return {}
	var world := _merge_world(profile["world"], changes)
	if world.is_empty():
		return {}
	profile["world"] = world
	var destination := DIRECTORY.path_join(_selected_id + ".json")
	return profile if _write_profile(profile, destination) else {}


static func _merge_world(current: Dictionary, changes: Dictionary) -> Dictionary:
	var merged := current.duplicate(true)
	for key in changes:
		if not WORLD_DEFAULTS.has(key):
			return {}
		merged[key] = changes[key]
	return _normalize_world(merged)


static func _normalize_world(value: Variant) -> Dictionary:
	if not value is Dictionary:
		return {}
	var world := WORLD_DEFAULTS.duplicate(true)
	for key in WORLD_DEFAULTS:
		if value.has(key):
			world[key] = value[key]
	if not world["location"] is String or not ["arrival", "lantern_rest", "threshold", "spindle_hollow"].has(world["location"]):
		return {}
	if not world["dungeon_from"] is String or not TOWNS.has(world["dungeon_from"]):
		return {}
	for key in ["visited", "gates"]:
		if not world[key] is Array:
			return {}
		var towns: Array[String] = []
		for town in world[key]:
			if not town is String or not TOWNS.has(town):
				return {}
			if not towns.has(town):
				towns.append(town)
		world[key] = towns
	for gate in world["gates"]:
		if not world["visited"].has(gate):
			return {}
	var slots: Variant = world["quick_slots"]
	if not slots is Array or slots.size() != 4:
		return {}
	for item in slots:
		if not item is String or item not in ["", "tonic"]:
			return {}
	world["quick_slots"] = slots.duplicate()
	var bounds := {"quest": [0, 3], "gold": [0, MAX_EXPERIENCE], "tonics": [0, MAX_EXPERIENCE], "health": [-1, 2500]}
	for key in bounds:
		if not _integer_in_range(world[key], bounds[key][0], bounds[key][1]):
			return {}
		world[key] = int(world[key])
	return world


static func _write_profile(profile: Dictionary, destination: String) -> bool:
	var temporary := destination + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		push_error("Unable to save character.")
		return false
	file.store_string(JSON.stringify(profile, "\t"))
	file.flush()
	var write_error := file.get_error()
	file.close()
	if write_error != OK:
		DirAccess.remove_absolute(temporary)
		return false
	if DirAccess.rename_absolute(temporary, destination) != OK:
		DirAccess.remove_absolute(temporary)
		push_error("Unable to finish saving character.")
		return false
	return true


static func select_character(id: String) -> bool:
	if _read(id).is_empty():
		return false
	_selected_id = id
	return true


static func load_selected() -> Dictionary:
	return _read(_selected_id)


static func _read(id: String) -> Dictionary:
	if id.length() != 32 or not id.is_valid_hex_number(false):
		return {}
	var filename := DIRECTORY.path_join(id + ".json")
	if not FileAccess.file_exists(filename):
		return {}
	var file := FileAccess.open(filename, FileAccess.READ)
	if file == null:
		return {}
	var parser := JSON.new()
	if parser.parse(file.get_as_text()) != OK:
		return {}
	var data: Variant = parser.data
	if not data is Dictionary or data.get("id") != id:
		return {}
	var normalized := _normalize(data)
	if normalized.is_empty() or not _integer_in_range(data.get("seed"), 1, MAX_SEED):
		return {}
	normalized["id"] = id
	normalized["seed"] = int(data["seed"])
	var experience: Variant = data.get("experience", 0)
	if not _integer_in_range(experience, 0, MAX_EXPERIENCE):
		return {}
	normalized["experience"] = int(experience)
	var world := _normalize_world(data.get("world", {}))
	if world.is_empty():
		return {}
	normalized["world"] = world
	return normalized


static func _normalize(profile: Dictionary) -> Dictionary:
	if not profile.get("name") is String:
		return {}
	var character_name: String = profile["name"].strip_edges()
	if character_name.is_empty() or character_name.length() > 24:
		return {}
	for index in character_name.length():
		if character_name.unicode_at(index) < 32 or character_name.unicode_at(index) == 127:
			return {}
	var normalized := {"name": character_name}
	for key in LIMITS:
		var bounds: Array = LIMITS[key]
		var value: Variant = profile.get(key)
		if not _integer_in_range(value, bounds[0], bounds[1]):
			return {}
		normalized[key] = int(value)
	return normalized


static func _integer_in_range(value: Variant, minimum: int, maximum: int) -> bool:
	if not (value is int or value is float):
		return false
	return is_finite(float(value)) and float(value) == floor(float(value)) and value >= minimum and value <= maximum
