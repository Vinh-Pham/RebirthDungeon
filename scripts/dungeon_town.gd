extends Control

const Durability = preload("res://scripts/equipment_durability.gd")
const Repair = preload("res://scripts/equipment_repair.gd")
const Shop = preload("res://scripts/blacksmith_shop.gd")

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
const Skills = preload("res://scripts/character_skills.gd")
const LanternMap = preload("res://scripts/lantern_rest_map.gd")
const Activities = preload("res://scripts/town_activities.gd")
const Firewood = preload("res://scripts/firewood.gd")
const AMENITY_ATLAS = preload("res://assets/art/town_amenities.png")
const TREE_SPRITE = preload("res://assets/art/town_tree.png")
const SPRITE_SIZE := Vector2(16, 24)

const SPINDLE_LANDMARKS := [
	{"id": "warden", "cell": Vector2i(5, 4), "label": "Watchkeeper", "name": "Oren", "sprite": 5},
	{"id": "blacksmith", "cell": Vector2i(10, 4), "label": "Blacksmith", "name": "Brann", "sprite": 6},
	{"id": "general_shop", "cell": Vector2i(15, 4), "label": "Provisioner", "name": "Rill", "sprite": 7},
	{"id": "healer", "cell": Vector2i(20, 4), "label": "Healer's House", "name": "Ada", "sprite": 8},
	{"id": "gate", "cell": Vector2i(24, 8), "label": "Moon Gate", "sprite": 9},
	{"id": "dungeon", "cell": Vector2i(26, 5), "label": "Threshold", "glyph": ">"},
]
const TOWN_NAMES := {"lantern_rest": "Lantern Rest", "spindle_hollow": "Spindle Hollow"}

static var _gate_arrival_id := ""

var profile: Dictionary
var world: Dictionary
var town: String
var player := Vector2i(4, 7)
var catalogue: Dictionary
var portrait: Texture2D
var atlas: Texture2D
var _landmarks: Array
var _points: Array[Vector2i] = []
var _resident_portraits: Dictionary = {}
var _map_size := Vector2i(30, 11)
var _map_origin := Vector2(11, 42)
var _tile_size := Vector2(28, 32)
var dialogue: HBoxContainer
var _layout: Layout
var _journal: Journal
var _studying_at_school := false
var satchel := Satchel.new()
var armory: Armory
var sheet: Sheet
var _repair: Repair
var _shop: Shop
var _tree_refresh: Timer
var wall_cells: Dictionary = {}
var _water_cells: Dictionary = {}
var _road_cells: Dictionary = {}
var _world_canvas: CanvasItem
var _town_viewport: SubViewport
var _player_sprite: Sprite2D
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
	if satchel.owns("ashen_arcblade") and not world["starter_sword_claimed"]:
		_save({"starter_sword_claimed": true})
	_build_map()
	_build_interface()
	_refresh()
	_show_status()


func _build_map() -> void:
	var gate_arrival: bool = _gate_arrival_id == profile["id"]
	if town == "lantern_rest":
		var generated := LanternMap.generate(int(profile["seed"]))
		_landmarks = generated["landmarks"]
		wall_cells = generated["walls"]
		_water_cells = generated["water"]
		_road_cells = generated["roads"]
		wall_cells.merge(_water_cells)
		player = generated["spawn"]
		_map_size = LanternMap.SIZE
		_map_origin = Vector2.ZERO
		_tile_size = Vector2(28, 28)
	else:
		_landmarks = SPINDLE_LANDMARKS.duplicate(true)
		_build_spindle_walls()

	var tree_clearings := _road_cells.duplicate()
	if town == "spindle_hollow":
		for place: Dictionary in _landmarks.slice(0, 4):
			var center: Vector2i = place["cell"]
			for x in range(center.x - 2, center.x + 3):
				for y in range(2, 7):
					tree_clearings[Vector2i(x, y)] = true
	var tree_count := 12 if town == "lantern_rest" else 5
	_landmarks.append_array(LanternMap.tree_landmarks(_map_size, _landmarks, wall_cells, tree_clearings, player, int(profile["seed"]), tree_count))
	for place: Dictionary in _landmarks:
		var cell: Vector2i = place["cell"]
		_points.append(cell)
		if place.has("portrait"):
			_resident_portraits[cell] = Data.portrait(place["portrait"], true)
		if place["id"] == "gate" and _gate_arrival_id == profile["id"]:
			player = cell + Vector2i.UP
			_gate_arrival_id = ""
	if not gate_arrival:
		_restore_map_position()


