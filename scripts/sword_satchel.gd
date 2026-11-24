extends RefCounted

const Store = preload("res://scripts/character_store.gd")
const Gold = preload("res://scripts/gold.gd")
const SLOTS := Store.GEAR_SLOTS
const WIDTH := 8
const HEIGHT := 7
const COBWEB_ID := "cobweb"
const COBWEB_STACK_LIMIT := 99
const MAX_COBWEB_CAPACITY := WIDTH * HEIGHT * COBWEB_STACK_LIMIT
const DIRECTORY := "user://weapon_satchels"

var placements: Dictionary:
	get:
		return _storage.get_placements()
var equipped: String:
	get:
		return _storage.get_equipped_id()
var cobweb_stacks: Dictionary:
	get:
		var stacks := {}
		for item in _storage.bag.get_items_with_prototype_id(COBWEB_ID):
			stacks[_storage.grid.get_item_position(item)] = item.get_stack_size()
		return stacks

var gold_items: Array[Dictionary]:
	get:
		var items: Array[Dictionary] = []
		for item in _storage.bag.get_items_with_prototype_id(Gold.ID):
			items.append({"id": Gold.ID, "cell": _storage.grid.get_item_position(item),
				"count": item.get_stack_size(), "capacity": Gold.STACK_LIMIT})
		for pouch in _storage.pouches():
			var id: String = pouch.get_property(Storage.POUCH_ID)
			items.append({"id": id, "cell": _storage.grid.get_item_position(pouch),
				"count": pouch.get_property(Storage.POUCH_GOLD, 0), "capacity": Gold.pouch_capacity(id)})
		return items

var _embedded := false
var _catalog: Dictionary = {}
var _character_id: String = ""
var _storage := Storage.new()


func open(character_id: String, catalog: Dictionary) -> void:
	_storage = Storage.new()
	_embedded = false
	_catalog = catalog
	_character_id = ""
	if character_id.length() != 32 or not character_id.is_valid_hex_number(false):
		return
	_character_id = character_id
	var profile := Store.load_selected()
	var world: Dictionary = profile["world"] if profile.get("id") == character_id else {}
	_embedded = not world.get("gear_inventory", {}).is_empty()
	var path := DIRECTORY.path_join(character_id + ".json")
	_restore_gear(world["gear_inventory"] if _embedded else _read_legacy(path))
	sync_stacks(world)


func _restore_gear(parsed: Variant) -> void:
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
	for slot: String in parsed.get("slots", {}):
		var id: String = parsed["slots"][slot]
		if slot not in SLOTS or id == held or parsed["placements"].has(id):
			return
		var item := _create_weapon(id)
		if item == null or not loaded.slots[slot].equip(item):
			return
	for pouch: Dictionary in parsed.get("pouches", []):
		var point: Array = pouch["cell"]
		if not loaded.grid.add_item_at(loaded.create_pouch(pouch["id"]), Vector2i(point[0], point[1])):
			return
	var stack_positions: Variant = parsed.get("stack_positions", {})
	if stack_positions is Dictionary:
		for id: String in Store.BAG_STACK_IDS:
			var cells: Variant = stack_positions.get(id, [])
			if not cells is Array:
				continue
			for cell in cells:
				if cell is Array and cell.size() == 2 and _valid_coordinate(cell[0], WIDTH) and _valid_coordinate(cell[1], HEIGHT):
					loaded.grid.create_and_add_item_at(id, Vector2i(int(cell[0]), int(cell[1])))
	_storage = loaded


func _read_legacy(path: String) -> Variant:
	return JSON.parse_string(FileAccess.get_file_as_string(path)) if FileAccess.file_exists(path) else null


# Excess from older saves remains available for spending or banking even
# when there is insufficient room to display it in the grid.
func sync_stacks(world: Dictionary) -> Dictionary:
	return _storage.sync_stacks(_cobweb_total(world), int(world.get(Gold.ID, 0)))


func sync_cobwebs(count: int) -> int:
	return _storage.sync_stack(COBWEB_ID, count, COBWEB_STACK_LIMIT)


func cobweb_capacity(gold_amount := 0) -> int:
	var loose := maxi(0, gold_amount - _storage.pouch_capacity())
	return maxi(0, _storage.stack_cells() - Storage.cells_for(loose, Gold.STACK_LIMIT)) * COBWEB_STACK_LIMIT


