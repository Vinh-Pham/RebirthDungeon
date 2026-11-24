extends Control
## Shared layout for rooms explored on the tile grid.

signal command_requested(command: String)
signal profile_updated(profile: Dictionary)

const Style = preload("res://scripts/menu_style.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Store = preload("res://scripts/character_store.gd")
const Consumables = preload("res://scripts/consumables.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const InventoryPanel = preload("res://scripts/exploration_inventory.gd")
const Status = preload("res://scripts/exploration_status.gd")

const CONTENT_SIZE := Vector2(1120, 680)
const MAP_PANEL_SIZE := Vector2(874, 548)
const MAP_STEP_SECONDS := 0.08

var map_canvas: Control
var log_label: Label
var choices: HBoxContainer
var _context: Button
var _inventory: InventoryPanel
var _status: Status
var _catalogue: Dictionary
var _satchel: Satchel
var _profile: Dictionary
var _map_grid: AStarGrid2D
var _map_origin: Vector2
var _map_tile_size: Vector2
var _can_move_on_map: Callable
var _move_map_step: Callable
var _map_input_to_world: Callable
var _map_route: Array[Vector2i] = []
var _map_step_delay := 0.0


func _ready() -> void:
	set_process(false)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_CENTER)
	offset_left = -CONTENT_SIZE.x * 0.5
	offset_right = CONTENT_SIZE.x * 0.5
	offset_top = -CONTENT_SIZE.y * 0.5
	offset_bottom = CONTENT_SIZE.y * 0.5
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

	_build_map_panel()
	_status = Status.new()
	_status.name = "ExplorationStatus"
	_status.position = Vector2(MAP_PANEL_SIZE.x + 14, 0)
	_status.size = Vector2(232, MAP_PANEL_SIZE.y)
	_status.slot_changed.connect(_assign_slot)
	_status.slot_used.connect(use_slot)
	add_child(_status)

	_build_message_log()
	_build_navigation()

	_inventory = InventoryPanel.new()
	_inventory.name = "InventoryPanel"
	_inventory.equip_requested.connect(_equip)
	_inventory.close_requested.connect(close_inventory)
	add_child(_inventory)


func _build_map_panel() -> void:
	var frame := _panel(Vector2.ZERO, MAP_PANEL_SIZE, Style.BACK)
	map_canvas = Control.new()
	map_canvas.name = "WorldMap"
	map_canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_canvas.position = Vector2(6, 6)
	map_canvas.size = MAP_PANEL_SIZE - Vector2(12, 12)
	frame.add_child(map_canvas)
	map_canvas.gui_input.connect(_on_map_input)

	_context = Style.button("")
	_context.focus_mode = Control.FOCUS_NONE
	_context.size = Vector2(263, 34)
	_context.position = Vector2(MAP_PANEL_SIZE.x - _context.size.x - 11, 10)
	_context.pressed.connect(command_requested.emit.bind("interact"))
	frame.add_child(_context)
	set_context("")


func _build_message_log() -> void:
	var panel := _panel(Vector2(0, 554), Vector2(CONTENT_SIZE.x, 75), Style.SURFACE)
	var column := VBoxContainer.new()
	column.position = Vector2(12, 7)
	column.size = Vector2(CONTENT_SIZE.x - 24, 61)
	column.add_theme_constant_override("separation", 2)
	panel.add_child(column)
	log_label = Style.label("", 14, Style.TEXT, true)
	log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(log_label)
	choices = HBoxContainer.new()
	choices.add_theme_constant_override("separation", 8)
	column.add_child(choices)


func _build_navigation() -> void:
	var row := HBoxContainer.new()
	row.position = Vector2(0, 638)
	row.size = Vector2(CONTENT_SIZE.x, 42)
	row.add_theme_constant_override("separation", 8)
	add_child(row)
	for entry in [
		["Character (C)", "character"], ["Skills (Z)", "skills"], ["Inventory (I)", "inventory"],
		["Talent (T)", "talent"], ["Quests (Q)", "quests"]
	]:
		var button := Style.button(entry[0])
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(command_requested.emit.bind(entry[1]))
		row.add_child(button)


func _panel(origin: Vector2, extent: Vector2, color: Color) -> Panel:
	var panel := Panel.new()
	panel.position = origin
	panel.size = extent
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", Style.box(color, Style.BORDER))
	add_child(panel)
	return panel


func configure(area: String, dimensions: Vector2i, walkable: Dictionary, landmarks: Dictionary, catalogue: Dictionary, satchel: Satchel) -> void:
	_catalogue = catalogue
	_satchel = satchel
	_status.setup_map(area, dimensions, walkable, landmarks)


func configure_click_movement(origin: Vector2, tile_size: Vector2, blocked: Array, can_move: Callable, move_step: Callable, input_to_world := Callable()) -> void:
	cancel_map_movement()
	_map_origin = origin
	_map_tile_size = tile_size
	_can_move_on_map = can_move
	_move_map_step = move_step
	_map_input_to_world = input_to_world
	_map_grid = AStarGrid2D.new()
	_map_grid.region = Rect2i(Vector2i.ZERO, _status.dimensions)
	_map_grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	_map_grid.default_estimate_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	_map_grid.update()
	for y in _status.dimensions.y:
		for x in _status.dimensions.x:
			var cell := Vector2i(x, y)
			if not _status.walkable.has(cell) or blocked.has(cell):
				_map_grid.set_point_solid(cell)
	map_canvas.mouse_filter = Control.MOUSE_FILTER_STOP


func cancel_map_movement() -> void:
	_map_route.clear()
	set_process(false)


func _on_map_input(event: InputEvent) -> void:
	if not event is InputEventMouseButton or event.button_index != MOUSE_BUTTON_LEFT or not event.pressed:
		return
	cancel_map_movement()
	if inventory_is_open() or not _can_move_on_map.call() or _status.slot_menu_open():
		return
	var world_position: Vector2 = event.position
	if _map_input_to_world.is_valid():
		world_position = _map_input_to_world.call(world_position)
	var target := Vector2i(((world_position - _map_origin) / _map_tile_size).floor())
	if target == _status.player or not _map_grid.is_in_boundsv(target) or _map_grid.is_point_solid(target):
		return
	_map_route = _map_grid.get_id_path(_status.player, target)
	if _map_route.is_empty():
		return
	_map_route.pop_front() # The path starts at the player's current tile.
	_map_step_delay = MAP_STEP_SECONDS
	set_process(true)
	_follow_map_route()


func _process(delta: float) -> void:
	if _map_route.is_empty():
		return
	_map_step_delay -= delta
	if _map_step_delay <= 0.0:
		_map_step_delay = MAP_STEP_SECONDS
		_follow_map_route()


func _follow_map_route() -> void:
	if inventory_is_open() or not _can_move_on_map.call() or _status.slot_menu_open():
		cancel_map_movement()
		return
	var next_cell: Vector2i = _map_route.pop_front()
	_move_map_step.call(next_cell - _status.player)
	if _status.player != next_cell or _map_route.is_empty():
		cancel_map_movement()


func refresh(profile: Dictionary) -> void:
	_profile = profile
	var weapon: Dictionary = _catalogue.get(_satchel.equipped, {})
	var world: Dictionary = profile["world"]
	_inventory.refresh(_catalogue, _satchel, world)
	_status.refresh(Stats.snapshot(profile, weapon), world)


func set_player(cell: Vector2i) -> void:
	_status.set_player(cell)
	map_canvas.queue_redraw()


func set_context(label: String) -> void:
	_context.visible = not label.is_empty()
	_context.text = label + " [E]"


func open_inventory() -> void:
	cancel_map_movement()
	_inventory.set_status("")
	_inventory.show()
	_inventory.focus_grid()


func close_inventory() -> void:
	_inventory.hide()


func inventory_is_open() -> bool:
	return _inventory.visible


func _input(event: InputEvent) -> void:
	if not inventory_is_open() or not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode in [KEY_I, KEY_ESCAPE]:
		close_inventory()
		get_viewport().set_input_as_handled()


func map_arrow_direction(key: int) -> Vector2i:
	if inventory_is_open() or _status.slot_menu_open():
		return Vector2i.ZERO
	match key:
		KEY_UP: return Vector2i.UP
		KEY_DOWN: return Vector2i.DOWN
		KEY_LEFT: return Vector2i.LEFT
		KEY_RIGHT: return Vector2i.RIGHT
		_: return Vector2i.ZERO


func _equip(id: String) -> void:
	var error := _satchel.equip(id)
	var message := error
	if error.is_empty():
		message = "Equipped %s." % _catalogue[id]["name"]
		refresh(_profile)
		profile_updated.emit(_profile)
	log_label.text = message
	_inventory.set_status(message)
	if inventory_is_open():
		_inventory.focus_grid()


func _assign_slot(index: int, item_id: String) -> void:
	var active_profile := Store.load_selected()
	if active_profile.is_empty():
		return
	var assigned: Array = active_profile["world"]["quick_slots"].duplicate()
	if index < 0 or index >= assigned.size() or item_id not in ["tonic", ""]:
		return
	assigned[index] = item_id
	var message := "Cleared quick slot %d." % (index + 1) if item_id.is_empty() else "Assigned Healing Tonic to slot %d." % (index + 1)
	_save_world({"quick_slots": assigned}, message)


func use_slot(index: int) -> void:
	var active_profile := Store.load_selected()
	if active_profile.is_empty():
		return
	var world: Dictionary = active_profile["world"]
	var assigned: Array = world["quick_slots"]
	if index < 0 or index >= assigned.size() or assigned[index] != "tonic":
		log_label.text = "Quick slot %d is empty. Click a slot to assign a tonic." % (index + 1)
		return
	var weapon: Dictionary = _catalogue.get(_satchel.equipped, {})
	var maximum := int(Stats.snapshot(active_profile, weapon)["life"])
	var result := Consumables.use_item(assigned[index], world, int(world["health"]), maximum)
	if result["changes"].is_empty():
		log_label.text = result["message"]
		return
	_save_world(result["changes"], result["message"])


func _save_world(changes: Dictionary, message: String) -> void:
	var saved := Store.update_world(changes)
	if saved.is_empty():
		log_label.text = "Could not save your changes."
		return
	refresh(saved)
	profile_updated.emit(saved)
	log_label.text = message
