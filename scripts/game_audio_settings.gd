extends Control

signal close_requested

const Style = preload("res://scripts/menu_style.gd")
const SETTINGS_PATH := "user://audio_settings.cfg"
const BUSES := ["Sound", "Music"]

var _sliders: Array[HSlider] = []
var _values: Array[Label] = []
var _status: Label


static func apply_saved() -> void:
	var settings := ConfigFile.new()
	settings.load(SETTINGS_PATH)
	for bus: String in BUSES:
		var index := AudioServer.get_bus_index(bus)
		if index < 0:
			AudioServer.add_bus()
			index = AudioServer.bus_count - 1
			AudioServer.set_bus_name(index, bus)
			AudioServer.set_bus_send(index, "Master")
		var value: Variant = settings.get_value("audio", bus, 100.0)
		var volume := 100.0
		if (value is float or value is int) and is_finite(float(value)):
			volume = clampf(float(value), 0.0, 100.0)
		AudioServer.set_bus_volume_linear(index, volume / 100.0)


func _ready() -> void:
	hide()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = Style.make_theme()
	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var center := CenterContainer.new()
	add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := Style.panel(center, Style.SURFACE)
	panel.custom_minimum_size.x = 460
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 16)
	Style.inset(panel, 24, 22).add_child(column)
	column.add_child(Style.label("Settings", 28))
	for bus: String in BUSES:
		var row := HBoxContainer.new()
		column.add_child(row)
		var label := Style.label(bus, 16)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)
		var value := Style.label("", 16)
		row.add_child(value)
		_values.append(value)
		var slider := HSlider.new()
		slider.name = bus + "Volume"
		slider.max_value = 100
		slider.step = 1
		slider.custom_minimum_size = Vector2(400, 24)
		slider.value_changed.connect(_change_volume.bind(_sliders.size()))
		column.add_child(slider)
		_sliders.append(slider)
	_status = Style.label("", 13, Style.TEXT, true)
	column.add_child(_status)
	var back := Style.button("Back")
	back.pressed.connect(close_requested.emit)
	column.add_child(back)


func open() -> void:
	apply_saved()
	for index in range(BUSES.size()):
		var volume := AudioServer.get_bus_volume_linear(AudioServer.get_bus_index(BUSES[index])) * 100.0
		_sliders[index].set_value_no_signal(volume)
		_values[index].text = "%d%%" % roundi(volume)
	_status.text = ""
	show()
	_sliders[0].grab_focus()


func _change_volume(volume: float, index: int) -> void:
	_values[index].text = "%d%%" % roundi(volume)
	AudioServer.set_bus_volume_linear(AudioServer.get_bus_index(BUSES[index]), volume / 100.0)
	var settings := ConfigFile.new()
	for i in range(BUSES.size()):
		settings.set_value("audio", BUSES[i], _sliders[i].value)
	_status.text = "" if settings.save(SETTINGS_PATH) == OK else "Could not save volume settings."
