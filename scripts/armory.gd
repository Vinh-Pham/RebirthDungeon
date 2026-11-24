extends Control

signal weapons_changed

const Style = preload("res://scripts/menu_style.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")

var _catalog: Dictionary
var _satchel: Satchel
var _rack_family := ""
var _browsing_rack := false
var _ids: Array[String] = []
var _cells: Array[Panel] = []
var _empty_cell: StyleBoxFlat
var _filled_cell: StyleBoxFlat
var _selected_cell: StyleBoxFlat
var _heading: Label
var _switch: Button
var _search: LineEdit
var _list: ItemList
var _preview: TextureRect
var _name: Label
var _details: Label
var _equipped: Label
var _grid_area: VBoxContainer
var _primary: Button
var _return: Button
var _status: Label


func _ready() -> void:
	hide()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var shade := ColorRect.new()
	shade.color = Color(Style.SURFACE, 0.85)
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var inset := Style.inset(self, 82, 49, true)
	var panel := Style.panel(inset, Style.SURFACE)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 12)
	Style.inset(panel, 21, 18).add_child(layout)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 10)
	layout.add_child(header)
	_heading = Style.label("", 32)
	_heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(_heading)
	_switch = Style.button("Satchel")
	_switch.custom_minimum_size.x = 105
	_switch.pressed.connect(_switch_view)
	header.add_child(_switch)
	var done := Style.button("Close")
	done.custom_minimum_size.x = 105
	done.pressed.connect(close)
	header.add_child(done)
	layout.add_child(Style.rule())

	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 18)
	columns.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(columns)
	_build_list(columns)
	_build_details(columns)
	layout.add_child(Style.rule())
	_status = Style.label("", 14, Style.MUTED)
	layout.add_child(_status)


func configure(items: Dictionary, satchel: Satchel) -> void:
	_catalog = items
	_satchel = satchel


func open_rack(family: String) -> void:
	_open(family, true)


func open_satchel(nearest_rack: String) -> void:
	_open(nearest_rack, false)


func close() -> void:
	hide()


func _input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()


func _build_list(parent: HBoxContainer) -> void:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 8)
	parent.add_child(column)
	_search = LineEdit.new()
	_search.name = "SwordSearch"
	_search.placeholder_text = "Search swords"
	_search.custom_minimum_size.y = 36
	_search.text_changed.connect(_on_search)
	column.add_child(_search)

	_list = ItemList.new()
	_list.name = "Weapons"
	_list.fixed_icon_size = Vector2i(16, 24)
	_list.icon_mode = ItemList.ICON_MODE_LEFT
	_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("icon_margin", 12)
	_list.item_selected.connect(_inspect)
	_list.item_activated.connect(_activate)
	column.add_child(_list)


func _build_details(parent: HBoxContainer) -> void:
	var panel := Style.panel(parent, Style.BACK)
	panel.custom_minimum_size.x = 310
	var details := VBoxContainer.new()
	details.add_theme_constant_override("separation", 8)
	Style.inset(panel, 13, 12).add_child(details)

	var frame := Style.panel(details, Color("#576069"))
	frame.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var center := CenterContainer.new()
	frame.add_child(center)
	_preview = TextureRect.new()
	_preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_preview.custom_minimum_size = Vector2(96, 144)
	center.add_child(_preview)

	_name = Style.label("", 22)
	_name.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	details.add_child(_name)
	_details = Style.label("", 14, Style.MUTED)
	details.add_child(_details)
	_equipped = Style.label("", 13, Style.TEAL)
	_equipped.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	details.add_child(_equipped)
	_build_grid(details)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 6)
	details.add_child(actions)
	_primary = Style.button("Take Sword", true)
	_primary.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_primary.pressed.connect(_use_selected)
	actions.add_child(_primary)
	_return = Style.button("Return to Rack")
	_return.pressed.connect(_return_selected)
	actions.add_child(_return)


func _build_grid(parent: VBoxContainer) -> void:
	_grid_area = VBoxContainer.new()
	_grid_area.add_theme_constant_override("separation", 4)
	parent.add_child(_grid_area)
	_grid_area.add_child(Style.label("Satchel grid", 13, Style.MUTED))
	var grid := GridContainer.new()
	grid.columns = Satchel.WIDTH
	grid.add_theme_constant_override("h_separation", 2)
	grid.add_theme_constant_override("v_separation", 2)
	_grid_area.add_child(grid)
	_empty_cell = Style.box(Style.SURFACE, Style.BORDER)
	_filled_cell = Style.box(Style.BORDER)
	_selected_cell = Style.box(Style.ACCENT)
	for index in Satchel.WIDTH * Satchel.HEIGHT:
		var cell := Panel.new()
		cell.custom_minimum_size = Vector2(13, 13)
		cell.add_theme_stylebox_override("panel", _empty_cell)
		grid.add_child(cell)
		_cells.append(cell)


func _open(family: String, browsing_rack: bool) -> void:
	_rack_family = family
	_browsing_rack = browsing_rack
	_search.text = ""
	_refresh_view()
	show()
	_list.grab_focus()


