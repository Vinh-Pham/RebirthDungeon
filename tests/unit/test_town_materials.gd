extends GutTest

const Store = preload("res://scripts/character_store.gd")


func test_new_character_starts_in_lantern_rest() -> void:
	var profile := {"name": "Town start test"}
	for field: String in Store.LIMITS:
		profile[field] = Store.LIMITS[field][0]
	var created := Store.create(profile)
	assert_false(created.is_empty())
	assert_eq(created["world"]["location"], "lantern_rest")
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(created["id"] + ".json"))


func test_legacy_location_and_missing_materials_are_preserved() -> void:
	var world := Store._normalize_world({"location": "arrival"})
	assert_eq(world["location"], "arrival")
	assert_eq(world["town_materials"]["fish"], 0)
	assert_eq(Store._normalize_world({"town_materials": {"fish": 2.0}})["town_materials"]["fish"], 2)


func test_invalid_material_counts_are_rejected() -> void:
	for materials in [[], {"fish": -1}, {"fish": 1.5}, {"fish": Store.MAX_EXPERIENCE + 1}, {"unknown": 1}]:
		assert_eq(Store._normalize_world({"town_materials": materials}), {})
