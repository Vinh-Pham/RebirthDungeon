extends RefCounted

const SIZE := Vector2i(68, 42)
const LANDMARKS := [
	{"id": "warden", "label": "Warden", "name": "Nera", "sprite": 1},
	{"id": "blacksmith", "label": "Blacksmith", "name": "Venn", "sprite": 2},
	{"id": "general_shop", "label": "General Shop", "name": "Tamsin", "sprite": 3},
	{"id": "school", "label": "School", "name": "Elian", "portrait": {"body": 1, "hair": 2, "skin": 1, "race": 1, "hair_color": 1, "eye_color": 2, "face": 0, "eyes": 0}},
	{"id": "church", "label": "Church", "name": "Maelin", "portrait": {"body": 0, "hair": 1, "skin": 2, "race": 1, "hair_color": 3, "eye_color": 1, "face": 1, "eyes": 0}},
	{"id": "grocery_store", "label": "Grocery Store", "name": "Corin", "portrait": {"body": 2, "hair": 0, "skin": 1, "race": 2, "hair_color": 2, "eye_color": 0, "face": 0, "eyes": 2}},
	{"id": "healer", "label": "Healer's House", "name": "Sera", "sprite": 4},
	{"id": "oven", "label": "Cooking Oven", "amenity_sprite": 0, "glyph": "O"},
	{"id": "loom", "label": "Loom", "amenity_sprite": 1, "glyph": "H"},
	{"id": "spinning_wheel", "label": "Spinning Wheel", "amenity_sprite": 2, "glyph": "@"},
	{"id": "fishing", "label": "Fishing Spot", "amenity_sprite": 4, "glyph": "~"},
	{"id": "fishing", "label": "Fishing Spot", "amenity_sprite": 4, "glyph": "~"},
	{"id": "windmill", "label": "Windmill", "amenity_sprite": 3, "glyph": "X"},
	{"id": "gate", "label": "Moon Gate", "sprite": 9},
	{"id": "dungeon", "label": "Threshold", "glyph": ">"},
]


static func generate(seed_value: int) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var landmarks: Array = LANDMARKS.duplicate(true)
	var walls := {}
	var water := {}
	var roads := {}
	for x in range(SIZE.x):
		walls[Vector2i(x, 0)] = true
		walls[Vector2i(x, SIZE.y - 1)] = true
	for y in range(SIZE.y):
		walls[Vector2i(0, y)] = true
		walls[Vector2i(SIZE.x - 1, y)] = true
	var services: Array = landmarks.slice(0, 7)
	for index in range(services.size() - 1, 1, -1):
		var other := rng.randi_range(1, index)
		var swap: Dictionary = services[index]
		services[index] = services[other]
		services[other] = swap
	# Spacious blocks leave continuous streets around every building.
	for index in range(services.size()):
		var origin := Vector2i(5 + (index % 4) * 15, 4)
		if index >= 4:
			origin = Vector2i(5 + (index - 4) * 14, 28)
		origin += Vector2i(rng.randi_range(0, 1), rng.randi_range(0, 2))
		var footprint := Rect2i(origin, Vector2i(rng.randi_range(9, 11), rng.randi_range(7, 9)))
		var door := Vector2i(origin.x + footprint.size.x / 2, footprint.end.y - 1)
		services[index]["building"] = footprint
		services[index]["door"] = door
		services[index]["cell"] = Vector2i(door.x, origin.y + 3)
		for x in range(footprint.position.x, footprint.end.x):
			walls[Vector2i(x, footprint.position.y)] = true
			walls[Vector2i(x, footprint.end.y - 1)] = true
		for y in range(footprint.position.y, footprint.end.y):
			walls[Vector2i(footprint.position.x, y)] = true
			walls[Vector2i(footprint.end.x - 1, y)] = true
		walls.erase(door)
		var street_y := 20 if index < 4 else 39
		for y in range(door.y, street_y + 1):
			for x in range(door.x - 1, door.x + 2):
				if not walls.has(Vector2i(x, y)):
					roads[Vector2i(x, y)] = true
	for x in range(1, SIZE.x - 1):
		for y in range(18, 23):
			roads[Vector2i(x, y)] = true
		for y in range(39, 41):
			roads[Vector2i(x, y)] = true
	for y in range(1, SIZE.y - 1):
		for x in range(1, 4):
			roads[Vector2i(x, y)] = true
		for x in range(63, 66):
			roads[Vector2i(x, y)] = true
	var pool_x := rng.randi_range(49, 52)
	for x in range(pool_x, pool_x + 9):
		for y in range(31, 38):
			water[Vector2i(x, y)] = true
	landmarks[10]["cell"] = Vector2i(pool_x + 1, 30)
	landmarks[11]["cell"] = Vector2i(pool_x + 7, 30)
	var workstation_x := [24, 30, 36]
	for index in range(workstation_x.size() - 1, 0, -1):
		var other := rng.randi_range(0, index)
		var swap: int = workstation_x[index]
		workstation_x[index] = workstation_x[other]
		workstation_x[other] = swap
	for index in range(3):
		landmarks[7 + index]["cell"] = Vector2i(workstation_x[index], rng.randi_range(24, 25))
	landmarks[12]["cell"] = Vector2i(58, rng.randi_range(24, 26))
	landmarks[13]["cell"] = Vector2i(8, 23)
	landmarks[14]["cell"] = Vector2i(SIZE.x - 2, 20)
	return {"landmarks": landmarks, "walls": walls, "water": water, "roads": roads, "spawn": Vector2i(3, 12)}


