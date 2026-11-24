extends GutTest

const Town = preload("res://scripts/dungeon_town.gd")
const Map = preload("res://scripts/lantern_rest_map.gd")
const Store = preload("res://scripts/character_store.gd")

var _id := ""
var _previous := ""


func before_each() -> void:
	_previous = Store._selected_id


func after_each() -> void:
	Store._selected_id = _previous
	if not _id.is_empty():
		DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	_id = ""


func test_every_town_service_and_amenity_can_be_reached() -> void:
	var generated := Map.generate(713)
	var walls: Dictionary = generated["walls"]
	var blocked := {}
	var ids := {}
	var fishing := 0
	for landmark in generated["landmarks"]:
		blocked[landmark["cell"]] = true
		ids[landmark["id"]] = true
		if landmark["id"] == "fishing":
			fishing += 1
	assert_eq(fishing, 2)
	for id in ["blacksmith", "general_shop", "school", "church", "grocery_store", "healer", "oven", "loom", "spinning_wheel", "fishing", "windmill", "gate", "dungeon"]:
		assert_true(ids.has(id), id)
	var spawn: Vector2i = generated["spawn"]
	var seen := {spawn: true}
	var pending: Array[Vector2i] = [spawn]
	while not pending.is_empty():
		var cell: Vector2i = pending.pop_front()
		for direction in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			var next: Vector2i = cell + direction
			if Rect2i(Vector2i.ZERO, Map.SIZE).has_point(next) and not seen.has(next) and not walls.has(next) and not blocked.has(next) and not generated["water"].has(next):
				seen[next] = true
				pending.append(next)
	for landmark in generated["landmarks"]:
		var reachable := false
		for direction in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			reachable = reachable or seen.has(landmark["cell"] + direction)
		assert_true(reachable, landmark["label"])


func test_new_character_can_fish_in_lantern_rest_and_keep_the_catch() -> void:
	var profile := {"name": "Town fishing fixture"}
	for field in Store.LIMITS:
		profile[field] = Store.LIMITS[field][0]
	var created := Store.create(profile)
	assert_false(created.is_empty())
	_id = created["id"]
	assert_true(Store.select_character(_id))
	assert_eq(created["world"]["location"], "lantern_rest")
	var town := Town.new()
	add_child_autofree(town)
	var amenities: Array = town._landmarks.filter(func(place: Dictionary) -> bool: return place["id"] != "tree")
	assert_eq(amenities.size(), Map.LANDMARKS.size())
	for landmark in town._landmarks:
		if landmark["id"] == "fishing":
			town.player = landmark["cell"] + Vector2i.UP
			break
	town._interact()
	var cast: Button
	for control in town.dialogue.get_children():
		if control is Button and control.text == "Cast a line":
			cast = control
			break
	assert_not_null(cast)
	if cast == null:
		return
	cast.pressed.emit()
	await get_tree().process_frame
	assert_eq(Store.load_selected()["world"]["town_materials"]["fish"], 1)
	assert_eq(Store.load_selected()["experience"], 0)
	assert_eq(Store.load_selected()["world"]["threshold_cleared"], 0)


func test_seed_recreates_layout_and_changes_geometry() -> void:
	assert_eq(Map.generate(42), Map.generate(42))
	assert_ne(Map.generate(42)["walls"], Map.generate(94)["walls"])


func test_generated_services_are_reachable_across_seeds() -> void:
	for seed_value in range(100):
		var generated := Map.generate(seed_value)
		var blocked: Dictionary = generated["walls"].duplicate()
		blocked.merge(generated["water"])
		var occupied := {}
		for place in generated["landmarks"]:
			assert_false(blocked.has(place["cell"]))
			assert_false(occupied.has(place["cell"]))
			occupied[place["cell"]] = true
		blocked.merge(occupied)
		var spawn: Vector2i = generated["spawn"]
		var seen := {spawn: true}
		var pending: Array[Vector2i] = [spawn]
		while not pending.is_empty():
			var cell: Vector2i = pending.pop_front()
			for direction in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
				var next: Vector2i = cell + direction
				if Rect2i(Vector2i.ZERO, Map.SIZE).has_point(next) and not seen.has(next) and not blocked.has(next):
					seen[next] = true
					pending.append(next)
		for place in generated["landmarks"]:
			var reachable := false
			for direction in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
				reachable = reachable or seen.has(place["cell"] + direction)
			assert_true(reachable, "%s seed %d" % [place["id"], seed_value])
			if place["id"] == "gate":
				assert_true(seen.has(place["cell"] + Vector2i.UP))


func test_service_buildings_have_walkable_interiors_and_open_doors() -> void:
	var generated := Map.generate(713)
	var walls: Dictionary = generated["walls"]
	var buildings := 0
	for landmark in generated["landmarks"]:
		if not landmark.has("building"):
			continue
		buildings += 1
		var footprint: Rect2i = landmark["building"]
		var door: Vector2i = landmark["door"]
		assert_true(footprint.size.x >= 9 and footprint.size.y >= 7)
		assert_true(footprint.has_point(landmark["cell"]))
		assert_eq(door.y, footprint.end.y - 1)
		assert_false(walls.has(door))
		assert_false(walls.has(door + Vector2i.UP))
		assert_false(walls.has(door + Vector2i.DOWN))
		for x in range(footprint.position.x + 1, footprint.end.x - 1):
			for y in range(footprint.position.y + 1, footprint.end.y - 1):
				assert_false(walls.has(Vector2i(x, y)))
	assert_eq(buildings, 7)


func test_click_to_move_reaches_visible_tile_after_phantom_camera_pans() -> void:
	var profile := {"name": "Town camera fixture"}
	for field in Store.LIMITS:
		profile[field] = Store.LIMITS[field][0]
	var created := Store.create(profile)
	assert_false(created.is_empty())
	_id = created["id"]
	assert_true(Store.select_character(_id))
	var town := Town.new()
	add_child_autofree(town)
	await get_tree().process_frame
	var initial_transform := town._town_viewport.get_canvas_transform()
	var follow: PhantomCamera2D
	for child in town._town_viewport.get_children():
		if child is PhantomCamera2D:
			follow = child
	assert_not_null(follow)
	if follow == null:
		return
	assert_eq(follow.follow_target, town._player_sprite)
	town.player = Vector2i(36, 20)
	town._sync_player_view()
	await get_tree().create_timer(0.8).timeout
	var panned_transform := town._town_viewport.get_canvas_transform()
	assert_true(panned_transform.origin.x < initial_transform.origin.x - 200.0)
	var player_on_screen := panned_transform * town._player_sprite.position
	assert_almost_eq(player_on_screen.x, town._town_viewport.size.x * 0.5, 2.0)
	assert_almost_eq(player_on_screen.y, town._town_viewport.size.y * 0.5, 2.0)
	var destination := Vector2i(39, 20)
	var world_position := town._map_origin + (Vector2(destination) + Vector2(0.5, 0.5)) * town._tile_size
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	click.position = panned_transform * world_position
	assert_true(Rect2(Vector2.ZERO, Vector2(town._town_viewport.size)).has_point(click.position))
	town._layout.map_canvas.gui_input.emit(click)
	for step in range(10):
		town._layout._process(0.1)
	assert_eq(town.player, destination)
