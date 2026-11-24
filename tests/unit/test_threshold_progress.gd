extends GutTest

const Store = preload("res://scripts/character_store.gd")


func test_legacy_world_gets_dungeon_defaults() -> void:
	var world := Store._normalize_world({})
	assert_eq(world["threshold_cleared"], 0)
	assert_false(world["threshold_treasure_claimed"])


func test_valid_progress_and_treasure_survive_normalization() -> void:
	var world := Store._normalize_world({"threshold_cleared": 8, "threshold_treasure_claimed": true})
	assert_eq(world["threshold_cleared"], 8)
	assert_true(world["threshold_treasure_claimed"])


func test_invalid_progress_and_early_treasure_are_rejected() -> void:
	for value in [-1, 9, 1.5]:
		assert_eq(Store._normalize_world({"threshold_cleared": value}), {})
	assert_eq(Store._normalize_world({"threshold_cleared": 7, "threshold_treasure_claimed": true}), {})
	assert_eq(Store._normalize_world({"threshold_treasure_claimed": 1}), {})


func test_run_counter_defaults_and_rejects_invalid_values() -> void:
	assert_eq(Store._normalize_world({})["threshold_run"], 0)
	assert_eq(Store._normalize_world({"threshold_run": 2})["threshold_run"], 2)
	for value in [-1, 1.5, "2"]:
		assert_eq(Store._normalize_world({"threshold_run": value}), {})
