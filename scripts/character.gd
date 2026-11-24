extends Control

const Style = preload("res://scripts/menu_style.gd")
const Data = preload("res://scripts/character_data.gd")
const Store = preload("res://scripts/character_store.gd")
const TITLE := "res://scenes/title.tscn"
const ARRIVAL := "res://scenes/arrival.tscn"
const DESTINATIONS := {
	"lantern_rest": "res://scenes/dungeon_town.tscn",
	"spindle_hollow": "res://scenes/dungeon_town.tscn",
	"threshold": "res://scenes/dungeon_entry.tscn"
}
const LOOK_FIELDS := ["body", "hair", "hair_color", "skin", "eyes", "eye_color", "face"]

var _draft := {
	"name": "", "race": 0, "gender": Data.Gender.NONBINARY, "body": 1, "age": 17, "hair": 1, "hair_color": 0,
	"skin": 1, "eyes": 0, "eye_color": 0, "face": 0, "talent": 0
}
var _profiles: Array[Dictionary] = []
var _fields: Dictionary = {}
var _creating := false
var _changing_scene := false
var _new_tab: Button
var _load_tab: Button
var _creator: VBoxContainer
var _roster: VBoxContainer
var _name_input: LineEdit
var _saved_list: ItemList
var _load_button: Button
var _status: Label
var _portrait: TextureRect
var _preview_name: Label
var _preview_identity: Label
var _preview_origin: Label
var _preview_talent: Label
var _preview_training: Label


func _ready() -> void:
	theme = Style.make_theme()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	Style.background(self)

	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 14)
	Style.inset(self, 48, 30, true).add_child(layout)

	var header := HBoxContainer.new()
	layout.add_child(header)
	var heading := Style.label("Characters", 38)
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(heading)
	var back := Style.button("Back to Title")
	back.custom_minimum_size.x = 160
	back.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	back.pressed.connect(_return_to_title)
	header.add_child(back)
	layout.add_child(Style.rule())

	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 10)
	layout.add_child(tabs)
	_new_tab = Style.button("New Character")
	_load_tab = Style.button("Load Character")
	var group := ButtonGroup.new()
	for tab in [_new_tab, _load_tab]:
		tab.toggle_mode = true
		tab.button_group = group
		tab.custom_minimum_size.x = 176
		tabs.add_child(tab)
	_new_tab.pressed.connect(_show_mode.bind(true))
	_load_tab.pressed.connect(_show_mode.bind(false))

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 16)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(body)
	var controls := Style.panel(body, Style.SURFACE)
	controls.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var content := Style.inset(controls, 18, 14)
	_build_creator(content)
	_build_roster(content)
	_build_preview(body)

	_status = Style.label("", 13, Style.MUTED)
	_status.custom_minimum_size.y = 20
	layout.add_child(_status)
	_profiles = Store.list_characters()
	_populate_roster()
	_show_mode(_profiles.is_empty())
	if _creating:
		_name_input.grab_focus.call_deferred()
	else:
		_saved_list.grab_focus.call_deferred()


func _build_creator(parent: Control) -> void:
	_creator = VBoxContainer.new()
	_creator.add_theme_constant_override("separation", 12)
	parent.add_child(_creator)

	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_creator.add_child(scroll)
	var form := VBoxContainer.new()
	form.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	form.add_theme_constant_override("separation", 7)
	scroll.add_child(form)

	form.add_child(Style.label("Identity", 20, Style.TEAL))
	var identity := _grid(form, 2)
	var name_field := _field(identity, "Name")
	_name_input = LineEdit.new()
	_name_input.name = "CharacterName"
	_name_input.placeholder_text = "Enter a name"
	_name_input.max_length = 24
	_name_input.custom_minimum_size.y = 36
	_name_input.text_changed.connect(_on_name_changed)
	name_field.add_child(_name_input)
	_add_options(identity, "Race", "race", Data.RACES)
	_add_options(identity, "Gender", "gender", Data.GENDERS)
	_add_options(identity, "Build", "body", Data.BUILDS)
	var ages: Array[String] = []
	for age in range(Data.MIN_START_AGE, Data.MAX_START_AGE + 1):
		ages.append(str(age))
	_add_options(identity, "Age", "age", ages, Data.MIN_START_AGE)

	form.add_child(Style.rule())
	form.add_child(Style.label("Appearance", 20, Style.TEAL))
	var appearance := _grid(form, 3)
	_add_options(appearance, "Hair", "hair", Data.HAIR)
	_add_options(appearance, "Hair Color", "hair_color", Data.HAIR_TONES)
	_add_options(appearance, "Skin", "skin", Data.SKIN_TONES)
	_add_options(appearance, "Eyes", "eyes", Data.EYES)
	_add_options(appearance, "Eye Color", "eye_color", Data.EYE_TONES)
	_add_options(appearance, "Face", "face", Data.FACES)

	form.add_child(Style.rule())
	_add_options(form, "Starting Talent", "talent", Data.TALENTS)
	_refresh_talents()

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 10)
	_creator.add_child(actions)
	var randomize := Style.button("Randomize Appearance")
	randomize.pressed.connect(_randomize_appearance)
	actions.add_child(randomize)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	actions.add_child(spacer)
	var create := Style.button("Create & Enter", true)
	create.custom_minimum_size.x = 169
	create.pressed.connect(_create_character)
	actions.add_child(create)