func _restore_map_position() -> void:
	var checkpoint: Dictionary = world.get("map_position", {})
	if checkpoint.get("location") != town:
		return
	var bounds := Rect2i(Vector2i.ZERO, _map_size)
	if checkpoint.get("landmark") == "dungeon":
		for place: Dictionary in _landmarks:
			if place["id"] != "dungeon":
				continue
			for direction: Vector2i in [Vector2i.LEFT, Vector2i.DOWN, Vector2i.UP, Vector2i.RIGHT]:
				var approach: Vector2i = place["cell"] + direction
				if bounds.has_point(approach) and not wall_cells.has(approach) and not _points.has(approach):
					player = approach
					return
		return
	var saved := Vector2i(int(checkpoint["x"]), int(checkpoint["y"]))
	var saved_landmark := _points.find(saved)
	var can_resume: bool = saved_landmark < 0 or _landmarks[saved_landmark]["id"] == "tree"
	if bounds.has_point(saved) and not wall_cells.has(saved) and can_resume:
		player = saved


func _build_spindle_walls() -> void:
	# Four service rooms open onto the central road.
	for index in range(4):
		var center: Vector2i = _landmarks[index]["cell"]
		for x in range(center.x - 2, center.x + 3):
			wall_cells[Vector2i(x, 1)] = true
			if x != center.x:
				wall_cells[Vector2i(x, 5)] = true
		for y in range(2, 5):
			wall_cells[Vector2i(center.x - 2, y)] = true
			wall_cells[Vector2i(center.x + 2, y)] = true
	for x in range(_map_size.x):
		wall_cells[Vector2i(x, 0)] = true
		wall_cells[Vector2i(x, _map_size.y - 1)] = true
	for y in range(_map_size.y):
		wall_cells[Vector2i(0, y)] = true
		wall_cells[Vector2i(_map_size.x - 1, y)] = true


func _build_interface() -> void:
	_layout = Layout.new()
	add_child(_layout)
	var walkable := {}
	var landmarks := {}
	for x in range(_map_size.x):
		for y in range(_map_size.y):
			var cell := Vector2i(x, y)
			if not wall_cells.has(cell):
				walkable[cell] = true
	for place: Dictionary in _landmarks:
		landmarks[place["cell"]] = _landmark_color(place)
	_layout.configure(TOWN_NAMES[town], _map_size, walkable, landmarks, catalogue, satchel)
	var input_to_world := Callable()
	_world_canvas = _layout.map_canvas
	if town == "lantern_rest":
		_build_town_view()
		input_to_world = _town_world_position
	_world_canvas.draw.connect(_draw_world)
	_layout.configure_click_movement(_map_origin, _tile_size, _points, _map_movement_available, _move, input_to_world)
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
	_journal.name = "ExplorationJournal"
	_journal.advance_requested.connect(_advance_skill)
	_journal.learn_requested.connect(_learn_skill)
	_journal.study_requested.connect(_study_skill)
	add_child(_journal)
	_repair = Repair.new()
	_repair.selected.connect(_repair_options)
	add_child(_repair)
	_shop = Shop.new()
	_shop.name = "BlacksmithShop"
	_shop.purchase_requested.connect(_purchase_shop_item)
	_shop.closed.connect(_blacksmith_menu)
	add_child(_shop)
	_tree_refresh = Timer.new()
	_tree_refresh.one_shot = true
	_tree_refresh.timeout.connect(_refresh_tree_options)
	add_child(_tree_refresh)


