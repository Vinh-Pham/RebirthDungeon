extends RefCounted
## Local character profiles. All returned dictionaries are independent copies.

const Rooms = preload("res://scripts/threshold_rooms.gd")
const Skills = preload("res://scripts/character_skills.gd")
const DIRECTORY := "user://characters"
const MAX_SEED := 2147483647
const MAX_EXPERIENCE := 2_000_000_000
const MAX_UNIX_TIME := 253402300799
const LIMITS := {
	"lineage": [0, 2], "body": [0, 2], "age": [17, 25],
	"hair": [0, 3], "hair_color": [0, 3], "skin": [0, 3],
	"eyes": [0, 2], "eye_color": [0, 3], "face": [0, 2], "talent": [0, 2]
}
const TOWNS := ["lantern_rest", "spindle_hollow"]
const LOOT_BALANCE_KEYS := {"gold": "gold", "tonic": "tonics"}
const GEAR_SLOTS := ["off_hand", "armor", "headgear", "gloves", "shoes", "accessory_1", "accessory_2"]
const SHOP_SUPPLIES := ["arrow", "bolt", "altar_of_restoration"]
const WORLD_DEFAULTS := {
	"location": "lantern_rest", "map_position": {}, "visited": [], "gates": [], "quest": 0,
	"gold": 24, "tonics": 0, "health": -1, "dungeon_from": "lantern_rest",
	"pending_loot": {}, "skills": Skills.STARTING, "spent_ap": 0,
	"quick_slots": ["", "", "", ""],
	"armor_owned": false, "equipment_durability": {},
	"starter_sword_claimed": false, "gear_inventory": {}, "shop_supplies": {},
	"threshold_cleared": 0, "threshold_treasure_claimed": false, "threshold_treasure_chest": -1, "threshold_run": 0,
	"town_materials": {"fish": 0, "grain": 0, "flour": 0, "fiber": 0, "thread": 0, "cloth": 0, "cobweb": 0, "firewood": 0},
	"tree_harvests": {},
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


static func save_map_position(character_id: String, location: String, cell: Vector2i, room := -1, run := -1) -> bool:
	var profile := load_selected()
	if profile.is_empty() or profile["id"] != character_id:
		return false
	var world: Dictionary = profile["world"]
	var position := {"location": location, "x": cell.x, "y": cell.y}
	if location == "threshold":
		position["room"] = room
		position["run"] = run
	position = _normalize_map_position(position, world)
	if position.is_empty():
		return false
	if world["map_position"] == position:
		return true
	world["map_position"] = position
	return _write_profile(profile, DIRECTORY.path_join(character_id + ".json"))


static func _merge_world(current: Dictionary, changes: Dictionary) -> Dictionary:
	var merged := current.duplicate(true)
	for key in changes:
		if not WORLD_DEFAULTS.has(key):
			return {}
		merged[key] = changes[key]
	return _normalize_world(merged)


static func advance_skill(id: String) -> Dictionary:
	var profile := load_selected()
	return _save_skill_result(Skills.advance(profile, id)) if not profile.is_empty() else {}


static func learn_skill(id: String) -> Dictionary:
	var profile := load_selected()
	return _save_skill_result(Skills.learn(profile, id)) if not profile.is_empty() else {}


static func study_skill(id: String) -> Dictionary:
	var profile := load_selected()
	return _save_skill_result(Skills.study(profile["world"], id)) if not profile.is_empty() else {}


static func _save_skill_result(result: Dictionary) -> Dictionary:
	if not result.has("changes"):
		return result
	var saved := update_world(result["changes"])
	if saved.is_empty():
		return {"message": "Could not save your skill progress."}
	return {"profile": saved, "message": result["message"]}


static func supports_loot_item(item_id: Variant) -> bool:
	return LOOT_BALANCE_KEYS.has(item_id) or WORLD_DEFAULTS["town_materials"].has(item_id)


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
	if not world["town_materials"] is Dictionary:
		return {}
	var materials: Dictionary = WORLD_DEFAULTS["town_materials"].duplicate()
	for material in world["town_materials"]:
		if not materials.has(material) or not _integer_in_range(world["town_materials"][material], 0, MAX_EXPERIENCE):
			return {}
		materials[material] = int(world["town_materials"][material])
	world["town_materials"] = materials
	world["tree_harvests"] = _normalize_tree_harvests(world["tree_harvests"])
	if not world["pending_loot"] is Dictionary:
		return {}
	var pending_loot := {}
	for item_id in world["pending_loot"]:
		if not supports_loot_item(item_id) or not _integer_in_range(world["pending_loot"][item_id], 1, MAX_EXPERIENCE):
			return {}
		pending_loot[item_id] = int(world["pending_loot"][item_id])
	world["pending_loot"] = pending_loot
	var skills: Variant = Skills.normalize(world["skills"])
	if skills == null or not _integer_in_range(world["spent_ap"], 0, MAX_EXPERIENCE):
		return {}
	world["skills"] = skills
	world["spent_ap"] = int(world["spent_ap"])
	if not world["armor_owned"] is bool or not world["equipment_durability"] is Dictionary:
		return {}
	var durability := {}
	for item_id in world["equipment_durability"]:
		if not item_id is String or item_id.is_empty() or not _integer_in_range(world["equipment_durability"][item_id], 0, 1000000):
			return {}
		durability[item_id] = int(world["equipment_durability"][item_id])
	world["equipment_durability"] = durability
	var gear: Variant = _normalize_gear_inventory(world["gear_inventory"])
	if gear == null or not world["starter_sword_claimed"] is bool or not world["shop_supplies"] is Dictionary:
		return {}
	world["gear_inventory"] = gear
	var supplies := {}
	for id in world["shop_supplies"]:
		var count: Variant = world["shop_supplies"][id]
		if id not in SHOP_SUPPLIES or not _integer_in_range(count, 1, MAX_EXPERIENCE):
			return {}
		supplies[id] = int(count)
	world["shop_supplies"] = supplies
	var bounds := {"quest": [0, 3], "gold": [0, MAX_EXPERIENCE], "tonics": [0, MAX_EXPERIENCE], "health": [-1, 2500], "threshold_cleared": [0, Rooms.ROOM_COUNT], "threshold_run": [0, MAX_EXPERIENCE], "threshold_treasure_chest": [-1, Rooms.CHEST_COUNT - 1]}
	for key in bounds:
		if not _integer_in_range(world[key], bounds[key][0], bounds[key][1]):
			return {}
		world[key] = int(world[key])
	if not world["threshold_treasure_claimed"] is bool:
		return {}
	if world["threshold_treasure_chest"] >= 0 and not world["threshold_treasure_claimed"]:
		return {}
	if world["threshold_treasure_claimed"] and world["threshold_cleared"] != Rooms.ROOM_COUNT:
		return {}
	world["map_position"] = _normalize_map_position(world["map_position"], world)
	return world


static func _normalize_tree_harvests(value: Variant) -> Dictionary:
	var trees := {}
	if not value is Dictionary:
		return trees
	for key in value:
		var state: Variant = value[key]
		if not key is String or not state is Dictionary:
			continue
		var parts: PackedStringArray = key.split(":")
		if parts.size() != 3 or parts[0] not in TOWNS or not parts[1].is_valid_int() or not parts[2].is_valid_int():
			continue
		if not _integer_in_range(state.get("count"), 0, 4) or not _integer_in_range(state.get("next_at"), 1, MAX_UNIX_TIME):
			continue
		trees[key] = {"count": int(state["count"]), "next_at": int(state["next_at"])}
	return trees


static func _normalize_map_position(value: Variant, world: Dictionary) -> Dictionary:
	if not value is Dictionary or value.get("location") != world["location"]:
		return {}
	var location: String = world["location"]
	if location != "threshold" and location not in TOWNS:
		return {}
	var x: Variant = value.get("x")
	var y: Variant = value.get("y")
	if not _integer_in_range(x, 0, MAX_SEED) or not _integer_in_range(y, 0, MAX_SEED):
		return {}
	var position := {"location": location, "x": int(x), "y": int(y)}
	if location == "threshold":
		var room: Variant = value.get("room")
		var run: Variant = value.get("run")
		if not _integer_in_range(room, 0, world["threshold_cleared"]) or not _integer_in_range(run, world["threshold_run"], world["threshold_run"]):
			return {}
		position["room"] = int(room)
		position["run"] = int(run)
	return position


static func _normalize_gear_inventory(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	if value.is_empty():
		return {}
	if not value.get("placements") is Dictionary or not value.get("equipped") is String or not value.get("slots", {}) is Dictionary:
		return null
	var seen := {}
	var equipped: String = value["equipped"]
	if not equipped.is_empty():
		seen[equipped] = true
	var placements := {}
	for id in value["placements"]:
		var coordinates: Variant = value["placements"][id]
		if not id is String or id.is_empty() or seen.has(id) or not coordinates is Array or coordinates.size() != 2:
			return null
		if not _integer_in_range(coordinates[0], 0, 7) or not _integer_in_range(coordinates[1], 0, 6):
			return null
		seen[id] = true
		placements[id] = [int(coordinates[0]), int(coordinates[1])]
	var slots := {}
	for slot in value.get("slots", {}):
		var id: Variant = value["slots"][slot]
		if slot not in GEAR_SLOTS or not id is String or id.is_empty() or seen.has(id):
			return null
		seen[id] = true
		slots[slot] = id
	return {"placements": placements, "equipped": equipped, "slots": slots}


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
