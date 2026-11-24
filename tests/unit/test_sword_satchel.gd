extends GutTest

const Satchel = preload("res://scripts/sword_satchel.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Layout = preload("res://scripts/exploration_layout.gd")

var _character_id: String
var _path: String
var _catalog: Dictionary
var _satchel: Satchel


func before_each() -> void:
	_character_id = Crypto.new().generate_random_bytes(16).hex_encode()
	_path = Satchel.DIRECTORY.path_join(_character_id + ".json")
	_catalog = {
		"short": {"name": "Short sword", "width": 1, "height": 2},
		"wide": {"name": "Wide sword", "width": 2, "height": 3},
		"huge": {"name": "Huge sword", "width": 8, "height": 7},
	}
	_satchel = Satchel.new()
	_satchel.open(_character_id, _catalog)


func after_each() -> void:
	_satchel = null
	DirAccess.remove_absolute(_path)
	DirAccess.remove_absolute(_path + ".tmp")


func _write_save(placements: Dictionary, held: String = "") -> void:
	assert_eq(DirAccess.make_dir_recursive_absolute(Satchel.DIRECTORY), OK)
	var file := FileAccess.open(_path, FileAccess.WRITE)
	assert_not_null(file)
	file.store_string(JSON.stringify({"placements": placements, "equipped": held}))
	file.close()


func _read_save() -> Dictionary:
	var file := FileAccess.open(_path, FileAccess.READ)
	assert_not_null(file)
	var saved: Dictionary = JSON.parse_string(file.get_as_text())
	file.close()
	return saved


func _fill_bag() -> Dictionary:
	var placements := {}
	for y in Satchel.HEIGHT:
		for x in Satchel.WIDTH:
			var id := "filler_%d_%d" % [x, y]
			_catalog[id] = {"name": id, "width": 1, "height": 1}
			placements[id] = [x, y]
	return placements


func test_loads_legacy_save_with_exact_positions_and_equipment() -> void:
	_write_save({"short": [6, 5], "wide": [1, 2]}, "huge")
	_satchel.open(_character_id, _catalog)

	assert_eq(_satchel.placements, {"short": Vector2i(6, 5), "wide": Vector2i(1, 2)})
	assert_eq(_satchel.equipped, "huge")
	assert_true(_satchel.owns("short"))
	assert_true(_satchel.owns("huge"))


func test_take_respects_item_footprints_and_survives_reload() -> void:
	assert_eq(_satchel.take("short"), "")
	assert_eq(_satchel.take("wide"), "")
	assert_eq(_satchel.placements, {"short": Vector2i(0, 0), "wide": Vector2i(1, 0)})

	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.placements, {"short": Vector2i(0, 0), "wide": Vector2i(1, 0)})
	assert_eq(_read_save()["placements"], {"short": [0.0, 0.0], "wide": [1.0, 0.0]})


func test_equipping_swaps_held_weapon_into_bag_and_persists() -> void:
	assert_eq(_satchel.take("short"), "")
	assert_eq(_satchel.equip("short"), "")
	assert_eq(_satchel.take("wide"), "")
	assert_eq(_satchel.equip("wide"), "")

	assert_eq(_satchel.equipped, "wide")
	assert_eq(_satchel.placements, {"short": Vector2i(0, 0)})
	assert_true(_satchel.owns("short"))
	assert_false(_satchel.placements.has("wide"))
	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.equipped, "wide")
	assert_eq(_satchel.placements, {"short": Vector2i(0, 0)})


func test_return_removes_bagged_and_equipped_weapons() -> void:
	assert_eq(_satchel.take("short"), "")
	assert_eq(_satchel.take("wide"), "")
	assert_eq(_satchel.equip("wide"), "")
	assert_eq(_satchel.return_to_rack("short"), "")
	assert_eq(_satchel.return_to_rack("wide"), "")

	assert_false(_satchel.owns("short"))
	assert_false(_satchel.owns("wide"))
	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.placements, {})
	assert_eq(_satchel.equipped, "")


func test_duplicate_unknown_and_unowned_items_leave_inventory_unchanged() -> void:
	assert_eq(_satchel.take("short"), "")
	var saved := _read_save()
	assert_false(_satchel.take("short").is_empty())
	assert_false(_satchel.take("unknown").is_empty())
	assert_false(_satchel.equip("wide").is_empty())
	assert_false(_satchel.return_to_rack("wide").is_empty())
	assert_eq(_satchel.placements, {"short": Vector2i(0, 0)})
	assert_eq(_read_save(), saved)


