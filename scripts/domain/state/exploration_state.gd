extends RefCounted
## Explicit continuation; never contains scenes, Nodes, Resources or RIDs.
var pending_gold: int = 0
var world_id: String = "dungeon.undercrypt"
var position_x: float = 96.0
var position_y: float = 160.0
var discovered: Array[String] = ["room.threshold"]
var resolved: Array[String] = []
var active_encounter: String = ""

func capture() -> Dictionary:
	return {"pending_gold": pending_gold, "world_id": world_id, "position": {"x": position_x, "y": position_y},
		"discovered": discovered.duplicate(), "resolved": resolved.duplicate(),
		"active_encounter": active_encounter}

func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.pending_gold = pending_gold
	result.world_id = world_id
	result.position_x = position_x
	result.position_y = position_y
	result.discovered = discovered.duplicate()
	result.resolved = resolved.duplicate()
	result.active_encounter = active_encounter
	return result
