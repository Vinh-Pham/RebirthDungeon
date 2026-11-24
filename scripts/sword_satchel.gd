extends RefCounted

const WIDTH := 8
const HEIGHT := 7
const DIRECTORY := "user://weapon_satchels"

var placements: Dictionary = {}
var equipped: String = ""
var _catalog: Dictionary = {}
var _character_id: String = ""


func open(character_id: String, catalog: Dictionary) -> void:
	placements = {}
	equipped = ""
	_catalog = catalog
	_character_id = ""
	if character_id.length() != 32 or not character_id.is_valid_hex_number(false):
		return
	_character_id = character_id
	var path := DIRECTORY.path_join(character_id + ".json")
	if not FileAccess.file_exists(path):
		return
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or not parsed.get("placements") is Dictionary or not parsed.get("equipped") is String:
		return
	var loaded: Dictionary = {}
	var held: String = parsed["equipped"]
	if not held.is_empty() and not _catalog.has(held):
		return
	for id in parsed["placements"]:
		var point: Variant = parsed["placements"][id]
		if not _catalog.has(id) or id == held or not point is Array or point.size() != 2:
			return
		if not _integer(point[0]) or not _integer(point[1]):
			return
		var cell := Vector2i(int(point[0]), int(point[1]))
		if not _fits(id, cell, loaded):
			return
		loaded[id] = cell
	placements = loaded
	equipped = held


func owns(id: String) -> bool:
	return not id.is_empty() and (equipped == id or placements.has(id))


func take(id: String) -> String:
	if not _catalog.has(id):
		return "Unknown weapon."
	if owns(id):
		return "You already have this weapon."
	var cell := _first_fit(id, placements)
	if cell.x < 0:
		return "There is no room for this sword."
	var next := placements.duplicate()
	next[id] = cell
	return _commit(next, equipped)


func equip(id: String) -> String:
	if id == equipped:
		return ""
	if not placements.has(id):
		return "Take this weapon first."
	var next := placements.duplicate()
	next.erase(id)
	if not equipped.is_empty():
		var cell := _first_fit(equipped, next)
		if cell.x < 0:
			return "Make room for your equipped weapon first."
		next[equipped] = cell
	return _commit(next, id)


func return_to_rack(id: String) -> String:
	if not owns(id):
		return "This weapon is not in your satchel."
	var next := placements.duplicate()
	next.erase(id)
	return _commit(next, "" if equipped == id else equipped)


func _integer(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floor(float(value))


func _fits(id: String, cell: Vector2i, occupied: Dictionary) -> bool:
	var item: Dictionary = _catalog[id]
	var extent := Vector2i(int(item["width"]), int(item["height"]))
	if extent.x <= 0 or extent.y <= 0 or cell.x < 0 or cell.y < 0 or cell.x + extent.x > WIDTH or cell.y + extent.y > HEIGHT:
		return false
	var rect := Rect2i(cell, extent)
	for other_id in occupied:
		var other: Dictionary = _catalog[other_id]
		if rect.intersects(Rect2i(occupied[other_id], Vector2i(int(other["width"]), int(other["height"])))):
			return false
	return true


func _first_fit(id: String, occupied: Dictionary) -> Vector2i:
	for y in HEIGHT:
		for x in WIDTH:
			var cell := Vector2i(x, y)
			if _fits(id, cell, occupied):
				return cell
	return Vector2i(-1, -1)


func _commit(next: Dictionary, held: String) -> String:
	if _character_id.is_empty():
		return "No character is selected."
	if DirAccess.make_dir_recursive_absolute(DIRECTORY) != OK:
		return "Could not create weapon storage."
	var serialized := {}
	for id in next:
		var cell: Vector2i = next[id]
		serialized[id] = [cell.x, cell.y]
	var path := DIRECTORY.path_join(_character_id + ".json")
	var temporary := path + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return "Could not save weapons."
	file.store_string(JSON.stringify({"placements": serialized, "equipped": held}))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		DirAccess.remove_absolute(temporary)
		return "Could not save weapons."
	if DirAccess.rename_absolute(temporary, path) != OK:
		DirAccess.remove_absolute(temporary)
		return "Could not finish saving weapons."
	placements = next
	equipped = held
	return ""
