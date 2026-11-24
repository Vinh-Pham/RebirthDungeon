extends Control

signal return_to_town_requested
signal character_sheet_requested
signal experience_saved(profile: Dictionary)

const Style = preload("res://scripts/menu_style.gd")
const Combat = preload("res://scripts/spider_encounter.gd")
const Loot = preload("res://scripts/battle_loot.gd")
const LootPanel = preload("res://scripts/battle_loot_panel.gd")
const Rooms = preload("res://scripts/threshold_rooms.gd")
const Consumables = preload("res://scripts/consumables.gd")
const Durability = preload("res://scripts/equipment_durability.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Skills = preload("res://scripts/character_skills.gd")
const Store = preload("res://scripts/character_store.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const ROSTER: JSON = preload("res://data/spiders.json")
const ATLAS = preload("res://assets/art/spider_atlas.png")
const CELL := Vector2i(16, 24)
const ATLAS_COLUMNS := 8
const ENEMY_SAVE_RETRY_SECONDS := 1.0
const PORTRAIT_BAR_WIDTH := 96.0
const ACTION_CAPTIONS := {
	Combat.Action.ATTACK: "Attack",
	Combat.Action.DEFEND: "Defend",
	Combat.Action.SMASH: "Smash",
	Combat.Action.COUNTERATTACK: "Counterattack",
	Combat.Action.WINDMILL: "Windmill",
}
const PLAYER_STAT_CAPTIONS := ["HP", "MP", "Stamina", "XP"]

class EnemyCard:
	var button: Button
	var art: TextureRect
	var hp: ProgressBar
	var gauge: ProgressBar


var _room_index := -1
var _room_enemies: Array = []
var _enemy_cards: HBoxContainer
var _target_cards: Array[EnemyCard] = []
var _target_index := 0
var _roster: VBoxContainer
var _crossing := false
var _crossing_cleared := false
var _heading: Label
var _defeated := false
var _tonic_button: Button
var _match := Combat.new()
var _weapon: Dictionary
var _seed := 0
var _character_stats: Dictionary = {}
var _indices: Array[int] = []
var _entry: Dictionary
var _search: LineEdit
var _list: ItemList
var _variants: OptionButton
var _variant_loader: HBoxContainer
var _player_art: TextureRect
var _spider_art: TextureRect
var _player_stat_labels: Array[Label] = []
var _player_stat_bars: Array[ProgressBar] = []
var _solo_enemy: CenterContainer
var _enemy_hp: ProgressBar
var _player_gauge: ProgressBar
var _enemy_gauge: ProgressBar
var _player_time_label: Label
var _enemy_name: Label
var _stats: Label
var _source_details: Label
var _weapon_line: Label
var _log: Label
var _return: Button
var _enter: Button
var _actions: HBoxContainer
var _attack_button: Button
var _skill_button: Button
var _item_button: Button
var _action_button: Button
var _skill_options: HBoxContainer
var _item_options: HBoxContainer
var _queued_action := -1
var _enemy_save_retry := 0.0
var _quick_slots: Array[Button] = []
var _battle_frame: Control
var _loot_panel: LootPanel
var _loot_profile_id := ""


func _ready() -> void:
	set_process(false)
	hide()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

	var shade := ColorRect.new()
	shade.color = Color(Style.SURFACE, 0.90)
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var frame := Style.panel(Style.inset(self, 62, 38, true), Style.SURFACE)
	_battle_frame = frame
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 11)
	Style.inset(frame, 18, 14).add_child(layout)

	var heading := HBoxContainer.new()
	layout.add_child(heading)
	_heading = Style.label("Spider Warrens", 34)
	_heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_child(_heading)
	heading.add_theme_constant_override("separation", 9)
	var sheet_button := Style.button("Character [C]")
	sheet_button.pressed.connect(character_sheet_requested.emit)
	heading.add_child(sheet_button)
	_return = Style.button("Return to Threshold")
	_return.custom_minimum_size.x = 195
	_return.pressed.connect(_back)
	heading.add_child(_return)
	layout.add_child(Style.rule())

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 15)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(body)
	_build_roster(body)

	var shell := Style.panel(body, Style.BACK)
	shell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var arena := VBoxContainer.new()
	arena.add_theme_constant_override("separation", 8)
	Style.inset(shell, 14, 12).add_child(arena)
	_build_arena(arena)

	layout.add_child(Style.rule())
	_log = Style.label("", 14, Style.TEXT, true)
	_log.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_log.custom_minimum_size.y = 40
	layout.add_child(_log)

	_loot_panel = LootPanel.new()
	_loot_panel.name = "BattleLoot"
	_loot_panel.take_requested.connect(_take_loot)
	_loot_panel.leave_requested.connect(_leave_loot)
	add_child(_loot_panel)


func open_pending_loot(profile: Dictionary) -> void:
	if profile["world"]["pending_loot"].is_empty():
		return
	show()
	_show_loot(profile)


func _show_loot(profile: Dictionary) -> void:
	_loot_profile_id = profile["id"]
	_battle_frame.hide()
	var world: Dictionary = profile["world"]
	var title := "Treasure Loot" if int(world["threshold_treasure_chest"]) >= 0 else "Battle Loot"
	_loot_panel.show_loot(world["pending_loot"], title)


