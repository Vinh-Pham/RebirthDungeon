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
	var enemy: Vector2i = _dungeon._room["enemies"][0]
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
	var enemy: Vector2i = _dungeon._room["enemies"][0]
	_dungeon.player = enemy + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_true(_dungeon._warrens._match.active)
	_dungeon._warrens._match.enemy_health = 1
	_dungeon._warrens._match.intent = Combat.Action.DEFEND
	_dungeon._warrens._match.player_gauge = 1.0
	_dungeon._warrens._act(Combat.Action.ATTACK)
	assert_eq(Store.load_selected()["world"]["threshold_cleared"], 8)
	if _dungeon._warrens._loot_panel.visible:
		_dungeon._warrens._loot_panel._leave.pressed.emit()
	else:
		_dungeon._warrens._back()
	_dungeon.player = exit + Vector2i.LEFT
	_dungeon._move(Vector2i.RIGHT)
	assert_eq(_dungeon._room_index, 8)
	var before := Store.load_selected()
	var chest: Vector2i = _dungeon._room["chests"][0]
	_dungeon.player = chest + Vector2i.LEFT
	_dungeon._interact()
	var reward := Store.load_selected()
	assert_true(reward["world"]["threshold_treasure_claimed"])
	assert_eq(reward["world"]["threshold_treasure_chest"], 0)
	assert_eq(reward["world"]["pending_loot"], {"gold": 60, "tonic": 3})
	assert_eq(reward["world"]["gold"], before["world"]["gold"])
	assert_eq(reward["world"]["tonics"], before["world"]["tonics"])
	assert_true(_dungeon._warrens._loot_panel.visible)
	_dungeon._warrens._loot_panel._take_all.pressed.emit()
	var collected := Store.load_selected()
	assert_eq(int(collected["world"]["gold"]), int(before["world"]["gold"]) + 60)
	assert_eq(int(collected["world"]["tonics"]), int(before["world"]["tonics"]) + 3)
	assert_eq(collected["world"]["pending_loot"], {})
	assert_false(_dungeon._warrens.visible)
	_dungeon.player = _dungeon._room["chests"][1] + Vector2i.LEFT
	_dungeon._interact()
	assert_eq(Store.load_selected()["world"], collected["world"])


func test_dungeon_click_route_moves_enemies_once_per_tile_and_updates_minimap() -> void:
	var enemies: Array[Vector2i] = _dungeon._room["enemies"]
	enemies[0] = Vector2i(20, 7)
	_dungeon.player = Vector2i(4, 6)
	var layout = _dungeon._layout
	layout.set_player(_dungeon.player)
	var target := Vector2i(4, 9)
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	click.position = Dungeon.MAP_ORIGIN + (Vector2(target) + Vector2(0.5, 0.5)) * Dungeon.TILE_SIZE
	var opposing_cell := enemies[0]
	layout.map_canvas.gui_input.emit(click)
	for y in range(7, 10):
		if y > 7:
			layout._process(0.1)
		assert_eq(_dungeon.player, Vector2i(4, y))
		assert_eq(enemies[0].distance_squared_to(opposing_cell), 1)
		assert_true(layout._status.landmarks.has(enemies[0]))
		assert_false(layout._status.landmarks.has(opposing_cell))
		opposing_cell = enemies[0]
	assert_true(layout._map_route.is_empty())


func test_blocked_steps_do_not_advance_dungeon_enemies() -> void:
	var entry: Vector2i = _dungeon._room["entry"]
	var before: Array = _dungeon._room["enemies"].duplicate()
	var rng_state: int = _dungeon._enemy_movement_rng.state
	_dungeon.player = entry
	_dungeon._move(Vector2i.LEFT)
	assert_eq(_dungeon.player, entry)
	assert_eq(_dungeon._room["enemies"], before)
	assert_eq(_dungeon._enemy_movement_rng.state, rng_state)


func test_enemy_contact_starts_battle_and_stops_the_click_route() -> void:
	var enemies: Array[Vector2i] = _dungeon._room["enemies"]
	enemies[0] = Vector2i(12, 7)
	_dungeon.player = Vector2i(10, 7)
	var layout = _dungeon._layout
	layout.set_player(_dungeon.player)
	layout._map_route.assign([Vector2i(11, 7), Vector2i(11, 8)])
	layout._follow_map_route()
	assert_eq(_dungeon.player, Vector2i(11, 7))
	assert_eq(enemies[0], Vector2i(12, 7))
	assert_true(_dungeon._warrens.visible)
	assert_true(_dungeon._warrens._match.active)
	assert_true(layout._map_route.is_empty())


