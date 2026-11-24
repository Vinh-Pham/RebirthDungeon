extends GutTest

const Warrens = preload("res://scripts/spider_warrens.gd")
const Combat = preload("res://scripts/spider_encounter.gd")
const Store = preload("res://scripts/character_store.gd")
const Consumables = preload("res://scripts/consumables.gd")

var _battle: Control
var _id := ""
var _previous_selection := ""


func before_each() -> void:
	_previous_selection = Store._selected_id
	var profile := {"name": "Battle UI fixture"}
	for field: String in Store.LIMITS:
		profile[field] = Store.LIMITS[field][0]
	var created := Store.create(profile)
	assert_false(created.is_empty())
	_id = created["id"]
	assert_true(Store.select_character(_id))
	assert_false(Store.update_world({"health": 20, "tonics": 3, "quick_slots": ["tonic", "", "", ""]}).is_empty())
	_battle = Warrens.new()
	add_child_autofree(_battle)
	_battle.open({}, null, 42, true)
	_battle._begin()


func after_each() -> void:
	Store._selected_id = _previous_selection
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))


func _enemy_state() -> Array:
	return [_battle._match.enemy_health, _battle._match.intent, _battle._match.round_number, _battle._match.stamina, _battle._match.rng_state, _battle._match.player_gauge, _battle._match.enemy_gauge]


func test_inventory_item_heals_without_spending_a_turn() -> void:
	var before := _enemy_state()
	_battle._item_button.pressed.emit()
	_battle._tonic_button.pressed.emit()
	assert_eq(_battle._match.health, 50)
	assert_eq(Store.load_selected()["world"]["health"], 50)
	assert_eq(Store.load_selected()["world"]["tonics"], 2)
	assert_eq(_enemy_state(), before)


func test_quick_slot_uses_the_saved_assignment_without_spending_a_turn() -> void:
	var before := _enemy_state()
	_battle._quick_slots[0].pressed.emit()
	assert_eq(_battle._match.health, 50)
	assert_eq(Store.load_selected()["world"]["tonics"], 2)
	assert_eq(_enemy_state(), before)
	_battle._use_quick_slot(1)
	assert_eq(_battle._match.health, 50)
	assert_eq(Store.load_selected()["world"]["tonics"], 2)
	assert_eq(_enemy_state(), before)


func test_attack_and_active_skills_spend_one_turn_each() -> void:
	_battle._match.player_gauge = 1.0
	_battle._attack_button.pressed.emit()
	assert_eq(_battle._match.round_number, 1)
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.DEFEND)
	assert_eq(_battle._match.round_number, 2)


func test_action_is_disabled_and_opening_menus_preserves_turn() -> void:
	assert_true(_battle._action_button.disabled)
	_battle._process(Combat.PLAYER_CHARGE_SECONDS)
	var before := _enemy_state()
	_battle._skill_button.pressed.emit()
	assert_true(_battle._skill_options.visible)
	assert_eq(_enemy_state(), before)
	_battle._item_button.pressed.emit()
	assert_true(_battle._item_options.visible)
	assert_eq(_enemy_state(), before)
	assert_true(_battle._quick_slots[0].is_visible_in_tree())
	_battle._quick_slots[0].pressed.emit()
	assert_eq(_battle._match.health, 50)
	assert_eq(_enemy_state(), before)


func test_item_save_failure_does_not_change_battle_or_consume_inventory() -> void:
	var before := _enemy_state()
	var path := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(path), OK)
	_battle._use_item(Consumables.TONIC)
	assert_push_error("Unable to save character.")
	assert_eq(_battle._match.health, 20)
	assert_eq(Store.load_selected()["world"]["tonics"], 3)
	assert_eq(_enemy_state(), before)
	assert_eq(DirAccess.remove_absolute(path), OK)


func test_turn_save_failure_preserves_battle_state_and_damage_roll() -> void:
	_battle._match.player_gauge = 1.0
	var before := _enemy_state()
	var path := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(path), OK)
	_battle._attack_button.pressed.emit()
	assert_push_error("Unable to save character.")
	assert_eq(_battle._match.health, 20)
	assert_true(_battle._match.active)
	assert_eq(_enemy_state(), before)
	assert_eq(DirAccess.remove_absolute(path), OK)