func _take_loot(ids: Array) -> void:
	var profile := Store.load_selected()
	if not _loot_panel.visible or profile.get("id") != _loot_profile_id:
		return
	var world: Dictionary = profile["world"]
	var satchel := Satchel.new()
	satchel.open(profile["id"], Catalog.items_by_id())
	var cobweb_capacity := satchel.cobweb_capacity(world["gold"])
	var cobwebs: int = world["town_materials"][Satchel.COBWEB_ID]
	if ids.has(Satchel.COBWEB_ID):
		var requested: int = world["pending_loot"].get(Satchel.COBWEB_ID, 0)
		if cobwebs + requested <= cobweb_capacity:
			cobwebs += requested
	var changes := Loot.collect(world, ids, cobweb_capacity, satchel.gold_capacity(cobwebs))
	var remaining: Dictionary = changes.get("pending_loot", world["pending_loot"])
	var keep_open := ids.any(func(id: String) -> bool: return remaining.has(id))
	if changes.is_empty():
		if keep_open:
			_loot_panel.set_status("There is no room for the selected loot.")
		return
	if not keep_open:
		changes["pending_loot"] = {}
	_save_loot_changes(changes, keep_open)


func _leave_loot() -> void:
	if _loot_panel.visible and Store.load_selected().get("id") == _loot_profile_id:
		_save_loot_changes({"pending_loot": {}})


func _save_loot_changes(changes: Dictionary, keep_open := false) -> void:
	var saved := Store.update_world(changes)
	if saved.is_empty():
		_loot_panel.set_status("Could not save your choice. Try again.")
		return
	experience_saved.emit(saved)
	if keep_open:
		_show_loot(saved)
		_loot_panel.set_status("Your bag has no room for the rest of the selected loot.")
	else:
		_close_loot()


func _close_loot() -> void:
	_loot_panel.hide()
	_battle_frame.show()
	_loot_profile_id = ""
	hide()


func open(weapon: Dictionary, player_icon: Texture2D, seed_value: int, crossing := false) -> void:
	_room_index = -1
	_room_enemies.clear()
	_build_target_cards()
	_roster.show()
	_spider_art.custom_minimum_size = Vector2(96, 144)
	_crossing = crossing
	_crossing_cleared = false
	_defeated = false
	_heading.text = "Webbed Crossing" if crossing else "Spider Warrens"
	_search.visible = not crossing
	_weapon = weapon
	_character_stats = Stats.snapshot(Store.load_selected(), _weapon)
	_seed = seed_value
	_player_art.texture = player_icon
	_search.text = ""
	show()
	_fill_roster("White Spider")
	_list.grab_focus()


func open_room_enemy(weapon: Dictionary, player_icon: Texture2D, seed_value: int, room_index: int, enemy: Dictionary) -> void:
	open_room_enemies(weapon, player_icon, seed_value, room_index, [enemy])


func open_room_enemies(weapon: Dictionary, player_icon: Texture2D, seed_value: int, room_index: int, enemies: Array, initial_target := 0) -> void:
	if enemies.is_empty():
		return
	_room_index = room_index
	_room_enemies = enemies.duplicate()
	_build_target_cards()
	_crossing = false
	_crossing_cleared = false
	_defeated = false
	_weapon = weapon
	_seed = seed_value
	_match = Combat.new()
	_character_stats = Stats.snapshot(Store.load_selected(), weapon)
	_heading.text = "Boss Chamber" if room_index == Rooms.ROOM_COUNT - 1 else "Dungeon Battle"
	_enemy_name.text = "Choose a target" if _room_enemies.size() > 1 else _room_enemies[0]["name"]
	_player_art.texture = player_icon
	_spider_art.texture = _icon(int(_room_enemies[0]["sprite"]))
	_spider_art.custom_minimum_size = Vector2(144, 216) if room_index == Rooms.ROOM_COUNT - 1 else Vector2(96, 144)
	_roster.hide()
	show()
	_begin()
	_select_target(initial_target)


func _build_roster(parent: Control) -> void:
	var roster := VBoxContainer.new()
	_roster = roster
	roster.custom_minimum_size.x = 310
	roster.add_theme_constant_override("separation", 7)
	parent.add_child(roster)
	_search = LineEdit.new()
	_search.name = "SpiderSearch"
	_search.placeholder_text = "Search spiders"
	_search.custom_minimum_size.y = 36
	_search.text_changed.connect(_search_changed)
	roster.add_child(_search)

	_list = ItemList.new()
	_list.name = "SpiderRoster"
	_list.fixed_icon_size = CELL
	_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("icon_margin", 8)
	_list.item_selected.connect(_select_spider)
	_list.item_activated.connect(_begin.unbind(1))
	roster.add_child(_list)


