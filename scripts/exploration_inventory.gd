extends Control

signal equip_requested(id: String)
signal close_requested

const Style = preload("res://scripts/menu_style.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Durability = preload("res://scripts/equipment_durability.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const CELL := 38
const GRID_ORIGIN := Vector2(300, 132)
const EQUIPMENT_SLOTS := [
	"Main hand", "Off hand", "Accessory 1", "Accessory 2",
	"Armor", "Headgear", "Gloves", "Shoes"
]

var _catalogue: Dictionary = {}
var _satchel: Satchel
var _selected := ""
var _items: Array[Button] = []
var _gear: Button
var _main_hand: TextureRect
var _main_hand_empty: Label
var _armor: Control
var _armor_state: Label
var _offhand: Label
var _selection: Label
var _gold: Label
var _tonics: Label
var _materials: Label
var _grid: Control
var _rendered_placements: Dictionary = {}
var _body: Control
var _status: Label


func _ready() -> void:
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hide()
	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_body = Control.new()
	add_child(_body)
	_body.set_anchors_preset(Control.PRESET_CENTER)
	_body.offset_left = -330
	_body.offset_top = -285
	_body.offset_right = 330
	_body.offset_bottom = 285
	var frame := Style.panel(_body, Style.SURFACE)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_add_label("Inventory", Vector2(24, 20), 30, Style.TEXT)
	var back := Style.button("Back")
	back.position = Vector2(528, 19)
	back.size = Vector2(108, 38)
	back.pressed.connect(func() -> void: close_requested.emit())
	_body.add_child(back)
	_add_label("Equipment", Vector2(24, 94), 16, Style.TEAL)
	_build_equipment()
	_add_label("Basic bag", Vector2(300, 94), 16, Style.TEAL)
	_grid = Control.new()
	_grid.position = GRID_ORIGIN
	_grid.size = Vector2(Satchel.WIDTH, Satchel.HEIGHT) * CELL
	_body.add_child(_grid)
	_build_cells()
	_selection = _add_label("Select a sword", Vector2(24, 428), 16, Style.TEXT)
	_selection.size.x = 612
	_selection.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_add_label("Drag a sword to Main hand", Vector2(24, 463), 14, Style.MUTED)
	_materials = _add_label("", Vector2(24, 286), 12, Style.TEXT)
	_materials.size = Vector2(252, 72)
	_materials.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_gold = _add_label("", Vector2(24, 375), 14, Style.ACCENT)
	_gold.size.x = 240
	_tonics = _add_label("", Vector2(300, 411), 14, Style.TEXT)
	_status = _add_label("", Vector2(24, 505), 14, Style.TEXT)
	_status.size = Vector2(612, 42)
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART


func set_status(message: String) -> void:
	_status.text = message


func _build_equipment() -> void:
	var equipment := GridContainer.new()
	equipment.columns = 2
	equipment.position = Vector2(24, 132)
	equipment.add_theme_constant_override("h_separation", 4)
	equipment.add_theme_constant_override("v_separation", 4)
	_body.add_child(equipment)
	for caption: String in EQUIPMENT_SLOTS:
		var slot: Control
		if caption == "Main hand":
			_gear = Style.button("")
			_gear.custom_minimum_size = Vector2.ZERO
			_gear.pressed.connect(_inspect_main_hand)
			_gear.set_drag_forwarding(Callable(), _can_drop_sword, _drop_sword)
			slot = _gear
		else:
			var frame := Panel.new()
			frame.add_theme_stylebox_override("panel", Style.box(Style.BACK, Style.BORDER))
			frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
			slot = frame
		slot.custom_minimum_size = Vector2(94, 28)
		slot.name = caption.replace(" ", "")
		equipment.add_child(slot)

		var label := Style.label(caption, 11, Style.TEXT)
		label.position = Vector2(6, 5)
		slot.add_child(label)
		var state := Style.label("—", 11, Style.MUTED)
		state.position = Vector2(75, 5)
		slot.add_child(state)
		match caption:
			"Main hand":
				_main_hand_empty = state
				_main_hand = TextureRect.new()
				_main_hand.position = Vector2(73, 2)
				_main_hand.size = Vector2(16, 24)
				_main_hand.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
				_main_hand.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
				_main_hand.mouse_filter = Control.MOUSE_FILTER_IGNORE
				slot.add_child(_main_hand)
			"Off hand":
				_offhand = state
			"Armor":
				_armor = slot
				_armor.mouse_filter = Control.MOUSE_FILTER_STOP
				_armor_state = state


func _inspect_main_hand() -> void:
	if _satchel != null and not str(_satchel.equipped).is_empty():
		_select(str(_satchel.equipped))


func _add_label(text_value: String, at: Vector2, font_size: int, color: Color) -> Label:
	var label := Style.label(text_value, font_size, color)
	label.position = at
	_body.add_child(label)
	return label


func refresh(catalogue: Dictionary, satchel: Satchel, world: Dictionary) -> void:
	_catalogue = catalogue
	_satchel = satchel
	if not is_node_ready():
		return
	var placements := satchel.placements
	if _rendered_placements != placements:
		_rendered_placements = placements
		_render_items()
	var held: String = satchel.equipped
	var armed := catalogue.has(held)
	_main_hand.texture = Catalog.icon(catalogue[held]) if armed else null
	_main_hand_empty.visible = not armed
	_gear.tooltip_text = Catalog.tooltip(catalogue[held]) + "\n" + Durability.condition_text(world, catalogue[held], true) if armed else "Main hand is empty"
	for button in _items:
		var id := button.name.trim_prefix("Item_")
		button.tooltip_text = Catalog.tooltip(catalogue[id]) + "\n" + Durability.condition_text(world, catalogue[id], true) + "\n\nDrag to Main hand or press Enter"
	var armored: bool = world.get("armor_owned", false)
	var armor_defense := Durability.armor_defense(world)
	_armor_state.text = ("!" if armor_defense == 0 else "+") if armored else "—"
	_armor.tooltip_text = "%s\n%s\nDefense +%d" % [Durability.ARMOR["name"], Durability.condition_text(world, Durability.ARMOR), armor_defense] if armored else "Armor is empty"
	var two_handed := armed and int(catalogue[held]["hands"]) == 2
	_offhand.text = "2H" if two_handed else "—"
	_offhand.tooltip_text = "Occupied by a two-handed weapon" if two_handed else "Off hand is empty"
	var materials: Dictionary = world.get("town_materials", {})
	var entries: Array[String] = []
	for key: String in ["fish", "grain", "flour", "fiber", "thread", "cloth"]:
		var count := int(materials.get(key, 0))
		if count > 0:
			entries.append("%s ×%d" % [key.capitalize(), count])
	var rows: Array[String] = []
	for index in range(0, entries.size(), 2):
		rows.append("  ·  ".join(entries.slice(index, index + 2)))
	_materials.text = "\n".join(rows)
	_materials.tooltip_text = "\n".join(entries)
	_materials.visible = not entries.is_empty()
	_gold.text = "Gold %s" % str(world.get("gold", 0))
	_gold.tooltip_text = _gold.text
	_tonics.text = "Healing Tonic ×%s" % str(world.get("tonics", 0))
	_tonics.size.x = 304
	_tonics.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_tonics.tooltip_text = _tonics.text
	if not satchel.owns(_selected):
		_selected = ""
	_update_selection()


func _build_cells() -> void:
	for y in range(Satchel.HEIGHT):
		for x in range(Satchel.WIDTH):
			var cell := Panel.new()
			cell.position = Vector2(x, y) * CELL
			cell.size = Vector2(CELL - 1, CELL - 1)
			cell.add_theme_stylebox_override("panel", Style.box(Style.BACK, Style.BORDER))
			cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
			_grid.add_child(cell)


func _render_items() -> void:
	for button in _items:
		_grid.remove_child(button)
		button.queue_free()
	_items.clear()
	for id: String in _rendered_placements:
		var item: Dictionary = _catalogue[id]
		var anchor: Vector2i = _rendered_placements[id]
		var button := Style.button("")
		button.name = "Item_" + id
		button.position = Vector2(anchor) * CELL
		button.size = Vector2(int(item["width"]), int(item["height"])) * CELL - Vector2.ONE
		button.custom_minimum_size = Vector2.ZERO
		button.tooltip_text = Catalog.tooltip(item) + "\n\nDrag to Main hand or press Enter"
		button.set_drag_forwarding(_get_sword_drag_data.bind(button, id), Callable(), Callable())
		button.gui_input.connect(_equip_with_keyboard.bind(button, id))
		button.pressed.connect(_select.bind(id))
		button.focus_entered.connect(_select.bind(id))
		_grid.add_child(button)
		var icon := TextureRect.new()
		icon.texture = Catalog.icon(item)
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(icon)
		icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_items.append(button)


func _get_sword_drag_data(_position: Vector2, button: Button, id: String) -> Dictionary:
	var preview := TextureRect.new()
	preview.texture = Catalog.icon(_catalogue[id])
	preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	button.set_drag_preview(preview)
	return {"sword_id": id}


func _can_drop_sword(_position: Vector2, data: Variant) -> bool:
	return data is Dictionary and data.get("sword_id") is String and _rendered_placements.has(data["sword_id"])


func _drop_sword(_position: Vector2, data: Dictionary) -> void:
	equip_requested.emit(data["sword_id"])


func _equip_with_keyboard(event: InputEvent, button: Button, id: String) -> void:
	if not event is InputEventMouse and event.is_action_pressed(&"ui_accept"):
		button.accept_event()
		equip_requested.emit(id)


func _select(id: String) -> void:
	_selected = id
	_update_selection()


func _update_selection() -> void:
	_selection.text = str(_catalogue[_selected]["name"]) if _catalogue.has(_selected) else "Select a sword"


func focus_grid() -> void:
	if not _items.is_empty():
		_items[0].grab_focus()
	else:
		_gear.grab_focus()