func gold_capacity(cobweb_amount: int) -> int:
	var free_cells := maxi(0, _storage.stack_cells() - Storage.cells_for(cobweb_amount, COBWEB_STACK_LIMIT))
	return _storage.pouch_capacity() + free_cells * Gold.STACK_LIMIT


static func _cobweb_total(world: Dictionary) -> int:
	return int(world.get("town_materials", {}).get(COBWEB_ID, 0))


func deposit_gold(amount: int) -> String:
	return _transfer_gold(amount, true)


func withdraw_gold(amount: int) -> String:
	return _transfer_gold(amount, false)


func _transfer_gold(amount: int, depositing: bool) -> String:
	var profile := Store.load_selected()
	if profile.is_empty() or profile["id"] != _character_id:
		return "The selected character changed."
	if amount <= 0:
		return "Enter a positive amount."
	var world: Dictionary = profile["world"]
	var carried: int = world[Gold.ID]
	var banked: int = world["bank_gold"]
	if depositing:
		if amount > carried:
			return "You do not carry that much gold."
		if amount > Gold.BANK_LIMIT - banked:
			return "The bank can hold up to %s per character." % Gold.format_amount(Gold.BANK_LIMIT)
		carried -= amount
		banked += amount
	else:
		if amount > banked:
			return "You do not have that much gold in the bank."
		if carried + amount > gold_capacity(_cobweb_total(world)):
			return "There is not enough room for that gold in your bag."
		carried += amount
		banked -= amount
	var saved := Store.update_world({Gold.ID: carried, "bank_gold": banked})
	if saved.is_empty():
		return "Could not save the transfer."
	sync_stacks(saved["world"])
	return ""


func purchase_pouch(id: String, price: int) -> String:
	if not Gold.POUCHES.has(id) or price != Gold.POUCHES[id]["price"]:
		return "Unknown gold pouch."
	var profile := Store.load_selected()
	if profile.is_empty() or profile["id"] != _character_id:
		return "The selected character changed."
	var world: Dictionary = profile["world"]
	var carried := int(world[Gold.ID]) - price
	if carried < 0:
		return "You need %dg to buy this pouch." % price
	var next := _storage.copy()
	var cobwebs := _cobweb_total(world)
	next.sync_stacks(cobwebs, carried)
	if not next.bag.add_item(next.create_pouch(id)):
		return "Make a free 2×2 space in your bag for the pouch."
	next.sync_stacks(cobwebs, carried)
	return _commit(next, {Gold.ID: carried})


func can_move_item(from: Vector2i, to: Vector2i) -> bool:
	if not Rect2i(0, 0, WIDTH, HEIGHT).has_point(from):
		return false
	var item := _storage.grid.get_item_at(from)
	if item == null or _storage.grid.get_item_position(item) != from:
		return false
	return _storage.grid.rect_free(Rect2i(to, _storage.grid.get_item_size(item)), item)


func move_item(from: Vector2i, to: Vector2i) -> String:
	if not can_move_item(from, to):
		return "The item does not fit there."
	if from == to:
		return ""
	var next := _storage.copy()
	if not next.grid.move_item_to(next.grid.get_item_at(from), to):
		return "The item does not fit there."
	return _commit(next)


func equipped_in(slot: String) -> String:
	if slot == "main_hand":
		return equipped
	if not _storage.slots.has(slot):
		return ""
	var item: InventoryItem = _storage.slots[slot].get_item()
	return "" if item == null else str(item.get_property(Storage.CATALOG_ID))


func owns(id: String) -> bool:
	for slot: String in SLOTS:
		if not id.is_empty() and equipped_in(slot) == id:
			return true
	return not id.is_empty() and (equipped == id or _storage.find_in_bag(id) != null)


func take(id: String, world_changes: Dictionary = {}, auto_equip := false) -> String:
	if not _catalog.has(id):
		return "Unknown weapon."
	if owns(id):
		return "You already own this equipment."
	var item := _create_weapon(id)
	var next := _storage.copy()
	if item == null:
		return "Unknown equipment."
	if world_changes.has(Gold.ID):
		var profile := Store.load_selected()
		if profile.get("id") != _character_id:
			return "The selected character changed."
		next.sync_stacks(_cobweb_total(profile["world"]), int(world_changes[Gold.ID]))
	if auto_equip and equipped.is_empty() and _catalog[id].get("slot", "main_hand") == "main_hand":
		next.main_hand.equip(item)
	elif not next.bag.add_item(item):
		return "There is no room for this item in the bag."
	return _commit(next, world_changes)


