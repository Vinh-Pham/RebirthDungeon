extends Control

signal equip_requested(id: String)
signal slot_equip_requested(id: String, slot: String)
signal close_requested
signal item_move_requested(from: Vector2i, to: Vector2i)

const Style = preload("res://scripts/menu_style.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Durability = preload("res://scripts/equipment_durability.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Gold = preload("res://scripts/gold.gd")
const COBWEB_ICON = preload("res://assets/art/cobweb.png")
const GOLD_ICONS := {
	"gold": preload("res://assets/art/gold.png"),
	"gold_pouch_small": preload("res://assets/art/gold_pouch_small.png"),
	"gold_pouch_large": preload("res://assets/art/gold_pouch_large.png"),
}
const CELL := 38
const GRID_ORIGIN := Vector2(300, 132)
const EQUIPMENT_SLOTS := [
	"Main hand", "Off hand", "Accessory 1", "Accessory 2",
	"Armor", "Headgear", "Gloves", "Shoes"
]

var _slots: Dictionary = {}
var _slot_states: Dictionary = {}
var _catalogue: Dictionary = {}
var _satchel: Satchel
var _selected := ""
var _items: Array[Button] = []
var _gear: Button
var _slot_icons: Dictionary = {}
var _armor: Control
var _armor_state: Label
var _offhand: Label
var _selection: Label
var _gold: Label
var _tonics: Label
var _materials: Label
var _grid: Control
var _drop_ghost: Panel
var _ghost_icon: TextureRect
var _ghost_glyph: Label
var _cursor_preview: Control
var _rendered_placements: Dictionary = {}
var _rendered_cobwebs: Dictionary = {}
var _cobweb_items: Array[Button] = []
var _rendered_gold: Array[Dictionary] = []
var _gold_items: Array[Button] = []
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
	_build_drop_ghost()
	set_process_input(false)
	visibility_changed.connect(_clear_drag_ghost)
	get_window().mouse_exited.connect(_set_drop_ghost_visible.bind(false))
	_grid.set_drag_forwarding(Callable(), _can_drop_bag.bind(_grid), _drop_bag.bind(_grid))
	_selection = _add_label("Select equipment", Vector2(24, 428), 16, Style.TEXT)
	_selection.size.x = 612
	_selection.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_add_label("Drag items to move them. Drop gear on a matching slot.", Vector2(24, 463), 14, Style.MUTED)
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
			slot = _gear
		else:
			slot = Style.button("")
		slot.custom_minimum_size = Vector2(94, 28)
		var slot_id := caption.to_lower().replace(" ", "_")
		_slots[slot_id] = slot
		slot.set_drag_forwarding(Callable(), _can_drop_equipment.bind(slot_id), _drop_equipment.bind(slot_id))
		slot.name = caption.replace(" ", "")
		equipment.add_child(slot)

		var label := Style.label(caption, 11, Style.TEXT)
		label.position = Vector2(6, 5)
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(label)
		var state := Style.label("—", 11, Style.MUTED)
		state.position = Vector2(75, 5)
		state.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_slot_states[slot_id] = state
		slot.add_child(state)
		var slot_icon := TextureRect.new()
		slot_icon.position = Vector2(73, 2)
		slot_icon.size = Vector2(16, 24)
		slot_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		slot_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		slot_icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		slot_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(slot_icon)
		_slot_icons[slot_id] = slot_icon
		match caption:
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
	var materials: Dictionary = world.get("town_materials", {})
	var overflow: Dictionary = satchel.sync_stacks(world)
	var stacks := satchel.cobweb_stacks
	if _rendered_cobwebs != stacks:
		_rendered_cobwebs = stacks
		_render_cobwebs()
	var gold_items: Array[Dictionary] = satchel.gold_items
	if _rendered_gold != gold_items:
		_rendered_gold = gold_items
		_render_gold()
	var held: String = satchel.equipped
	var armed := catalogue.has(held)
	for button in _items:
		var id := button.name.trim_prefix("Item_")
		var item: Dictionary = catalogue[id]
		var slot: String = item.get("slot", "main_hand")
		button.tooltip_text = Catalog.tooltip(item) + "\n" + Durability.condition_text(world, item, true)
		button.tooltip_text += "\n\nDrag to %s or press Enter" % slot.replace("_", " ").capitalize()
	var armor_id: String = satchel.equipped_in("armor")
	var armored: bool = world.get("armor_owned", false) or not armor_id.is_empty()
	var armor_defense := Durability.armor_defense(world)
	_armor_state.text = ("!" if armor_defense == 0 else "+") if armored else "—"
	_armor.tooltip_text = "%s\n%s\nDefense +%d" % [Durability.ARMOR["name"], Durability.condition_text(world, Durability.ARMOR), armor_defense] if armored else "Armor is empty"
	var two_handed := armed and int(catalogue[held]["hands"]) == 2
	_offhand.text = "2H" if two_handed else "—"
	_offhand.tooltip_text = "Occupied by a two-handed weapon" if two_handed else "Off hand is empty"
	for slot_id: String in _slots:
		var equipped_id: String = satchel.equipped_in(slot_id)
		var slot_icon: TextureRect = _slot_icons[slot_id]
		slot_icon.texture = null
		_slot_states[slot_id].show()
		if catalogue.has(equipped_id):
			var item: Dictionary = catalogue[equipped_id]
			_slots[slot_id].tooltip_text = Catalog.tooltip(item) + "\n" + Durability.condition_text(world, item, true)
			_slot_states[slot_id].text = item.get("glyph", "+")
			slot_icon.texture = Catalog.icon(item)
			_slot_states[slot_id].visible = slot_icon.texture == null
		elif slot_id not in ["armor", "off_hand"]:
			_slot_states[slot_id].text = "—"
			_slots[slot_id].tooltip_text = slot_id.replace("_", " ").capitalize() + " is empty"
	var entries: Array[String] = []
	if int(overflow.get("cobweb", 0)) > 0:
		entries.append("Cobweb ×%d awaiting bag space" % int(overflow["cobweb"]))
	for key: String in ["firewood", "fish", "grain", "flour", "fiber", "thread", "cloth"]:
		var count := int(materials.get(key, 0))
		if count > 0:
			entries.append("%s ×%d" % [key.capitalize(), count])
	for key: String in world.get("shop_supplies", {}):
		var count := int(world["shop_supplies"][key])
		if count > 0:
			entries.append("%s ×%d" % [key.replace("_", " ").capitalize(), count])
	var rows: Array[String] = []
	for index in range(0, entries.size(), 2):
		rows.append("  ·  ".join(entries.slice(index, index + 2)))
	_materials.text = "\n".join(rows)
	_materials.tooltip_text = "\n".join(entries)
	_materials.visible = not entries.is_empty()
	_gold.visible = int(overflow.get("gold", 0)) > 0
	_gold.text = "%s awaiting bag space" % Gold.format_amount(int(overflow.get("gold", 0)))
	_gold.tooltip_text = "%d gold preserved from your existing save. Deposit at the bank or make room in your bag." % int(overflow.get("gold", 0))
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


func _build_drop_ghost() -> void:
	_drop_ghost = Panel.new()
	_drop_ghost.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_drop_ghost.z_index = 1
	_drop_ghost.add_theme_stylebox_override("panel", Style.box(Color(Style.PANEL, 0.4), Color(Style.TEAL, 0.75)))
	_drop_ghost.hide()
	_grid.add_child(_drop_ghost)

	_ghost_icon = TextureRect.new()
	_ghost_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_ghost_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_ghost_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ghost_icon.modulate.a = 0.58
	_drop_ghost.add_child(_ghost_icon)
	_ghost_icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_ghost_glyph = Style.label("", 16, Color(Style.TEXT, 0.58))
	_ghost_glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_ghost_glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_ghost_glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_drop_ghost.add_child(_ghost_glyph)
	_ghost_glyph.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _input(event: InputEvent) -> void:
	# The drop callback shows the ghost again if the GUI finds a valid target.
	if event is InputEventMouseMotion:
		_set_drop_ghost_visible(false)


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END and is_instance_valid(_drop_ghost):
		_clear_drag_ghost()


func _set_drop_ghost_visible(show_ghost: bool) -> void:
	_drop_ghost.visible = show_ghost
	if is_instance_valid(_cursor_preview):
		_cursor_preview.visible = not show_ghost


func _clear_drag_ghost() -> void:
	_set_drop_ghost_visible(false)
	_cursor_preview = null
	set_process_input(false)


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
		if Catalog.icon(item) == null:
			button.text = item.get("glyph", item["name"].left(2))
		button.position = Vector2(anchor) * CELL
		button.size = Vector2(int(item["width"]), int(item["height"])) * CELL - Vector2.ONE
		button.custom_minimum_size = Vector2.ZERO
		button.set_drag_forwarding(_get_sword_drag_data.bind(button, id), _can_drop_bag.bind(button), _drop_bag.bind(button))
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


func _render_cobwebs() -> void:
	for button in _cobweb_items:
		_grid.remove_child(button)
		button.queue_free()
	_cobweb_items.clear()
	for cell: Vector2i in _rendered_cobwebs:
		var count: int = _rendered_cobwebs[cell]
		var button := Style.button("")
		button.name = "Cobweb_%d_%d" % [cell.x, cell.y]
		button.custom_minimum_size = Vector2.ZERO
		button.position = Vector2(cell) * CELL
		button.size = Vector2.ONE * (CELL - 1)
		button.tooltip_text = "Cobweb ×%d\nFine silk gathered from spiders." % count
		_grid.add_child(button)
		_cobweb_items.append(button)
		button.set_drag_forwarding(_get_stack_drag_data.bind(button), _can_drop_bag.bind(button), _drop_bag.bind(button))

		var icon := TextureRect.new()
		icon.texture = COBWEB_ICON
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(icon)
		icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		icon.offset_bottom = -6

		var quantity := Style.label("×%d" % count, 11)
		quantity.name = "Count"
		quantity.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		quantity.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
		quantity.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(quantity)
		quantity.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		quantity.offset_right = -3
		quantity.offset_bottom = -2


func _render_gold() -> void:
	for button in _gold_items:
		_grid.remove_child(button)
		button.queue_free()
	_gold_items.clear()
	for item: Dictionary in _rendered_gold:
		var cell: Vector2i = item["cell"]
		var id: String = item["id"]
		var pouch := id != "gold"
		var count: int = item["count"]
		var button := Style.button("")
		button.name = "Gold_%d_%d" % [cell.x, cell.y]
		button.custom_minimum_size = Vector2.ZERO
		button.position = Vector2(cell) * CELL
		button.size = Vector2.ONE * (CELL * (2 if pouch else 1) - 1)
		var caption: String = Gold.pouch_name(id) if pouch else "Gold"
		button.tooltip_text = "%s\n%d / %d gold" % [caption, count, int(item["capacity"])]
		_grid.add_child(button)
		_gold_items.append(button)
		button.set_drag_forwarding(_get_stack_drag_data.bind(button), _can_drop_bag.bind(button), _drop_bag.bind(button))
		var icon := TextureRect.new()
		icon.texture = GOLD_ICONS[id]
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(icon)
		icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		icon.offset_bottom = -10
		var quantity := Style.label(Gold.format_amount(count), 11, Style.ACCENT)
		quantity.name = "Count"
		quantity.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		quantity.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
		quantity.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(quantity)
		quantity.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		quantity.offset_right = -3
		quantity.offset_bottom = -2


func _get_sword_drag_data(position: Vector2, button: Button, id: String) -> Dictionary:
	var item: Dictionary = _catalogue[id]
	var icon := Catalog.icon(item)
	var preview: Control
	if icon != null:
		var sprite := TextureRect.new()
		sprite.texture = icon
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		preview = sprite
	else:
		preview = Style.label(item.get("glyph", "+"), 20, Style.ACCENT)
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var data := _begin_bag_drag(position, button, preview)
	data["sword_id"] = id
	return data


func _can_drop_sword(_position: Vector2, data: Variant) -> bool:
	return data is Dictionary and data.get("sword_id") is String and _rendered_placements.has(data["sword_id"])


func _can_drop_equipment(_position: Vector2, data: Variant, slot: String) -> bool:
	if not _can_drop_sword(_position, data):
		return false
	var item: Dictionary = _catalogue[data["sword_id"]]
	var target: String = item.get("slot", "main_hand")
	return target == slot or (target == "accessory" and slot.begins_with("accessory_"))


func _drop_equipment(_position: Vector2, data: Dictionary, slot: String) -> void:
	slot_equip_requested.emit(data["sword_id"], slot)


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
	_selection.text = str(_catalogue[_selected]["name"]) if _catalogue.has(_selected) else "Select equipment"


func focus_grid() -> void:
	if not _items.is_empty():
		_items[0].grab_focus()
	elif not _cobweb_items.is_empty():
		_cobweb_items[0].grab_focus()
	elif not _gold_items.is_empty():
		_gold_items[0].grab_focus()
	else:
		_gear.grab_focus()


func _begin_bag_drag(position: Vector2, button: Button, preview: Control) -> Dictionary:
	var icon := button.get_child(0) as TextureRect
	_ghost_icon.texture = icon.texture
	_ghost_icon.offset_bottom = icon.offset_bottom
	_ghost_glyph.text = button.text if icon.texture == null else ""
	_drop_ghost.size = button.size
	_cursor_preview = preview
	button.set_drag_preview(preview)
	set_process_input(true)
	return {
		"bag_from": Vector2i(button.position / CELL),
		"bag_offset": Vector2i(position / CELL),
	}


func _get_stack_drag_data(position: Vector2, button: Button) -> Dictionary:
	var preview := TextureRect.new()
	preview.texture = (button.get_child(0) as TextureRect).texture
	preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	preview.custom_minimum_size = button.size
	preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return _begin_bag_drag(position, button, preview)


func _bag_destination(position: Vector2, data: Dictionary, control: Control) -> Vector2i:
	var point := _grid.get_global_transform().affine_inverse() * (control.get_global_transform() * position)
	return Vector2i(floori(point.x / CELL), floori(point.y / CELL)) - data["bag_offset"]


func _can_drop_bag(position: Vector2, data: Variant, control: Control) -> bool:
	if not data is Dictionary or not data.get("bag_from") is Vector2i or not data.get("bag_offset") is Vector2i:
		return false
	var destination := _bag_destination(position, data, control)
	var fits := _satchel.can_move_item(data["bag_from"], destination)
	if fits:
		_drop_ghost.position = Vector2(destination) * CELL
	_set_drop_ghost_visible(fits)
	return fits


func _drop_bag(position: Vector2, data: Dictionary, control: Control) -> void:
	item_move_requested.emit(data["bag_from"], _bag_destination(position, data, control))