func _build_arena(arena: VBoxContainer) -> void:
	_enemy_name = Style.label("", 24, Style.ACCENT)
	_enemy_name.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	arena.add_child(_enemy_name)
	_variant_loader = HBoxContainer.new()
	_variant_loader.add_theme_constant_override("separation", 9)
	arena.add_child(_variant_loader)
	_variant_loader.add_child(Style.label("Wiki variant", 14, Style.MUTED))
	_variants = OptionButton.new()
	_variants.name = "SpiderVariant"
	_variants.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_variants.custom_minimum_size.y = 34
	_variants.fit_to_longest_item = false
	_variants.clip_text = true
	_variants.item_selected.connect(_show_variant)
	_variants.gui_input.connect(_change_variant_with_keys)
	_variant_loader.add_child(_variants)

	var battlefield := Style.panel(arena, Color("#344a5a"))
	battlefield.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var positions := HBoxContainer.new()
	Style.inset(battlefield, 12, 8).add_child(positions)
	var player_slot := CenterContainer.new()
	player_slot.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	positions.add_child(player_slot)
	var player_portrait := VBoxContainer.new()
	player_portrait.add_theme_constant_override("separation", 6)
	player_slot.add_child(player_portrait)
	_player_art = _sprite_slot(player_portrait)
	_player_gauge = _add_time_gauge(player_portrait, "PlayerGauge", Style.TEAL)
	_player_gauge.hide()
	_player_time_label = Style.label("Time", 13, Style.TEAL)
	_player_time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_player_time_label.hide()
	player_portrait.add_child(_player_time_label)

	_solo_enemy = CenterContainer.new()
	_solo_enemy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	positions.add_child(_solo_enemy)
	var enemy_portrait := VBoxContainer.new()
	enemy_portrait.add_theme_constant_override("separation", 6)
	_solo_enemy.add_child(enemy_portrait)
	_spider_art = _sprite_slot(enemy_portrait)
	_enemy_hp = _add_enemy_hp(enemy_portrait, "EnemyHP")
	_enemy_gauge = _add_time_gauge(enemy_portrait, "EnemyGauge", Style.ACCENT)
	_enemy_gauge.tooltip_text = "Enemy Time"
	_enemy_gauge.hide()

	_enemy_cards = HBoxContainer.new()
	_enemy_cards.name = "EnemyCards"
	_enemy_cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_enemy_cards.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_enemy_cards.size_flags_stretch_ratio = 3.0
	_enemy_cards.add_theme_constant_override("separation", 8)
	_enemy_cards.hide()
	positions.add_child(_enemy_cards)

	_build_player_stats(arena)

	_stats = Style.label("", 14, Style.TEXT)
	_stats.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	arena.add_child(_stats)
	_source_details = Style.label("", 13, Style.MUTED)
	_source_details.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	arena.add_child(_source_details)
	_weapon_line = Style.label("", 13, Style.MUTED)
	arena.add_child(_weapon_line)

	_enter = Style.button("Enter Chamber", true)
	_enter.pressed.connect(_begin)
	arena.add_child(_enter)
	_actions = HBoxContainer.new()
	_actions.add_theme_constant_override("separation", 9)
	arena.add_child(_actions)
	_attack_button = _add_battle_button(_actions, "Attack", _act.bind(Combat.Action.ATTACK), true)
	_attack_button.tooltip_text = "Normal attack with your weapon or bare hands. Costs %d SP. Press A." % Combat.ATTACK_COST
	_skill_button = _add_battle_button(_actions, "Skill", _open_skills)
	_skill_button.tooltip_text = "Choose an active skill. Press S."
	_item_button = _add_battle_button(_actions, "Item", _open_items)
	_item_button.tooltip_text = "Use a consumable at any time. Press I."
	_action_button = _add_battle_button(_actions, "Action")
	_action_button.disabled = true
	_action_button.tooltip_text = "Unavailable"

	_skill_options = HBoxContainer.new()
	_skill_options.add_theme_constant_override("separation", 9)
	arena.add_child(_skill_options)
	var defend := _add_battle_button(_skill_options, "Defend (+%d SP)" % Combat.GUARD_RECOVERY, _act.bind(Combat.Action.DEFEND))
	defend.tooltip_text = "Recover stamina and guard against the next normal strike."
	var smash := _add_battle_button(_skill_options, "Smash", _act.bind(Combat.Action.SMASH))
	smash.tooltip_text = "Break the enemy's guard. An Attack can interrupt Smash."
	_add_battle_button(_skill_options, "Counterattack", _act.bind(Combat.Action.COUNTERATTACK))
	_add_battle_button(_skill_options, "Windmill", _act.bind(Combat.Action.WINDMILL))
	_item_options = HBoxContainer.new()
	arena.add_child(_item_options)
	_tonic_button = _add_battle_button(_item_options, "Healing Tonic", _use_item.bind(Consumables.TONIC))
	_show_options()

	var quick_row := HBoxContainer.new()
	quick_row.add_theme_constant_override("separation", 8)
	arena.add_child(quick_row)
	quick_row.add_child(Style.label("Quick Slots", 14, Style.TEAL))
	for index in range(4):
		var slot := _add_battle_button(quick_row, "", _use_quick_slot.bind(index))
		slot.name = "QuickSlot%d" % (index + 1)
		slot.add_theme_font_size_override("font_size", 13)
		_quick_slots.append(slot)