func _build_town_view() -> void:
	# Render the scrolling map inside the HUD panel.
	var panel := _layout.map_canvas
	_town_viewport = SubViewport.new()
	_town_viewport.name = "TownViewport"
	_town_viewport.size = Vector2i(panel.size)
	_town_viewport.world_2d = World2D.new()
	_town_viewport.transparent_bg = true
	panel.add_child(_town_viewport)

	var display := TextureRect.new()
	display.name = "TownView"
	display.mouse_filter = Control.MOUSE_FILTER_IGNORE
	display.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	display.texture = _town_viewport.get_texture()
	panel.add_child(display)
	display.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_world_canvas = Node2D.new()
	_world_canvas.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_town_viewport.add_child(_world_canvas)

	_player_sprite = Sprite2D.new()
	_player_sprite.name = "Player"
	_player_sprite.texture = portrait
	_player_sprite.position = (_map_origin + (Vector2(player) + Vector2(0.5, 0.5)) * _tile_size).floor()
	_world_canvas.add_child(_player_sprite)

	var camera := Camera2D.new()
	camera.position = _player_sprite.position
	_town_viewport.add_child(camera)

	var follow := PhantomCamera2D.new()
	follow.follow_mode = PhantomCamera2D.FollowMode.SIMPLE
	follow.follow_target = _player_sprite
	follow.position = _player_sprite.position
	follow.follow_damping = true
	follow.follow_damping_value = Vector2(0.12, 0.12)
	follow.snap_to_pixel = true
	follow.tween_on_load = false
	follow.tween_completed.connect(_limit_town_camera.bind(camera))
	_town_viewport.add_child(follow)
	camera.add_child(PhantomCameraHost.new())
	_limit_town_camera(camera)


func _limit_town_camera(camera: Camera2D) -> void:
	# Let Camera2D use the map viewport size when clamping at the town boundary.
	var extent := Vector2(_map_size) * _tile_size
	camera.limit_left = int(_map_origin.x)
	camera.limit_top = int(_map_origin.y)
	camera.limit_right = int(_map_origin.x + extent.x)
	camera.limit_bottom = int(_map_origin.y + extent.y)
	camera.force_update_scroll()


func _town_world_position(panel_position: Vector2) -> Vector2:
	return _town_viewport.get_canvas_transform().affine_inverse() * panel_position


func _sync_player_view() -> void:
	_layout.set_player(player)
	if _player_sprite != null:
		_player_sprite.position = (_map_origin + (Vector2(player) + Vector2(0.5, 0.5)) * _tile_size).floor()


func _profile_updated(updated: Dictionary) -> void:
	profile = updated
	world = profile["world"]
	_refresh()


func _map_movement_available() -> bool:
	return not (_layout.inventory_is_open() or _layout.game_menu_is_open() or sheet.visible or armory.visible or _journal.visible or _repair.visible or _shop.visible)


func _command(command: String) -> void:
	_layout.cancel_map_movement()
	if command == "exit":
		_exit_game()
		return
	if command == "characters":
		_characters()
		return
	if not _map_movement_available():
		return
	var weapon: Dictionary = catalogue.get(satchel.equipped, {})
	match command:
		"character":
			var stats := Stats.snapshot(profile, weapon)
			var health := int(stats["life"]) if int(world["health"]) < 0 else int(world["health"])
			sheet.open(profile, stats, weapon, health, int(stats["stamina"]))
		"inventory": _layout.open_inventory()
		"skills", "talent", "quests": _open_journal(command)
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
	_sync_player_view()
	_world_canvas.queue_redraw()
	_update_context()


func _nearby_landmark() -> int:
	for index in range(_points.size()):
		if player.distance_squared_to(_points[index]) <= 1:
			return index
	return -1


func _update_context() -> void:
	var index := _nearby_landmark()
	if index < 0:
		_layout.set_context("")
		return
	var place: Dictionary = _landmarks[index]
	_layout.set_context(place.get("name", place["label"]))


