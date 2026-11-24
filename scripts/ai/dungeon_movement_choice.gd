@tool
extends BTAction

enum Mode { PURSUE, WANDER, HOLD }

@export var mode := Mode.PURSUE


func _tick(_delta: float) -> Status:
	var pursuing: bool = blackboard.get_var("pursuing")
	if mode == Mode.PURSUE and not pursuing:
		return FAILURE
	if mode == Mode.WANDER and pursuing:
		return FAILURE
	var candidates: Array[Vector2i] = blackboard.get_var("candidates")
	if mode == Mode.HOLD:
		blackboard.set_var("destination", blackboard.get_var("origin"))
		return SUCCESS
	if mode == Mode.PURSUE:
		var distances: Dictionary = blackboard.get_var("distances")
		var origin: Vector2i = blackboard.get_var("origin")
		var best: int = distances[origin]
		var nearest: Array[Vector2i] = []
		for cell in candidates:
			var distance: int = distances.get(cell, best + 1)
			if distance > best:
				continue
			if distance < best:
				nearest.clear()
				best = distance
			nearest.append(cell)
		candidates = nearest
	if candidates.is_empty():
		return FAILURE
	var rng: RandomNumberGenerator = blackboard.get_var("rng")
	blackboard.set_var("destination", candidates[rng.randi_range(0, candidates.size() - 1)])
	return SUCCESS
