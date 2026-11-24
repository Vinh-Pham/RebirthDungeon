extends RefCounted

const Store = preload("res://scripts/character_store.gd")
const ITEM_NAMES := {"cobweb": "Cobweb", "gold": "Gold"}


static func roll(enemies: Array, rng: RandomNumberGenerator) -> Dictionary:
	var drops := {}
	for enemy: Dictionary in enemies:
		if "spider" in String(enemy.get("name", "")).to_lower():
			var count := rng.randi_range(0, 3)
			if count > 0:
				drops["cobweb"] = int(drops.get("cobweb", 0)) + count
		if rng.randi_range(0, 2) == 0:
			drops["gold"] = int(drops.get("gold", 0)) + rng.randi_range(1, 6)
	return drops


static func combine(pending: Dictionary, drops: Dictionary) -> Dictionary:
	var combined := pending.duplicate()
	for item_id in ITEM_NAMES:
		var amount := int(drops.get(item_id, 0))
		if amount > 0:
			combined[item_id] = mini(Store.MAX_EXPERIENCE, int(combined.get(item_id, 0)) + amount)
	return combined


static func collect(world: Dictionary, ids: Array) -> Dictionary:
	var pending: Dictionary = world.get("pending_loot", {}).duplicate()
	var materials: Dictionary = world.get("town_materials", {}).duplicate()
	var gold := int(world.get("gold", 0))
	var changes := {}
	for item_id in ITEM_NAMES:
		if not ids.has(item_id) or not pending.has(item_id):
			continue
		var count := int(pending[item_id])
		var current := gold if item_id == "gold" else int(materials.get(item_id, 0))
		if count > Store.MAX_EXPERIENCE - current:
			continue
		if item_id == "gold":
			gold += count
			changes["gold"] = gold
		else:
			materials[item_id] = current + count
			changes["town_materials"] = materials
		pending.erase(item_id)
	if not changes.is_empty():
		changes["pending_loot"] = pending
	return changes
