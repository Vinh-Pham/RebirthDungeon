extends VBoxContainer
signal slot_changed(index: int, item_id: String)
signal slot_used(index: int)
const Style = preload("res://scripts/menu_style.gd")
var dimensions := Vector2i.ONE
var walkable: Dictionary = {}
var landmarks: Dictionary = {}
var player := Vector2i.ZERO
var map: Control
var _location_heading: Label
var labels: Array[Label] = []
var bars: Array[ProgressBar] = []
var damage: Label
var defense: Label
var slots: Array[MenuButton] = []
var _experience_label: Label
var _experience_bar: ProgressBar


func _ready() -> void:
	theme = Style.make_theme()
	custom_minimum_size.x = 232
	add_theme_constant_override("separation", 6)
	_location_heading = Style.label("", 16, Style.TEAL)
	_location_heading.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	add_child(_location_heading)
	map = Control.new()
	map.custom_minimum_size.y = 110
	map.draw.connect(_draw_map)
	add_child(map)
	add_child(Style.rule())
	for color: Color in [Style.ACCENT, Style.TEAL, Style.ERROR]:
		var label := Style.label("", 13, Color.WHITE)
		add_child(label)
		labels.append(label)
		var bar := Style.progress_bar(Style.HEALTH if bars.is_empty() else color)
		add_child(bar)
		bars.append(bar)
	damage = Style.label("", 14)
	add_child(damage)
	defense = Style.label("", 12, Style.MUTED)
	add_child(defense)
	add_child(Style.rule())
	_experience_label = Style.label("", 12, Style.TEXT)
	add_child(_experience_label)
	_experience_bar = Style.progress_bar(Style.TEAL)
	add_child(_experience_bar)
	add_child(Style.label("Quick Slots", 16, Style.TEAL))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 5)
	add_child(row)
	for index in range(4):
		var slot := MenuButton.new()
		slot.name = "QuickSlot%d" % (index + 1)
		slot.custom_minimum_size = Vector2(52, 44)
		slot.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		slot.focus_mode = Control.FOCUS_ALL
		slot.flat = false
		slot.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		slot.add_theme_stylebox_override("normal", Style.box(Style.BACK, Style.BORDER))
		slot.add_theme_stylebox_override("hover", Style.box(Style.PANEL, Style.TEAL))
		slot.add_theme_stylebox_override("pressed", Style.box(Style.PANEL, Style.TEAL))
		slot.add_theme_stylebox_override("focus", Style.box(Color.TRANSPARENT, Style.TEAL, 2))
		slot.add_theme_font_size_override("font_size", 12)
		var popup := slot.get_popup()
		popup.add_item("Use Healing Tonic", 0)
		popup.add_item("Assign Healing Tonic", 1)
		popup.add_item("Clear slot", 2)
		popup.id_pressed.connect(_slot_action.bind(index))
		row.add_child(slot)
		slots.append(slot)


func setup_map(location: String, size_cells: Vector2i, cells: Dictionary, markers: Dictionary) -> void:
	_location_heading.text = location
	dimensions = Vector2i(maxi(1, size_cells.x), maxi(1, size_cells.y))
	walkable = cells.duplicate()
	landmarks = markers.duplicate()
	if is_instance_valid(map):
		map.queue_redraw()


func set_player(cell: Vector2i) -> void:
	player = cell
	if is_instance_valid(map):
		map.queue_redraw()


func refresh(stats: Dictionary, world: Dictionary) -> void:
	if not is_node_ready():
		return
	var keys := ["life", "mana", "stamina"]
	var captions := ["HP", "MP", "Stamina"]
	for index in range(3):
		var maximum := int(stats[keys[index]])
		var current := maximum
		if index == 0 and int(world.get("health", -1)) >= 0:
			current = int(world["health"])
		labels[index].text = "%s  %d / %d" % [captions[index], current, maximum]
		bars[index].max_value = maxi(1, maximum)
		bars[index].value = clampi(current, 0, maximum)
	damage.text = "%d–%d damage" % [stats["damage_min"], stats["damage_max"]]
	defense.text = "DEF %s  ·  Crit %.1f%%" % [stats["defense"], stats["critical"]]
	var experience := int(stats["experience"])
	var next_level := int(stats["next_level_experience"])
	_experience_label.text = "Lv %d  ·  XP %d / %d" % [stats["level"], experience, next_level]
	_experience_bar.max_value = maxi(1, next_level)
	_experience_bar.value = experience
	var assignments: Array = world.get("quick_slots", [])
	var count := int(world.get("tonics", 0))
	for index in range(4):
		var assigned: bool = index < assignments.size() and assignments[index] == "tonic"
		slots[index].text = "%d\n%s" % [index + 1, "T ×%d" % count if assigned else "—"]
		slots[index].tooltip_text = "Healing Tonic. Press %d to use. Click to assign or clear." % (index + 1) if assigned else "Click to assign a potion."
		slots[index].get_popup().set_item_disabled(0, not assigned or count <= 0)
		slots[index].get_popup().set_item_disabled(2, not assigned)


func slot_menu_open() -> bool:
	for slot in slots:
		if slot.get_popup().visible:
			return true
	return false


func _slot_action(action: int, index: int) -> void:
	match action:
		0: slot_used.emit(index)
		1: slot_changed.emit(index, "tonic")
		2: slot_changed.emit(index, "")


func _draw_map() -> void:
	map.draw_rect(Rect2(Vector2.ZERO, map.size), Style.SURFACE)
	var cell_size := maxf(1.0, floorf(minf((map.size.x - 14) / dimensions.x, (map.size.y - 14) / dimensions.y)))
	var origin := ((map.size - Vector2(dimensions) * cell_size) / 2).floor()
	for cell: Vector2i in walkable:
		if walkable[cell]:
			map.draw_rect(Rect2(origin + Vector2(cell) * cell_size, Vector2.ONE * cell_size), Style.BORDER)
	for cell: Vector2i in landmarks:
		map.draw_rect(Rect2(origin + Vector2(cell) * cell_size, Vector2.ONE * cell_size), landmarks[cell])
	map.draw_rect(Rect2(origin + Vector2(player) * cell_size, Vector2.ONE * cell_size), Style.ACCENT)
