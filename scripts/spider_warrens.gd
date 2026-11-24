extends Control

signal return_to_town_requested
signal character_sheet_requested
signal experience_saved(profile: Dictionary)

const Style = preload("res://scripts/menu_style.gd")
const Combat = preload("res://scripts/spider_encounter.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Store = preload("res://scripts/character_store.gd")
const ROSTER: JSON = preload("res://data/spiders.json")
const ATLAS = preload("res://assets/art/spider_atlas.png")
const CELL := Vector2i(16, 24)
const ATLAS_COLUMNS := 8

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
var _player_line: Label
var _enemy_line: Label
var _enemy_name: Label
var _stats: Label
var _source_details: Label
var _weapon_line: Label
var _log: Label
var _return: Button
var _enter: Button
var _actions: HBoxContainer
var _attack_button: Button
var _smash_button: Button


func _ready() -> void:
	hide()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

	var shade := ColorRect.new()
	shade.color = Color(Style.SURFACE, 0.90)
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var frame := Style.panel(Style.inset(self, 62, 38, true), Style.SURFACE)
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


func open(weapon: Dictionary, player_icon: Texture2D, seed_value: int, crossing := false) -> void:
	_crossing = crossing
	_crossing_cleared = false
	_defeated = false
	_heading.text = "Webbed Crossing" if crossing else "Spider Warrens"
	_search.visible = not crossing
	_weapon = weapon
	_character_stats = Stats.snapshot(Store.load_selected(), _weapon)
	_seed = seed_value
	_player_art.texture = player_icon
	_weapon_line.text = "Weapon: " + str(_weapon.get("name", "Unarmed"))
	_search.text = ""
	show()
	_fill_roster("White Spider")
	_list.grab_focus()


func _build_roster(parent: Control) -> void:
	var roster := VBoxContainer.new()
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
	_player_art = _sprite_slot(positions)
	_spider_art = _sprite_slot(positions)

	var vitals := HBoxContainer.new()
	arena.add_child(vitals)
	_player_line = Style.label("", 14, Style.TEAL)
	_player_line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vitals.add_child(_player_line)
	_enemy_line = Style.label("", 14, Style.ACCENT)
	_enemy_line.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	vitals.add_child(_enemy_line)

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
	_attack_button = _add_action("1  Attack (%d SP)" % Combat.ATTACK_COST, Combat.Action.ATTACK)
	_add_action("2  Defend (+%d SP)" % Combat.GUARD_RECOVERY, Combat.Action.DEFEND)
	_smash_button = _add_action("3  Smash (%d SP)" % Combat.SMASH_COST, Combat.Action.SMASH)
	_tonic_button = _add_action("4  Tonic", Combat.Action.TONIC)


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


func _add_action(text_value: String, action: int) -> Button:
	var button := Style.button(text_value, action == Combat.Action.ATTACK)
	button.focus_mode = Control.FOCUS_NONE
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.pressed.connect(_act.bind(action))
	_actions.add_child(button)
	return button


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
	if index < 0:
		_spider_art.texture = null
		_stats.text = ""
		_source_details.text = ""
		_player_line.text = ""
		_enemy_line.text = ""
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
	var saved_health: int = Store.load_selected()["world"]["health"]
	var preview_health := int(_character_stats["life"]) if saved_health < 0 else saved_health
	_player_line.text = "You  %d HP  /  %d SP" % [preview_health, _character_stats["stamina"]]
	_enemy_line.text = "%s HP" % _report(raw["health"])
	_set_fighting(false)
	if _crossing:
		_log.text = "A White Spider blocks the way to Spindle Hollow. Ready your blade or retreat to Lantern Rest."
	elif variant["health"] == null:
		_log.text = "This variant has no recorded HP. Choose a variant with recorded HP to fight."
	elif variant["damage_min"] == null:
		_log.text = "Melee damage is unreported. This variant can defend in the chamber."
	else:
		_log.text = "Choose a chamber, then read the spider's stance before committing an action."


func _report(value: String) -> String:
	return "Unlisted" if value == "?" or value.is_empty() else value


func _current_variant() -> Dictionary:
	if _entry.is_empty() or _variants.selected < 0:
		return {}
	return _entry["variants"][_variants.selected]


func _begin() -> void:
	var variant := _current_variant()
	var current_profile := Store.load_selected()
	_character_stats = Stats.snapshot(current_profile, _weapon)
	if not _match.begin(variant, _seed + int(_entry["sprite"]) * 97 + _variants.selected, _character_stats, int(current_profile["world"]["health"])):
		return
	_set_fighting(true)
	_update_combat_vitals()
	_log.text = "Read the spider's stance. Smash breaks a guard, but a normal strike interrupts Smash."


func _set_fighting(fighting: bool) -> void:
	_search.editable = not fighting
	_list.mouse_filter = Control.MOUSE_FILTER_IGNORE if fighting else Control.MOUSE_FILTER_STOP
	_list.focus_mode = Control.FOCUS_NONE if fighting else Control.FOCUS_ALL
	_variant_loader.visible = not _crossing and not _entry.is_empty()
	_variants.disabled = fighting
	_return.text = "Recover in Town" if _defeated else ("Retreat" if fighting else "Return to Threshold")
	_actions.visible = fighting
	_enter.visible = not fighting
	_enter.disabled = _defeated or _crossing_cleared or _current_variant().get("health") == null
	if _crossing_cleared:
		_return.text = "Continue through Threshold"


func _update_combat_vitals() -> void:
	_player_line.text = "You  %d/%d HP  ·  %d/%d SP" % [
		_match.health, _character_stats["life"], _match.stamina, _character_stats["stamina"]
	]
	_attack_button.disabled = _match.stamina < Combat.ATTACK_COST
	_smash_button.disabled = _match.stamina < Combat.SMASH_COST
	var tonics: int = Store.load_selected()["world"]["tonics"]
	_tonic_button.text = "4  Tonic (%d)" % tonics
	_tonic_button.disabled = tonics <= 0 or _match.health >= int(_character_stats["life"])
	var cue := ""
	if _match.active:
		cue = "  /  Guarding" if _match.intent == Combat.Action.DEFEND else "  /  Preparing a strike"
	_enemy_line.text = "%d / %d HP%s" % [_match.enemy_health, int(_current_variant()["health"]), cue]


func _act(action: int) -> void:
	var profile := Store.load_selected()
	var world: Dictionary = profile["world"]
	if action == Combat.Action.TONIC and (int(world["tonics"]) <= 0 or _match.health >= int(_character_stats["life"])):
		return
	var old_health := _match.health
	var old_stamina := _match.stamina
	var old_enemy := _match.enemy_health
	var old_round := _match.round_number
	var old_intent := _match.intent
	var message := _match.act(action, _weapon)
	if message.is_empty():
		return
	if _match.round_number == old_round:
		_log.text = message
		return
	var changes := {"health": _match.health}
	if action == Combat.Action.TONIC:
		changes["tonics"] = int(world["tonics"]) - 1
	var xp := 0
	if not _match.active:
		if _match.health <= 0:
			changes.merge({"location": world["dungeon_from"], "health": -1}, true)
		else:
			xp = int(_current_variant()["experience"]) if _current_variant()["experience"] != null else 0
			if _crossing and int(world["quest"]) == 1:
				changes["quest"] = 2
	var saved := Store.award_experience(xp, changes)
	if saved.is_empty():
		_match.health = old_health
		_match.stamina = old_stamina
		_match.enemy_health = old_enemy
		_match.round_number = old_round
		_match.intent = old_intent
		_match.active = true
		_log.text = "Could not save this turn. Try again."
		return
	experience_saved.emit(saved)
	_defeated = _match.health <= 0
	_crossing_cleared = _crossing and not _match.active and not _defeated
	_update_combat_vitals()
	if not _match.active:
		if xp > 0:
			message += " +%d XP." % xp
		_set_fighting(false)
	_log.text = message


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
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		_back()
	elif _match.active and [KEY_1, KEY_2, KEY_3, KEY_4].has(event.keycode):
		get_viewport().set_input_as_handled()
		_act(event.keycode - KEY_1)


func _back() -> void:
	if _defeated:
		hide()
		return_to_town_requested.emit()
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
