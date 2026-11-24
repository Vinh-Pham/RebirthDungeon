extends Control

signal closed

const Style = preload("res://scripts/menu_style.gd")
const Data = preload("res://scripts/character_data.gd")

var _content: VBoxContainer
var _close_button: Button


func _ready() -> void:
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hide()
	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var frame := Style.panel(Style.inset(self, 60, 35, true), Style.BACK)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 12)
	Style.inset(frame, 22, 18).add_child(layout)
	var header := HBoxContainer.new()
	layout.add_child(header)
	var title := Style.label("Character", 34)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	_close_button = Style.button("Close")
	_close_button.custom_minimum_size.x = 108
	_close_button.pressed.connect(close)
	header.add_child(_close_button)
	layout.add_child(Style.rule())
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.follow_focus = true
	layout.add_child(scroll)
	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 14)
	scroll.add_child(_content)
	layout.add_child(Style.rule())
	layout.add_child(Style.label("C / Esc  Close    •    Magic and injury ratings apply as their skills become available.", 12, Style.MUTED))


func open(profile: Dictionary, stats: Dictionary, weapon: Dictionary, health: int, current_stamina: int) -> void:
	for child in _content.get_children():
		_content.remove_child(child)
		child.queue_free()
	var identity := HBoxContainer.new()
	identity.add_theme_constant_override("separation", 20)
	_content.add_child(identity)
	var portrait := TextureRect.new()
	portrait.texture = Data.portrait(profile)
	portrait.custom_minimum_size = Vector2(64, 96)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	identity.add_child(portrait)
	var about := VBoxContainer.new()
	about.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	identity.add_child(about)
	var name_label := Style.label(str(profile["name"]), 28)
	name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	about.add_child(name_label)
	about.add_child(Style.label("%s  /  %s  /  Age %d  /  %s" % [
		Data.RACES[Data.race_index(profile)], Data.gender_name(profile), int(profile["age"]), Data.TALENTS[int(profile["talent"])]
	], 14, Style.MUTED))
	about.add_child(Style.label("Level %d   •   Ability Points %d   •   Total XP %d" % [
		int(stats["level"]), int(stats["ability_points"]), int(stats["total_experience"])
	], 14, Style.ACCENT))
	about.add_child(Style.label("Experience %d / %d" % [int(stats["experience"]), int(stats["next_level_experience"])], 14, Style.MUTED))

	var resources := HBoxContainer.new()
	resources.add_theme_constant_override("separation", 20)
	_content.add_child(resources)
	_resource(resources, "Life", health, int(stats["life"]), Style.HEALTH)
	_resource(resources, "Mana", int(stats["mana"]), int(stats["mana"]), Style.TEAL)
	_resource(resources, "Stamina", current_stamina, int(stats["stamina"]), Color("#f2ec8b"))

	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 24)
	_content.add_child(columns)
	var attributes := _group(columns, "Attributes")
	for pair in [["Strength", "strength"], ["Intelligence", "intelligence"], ["Dexterity", "dexterity"], ["Will", "will"], ["Luck", "luck"]]:
		_row(attributes, pair[0], _number(stats[pair[1]]))
	var physical := _group(columns, "Physical")
	_row(physical, "Damage", "%d–%d" % [int(stats["damage_min"]), int(stats["damage_max"])])
	_row(physical, "Critical", _percent(stats["critical"]))
	_row(physical, "Balance", _percent(stats["balance"]))
	_row(physical, "Defense", _number(stats["defense"]))
	_row(physical, "Protection", _percent(stats["protection"]))
	_row(physical, "Armor Pierce", _number(stats["armor_pierce"]))
	var arcane := _group(columns, "Magic & Injury")
	_row(arcane, "Magic Attack", _number(stats["magic_attack"]))
	_row(arcane, "Magic Defense", _number(stats["magic_defense"]))
	_row(arcane, "Magic Protection", _number(stats["magic_protection"]))
	_row(arcane, "Magic Balance", _percent(stats["magic_balance"]))
	_row(arcane, "Injury", "%s–%s" % [_percent(stats["injury_min"]), _percent(stats["injury_max"])])
	_content.add_child(Style.rule())
	var equipment := Style.label("Weapon  " + str(weapon.get("name", "Bare Hands")), 16, Style.TEAL)
	equipment.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_content.add_child(equipment)
	show()
	_close_button.grab_focus()


func close() -> void:
	hide()
	closed.emit()


func _resource(parent: Control, caption: String, current: int, maximum: int, color: Color) -> void:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 5)
	parent.add_child(column)
	column.add_child(Style.label("%s  %d / %d" % [caption, maxi(0, current), maximum], 16, Color.WHITE))
	var bar := Style.progress_bar(color)
	bar.max_value = maxi(1, maximum)
	bar.value = clampi(current, 0, maximum)
	column.add_child(bar)


func _group(parent: Control, caption: String) -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 9)
	parent.add_child(column)
	column.add_child(Style.label(caption, 18, Style.TEAL))
	return column


func _row(parent: Control, caption: String, value: String) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	parent.add_child(row)
	var label := Style.label(caption, 14, Style.MUTED)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)
	row.add_child(Style.label(value, 14))


func _number(value: Variant) -> String:
	return str(int(value)) if is_equal_approx(float(value), floor(float(value))) else "%.1f" % float(value)


func _percent(value: Variant) -> String:
	return _number(value) + "%"