func test_attacks_wait_for_a_full_gauge_and_reset_it() -> void:
	var before := _enemy_state()
	assert_true(_battle._attack_button.disabled)
	assert_true(_battle._skill_button.disabled)
	_battle._act(Combat.Action.ATTACK)
	assert_eq(_enemy_state(), before)
	_battle._process(Combat.PLAYER_CHARGE_SECONDS)
	assert_false(_battle._attack_button.disabled)
	assert_false(_battle._skill_button.disabled)
	assert_eq(_battle._player_gauge.value, 1.0)
	_battle._attack_button.pressed.emit()
	assert_eq(_battle._match.player_gauge, 0.0)
	assert_eq(_battle._player_gauge.value, 0.0)
	assert_true(_battle._attack_button.disabled)
	assert_eq(_battle._match.round_number, 1)


func test_active_clock_continues_while_browsing_skills_or_items() -> void:
	_battle._item_button.pressed.emit()
	assert_true(_battle._item_options.visible)
	_battle._process(1.0)
	assert_gt(_battle._player_gauge.value, 0.0)
	assert_gt(_battle._enemy_gauge.value, 0.0)
	_battle._process(Combat.PLAYER_CHARGE_SECONDS - 1.0)
	_battle._skill_button.pressed.emit()
	assert_true(_battle._skill_options.visible)
	var enemy_time: float = _battle._enemy_gauge.value
	_battle._process(0.5)
	assert_gt(_battle._enemy_gauge.value, enemy_time)
	assert_true(_battle._skill_options.visible)


func test_enemy_attacks_without_waiting_for_a_player_action() -> void:
	_battle._match.intent = Combat.Action.ATTACK
	_battle._match.enemy_gauge = 1.0
	_battle._process(0.0)
	assert_lt(_battle._match.health, 20)
	assert_eq(_battle._match.enemy_gauge, 0.0)
	assert_eq(_battle._match.round_number, 0)
	assert_eq(Store.load_selected()["world"]["health"], _battle._match.health)


func test_enemy_save_failure_keeps_health_and_ready_gauge() -> void:
	_battle._match.intent = Combat.Action.ATTACK
	_battle._match.enemy_gauge = 1.0
	var before: Dictionary = _battle._match.snapshot()
	var temporary := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(temporary), OK)
	_battle._process(0.0)
	assert_push_error("Unable to save character.")
	assert_eq(_battle._match.snapshot(), before)
	assert_eq(Store.load_selected()["world"]["health"], 20)
	assert_eq(DirAccess.remove_absolute(temporary), OK)


func test_group_targets_match_room_and_only_selected_enemy_takes_damage() -> void:
	var enemies := []
	for index in range(3):
		enemies.append({
			"name": "Spider %d" % (index + 1), "sprite": 3, "health": 100,
			"damage_min": 3, "damage_max": 3, "defense": 0,
			"protection": 0, "experience": 10,
		})
	_battle.open_room_enemies({}, null, 42, 0, enemies)
	assert_eq(_battle._match.enemy_count(), 3)
	assert_eq(_battle._enemy_cards.get_child_count(), 3)
	_battle._select_target(1)
	assert_eq(_battle._target_index, 1)
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_eq(_battle._match.enemy_at(0).health, 100)
	assert_lt(_battle._match.enemy_at(1).health, 100)
	assert_eq(_battle._match.enemy_at(2).health, 100)
	assert_eq(Store.load_selected()["world"]["threshold_cleared"], 0)
	_battle._match.enemy_at(1).health = 1
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_eq(_battle._match.enemy_at(1).health, 0)
	assert_true(_battle._match.active)
	assert_ne(_battle._target_index, 1)
	assert_eq(_battle._enemy_cards.get_child_count(), 3)
	assert_eq(Store.load_selected()["experience"], 0)
	for index in [0, 2]:
		_battle._select_target(index)
		_battle._match.enemy_at(index).health = 1
		_battle._match.player_gauge = 1.0
		_battle._act(Combat.Action.ATTACK)
	assert_false(_battle._match.active)
	var saved := Store.load_selected()
	assert_eq(saved["world"]["threshold_cleared"], 1)
	assert_eq(saved["experience"], 30)


