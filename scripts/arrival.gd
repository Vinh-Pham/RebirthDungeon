extends Control

const Style = preload("res://scripts/menu_style.gd")
const Store = preload("res://scripts/character_store.gd")
const Data = preload("res://scripts/character_data.gd")
const ATLAS = preload("res://assets/art/town_atlas.png")
const TOWN := "res://scenes/dungeon_town.tscn"
const CHARACTERS := "res://scenes/character.tscn"

var _dialogue: Label
var _response: Button
var _spoken := false
var _departing := false


func _ready() -> void:
	var profile := Store.load_selected()
	if profile.is_empty():
		get_tree().call_deferred("change_scene_to_file", CHARACTERS)
		return
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	Style.background(self)

	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 18)
	Style.inset(self, 54, 42, true).add_child(layout)
	var header := HBoxContainer.new()
	layout.add_child(header)
	var title := Style.label("Waking Vault", 40)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var back := Style.button("Characters")
	back.pressed.connect(_back)
	header.add_child(back)
	layout.add_child(Style.rule())

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 24)
	layout.add_child(body)
	var portrait_frame := Style.panel(body, Style.PANEL)
	portrait_frame.custom_minimum_size.x = 360
	var stage := CenterContainer.new()
	portrait_frame.add_child(stage)
	var figures := HBoxContainer.new()
	figures.add_theme_constant_override("separation", 28)
	stage.add_child(figures)
	var guide := AtlasTexture.new()
	guide.atlas = ATLAS
	guide.region = Rect2(0, 0, 16, 24)
	guide.filter_clip = true
	_add_figure(figures, guide)
	_add_figure(figures, Data.portrait(profile))

	var conversation := Style.panel(body, Style.SURFACE)
	conversation.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var text_column := VBoxContainer.new()
	text_column.add_theme_constant_override("separation", 14)
	Style.inset(conversation, 22, 20).add_child(text_column)
	text_column.add_child(Style.label("Ilex", 28, Style.TEAL))
	_dialogue = Style.label("You wake under a vault of dark stone. A guide waits beside an open stair.", 17, Style.TEXT, true)
	_dialogue.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_dialogue.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_column.add_child(_dialogue)
	_response = Style.button("Speak to Ilex", true)
	_response.custom_minimum_size.y = 44
	_response.pressed.connect(_continue)
	text_column.add_child(_response)
	layout.add_child(Style.rule())
	layout.add_child(Style.label("Enter / E  Continue    Esc  Characters", 14, Style.MUTED))
	_response.grab_focus.call_deferred()


func _add_figure(parent: Control, icon: Texture2D) -> void:
	var figure := TextureRect.new()
	figure.texture = icon
	figure.custom_minimum_size = Vector2(112, 168)
	figure.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	figure.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	parent.add_child(figure)


func _continue() -> void:
	if _departing:
		return
	if not _spoken:
		_spoken = true
		_dialogue.text = "You can rest in Lantern Rest. Tell Warden Nera I sent you. She keeps the route to the next settlement and knows which passages have gone quiet."
		_response.text = "Enter Lantern Rest"
		return
	if Store.update_world({"location": "lantern_rest", "visited": ["lantern_rest"]}).is_empty():
		_dialogue.text = "Could not save your arrival. Try entering Lantern Rest again."
		return
	_departing = true
	get_tree().change_scene_to_file(TOWN)


func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	var viewport := get_viewport()
	match event.keycode:
		KEY_E: _continue()
		KEY_ESCAPE: _back()
		_: return
	viewport.set_input_as_handled()


func _back() -> void:
	get_tree().change_scene_to_file(CHARACTERS)
