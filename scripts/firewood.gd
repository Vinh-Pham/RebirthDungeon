extends RefCounted
## A standing tree holds up to five pieces. Its recovery clock runs even off-map.

const Store = preload("res://scripts/character_store.gd")
const CAPACITY := 5
const REGROWTH_SECONDS := 300


static func tree_key(town: String, cell: Vector2i) -> String:
	return "%s:%d:%d" % [town, cell.x, cell.y]


static func status(world: Dictionary, key: String, now_seconds: int) -> Dictionary:
	var state: Dictionary = world.get("tree_harvests", {}).get(key, {})
	var count := int(state.get("count", CAPACITY))
	var next_at := int(state.get("next_at", 0))
	if count < CAPACITY and now_seconds >= next_at:
		@warning_ignore("integer_division")
		var intervals := 1 + (now_seconds - next_at) / REGROWTH_SECONDS
		count = mini(CAPACITY, count + intervals)
		next_at += intervals * REGROWTH_SECONDS
	if count == CAPACITY:
		next_at = 0
	return {
		"count": count,
		"next_at": next_at,
		"seconds_until_next": maxi(0, next_at - now_seconds),
	}


static func harvest(world: Dictionary, key: String, now_seconds: int) -> Dictionary:
	var available := status(world, key, now_seconds)
	if available["count"] <= 0:
		return {"changes": {}, "message": "This tree is regrowing."}
	var materials: Dictionary = world.get("town_materials", {}).duplicate()
	var carried := int(materials.get("firewood", 0))
	if carried >= Store.MAX_EXPERIENCE:
		return {"changes": {}, "message": "You cannot carry more firewood."}
	materials["firewood"] = carried + 1
	var trees: Dictionary = world.get("tree_harvests", {}).duplicate()
	var next_at := int(available["next_at"])
	if next_at == 0:
		next_at = now_seconds + REGROWTH_SECONDS
	trees[key] = {"count": int(available["count"]) - 1, "next_at": next_at}
	return {
		"changes": {"town_materials": materials, "tree_harvests": trees},
		"message": "Collected 1 Firewood.",
	}