func test_full_bag_rejects_take_without_changing_save() -> void:
	var full := _fill_bag()
	_write_save(full)
	_satchel.open(_character_id, _catalog)
	var saved := _read_save()

	assert_false(_satchel.take("short").is_empty())
	assert_eq(_satchel.placements.size(), Satchel.WIDTH * Satchel.HEIGHT)
	assert_eq(_read_save(), saved)
	assert_false(_satchel.owns("short"))


func test_failed_equipment_swap_preserves_bag_equipment_and_save() -> void:
	var full := _fill_bag()
	_write_save(full, "huge")
	_satchel.open(_character_id, _catalog)
	var placements: Dictionary = _satchel.placements.duplicate()
	var saved := _read_save()

	assert_false(_satchel.equip("filler_0_0").is_empty())
	assert_eq(_satchel.equipped, "huge")
	assert_eq(_satchel.placements, placements)
	assert_eq(_read_save(), saved)


func test_overlapping_legacy_items_are_rejected_as_a_whole() -> void:
	_write_save({"short": [0, 0], "wide": [0, 1]}, "huge")
	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.placements, {})
	assert_eq(_satchel.equipped, "")


func test_out_of_bounds_and_fractional_legacy_positions_are_rejected() -> void:
	_write_save({"wide": [7, 0]})
	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.placements, {})

	_write_save({"short": [0.5, 0]})
	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.placements, {})


func test_legacy_item_cannot_be_equipped_and_in_the_bag() -> void:
	_write_save({"short": [0, 0]}, "short")
	_satchel.open(_character_id, _catalog)
	assert_eq(_satchel.placements, {})
	assert_eq(_satchel.equipped, "")


func test_save_failure_keeps_last_committed_inventory() -> void:
	assert_eq(_satchel.take("short"), "")
	var saved := _read_save()
	assert_eq(DirAccess.make_dir_absolute(_path + ".tmp"), OK)

	assert_false(_satchel.take("wide").is_empty())
	assert_eq(_satchel.placements, {"short": Vector2i(0, 0)})
	assert_eq(_satchel.equipped, "")
	assert_eq(_read_save(), saved)
	assert_eq(DirAccess.remove_absolute(_path + ".tmp"), OK)


func test_invalid_character_id_cannot_save_inventory() -> void:
	_satchel.open("../invalid", _catalog)
	assert_false(_satchel.take("short").is_empty())
	assert_eq(_satchel.placements, {})
	assert_eq(_satchel.equipped, "")


func test_exploration_inventory_equips_a_sword_and_updates_grid() -> void:
	var catalog := Catalog.items_by_id()
	_satchel.open(_character_id, catalog)
	assert_eq(_satchel.take("ashen_arcblade"), "")
	assert_eq(_satchel.equip("ashen_arcblade"), "")
	assert_eq(_satchel.take("amber_arcblade"), "")

	var layout := _build_exploration_layout(catalog)
	var panel := layout._inventory
	var sword := panel.find_child("Item_amber_arcblade", true, false) as Button
	assert_not_null(sword)
	assert_string_contains(sword.tooltip_text.replace("\n", " "), catalog["amber_arcblade"]["description"])
	await _drag_item(sword, panel._gear)
	await get_tree().process_frame

	assert_eq(_satchel.equipped, "amber_arcblade")
	assert_eq(panel._gear.tooltip_text.get_slice("\n", 0), catalog["amber_arcblade"]["name"])
	assert_string_contains(panel._gear.tooltip_text.replace("\n", " "), catalog["amber_arcblade"]["description"])
	assert_not_null(panel.find_child("Item_ashen_arcblade", true, false))
	assert_null(panel.find_child("Item_amber_arcblade", true, false))