func test_all_five_chests_have_distinct_rewards_and_only_one_can_be_opened() -> void:
	var rewards := {}
	for index in range(5):
		assert_false(Store.update_world({
			"threshold_cleared": 8,
			"threshold_treasure_claimed": false,
			"threshold_treasure_chest": -1,
		}).is_empty())
		_dungeon._profile = Store.load_selected()
		_dungeon._show_room(8)
		var before := Store.load_selected()
		_dungeon.player = _dungeon._room["chests"][index] + Vector2i.LEFT
		_dungeon._interact()
		var saved := Store.load_selected()
		assert_true(saved["world"]["threshold_treasure_claimed"])
		assert_eq(saved["world"]["threshold_treasure_chest"], index)
		var pending: Dictionary = saved["world"]["pending_loot"]
		var gold := int(pending.get("gold", 0))
		assert_gt(gold, 0)
		var items := 0
		for item_id in pending:
			if item_id != "gold":
				items += int(pending[item_id])
		assert_gt(items, 0)
		assert_eq(saved["world"]["gold"], before["world"]["gold"])
		assert_eq(saved["world"]["tonics"], before["world"]["tonics"])
		assert_eq(saved["world"]["town_materials"], before["world"]["town_materials"])
		assert_false(rewards.has(gold))
		rewards[gold] = true
		_dungeon._warrens._loot_panel._take_all.pressed.emit()
		var collected := Store.load_selected()
		assert_eq(int(collected["world"]["gold"]), int(before["world"]["gold"]) + gold)
		assert_eq(collected["world"]["pending_loot"], {})
		_dungeon._profile = collected
		_dungeon._show_room(8)
		_dungeon.player = _dungeon._room["chests"][(index + 1) % 5] + Vector2i.LEFT
		_dungeon._interact()
		assert_eq(Store.load_selected()["world"], collected["world"])
	assert_eq(rewards.size(), 5)


func test_unopened_chests_share_a_prompt_that_hides_their_rewards() -> void:
	assert_false(Store.update_world({"threshold_cleared": 8}).is_empty())
	_dungeon._profile = Store.load_selected()
	_dungeon._show_room(8)
	for chest: Vector2i in _dungeon._room["chests"]:
		_dungeon.player = chest + Vector2i.LEFT
		_dungeon._update_interaction()
		assert_eq(_dungeon._layout._context.text, "Open Chest [E]")
	assert_false(_dungeon._warrens._loot_panel.visible)


func test_treasure_selected_loot_credits_only_selected_stack_and_closes() -> void:
	assert_false(Store.update_world({"threshold_cleared": 8}).is_empty())
	_dungeon._profile = Store.load_selected()
	_dungeon._show_room(8)
	var before := Store.load_selected()
	_dungeon.player = _dungeon._room["chests"][2] + Vector2i.LEFT
	_dungeon._interact()
	assert_true(_dungeon._warrens._loot_panel.visible)
	var cloth: CheckBox = _dungeon._warrens._loot_panel.find_child("Loot_cloth", true, false)
	assert_not_null(cloth)
	if cloth == null:
		return
	cloth.button_pressed = true
	_dungeon._warrens._loot_panel._take_selected.pressed.emit()
	var saved := Store.load_selected()
	assert_eq(int(saved["world"]["town_materials"]["cloth"]), int(before["world"]["town_materials"]["cloth"]) + 4)
	assert_eq(saved["world"]["gold"], before["world"]["gold"])
	assert_eq(saved["world"]["pending_loot"], {})
	assert_true(saved["world"]["threshold_treasure_claimed"])
	assert_false(_dungeon._warrens.visible)


func test_opened_treasure_resumes_as_pending_loot_after_reload() -> void:
	assert_false(Store.update_world({"threshold_cleared": 8}).is_empty())
	_dungeon._profile = Store.load_selected()
	_dungeon._show_room(8)
	var before := Store.load_selected()
	_dungeon.player = _dungeon._room["chests"][0] + Vector2i.LEFT
	_dungeon._interact()
	var pending := Store.load_selected()
	assert_eq(pending["world"]["pending_loot"], {"gold": 60, "tonic": 3})
	_dungeon.hide()
	var resumed := Dungeon.new()
	add_child_autofree(resumed)
	assert_eq(resumed._room_index, 8)
	assert_true(resumed._warrens._loot_panel.visible)
	assert_eq(Store.load_selected()["world"], pending["world"])
	resumed._warrens._loot_panel._take_all.pressed.emit()
	var saved := Store.load_selected()
	assert_eq(int(saved["world"]["gold"]), int(before["world"]["gold"]) + 60)
	assert_eq(int(saved["world"]["tonics"]), int(before["world"]["tonics"]) + 3)
	assert_eq(saved["world"]["pending_loot"], {})
	assert_false(resumed._warrens.visible)