func _build_player_stats(arena: VBoxContainer) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	arena.add_child(row)
	var colors := [Style.HEALTH, Style.TEAL, Style.ERROR, Style.TEAL]
	for index in range(PLAYER_STAT_CAPTIONS.size()):
		var column := VBoxContainer.new()
		column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		column.add_theme_constant_override("separation", 3)
		row.add_child(column)
		var label := Style.label("", 13, Color.WHITE)
		label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		column.add_child(label)
		_player_stat_labels.append(label)
		var bar := Style.progress_bar(colors[index])
		bar.name = "Player" + PLAYER_STAT_CAPTIONS[index]
		column.add_child(bar)
		_player_stat_bars.append(bar)


func _build_target_cards() -> void:
	for child in _enemy_cards.get_children():
		_enemy_cards.remove_child(child)
		child.queue_free()
	_target_cards.clear()
	_target_index = 0
	var group_battle := _room_enemies.size() > 1
	_enemy_cards.visible = group_battle
	_solo_enemy.visible = not group_battle
	if not group_battle:
		return

	for index in range(_room_enemies.size()):
		var panel := Style.panel(_enemy_cards, Style.BACK)
		panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var column := VBoxContainer.new()
		column.add_theme_constant_override("separation", 6)
		Style.inset(panel, 8, 8).add_child(column)

		var enemy: Dictionary = _room_enemies[index]
		var card := EnemyCard.new()
		var title := "%d · %s" % [index + 1, enemy["name"]]
		card.button = Style.button(title)
		card.button.name = "EnemyTarget%d" % (index + 1)
		card.button.add_theme_font_size_override("font_size", 12)
		card.button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		card.button.tooltip_text = "%s. Click to target or use Left and Right." % title
		card.button.toggle_mode = true
		card.button.pressed.connect(_select_target.bind(index))
		column.add_child(card.button)

		card.art = _sprite_slot(column)
		card.art.custom_minimum_size = Vector2(56, 84)
		card.art.texture = _icon(int(enemy["sprite"]))
		card.hp = _add_enemy_hp(column, "EnemyHP%d" % (index + 1))

		card.gauge = _add_time_gauge(column, "EnemyGauge%d" % (index + 1), Style.ACCENT)
		card.gauge.tooltip_text = "Enemy Time"
		_target_cards.append(card)


func _select_target(index: int) -> void:
	if index < 0 or index >= _target_cards.size() or _match.enemy_at(index).health <= 0:
		return
	_target_index = index
	for i in range(_target_cards.size()):
		_target_cards[i].button.set_pressed_no_signal(i == index)


func _cycle_target(direction: int) -> bool:
	for offset in range(1, _target_cards.size()):
		var index := posmod(_target_index + direction * offset, _target_cards.size())
		if _match.enemy_at(index).health > 0:
			_select_target(index)
			return true
	return false


func _add_enemy_hp(parent: Control, bar_name: String) -> ProgressBar:
	var bar := Style.progress_bar(Style.HEALTH)
	bar.name = bar_name
	bar.custom_minimum_size.x = PORTRAIT_BAR_WIDTH
	bar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	parent.add_child(bar)
	return bar


func _set_enemy_hp(bar: ProgressBar, current: int, maximum: int) -> void:
	bar.max_value = maxi(1, maximum)
	bar.value = current


func _add_time_gauge(parent: Control, gauge_name: String, color: Color) -> ProgressBar:
	var gauge := Style.progress_bar(color)
	gauge.name = gauge_name
	gauge.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	gauge.custom_minimum_size = Vector2(PORTRAIT_BAR_WIDTH, 8)
	gauge.max_value = 1.0
	gauge.step = 0.0
	parent.add_child(gauge)
	return gauge


func _sprite_slot(parent: Control) -> TextureRect:
	var position := CenterContainer.new()
	position.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(position)
	var sprite := TextureRect.new()
	sprite.custom_minimum_size = Vector2(96, 144)
	sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	position.add_child(sprite)
	return sprite


func _add_battle_button(row: HBoxContainer, text_value: String, activate := Callable(), primary := false) -> Button:
	var button := Style.button(text_value, primary)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if activate.is_valid():
		button.pressed.connect(activate)
	row.add_child(button)
	return button


func _open_skills() -> void:
	if not _match.active:
		return
	_show_options(null if _skill_options.visible else _skill_options)
	if _skill_options.visible:
		for button in _skill_options.get_children():
			if button.visible and not button.disabled:
				button.grab_focus()
				break


func _open_items() -> void:
	_show_options(null if _item_options.visible else _item_options)
	if _item_options.visible and not _tonic_button.disabled:
		_tonic_button.grab_focus()


func _show_options(options: HBoxContainer = null) -> void:
	_skill_options.visible = options == _skill_options
	_item_options.visible = options == _item_options


