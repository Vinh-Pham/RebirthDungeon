extends GutTest

const Stats = preload("res://scripts/character_stats.gd")


func test_level_thresholds_and_ability_points() -> void:
	var before := Stats.snapshot({"experience": 99})
	var after := Stats.snapshot({"experience": 100})
	var third := Stats.snapshot({"experience": 300})
	assert_eq(before["level"], 1)
	assert_eq(after["level"], 2)
	assert_eq(after["experience"], 0)
	assert_eq(after["ability_points"], 1)
	assert_eq(third["level"], 3)
	assert_eq(third["experience"], 0)
	assert_eq(third["next_level_experience"], 300)


func test_weapon_damage_uses_same_attribute_bonus() -> void:
	var unarmed := Stats.snapshot({})
	var sword := Stats.snapshot({}, {"damage_min": 15, "damage_max": 25})
	assert_eq(sword["damage_min"] - unarmed["damage_min"], 11)
	assert_eq(sword["damage_max"] - unarmed["damage_max"], 21)
	assert_almost_eq(unarmed["critical"] - sword["critical"], 10.0, 0.001)


func test_cosmetic_choices_do_not_change_stats() -> void:
	var baseline := Stats.snapshot({"age": 19, "lineage": 1, "talent": 2})
	var appearance := Stats.snapshot({"age": 19, "lineage": 1, "talent": 2, "hair": 3, "skin": 2, "body": 2})
	assert_eq(baseline, appearance)


func test_melee_rolls_stay_inside_displayed_damage_range() -> void:
	var stats := Stats.snapshot({}, {"damage_min": 3, "damage_max": 25})
	var rng := RandomNumberGenerator.new()
	rng.seed = 123
	for roll in range(100):
		var damage := Stats.roll_melee(stats, rng)
		assert_between(damage, int(stats["damage_min"]), int(stats["damage_max"]))