func _show_status() -> void:
	conversation_target = -1
	var message := "Visit the shops, workstations, or fishing pools. Take the east stairs to the Threshold dungeon."
	if town == "spindle_hollow":
		message = "Rest, resupply, or speak with Watchkeeper Oren. The Threshold stairs lead back toward Lantern Rest."
	elif int(world["quest"]) == 0 and not world["starter_sword_claimed"]:
		message = "Welcome to Lantern Rest. Speak to Warden Nera and visit Venn for a starter sword before taking the east stairs."
	_say(message, {})


func _landmark_color(place: Dictionary) -> Color:
	if place.has("name") or place["id"] in ["gate", "fishing"]:
		return Style.TEAL
	return Style.ACCENT


func _draw_world() -> void:
	var canvas := _world_canvas
	var lantern := town == "lantern_rest"
	var masonry := Style.BORDER if lantern else Color("#665964")
	var road := Color(Style.PANEL, 0.52) if lantern else Color("#443846")
	for place: Dictionary in _landmarks:
		if place.has("building"):
			var building: Rect2i = place["building"]
			var bounds := Rect2(_map_origin + Vector2(building.position) * _tile_size, Vector2(building.size) * _tile_size)
			canvas.draw_rect(bounds, Style.SURFACE)
			canvas.draw_rect(bounds, Style.BORDER, false, 1)
	for x in range(_map_size.x):
		for y in range(_map_size.y):
			var cell := Vector2i(x, y)
			var point := _map_origin + Vector2(cell) * _tile_size
			if _water_cells.has(cell):
				canvas.draw_rect(Rect2(point, _tile_size), Style.PANEL)
				canvas.draw_string(Style.UI_FONT, point + Vector2(8, 21), "≈", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Style.TEAL)
				continue
			if _road_cells.has(cell) or (not lantern and (y == 7 or (x == 24 and y >= 6))):
				canvas.draw_rect(Rect2(point, _tile_size), road)
			var glyph := "#" if wall_cells.has(cell) else "."
			canvas.draw_string(Style.UI_FONT, point + Vector2(9, 22), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, masonry)

	var inset := ((_tile_size - SPRITE_SIZE) * 0.5).floor()
	for place: Dictionary in _landmarks:
		var cell: Vector2i = place["cell"]
		var point := _map_origin + Vector2(cell) * _tile_size
		var color := _landmark_color(place)
		if place.has("building"):
			_draw_building_entrance(place)
		elif place.has("name"):
			_draw_caption(point.x, _map_origin.y - 4, place["label"], Style.TEXT)
			var door := _map_origin + Vector2(cell.x, 5) * _tile_size
			canvas.draw_line(door + Vector2(2, _tile_size.y - 3), door + Vector2(_tile_size.x - 2, _tile_size.y - 3), Style.ACCENT)
		else:
			canvas.draw_rect(Rect2(point, _tile_size), Style.SURFACE)
		if place["id"] == "gate" and world["gates"].has(town):
			canvas.draw_rect(Rect2(point + Vector2.ONE, _tile_size - Vector2(2, 2)), Style.TEAL, false, 1)
		var sprite_atlas := atlas
		var sprite_index := int(place.get("sprite", -1))
		if place.has("amenity_sprite"):
			sprite_atlas = AMENITY_ATLAS
			sprite_index = int(place["amenity_sprite"])
		if place["id"] == "tree":
			canvas.draw_texture(TREE_SPRITE, point + inset)
		elif _resident_portraits.has(cell):
			canvas.draw_texture(_resident_portraits[cell], point + inset)
		elif sprite_atlas != null and sprite_index >= 0:
			var region := Rect2(Vector2(sprite_index * SPRITE_SIZE.x, 0), SPRITE_SIZE)
			canvas.draw_texture_rect_region(sprite_atlas, Rect2(point + inset, SPRITE_SIZE), region)
		else:
			canvas.draw_string(Style.UI_FONT, point + Vector2(9, 22), place.get("glyph", "@"), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, color)
		_draw_caption(point.x, point.y - 3, place.get("name", place["label"]), color)
	if not lantern:
		canvas.draw_texture(portrait, _map_origin + Vector2(player) * _tile_size + inset)