func _fill_roster(preferred := "") -> void:
	_indices.clear()
	_list.clear()
	var filter := _search.text.strip_edges().to_lower()
	for index in ROSTER.data.size():
		var entry: Dictionary = ROSTER.data[index]
		var spider: String = entry["source_name"]
		if (not _crossing or spider == "White Spider") and (filter.is_empty() or spider.to_lower().contains(filter)):
			_indices.append(index)
	_indices.sort_custom(func(a: int, b: int) -> bool:
		return ROSTER.data[a]["source_name"].naturalnocasecmp_to(ROSTER.data[b]["source_name"]) < 0)
	if _indices.is_empty():
		_entry = {}
		_variants.clear()
		_enemy_name.text = "No matching spiders"
		_show_variant(-1)
		return
	for index in _indices.size():
		var match_index := _indices[index]
		if ROSTER.data[match_index]["source_name"] == preferred:
			_indices.remove_at(index)
			_indices.push_front(match_index)
			break
	for index in _indices:
		var entry: Dictionary = ROSTER.data[index]
		_list.add_item(entry["source_name"], _icon(entry["sprite"]))
		_list.set_item_tooltip(_list.item_count - 1, entry["source_name"])
	_list.select(0)
	_list.get_v_scroll_bar().set_deferred("value", 0.0)
	_select_spider(0)


func _search_changed(_query: String) -> void:
	_fill_roster()


func _select_spider(index: int) -> void:
	_entry = ROSTER.data[_indices[index]]
	_enemy_name.text = _entry["source_name"]
	_spider_art.texture = _icon(_entry["sprite"])
	_variants.clear()
	var first_playable := -1
	for variant: Dictionary in _entry["variants"]:
		var location: String = variant["location"]
		_variants.add_item(location if location.length() <= 50 else location.left(47) + "...")
		if first_playable < 0 and variant["health"] != null:
			first_playable = _variants.item_count - 1
	var choice := maxi(first_playable, 0)
	_variants.select(choice)
	_show_variant(choice)


func _show_variant(index: int) -> void:
	_match = Combat.new()
	var world: Dictionary = Store.load_selected()["world"]
	_update_weapon_line(world)
	_refresh_items(world)
	_update_preview_health(world)
	if index < 0:
		_spider_art.texture = null
		_stats.text = ""
		_source_details.text = ""
		_enemy_hp.hide()
		_set_fighting(false)
		_log.text = "Adjust the search to choose an encounter."
		return
	var variant := _current_variant()
	var raw: Dictionary = variant["raw_stats"]
	_variants.tooltip_text = variant["location"]
	_stats.text = "HP %s   •   Melee %s   •   Def / Prot %s" % [
		_report(raw["health"]), _report(raw["melee_damage"]), _report(raw["defense_protection"])
	]
	_source_details.text = "XP %s   •   Gold %s   •   Combat power %s   •   Ranged %s" % [
		_report(raw["experience"]), _report(raw["gold"]), _report(raw["combat_power"]), _report(raw["ranged_damage"])
	]
	var behavior: Dictionary = _entry["behavior"]
	_source_details.text += "\nMelee hits %s   •   Speed %s   •   Element %s" % [
		_report(behavior["melee_hits"]), _report(behavior["running_speed"]), _report(behavior["element"])
	]
	_source_details.tooltip_text = _entry["source_url"]
	_enemy_hp.visible = variant["health"] != null
	if _enemy_hp.visible:
		var maximum := int(variant["health"])
		_set_enemy_hp(_enemy_hp, maximum, maximum)
	_set_fighting(false)
	if _crossing:
		_log.text = "A White Spider blocks the way to Spindle Hollow. Ready your blade or retreat to Lantern Rest."
	elif variant["health"] == null:
		_log.text = "This variant has no recorded HP. Choose a variant with recorded HP to fight."
	elif variant["damage_min"] == null:
		_log.text = "Melee damage is unreported. This variant can defend in the chamber."
	else:
		_log.text = "Choose a chamber to begin an encounter."


func _report(value: String) -> String:
	return "Unlisted" if value == "?" or value.is_empty() else value


func _current_variant() -> Dictionary:
	if _room_index >= 0:
		return _room_enemies[0]
	if _entry.is_empty() or _variants.selected < 0:
		return {}
	return _entry["variants"][_variants.selected]


func _begin() -> void:
	if _match.active:
		return
	var current_profile := Store.load_selected()
	if current_profile.is_empty():
		return
	var variant := _current_variant()
	if variant.is_empty():
		return
	_character_stats = Stats.snapshot(current_profile, _weapon)
	var encounter_seed := _seed + (_room_index * 97 if _room_index >= 0 else int(_entry["sprite"]) * 97 + _variants.selected)
	var enemies := _room_enemies if _room_index >= 0 else [variant]
	if not _match.begin_group(enemies, encounter_seed, _character_stats, int(current_profile["world"]["health"]), self):
		return
	_enemy_save_retry = 0.0
	_queued_action = -1
	_select_target(0)
	var learned: Array = _character_stats.get("learned_skills", ["defense"])
	for index in range(_skill_options.get_child_count()):
		var skill_id: String = ["defense", "smash", "counterattack", "windmill"][index]
		var button: Button = _skill_options.get_child(index)
		button.visible = learned.has(skill_id)
		var action: int = [Combat.Action.DEFEND, Combat.Action.SMASH, Combat.Action.COUNTERATTACK, Combat.Action.WINDMILL][index]
		var stamina_text := "+%d SP" % Combat.GUARD_RECOVERY if action == Combat.Action.DEFEND else "%d SP" % _match.stamina_cost(action)
		button.text = "%s (%s)" % [ACTION_CAPTIONS[action], stamina_text]
		var icon_path := "res://assets/art/skills/%s.png" % skill_id
		if ResourceLoader.exists(icon_path):
			button.icon = load(icon_path)
			button.expand_icon = true
			button.add_theme_constant_override("icon_max_width", 24)
	_set_fighting(true)
	_update_combat_vitals(current_profile["world"])
	_log.text = "Queue an attack or skill to use when your Time gauge fills. Items are always available."
	if _target_cards.size() > 1:
		_log.text += " Select enemies by clicking or using Left and Right."


