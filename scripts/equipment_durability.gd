extends RefCounted

const Catalog = preload("res://scripts/sword_catalog.gd")
const ARMOR := {"id": "riveted_jack", "name": "Riveted Jack", "defense": 2, "max_durability": 15000, "armor_class": "light"}
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


static func equipped_armor(world: Dictionary) -> Dictionary:
	var equipped_id: String = world.get("gear_inventory", {}).get("slots", {}).get("armor", "")
	if not equipped_id.is_empty():
		return Catalog.shop_stock().get(equipped_id, {})
	return ARMOR if world.get("armor_owned", false) else {}


static func armor_defense(world: Dictionary) -> int:
	var armor := equipped_armor(world)
	return int(armor.get("defense", 0)) if current(world, armor) > 0 else 0


static func equipment_defense(world: Dictionary) -> int:
	var defense := 0
	for item: Dictionary in _worn_protection(world):
		if current(world, item) > 0:
			defense += int(item.get("defense", 0))
	return defense


static func _worn_protection(world: Dictionary) -> Array[Dictionary]:
	var armor := equipped_armor(world)
	var worn: Array[Dictionary] = []
	if not armor.is_empty():
		worn.append(armor)
	var slots: Dictionary = world.get("gear_inventory", {}).get("slots", {})
	if not slots.is_empty():
		var stock := Catalog.shop_stock()
		for slot in slots:
			var item: Dictionary = stock.get(slots[slot], {})
			if slot != "armor" and item.has("defense"):
				worn.append(item)
	return worn


static func wear(world: Dictionary, weapon: Dictionary, weapon_wear: int, armor_hit: bool) -> Dictionary:
	var durability: Dictionary = world.get("equipment_durability", {}).duplicate()
	if weapon.has("id") and weapon_wear > 0:
		durability[weapon["id"]] = maxi(0, current(world, weapon) - weapon_wear)
	if armor_hit:
		for item: Dictionary in _worn_protection(world):
			durability[item["id"]] = maxi(0, current(world, item) - ARMOR_WEAR)
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
