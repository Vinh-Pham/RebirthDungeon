extends Control

const Style = preload("res://scripts/menu_style.gd")
const Data = preload("res://scripts/character_data.gd")
const Store = preload("res://scripts/character_store.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Armory = preload("res://scripts/armory.gd")
const Warrens = preload("res://scripts/spider_warrens.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Sheet = preload("res://scripts/character_sheet.gd")
const Layout = preload("res://scripts/exploration_layout.gd")
const Journal = preload("res://scripts/exploration_journal.gd")
const CHARACTERS := "res://scenes/character.tscn"
const TOWN := "res://scenes/dungeon_town.tscn"
const SPIDER_ATLAS = preload("res://assets/art/spider_atlas.png")
const MAP_ORIGIN := Vector2(1, 24)
const TILE_SIZE := Vector2(20, 24)
const SPRITE_INSET := Vector2(2, 0)
const MAP_SIZE := Vector2i(31, 15)
const PRACTICE_POST := Vector2i(8, 4)
const WARRENS_STAIRS := Vector2i(27, 7)
const WEST_EXIT := Vector2i(2, 7)
const EAST_EXIT := Vector2i(28, 9)
const WEB_CROSSING := Vector2i(18, 7)
const WHITE_SPIDER_REGION := Rect2(48, 0, 16, 24)
const WEAPON_RACKS := {
	Vector2i(5, 5): "light",
	Vector2i(7, 9): "rapier",
	Vector2i(23, 5): "heavy",
	Vector2i(26, 9): "piercing",
}

var player := Vector2i(3, 5)
var floor_cells: Dictionary[Vector2i, bool] = {}
var log_label: Label
var player_sprite: Texture2D
var _catalog: Dictionary
var _satchel := Satchel.new()
var _armory: Armory
var _warrens: Warrens
var _sheet: Sheet
var _layout: Layout
var _journal: Journal
var _journal_section := ""
var _profile: Dictionary
var _resume_warrens := false
var _seed := 0
var _rack_icons: Dictionary = {}
var _damage_rng := RandomNumberGenerator.new()


func _ready() -> void:
	_profile = Store.load_selected()
	if _profile.is_empty():
		_return_to_characters.call_deferred()
		return
	Style.background(self)
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	player_sprite = Data.portrait(_profile, true)
	_seed = int(_profile["seed"])
	if _profile["world"]["dungeon_from"] == "spindle_hollow":
		player = Vector2i(27, 9)
	_build_map(_seed)
	_damage_rng.seed = _seed
	_catalog = Catalog.items_by_id()
	_satchel.open(_profile["id"], _catalog)
	for item: Dictionary in _catalog.values():
		var family: String = item["family"]
		if not _rack_icons.has(family):
			_rack_icons[family] = Catalog.icon(item)

	_layout = Layout.new()
	_layout.name = "ExplorationLayout"
	_layout.command_requested.connect(_command)
	_layout.profile_updated.connect(_on_profile_updated)
	add_child(_layout)
	_configure_map()
	log_label = _layout.log_label
	_layout.map_canvas.draw.connect(_draw_map)
	_layout.set_player(player)
	log_label.text = "Lantern Rest lies west. Follow the main corridor east to Spindle Hollow."
	if _crossing_blocked():
		log_label.text = "Follow the corridor east. Something moves behind the webbing."

	_armory = Armory.new()
	_armory.name = "Armory"
	_armory.configure(_catalog, _satchel)
	_armory.weapons_changed.connect(_refresh_hud)
	add_child(_armory)
	_warrens = Warrens.new()
	_warrens.name = "SpiderWarrens"
	_warrens.character_sheet_requested.connect(_open_character_sheet)
	_warrens.experience_saved.connect(_on_experience_saved)
	_warrens.return_to_town_requested.connect(_open_town_scene)
	add_child(_warrens)
	_sheet = Sheet.new()
	_sheet.name = "CharacterSheet"
	_sheet.closed.connect(_on_character_sheet_closed)
	add_child(_sheet)
	_journal = Journal.new()
	_journal.name = "ExplorationJournal"
	add_child(_journal)
	_refresh_hud()


func _configure_map() -> void:
	var landmarks := {
		WEST_EXIT: Style.TEAL, EAST_EXIT: Style.TEAL, WARRENS_STAIRS: Style.ACCENT,
		PRACTICE_POST: Style.MUTED,
	}
	for cell: Vector2i in WEAPON_RACKS:
		landmarks[cell] = Style.BORDER.lightened(0.2)
	if _crossing_blocked():
		landmarks[WEB_CROSSING] = Style.ERROR
	var subtitle := "%s  ·  %s     /     WASD / Arrows  Move   E  Interact   Space  Practice   Esc  Character Select" % [
		_profile["name"], Data.TALENTS[_profile["talent"]]
	]
	_layout.configure("Threshold", subtitle, MAP_SIZE, floor_cells, landmarks, _catalog, _satchel)
	_layout.set_player(player)


func _refresh_hud() -> void:
	_layout.refresh(_profile)
	_update_interaction()


func _on_profile_updated(profile: Dictionary) -> void:
	_profile = profile


func _update_interaction() -> void:
	var label := ""
	if _near_exit(WEST_EXIT):
		label = "Lantern Rest"
	elif _near_exit(EAST_EXIT):
		label = "Spindle Hollow"
	elif _near_warrens():
		label = "Enter Warrens"
	elif _near_crossing():
		label = "Approach Spider"
	elif not _nearby_rack().is_empty():
		label = "Inspect Rack"
	_layout.set_context(label)


func _build_map(seed_value: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	for x in range(2, 29):
		for y in range(3, 12):
			if x < 10 or x > 19 or (y >= 6 and y <= 8):
				floor_cells[Vector2i(x, y)] = true
	for x in range(11, 19):
		var alcove_depth := rng.randi_range(0, 2)
		var direction := -1 if rng.randf() < 0.5 else 1
		var edge := 6 if direction < 0 else 8
		for depth in range(1, alcove_depth + 1):
			floor_cells[Vector2i(x, edge + depth * direction)] = true


func _draw_map() -> void:
	var canvas := _layout.map_canvas
	for x in range(MAP_SIZE.x):
		for y in range(MAP_SIZE.y):
			var cell := Vector2i(x, y)
			var position_on_map := _map_point(cell)
			var is_floor := floor_cells.has(cell)
			var glyph := "." if is_floor else "#"
			var color := Color("#788a87") if is_floor else Style.BORDER
			canvas.draw_string(Style.UI_FONT, position_on_map + Vector2(4, 21), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, color)
	for cell: Vector2i in WEAPON_RACKS:
		var point := _map_point(cell)
		canvas.draw_rect(Rect2(point, TILE_SIZE), Style.SURFACE)
		canvas.draw_rect(Rect2(point, TILE_SIZE), Style.BORDER, false, 1)
		var icon: Texture2D = _rack_icons.get(WEAPON_RACKS[cell])
		if icon != null:
			canvas.draw_texture(icon, point + SPRITE_INSET)
	if not floor_cells.is_empty():
		var post_position := _map_point(PRACTICE_POST)
		canvas.draw_rect(Rect2(post_position, TILE_SIZE), Style.SURFACE)
		canvas.draw_string(Style.UI_FONT, post_position + Vector2(5, 21), "+", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Style.ACCENT)
	if not floor_cells.is_empty():
		var stair_position := _map_point(WARRENS_STAIRS)
		canvas.draw_rect(Rect2(stair_position, TILE_SIZE), Style.SURFACE)
		canvas.draw_rect(Rect2(stair_position, TILE_SIZE), Style.ACCENT, false, 1)
		canvas.draw_string(Style.UI_FONT, stair_position + Vector2(5, 21), ">", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Style.ACCENT)
	if not floor_cells.is_empty():
		_draw_marker(WEST_EXIT, "<", Style.TEAL)
		_draw_marker(EAST_EXIT, ">", Style.TEAL)
		if _crossing_blocked():
			var anchor := _map_point(WEB_CROSSING)
			for y in range(4, 11):
				var silk := Vector2i(WEB_CROSSING.x, y)
				if floor_cells.has(silk):
					_draw_marker(silk, "%", Style.MUTED)
			canvas.draw_texture_rect_region(SPIDER_ATLAS, Rect2(anchor + SPRITE_INSET, Vector2(16, 24)), WHITE_SPIDER_REGION)
	if player_sprite != null:
		var player_position := _map_point(player)
		canvas.draw_rect(Rect2(player_position, TILE_SIZE), Style.PANEL)
		canvas.draw_texture(player_sprite, player_position + SPRITE_INSET)


func _draw_marker(cell: Vector2i, glyph: String, color: Color) -> void:
	var canvas := _layout.map_canvas
	var point := _map_point(cell)
	canvas.draw_rect(Rect2(point, TILE_SIZE), Style.SURFACE)
	canvas.draw_string(Style.UI_FONT, point + Vector2(5, 21), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, color)


func _map_point(cell: Vector2i) -> Vector2:
	return MAP_ORIGIN + Vector2(cell) * TILE_SIZE


func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or _journal == null:
		return
	if _sheet.visible or _armory.visible or _warrens.visible or _journal.visible:
		return
	var direction := _layout.map_arrow_direction(event.keycode)
	if direction != Vector2i.ZERO:
		get_viewport().set_input_as_handled()
		_move(direction)


func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or _journal == null:
		return
	var viewport := get_viewport()
	if _sheet.visible:
		if event.keycode == KEY_C or event.keycode == KEY_ESCAPE:
			_sheet.close()
			viewport.set_input_as_handled()
		return
	var section := _journal_shortcut(event.keycode)
	if _journal.visible:
		if event.keycode == KEY_ESCAPE or section == _journal_section:
			_journal.close()
		elif not section.is_empty():
			_open_journal(section)
		viewport.set_input_as_handled()
		return
	if _armory.visible:
		return
	if event.keycode == KEY_C:
		_open_character_sheet()
		viewport.set_input_as_handled()
		return
	if _warrens.visible:
		return
	if not section.is_empty():
		_open_journal(section)
		viewport.set_input_as_handled()
		return
	match event.keycode:
		KEY_ESCAPE:
			if not _layout.release_inventory_focus():
				_return_to_characters()
		KEY_E: _interact()
		KEY_I: _layout.focus_inventory()
		KEY_1, KEY_2, KEY_3, KEY_4: _layout.use_slot(event.keycode - KEY_1)
		KEY_SPACE: _strike_practice_post()
		KEY_W: _move(Vector2i.UP)
		KEY_S: _move(Vector2i.DOWN)
		KEY_A: _move(Vector2i.LEFT)
		KEY_D: _move(Vector2i.RIGHT)
		_: return
	viewport.set_input_as_handled()


func _journal_shortcut(key: int) -> String:
	match key:
		KEY_Z: return "skills"
		KEY_T: return "talent"
		KEY_Q: return "quests"
		_: return ""


func _command(command: String) -> void:
	if _sheet.visible or _journal.visible or _armory.visible or _warrens.visible:
		return
	match command:
		"character": _open_character_sheet()
		"inventory": _layout.focus_inventory()
		"interact": _interact()
		"skills", "talent", "quests": _open_journal(command)


func _open_journal(section: String) -> void:
	var weapon: Dictionary = _catalog.get(_satchel.equipped, {})
	_journal_section = section
	_journal.open(section, _profile, Stats.snapshot(_profile, weapon))


func _move(direction: Vector2i) -> void:
	var destination := player + direction
	if _crossing_blocked() and destination.x == WEB_CROSSING.x and floor_cells.has(destination):
		_open_warrens(true)
		return
	if destination == PRACTICE_POST:
		log_label.text = "A practice post blocks the way. Press Space to test your sword."
	elif floor_cells.has(destination):
		player = destination
		var family := _nearby_rack()
		if _near_exit(WEST_EXIT):
			log_label.text = "West stairs to Lantern Rest. Press E to leave the dungeon."
		elif _near_exit(EAST_EXIT):
			log_label.text = "East stairs to Spindle Hollow. Press E to leave the dungeon."
		elif _near_crossing():
			log_label.text = "A White Spider guards the crossing. Press E to approach or head west to rest."
		elif _near_warrens():
			log_label.text = "Silk covers the stairs. Press E to enter the Spider Warrens."
		elif not family.is_empty():
			log_label.text = "%s rack. Press E to browse." % Catalog.FAMILIES[family]
		elif player.distance_squared_to(PRACTICE_POST) <= 1:
			log_label.text = "Practice post. Press Space to test your sword."
		else:
			log_label.text = "Your footsteps echo through the stone."
	else:
		log_label.text = "Cold stone blocks the way."
	_update_interaction()
	_layout.set_player(player)


func _nearby_rack() -> String:
	for cell: Vector2i in WEAPON_RACKS:
		if player.distance_squared_to(cell) <= 1:
			return WEAPON_RACKS[cell]
	return ""


func _near_warrens() -> bool:
	return player.distance_squared_to(WARRENS_STAIRS) <= 1


func _crossing_blocked() -> bool:
	return not _profile.is_empty() and int(_profile["world"]["quest"]) < 2


func _near_crossing() -> bool:
	return _crossing_blocked() and player.distance_squared_to(WEB_CROSSING) <= 1


func _near_exit(cell: Vector2i) -> bool:
	return player.distance_squared_to(cell) <= 1


func _open_warrens(crossing := false) -> void:
	var weapon: Dictionary = _catalog.get(_satchel.equipped, {})
	_warrens.open(weapon, player_sprite, _seed, crossing)


func _interact() -> void:
	if _near_exit(WEST_EXIT):
		_travel_to_town("lantern_rest")
		return
	if _near_exit(EAST_EXIT):
		if _crossing_blocked():
			log_label.text = "Clear the White Spider from the crossing before leaving."
		else:
			_travel_to_town("spindle_hollow")
		return
	if _near_crossing():
		_open_warrens(true)
		return
	if _near_warrens():
		_open_warrens()
		return
	var family := _nearby_rack()
	if family.is_empty():
		log_label.text = "Move next to stairs, a sword rack, or the spider crossing to interact."
		return
	_armory.open_rack(family)


func _strike_practice_post() -> void:
	if player.distance_squared_to(PRACTICE_POST) > 1:
		log_label.text = "Move next to the practice post marked + to strike it."
		return
	var held: Dictionary = _catalog.get(_satchel.equipped, {})
	if held.is_empty():
		log_label.text = "Equip a sword from the satchel first."
		return
	var damage := Stats.roll_melee(Stats.snapshot(_profile, held), _damage_rng)
	log_label.text = "%s strikes the practice post for %d damage." % [held["name"], damage]


func _open_character_sheet() -> void:
	if _sheet.visible or _armory.visible or _journal.visible:
		return
	var weapon: Dictionary = _catalog.get(_satchel.equipped, {})
	var stats := Stats.snapshot(_profile, weapon)
	_resume_warrens = _warrens.visible
	var vitals := _warrens.active_vitals() if _resume_warrens else Vector2i(-1, -1)
	if _resume_warrens:
		_warrens.hide()
	var saved_health := int(_profile["world"]["health"])
	var current_health := int(stats["life"]) if saved_health < 0 else mini(saved_health, int(stats["life"]))
	var health := vitals.x if vitals.x >= 0 else current_health
	var stamina := vitals.y if vitals.y >= 0 else int(stats["stamina"])
	_sheet.open(_profile, stats, weapon, health, stamina)


func _on_character_sheet_closed() -> void:
	if _resume_warrens:
		_resume_warrens = false
		_warrens.show()


func _on_experience_saved(profile: Dictionary) -> void:
	var crossing_was_blocked := _crossing_blocked()
	_profile = profile
	if crossing_was_blocked and not _crossing_blocked():
		log_label.text = "The crossing is clear. Report to Watchkeeper Oren in Spindle Hollow."
	_configure_map()
	_refresh_hud()
	_layout.map_canvas.queue_redraw()


func _travel_to_town(town_id: String) -> void:
	var visited: Array = _profile["world"]["visited"].duplicate()
	if not visited.has(town_id):
		visited.append(town_id)
	if Store.update_world({"location": town_id, "visited": visited}).is_empty():
		log_label.text = "Could not save travel. The stairs remain open."
		return
	_open_town_scene()


func _open_town_scene() -> void:
	get_tree().change_scene_to_file(TOWN)


func _return_to_characters() -> void:
	get_tree().change_scene_to_file(CHARACTERS)
