extends Control

signal purchase_requested(item_id: String)
signal closed

const Style = preload("res://scripts/menu_style.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")

var _tabs: TabBar
var _rows: GridContainer
var _gold_label: Label
var _status: Label
var _details: Label
var _buy: Button
var _categories: Array = []
var _items: Array = []
var _selected := ""
var _gold := 0


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	hide()
	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := Style.panel(Style.inset(self, 100, 65, true), Style.SURFACE)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	Style.inset(panel, 20, 18).add_child(column)
	var header := HBoxContainer.new()
	column.add_child(header)
	var title := Style.label("Blacksmith Shop", 28)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	_gold_label = Style.label("", 16, Style.ACCENT)
	header.add_child(_gold_label)
	var back := Style.button("Close")
	back.pressed.connect(close)
	header.add_child(back)
	_tabs = TabBar.new()
	_tabs.tab_changed.connect(_change_category)
	column.add_child(_tabs)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	column.add_child(scroll)
	_rows = GridContainer.new()
	_rows.columns = 2
	_rows.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_rows.add_theme_constant_override("h_separation", 10)
	_rows.add_theme_constant_override("v_separation", 8)
	scroll.add_child(_rows)
	_details = Style.label("", 15, Style.TEXT, true)
	_details.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_details.custom_minimum_size.y = 50
	column.add_child(_details)
	_status = Style.label("", 14, Style.TEXT, true)
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_status)
	_buy = Style.button("Buy", true)
	_buy.pressed.connect(_purchase)
	column.add_child(_buy)


func open(categories: Array, items: Array, gold: int) -> void:
	_categories = categories.duplicate(true)
	_items = items.duplicate(true)
	_selected = ""
	_tabs.clear_tabs()
	for category: Dictionary in _categories:
		_tabs.add_tab(category["name"])
	_tabs.current_tab = 0 if not _categories.is_empty() else -1
	set_status("")
	refresh(gold)
	show()
	_tabs.grab_focus()


func refresh(gold: int, items: Array = []) -> void:
	if not items.is_empty():
		_items = items.duplicate(true)
	_gold = gold
	_gold_label.text = "Gold %d" % gold
	_render_rows()
	_update_selection()
	if not _selected.is_empty():
		var selected_button := _rows.get_node_or_null("ShopItem_" + _selected) as Button
		if selected_button != null:
			selected_button.grab_focus()


func set_status(message: String) -> void:
	_status.text = message
	_status.visible = not message.is_empty()


func _change_category(_index: int) -> void:
	_selected = ""
	set_status("")
	_render_rows()
	_update_selection()


func _render_rows() -> void:
	for child in _rows.get_children():
		_rows.remove_child(child)
		child.queue_free()
	if _tabs.current_tab < 0 or _tabs.current_tab >= _categories.size():
		return
	var category: String = _categories[_tabs.current_tab]["id"]
	for item: Dictionary in _items:
		if item["category"] != category:
			continue
		var button := Style.button("%s · %d gold" % [item["name"], int(item["price"])])
		button.name = "ShopItem_" + str(item["id"])
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.custom_minimum_size.y = 64
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.icon = Catalog.icon(item)
		button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.expand_icon = true
		button.add_theme_constant_override("icon_max_width", 32)
		button.add_theme_constant_override("h_separation", 12)
		button.toggle_mode = true
		button.button_pressed = _selected == item["id"]
		button.tooltip_text = "%s\n%s" % [button.text, item.get("description", "")]
		button.pressed.connect(_select.bind(str(item["id"])))
		_rows.add_child(button)


func _select(id: String) -> void:
	_selected = id
	for child in _rows.get_children():
		(child as Button).set_pressed_no_signal(child.name == "ShopItem_" + id)
	set_status("")
	_update_selection()


func _update_selection() -> void:
	_buy.disabled = true
	_buy.text = "Select equipment"
	_details.text = ""
	for item: Dictionary in _items:
		if item["id"] != _selected:
			continue
		_details.text = str(item.get("description", ""))
		_buy.text = "Buy %s · %d gold" % [item["name"], int(item["price"])]
		_buy.disabled = _gold < int(item["price"]) or not item.get("available", true)
		if not item.get("available", true):
			_details.text += "\n" + str(item.get("unavailable_reason", "Unavailable"))
		elif _gold < int(item["price"]):
			_details.text += "\nYou need %d more gold." % (int(item["price"]) - _gold)
		return


func _purchase() -> void:
	if not _selected.is_empty() and not _buy.disabled:
		purchase_requested.emit(_selected)


func close() -> void:
	hide()
	closed.emit()


func _input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()
