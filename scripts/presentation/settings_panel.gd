extends CanvasLayer
## Phase 12 settings surface: audio levels, reduced motion, text scale and
## key rebinding. Everything mutates the SettingsService and applies live;
## nothing here reads or writes session state. Escape closes.
signal closed
signal presentation_changed

const Settings = preload("res://scripts/services/settings_service.gd")
var settings: Settings
var _capturing: String = ""
var _key_labels: Dictionary = {}
var _capture_hint: Label
var _close: Button

## Builds the whole surface; call before adding to the tree so no frame
## renders an unbuilt panel.
func start(service: Settings) -> void:
	settings = service
	layer = 30
	var blocker := ColorRect.new()
	blocker.color = Color(0.02, 0.04, 0.05, 0.85)
	blocker.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(blocker)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	blocker.add_child(center)
	var panel := PanelContainer.new()
	center.add_child(panel)
	var column := VBoxContainer.new()
	column.custom_minimum_size = Vector2(640, 0)
	panel.add_child(column)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(640, 460)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)
	var stack := VBoxContainer.new()
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.add_theme_constant_override("separation", 10)
	scroll.add_child(stack)
	var title := Label.new()
	title.text = "Settings"
	title.add_theme_font_size_override("font_size", 26)
	stack.add_child(title)
	_audio_section(stack)
	_accessibility_section(stack)
	_controls_section(stack)
	var buttons := HBoxContainer.new()
	column.add_child(buttons)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	buttons.add_child(spacer)
	_close = Button.new()
	_close.text = "Back"
	_close.custom_minimum_size = Vector2(140, 48)
	_close.pressed.connect(close)
	buttons.add_child(_close)
	_refresh_keys()
	# The panel enters the tree right after start(); grab initial focus then,
	# since grab_focus requires the control to already be inside the tree. The
	# guard keeps a same-frame close from grabbing into a removed panel.
	_focus_close.call_deferred()

func _focus_close() -> void:
	if _close != null and _close.is_inside_tree():
		_close.grab_focus()

func _audio_section(stack: VBoxContainer) -> void:
	stack.add_child(_section_label("Audio"))
	for row: Array in [["Master", "master_volume"], ["Music", "music_volume"], ["Effects", "sfx_volume"]]:
		var line := HBoxContainer.new()
		stack.add_child(line)
		var name_label := Label.new()
		name_label.text = row[0]
		name_label.custom_minimum_size = Vector2(140, 0)
		line.add_child(name_label)
		var slider := HSlider.new()
		slider.min_value = 0.0
		slider.max_value = 1.0
		slider.step = 0.05
		slider.value = float(settings.get(row[1]))
		slider.custom_minimum_size = Vector2(320, 32)
		slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		slider.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		slider.value_changed.connect(_on_volume.bind(row[1]))
		line.add_child(slider)

func _accessibility_section(stack: VBoxContainer) -> void:
	stack.add_child(_section_label("Accessibility"))
	var motion_line := HBoxContainer.new()
	stack.add_child(motion_line)
	var motion_label := Label.new()
	motion_label.text = "Reduced motion"
	motion_label.custom_minimum_size = Vector2(140, 0)
	motion_line.add_child(motion_label)
	var motion := CheckButton.new()
	motion.button_pressed = settings.reduced_motion
	motion.text = "Skip camera easing and pulses"
	motion.toggled.connect(_on_reduced_motion)
	motion_line.add_child(motion)
	var text_line := HBoxContainer.new()
	stack.add_child(text_line)
	var text_label := Label.new()
	text_label.text = "Text size"
	text_label.custom_minimum_size = Vector2(140, 0)
	text_line.add_child(text_label)
	var scale_choice := OptionButton.new()
	for option: float in Settings.TEXT_SCALES:
		scale_choice.get_popup().add_item("%d%%" % roundi(option * 100))
	scale_choice.select(Settings.TEXT_SCALES.find(settings.clamped_text_scale(settings.text_scale)))
	scale_choice.item_selected.connect(_on_text_scale)
	text_line.add_child(scale_choice)

func _controls_section(stack: VBoxContainer) -> void:
	stack.add_child(_section_label("Controls (keyboard)"))
	var hint := Label.new()
	hint.text = "Rebind adds a key (up to four per action). Joystick bindings stay. Reset restores the defaults."
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.custom_minimum_size = Vector2(0, 0)
	stack.add_child(hint)
	var grid := GridContainer.new()
	grid.columns = 3
	stack.add_child(grid)
	for action: String in Settings.REMAPPABLE:
		var name_label := Label.new()
		name_label.text = action.replace("_", " ").capitalize()
		name_label.custom_minimum_size = Vector2(180, 0)
		grid.add_child(name_label)
		var keys := Label.new()
		keys.custom_minimum_size = Vector2(220, 0)
		grid.add_child(keys)
		_key_labels[action] = keys
		var rebind := Button.new()
		rebind.text = "Rebind"
		rebind.custom_minimum_size = Vector2(120, 40)
		rebind.pressed.connect(_start_capture.bind(action))
		grid.add_child(rebind)
	_capture_hint = Label.new()
	_capture_hint.text = ""
	_capture_hint.add_theme_color_override("font_color", Color("#efc75e"))
	stack.add_child(_capture_hint)
	var reset := Button.new()
	reset.text = "Reset default keys"
	reset.custom_minimum_size = Vector2(200, 40)
	reset.pressed.connect(_on_reset_bindings)
	stack.add_child(reset)

func _section_label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 20)
	return label

func _on_volume(value: float, field: String) -> void:
	settings.set(field, clampf(value, 0.0, 1.0))
	settings.apply_audio()
	settings.save_settings()

func _on_reduced_motion(pressed: bool) -> void:
	settings.reduced_motion = pressed
	settings.save_settings()
	presentation_changed.emit()

func _on_text_scale(index: int) -> void:
	settings.set_text_scale(float(Settings.TEXT_SCALES[clampi(index, 0, Settings.TEXT_SCALES.size() - 1)]))
	settings.save_settings()
	presentation_changed.emit()

func _start_capture(action: String) -> void:
	_capturing = action
	_capture_hint.text = "Press a key for %s…" % action.replace("_", " ")

func _on_reset_bindings() -> void:
	settings.reset_bindings()
	settings.apply_bindings()
	settings.save_settings()
	_refresh_keys()
	_capturing = ""
	_capture_hint.text = ""

func _refresh_keys() -> void:
	for action: String in Settings.REMAPPABLE:
		var keys: Label = _key_labels.get(action)
		if keys == null: continue
		var names := PackedStringArray()
		for key: int in PackedInt64Array(settings.bindings.get(action, PackedInt64Array())):
			names.append(OS.get_keycode_string(key as Key))
		keys.text = " · ".join(names)

func _input(event: InputEvent) -> void:
	if _capturing.is_empty() or not event is InputEventKey: return
	var key := event as InputEventKey
	if not key.pressed or key.echo: return
	get_viewport().set_input_as_handled()
	settings.set_binding_key(_capturing, key.physical_keycode)
	settings.apply_bindings()
	settings.save_settings()
	_refresh_keys()
	_capturing = ""
	_capture_hint.text = ""

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("shell_back") and not event.is_echo():
		get_viewport().set_input_as_handled()
		close()

func close() -> void:
	var focus := get_viewport().gui_get_focus_owner()
	if focus != null: focus.release_focus()
	closed.emit()
	queue_free()