func _set_fighting(fighting: bool) -> void:
	if not fighting:
		_queued_action = -1
	_search.editable = not fighting
	_list.mouse_filter = Control.MOUSE_FILTER_IGNORE if fighting else Control.MOUSE_FILTER_STOP
	_list.focus_mode = Control.FOCUS_NONE if fighting else Control.FOCUS_ALL
	_variant_loader.visible = _room_index < 0 and not fighting and not _crossing and not _entry.is_empty()
	_stats.visible = not fighting
	_source_details.visible = not fighting
	_variants.disabled = fighting
	_return.text = "Recover in Town" if _defeated else ("Retreat" if fighting else "Return to Threshold")
	_actions.visible = fighting
	_player_gauge.visible = fighting
	_player_time_label.visible = fighting
	_enemy_gauge.visible = fighting
	set_process(fighting)
	_show_options()
	_enter.visible = not fighting
	_enter.disabled = _defeated or _crossing_cleared or _current_variant().get("health") == null
	if _room_index >= 0:
		_enter.hide()
		_return.text = "Recover in Town" if _defeated else ("Retreat" if fighting else "Return to Dungeon")
	if _crossing_cleared:
		_return.text = "Continue through Threshold"


func _update_combat_vitals(world: Dictionary) -> void:
	_update_weapon_line(world)
	_update_player_stats(_match.health, _match.stamina)
	if _target_cards.is_empty():
		_enemy_hp.show()
		_set_enemy_hp(_enemy_hp, _match.enemy_health, int(_current_variant()["health"]))
	else:
		for index in range(_target_cards.size()):
			var card := _target_cards[index]
			var enemy := _match.enemy_at(index)
			card.button.disabled = enemy.health <= 0 or not _match.active
			card.art.modulate.a = 0.3 if enemy.health <= 0 else 1.0
			_set_enemy_hp(card.hp, enemy.health, int(_room_enemies[index]["health"]))
		if _match.active and _match.enemy_at(_target_index).health <= 0:
			_cycle_target(1)
	_update_gauges()
	_refresh_items(world)


func _update_gauges() -> void:
	_player_gauge.value = _match.player_gauge
	if _target_cards.is_empty():
		_enemy_gauge.value = _match.enemy_gauge
	else:
		for index in range(_target_cards.size()):
			var enemy := _match.enemy_at(index)
			_target_cards[index].gauge.value = enemy.gauge if enemy.health > 0 and _match.active else 0.0
	var time_caption := "Ready" if _match.player_ready() else "Time"
	if _queued_action >= 0:
		time_caption = "%s queued" % ACTION_CAPTIONS[_queued_action]
	if _match.guarded:
		time_caption += " · Guarding"
	_player_time_label.text = time_caption
	_attack_button.disabled = _match.stamina < Combat.ATTACK_COST
	for index in range(_skill_options.get_child_count()):
		_skill_options.get_child(index).disabled = _match.stamina < _match.stamina_cost([Combat.Action.DEFEND, Combat.Action.SMASH, Combat.Action.COUNTERATTACK, Combat.Action.WINDMILL][index])


func _process(delta: float) -> void:
	if not is_visible_in_tree() or not _match.active:
		return
	_match.advance_time(delta)
	_enemy_save_retry = maxf(0.0, _enemy_save_retry - delta)
	var messages: PackedStringArray = []
	for index in range(_match.enemy_count()):
		if not _match.active or _enemy_save_retry > 0.0:
			break
		if _match.enemy_ready(index):
			var message := _resolve_action(_match.enemy_at(index).intent, index)
			if not message.is_empty():
				messages.append(message)
	var player_message := _execute_queued_action()
	if not player_message.is_empty():
		messages.append(player_message)
	if not messages.is_empty():
		_log.text = "  ".join(messages)
	_update_gauges()


func _update_weapon_line(world: Dictionary) -> void:
	if _weapon.is_empty():
		_weapon_line.text = "Weapon · Bare hands"
		return
	_weapon_line.text = "%s  ·  %s" % [_weapon["name"], Durability.condition_text(world, _weapon)]
	if Durability.usable_weapon(world, _weapon).is_empty():
		_weapon_line.text += "  ·  Fighting bare-handed"


func _update_preview_health(world: Dictionary) -> void:
	var saved_health: int = world["health"]
	var preview_health := int(_character_stats["life"]) if saved_health < 0 else saved_health
	_update_player_stats(preview_health, int(_character_stats["stamina"]))


