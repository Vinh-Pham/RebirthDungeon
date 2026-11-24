extends Control

signal selected(item: Dictionary)
signal closed
const Style = preload("res://scripts/menu_style.gd")
const Durability = preload("res://scripts/equipment_durability.gd")
var _rows: VBoxContainer


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = Style.make_theme()
	hide()
	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := Style.panel(Style.inset(self, 160, 75, true), Style.SURFACE)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	Style.inset(panel, 20, 18).add_child(column)
	var header := HBoxContainer.new()
	column.add_child(header)
	var title := Style.label("Repair equipment", 26)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var back := Style.button("Close")
	back.pressed.connect(close)
	header.add_child(back)
	column.add_child(Style.label("Guaranteed repairs · %d gold per point, rounded up" % Durability.REPAIR_PRICE, 14, Style.MUTED))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)
	_rows = VBoxContainer.new()
	_rows.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_rows)


func open(items: Array, world: Dictionary) -> void:
	for child in _rows.get_children():
		_rows.remove_child(child)
		child.queue_free()
	for item: Dictionary in items:
		var button := Style.button("%s · %s" % [item["name"], Durability.condition_text(world, item)])
		button.pressed.connect(_select.bind(item))
		_rows.add_child(button)
	if items.is_empty():
		_rows.add_child(Style.label("You have no equipment to repair.", 16))
	show()


func _select(item: Dictionary) -> void:
	hide()
	selected.emit(item)


func close() -> void:
	hide()
	closed.emit()


func _input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()
