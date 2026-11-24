extends GutTest

const Durability = preload("res://scripts/equipment_durability.gd")
const Store = preload("res://scripts/character_store.gd")
const SWORD := {"id": "test_sword", "family": "light"}


func test_missing_condition_is_full_and_wear_uses_integer_precision() -> void:
	var world := {"gold": 10, "armor_owned": true}
	assert_eq(Durability.current(world, SWORD), 10000)
	var worn := Durability.wear(world, SWORD, Durability.ATTACK_WEAR, true)
	assert_eq(worn["test_sword"], 9975)
	assert_eq(worn["riveted_jack"], 14975)
	assert_false(world.has("equipment_durability"))


func test_broken_equipment_loses_bonuses_and_repairs_restore_condition() -> void:
	var world := {"gold": 10, "armor_owned": true, "equipment_durability": {"test_sword": 0, "riveted_jack": 0}}
	assert_eq(Durability.usable_weapon(world, SWORD), {})
	assert_eq(Durability.armor_defense(world), 0)
	var repaired := Durability.repair(world, SWORD, false)
	assert_eq(repaired["gold"], 8)
	assert_eq(repaired["equipment_durability"]["test_sword"], 1000)
	assert_eq(Durability.repair(world, SWORD, true), {})
	assert_eq(Durability.repair_cost(world, SWORD, true), 20)


func test_save_normalization_accepts_legacy_and_rejects_invalid_condition() -> void:
	var legacy := Store._normalize_world({})
	assert_false(legacy["armor_owned"])
	assert_eq(legacy["equipment_durability"], {})
	assert_eq(Store._normalize_world({"equipment_durability": {"test": -1}}), {})
	assert_eq(Store._normalize_world({"equipment_durability": {"test": 0.5}}), {})