static func tree_landmarks(size: Vector2i, landmarks: Array, blocked: Dictionary, roads: Dictionary, spawn: Vector2i, seed_value: int, count: int) -> Array[Dictionary]:
	var reserved := roads.duplicate()
	for place: Dictionary in landmarks:
		var cell: Vector2i = place["cell"]
		for x in range(cell.x - 1, cell.x + 2):
			for y in range(cell.y - 1, cell.y + 2):
				reserved[Vector2i(x, y)] = true
		if place.has("building"):
			var footprint: Rect2i = place["building"]
			for x in range(footprint.position.x - 1, footprint.end.x + 1):
				for y in range(footprint.position.y - 1, footprint.end.y + 1):
					reserved[Vector2i(x, y)] = true
		if place.has("door"):
			var door: Vector2i = place["door"]
			for x in range(door.x - 1, door.x + 2):
				for y in range(door.y - 1, door.y + 2):
					reserved[Vector2i(x, y)] = true
	var occupied := blocked.duplicate()
	for place: Dictionary in landmarks:
		occupied[place["cell"]] = true
	var reachable := _tree_reachable(size, occupied, spawn)
	var candidates: Array[Vector2i] = []
	for cell: Vector2i in reachable:
		if not reserved.has(cell) and cell.distance_squared_to(spawn) > 4:
			candidates.append(cell)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	for index in range(candidates.size() - 1, 0, -1):
		var other := rng.randi_range(0, index)
		var swap := candidates[index]
		candidates[index] = candidates[other]
		candidates[other] = swap
	var trees: Array[Dictionary] = []
	for cell in candidates:
		if trees.size() >= count:
			break
		if reserved.has(cell):
			continue
		occupied[cell] = true
		if _tree_reachable(size, occupied, spawn).size() != reachable.size() - trees.size() - 1:
			occupied.erase(cell)
			continue
		trees.append({"id": "tree", "cell": cell, "label": "Tree"})
		for x in range(cell.x - 2, cell.x + 3):
			for y in range(cell.y - 2, cell.y + 3):
				reserved[Vector2i(x, y)] = true
	return trees


static func _tree_reachable(size: Vector2i, blocked: Dictionary, spawn: Vector2i) -> Dictionary:
	var reachable := {spawn: true}
	var pending: Array[Vector2i] = [spawn]
	var index := 0
	while index < pending.size():
		var cell := pending[index]
		index += 1
		for direction in [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]:
			var neighbor: Vector2i = cell + direction
			if neighbor.x < 0 or neighbor.y < 0 or neighbor.x >= size.x or neighbor.y >= size.y:
				continue
			if blocked.has(neighbor) or reachable.has(neighbor):
				continue
			reachable[neighbor] = true
			pending.append(neighbor)
	return reachable
