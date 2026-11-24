extends GutTest

const Store = preload("res://scripts/character_store.gd")
const Data = preload("res://scripts/character_data.gd")
const Stats = preload("res://scripts/character_stats.gd")

var _ids: Array[String] = []


func after_each() -> void:
	for id in _ids:
		DirAccess.remove_absolute(Store.DIRECTORY.path_join(id + ".json"))


func _draft() -> Dictionary:
	var profile := {"name": "Creation test"}
	for key in Store.LIMITS:
		profile[key] = Store.LIMITS[key][0]
	profile["race"] = Data.Race.HUMAN
	profile["talent"] = Data.CLOSE_COMBAT
	return profile


func test_starting_ages_and_races_can_be_created() -> void:
	for race in range(Data.RACES.size()):
		for age in [10, 17]:
			var draft := _draft()
			draft["race"] = race
			draft["age"] = age
			var saved := Store.create(draft)
			assert_false(saved.is_empty())
			if saved.is_empty():
				continue
			_ids.append(saved["id"])
			assert_eq(saved["race"], race)
			assert_eq(saved["age"], age)
			assert_false(saved.has("lineage"))
			assert_gt(Stats.snapshot(saved)["life"], 0)


func test_starting_talents_respect_race_and_adventure_restrictions() -> void:
	assert_false(Data.available_talents(Data.Race.GIANT).has(Data.ARCHERY))
	assert_false(Data.available_talents(Data.Race.ELF).has(Data.LANCE_COMBAT))
	assert_true(Data.available_talents(Data.Race.HUMAN).has(Data.ARCHERY))
	assert_true(Data.available_talents(Data.Race.HUMAN).has(Data.LANCE_COMBAT))
	for race in range(Data.RACES.size()):
		assert_false(Data.available_talents(race).has(Data.ADVENTURE))
	for pair in [[Data.Race.GIANT, Data.ARCHERY], [Data.Race.ELF, Data.LANCE_COMBAT], [Data.Race.HUMAN, Data.ADVENTURE]]:
		var draft := _draft()
		draft["race"] = pair[0]
		draft["talent"] = pair[1]
		assert_eq(Store.create(draft), {})


func test_legacy_lineage_and_older_age_restore_without_losing_progress() -> void:
	var id := Crypto.new().generate_random_bytes(16).hex_encode()
	_ids.append(id)
	var legacy := _draft()
	legacy.erase("race")
	legacy.erase("gender")
	legacy["lineage"] = 2
	legacy["age"] = 25
	legacy["talent"] = 2
	legacy["id"] = id
	legacy["seed"] = 713
	legacy["experience"] = 300
	legacy["world"] = {"gold": 250}
	assert_eq(DirAccess.make_dir_recursive_absolute(Store.DIRECTORY), OK)
	var file := FileAccess.open(Store.DIRECTORY.path_join(id + ".json"), FileAccess.WRITE)
	assert_not_null(file)
	file.store_string(JSON.stringify(legacy))
	file.close()
	var restored := Store._read(id)
	assert_false(restored.is_empty())
	if restored.is_empty():
		return
	assert_eq(restored["race"], Data.Race.GIANT)
	assert_eq(restored["age"], 25)
	assert_eq(Data.TALENTS[restored["talent"]], "Adventure")
	assert_eq(restored["experience"], 300)
	assert_eq(restored["world"]["gold"], 250)
	assert_false(restored.has("lineage"))
	assert_eq(Data.gender_name(restored), "Unspecified")


func test_every_gender_can_save_every_hairstyle() -> void:
	assert_eq(Data.GENDERS, ["Male", "Female", "Nonbinary"])
	assert_eq(Data.HAIR.size(), 12)
	for gender in range(Data.GENDERS.size()):
		for hair in range(Data.HAIR.size()):
			var draft := _draft()
			draft["gender"] = gender
			draft["hair"] = hair
			var saved := Store.create(draft)
			assert_false(saved.is_empty())
			if saved.is_empty():
				continue
			_ids.append(saved["id"])
			var restored := Store._read(saved["id"])
			assert_eq(restored["gender"], gender)
			assert_eq(restored["hair"], hair)
			assert_eq(Data.gender_name(restored), Data.GENDERS[gender])


func test_invalid_gender_and_hair_are_rejected() -> void:
	for field in ["gender", "hair"]:
		var upper: int = Data.GENDERS.size() if field == "gender" else Data.HAIR.size()
		for value in [-1, upper, 1.5, "0"]:
			var draft := _draft()
			draft[field] = value
			assert_eq(Store.create(draft), {})


func test_appearance_colors_survive_character_creation_and_reload() -> void:
	assert_eq(Data.HAIR_TONES.size(), Data.HAIR_COLORS.size())
	assert_eq(Data.EYE_TONES.size(), Data.EYE_COLORS.size())
	var draft := _draft()
	draft["hair_color"] = Data.HAIR_TONES.size() - 1
	draft["eye_color"] = Data.EYE_TONES.size() - 1
	var saved := Store.create(draft)
	assert_false(saved.is_empty())
	if saved.is_empty():
		return
	_ids.append(saved["id"])
	var restored := Store._read(saved["id"])
	assert_eq(restored["hair_color"], draft["hair_color"])
	assert_eq(restored["eye_color"], draft["eye_color"])