func test_multiple_enemy_clocks_advance_and_damage_player_independently() -> void:
	var enemies := []
	for index in range(3):
		enemies.append({
			"name": "Spider %d" % (index + 1), "sprite": 3, "health": 100,
			"damage_min": 3, "damage_max": 3, "defense": 0,
			"protection": 0, "experience": 10,
		})
	_battle.open_room_enemies({}, null, 42, 0, enemies)
	_battle._process(0.5)
	for index in range(3):
		assert_gt(_battle._match.enemy_at(index).gauge, 0.0)
		_battle._match.enemy_at(index).intent = Combat.Action.ATTACK
		_battle._match.enemy_at(index).gauge = 1.0
	var before: int = _battle._match.health
	_battle._process(0.0)
	assert_lt(_battle._match.health, before)
	for index in range(3):
		assert_eq(_battle._match.enemy_at(index).gauge, 0.0)
	assert_eq(_battle._match.round_number, 0)
	assert_eq(Store.load_selected()["world"]["health"], _battle._match.health)


func test_victory_saves_loot_then_collects_only_checked_stacks() -> void:
	assert_false(Store.update_world({"pending_loot": {"cobweb": 2, "gold": 4}}).is_empty())
	_battle._match.enemy_health = 1
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_true(_battle._loot_panel.visible)
	assert_false(_battle._match.active)
	var world: Dictionary = Store.load_selected()["world"]
	var pending: Dictionary = world["pending_loot"]
	assert_gte(int(pending["cobweb"]), 2)
	assert_eq(world["town_materials"]["cobweb"], 0)
	var cobweb: CheckBox = _battle._loot_panel.find_child("Loot_cobweb", true, false)
	cobweb.button_pressed = true
	_battle._loot_panel._take_selected.pressed.emit()
	world = Store.load_selected()["world"]
	assert_eq(world["town_materials"]["cobweb"], pending["cobweb"])
	assert_eq(world["pending_loot"], {})
	assert_eq(world["gold"], 24)
	assert_false(_battle._loot_panel.visible)
	assert_false(_battle.visible)


func test_resumed_loot_survives_failed_claim_and_can_be_left() -> void:
	_battle._back()
	var saved := Store.update_world({"pending_loot": {"cobweb": 2}})
	_battle.open_pending_loot(saved)
	var path := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(path), OK)
	_battle._loot_panel._take_all.pressed.emit()
	assert_push_error("Unable to save character.")
	assert_true(_battle._loot_panel.visible)
	assert_eq(Store.load_selected()["world"]["pending_loot"], {"cobweb": 2})
	assert_eq(Store.load_selected()["world"]["town_materials"]["cobweb"], 0)
	assert_eq(DirAccess.remove_absolute(path), OK)
	_battle._loot_panel._leave.pressed.emit()
	assert_false(_battle.visible)
	assert_eq(Store.load_selected()["world"]["pending_loot"], {})
	assert_eq(Store.load_selected()["world"]["town_materials"]["cobweb"], 0)


func test_take_all_returns_directly_to_map() -> void:
	_battle._back()
	var saved := Store.update_world({"pending_loot": {"cobweb": 3, "gold": 5}})
	_battle.open_pending_loot(saved)
	_battle._loot_panel._take_all.pressed.emit()
	var world: Dictionary = Store.load_selected()["world"]
	assert_eq(world["town_materials"]["cobweb"], 3)
	assert_eq(world["gold"], 29)
	assert_eq(world["pending_loot"], {})
	assert_false(_battle._loot_panel.visible)
	assert_false(_battle.visible)