func _build_roster(parent: Control) -> void:
	_roster = VBoxContainer.new()
	_roster.add_theme_constant_override("separation", 10)
	parent.add_child(_roster)

	_roster.add_child(Style.label("Saved Characters", 20, Style.TEAL))
	_saved_list = ItemList.new()
	_saved_list.name = "SavedCharacters"
	_saved_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_saved_list.item_selected.connect(_on_saved_selected)
	_saved_list.item_activated.connect(_activate_saved)
	_roster.add_child(_saved_list)

	_load_button = Style.button("Load & Enter", true)
	_load_button.custom_minimum_size.x = 169
	_load_button.size_flags_horizontal = Control.SIZE_SHRINK_END
	_load_button.pressed.connect(_load_character)
	_roster.add_child(_load_button)


func _build_preview(parent: Control) -> void:
	var panel := Style.panel(parent, Style.BACK)
	panel.custom_minimum_size.x = 326
	var preview := VBoxContainer.new()
	preview.add_theme_constant_override("separation", 8)
	Style.inset(panel, 17, 14).add_child(preview)

	preview.add_child(Style.label("Character Preview", 16, Style.TEAL))
	var art_frame := Style.panel(preview, Style.PANEL)
	art_frame.custom_minimum_size.y = 186
	art_frame.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var center := CenterContainer.new()
	art_frame.add_child(center)
	_portrait = TextureRect.new()
	_portrait.custom_minimum_size = Vector2(112, 168)
	_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(_portrait)

	_preview_name = Style.label("", 25)
	_preview_name.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	preview.add_child(_preview_name)
	_preview_identity = Style.label("", 14, Style.MUTED)
	preview.add_child(_preview_identity)
	_preview_origin = _preview_paragraph(preview)
	preview.add_child(Style.rule())
	_preview_talent = Style.label("", 17, Style.ACCENT)
	preview.add_child(_preview_talent)
	_preview_training = _preview_paragraph(preview)


func _preview_paragraph(parent: Control) -> Label:
	var paragraph := Style.label("", 13, Style.TEXT, true)
	paragraph.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	paragraph.custom_minimum_size.y = 38
	parent.add_child(paragraph)
	return paragraph


func _grid(parent: Control, columns: int) -> GridContainer:
	var grid := GridContainer.new()
	grid.columns = columns
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 6)
	parent.add_child(grid)
	return grid


func _field(parent: Control, path_label: String) -> VBoxContainer:
	var field := VBoxContainer.new()
	field.add_theme_constant_override("separation", 3)
	field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	field.add_child(Style.label(path_label, 13, Style.MUTED))
	parent.add_child(field)
	return field


func _add_options(parent: Control, field_label: String, key: String, options: Array, base_id := 0) -> void:
	var option := OptionButton.new()
	option.name = key.to_pascal_case()
	option.custom_minimum_size.y = 36
	option.fit_to_longest_item = false
	option.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	for index in options.size():
		option.add_item(options[index], base_id + index)
	option.select(int(_draft[key]) - base_id)
	option.item_selected.connect(_on_option_changed.bind(key))
	option.gui_input.connect(_cycle_option.bind(option, key))
	option.tooltip_text = "Left / Right to change"
	_fields[key] = option
	_field(parent, field_label).add_child(option)


func _show_mode(creating: bool) -> void:
	_creating = creating
	_creator.visible = creating
	_roster.visible = not creating
	_new_tab.set_pressed_no_signal(creating)
	_load_tab.set_pressed_no_signal(not creating)
	_clear_status()
	if creating:
		_update_preview(_draft)
	else:
		var selected := _saved_list.get_selected_items()
		_load_button.disabled = selected.is_empty()
		if selected.is_empty():
			_update_preview({})
			_status.text = "No saved characters. Choose New Character to begin."
		else:
			_update_preview(_profiles[selected[0]])


