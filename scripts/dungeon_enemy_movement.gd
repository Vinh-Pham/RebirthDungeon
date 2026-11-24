extends RefCounted

const DIRECTIONS := [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]
const PURSUIT_RANGE := 6


static func step(enemies: Array[Vector2i], player: Vector2i, floor_cells: Dictionary, blocked: Dictionary, rng: RandomNumberGenerator) -> int:
	var distances := {player: 0}
	var pending: Array[Vector2i] = [player]
	var cursor := 0
	while cursor < pending.size():
		var cell := pending[cursor]
		cursor += 1
		if distances[cell] >= PURSUIT_RANGE:
			continue
		for direction: Vector2i in DIRECTIONS:
			var next := cell + direction
			if floor_cells.has(next) and not (blocked.has(next) and next != player) and not distances.has(next):
				distances[next] = distances[cell] + 1
				pending.append(next)

	var occupied := {}
	for cell in enemies:
		occupied[cell] = true
	var contact := -1
	for index in enemies.size():
		var origin := enemies[index]
		var candidates: Array[Vector2i] = []
		var best: int = distances.get(origin, PURSUIT_RANGE + 1)
		var pursuing := distances.has(origin)
		for direction: Vector2i in DIRECTIONS:
			var next := origin + direction
			if not floor_cells.has(next) or (blocked.has(next) and next != player) or occupied.has(next):
				continue
			if pursuing:
				var distance: int = distances.get(next, PURSUIT_RANGE + 1)
				if distance > best:
					continue
				if distance < best:
					candidates.clear()
					best = distance
			candidates.append(next)
		if candidates.is_empty():
			continue
		var destination := candidates[rng.randi_range(0, candidates.size() - 1)]
		if destination == player:
			if contact < 0:
				contact = index
			continue
		occupied.erase(origin)
		occupied[destination] = true
		enemies[index] = destination
	return contact