func _draw_building_entrance(place: Dictionary) -> void:
	var door_cell: Vector2i = place["door"]
	var door := _map_origin + Vector2(door_cell) * _tile_size
	_world_canvas.draw_rect(Rect2(door + Vector2(1, 0), _tile_size - Vector2(2, 0)), Style.PANEL)
	_world_canvas.draw_line(door + Vector2(2, 4), door + Vector2(2, _tile_size.y - 4), Style.ACCENT)
	_world_canvas.draw_line(door + Vector2(_tile_size.x - 3, 4), door + Vector2(_tile_size.x - 3, _tile_size.y - 4), Style.ACCENT)

	var caption: String = place["label"]
	var sign_top := door + Vector2(_tile_size.x * 0.5, -24)
	var width := ceilf(Style.UI_FONT.get_string_size(caption, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x) + 16
	var sign := Rect2(Vector2(roundf(sign_top.x - width * 0.5), sign_top.y), Vector2(width, 20))
	_world_canvas.draw_rect(sign, Style.BACK)
	_world_canvas.draw_rect(sign, Style.BORDER, false, 1)
	_world_canvas.draw_string(Style.UI_FONT, sign.position + Vector2(8, 15), caption, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Style.TEXT)


func _draw_caption(tile_x: float, baseline: float, caption: String, color: Color) -> void:
	var x := tile_x + _tile_size.x * 0.5 - 54.0
	_world_canvas.draw_string(Style.UI_FONT, Vector2(x, baseline), caption, HORIZONTAL_ALIGNMENT_CENTER, 108, 10, color)


func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or sheet == null:
		return
	_layout.cancel_map_movement()
	if _layout.inventory_is_open() or _layout.game_menu_is_open():
		return
	if sheet.visible:
		if event.keycode in [KEY_C, KEY_ESCAPE]:
			sheet.close()
			get_viewport().set_input_as_handled()
		return
	if armory.visible or _repair.visible or _shop.visible:
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
	if not wall_cells.has(target) and not _points.has(target):
		player = target
		if conversation_target >= 0:
			_show_status()
		_sync_player_view()
		_update_context()


func _say(message: String, choices: Dictionary) -> void:
	_tree_refresh.stop()
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
	if player.distance_squared_to(_points[target]) > 1:
		_show_status()
		return
	action.call()


func _interact() -> void:
	conversation_target = _nearby_landmark()
	if conversation_target < 0:
		_show_status()
		return
	var place: Dictionary = _landmarks[conversation_target]
	var resident := str(place.get("name", ""))
	match place["id"]:
		"warden":
			_elder()
		"blacksmith":
			_blacksmith_menu()
		"general_shop":
			var choices := {"Buy tonic · 8 gold": _buy}
			if town == "lantern_rest":
				choices["Buy fiber · %d gold" % Activities.FIBER_PRICE] = _perform_activity.bind("buy_fiber")
				choices["Sell cloth · %d gold" % Activities.CLOTH_PRICE] = _perform_activity.bind("sell_cloth")
			_say("%s  ·  Stock up before taking the lower road." % resident, choices)
		"school":
			_say("%s  ·  I teach the skills a new delver needs to stay alive." % resident, {
				"Study Skills": _open_school_skills,
				"Combat lesson": _say.bind("Queue an attack or skill and it will execute when your Time gauge fills. Attack interrupts Smash, Defend softens Attack, and Smash breaks Defend. You can use a tonic anytime.", {}),
			})
		"church":
			_say("%s  ·  The Moon Gates join the towns we remember." % resident, {
				"Ask about Moon Gates": _say.bind("Activate the Moon Gate here, then find one in another town. Visit both gates before traveling between them.", {}),
			})
		"grocery_store":
			_say("%s  ·  Mill this grain into flour at the windmill, then bake it at the oven." % resident, {
				"Buy grain · %d gold" % Activities.GRAIN_PRICE: _perform_activity.bind("buy_grain"),
			})
		"healer":
			_say("%s  ·  Rest here until your strength returns." % resident, {"Rest and recover": _heal})
		"oven":
			_say("Cook a fish or bake with flour to restore up to %d Life." % Activities.MEAL_HEAL, {
				"Cook fish": _perform_activity.bind("cook_fish"),
				"Bake bread": _perform_activity.bind("bake"),
			})
		"loom":
			_say("Weave thread into cloth. Tamsin buys finished cloth at the General Shop.", {
				"Weave cloth": _perform_activity.bind("weave"),
			})
		"spinning_wheel":
			_say("Spin fiber from the General Shop into thread for the loom.", {
				"Spin thread": _perform_activity.bind("spin"),
			})
		"fishing":
			_say("Cave fish gather in the quiet pools. Cook your catch at the oven.", {
				"Cast a line": _perform_activity.bind("fish"),
			})
		"tree":
			_tree_options()
		"windmill":
			_say("Grind grain from the Grocery Store into flour for the oven.", {
				"Grind grain": _perform_activity.bind("mill"),
			})
		"gate":
			_gate()
		"dungeon":
			_leave()


func _tree_options(message := "") -> void:
	var place: Dictionary = _landmarks[conversation_target]
	if place["id"] != "tree":
		return
	var key := Firewood.tree_key(town, place["cell"])
	var available := Firewood.status(world, key, int(Time.get_unix_time_from_system()))
	var description := "Tree · %d / %d firewood available." % [available["count"], Firewood.CAPACITY]
	var seconds := int(available["seconds_until_next"])
	if seconds > 0:
		@warning_ignore("integer_division")
		description += " Next piece in %dm %02ds." % [seconds / 60, seconds % 60]
	var held: Dictionary = catalogue.get(satchel.equipped, {})
	var choices := {}
	if satchel.equipped == "gathering_axe" and not Durability.usable_weapon(world, held).is_empty():
		if int(available["count"]) > 0:
			choices["Chop firewood"] = _chop_firewood
	else:
		description += " Equip an unbroken Gathering Axe to chop wood."
	_say(description if message.is_empty() else message + "\n" + description, choices)
	if seconds > 0:
		_tree_refresh.start(float(seconds))


func _refresh_tree_options() -> void:
	if conversation_target < 0 or _landmarks[conversation_target]["id"] != "tree":
		return
	if _map_movement_available():
		_tree_options()
	else:
		_tree_refresh.start(1.0)


func _chop_firewood() -> void:
	var active := Store.load_selected()
	if active.get("id") != profile["id"] or active["world"]["location"] != town:
		return
	if conversation_target < 0 or _landmarks[conversation_target]["id"] != "tree":
		return
	var place: Dictionary = _landmarks[conversation_target]
	if player.distance_squared_to(place["cell"]) > 1:
		return
	world = active["world"]
	var held: Dictionary = catalogue.get(satchel.equipped, {})
	if satchel.equipped != "gathering_axe" or Durability.usable_weapon(world, held).is_empty():
		_tree_options()
		return
	var result := Firewood.harvest(world, Firewood.tree_key(town, place["cell"]), int(Time.get_unix_time_from_system()))
	if result["changes"].is_empty():
		_tree_options(result["message"])
	elif _save(result["changes"]):
		_refresh()
		_tree_options(result["message"])


func _perform_activity(action: String) -> void:
	var weapon: Dictionary = catalogue.get(satchel.equipped, {})
	var maximum := int(Stats.snapshot(profile, weapon)["life"])
	var result := Activities.perform(action, world, maximum)
	if result["changes"].is_empty():
		_say(result["message"], {})
	elif _save(result["changes"]):
		_say(result["message"], {})
		_refresh()


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
		_say("Nera: Your first passage begins here. Look for Venn under the Blacksmith sign.", {})
		_refresh()


func _reward() -> void:
	if town != "spindle_hollow" or int(world["quest"]) != 2:
		return
	if _save({"quest": 3, "gold": int(world["gold"]) + 32}):
		_say("Oren: A promise kept. You receive 32 gold.", {})
		_refresh()


func _blacksmith_menu(message := "") -> void:
	if not _at_blacksmith():
		return
	var choices := {}
	if town == "lantern_rest":
		choices["Shop"] = _open_shop
	else:
		choices["Browse swords"] = _browse_swords
	if not world["starter_sword_claimed"] and not satchel.owns("ashen_arcblade"):
		choices["Claim starter sword"] = _starter
	choices["Claim Riveted Jack"] = _claim_armor
	choices["Repair equipment"] = _open_repairs
	var resident: String = _landmarks[conversation_target]["name"]
	var greeting := "%s · Need equipment or repairs?" % resident
	_say(greeting if message.is_empty() else message, choices)


func _at_blacksmith() -> bool:
	return conversation_target >= 0 and conversation_target < _landmarks.size() \
		and _landmarks[conversation_target]["id"] == "blacksmith" \
		and player.distance_squared_to(_points[conversation_target]) <= 1


func _starter() -> void:
	if not _at_blacksmith() or world["starter_sword_claimed"] or satchel.owns("ashen_arcblade"):
		return
	var error := satchel.take("ashen_arcblade", {"starter_sword_claimed": true}, true)
	if not error.is_empty():
		_blacksmith_menu(error)
		return
	_profile_updated(Store.load_selected())
	var resident: String = _landmarks[conversation_target]["name"]
	_blacksmith_menu("%s: Your starter sword is ready." % resident)


func _open_shop() -> void:
	if town != "lantern_rest" or not _at_blacksmith():
		return
	_layout.cancel_map_movement()
	_shop.open(Catalog.shop_categories(), _shop_rows(), int(world["gold"]))


func _shop_rows() -> Array:
	var rows := Catalog.shop_stock().values()
	for item: Dictionary in rows:
		if satchel.owns(item["id"]):
			item["available"] = false
			item["unavailable_reason"] = "You already own this equipment."
	return rows


func _purchase_shop_item(id: String) -> void:
	if not _shop.visible or town != "lantern_rest" or not _at_blacksmith():
		return
	var active := Store.load_selected()
	if active.get("id") != profile["id"] or active["world"]["location"] != town:
		_shop.set_status("Could not load your character.")
		return
	var item: Dictionary = Catalog.shop_stock().get(id, {})
	if item.is_empty():
		return
	var active_world: Dictionary = active["world"]
	var price := int(item["price"])
	if int(active_world["gold"]) < price:
		_shop.set_status("You need %d gold to buy this item." % price)
		return
	var changes := {"gold": int(active_world["gold"]) - price}
	var saved: Dictionary
	if item.has("stack_key"):
		var key: String = item["stack_key"]
		var supplies: Dictionary = active_world["shop_supplies"].duplicate()
		var total := int(supplies.get(key, 0)) + int(item["quantity"])
		if total > Store.MAX_EXPERIENCE:
			_shop.set_status("You cannot carry more of this supply.")
			return
		supplies[key] = total
		changes["shop_supplies"] = supplies
		saved = Store.update_world(changes)
	else:
		var error := satchel.take(id, changes)
		if not error.is_empty():
			_shop.set_status(error)
			return
		saved = Store.load_selected()
	if saved.is_empty():
		_shop.set_status("Could not save your purchase.")
		return
	_profile_updated(saved)
	_shop.refresh(int(world["gold"]), _shop_rows())
	_shop.set_status("Purchased %s." % item["name"])



func _browse_swords() -> void:
	_show_status()
	armory.open_rack("light" if town == "lantern_rest" else "heavy")


func _buy() -> void:
	if int(world["gold"]) < 8:
		_say("%s: You need 8 gold for a tonic." % _landmarks[conversation_target]["name"], {})
		return
	if _save({"gold": int(world["gold"]) - 8, "tonics": int(world["tonics"]) + 1}):
		var choices := {"Buy tonic · 8 gold": _buy} if int(world["gold"]) >= 8 else {}
		_say("%s: One Healing Tonic, packed for the journey." % _landmarks[conversation_target]["name"], choices)
		_refresh()


func _heal() -> void:
	if _save({"health": -1}):
		_say("%s: You wake fully healed. Travel carefully." % _landmarks[conversation_target]["name"], {})
		_refresh()


func _leave() -> void:
	var departure := {"location": "threshold", "dungeon_from": town, "map_position": {}}
	# Saves made before exits reset the dungeon can still contain an old run.
	if int(world["threshold_cleared"]) > 0 or not world["pending_loot"].is_empty():
		departure.merge(Store.threshold_reset(world))
	if town == "lantern_rest" and int(world["quest"]) == 0:
		departure["quest"] = 1
	if _save(departure):
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
	if _save({"location": destination, "map_position": {}}):
		_gate_arrival_id = str(profile["id"])
		if get_tree().change_scene_to_file("res://scenes/dungeon_town.tscn") != OK:
			_gate_arrival_id = ""
			_say("The destination could not open. Reload your character to resume there.", {})


func _characters() -> void:
	if _save_map_position():
		get_tree().change_scene_to_file("res://scenes/character.tscn")


func _save_map_position() -> bool:
	if profile.is_empty():
		return false
	if Store.save_map_position(profile["id"], town, player):
		return true
	_layout.log_label.text = "Could not save your position. Please try again."
	return false


func _exit_game() -> void:
	if _save_map_position():
		get_tree().quit()




func _claim_armor() -> void:
	if world["armor_owned"]:
		_say("You already own a Riveted Jack.", {})
	elif _save({"armor_owned": true}):
		_say("The Riveted Jack is equipped. Its armor protects you while it has durability.", {})
		_refresh()


func _owned_equipment() -> Array:
	var items: Array = []
	for id: String in catalogue:
		if satchel.owns(id):
			items.append(catalogue[id])
	if world["armor_owned"]:
		items.append(Durability.ARMOR)
	return items


func _open_repairs() -> void:
	_layout.cancel_map_movement()
	_repair.open(_owned_equipment(), world)


func _repair_options(item: Dictionary) -> void:
	var one := Durability.repair_cost(world, item, false)
	var full := Durability.repair_cost(world, item, true)
	_say("%s · %s · Gold %d" % [item["name"], Durability.condition_text(world, item), world["gold"]], {
		"Repair 1 point · %d gold" % one: _repair_item.bind(item, false),
		"Repair fully · %d gold" % full: _repair_item.bind(item, true),
		"Other equipment": _open_repairs,
	})


func _repair_item(item: Dictionary, full: bool) -> void:
	var changes := Durability.repair(world, item, full)
	if changes.is_empty():
		var message := "This equipment is already fully repaired."
		if Durability.current(world, item) < Durability.maximum(item):
			message = "You need more gold for this repair."
		_say(message, {"Other equipment": _open_repairs})
	elif _save(changes):
		_refresh()
		_repair_options(item)


func _open_journal(section: String, at_school := false) -> void:
	_studying_at_school = at_school and _at_school()
	var weapon: Dictionary = catalogue.get(satchel.equipped, {})
	var journal_section := "school" if _studying_at_school else section
	_journal.open(journal_section, profile, Stats.snapshot(profile, weapon), Skills.entries(profile, _studying_at_school) if section == "skills" else [])


func _at_school() -> bool:
	return conversation_target >= 0 and conversation_target < _landmarks.size() and _landmarks[conversation_target]["id"] == "school"


func _open_school_skills() -> void:
	if _at_school():
		_open_journal("skills", true)


func _advance_skill(skill_id: String) -> void:
	_apply_skill_result(Store.advance_skill(skill_id))


func _learn_skill(skill_id: String) -> void:
	if _studying_at_school and _at_school():
		_apply_skill_result(Store.learn_skill(skill_id))


func _study_skill(skill_id: String) -> void:
	if _studying_at_school and _at_school():
		_apply_skill_result(Store.study_skill(skill_id))


func _apply_skill_result(result: Dictionary) -> void:
	var saved: Dictionary = result.get("profile", {})
	if not saved.is_empty():
		profile = saved
		world = profile["world"]
		_refresh()
		_open_journal("skills", _studying_at_school)
	_journal.set_skill_status(str(result.get("message", "")))