func _populate_roster() -> void:
	_saved_list.clear()
	for profile in _profiles:
		var race: String = Data.RACES[profile["race"]]
		var talent: String = Data.TALENTS[profile["talent"]]
		_saved_list.add_item("%s  /  %s  /  %s" % [profile["name"], race, talent])
		_saved_list.set_item_tooltip(_saved_list.item_count - 1, "%s · %s · Age %d" % [race, Data.gender_name(profile), profile["age"]])
	if not _profiles.is_empty():
		_saved_list.select(0)


func _on_saved_selected(index: int) -> void:
	_clear_status()
	_load_button.disabled = false
	_update_preview(_profiles[index])


func _activate_saved(_index: int) -> void:
	_load_character()


func _on_name_changed(new_name: String) -> void:
	_draft["name"] = new_name
	_clear_status()
	var label_text := new_name.strip_edges()
	_preview_name.text = "Unnamed" if label_text.is_empty() else label_text


func _on_option_changed(index: int, key: String) -> void:
	var option: OptionButton = _fields[key]
	_draft[key] = option.get_item_id(index)
	if key == "race":
		_refresh_talents()
	_update_preview(_draft)


func _refresh_talents() -> void:
	var option: OptionButton = _fields["talent"]
	var choices: Array[int] = Data.available_talents(int(_draft["race"]))
	if not choices.has(int(_draft["talent"])):
		_draft["talent"] = 0
	option.clear()
	for id: int in choices:
		option.add_item(Data.TALENTS[id], id)
	option.select(option.get_item_index(int(_draft["talent"])))


func _cycle_option(event: InputEvent, option: OptionButton, key: String) -> void:
	var direction := 0
	if event.is_action_pressed("ui_left"):
		direction = -1
	elif event.is_action_pressed("ui_right"):
		direction = 1
	if direction == 0:
		return
	var index := posmod(option.selected + direction, option.item_count)
	option.select(index)
	_on_option_changed(index, key)
	option.accept_event()


func _randomize_appearance() -> void:
	for key in LOOK_FIELDS:
		var option: OptionButton = _fields[key]
		var index := randi_range(0, option.item_count - 1)
		option.select(index)
		_draft[key] = option.get_item_id(index)
	_update_preview(_draft)


func _update_preview(profile: Dictionary) -> void:
	if profile.is_empty():
		_portrait.texture = null
		_preview_name.text = ""
		_preview_identity.text = ""
		_preview_origin.text = ""
		_preview_talent.text = ""
		_preview_training.text = ""
		return
	_portrait.texture = Data.portrait(profile)
	var profile_name := str(profile["name"]).strip_edges()
	_preview_name.text = "Unnamed" if profile_name.is_empty() else profile_name
	var race: int = profile["race"]
	var talent: int = profile["talent"]
	_preview_identity.text = "%s  /  %s  /  Age %s" % [Data.RACES[race], Data.gender_name(profile), profile["age"]]
	_preview_origin.text = Data.RACE_DETAILS[race]
	_preview_talent.text = Data.TALENTS[talent]
	_preview_training.text = Data.TALENT_DETAILS[talent]


func _create_character() -> void:
	if _changing_scene:
		return
	if _name_input.text.strip_edges().is_empty():
		_show_error("Enter a character name first.")
		_name_input.grab_focus()
		return
	var profile := Store.create(_draft)
	if profile.is_empty():
		_show_error("Could not save this character. Check the name and try again.")
		return
	_enter_world(str(profile["id"]))


func _load_character() -> void:
	if _changing_scene:
		return
	var selected := _saved_list.get_selected_items()
	if not selected.is_empty():
		_enter_world(str(_profiles[selected[0]]["id"]))


func _enter_world(id: String) -> void:
	if not Store.select_character(id):
		_show_error("Could not load that character. Choose another or create a new one.")
		return
	var profile := Store.load_selected()
	var destination: String = DESTINATIONS.get(profile["world"]["location"], ARRIVAL)
	_changing_scene = true
	if get_tree().change_scene_to_file(destination) != OK:
		_changing_scene = false
		_show_error("Could not open the saved area.")


func _show_error(message: String) -> void:
	_status.add_theme_color_override("font_color", Style.ERROR)
	_status.text = message


func _clear_status() -> void:
	_status.add_theme_color_override("font_color", Style.MUTED)
	if _creating:
		_status.text = "Tab  Move focus    Left / Right  Change option"
	else:
		_status.text = "Up / Down  Select character    Enter  Load"


func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		_return_to_title()


func _return_to_title() -> void:
	get_tree().change_scene_to_file(TITLE)