func equip(id: String, slot := "") -> String:
	if not _catalog.has(id):
		return "Unknown equipment."
	var required: String = _catalog[id].get("slot", "main_hand")
	if slot.is_empty():
		slot = "accessory_1" if required == "accessory" else required
	if slot != required and not (required == "accessory" and slot in ["accessory_1", "accessory_2"]):
		return "This item does not fit that slot."
	if slot != "main_hand" and slot not in SLOTS:
		return "This item cannot be equipped."
	if equipped_in(slot) == id:
		return ""
	if _storage.find_in_bag(id) == null:
		return "Take this equipment first."
	if slot == "off_hand" and int(_catalog.get(equipped, {}).get("hands", 1)) == 2:
		return "A two-handed weapon occupies your off hand."
	var next := _storage.copy()
	var target: ItemSlot = next.main_hand if slot == "main_hand" else next.slots[slot]
	var previous := target.get_item()
	if not target.equip(next.find_in_bag(id)):
		return "Could not equip this item."
	if previous != null and not next.bag.add_item(previous):
		return "Make room for your equipped weapon first." if slot == "main_hand" else "Make room for your equipped item first."
	if slot == "main_hand" and int(_catalog[id].get("hands", 1)) == 2:
		var off: ItemSlot = next.slots["off_hand"]
		var off_item := off.get_item()
		if off_item != null:
			off.clear()
			if not next.bag.add_item(off_item):
				return "Make room for your off-hand item first."
	return _commit(next)


func return_to_rack(id: String) -> String:
	if not owns(id):
		return "This weapon is not in your satchel."
	var next := _storage.copy()
	if id == equipped:
		next.main_hand.clear()
	else:
		for slot: String in SLOTS:
			if equipped_in(slot) == id:
				next.slots[slot].clear()
		var item := next.find_in_bag(id)
		if item != null:
			next.bag.remove_item(item)
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


