extends RefCounted

const Store = preload("res://scripts/character_store.gd")
const Consumables = preload("res://scripts/consumables.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")


static func item_name(item_id: String) -> String:
	return "Healing Tonic" if item_id == Consumables.TONIC else item_id.capitalize()


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
	for item_id in drops:
		var amount := int(drops[item_id])
		if amount > 0 and Store.supports_loot_item(item_id):
			combined[item_id] = mini(Store.MAX_EXPERIENCE, int(combined.get(item_id, 0)) + amount)
	return combined


static func collect(world: Dictionary, ids: Array, cobweb_capacity := Satchel.MAX_COBWEB_CAPACITY, gold_capacity := Store.MAX_EXPERIENCE) -> Dictionary:
	var pending: Dictionary = world.get("pending_loot", {}).duplicate()
	var materials: Dictionary = world.get("town_materials", {}).duplicate()
	var changes := {}
	for item_id in pending.keys():
		if not ids.has(item_id) or not Store.supports_loot_item(item_id):
			continue
		var count := int(pending[item_id])
		if item_id == "gold":
			var carried := int(world.get("gold", 0))
			var accepted := mini(count, gold_capacity - carried)
			if accepted > 0:
				changes["gold"] = carried + accepted
				if accepted == count:
					pending.erase(item_id)
				else:
					pending[item_id] = count - accepted
			continue
		var world_balance := Store.LOOT_BALANCE_KEYS.has(item_id)
		var balance_key: String = Store.LOOT_BALANCE_KEYS.get(item_id, item_id)
		var balances := world if world_balance else materials
		var current := int(balances.get(balance_key, 0))
		var capacity := cobweb_capacity if item_id == Satchel.COBWEB_ID else Store.MAX_EXPERIENCE
		if count > capacity - current:
			continue
		if world_balance:
			changes[balance_key] = current + count
		else:
			materials[item_id] = current + count
			changes["town_materials"] = materials
		pending.erase(item_id)
	if not changes.is_empty():
		changes["pending_loot"] = pending
	return changes
