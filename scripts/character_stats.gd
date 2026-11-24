extends RefCounted
## Derived formulas adapted from https://wiki.mabinogiworld.com/view/Stats
## Starting values, lineage/talent bonuses, age gains and XP thresholds are
## original Rebirth Dungeon balance. Appearance choices do not alter attributes.

const Durability = preload("res://scripts/equipment_durability.gd")
const Skills = preload("res://scripts/character_skills.gd")

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
	var level := Skills.level_for_experience(total_xp)
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
		"ability_points": Skills.available_ap(profile),
	}
	var lineage := clampi(int(profile.get("lineage", 0)), 0, LINEAGE_BONUSES.size() - 1)
	var talent := clampi(int(profile.get("talent", 0)), 0, TALENT_BONUSES.size() - 1)
	for bonus: Dictionary in [LINEAGE_BONUSES[lineage], TALENT_BONUSES[talent]]:
		for key: String in bonus:
			stats[key] += bonus[key]
	var learned: Array = world.get("skills", Skills.STARTING).keys()
	var skill_effects := {}
	for id: String in learned:
		skill_effects[id] = Skills.effects(world, id)
	stats["learned_skills"] = learned
	stats["skill_effects"] = skill_effects
	var mastery: Dictionary = skill_effects.get("combat_mastery", {})
	var defense: Dictionary = skill_effects.get("defense", {})
	var critical_hit: Dictionary = skill_effects.get("critical_hit", {})
	var sword_mastery: Dictionary = skill_effects.get("sword_mastery", {})
	var sword := sword_mastery if not weapon.is_empty() else {}
	var windmill: Dictionary = skill_effects.get("windmill", {})
	var counter: Dictionary = skill_effects.get("counterattack", {})
	var smash: Dictionary = skill_effects.get("smash", {})
	var armor_defense := Durability.armor_defense(world)
	var light_armor: Dictionary = skill_effects.get("light_armor_mastery", {}) if armor_defense > 0 else {}
	stats["light_armor_equipped"] = armor_defense > 0
	stats["life"] += int(mastery.get("additional_hp_total", 0)) + int(defense.get("additional_hp_total", 0))
	stats["strength"] += int(mastery.get("additional_strength_human_total", 0)) + int(windmill.get("additional_str_total", 0)) + int(smash.get("additional_str_and_will_total", 0))
	stats["dexterity"] += int(mastery.get("additional_dexterity_human_total", 0)) + int(counter.get("additional_dexterity_total", 0)) + int(sword_mastery.get("additional_dex_total", 0))
	stats["will"] += int(critical_hit.get("additional_will_total", 0)) + int(windmill.get("additional_will_total", 0)) + int(smash.get("additional_str_and_will_total", 0))
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
	minimum += int(mastery.get("additional_min_damage_human_total", 0)) + int(sword.get("additional_min_damage", 0))
	maximum += int(mastery.get("additional_max_damage_human_total", 0)) + int(sword.get("additional_max_damage", 0))
	stats["damage_max"] = maxi(0, maximum)
	stats["damage_min"] = clampi(minimum, 0, stats["damage_max"])
	# The wiki's inverse Balance curve uses displayed DEX and already includes a baseline.
	var displayed_dexterity := float(stats["dexterity"])
	var dex_balance := clampf(8.728944 * log((displayed_dexterity + 9.814582) / 20.34565) / log(2.0), 0.0, 50.0)
	# Original sword handling bonus added to the wiki's diminishing DEX bonus.
	var weapon_balance := 30.0 if weapon.is_empty() else 35.0
	var skill_balance := float(mastery.get("additional_melee_balance_total", 0)) + float(sword.get("additional_sword_balance", 0))
	stats["balance"] = clampf(dex_balance + weapon_balance + skill_balance, 0.0, 80.0)
	stats["critical"] = maxf(0.0, will / 10.0 + luck / 5.0 + (10.0 if weapon.is_empty() else 0.0))
	stats["critical_multiplier"] = 1.0 + float(critical_hit.get("additional_damage", 50)) / 100.0
	stats["defense"] = int(floor(strength / 10.0)) + armor_defense + int(defense.get("additional_base_defense_human_total", 0)) + int(light_armor.get("additional_defense", 0))
	stats["protection"] = float(light_armor.get("additional_protection", 0))
	stats["magic_attack"] = intelligence / 5.0
	stats["magic_defense"] = int(floor(will / 10.0)) + int(light_armor.get("additional_magic_defense", 0))
	stats["magic_protection"] = int(floor(intelligence / 20.0)) + int(light_armor.get("additional_magic_protection", 0))
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
