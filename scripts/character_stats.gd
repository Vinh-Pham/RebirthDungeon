extends RefCounted
## Derived formulas adapted from https://wiki.mabinogiworld.com/view/Stats
## Starting values, lineage/talent bonuses, age gains and XP thresholds are
## original Rebirth Dungeon balance. Appearance choices do not alter attributes.

const Durability = preload("res://scripts/equipment_durability.gd")

const LINEAGE_BONUSES := [
	{"life": 5, "will": 3},
	{"mana": 10, "intelligence": 4, "dexterity": 2},
	{"life": 10, "strength": 4, "stamina": 5},
]
const TALENT_BONUSES := [
	{"life": 10, "strength": 4, "will": 2},
	{"mana": 15, "intelligence": 6},
	{"stamina": 10, "dexterity": 4, "luck": 4},
]


static func snapshot(profile: Dictionary, weapon: Dictionary = {}) -> Dictionary:
	var world: Dictionary = profile.get("world", {})
	weapon = Durability.usable_weapon(world, weapon)
	var total_xp := maxi(0, int(profile.get("experience", 0)))
	var level := maxi(1, int(floor((1.0 + sqrt(1.0 + float(total_xp) * 0.08)) / 2.0)))
	var previous_threshold := 50 * level * (level - 1)
	var growth := level - 1
	var age_gain := clampi(int(profile.get("age", 17)), 17, 25) - 17
	var stats := {
		"life": 100 + growth * 5 + age_gain * 2,
		"mana": 35 + growth * 3,
		"stamina": 40 + growth * 3 + age_gain,
		"strength": 18 + growth + age_gain * 0.5,
		"intelligence": 18 + growth,
		"dexterity": 18 + growth,
		"will": 18 + growth + age_gain * 0.5,
		"luck": 16 + growth * 0.5,
		"level": level, "total_experience": total_xp,
		"experience": total_xp - previous_threshold,
		"next_level_experience": level * 100,
		"ability_points": growth,
	}
	var lineage := clampi(int(profile.get("lineage", 0)), 0, LINEAGE_BONUSES.size() - 1)
	var talent := clampi(int(profile.get("talent", 0)), 0, TALENT_BONUSES.size() - 1)
	for bonus: Dictionary in [LINEAGE_BONUSES[lineage], TALENT_BONUSES[talent]]:
		for key: String in bonus:
			stats[key] += bonus[key]
	for key in ["life", "mana", "stamina"]:
		stats[key] = mini(int(stats[key]), 2500)
	for key in ["strength", "intelligence", "dexterity", "will", "luck"]:
		stats[key] = minf(float(stats[key]), 1500.0)

	var strength := maxf(0.0, float(stats["strength"]) - 10.0)
	var intelligence := maxf(0.0, float(stats["intelligence"]) - 10.0)
	var dexterity := maxf(0.0, float(stats["dexterity"]) - 10.0)
	var will := maxf(0.0, float(stats["will"]) - 10.0)
	var luck := maxf(0.0, float(stats["luck"]) - 10.0)
	var minimum := int(weapon.get("damage_min", 4)) + int(floor(strength / 3.0))
	var maximum := int(weapon.get("damage_max", 4)) + int(floor(strength / 2.5))
	stats["damage_max"] = maxi(0, maximum)
	stats["damage_min"] = clampi(minimum, 0, stats["damage_max"])
	# The wiki's inverse Balance curve uses displayed DEX and already includes a baseline.
	var displayed_dexterity := float(stats["dexterity"])
	var dex_balance := clampf(8.728944 * log((displayed_dexterity + 9.814582) / 20.34565) / log(2.0), 0.0, 50.0)
	# Original sword handling bonus added to the wiki's diminishing DEX bonus.
	var weapon_balance := 30.0 if weapon.is_empty() else 35.0
	stats["balance"] = clampf(dex_balance + weapon_balance, 0.0, 80.0)
	stats["critical"] = maxf(0.0, will / 10.0 + luck / 5.0 + (10.0 if weapon.is_empty() else 0.0))
	stats["defense"] = int(floor(strength / 10.0)) + Durability.armor_defense(world)
	stats["protection"] = 0.0
	stats["magic_attack"] = intelligence / 5.0
	stats["magic_defense"] = int(floor(will / 10.0))
	stats["magic_protection"] = int(floor(intelligence / 20.0))
	stats["magic_balance"] = minf(100.0, intelligence / 4.0 + 30.0)
	stats["armor_pierce"] = int(floor(dexterity / 15.0))
	stats["injury_min"] = (dexterity + will) / 20.0
	stats["injury_max"] = dexterity / 10.0 + will / 5.0
	return stats


static func roll_melee(stats: Dictionary, rng: RandomNumberGenerator) -> int:
	var minimum := int(stats["damage_min"])
	var maximum := int(stats["damage_max"])
	if maximum <= minimum:
		return minimum
	# Approximation of the documented bell-shaped, balance-weighted distribution.
	var median := minimum + (maximum - minimum) * float(stats["balance"]) / 100.0
	var spread := maxf(median - minimum, maximum - median) / 2.0
	return clampi(int(round(rng.randfn(median, spread))), minimum, maximum)
