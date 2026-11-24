extends Control
## Shared layout for rooms explored on the tile grid.

signal command_requested(command: String)
signal profile_updated(profile: Dictionary)

const Style = preload("res://scripts/menu_style.gd")
const Stats = preload("res://scripts/character_stats.gd")
const Store = preload("res://scripts/character_store.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Inventory = preload("res://scripts/exploration_inventory.gd")
const Status = preload("res://scripts/exploration_status.gd")

const CONTENT_SIZE := Vector2(1120, 680)
const TONIC_HEAL := 30

var map_canvas: Control
var log_label: Label
var choices: HBoxContainer
var _subtitle: Label
var _context: Button
var _inventory: Inventory
var _status: Status
var _catalogue: Dictionary
var _satchel: Satchel
var _profile: Dictionary


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_CENTER)
	offset_left = -CONTENT_SIZE.x * 0.5
	offset_right = CONTENT_SIZE.x * 0.5
	offset_top = -CONTENT_SIZE.y * 0.5
	offset_bottom = CONTENT_SIZE.y * 0.5
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

	_subtitle = Style.label("", 14, Style.MUTED)
	_subtitle.position = Vector2(1, 53)
	_subtitle.size.x = CONTENT_SIZE.x - 2
	_subtitle.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	add_child(_subtitle)

	_inventory = Inventory.new()
	_inventory.name = "InventoryPanel"
	_inventory.position = Vector2(0, 82)
	_inventory.size = Vector2(226, 466)
	_inventory.equip_requested.connect(_equip)
	add_child(_inventory)

	_build_map_panel()
	_status = Status.new()
	_status.name = "ExplorationStatus"
	_status.position = Vector2(888, 82)
	_status.size = Vector2(232, 466)
	_status.slot_changed.connect(_assign_slot)
	_status.slot_used.connect(use_slot)
	add_child(_status)

	_build_message_log()
	_build_navigation()


func _build_map_panel() -> void:
	var frame := _panel(Vector2(240, 82), Vector2(634, 466), Style.BACK)
	var caption := Style.label("Local Map", 14, Style.TEAL)
	caption.position = Vector2(12, 12)
	frame.add_child(caption)
	_context = Style.button("")
	_context.focus_mode = Control.FOCUS_NONE
	_context.position = Vector2(360, 5)
	_context.size = Vector2(263, 34)
	_context.pressed.connect(command_requested.emit.bind("interact"))
	frame.add_child(_context)
	set_context("")

	map_canvas = Control.new()
	map_canvas.name = "WorldMap"
	map_canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_canvas.position = Vector2(6, 42)
	map_canvas.size = Vector2(622, 414)
	frame.add_child(map_canvas)


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


func configure(area: String, subtitle: String, dimensions: Vector2i, walkable: Dictionary, landmarks: Dictionary, catalogue: Dictionary, satchel: Satchel) -> void:
	_subtitle.text = subtitle
	_catalogue = catalogue
	_satchel = satchel
	_status.setup_map(area, dimensions, walkable, landmarks)


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


func focus_inventory() -> void:
	_inventory.focus_grid()


func inventory_has_focus() -> bool:
	var owner := get_viewport().gui_get_focus_owner()
	return owner != null and (owner == _inventory or _inventory.is_ancestor_of(owner))


func release_inventory_focus() -> bool:
	if not inventory_has_focus():
		return false
	get_viewport().gui_get_focus_owner().release_focus()
	return true


func map_arrow_direction(key: int) -> Vector2i:
	if inventory_has_focus() or _status.slot_menu_open():
		return Vector2i.ZERO
	match key:
		KEY_UP: return Vector2i.UP
		KEY_DOWN: return Vector2i.DOWN
		KEY_LEFT: return Vector2i.LEFT
		KEY_RIGHT: return Vector2i.RIGHT
		_: return Vector2i.ZERO


func _equip(id: String) -> void:
	var used_inventory_focus := release_inventory_focus()
	var error := _satchel.equip(id)
	if error.is_empty():
		log_label.text = "Equipped %s." % _catalogue[id]["name"]
		refresh(_profile)
		profile_updated.emit(_profile)
	else:
		log_label.text = error
	if used_inventory_focus:
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
	if int(world["tonics"]) <= 0:
		log_label.text = "You have no Healing Tonics."
		return
	var weapon: Dictionary = _catalogue.get(_satchel.equipped, {})
	var maximum := int(Stats.snapshot(active_profile, weapon)["life"])
	var health := int(world["health"])
	if health < 0 or health >= maximum:
		log_label.text = "Life is already full."
		return
	var restored := mini(TONIC_HEAL, maximum - health)
	_save_world({"health": health + restored, "tonics": int(world["tonics"]) - 1}, "Healing Tonic restored %d Life." % restored)


func _save_world(changes: Dictionary, message: String) -> void:
	var saved := Store.update_world(changes)
	if saved.is_empty():
		log_label.text = "Could not save your changes."
		return
	refresh(saved)
	profile_updated.emit(saved)
	log_label.text = message
