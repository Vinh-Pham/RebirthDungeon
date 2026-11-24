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


func test_chest_selection_defaults_and_survives_claimed_save() -> void:
	assert_eq(Store._normalize_world({})["threshold_treasure_chest"], -1)
	var legacy := Store._normalize_world({"threshold_cleared": 8, "threshold_treasure_claimed": true})
	assert_eq(legacy["threshold_treasure_chest"], -1)
	for index in range(5):
		var world := Store._normalize_world({"threshold_cleared": 8, "threshold_treasure_claimed": true, "threshold_treasure_chest": index})
		assert_eq(world["threshold_treasure_chest"], index)


func test_invalid_or_unclaimed_chest_selection_is_rejected() -> void:
	for value in [-2, 5, 1.5, "1"]:
		assert_eq(Store._normalize_world({"threshold_cleared": 8, "threshold_treasure_claimed": true, "threshold_treasure_chest": value}), {})
	assert_eq(Store._normalize_world({"threshold_cleared": 8, "threshold_treasure_chest": 0}), {})


func test_opened_chest_keeps_uncollected_reward_in_character_save() -> void:
	for item_id in ["tonic", "cobweb", "cloth", "fish", "fiber"]:
		var pending := {"gold": 60}
		pending[item_id] = 3
		var world := Store._normalize_world({
			"threshold_cleared": 8,
			"threshold_treasure_claimed": true,
			"threshold_treasure_chest": 0,
			"pending_loot": pending,
		})
		assert_false(world.is_empty())
		if world.is_empty():
			continue
		assert_eq(world["pending_loot"], pending)
		assert_eq(world["gold"], Store.WORLD_DEFAULTS["gold"])
		assert_eq(world["tonics"], Store.WORLD_DEFAULTS["tonics"])
		assert_eq(world["town_materials"], Store.WORLD_DEFAULTS["town_materials"])
