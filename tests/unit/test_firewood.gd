extends GutTest

const Firewood = preload("res://scripts/firewood.gd")
const TownMap = preload("res://scripts/lantern_rest_map.gd")


func test_five_pieces_then_one_regrows_each_five_minutes() -> void:
	var world := {"town_materials": {}, "tree_harvests": {}}
	var key := Firewood.tree_key("lantern_rest", Vector2i(5, 5))
	for index in range(5):
		var result := Firewood.harvest(world, key, 1000)
		assert_false(result["changes"].is_empty())
		world.merge(result["changes"], true)
	assert_eq(world["town_materials"]["firewood"], 5)
	assert_eq(Firewood.harvest(world, key, 1299)["changes"], {})
	assert_eq(Firewood.status(world, key, 1300)["count"], 1)
	assert_eq(Firewood.status(world, key, 2499)["count"], 4)
	assert_eq(Firewood.status(world, key, 2500)["count"], 5)
	assert_eq(Firewood.status(world, key, 2500)["next_at"], 0)


func test_partial_interval_is_preserved_and_trees_are_independent() -> void:
	var world := {"town_materials": {}, "tree_harvests": {}}
	var key := Firewood.tree_key("lantern_rest", Vector2i(5, 5))
	var other := Firewood.tree_key("lantern_rest", Vector2i(8, 5))
	world.merge(Firewood.harvest(world, key, 1000)["changes"], true)
	world.merge(Firewood.harvest(world, key, 1100)["changes"], true)
	assert_eq(Firewood.status(world, key, 1299)["count"], 3)
	world.merge(Firewood.harvest(world, key, 1350)["changes"], true)
	assert_eq(world["tree_harvests"][key], {"count": 3, "next_at": 1600})
	assert_eq(Firewood.status(world, key, 1599)["count"], 3)
	assert_eq(Firewood.status(world, key, 1600)["count"], 4)
	assert_eq(Firewood.status(world, other, 1350)["count"], 5)


func test_placement_is_stable_and_keeps_amenities_and_routes_clear() -> void:
	for seed_value in [1, 17, 97245]:
		var map := TownMap.generate(seed_value)
		var blocked: Dictionary = map["walls"].duplicate()
		blocked.merge(map["water"])
		var occupied := blocked.duplicate()
		for place: Dictionary in map["landmarks"]:
			occupied[place["cell"]] = true
		var before := TownMap._tree_reachable(TownMap.SIZE, occupied, map["spawn"])
		var trees := TownMap.tree_landmarks(TownMap.SIZE, map["landmarks"], blocked, map["roads"], map["spawn"], seed_value, 12)
		assert_eq(trees, TownMap.tree_landmarks(TownMap.SIZE, map["landmarks"], blocked, map["roads"], map["spawn"], seed_value, 12))
		assert_gt(trees.size(), 0)
		for tree: Dictionary in trees:
			var cell: Vector2i = tree["cell"]
			assert_false(blocked.has(cell))
			assert_false(map["roads"].has(cell))
			for place: Dictionary in map["landmarks"]:
				var amenity: Vector2i = place["cell"]
				assert_gt(maxi(absi(cell.x - amenity.x), absi(cell.y - amenity.y)), 1)
				if place.has("door"):
					var door: Vector2i = place["door"]
					assert_gt(maxi(absi(cell.x - door.x), absi(cell.y - door.y)), 1)
				if place.has("building"):
					var building: Rect2i = place["building"]
					assert_false(building.grow(1).has_point(cell))
			occupied[cell] = true
		var after := TownMap._tree_reachable(TownMap.SIZE, occupied, map["spawn"])
		assert_eq(after.size(), before.size() - trees.size())
