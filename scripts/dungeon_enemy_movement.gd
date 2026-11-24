extends RefCounted

const DIRECTIONS := [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]
const PURSUIT_RANGE := 6
const MOVEMENT_TREE = preload("res://scripts/ai/dungeon_movement.tres")


static func step(enemies: Array[Vector2i], player: Vector2i, floor_cells: Dictionary, blocked: Dictionary, rng: RandomNumberGenerator, owner_node: Node = null) -> int:
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

	var agent := owner_node if owner_node != null else Node.new()
	var blackboard = ClassDB.instantiate("Blackboard")
	var behavior = MOVEMENT_TREE.call("instantiate", agent, blackboard, agent, agent)
	blackboard.set_var("distances", distances)
	blackboard.set_var("rng", rng)
	var occupied := {}
	for cell in enemies:
		occupied[cell] = true
	var contact := -1
	for index in enemies.size():
		var origin := enemies[index]
		var candidates: Array[Vector2i] = []
		var pursuing := distances.has(origin)
		for direction: Vector2i in DIRECTIONS:
			var next := origin + direction
			if not floor_cells.has(next) or (blocked.has(next) and next != player) or occupied.has(next):
				continue
			candidates.append(next)
		blackboard.set_var("origin", origin)
		blackboard.set_var("pursuing", pursuing)
		blackboard.set_var("candidates", candidates)
		behavior.update(0.0)
		var destination: Vector2i = blackboard.get_var("destination")
		if destination == player:
			if contact < 0:
				contact = index
			continue
		occupied.erase(origin)
		occupied[destination] = true
		enemies[index] = destination
	behavior = null
	if owner_node == null:
		agent.free()
	return contact
