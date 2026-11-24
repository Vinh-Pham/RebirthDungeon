extends RefCounted

const ARMOR := {"id": "riveted_jack", "name": "Riveted Jack", "defense": 2, "max_durability": 15000}
const ATTACK_WEAR := 25
const SMASH_WEAR := 30
const ARMOR_WEAR := 25
const REPAIR_PRICE := 2


static func maximum(item: Dictionary) -> int:
	if item.is_empty():
		return 0
	var defaults := {"light": 10000, "rapier": 9000, "heavy": 15000, "piercing": 12000}
	return int(item.get("max_durability", defaults.get(item.get("family", ""), 10000)))


static func current(world: Dictionary, item: Dictionary) -> int:
	return clampi(int(world.get("equipment_durability", {}).get(item.get("id", ""), maximum(item))), 0, maximum(item))


static func condition_text(world: Dictionary, item: Dictionary, whole_points := false) -> String:
	var remaining := current(world, item)
	var limit := maximum(item)
	var status := ""
	if remaining == 0:
		status = " · Broken"
	elif remaining * 5 <= limit:
		status = " · Low"
	if whole_points:
		return "%d/%d durability%s" % [ceili(remaining / 1000.0), ceili(limit / 1000.0), status]
	return "Durability %.3f / %.3f%s" % [remaining / 1000.0, limit / 1000.0, status]


static func usable_weapon(world: Dictionary, weapon: Dictionary) -> Dictionary:
	return weapon if current(world, weapon) > 0 else {}


static func armor_defense(world: Dictionary) -> int:
	return int(ARMOR["defense"]) if world.get("armor_owned", false) and current(world, ARMOR) > 0 else 0


static func wear(world: Dictionary, weapon: Dictionary, weapon_wear: int, armor_hit: bool) -> Dictionary:
	var durability: Dictionary = world.get("equipment_durability", {}).duplicate()
	if weapon.has("id") and weapon_wear > 0:
		durability[weapon["id"]] = maxi(0, current(world, weapon) - weapon_wear)
	if armor_hit and world.get("armor_owned", false):
		durability[ARMOR["id"]] = maxi(0, current(world, ARMOR) - ARMOR_WEAR)
	return durability


static func repair_cost(world: Dictionary, item: Dictionary, full: bool) -> int:
	var missing := maximum(item) - current(world, item)
	var restored := missing if full else mini(1000, missing)
	return ceili(restored / 1000.0) * REPAIR_PRICE


static func repair(world: Dictionary, item: Dictionary, full: bool) -> Dictionary:
	var missing := maximum(item) - current(world, item)
	var price := repair_cost(world, item, full)
	if item.is_empty() or missing <= 0 or int(world.get("gold", 0)) < price:
		return {}
	var durability: Dictionary = world.get("equipment_durability", {}).duplicate()
	durability[item["id"]] = current(world, item) + (missing if full else mini(1000, missing))
	return {"equipment_durability": durability, "gold": int(world["gold"]) - price}
