extends GutTest

const Skills = preload("res://scripts/character_skills.gd")
const Store = preload("res://scripts/character_store.gd")

var _id := ""
var _previous_selection := ""


func before_each() -> void:
	_previous_selection = Store._selected_id
	var draft := {"name": "Skill progression test"}
	for field: String in Store.LIMITS:
		draft[field] = Store.LIMITS[field][0]
	var profile := Store.create(draft)
	assert_false(profile.is_empty())
	_id = profile["id"]
	assert_true(Store.select_character(_id))


func after_each() -> void:
	Store._selected_id = _previous_selection
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))


func test_all_eleven_skill_catalogs_include_numeric_ranks_and_training() -> void:
	var catalog := Skills.catalog()
	assert_eq(catalog.size(), 11)
	for id: String in Skills.IDS:
		assert_true(catalog.has(id))
		var skill: Dictionary = catalog[id]
		assert_false(String(skill["name"]).is_empty())
		for rank in ["F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1"]:
			var data := Skills.rank_data(id, rank)
			assert_false(data.is_empty(), "%s rank %s" % [id, rank])
			if data.is_empty():
				continue
			assert_true(data["effects"] is Dictionary)
			assert_gte(int(data["ap_cost"]), 0)
			assert_true(data["training"] is Array)
			for task: Dictionary in data["training"]:
				assert_false(String(task["id"]).is_empty())
				assert_gt(float(task["points"]), 0.0)
				assert_gt(int(task["limit"]), 0)


func test_new_and_legacy_characters_have_only_two_novice_skills() -> void:
	var created := Store.load_selected()
	var legacy := Store._normalize_world({})
	assert_eq(created["world"]["skills"], Skills.STARTING)
	assert_eq(legacy["skills"], Skills.STARTING)
	assert_eq(created["world"]["skills"].size(), 2)
	assert_eq(created["world"]["skills"]["combat_mastery"]["rank"], "novice")
	assert_eq(created["world"]["skills"]["defense"]["rank"], "novice")
	assert_eq(Skills.available_ap(created), 0)
	var journal_ids: Array = Skills.entries(created).map(func(row: Dictionary) -> String: return row["id"])
	assert_eq(journal_ids, ["combat_mastery", "defense"])
	var lessons := Skills.entries(created, true)
	assert_eq(lessons.size(), Skills.IDS.size())
	for row: Dictionary in lessons:
		assert_eq(bool(row["learned"]), row["id"] in ["combat_mastery", "defense"])
		assert_false(bool(row["can_learn"]))


func test_combat_mastery_training_caps_counts_and_resets_after_advancement() -> void:
	var before := Store.load_selected()
	assert_false(Store.advance_skill("combat_mastery").has("profile"))
	assert_eq(Store.load_selected(), before)
	var one := Skills.train(before["world"], ["attack"])
	assert_eq(one["combat_mastery"]["training"]["attack"], 1)
	assert_eq(before["world"]["skills"]["combat_mastery"]["training"], {})
	assert_false(Store.update_world({"skills": one}).is_empty())
	assert_false(Store.advance_skill("combat_mastery").has("profile"))
	var trained := Skills.train(Store.load_selected()["world"], ["attack", "attack", "attack"])
	assert_eq(trained["combat_mastery"]["training"]["attack"], 2)
	assert_false(Store.update_world({"skills": trained}).is_empty())
	var result := Store.advance_skill("combat_mastery")
	assert_true(result.has("profile"))
	var state: Dictionary = Store.load_selected()["world"]["skills"]["combat_mastery"]
	assert_eq(state["rank"], "F")
	assert_eq(state["training"], {})
	assert_eq(Store.load_selected()["world"]["spent_ap"], 0)


func test_school_study_completes_defense_lesson_only_once() -> void:
	var profile := Store.load_selected()
	var outside: Array[Dictionary] = Skills.entries(profile)
	var inside: Array[Dictionary] = Skills.entries(profile, true)
	for row: Dictionary in outside:
		assert_false(bool(row["can_study"]))
	var defense: Dictionary = {}
	for row: Dictionary in inside:
		if row["id"] == "defense":
			defense = row
	assert_true(bool(defense["can_study"]))
	assert_false(Store.advance_skill("defense").has("profile"))
	assert_true(Store.study_skill("defense").has("profile"))
	var studied := Store.load_selected()
	assert_eq(studied["world"]["skills"]["defense"]["training"]["study_skill"], 1)
	assert_false(Store.study_skill("defense").has("profile"))
	assert_eq(Store.load_selected(), studied)
	assert_true(Store.advance_skill("defense").has("profile"))
	assert_eq(Store.load_selected()["world"]["skills"]["defense"], {"rank": "F", "training": {}})


func test_levels_award_one_ap_and_learning_charges_exact_cost() -> void:
	assert_eq(Skills.available_ap(Store.load_selected()), 0)
	assert_false(Store.learn_skill("sword_mastery").has("profile"))
	assert_false(Store.award_experience(100).is_empty())
	assert_eq(Skills.available_ap(Store.load_selected()), 1)
	assert_false(Store.learn_skill("critical_hit").has("profile"))
	var trained := Skills.train(Store.load_selected()["world"], ["attack", "attack"])
	assert_false(Store.update_world({"skills": trained}).is_empty())
	assert_true(Store.advance_skill("combat_mastery").has("profile"))
	assert_false(Store.learn_skill("critical_hit").has("profile"))
	assert_false(Store.award_experience(500).is_empty())
	var before := Store.load_selected()
	assert_eq(Skills.available_ap(before), 3)
	var result := Store.learn_skill("critical_hit")
	assert_true(result.has("profile"))
	var learned := Store.load_selected()
	assert_eq(learned["world"]["skills"]["critical_hit"]["rank"], "F")
	var journal_ids: Array = Skills.entries(learned).map(func(row: Dictionary) -> String: return row["id"])
	assert_eq(journal_ids, ["combat_mastery", "defense", "critical_hit"])
	assert_eq(learned["world"]["spent_ap"], 3)
	assert_eq(Skills.available_ap(learned), 0)
	assert_false(Store.learn_skill("critical_hit").has("profile"))
	assert_eq(Store.load_selected(), learned)
	assert_false(Store.award_experience(400).is_empty())
	assert_eq(Skills.available_ap(Store.load_selected()), 1)


func test_failed_save_preserves_completed_training_and_ap() -> void:
	var trained := Skills.train(Store.load_selected()["world"], ["attack", "attack"])
	assert_false(Store.update_world({"skills": trained}).is_empty())
	var before := Store.load_selected()
	var path := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(path), OK)
	assert_false(Store.advance_skill("combat_mastery").has("profile"))
	assert_push_error("Unable to save character.")
	assert_eq(Store.load_selected(), before)
	assert_eq(DirAccess.remove_absolute(path), OK)
	assert_true(Store.advance_skill("combat_mastery").has("profile"))