func _update_player_stats(health: int, stamina: int) -> void:
	var maximums := [
		int(_character_stats["life"]), int(_character_stats["mana"]),
		int(_character_stats["stamina"]), int(_character_stats["next_level_experience"])
	]
	var values := [health, maximums[1], stamina, int(_character_stats["experience"])]
	for index in range(PLAYER_STAT_CAPTIONS.size()):
		var bar := _player_stat_bars[index]
		bar.max_value = maxi(1, maximums[index])
		bar.value = clampi(values[index], 0, maximums[index])
		var caption: String = PLAYER_STAT_CAPTIONS[index]
		var text_value := "%s  %d / %d" % [caption, int(bar.value), maximums[index]]
		if caption == "XP":
			text_value = "Lv %d · %s" % [_character_stats["level"], text_value]
		_player_stat_labels[index].text = text_value
		_player_stat_labels[index].tooltip_text = text_value


func _refresh_items(world: Dictionary) -> void:
	var count: int = world["tonics"]
	var health: int = _match.health if _match.active else world["health"]
	var tonic := Consumables.use_item(Consumables.TONIC, world, health, int(_character_stats["life"]))
	_tonic_button.text = "Healing Tonic ×%d" % count
	_tonic_button.disabled = tonic["changes"].is_empty()
	_tonic_button.tooltip_text = tonic["message"] if _tonic_button.disabled else "Restores up to %d Life without resetting your Time gauge." % Consumables.TONIC_HEAL
	var assignments: Array = world["quick_slots"]
	for index in range(_quick_slots.size()):
		var assigned: bool = assignments[index] == Consumables.TONIC
		var slot := _quick_slots[index]
		slot.text = "%d  %s" % [index + 1, "Tonic ×%d" % count if assigned else "—"]
		slot.tooltip_text = "Healing Tonic. Click or press %d to use." % (index + 1) if assigned else "Assign an item to this slot during exploration."
		slot.disabled = _defeated


func _use_quick_slot(index: int) -> void:
	var profile := Store.load_selected()
	if profile.is_empty() or _defeated:
		return
	var slots: Array = profile["world"]["quick_slots"]
	if index < 0 or index >= slots.size() or slots[index].is_empty():
		_log.text = "Quick slot %d is empty." % (index + 1)
		return
	_use_item(slots[index], profile)


func _use_item(item_id: String, profile := {}) -> void:
	if profile.is_empty():
		profile = Store.load_selected()
	if profile.is_empty() or _defeated:
		return
	var world: Dictionary = profile["world"]
	if not _match.active:
		_character_stats = Stats.snapshot(profile, _weapon)
	var health: int = _match.health if _match.active else world["health"]
	var result := Consumables.use_item(item_id, world, health, int(_character_stats["life"]))
	if result["changes"].is_empty():
		_log.text = result["message"]
		return
	var saved := Store.update_world(result["changes"])
	if saved.is_empty():
		_log.text = "Could not save item use. Try again."
		return
	var saved_world: Dictionary = saved["world"]
	if _match.active:
		_match.health = int(saved_world["health"])
		_update_combat_vitals(saved_world)
	else:
		_update_preview_health(saved_world)
		_refresh_items(saved_world)
	experience_saved.emit(saved)
	_log.text = result["message"]


func _act(action: int) -> void:
	if not _match.active or not ACTION_CAPTIONS.has(action):
		return
	var required := {Combat.Action.DEFEND: "defense", Combat.Action.SMASH: "smash", Combat.Action.COUNTERATTACK: "counterattack", Combat.Action.WINDMILL: "windmill"}
	if required.has(action) and not _character_stats.get("learned_skills", ["defense"]).has(required[action]):
		return
	if _match.stamina < _match.stamina_cost(action):
		_log.text = "Not enough stamina. Defend to recover it."
		return
	_queued_action = action
	_show_options()
	var message := _execute_queued_action()
	if not message.is_empty():
		_log.text = message
	_update_gauges()


func _execute_queued_action() -> String:
	if _queued_action < 0 or not _match.player_ready():
		return ""
	var action := _queued_action
	_queued_action = -1
	return _resolve_action(action)


