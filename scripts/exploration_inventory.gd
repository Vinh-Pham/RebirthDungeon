extends Control

signal equip_requested(id: String)

const Style = preload("res://scripts/menu_style.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const CELL := 24
const GRID_ORIGIN := Vector2(17, 205)
const EQUIPMENT_SLOTS := [
	"Main hand", "Off hand", "Accessory 1", "Accessory 2",
	"Armor", "Headgear", "Gloves", "Shoes"
]

var _catalogue: Dictionary = {}
var _satchel: Variant
var _selected := ""
var _items: Array[Button] = []
var _gear: Button
var _main_hand: TextureRect
var _main_hand_empty: Label
var _offhand: Label
var _selection: Label
var _equip: Button
var _gold: Label
var _tonics: Label
var _grid: Control
var _rendered_placements: Dictionary = {}


func _ready() -> void:
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	custom_minimum_size = Vector2(226, 465)
	var frame := Style.panel(self, Style.SURFACE)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_add_label("Inventory", Vector2(14, 10), 19, Style.TEAL)
	_add_label("Equipment", Vector2(17, 39), 12, Style.MUTED)
	_build_equipment()
	_add_label("Basic bag", Vector2(17, 186), 13, Style.TEXT)
	_grid = Control.new()
	_grid.position = GRID_ORIGIN
	_grid.size = Vector2(192, 168)
	add_child(_grid)
	_build_cells()
	_selection = _add_label("Select a sword", Vector2(17, 378), 12, Style.TEXT)
	_selection.size.x = 192
	_selection.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_equip = Style.button("Equip")
	_equip.position = Vector2(17, 399)
	_equip.size = Vector2(192, 31)
	_equip.custom_minimum_size.y = 31
	_equip.pressed.connect(func() -> void:
		if not _selected.is_empty():
			equip_requested.emit(_selected))
	add_child(_equip)
	_gold = _add_label("", Vector2(17, 439), 12, Style.ACCENT)
	_gold.size.x = 70
	_gold.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_tonics = _add_label("", Vector2(91, 439), 12, Style.TEXT)


func _build_equipment() -> void:
	var equipment := GridContainer.new()
	equipment.columns = 2
	equipment.position = Vector2(17, 56)
	equipment.add_theme_constant_override("h_separation", 4)
	equipment.add_theme_constant_override("v_separation", 4)
	add_child(equipment)
	for caption: String in EQUIPMENT_SLOTS:
		var slot: Control
		if caption == "Main hand":
			_gear = Style.button("")
			_gear.custom_minimum_size = Vector2.ZERO
			_gear.pressed.connect(_inspect_main_hand)
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


func _inspect_main_hand() -> void:
	if _satchel != null and not str(_satchel.equipped).is_empty():
		_select(str(_satchel.equipped))


func _add_label(text_value: String, at: Vector2, font_size: int, color: Color) -> Label:
	var label := Style.label(text_value, font_size, color)
	label.position = at
	add_child(label)
	return label


func refresh(catalogue: Dictionary, satchel: Variant, world: Dictionary) -> void:
	_catalogue = catalogue
	_satchel = satchel
	if not is_node_ready():
		return
	if _rendered_placements != satchel.placements:
		_rendered_placements = satchel.placements.duplicate()
		_render_items()
	var held: String = satchel.equipped
	var armed := catalogue.has(held)
	_main_hand.texture = Catalog.icon(catalogue[held]) if armed else null
	_main_hand_empty.visible = not armed
	_gear.tooltip_text = str(catalogue[held]["name"]) if armed else "Main hand is empty"
	var two_handed := armed and int(catalogue[held]["hands"]) == 2
	_offhand.text = "2H" if two_handed else "—"
	_offhand.tooltip_text = "Occupied by a two-handed weapon" if two_handed else "Off hand is empty"
	_gold.text = "Gold %s" % str(world.get("gold", 0))
	_gold.tooltip_text = _gold.text
	_tonics.text = "Healing Tonic ×%s" % str(world.get("tonics", 0))
	_tonics.size.x = 118
	_tonics.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_tonics.tooltip_text = _tonics.text
	if not satchel.owns(_selected):
		_selected = ""
	_update_selection()


func _build_cells() -> void:
	for y in range(7):
		for x in range(8):
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
	for id: String in _satchel.placements:
		var item: Dictionary = _catalogue[id]
		var anchor: Vector2i = _satchel.placements[id]
		var button := Style.button("")
		button.name = "Item_" + id
		button.position = Vector2(anchor) * CELL
		button.size = Vector2(int(item["width"]), int(item["height"])) * CELL - Vector2.ONE
		button.custom_minimum_size = Vector2.ZERO
		button.tooltip_text = "%s\n%d–%d damage\nEnter to select" % [item["name"], item["damage_min"], item["damage_max"]]
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


func _select(id: String) -> void:
	_selected = id
	_update_selection()


func _update_selection() -> void:
	_selection.text = str(_catalogue[_selected]["name"]) if _catalogue.has(_selected) else "Select a sword"
	_equip.disabled = _selected.is_empty() or _selected == str(_satchel.equipped)
	_equip.text = "Equipped" if _selected == str(_satchel.equipped) and not _selected.is_empty() else "Equip"


func focus_grid() -> void:
	if not _items.is_empty():
		_items[0].grab_focus()
	else:
		_gear.grab_focus()
