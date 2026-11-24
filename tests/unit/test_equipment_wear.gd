extends GutTest

const Battle = preload("res://scripts/spider_warrens.gd")
const Combat = preload("res://scripts/spider_encounter.gd")
const Store = preload("res://scripts/character_store.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Wear = preload("res://scripts/equipment_durability.gd")

var _battle: Control
var _weapon: Dictionary
var _id := ""
var _previous := ""


func before_each() -> void:
	_previous = Store._selected_id
	var profile := {"name": "Equipment wear fixture"}
	for field: String in Store.LIMITS:
		profile[field] = Store.LIMITS[field][0]
	var created := Store.create(profile)
	_id = created["id"]
	assert_true(Store.select_character(_id))
	assert_false(Store.update_world({"armor_owned": true}).is_empty())
	_weapon = Catalog.items_by_id()["ashen_arcblade"]
	_battle = Battle.new()
	add_child_autofree(_battle)
	_open_battle()


func after_each() -> void:
	Store._selected_id = _previous
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))


func _open_battle() -> void:
	_battle.open_room_enemy(_weapon, null, 42, 0, {
		"name": "Test spider", "sprite": 3, "health": 1000,
		"damage_min": 5, "damage_max": 5, "defense": 0,
		"protection": 0, "experience": 14,
	})


func test_weapon_hit_saves_fractional_wear() -> void:
	_battle._match.intent = Combat.Action.DEFEND
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	var world: Dictionary = Store.load_selected()["world"]
	assert_eq(Wear.current(world, _weapon), Wear.maximum(_weapon) - Wear.ATTACK_WEAR)
	assert_eq(Wear.current(world, Wear.ARMOR), Wear.maximum(Wear.ARMOR))


func test_interrupted_smash_and_defend_preserve_weapon_condition() -> void:
	_battle._match.intent = Combat.Action.ATTACK
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.SMASH)
	var world: Dictionary = Store.load_selected()["world"]
	assert_eq(Wear.current(world, _weapon), Wear.maximum(_weapon))
	assert_eq(Wear.current(world, Wear.ARMOR), Wear.maximum(Wear.ARMOR))
	_battle._match.enemy_gauge = 1.0
	_battle._process(0.0)
	assert_eq(Wear.current(Store.load_selected()["world"], Wear.ARMOR), Wear.maximum(Wear.ARMOR) - Wear.ARMOR_WEAR)
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.DEFEND)
	assert_eq(Wear.current(Store.load_selected()["world"], _weapon), Wear.maximum(_weapon))


func test_last_weapon_durability_breaks_and_stays_zero() -> void:
	assert_false(Store.update_world({"equipment_durability": {_weapon["id"]: 1}}).is_empty())
	_open_battle()
	_battle._match.intent = Combat.Action.DEFEND
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_eq(Wear.current(Store.load_selected()["world"], _weapon), 0)
	assert_true(Wear.usable_weapon(Store.load_selected()["world"], _weapon).is_empty())
	var before: int = _battle._match.enemy_health
	_battle._match.intent = Combat.Action.DEFEND
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_lt(_battle._match.enemy_health, before)
	assert_eq(Wear.current(Store.load_selected()["world"], _weapon), 0)


func test_failed_turn_save_keeps_durability() -> void:
	var before: Dictionary = Store.load_selected()["world"].duplicate(true)
	var temporary := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(temporary), OK)
	_battle._match.intent = Combat.Action.ATTACK
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_push_error("Unable to save character.")
	assert_eq(Store.load_selected()["world"], before)
	assert_eq(_battle._match.round_number, 0)
	assert_eq(DirAccess.remove_absolute(temporary), OK)