func _commit(next: Storage, world_changes: Dictionary = {}) -> String:
	if _character_id.is_empty():
		return "No character is selected."
	# Publish the new GLoot state only after the world and equipment changes are saved.
	var serialized := {}
	var next_placements := next.get_placements()
	for id in next_placements:
		var cell: Vector2i = next_placements[id]
		serialized[id] = [cell.x, cell.y]
	var slots := {}
	for slot: String in SLOTS:
		var item: InventoryItem = next.slots[slot].get_item()
		if item != null:
			slots[slot] = str(item.get_property(Storage.CATALOG_ID))
	var packet := {"placements": serialized, "equipped": next.get_equipped_id(), "slots": slots}
	var pouches := []
	for pouch in next.pouches():
		var cell := next.grid.get_item_position(pouch)
		pouches.append({"id": pouch.get_property(Storage.POUCH_ID), "cell": [cell.x, cell.y]})
	if not pouches.is_empty():
		packet["pouches"] = pouches
	# Keep saved stack anchors in fill order. Quantities still come from the world balances.
	var stack_positions := {}
	for id: String in Store.BAG_STACK_IDS:
		var cells := []
		for item in next.bag.get_items_with_prototype_id(id):
			var cell := next.grid.get_item_position(item)
			cells.append([cell.x, cell.y])
		if not cells.is_empty():
			stack_positions[id] = cells
	if not stack_positions.is_empty():
		packet["stack_positions"] = stack_positions
	if _embedded or not world_changes.is_empty():
		if Store.load_selected().get("id") != _character_id:
			return "The selected character changed."
		var changes := world_changes.duplicate(true)
		changes["gear_inventory"] = packet
		if Store.update_world(changes).is_empty():
			return "Could not save equipment."
		_embedded = true
		_storage = next
		return ""
	if DirAccess.make_dir_recursive_absolute(DIRECTORY) != OK:
		return "Could not create weapon storage."
	var path := DIRECTORY.path_join(_character_id + ".json")
	var temporary := path + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return "Could not save weapons."
	file.store_string(JSON.stringify(packet))
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
	const POUCH_PROTOTYPE := "gold_pouch"
	const POUCH_ID := "pouch_id"
	const POUCH_GOLD := "pouch_gold"
	static var _protoset := _create_protoset()
	static var _active_storages := 0

	var bag := Inventory.new()
	var grid := GridConstraint.new()
	var main_hand := ItemSlot.new()
	var slots: Dictionary = {}


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
		for slot: String in SLOTS:
			var equipment := ItemSlot.new()
			equipment.protoset = _protoset
			slots[slot] = equipment


	func _notification(what: int) -> void:
		if what == NOTIFICATION_PREDELETE:
			var prototypes := bag.get_prototree()
			bag.free()
			main_hand.free()
			for slot: ItemSlot in slots.values():
				slot.free()
			_active_storages -= 1
			# GLoot caches the tree. Clear its prototype references when the last inventory closes.
			if _active_storages == 0:
				prototypes.clear()


	static func _create_protoset() -> JSON:
		var protoset := JSON.new()
		protoset.data = {
			WEAPON_PROTOTYPE: {},
			COBWEB_ID: {"max_stack_size": COBWEB_STACK_LIMIT},
			Gold.ID: {"max_stack_size": Gold.STACK_LIMIT},
			POUCH_PROTOTYPE: {},
		}
		return protoset


	func create_weapon(id: String, item_size: Vector2i) -> InventoryItem:
		var item := bag.create_item(WEAPON_PROTOTYPE)
		item.set_property(CATALOG_ID, id)
		item.set_property("size", item_size)
		return item


	func create_pouch(id: String) -> InventoryItem:
		var item := bag.create_item(POUCH_PROTOTYPE)
		item.set_property(POUCH_ID, id)
		item.set_property("size", Gold.POUCH_SIZE)
		return item


	func pouches() -> Array[InventoryItem]:
		return bag.get_items_with_prototype_id(POUCH_PROTOTYPE)


	func pouch_capacity() -> int:
		var capacity := 0
		for pouch in pouches():
			capacity += Gold.pouch_capacity(pouch.get_property(POUCH_ID))
		return capacity


	func stack_cells() -> int:
		var remaining := WIDTH * HEIGHT
		for item in bag.get_items_with_prototype_id(WEAPON_PROTOTYPE):
			remaining -= grid.get_item_rect(item).get_area()
		return remaining - pouches().size() * Gold.POUCH_SIZE.x * Gold.POUCH_SIZE.y


	static func cells_for(count: int, stack_limit: int) -> int:
		return ceili(float(count) / stack_limit)


	func sync_stacks(cobwebs: int, gold: int) -> Dictionary:
		for pouch in pouches():
			var count := mini(gold, Gold.pouch_capacity(pouch.get_property(POUCH_ID)))
			if count != pouch.get_property(POUCH_GOLD, 0):
				pouch.set_property(POUCH_GOLD, count)
			gold -= count
		# Shrink loose coin stacks before placing any new cobweb stacks.
		var loose_cells := maxi(0, stack_cells() - cells_for(cobwebs, COBWEB_STACK_LIMIT))
		sync_stack(Gold.ID, mini(gold, loose_cells * Gold.STACK_LIMIT), Gold.STACK_LIMIT, false)
		return {
			COBWEB_ID: sync_stack(COBWEB_ID, cobwebs, COBWEB_STACK_LIMIT),
			Gold.ID: sync_stack(Gold.ID, gold, Gold.STACK_LIMIT),
		}


	func sync_stack(id: String, count: int, limit: int, grow := true) -> int:
		for item in bag.get_items_with_prototype_id(id):
			var size := mini(count, limit)
			if size != item.get_stack_size():
				item.set_stack_size(size)
			count -= size
		while grow and count > 0:
			var item := bag.create_item(id)
			var size := mini(count, limit)
			item.set_stack_size(size)
			if not bag.add_item(item):
				break
			count -= size
		return count


	func find_in_bag(id: String) -> InventoryItem:
		for item in bag.get_items():
			if item.get_property(CATALOG_ID) == id:
				return item
		return null


	func get_placements() -> Dictionary:
		var result := {}
		for item in bag.get_items_with_prototype_id(WEAPON_PROTOTYPE):
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
		for slot: String in slots:
			var gear: InventoryItem = slots[slot].get_item()
			if gear != null:
				next.slots[slot].equip(gear.duplicate())
		return next
