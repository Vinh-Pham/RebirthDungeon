extends Control

const Style = preload("res://scripts/menu_style.gd")
const Store = preload("res://scripts/character_store.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Armory = preload("res://scripts/armory.gd")
const Sheet = preload("res://scripts/character_sheet.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Data = preload("res://scripts/character_data.gd")
const Layout = preload("res://scripts/exploration_layout.gd")
const Journal = preload("res://scripts/exploration_journal.gd")

const POINTS := [
	Vector2i(5, 4), Vector2i(10, 4), Vector2i(15, 4),
	Vector2i(20, 4), Vector2i(24, 8), Vector2i(26, 5)
]
const ORIGIN := Vector2(11, 42)
const TILE := Vector2(28, 32)
const SPRITE_INSET := Vector2(6, 4)
const SERVICES := ["Warden", "Blacksmith", "Provisioner", "Healer's House"]
const TOWN_NAMES := {"lantern_rest": "Lantern Rest", "spindle_hollow": "Spindle Hollow"}

static var _gate_arrival_id := ""

var profile: Dictionary
var world: Dictionary
var town: String
var player := Vector2i(4, 7)
var catalogue: Dictionary
var portrait: Texture2D
var atlas: Texture2D
var info: Label
var quest_status: Label
var dialogue: HBoxContainer
var _layout: Layout
var _journal: Journal
var satchel := Satchel.new()
var armory: Armory
var sheet: Sheet
var wall_cells: Dictionary = {}
var conversation_target := -1
var conversation_serial := 0


func _ready() -> void:
	profile = Store.load_selected()
	if profile.is_empty():
		get_tree().change_scene_to_file.call_deferred("res://scenes/character.tscn")
		return
	world = profile["world"]
	town = world["location"]
	if not TOWN_NAMES.has(town):
		get_tree().change_scene_to_file.call_deferred("res://scenes/character.tscn")
		return
	if _gate_arrival_id == profile["id"]:
		player = POINTS[4] + Vector2i.UP
		_gate_arrival_id = ""

	Style.background(self)
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	catalogue = Catalog.items_by_id()
	portrait = Data.portrait(profile, true)
	if ResourceLoader.exists("res://assets/art/town_atlas.png"):
		atlas = load("res://assets/art/town_atlas.png")
	var visited: Array = world["visited"].duplicate()
	if not visited.has(town):
		visited.append(town)
		if not _save({"visited": visited}):
			get_tree().change_scene_to_file.call_deferred("res://scenes/character.tscn")
			return
	satchel.open(profile["id"], catalogue)
	_build_map()
	_build_interface()
	_refresh()
	_show_status()


func _build_map() -> void:
	# Four enclosed service rooms. Each southern door remains open at y=5.
	for index in range(4):
		var center: Vector2i = POINTS[index]
		for x in range(center.x - 2, center.x + 3):
			wall_cells[Vector2i(x, 1)] = true
			if x != center.x:
				wall_cells[Vector2i(x, 5)] = true
		for y in range(2, 5):
			wall_cells[Vector2i(center.x - 2, y)] = true
			wall_cells[Vector2i(center.x + 2, y)] = true
	for x in range(30):
		wall_cells[Vector2i(x, 0)] = true
		wall_cells[Vector2i(x, 10)] = true
	for y in range(11):
		wall_cells[Vector2i(0, y)] = true
		wall_cells[Vector2i(29, y)] = true


func _build_interface() -> void:
	_layout = Layout.new()
	add_child(_layout)
	var walkable := {}
	var landmarks := {}
	for x in range(30):
		for y in range(11):
			var cell := Vector2i(x, y)
			if not wall_cells.has(cell):
				walkable[cell] = true
	for point: Vector2i in POINTS:
		landmarks[point] = Style.TEAL
	_layout.configure(TOWN_NAMES[town], "Safe Dungeon Town     /     Click / WASD / Arrows  Move   E  Interact   Esc  Character Select", Vector2i(30, 11), walkable, landmarks, catalogue, satchel)
	_layout.configure_click_movement(ORIGIN, TILE, POINTS, _map_movement_available, _move)
	_layout.map_canvas.draw.connect(_draw_world)
	_layout.command_requested.connect(_command)
	_layout.profile_updated.connect(_profile_updated)
	dialogue = _layout.choices
	armory = Armory.new()
	armory.configure(catalogue, satchel)
	armory.weapons_changed.connect(_refresh)
	add_child(armory)
	sheet = Sheet.new()
	add_child(sheet)
	_journal = Journal.new()
	add_child(_journal)


func _profile_updated(updated: Dictionary) -> void:
	profile = updated
	world = profile["world"]
	_refresh()


func _map_movement_available() -> bool:
	return not (_layout.inventory_is_open() or sheet.visible or armory.visible or _journal.visible)


func _command(command: String) -> void:
	_layout.cancel_map_movement()
	if not _map_movement_available():
		return
	var weapon: Dictionary = catalogue.get(satchel.equipped, {})
	match command:
		"character":
			var stats := Stats.snapshot(profile, weapon)
			var health := int(stats["life"]) if int(world["health"]) < 0 else int(world["health"])
			sheet.open(profile, stats, weapon, health, int(stats["stamina"]))
		"inventory": _layout.open_inventory()
		"skills", "talent", "quests": _journal.open(command, profile, Stats.snapshot(profile, weapon))
		"interact": _interact()


func _save(changes: Dictionary) -> bool:
	var saved: Dictionary = Store.update_world(changes)
	if saved.is_empty():
		if dialogue != null:
			_say("Progress could not be saved. Please try again.", {})
		return false
	profile = saved
	world = profile["world"]
	return true


func _refresh() -> void:
	if _layout == null:
		return
	_layout.refresh(profile)
	_layout.set_player(player)
	_update_context()


func _update_context() -> void:
	for index in POINTS.size():
		if player.distance_squared_to(POINTS[index]) <= 1:
			_layout.set_context(_resident_names()[index])
			return
	_layout.set_context("")


func _show_status() -> void:
	conversation_target = -1
	_say("Lanterns mark a place of safety. Residents offer equipment, provisions, and a bed. Follow the road to the Moon Gate or dungeon stairs.", {})


func _draw_world() -> void:
	if profile.is_empty() or not TOWN_NAMES.has(town):
		return
	var masonry := Style.BORDER if town == "lantern_rest" else Color("#665964")
	var road := Color("#344a5a") if town == "lantern_rest" else Color("#443846")
	for x in range(30):
		for y in range(11):
			var cell := Vector2i(x, y)
			var point := ORIGIN + Vector2(cell) * TILE
			if y == 7 or (x == 24 and y >= 6):
				_layout.map_canvas.draw_rect(Rect2(point, TILE), road)
			var is_wall := wall_cells.has(cell)
			_layout.map_canvas.draw_string(Style.UI_FONT, point + Vector2(9, 23), "#" if is_wall else ".", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, masonry)

	for index in range(4):
		var point := ORIGIN + Vector2(POINTS[index]) * TILE
		var caption: String = SERVICES[index]
		if index == 0 and town == "spindle_hollow":
			caption = "Watchkeeper"
		_layout.map_canvas.draw_string(Style.UI_FONT, Vector2(point.x - 32, ORIGIN.y - 2), caption, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Style.TEXT)
		var door := ORIGIN + Vector2(POINTS[index].x, 5) * TILE
		_layout.map_canvas.draw_line(door + Vector2(2, 29), door + Vector2(26, 29), Style.ACCENT)

	var names := _resident_names()
	for index in POINTS.size():
		var point := ORIGIN + Vector2(POINTS[index]) * TILE
		if index == 4 and world["gates"].has(town):
			_layout.map_canvas.draw_rect(Rect2(point + Vector2(2, 1), TILE - Vector2(4, 2)), Style.TEAL, false, 1)
		if index < 5 and atlas != null:
			var slot := index + (1 if town == "lantern_rest" else 5)
			if index == 4:
				slot = 9
			_layout.map_canvas.draw_texture_rect_region(atlas, Rect2(point + SPRITE_INSET, Vector2(16, 24)), Rect2(slot * 16, 0, 16, 24))
		else:
			_layout.map_canvas.draw_string(Style.UI_FONT, point + Vector2(9, 23), ">", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Style.ACCENT)
		_layout.map_canvas.draw_string(Style.UI_FONT, point + Vector2(-13, -4), names[index], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Style.TEXT)
	_layout.map_canvas.draw_texture(portrait, ORIGIN + Vector2(player) * TILE + SPRITE_INSET)


func _resident_names() -> Array:
	if town == "lantern_rest":
		return ["Nera", "Venn", "Tamsin", "Sera", "Moon Gate", "Dungeon"]
	return ["Oren", "Brann", "Rill", "Ada", "Moon Gate", "Dungeon"]


func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or sheet == null:
		return
	_layout.cancel_map_movement()
	if _layout.inventory_is_open():
		return
	if sheet.visible:
		if event.keycode in [KEY_C, KEY_ESCAPE]:
			sheet.close()
			get_viewport().set_input_as_handled()
		return
	if armory.visible:
		return
	if _journal.visible:
		if event.keycode in [KEY_ESCAPE, KEY_Z, KEY_T, KEY_Q]:
			_journal.close()
			get_viewport().set_input_as_handled()
		return
	if event.keycode == KEY_ESCAPE:
		get_viewport().set_input_as_handled()
		if conversation_target >= 0:
			_show_status()
		else:
			_characters()
		return
	var direction := _layout.map_arrow_direction(event.keycode)
	if direction != Vector2i.ZERO:
		get_viewport().set_input_as_handled()
		_move(direction)


func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or sheet == null:
		return
	if not _map_movement_available():
		return
	var viewport := get_viewport()
	match event.keycode:
		KEY_C: _command("character")
		KEY_I: _command("inventory")
		KEY_Z: _command("skills")
		KEY_T: _command("talent")
		KEY_Q: _command("quests")
		KEY_1, KEY_2, KEY_3, KEY_4: _layout.use_slot(event.keycode - KEY_1)
		KEY_E:
			_interact()
		KEY_W:
			_move(Vector2i.UP)
		KEY_S:
			_move(Vector2i.DOWN)
		KEY_A:
			_move(Vector2i.LEFT)
		KEY_D:
			_move(Vector2i.RIGHT)
		_:
			return
	viewport.set_input_as_handled()


func _move(direction: Vector2i) -> void:
	var target := player + direction
	if not wall_cells.has(target) and not POINTS.has(target):
		player = target
		if conversation_target >= 0:
			_show_status()
		_layout.set_player(player)
		_update_context()


func _say(message: String, choices: Dictionary) -> void:
	conversation_serial += 1
	var serial := conversation_serial
	for child in dialogue.get_children():
		dialogue.remove_child(child)
		child.queue_free()
	_layout.log_label.text = message
	var row := dialogue
	var first: Button
	for caption in choices:
		var button := Style.button(caption)
		button.custom_minimum_size.y = 32
		button.pressed.connect(_choose.bind(choices[caption], serial, conversation_target), CONNECT_DEFERRED)
		row.add_child(button)
		if first == null:
			first = button
	if first != null:
		first.grab_focus()


func _choose(action: Callable, serial: int, target: int) -> void:
	if serial != conversation_serial or target < 0 or target != conversation_target:
		return
	if player.distance_squared_to(POINTS[target]) > 1:
		_show_status()
		return
	action.call()


func _interact() -> void:
	for index in POINTS.size():
		if player.distance_squared_to(POINTS[index]) <= 1:
			conversation_target = index
			match index:
				0:
					_elder()
				1:
					_say("%s: Take a dependable blade before entering the passage. I can also show you the sword racks." % _resident_names()[1], {
						"Claim starter sword": _starter,
						"Browse swords": _browse_swords
					})
				2:
					_say("%s: A Healing Tonic costs 8 gold. Carry a few before taking the lower road." % _resident_names()[2], {"Buy tonic · 8 gold": _buy})
				3:
					_say("%s: The Healer's House has a clean bed and warm broth. Rest here until your strength returns." % _resident_names()[3], {"Rest and recover": _heal})
				4:
					_gate()
				5:
					_leave()
			return
	_show_status()


func _elder() -> void:
	if town == "lantern_rest":
		var choices := {}
		if int(world["quest"]) == 0:
			choices["Accept passage quest"] = _accept
		_say("Warden Nera: Speak to Venn for a blade, then carry our signal through the dungeon to Watchkeeper Oren in Spindle Hollow.", choices)
	elif int(world["quest"]) == 2:
		_say("Watchkeeper Oren: Your arrival means the road is open again. Take this for carrying Lantern Rest's signal.", {"Complete quest": _reward})
	else:
		_say("Watchkeeper Oren: Rest here and awaken our Moon Gate. Each gate remembers the Dungeon Towns you have reached.", {})


func _accept() -> void:
	if int(world["quest"]) != 0:
		return
	if _save({"quest": 1}):
		_say("Nera: Your first passage begins here. Venn's forge is the next room along.", {})
		_refresh()


func _reward() -> void:
	if town != "spindle_hollow" or int(world["quest"]) != 2:
		return
	if _save({"quest": 3, "gold": int(world["gold"]) + 32}):
		_say("Oren: A promise kept. You receive 32 gold.", {})
		_refresh()


func _starter() -> void:
	var error := ""
	if not satchel.owns("ashen_arcblade"):
		error = satchel.take("ashen_arcblade")
	if error.is_empty() and satchel.equipped.is_empty():
		error = satchel.equip("ashen_arcblade")
	if error.is_empty():
		_say("%s: Your starter sword is ready. Inspect it in your satchel before leaving." % _resident_names()[1], {})
	else:
		_say(error, {})
	_refresh()


func _browse_swords() -> void:
	_show_status()
	armory.open_rack("light" if town == "lantern_rest" else "heavy")


func _buy() -> void:
	if int(world["gold"]) < 8:
		_say("%s: You need 8 gold for a tonic." % _resident_names()[2], {})
		return
	if _save({"gold": int(world["gold"]) - 8, "tonics": int(world["tonics"]) + 1}):
		var choices := {"Buy tonic · 8 gold": _buy} if int(world["gold"]) >= 8 else {}
		_say("%s: One Healing Tonic, packed for the journey." % _resident_names()[2], choices)
		_refresh()


func _heal() -> void:
	if _save({"health": -1}):
		_say("%s: You wake fully healed. Travel carefully." % _resident_names()[3], {})
		_refresh()


func _leave() -> void:
	if town == "lantern_rest" and int(world["quest"]) == 0:
		_say("The passage keeper asks you to speak with Warden Nera first.", {})
		return
	if _save({"location": "threshold", "dungeon_from": town}):
		get_tree().change_scene_to_file("res://scenes/dungeon_entry.tscn")


func _gate() -> void:
	if not world["gates"].has(town):
		_say("The Moon Gate rests beneath a crescent of pale light. Touch its mechanism to register this Dungeon Town.", {"Activate Moon Gate": _activate_gate})
		return
	var destination := "spindle_hollow" if town == "lantern_rest" else "lantern_rest"
	if world["gates"].has(destination) and world["visited"].has(destination):
		_say("The Moon Gate links the Dungeon Towns you have awakened.", {"Travel to " + str(TOWN_NAMES[destination]): _travel.bind(destination)})
	else:
		_say("Moon Gate activated. Visit and awaken another Dungeon Town's gate to travel there.", {})


func _activate_gate() -> void:
	if world["gates"].has(town):
		return
	var gates: Array = world["gates"].duplicate()
	gates.append(town)
	if _save({"gates": gates}):
		_gate()


func _travel(destination: String) -> void:
	if destination == town or not world["gates"].has(town):
		return
	if not world["gates"].has(destination) or not world["visited"].has(destination):
		return
	if _save({"location": destination}):
		_gate_arrival_id = str(profile["id"])
		if get_tree().change_scene_to_file("res://scenes/dungeon_town.tscn") != OK:
			_gate_arrival_id = ""
			_say("The destination could not open. Reload your character to resume there.", {})


func _characters() -> void:
	get_tree().change_scene_to_file("res://scenes/character.tscn")
