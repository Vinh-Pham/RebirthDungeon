extends RefCounted

const MAP_SIZE := Vector2i(31, 15)
const ROOM_COUNT := 8


static func generate(seed_value: int) -> Array[Dictionary]:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var rooms: Array[Dictionary] = []
	for index in range(ROOM_COUNT + 1):
		var floor_cells := {}
		var top := rng.randi_range(2, 4)
		var bottom := rng.randi_range(10, 12)
		var left := rng.randi_range(3, 5)
		var right := rng.randi_range(25, 27)
		if index == ROOM_COUNT - 1:
			top = 2
			bottom = 12
			left = 3
			right = 27
		for x in range(left, right + 1):
			for y in range(top, bottom + 1):
				floor_cells[Vector2i(x, y)] = true
		var entry := Vector2i(2, rng.randi_range(5, 9))
		var exit := Vector2i(28, rng.randi_range(5, 9))
		for x in range(entry.x, left + 1):
			floor_cells[Vector2i(x, entry.y)] = true
		for x in range(right, exit.x + 1):
			floor_cells[Vector2i(x, exit.y)] = true
		if index == 0:
			for x in range(4, 10):
				for y in range(4, 11):
					floor_cells[Vector2i(x, y)] = true
		# Shallow alcoves vary the outline without splitting the chamber.
		for x in range(left + 1, right):
			if rng.randf() < 0.35:
				floor_cells[Vector2i(x, top - 1)] = true
			if rng.randf() < 0.35:
				floor_cells[Vector2i(x, bottom + 1)] = true
		var room := {"floor": floor_cells, "entry": entry, "exit": exit}
		if index < ROOM_COUNT:
			var enemies: Array[Vector2i] = []
			var count := 1 if index in [0, ROOM_COUNT - 1] else rng.randi_range(1, 3)
			if index == 1:
				count = rng.randi_range(2, 3)
			while enemies.size() < count:
				var cell := Vector2i(rng.randi_range(15, 22), rng.randi_range(top + 1, bottom - 1))
				if not enemies.has(cell):
					enemies.append(cell)
			room["enemies"] = enemies
			room["enemy"] = enemies[0]
		else:
			room["chest"] = Vector2i(20, 7)
		rooms.append(room)
	return rooms
