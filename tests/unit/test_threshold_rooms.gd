extends GutTest

const Rooms = preload("res://scripts/threshold_rooms.gd")


func test_seed_recreates_rooms_and_changes_layouts() -> void:
	assert_eq(Rooms.generate(17), Rooms.generate(17))
	assert_ne(Rooms.generate(17), Rooms.generate(18))


func test_eight_combat_rooms_precede_connected_treasure_room() -> void:
	for seed_value in [1, 17, 329, 2147483647]:
		var rooms := Rooms.generate(seed_value)
		assert_eq(rooms.size(), 9)
		for index in rooms.size():
			var room: Dictionary = rooms[index]
			var floor_cells: Dictionary = room["floor"]
			var visited := {}
			var pending: Array[Vector2i] = [room["entry"]]
			while not pending.is_empty():
				var cell: Vector2i = pending.pop_back()
				if visited.has(cell):
					continue
				visited[cell] = true
				for direction in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
					var neighbor: Vector2i = cell + direction
					if floor_cells.has(neighbor) and not visited.has(neighbor):
						pending.append(neighbor)
			assert_eq(visited.size(), floor_cells.size())
			assert_true(visited.has(room["exit"]))
			for cell: Vector2i in floor_cells:
				assert_true(Rect2i(Vector2i.ONE, Rooms.MAP_SIZE - Vector2i(2, 2)).has_point(cell))
			if index < Rooms.ROOM_COUNT:
				assert_true(visited.has(room["enemies"][0]))
				assert_false(room.has("chests"))
			else:
				assert_eq(room["chests"].size(), Rooms.CHEST_COUNT)
				for chest: Vector2i in room["chests"]:
					assert_true(visited.has(chest))
				assert_false(room.has("enemies"))


func test_first_room_reserves_equipment_and_practice_space() -> void:
	var first: Dictionary = Rooms.generate(27)[0]
	for cell in [Vector2i(5, 4), Vector2i(5, 6), Vector2i(5, 8), Vector2i(5, 10), Vector2i(8, 4)]:
		assert_true(first["floor"].has(cell))
		assert_false(first["enemies"].has(cell))
		assert_ne(first["entry"], cell)
		assert_ne(first["exit"], cell)


func test_groups_have_distinct_reachable_cells_and_include_multiple_enemies() -> void:
	for seed_value in range(20):
		var rooms := Rooms.generate(seed_value)
		assert_gt(rooms[1]["enemies"].size(), 1)
		for index in range(Rooms.ROOM_COUNT):
			var occupied := {}
			for cell: Vector2i in rooms[index]["enemies"]:
				assert_true(rooms[index]["floor"].has(cell))
				assert_false(occupied.has(cell))
				assert_ne(cell, rooms[index]["entry"])
				assert_ne(cell, rooms[index]["exit"])
				occupied[cell] = true
			assert_between(occupied.size(), 1, 3)
		assert_eq(rooms[0]["enemies"].size(), 1)
		assert_eq(rooms[7]["enemies"].size(), 1)


func test_treasure_chests_are_spaced_and_have_reachable_approaches() -> void:
	for seed_value in range(20):
		var room: Dictionary = Rooms.generate(seed_value)[Rooms.ROOM_COUNT]
		var occupied := {}
		for chest: Vector2i in room["chests"]:
			assert_false(occupied.has(chest))
			assert_gt(chest.distance_squared_to(room["entry"]), 4)
			assert_gt(chest.distance_squared_to(room["exit"]), 4)
			for other: Vector2i in occupied:
				assert_gt(chest.distance_squared_to(other), 4)
			for direction in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
				assert_true(room["floor"].has(chest + direction))
			occupied[chest] = true
		assert_eq(occupied.size(), Rooms.CHEST_COUNT)