func _switch_view() -> void:
	_browsing_rack = not _browsing_rack
	_refresh_view()
	_list.grab_focus()


func _refresh_view() -> void:
	_heading.text = Catalog.FAMILIES[_rack_family] if _browsing_rack else "Weapon Satchel"
	_switch.visible = not _rack_family.is_empty()
	_switch.text = "Satchel" if _browsing_rack else "Rack"
	_search.visible = _browsing_rack
	_grid_area.visible = not _browsing_rack
	_return.visible = not _browsing_rack and not _rack_family.is_empty()
	_status.add_theme_color_override("font_color", Style.MUTED)
	_status.text = "Enter  Take sword" if _browsing_rack else "Enter  Equip sword"
	_fill_list()


func _fill_list(preferred := "") -> void:
	_ids.clear()
	_list.clear()
	var filter := _search.text.strip_edges().to_lower()
	for id: String in _catalog:
		var item: Dictionary = _catalog[id]
		if _browsing_rack:
			if item["family"] != _rack_family or (not filter.is_empty() and not item["name"].to_lower().contains(filter)):
				continue
		elif not _satchel.owns(id):
			continue
		_ids.append(id)
	_ids.sort_custom(func(a: String, b: String) -> bool:
		return _catalog[a]["name"].naturalnocasecmp_to(_catalog[b]["name"]) < 0)
	for id: String in _ids:
		var item: Dictionary = _catalog[id]
		var label: String = item["name"]
		if id == _satchel.equipped:
			label += "  [equipped]"
		elif _browsing_rack and _satchel.owns(id):
			label += "  [owned]"
		_list.add_item(label, Catalog.icon(item))
		_list.set_item_tooltip(_list.item_count - 1, Catalog.tooltip(item))
	if _ids.is_empty():
		_inspect(-1)
		return
	var index := maxi(0, _ids.find(preferred))
	_list.select(index)
	if index == 0:
		_list.get_v_scroll_bar().set_deferred("value", 0.0)
	else:
		_list.ensure_current_is_visible.call_deferred()
	_inspect(index)


func _inspect(index: int) -> void:
	var held := _satchel.equipped
	_equipped.text = "Equipped: " + str(_catalog[held]["name"]) if not held.is_empty() else "No sword equipped"
	_primary.text = "Take Sword" if _browsing_rack else "Equip Sword"
	_primary.disabled = true
	_return.disabled = true
	if index < 0:
		_preview.texture = null
		_name.text = "No matching swords" if _browsing_rack else "Satchel is empty"
		_details.text = ""
		_paint_grid("")
		return
	var id := _ids[index]
	var item: Dictionary = _catalog[id]
	_preview.texture = Catalog.icon(item)
	_name.text = item["name"]
	var grip := "2 hands" if int(item["hands"]) == 2 else "1 hand"
	_details.text = "%s   %s   %d×%d" % [
		Catalog.damage_text(item), grip, int(item["width"]), int(item["height"])
	]
	_primary.disabled = _satchel.owns(id) if _browsing_rack else id == held
	_return.disabled = false
	_paint_grid(id)


func _paint_grid(selected: String) -> void:
	if _browsing_rack:
		return
	for cell in _cells:
		cell.add_theme_stylebox_override("panel", _empty_cell)
		cell.tooltip_text = ""
	var placements := _satchel.placements
	for id: String in placements:
		var corner: Vector2i = placements[id]
		var item: Dictionary = _catalog[id]
		var style := _selected_cell if id == selected else _filled_cell
		var tooltip := Catalog.tooltip(item)
		for y in range(corner.y, corner.y + int(item["height"])):
			for x in range(corner.x, corner.x + int(item["width"])):
				var cell := _cells[y * Satchel.WIDTH + x]
				cell.add_theme_stylebox_override("panel", style)
				cell.tooltip_text = tooltip


func _selected_id() -> String:
	var selected := _list.get_selected_items()
	return "" if selected.is_empty() else _ids[selected[0]]


func _use_selected() -> void:
	var id := _selected_id()
	if id.is_empty() or _primary.disabled:
		return
	var error := _satchel.take(id) if _browsing_rack else _satchel.equip(id)
	var action := "Stowed " if _browsing_rack else "Equipped "
	_complete(error, action + str(_catalog[id]["name"]) + ".", id)


func _return_selected() -> void:
	var id := _selected_id()
	if id.is_empty() or _rack_family.is_empty() or _browsing_rack:
		return
	_complete(_satchel.return_to_rack(id), "Returned " + str(_catalog[id]["name"]) + ".")


func _complete(error: String, message: String, preferred := "") -> void:
	_status.text = message if error.is_empty() else error
	_status.add_theme_color_override("font_color", Style.TEAL if error.is_empty() else Style.ERROR)
	if error.is_empty():
		_fill_list(preferred)
		weapons_changed.emit()
	_list.grab_focus()


func _on_search(_query: String) -> void:
	_fill_list()


func _activate(_index: int) -> void:
	_use_selected()
