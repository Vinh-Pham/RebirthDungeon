extends RefCounted

const Store = preload("res://scripts/character_store.gd")
const GRAIN_PRICE := 2
const FIBER_PRICE := 3
const CLOTH_PRICE := 4
const MEAL_HEAL := 15


static func perform(action: String, world: Dictionary, maximum_health: int) -> Dictionary:
	var materials: Dictionary = Store.WORLD_DEFAULTS["town_materials"].duplicate()
	materials.merge(world.get("town_materials", {}), true)
	var changes := {}
	var message := ""
	match action:
		"fish":
			if int(materials["fish"]) >= Store.MAX_EXPERIENCE:
				return _blocked("You cannot carry more fish.")
			materials["fish"] += 1
			message = "You catch a cave fish."
		"buy_grain", "buy_fiber":
			var material := "grain" if action == "buy_grain" else "fiber"
			var price := GRAIN_PRICE if material == "grain" else FIBER_PRICE
			if int(world["gold"]) < price:
				return _blocked("You need %d gold." % price)
			if int(materials[material]) >= Store.MAX_EXPERIENCE:
				return _blocked("You cannot carry more %s." % material)
			materials[material] += 1
			changes["gold"] = int(world["gold"]) - price
			message = "Bought %s for %d gold." % [material, price]
		"mill", "spin", "weave":
			var recipes := {"mill": ["grain", "flour"], "spin": ["fiber", "thread"], "weave": ["thread", "cloth"]}
			var recipe: Array = recipes[action]
			if int(materials[recipe[0]]) <= 0:
				return _blocked("You need %s first." % recipe[0])
			if int(materials[recipe[1]]) >= Store.MAX_EXPERIENCE:
				return _blocked("You cannot carry more %s." % recipe[1])
			materials[recipe[0]] -= 1
			materials[recipe[1]] += 1
			message = "Made one %s from %s." % [recipe[1], recipe[0]]
		"cook_fish", "bake":
			var ingredient := "fish" if action == "cook_fish" else "flour"
			if int(materials[ingredient]) <= 0:
				return _blocked("You need %s first." % ingredient)
			var health := int(world["health"])
			if health < 0 or health >= maximum_health:
				return _blocked("Life is already full.")
			var restored := mini(MEAL_HEAL, maximum_health - health)
			materials[ingredient] -= 1
			changes["health"] = health + restored
			message = "You prepare a meal and recover %d Life." % restored
		"sell_cloth":
			if int(materials["cloth"]) <= 0:
				return _blocked("You have no cloth to sell.")
			if int(world["gold"]) > Store.MAX_EXPERIENCE - CLOTH_PRICE:
				return _blocked("You cannot carry more gold.")
			materials["cloth"] -= 1
			changes["gold"] = int(world["gold"]) + CLOTH_PRICE
			message = "Sold one cloth for %d gold." % CLOTH_PRICE
		_:
			return _blocked("This activity is unavailable.")
	changes["town_materials"] = materials
	return {"changes": changes, "message": message}


static func _blocked(message: String) -> Dictionary:
	return {"changes": {}, "message": message}
