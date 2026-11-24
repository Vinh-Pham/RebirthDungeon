extends Control

const Style = preload("res://scripts/menu_style.gd")
const CHARACTERS := "res://scenes/character.tscn"
const GATE_ART := "res://assets/art/title_gate.png"


func _ready() -> void:
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	Style.background(self)

	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 22)
	Style.inset(self, 54, 40, true).add_child(layout)
	layout.add_child(Style.rule())

	var main := HBoxContainer.new()
	main.add_theme_constant_override("separation", 24)
	main.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(main)

	var copy_position := CenterContainer.new()
	copy_position.custom_minimum_size.x = 453
	main.add_child(copy_position)
	var copy := VBoxContainer.new()
	copy.custom_minimum_size.x = 408
	copy.add_theme_constant_override("separation", 22)
	copy_position.add_child(copy)

	var title := Style.label("Rebirth\nDungeon", 83)
	title.add_theme_constant_override("line_spacing", -9)
	copy.add_child(title)

	var description := Style.label("Old machines still hum below. Find out what kept them running.", 17, Style.MUTED, true)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	description.custom_minimum_size.x = 390
	copy.add_child(description)

	var start := Style.button("Start Game", true)
	start.custom_minimum_size = Vector2(222, 54)
	start.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	start.add_theme_font_size_override("font_size", 23)
	start.pressed.connect(_start_game)
	copy.add_child(start)
	start.grab_focus.call_deferred()

	var frame := Style.panel(main, Style.SURFACE)
	frame.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var art := TextureRect.new()
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if ResourceLoader.exists(GATE_ART):
		art.texture = load(GATE_ART) as Texture2D
	Style.inset(frame, 12, 12).add_child(art)

	layout.add_child(Style.rule())
	layout.add_child(Style.label("Enter  Start Game", 13, Style.MUTED))


func _start_game() -> void:
	get_tree().change_scene_to_file(CHARACTERS)
