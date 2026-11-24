extends RefCounted

const WIDTH := 8
const HEIGHT := 7
const DIRECTORY := "user://weapon_satchels"

var placements: Dictionary:
	get:
		return _storage.get_placements()
var equipped: String:
	get:
		return _storage.get_equipped_id()

var _catalog: Dictionary = {}
var _character_id: String = ""
var _storage := Storage.new()


func open(character_id: String, catalog: Dictionary) -> void:
	_storage = Storage.new()
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
	var loaded := Storage.new()
	var held: String = parsed["equipped"]
	if not held.is_empty():
		var main_hand := _create_weapon(held)
		if main_hand == null or not loaded.main_hand.equip(main_hand):
			return
	for id: String in parsed["placements"]:
		var point: Variant = parsed["placements"][id]
		if id == held or not point is Array or point.size() != 2:
			return
		if not _valid_coordinate(point[0], WIDTH) or not _valid_coordinate(point[1], HEIGHT):
			return
		var item := _create_weapon(id)
		if item == null or not loaded.grid.add_item_at(item, Vector2i(int(point[0]), int(point[1]))):
			return
	_storage = loaded


func owns(id: String) -> bool:
	return not id.is_empty() and (equipped == id or _storage.find_in_bag(id) != null)


func take(id: String) -> String:
	if not _catalog.has(id):
		return "Unknown weapon."
	if owns(id):
		return "You already have this weapon."
	var item := _create_weapon(id)
	var next := _storage.copy()
	if item == null or not next.bag.add_item(item):
		return "There is no room for this sword."
	return _commit(next)


func equip(id: String) -> String:
	if id == equipped:
		return ""
	if _storage.find_in_bag(id) == null:
		return "Take this weapon first."
	var next := _storage.copy()
	var previously_equipped := next.main_hand.get_item()
	if not next.main_hand.equip(next.find_in_bag(id)):
		return "Could not equip this weapon."
	if previously_equipped != null and not next.bag.add_item(previously_equipped):
		return "Make room for your equipped weapon first."
	return _commit(next)


func return_to_rack(id: String) -> String:
	if not owns(id):
		return "This weapon is not in your satchel."
	var next := _storage.copy()
	if id == equipped:
		next.main_hand.clear()
	else:
		next.bag.remove_item(next.find_in_bag(id))
	return _commit(next)


func _create_weapon(id: String) -> InventoryItem:
	if not _catalog.has(id):
		return null
	var data: Dictionary = _catalog[id]
	var item_size := Vector2i(int(data["width"]), int(data["height"]))
	if item_size.x < 1 or item_size.y < 1:
		return null
	return _storage.create_weapon(id, item_size)


func _valid_coordinate(value: Variant, limit: int) -> bool:
	return (value is int or value is float) and value >= 0 and value < limit and value == floor(value)


func _commit(next: Storage) -> String:
	if _character_id.is_empty():
		return "No character is selected."
	if DirAccess.make_dir_recursive_absolute(DIRECTORY) != OK:
		return "Could not create weapon storage."
	# Keep the existing per-character file format. Publish the new GLoot state only after saving.
	var serialized := {}
	var next_placements := next.get_placements()
	for id in next_placements:
		var cell: Vector2i = next_placements[id]
		serialized[id] = [cell.x, cell.y]
	var path := DIRECTORY.path_join(_character_id + ".json")
	var temporary := path + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return "Could not save weapons."
	file.store_string(JSON.stringify({"placements": serialized, "equipped": next.get_equipped_id()}))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		DirAccess.remove_absolute(temporary)
		return "Could not save weapons."
	if DirAccess.rename_absolute(temporary, path) != OK:
		DirAccess.remove_absolute(temporary)
		return "Could not finish saving weapons."
	_storage = next
	return ""


class Storage extends RefCounted:
	const WEAPON_PROTOTYPE := "sword"
	const CATALOG_ID := "catalog_id"
	static var _protoset := _create_protoset()
	static var _active_storages := 0

	var bag := Inventory.new()
	var grid := GridConstraint.new()
	var main_hand := ItemSlot.new()


	func _init() -> void:
		bag.protoset = _protoset
		var prototypes := bag.get_prototree()
		if prototypes.is_empty():
			prototypes.deserialize(_protoset)
		_active_storages += 1
		grid.size = Vector2i(WIDTH, HEIGHT)
		grid.insertion_priority = GridConstraint.INSERTION_PRIORITY_HORIZONTAL
		bag.add_child(grid)
		main_hand.protoset = _protoset


	func _notification(what: int) -> void:
		if what == NOTIFICATION_PREDELETE:
			var prototypes := bag.get_prototree()
			bag.free()
			main_hand.free()
			_active_storages -= 1
			# GLoot caches the tree. Clear its prototype references when the last inventory closes.
			if _active_storages == 0:
				prototypes.clear()


	static func _create_protoset() -> JSON:
		var protoset := JSON.new()
		protoset.data = {WEAPON_PROTOTYPE: {}}
		return protoset


	func create_weapon(id: String, item_size: Vector2i) -> InventoryItem:
		var item := bag.create_item(WEAPON_PROTOTYPE)
		item.set_property(CATALOG_ID, id)
		item.set_property("size", item_size)
		return item


	func find_in_bag(id: String) -> InventoryItem:
		for item in bag.get_items():
			if item.get_property(CATALOG_ID) == id:
				return item
		return null


	func get_placements() -> Dictionary:
		var result := {}
		for item in bag.get_items():
			result[item.get_property(CATALOG_ID)] = grid.get_item_position(item)
		return result


	func get_equipped_id() -> String:
		var item := main_hand.get_item()
		return "" if item == null else item.get_property(CATALOG_ID)


	func copy() -> Storage:
		var next := Storage.new()
		for item in bag.get_items():
			next.grid.add_item_at(item.duplicate(), grid.get_item_position(item))
		var item := main_hand.get_item()
		if item != null:
			next.main_hand.equip(item.duplicate())
		return next
