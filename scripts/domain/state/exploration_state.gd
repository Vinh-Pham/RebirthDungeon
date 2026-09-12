extends RefCounted
## Explicit continuation; never contains scenes, Nodes, Resources or RIDs.
const LAYOUT = [{"room_id":"room.threshold","x":0.0,"y":0.0},{"room_id":"room.gallery","x":560.0,"y":0.0},{"room_id":"room.sanctum","x":1120.0,"y":0.0}]
var pending_gold: int = 0
var progression: Dictionary = {}
var world_id: String = "dungeon.undercrypt"
var position_x: float = 96.0
var position_y: float = 160.0
var discovered: Array[String] = ["room.threshold"]
var resolved: Array[String] = []
var active_encounter: String = ""

func capture() -> Dictionary:
	return {"progression":progression.duplicate(true),"layout_id":"undercrypt.v1","layout":LAYOUT.duplicate(true),"pending_gold": pending_gold, "world_id": world_id, "position": {"x": position_x, "y": position_y},
		"discovered": discovered.duplicate(), "resolved": resolved.duplicate(),
		"active_encounter": active_encounter}

func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.pending_gold = pending_gold
	result.progression = progression.duplicate(true)
	result.world_id = world_id
	result.position_x = position_x
	result.position_y = position_y
	result.discovered = discovered.duplicate()
	result.resolved = resolved.duplicate()
	result.active_encounter = active_encounter
	return result
