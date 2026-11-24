extends Control

const Style = preload("res://scripts/menu_style.gd")
const Data = preload("res://scripts/character_data.gd")
const Store = preload("res://scripts/character_store.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Armory = preload("res://scripts/armory.gd")
const Warrens = preload("res://scripts/spider_warrens.gd")
const Rooms = preload("res://scripts/threshold_rooms.gd")
const EnemyMovement = preload("res://scripts/dungeon_enemy_movement.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Durability = preload("res://scripts/equipment_durability.gd")
const Sheet = preload("res://scripts/character_sheet.gd")
const Layout = preload("res://scripts/exploration_layout.gd")
const Journal = preload("res://scripts/exploration_journal.gd")
const CHARACTERS := "res://scenes/character.tscn"
const TOWN := "res://scenes/dungeon_town.tscn"
const SPIDER_ATLAS = preload("res://assets/art/spider_atlas.png")
const MAP_ORIGIN := Vector2(12, 12)
const TILE_SIZE := Vector2(27, 26)
const SPRITE_INSET := Vector2(5, 1)
const GLYPH_INSET := Vector2(7, 21)
const PRACTICE_POST := Vector2i(8, 4)
const WEAPON_RACKS := {
	Vector2i(5, 4): "light",
	Vector2i(5, 6): "rapier",
	Vector2i(5, 8): "heavy",
	Vector2i(5, 10): "piercing",
}
const ROOM_SPIDERS := [
	{"name": "White Spiderling", "sprite": 16},
	{"name": "White Spider", "sprite": 3},
	{"name": "Red Spiderling", "sprite": 13},
	{"name": "Black Spider", "sprite": 5},
	{"name": "Red Spider", "sprite": 1},
	{"name": "Black Spider", "sprite": 5},
	{"name": "Red Spider", "sprite": 1},
]
const BOSS := {
	"name": "Giant Black Spider", "sprite": 36, "health": 62,
	"damage_min": 8, "damage_max": 13, "defense": 2, "protection": 0, "experience": 100,
}
const TREASURE_REWARDS := [
	{"gold": 60, "tonic": 3},
	{"gold": 45, "cobweb": 6},
	{"gold": 50, "cloth": 4},
	{"gold": 70, "fish": 8},
	{"gold": 85, "fiber": 5},
]

var player := Vector2i.ZERO
var _rooms: Array[Dictionary] = []
var _room_index := 0
var _room: Dictionary
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
var _enemy_movement_rng := RandomNumberGenerator.new()
var _enemy_blockers: Dictionary


func _ready() -> void:
	_profile = Store.load_selected()
	if _profile.is_empty():
		_return_to_characters.call_deferred()
		return
	Style.background(self)
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	player_sprite = Data.portrait(_profile, true)
	_seed = int(_profile["seed"]) + int(_profile["world"]["threshold_run"]) * 104729
	_rooms = Rooms.generate(_seed)
	_damage_rng.seed = _seed
	_enemy_movement_rng.seed = _seed
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
	log_label = _layout.log_label
	_layout.map_canvas.draw.connect(_draw_map)

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

	_show_room(_cleared_rooms())
	_warrens.open_pending_loot(_profile)


func _show_room(index: int, arriving_from_east := false) -> void:
	_room_index = index
	_room = _rooms[index]
	_enemy_blockers = {_room["entry"]: true, _room["exit"]: true}
	if _room_index == 0:
		_enemy_blockers[PRACTICE_POST] = true
		_enemy_blockers.merge(WEAPON_RACKS)
	player = _room["exit"] if arriving_from_east else _room["entry"]
	_configure_map()
	_refresh_hud()
	if _room_index == Rooms.ROOM_COUNT:
		if _profile["world"]["threshold_treasure_claimed"]:
			log_label.text = "The remaining chests are sealed. The exit leads to %s." % _destination_town().capitalize()
		else:
			log_label.text = "Choose one chest. Opening it seals the other four. The exit leads to %s." % _destination_town().capitalize()
	elif _monster_present():
		var enemies: Array = _room["enemies"]
		var threat: String = _enemy()["name"] if enemies.size() == 1 else "enemies in this chamber"
		log_label.text = "Defeat the %s to open the next door." % threat
	else:
		log_label.text = "This room is clear."


func _cleared_rooms() -> int:
	return int(_profile["world"]["threshold_cleared"])


func _monster_present() -> bool:
	return _room_index < Rooms.ROOM_COUNT and _room_index >= _cleared_rooms()


func _enemies() -> Array[Dictionary]:
	var enemies: Array[Dictionary] = []
	for index in _room.get("enemies", []).size():
		var enemy := _enemy().duplicate()
		if index > 0:
			var variant: Dictionary = ROOM_SPIDERS[(_room_index + index) % ROOM_SPIDERS.size()]
			enemy["name"] = variant["name"]
			enemy["sprite"] = variant["sprite"]
		enemies.append(enemy)
	return enemies


func _enemy() -> Dictionary:
	if _room_index == Rooms.ROOM_COUNT - 1:
		return BOSS
	var enemy: Dictionary = ROOM_SPIDERS[_room_index].duplicate()
	var tier := floori(_room_index * 0.5)
	enemy.merge({
		"health": 14 + 2 * _room_index,
		"damage_min": 3 + tier,
		"damage_max": 6 + tier,
		"defense": 1 if _room_index >= 3 else 0,
		"protection": 0,
		"experience": 14 + 2 * _room_index,
	})
	return enemy


func _room_title() -> String:
	if _room_index == Rooms.ROOM_COUNT:
		return "Treasure Chamber"
	return "Threshold · Room %d/%d" % [_room_index + 1, Rooms.ROOM_COUNT]


func _configure_map() -> void:
	_layout.configure(_room_title(), Rooms.MAP_SIZE, _room["floor"], _map_landmarks(), _catalog, _satchel)
	var blocked := [PRACTICE_POST] if _room_index == 0 else []
	if _room_index == Rooms.ROOM_COUNT:
		blocked.append_array(_room["chests"])
	_layout.configure_click_movement(MAP_ORIGIN, TILE_SIZE, blocked, _map_movement_available, _move)
	_layout.set_player(player)


func _map_landmarks() -> Dictionary:
	var landmarks := {
		_room["entry"]: Style.TEAL,
		_room["exit"]: Style.ERROR if _monster_present() else Style.TEAL,
	}
	if _monster_present():
		for cell: Vector2i in _room["enemies"]:
			landmarks[cell] = Style.ACCENT
	if _room_index == 0:
		landmarks[PRACTICE_POST] = Style.MUTED
		for cell: Vector2i in WEAPON_RACKS:
			landmarks[cell] = Style.BORDER.lightened(0.2)
	if _room_index == Rooms.ROOM_COUNT:
		for index in _room["chests"].size():
			landmarks[_room["chests"][index]] = _chest_color(index)
	return landmarks


func _refresh_hud() -> void:
	_layout.refresh(_profile)
	_update_interaction()


func _on_profile_updated(profile: Dictionary) -> void:
	_profile = profile


func _update_interaction() -> void:
	var label := ""
	var chest := _nearby_chest()
	if _near_cell(_room["entry"]):
		label = String(_profile["world"]["dungeon_from"]).capitalize() if _room_index == 0 else "Previous room"
	elif _near_cell(_room["exit"]):
		if _room_index == Rooms.ROOM_COUNT:
			label = _destination_town().capitalize()
		elif _monster_present():
			label = "Locked door"
		else:
			label = "Treasure chamber" if _room_index == Rooms.ROOM_COUNT - 1 else "Next room"
	elif chest >= 0 and not _profile["world"]["threshold_treasure_claimed"]:
		label = "Open Chest"
	elif not _nearby_rack().is_empty():
		label = "Inspect Rack"
	_layout.set_context(label)


func _draw_map() -> void:
	var canvas := _layout.map_canvas
	var floor_cells: Dictionary = _room["floor"]
	for x in range(Rooms.MAP_SIZE.x):
		for y in range(Rooms.MAP_SIZE.y):
			var cell := Vector2i(x, y)
			var is_floor := floor_cells.has(cell)
			var glyph := "." if is_floor else "#"
			var color := Color("#788a87") if is_floor else Style.BORDER
			canvas.draw_string(Style.UI_FONT, _map_point(cell) + GLYPH_INSET, glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, color)
	if _room_index == 0:
		for cell: Vector2i in WEAPON_RACKS:
			var point := _map_point(cell)
			canvas.draw_rect(Rect2(point, TILE_SIZE), Style.SURFACE)
			canvas.draw_rect(Rect2(point, TILE_SIZE), Style.BORDER, false, 1)
			var icon: Texture2D = _rack_icons.get(WEAPON_RACKS[cell])
			if icon != null:
				canvas.draw_texture(icon, point + SPRITE_INSET)
		_draw_marker(PRACTICE_POST, "+", Style.ACCENT)
	_draw_marker(_room["entry"], "<", Style.TEAL)
	var locked := _monster_present()
	_draw_marker(_room["exit"], "×" if locked else ">", Style.ERROR if locked else Style.TEAL)
	if _room_index == Rooms.ROOM_COUNT:
		var claimed: bool = _profile["world"]["threshold_treasure_claimed"]
		for index in _room["chests"].size():
			var glyph := "$"
			if claimed:
				glyph = "o" if index == int(_profile["world"]["threshold_treasure_chest"]) else "×"
			_draw_marker(_room["chests"][index], glyph, _chest_color(index))
	if locked:
		var enemies := _enemies()
		for index in enemies.size():
			_draw_enemy(_room["enemies"][index], int(enemies[index]["sprite"]))
	if player_sprite != null:
		var player_position := _map_point(player)
		canvas.draw_rect(Rect2(player_position, TILE_SIZE), Style.PANEL)
		canvas.draw_texture(player_sprite, player_position + SPRITE_INSET)


func _draw_enemy(cell: Vector2i, sprite: int) -> void:
	@warning_ignore("integer_division")
	var row := sprite / 8
	var region := Rect2(Vector2(sprite % 8, row) * Vector2(16, 24), Vector2(16, 24))
	var point := _map_point(cell)
	var size := Vector2(32, 48) if _room_index == Rooms.ROOM_COUNT - 1 else region.size
	var offset := ((TILE_SIZE - size) * 0.5).floor()
	var canvas := _layout.map_canvas
	canvas.draw_rect(Rect2(point, TILE_SIZE), Style.SURFACE)
	canvas.draw_texture_rect_region(SPIDER_ATLAS, Rect2(point + offset, size), region)


func _draw_marker(cell: Vector2i, glyph: String, color: Color) -> void:
	var canvas := _layout.map_canvas
	var point := _map_point(cell)
	canvas.draw_rect(Rect2(point, TILE_SIZE), Style.SURFACE)
	canvas.draw_string(Style.UI_FONT, point + GLYPH_INSET, glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, color)


func _map_point(cell: Vector2i) -> Vector2:
	return MAP_ORIGIN + Vector2(cell) * TILE_SIZE


func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or _journal == null:
		return
	_layout.cancel_map_movement()
	if not _map_movement_available():
		return
	var direction := _layout.map_arrow_direction(event.keycode)
	if direction != Vector2i.ZERO:
		get_viewport().set_input_as_handled()
		_move(direction)


func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or _journal == null:
		return
	if _layout.inventory_is_open() or _layout.game_menu_is_open():
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
		KEY_ESCAPE: _return_to_characters()
		KEY_E: _interact()
		KEY_I: _layout.open_inventory()
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


func _map_movement_available() -> bool:
	return not (_layout.inventory_is_open() or _layout.game_menu_is_open() or _sheet.visible or _journal.visible or _armory.visible or _warrens.visible)


func _command(command: String) -> void:
	_layout.cancel_map_movement()
	if not _map_movement_available():
		return
	match command:
		"character": _open_character_sheet()
		"inventory": _layout.open_inventory()
		"characters": _return_to_characters()
		"interact": _interact()
		"skills", "talent", "quests": _open_journal(command)


func _open_journal(section: String) -> void:
	var weapon: Dictionary = _catalog.get(_satchel.equipped, {})
	_journal_section = section
	_journal.open(section, _profile, Stats.snapshot(_profile, weapon))


func _move(direction: Vector2i) -> void:
	if direction.length_squared() != 1:
		return
	var destination := player + direction
	if not _room["floor"].has(destination):
		log_label.text = "Cold stone blocks the way."
		return
	if _room_index == 0 and destination == PRACTICE_POST:
		log_label.text = "A practice post blocks the way. Press Space to test your sword."
		return
	if _room_index == Rooms.ROOM_COUNT and _room["chests"].has(destination):
		log_label.text = "The chests are sealed." if _profile["world"]["threshold_treasure_claimed"] else "Press E to open an adjacent chest."
		return
	if _monster_present():
		var target: int = _room["enemies"].find(destination)
		if target >= 0:
			_start_battle(target)
			return
	if destination == _room["exit"] and _room_index < Rooms.ROOM_COUNT:
		_advance_room()
		return
	if destination == _room["entry"] and _room_index > 0:
		_show_room(_room_index - 1, true)
		return
	player = destination
	var contact := -1
	if _monster_present():
		contact = EnemyMovement.step(_room["enemies"], player, _room["floor"], _enemy_blockers, _enemy_movement_rng, self)
		_layout.set_map_landmarks(_map_landmarks())
	_layout.set_player(player)
	_update_interaction()
	if contact >= 0:
		_start_battle(contact)


func _start_battle(target: int) -> void:
	_layout.cancel_map_movement()
	var weapon: Dictionary = _catalog.get(_satchel.equipped, {})
	_warrens.open_room_enemies(weapon, player_sprite, _seed, _room_index, _enemies(), target)


func _advance_room() -> void:
	if _monster_present():
		log_label.text = "Defeat all enemies in this room before proceeding."
	elif _room_index == Rooms.ROOM_COUNT:
		_travel_to_town(_destination_town())
	else:
		_show_room(_room_index + 1)


func _nearby_rack() -> String:
	if _room_index == 0:
		for cell: Vector2i in WEAPON_RACKS:
			if _near_cell(cell):
				return WEAPON_RACKS[cell]
	return ""


func _near_cell(cell: Vector2i) -> bool:
	return player.distance_squared_to(cell) <= 1


func _nearby_chest() -> int:
	if _room_index == Rooms.ROOM_COUNT:
		for index in _room["chests"].size():
			if _near_cell(_room["chests"][index]):
				return index
	return -1


func _chest_color(index: int) -> Color:
	var world: Dictionary = _profile["world"]
	if not world["threshold_treasure_claimed"]:
		return Style.ACCENT
	return Style.TEAL if index == int(world["threshold_treasure_chest"]) else Style.MUTED


func _interact() -> void:
	var chest := _nearby_chest()
	if _near_cell(_room["entry"]):
		if _room_index == 0:
			_travel_to_town(_profile["world"]["dungeon_from"])
		else:
			_show_room(_room_index - 1, true)
	elif _near_cell(_room["exit"]):
		_advance_room()
	elif chest >= 0:
		_claim_treasure(chest)
	else:
		var family := _nearby_rack()
		if family.is_empty():
			log_label.text = "Move next to a door, chest, or sword rack to interact."
		else:
			_armory.open_rack(family)


func _claim_treasure(index: int) -> void:
	var current := Store.load_selected()
	if current.get("id") != _profile["id"]:
		return
	var world: Dictionary = current["world"]
	if int(world["threshold_cleared"]) < Rooms.ROOM_COUNT:
		return
	if not world["pending_loot"].is_empty():
		_warrens.open_pending_loot(current)
		return
	if world["threshold_treasure_claimed"]:
		log_label.text = "You can open only one chest per run."
		return

	var saved := Store.update_world({
		"threshold_treasure_claimed": true,
		"threshold_treasure_chest": index,
		"pending_loot": TREASURE_REWARDS[index],
	})
	if saved.is_empty():
		log_label.text = "Could not save the treasure. The chest remains closed."
		return
	_profile = saved
	_layout.set_map_landmarks(_map_landmarks())
	_layout.map_canvas.queue_redraw()
	_refresh_hud()
	log_label.text = "The other chests seal."
	_warrens.open_pending_loot(saved)


func _strike_practice_post() -> void:
	if _room_index != 0 or not _near_cell(PRACTICE_POST):
		log_label.text = "Move next to the practice post marked + to strike it."
		return
	var held: Dictionary = _catalog.get(_satchel.equipped, {})
	if held.is_empty():
		log_label.text = "Equip a sword from the satchel first."
		return
	if Durability.usable_weapon(_profile["world"], held).is_empty():
		log_label.text = "Your sword is broken. Repair it at the blacksmith."
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
	var previous := _cleared_rooms()
	_profile = profile
	if _cleared_rooms() > previous:
		_configure_map()
		log_label.text = "The treasure chamber is open." if _cleared_rooms() == Rooms.ROOM_COUNT else "Room cleared. The next door is open."
	_refresh_hud()


func _destination_town() -> String:
	return "lantern_rest" if _profile["world"]["dungeon_from"] == "spindle_hollow" else "spindle_hollow"


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