func test_dragging_sword_to_armor_keeps_inventory_and_equipment() -> void:
	var catalog := Catalog.items_by_id()
	_satchel.open(_character_id, catalog)
	assert_eq(_satchel.take("amber_arcblade"), "")
	var saved := _read_save()
	var layout := _build_exploration_layout(catalog)
	var panel := layout._inventory
	var sword := panel.find_child("Item_amber_arcblade", true, false) as Button
	var armor := panel.find_child("Armor", true, false) as Control
	assert_not_null(sword)
	assert_not_null(armor)
	await _drag_item(sword, armor)
	assert_eq(_satchel.equipped, "")
	assert_true(_satchel.placements.has("amber_arcblade"))
	assert_eq(_read_save(), saved)


func test_dragging_sword_to_main_hand_keeps_both_weapons_when_swap_does_not_fit() -> void:
	var catalog := Catalog.items_by_id()
	# Each possible two-column space is blocked by a sword, even after lifting the dragged one.
	_write_save({
		"amber_arcblade": [0, 0],
		"copper_arcblade": [1, 1],
		"hollow_arcblade": [3, 1],
		"slate_arcblade": [5, 1],
		"cinder_arcblade": [7, 1],
	}, "ember_greatblade")
	_satchel.open(_character_id, catalog)
	var placements := _satchel.placements
	var saved := _read_save()
	var layout := _build_exploration_layout(catalog)
	var panel := layout._inventory
	var sword := panel.find_child("Item_amber_arcblade", true, false) as Button
	assert_not_null(sword)
	await _drag_item(sword, panel._gear)

	assert_eq(layout.log_label.text, "Make room for your equipped weapon first.")
	assert_eq(panel._status.text, layout.log_label.text)
	assert_eq(_satchel.equipped, "ember_greatblade")
	assert_eq(_satchel.placements, placements)
	assert_eq(_read_save(), saved)


func test_focused_sword_can_be_equipped_with_enter() -> void:
	var catalog := Catalog.items_by_id()
	_satchel.open(_character_id, catalog)
	assert_eq(_satchel.take("amber_arcblade"), "")
	var layout := _build_exploration_layout(catalog)
	var event := InputEventKey.new()
	event.keycode = KEY_ENTER
	event.pressed = true
	layout.get_viewport().push_input(event, true)
	await get_tree().process_frame

	assert_eq(_satchel.equipped, "amber_arcblade")


func test_inventory_screen_starts_hidden_and_can_be_opened_and_closed() -> void:
	var catalog := Catalog.items_by_id()
	var layout := Layout.new()
	add_child_autofree(layout)
	layout.configure("Lantern Rest", "", Vector2i.ONE, {}, {}, catalog, _satchel)
	layout.refresh({"world": {}})
	assert_false(layout.inventory_is_open())
	assert_false(layout._inventory.visible)
	layout.open_inventory()
	assert_true(layout.inventory_is_open())
	assert_true(layout._inventory.visible)
	layout.close_inventory()
	assert_false(layout.inventory_is_open())
	assert_false(layout._inventory.visible)


func _build_exploration_layout(catalog: Dictionary) -> Layout:
	var viewport := SubViewport.new()
	viewport.size = Vector2i(1152, 720)
	add_child_autofree(viewport)
	var layout := Layout.new()
	viewport.add_child(layout)
	layout.configure("Lantern Rest", "", Vector2i.ONE, {}, {}, catalog, _satchel)
	layout.refresh({"world": {}})
	layout.open_inventory()
	return layout


func _drag_item(source: Control, destination: Control) -> void:
	await get_tree().process_frame
	var viewport := source.get_viewport()
	var start := source.get_global_rect().get_center()
	var finish := destination.get_global_rect().get_center()
	var motion := InputEventMouseMotion.new()
	motion.position = start
	viewport.push_input(motion, true)
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.position = start
	press.pressed = true
	viewport.push_input(press, true)
	await get_tree().process_frame
	motion = InputEventMouseMotion.new()
	motion.position = start + Vector2(15, 0)
	motion.relative = Vector2(15, 0)
	motion.button_mask = MOUSE_BUTTON_MASK_LEFT
	viewport.push_input(motion, true)
	await get_tree().process_frame
	assert_true(viewport.gui_is_dragging())
	motion = InputEventMouseMotion.new()
	motion.position = finish
	motion.relative = finish - start
	motion.button_mask = MOUSE_BUTTON_MASK_LEFT
	viewport.push_input(motion, true)
	await get_tree().process_frame
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.position = finish
	viewport.push_input(release, true)
	await get_tree().process_frame