func _resolve_action(action: int, enemy_index := -1) -> String:
	var enemy_action := enemy_index >= 0
	var active_profile := Store.load_selected()
	if active_profile.is_empty():
		if enemy_action:
			_enemy_save_retry = ENEMY_SAVE_RETRY_SECONDS
		return "Could not load your character."
	var world: Dictionary = active_profile["world"]
	var weapon := Durability.usable_weapon(world, _weapon)
	var previous := _match.snapshot()
	var previous_round := _match.round_number
	var message := _match.act_enemy(enemy_index) if enemy_action else _match.act(action, weapon, _target_index)
	if message.is_empty() or (not enemy_action and _match.round_number == previous_round):
		return message
	var changes := {"health": _match.health}
	var weapon_wear := 0
	if _match.last_player_hit:
		weapon_wear = Durability.SMASH_WEAR if action == Combat.Action.SMASH else Durability.ATTACK_WEAR
	var condition := Durability.wear(world, weapon, weapon_wear, _match.last_enemy_hit)
	if condition != world["equipment_durability"]:
		changes["equipment_durability"] = condition
	var xp := 0
	if not _match.active:
		if _match.health <= 0:
			if world["location"] == "threshold":
				changes.merge(Store.threshold_reset(world))
			var town: String = world["dungeon_from"]
			changes.merge({
				"location": town, "health": -1,
				"map_position": {"location": town, "landmark": "dungeon"},
			}, true)
		else:
			var enemies := _room_enemies
			if _room_index < 0:
				var variant := _current_variant().duplicate()
				variant["name"] = _entry["source_name"]
				enemies = [variant]
			for enemy: Dictionary in enemies:
				xp += int(enemy["experience"]) if enemy.get("experience") != null else 0
			if _room_index >= 0:
				if int(world.get("threshold_cleared", 0)) == _room_index:
					changes["threshold_cleared"] = _room_index + 1
					if _room_index == Rooms.ROOM_COUNT - 1 and int(world["quest"]) == 1:
						changes["quest"] = 2
				else:
					xp = 0
			if _crossing and int(world["quest"]) == 1:
				changes["quest"] = 2
			if _room_index < 0 or changes.has("threshold_cleared"):
				var loot_rng := RandomNumberGenerator.new()
				loot_rng.seed = _match.rng_state
				var drops := Loot.roll(enemies, loot_rng)
				changes["pending_loot"] = Loot.combine(world["pending_loot"], drops)
	if not _match.training_events.is_empty():
		changes["skills"] = Skills.train(world, _match.training_events)
	var saved := Store.award_experience(xp, changes)
	if saved.is_empty():
		_match.restore(previous)
		if enemy_action:
			_enemy_save_retry = ENEMY_SAVE_RETRY_SECONDS
		return "Could not save this action. Try again."
	var saved_world: Dictionary = saved["world"]
	var broke_weapon := not weapon.is_empty() and Durability.usable_weapon(saved_world, weapon).is_empty()
	var broke_armor := Durability.armor_defense(world) > 0 and Durability.armor_defense(saved_world) == 0
	var lost_defense := Durability.equipment_defense(saved_world) < Durability.equipment_defense(world)
	if broke_weapon:
		message += " Your weapon broke. You now fight bare-handed."
	if broke_armor:
		message += " Your armor broke."
	elif lost_defense:
		message += " A piece of protective equipment broke."
	if xp > 0 or broke_weapon or lost_defense:
		_character_stats = Stats.snapshot(saved, _weapon)
		if _match.active:
			_match.refresh_character_stats(_character_stats)
	_defeated = _match.health <= 0
	_crossing_cleared = _crossing and not _match.active and not _defeated
	_update_combat_vitals(saved_world)
	if not _match.active:
		if xp > 0:
			message += " +%d XP." % xp
		if not _target_cards.is_empty():
			_enemy_name.text = "You fall" if _defeated else "Room cleared"
		_set_fighting(false)
		if not _defeated:
			if saved_world["pending_loot"].is_empty():
				hide()
			else:
				_show_loot(saved)
	experience_saved.emit(saved)
	return message


func active_vitals() -> Vector2i:
	return Vector2i(_match.health, _match.stamina) if _match.active else Vector2i(-1, -1)


func _change_variant_with_keys(event: InputEvent) -> void:
	if _variants.item_count < 2 or _match.active:
		return
	var step := int(event.is_action_pressed("ui_right")) - int(event.is_action_pressed("ui_left"))
	if step == 0:
		return
	var choice := posmod(_variants.selected + step, _variants.item_count)
	_variants.select(choice)
	_show_variant(choice)
	_variants.accept_event()


func _input(event: InputEvent) -> void:
	if not visible or not event is InputEventKey or not event.pressed or event.echo:
		return
	if _loot_panel.visible:
		if event.is_action_pressed("ui_cancel"):
			get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		if _skill_options.visible or _item_options.visible:
			_show_options()
		else:
			_back()
	elif event.keycode in [KEY_1, KEY_2, KEY_3, KEY_4] and (_match.active or not _search.has_focus()):
		get_viewport().set_input_as_handled()
		_use_quick_slot(event.keycode - KEY_1)
	elif _match.active:
		match event.keycode:
			KEY_A: _act(Combat.Action.ATTACK)
			KEY_S: _open_skills()
			KEY_I: _open_items()
			KEY_LEFT:
				if not _cycle_target(-1):
					return
			KEY_RIGHT:
				if not _cycle_target(1):
					return
			_: return
		get_viewport().set_input_as_handled()


func _back() -> void:
	_queued_action = -1
	if _loot_panel.visible:
		_close_loot()
		return
	if _defeated:
		hide()
		return_to_town_requested.emit()
	elif _room_index >= 0:
		_match.active = false
		set_process(false)
		hide()
	elif _match.active:
		_show_variant(_variants.selected)
		_log.text = "You return to the warren entrance."
	else:
		hide()


func _icon(index: int) -> Texture2D:
	var texture := AtlasTexture.new()
	texture.atlas = ATLAS
	@warning_ignore("integer_division")
	var atlas_row := index / ATLAS_COLUMNS
	texture.region = Rect2(Vector2i(index % ATLAS_COLUMNS, atlas_row) * CELL, CELL)
	texture.filter_clip = true
	return texture
