extends GutTest

const Store = preload("res://scripts/character_store.gd")
const Town = preload("res://scripts/dungeon_town.gd")
const Dungeon = preload("res://scripts/dungeon_entry.gd")

var _id := ""
var _previous := ""


func before_each() -> void:
	_previous = Store._selected_id
	var draft := {"name": "Position test"}
	for key: String in Store.LIMITS:
		draft[key] = Store.LIMITS[key][0]
	var created := Store.create(draft)
	_id = created["id"]
	assert_true(Store.select_character(_id))


func after_each() -> void:
	Store._selected_id = _previous
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))


func test_legacy_and_malformed_positions_fall_back_without_losing_character() -> void:
	assert_eq(Store._normalize_world({})["map_position"], {})
	for checkpoint in [null, [], {"location": "threshold", "x": 1, "y": 1}, {"location": "lantern_rest", "x": -1, "y": 1}, {"location": "lantern_rest", "x": 1.5, "y": 1}]:
		var world := Store._normalize_world({"map_position": checkpoint})
		assert_false(world.is_empty())
		assert_eq(world["map_position"], {})


func test_town_restores_saved_walkable_tile() -> void:
	var town := Town.new()
	add_child_autofree(town)
	var target := Vector2i.ZERO
	for x in range(town._map_size.x):
		for y in range(town._map_size.y):
			var cell := Vector2i(x, y)
			if cell != town.player and not town.wall_cells.has(cell) and not town._points.has(cell):
				target = cell
				break
		if target != Vector2i.ZERO:
			break
	assert_true(Store.save_map_position(_id, "lantern_rest", target))
	town.hide()
	var resumed := Town.new()
	add_child_autofree(resumed)
	assert_eq(resumed.player, target)


func test_dungeon_restores_tile_in_an_earlier_room() -> void:
	assert_false(Store.update_world({"location": "threshold", "threshold_cleared": 2}).is_empty())
	var dungeon := Dungeon.new()
	add_child_autofree(dungeon)
	dungeon._show_room(1)
	var tile: Vector2i = dungeon._room["enemies"][0]
	assert_true(Store.save_map_position(_id, "threshold", tile, 1, 0))
	dungeon.hide()
	var resumed := Dungeon.new()
	add_child_autofree(resumed)
	assert_eq(resumed._room_index, 1)
	assert_eq(resumed.player, tile)


func test_dungeon_relocates_regenerated_enemy_on_saved_tile() -> void:
	assert_false(Store.update_world({"location": "threshold", "threshold_cleared": 2}).is_empty())
	var dungeon := Dungeon.new()
	add_child_autofree(dungeon)
	var tile: Vector2i = dungeon._room["enemies"][0]
	assert_true(Store.save_map_position(_id, "threshold", tile, 2, 0))
	dungeon.hide()
	var resumed := Dungeon.new()
	add_child_autofree(resumed)
	assert_eq(resumed.player, tile)
	assert_false(resumed._room["enemies"].has(tile))


func test_old_dungeon_run_and_unvisited_room_are_ignored() -> void:
	var base := {"location": "threshold", "threshold_cleared": 2, "threshold_run": 3}
	for checkpoint in [
		{"location": "threshold", "room": 1, "run": 2, "x": 8, "y": 7},
		{"location": "threshold", "room": 3, "run": 3, "x": 8, "y": 7},
	]:
		var value := base.duplicate()
		value["map_position"] = checkpoint
		assert_eq(Store._normalize_world(value)["map_position"], {})


func test_dungeon_arrival_starts_beside_each_towns_dungeon_entrance() -> void:
	for location: String in Store.TOWNS:
		var arrival := {"location": location, "landmark": "dungeon"}
		var saved := Store.update_world({"location": location, "map_position": arrival})
		assert_false(saved.is_empty())
		if saved.is_empty():
			continue
		assert_eq(saved["world"]["map_position"], arrival)
		var town := Town.new()
		add_child_autofree(town)
		var entrance := Vector2i.ZERO
		for landmark: Dictionary in town._landmarks:
			if landmark["id"] == "dungeon":
				entrance = landmark["cell"]
				break
		assert_ne(entrance, Vector2i.ZERO)
		assert_eq(town.player, entrance + Vector2i.LEFT, location)
		assert_false(town.wall_cells.has(town.player))
		assert_false(town._points.has(town.player))
		assert_true(town._save_map_position())
		var checkpoint: Dictionary = Store.load_selected()["world"]["map_position"]
		assert_eq(checkpoint, {"location": location, "x": town.player.x, "y": town.player.y})
		town.hide()
