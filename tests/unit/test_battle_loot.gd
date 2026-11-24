extends GutTest

const Loot = preload("res://scripts/battle_loot.gd")
const Store = preload("res://scripts/character_store.gd")


func test_spider_drop_bounds_and_seeded_results() -> void:
	var first := RandomNumberGenerator.new()
	var second := RandomNumberGenerator.new()
	first.seed = 71
	second.seed = 71
	var saw_empty := false
	var saw_web := false
	for index in range(100):
		var drops := Loot.roll([{"name": "White Spider"}], first)
		assert_eq(drops, Loot.roll([{"name": "White Spider"}], second))
		assert_between(int(drops.get("cobweb", 0)), 0, 3)
		assert_between(int(drops.get("gold", 0)), 0, 6)
		saw_empty = saw_empty or not drops.has("cobweb")
		saw_web = saw_web or drops.has("cobweb")
	assert_true(saw_empty)
	assert_true(saw_web)


func test_selecting_stacks_preserves_remaining_loot_and_cannot_repeat() -> void:
	var world := Store._normalize_world({"pending_loot": {"cobweb": 3, "gold": 4}})
	var changes := Loot.collect(world, ["cobweb", "cobweb"])
	assert_eq(changes["town_materials"]["cobweb"], 3)
	assert_eq(changes["pending_loot"], {"gold": 4})
	world.merge(changes, true)
	assert_eq(Loot.collect(world, ["cobweb"]), {})
	changes = Loot.collect(world, ["cobweb", "gold"])
	assert_eq(changes["gold"], 28)
	assert_eq(changes["pending_loot"], {})


func test_capacity_keeps_uncollected_stack() -> void:
	var world := Store._normalize_world({"gold": Store.MAX_EXPERIENCE, "pending_loot": {"gold": 2, "cobweb": 1}})
	var changes := Loot.collect(world, ["gold", "cobweb"])
	assert_eq(changes["pending_loot"], {"gold": 2})
	assert_eq(changes["town_materials"]["cobweb"], 1)
	assert_false(changes.has("gold"))


func test_legacy_and_invalid_pending_loot() -> void:
	var legacy := Store._normalize_world({})
	assert_eq(legacy["pending_loot"], {})
	assert_eq(legacy["town_materials"]["cobweb"], 0)
	for invalid in [[], {"unknown": 1}, {"gold": 0}, {"cobweb": -1}, {"gold": 1.5}]:
		assert_eq(Store._normalize_world({"pending_loot": invalid}), {})
	assert_eq(Loot.combine({"cobweb": 1}, {"gold": 2, "cobweb": 3}), {"cobweb": 4, "gold": 2})


func test_cobweb_loot_requires_capacity_for_the_whole_selected_stack() -> void:
	var world := Store._normalize_world({
		"town_materials": {"cobweb": 98},
		"pending_loot": {"cobweb": 2, "gold": 4},
	})
	var changes := Loot.collect(world, ["cobweb", "gold"], 99)
	assert_eq(changes["pending_loot"], {"cobweb": 2})
	assert_eq(changes["gold"], 28)
	assert_false(changes.has("town_materials"))
	changes = Loot.collect(world, ["cobweb"], 198)
	assert_eq(changes["town_materials"]["cobweb"], 100)
	assert_eq(changes["pending_loot"], {"gold": 4})
