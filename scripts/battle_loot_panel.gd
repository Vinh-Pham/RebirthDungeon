extends Control

signal take_requested(ids: Array)
signal leave_requested

const Style = preload("res://scripts/menu_style.gd")
const BattleLoot = preload("res://scripts/battle_loot.gd")

var _rows: VBoxContainer
var _status: Label
var _selected: Dictionary = {}
var _loot: Dictionary = {}
var _take_selected: Button
var _take_all: Button
var _leave: Button


func _ready() -> void:
	hide()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = Style.make_theme()

	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var center := CenterContainer.new()
	add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := Style.panel(center, Style.SURFACE)
	panel.custom_minimum_size.x = 480
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 14)
	Style.inset(panel, 22, 20).add_child(column)
	column.add_child(Style.label("Battle Loot", 28, Style.ACCENT))
	column.add_child(Style.rule())
	_rows = VBoxContainer.new()
	_rows.add_theme_constant_override("separation", 8)
	column.add_child(_rows)

	_status = Style.label("", 14, Style.TEXT, true)
	_status.custom_minimum_size = Vector2(430, 40)
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_status)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	column.add_child(actions)
	_take_selected = Style.button("Take Selected")
	_take_selected.pressed.connect(_take_selection)
	actions.add_child(_take_selected)
	_take_all = Style.button("Take All", true)
	_take_all.pressed.connect(func() -> void: take_requested.emit(_loot.keys()))
	actions.add_child(_take_all)
	_leave = Style.button("Leave Loot")
	_leave.pressed.connect(func() -> void: leave_requested.emit())
	actions.add_child(_leave)


func show_loot(loot: Dictionary) -> void:
	_loot = loot.duplicate()
	_selected.clear()
	for child in _rows.get_children():
		_rows.remove_child(child)
		child.queue_free()
	for id in BattleLoot.ITEM_NAMES:
		if int(_loot.get(id, 0)) <= 0:
			continue
		var row := CheckBox.new()
		row.name = "Loot_" + id
		row.text = "%s ×%d" % [BattleLoot.ITEM_NAMES[id], int(_loot[id])]
		row.custom_minimum_size.y = 38
		row.toggled.connect(_select_item.bind(id))
		_rows.add_child(row)
	_take_selected.disabled = true
	_take_all.disabled = _loot.is_empty()
	_status.text = "Untaken drops will be left behind." if not _loot.is_empty() else "No items dropped."
	show()
	if _rows.get_child_count() > 0:
		_rows.get_child(0).grab_focus()
	else:
		_leave.grab_focus()


func set_status(message: String) -> void:
	_status.text = message


func _select_item(checked: bool, id: String) -> void:
	if checked:
		_selected[id] = true
	else:
		_selected.erase(id)
	_take_selected.disabled = _selected.is_empty()


func _take_selection() -> void:
	if not _selected.is_empty():
		take_requested.emit(_selected.keys())
