extends GutTest

const Dungeon = preload("res://scripts/dungeon_entry.gd")
const Store = preload("res://scripts/character_store.gd")
const Combat = preload("res://scripts/spider_encounter.gd")

var _dungeon: Control
var _id := ""
var _previous_selection := ""


func before_each() -> void:
	_previous_selection = Store._selected_id
	var profile := {"name": "Dungeon test"}
	for field: String in Store.LIMITS:
		profile[field] = Store.LIMITS[field][0]
	var created := Store.create(profile)
	assert_false(created.is_empty())
	_id = created["id"]
	assert_true(Store.select_character(_id))
	assert_false(Store.update_world({"location": "threshold", "quest": 1}).is_empty())
	_dungeon = Dungeon.new()
	add_child_autofree(_dungeon)


func after_each() -> void:
	Store._selected_id = _previous_selection
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))


func test_room_exit_stays_locked_until_monster_is_defeated() -> void:
	var exit: Vector2i = _dungeon._room["exit"]
	_dungeon.player = exit + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_eq(_dungeon._room_index, 0)
	assert_eq(Store.load_selected()["world"]["threshold_cleared"], 0)


func test_touching_monster_starts_battle_and_victory_saves_progress_and_xp() -> void:
	var enemy: Vector2i = _dungeon._room["enemy"]
	_dungeon.player = enemy + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_true(_dungeon._warrens.visible)
	assert_true(_dungeon._warrens._match.active)
	_dungeon._warrens._match.enemy_health = 1
	_dungeon._warrens._match.intent = Combat.Action.ATTACK
	_dungeon._warrens._match.player_gauge = 1.0
	_dungeon._warrens._act(Combat.Action.ATTACK)
	assert_false(_dungeon._warrens._match.active)
	var saved := Store.load_selected()
	assert_eq(saved["world"]["threshold_cleared"], 1)
	assert_gt(int(saved["experience"]), 0)
	_dungeon._warrens._back()
	var exit: Vector2i = _dungeon._room["exit"]
	_dungeon.player = exit + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_eq(_dungeon._room_index, 1)


func test_boss_unlocks_treasure_and_chest_reward_can_only_be_claimed_once() -> void:
	assert_false(Store.update_world({"threshold_cleared": 7}).is_empty())
	_dungeon._profile = Store.load_selected()
	_dungeon._show_room(7)
	var exit: Vector2i = _dungeon._room["exit"]
	_dungeon.player = exit + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_eq(_dungeon._room_index, 7)
	var enemy: Vector2i = _dungeon._room["enemy"]
	_dungeon.player = enemy + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_true(_dungeon._warrens._match.active)
	_dungeon._warrens._match.enemy_health = 1
	_dungeon._warrens._match.intent = Combat.Action.DEFEND
	_dungeon._warrens._match.player_gauge = 1.0
	_dungeon._warrens._act(Combat.Action.ATTACK)
	assert_eq(Store.load_selected()["world"]["threshold_cleared"], 8)
	_dungeon._warrens._back()
	_dungeon.player = exit + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_eq(_dungeon._room_index, 8)
	var before := Store.load_selected()
	var chest: Vector2i = _dungeon._room["chest"]
	_dungeon.player = chest + Vector2i.LEFT
	_dungeon._interact()
	var reward := Store.load_selected()
	assert_true(reward["world"]["threshold_treasure_claimed"])
	assert_eq(int(reward["world"]["gold"]), int(before["world"]["gold"]) + 60)
	assert_eq(int(reward["world"]["tonics"]), int(before["world"]["tonics"]) + 3)
	_dungeon._interact()
	assert_eq(Store.load_selected()["world"], reward["world"])