func test_victory_without_drops_returns_directly_to_map() -> void:
	var Loot = load("res://scripts/battle_loot.gd")
	var rng := RandomNumberGenerator.new()
	_battle._match.enemy_health = 1
	_battle._match.player_gauge = 1.0
	var drops := {"cobweb": 1}
	for candidate in range(100):
		_battle._match.rng_state = candidate
		var before: Dictionary = _battle._match.snapshot()
		_battle._match.act(Combat.Action.ATTACK, {})
		rng.seed = _battle._match.rng_state
		drops = Loot.roll([{"name": _battle._entry["source_name"]}], rng)
		_battle._match.restore(before)
		if drops.is_empty():
			break
	assert_true(drops.is_empty())
	_battle._act(Combat.Action.ATTACK)
	assert_false(_battle._match.active)
	assert_eq(Store.load_selected()["world"]["pending_loot"], {})
	assert_false(_battle._loot_panel.visible)
	assert_false(_battle.visible)


func test_player_stat_bars_track_battle_damage_healing_and_stamina() -> void:
	var hp := _battle.find_child("PlayerHP", true, false) as ProgressBar
	var mp := _battle.find_child("PlayerMP", true, false) as ProgressBar
	var stamina := _battle.find_child("PlayerStamina", true, false) as ProgressBar
	var xp := _battle.find_child("PlayerXP", true, false) as ProgressBar
	assert_not_null(hp)
	assert_not_null(mp)
	assert_not_null(stamina)
	assert_not_null(xp)
	if hp == null or mp == null or stamina == null or xp == null:
		return
	assert_eq(hp.value, 20.0)
	assert_eq(hp.max_value, float(_battle._character_stats["life"]))
	assert_eq(mp.value, float(_battle._character_stats["mana"]))
	assert_eq(mp.max_value, float(_battle._character_stats["mana"]))
	assert_eq(stamina.value, float(_battle._match.stamina))
	assert_eq(stamina.max_value, float(_battle._character_stats["stamina"]))
	assert_eq(xp.value, float(_battle._character_stats["experience"]))
	assert_eq(xp.max_value, float(_battle._character_stats["next_level_experience"]))
	_battle._match.intent = Combat.Action.ATTACK
	_battle._match.enemy_gauge = 1.0
	_battle._process(0.0)
	assert_lt(hp.value, 20.0)
	assert_eq(hp.value, float(_battle._match.health))
	_battle._use_item(Consumables.TONIC)
	assert_eq(hp.value, float(_battle._match.health))
	assert_gt(hp.value, 20.0)
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_eq(stamina.value, float(_battle._match.stamina))
	assert_eq(stamina.value, stamina.max_value - Combat.ATTACK_COST)


func test_solo_enemy_hp_bar_tracks_damage() -> void:
	var hp := _battle.find_child("EnemyHP", true, false) as ProgressBar
	assert_not_null(hp)
	if hp == null:
		return
	assert_eq(hp.value, float(_battle._match.enemy_health))
	assert_eq(hp.max_value, float(_battle._current_variant()["health"]))
	var before := hp.value
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_lt(hp.value, before)
	assert_eq(hp.value, float(_battle._match.enemy_health))
	assert_false(hp.show_percentage)


func test_group_enemy_hp_bars_track_selected_target_only() -> void:
	var enemies := []
	for index in range(2):
		enemies.append({
			"name": "Spider %d" % (index + 1), "sprite": 3, "health": 100,
			"damage_min": 3, "damage_max": 3, "defense": 0,
			"protection": 0, "experience": 10,
		})
	_battle.open_room_enemies({}, null, 42, 0, enemies)
	var first := _battle.find_child("EnemyHP1", true, false) as ProgressBar
	var second := _battle.find_child("EnemyHP2", true, false) as ProgressBar
	assert_not_null(first)
	assert_not_null(second)
	if first == null or second == null:
		return
	assert_eq(first.value, 100.0)
	assert_eq(second.value, 100.0)
	assert_eq(first.max_value, 100.0)
	assert_eq(second.max_value, 100.0)
	_battle._select_target(1)
	_battle._match.player_gauge = 1.0
	_battle._act(Combat.Action.ATTACK)
	assert_eq(first.value, 100.0)
	assert_lt(second.value, 100.0)
	assert_eq(second.value, float(_battle._match.enemy_at(1).health))
	assert_false(first.show_percentage)
	assert_false(second.show_percentage)
