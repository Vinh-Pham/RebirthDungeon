extends RefCounted
## Phase 12 persisted presentation preferences under user://settings.cfg.
## Values are presentation-only: nothing here may affect rules, RNG or saves.
## Corrupt or missing files fall back to defaults without surfacing errors.
const PATH := "user://settings.cfg"
## Actions a player may rebind. Only key events remap; joystick/axis events
## assigned by shell_input_map are preserved untouched.
const REMAPPABLE := ["move_left", "move_right", "move_up", "move_down", "shell_back"]
const DEFAULT_KEYS := {
	"move_left": [65, 4194319],   # A, Left
	"move_right": [68, 4194321],  # D, Right
	"move_up": [87, 4194320],     # W, Up
	"move_down": [83, 4194322],   # S, Down
	"shell_back": [4194305],      # Escape
}
const TEXT_SCALES := [1.0, 1.15, 1.3]

signal changed

var master_volume: float = 0.8
var music_volume: float = 0.7
var sfx_volume: float = 0.9
var reduced_motion: bool = false
var text_scale: float = 1.0
var bindings: Dictionary = {}

func _init() -> void:
	bindings = {}
	for action: String in REMAPPABLE:
		bindings[action] = PackedInt64Array(DEFAULT_KEYS[action])

func clamped_text_scale(value: float) -> float:
	var snapped := 1.0
	for option: float in TEXT_SCALES:
		if absf(value - option) < absf(snapped - option): snapped = option
	return snapped

## Continuous within the battle view's authored range; the settings panel
## offers the discrete authored options on top.
func set_text_scale(value: float) -> void:
	text_scale = clampf(value, 1.0, 1.4)

func set_binding(action: String, keys: PackedInt64Array) -> void:
	if not REMAPPABLE.has(action) or keys.is_empty() or keys.size() > 4: return
	bindings[action] = keys

func set_binding_key(action: String, physical_keycode: int) -> void:
	if not REMAPPABLE.has(action) or physical_keycode <= 0: return
	var keys := PackedInt64Array(bindings.get(action, PackedInt64Array()))
	if keys.has(physical_keycode): return
	keys.append(physical_keycode)
	while keys.size() > 4: keys.remove_at(0)
	bindings[action] = keys

func reset_bindings() -> void:
	for action: String in REMAPPABLE:
		bindings[action] = PackedInt64Array(DEFAULT_KEYS[action])

## AudioServer application: linear 0..1 to bus volume, mute at zero.
func apply_audio() -> void:
	_apply_bus("Master", master_volume)
	_apply_bus("Music", music_volume)
	_apply_bus("SFX", sfx_volume)

func _apply_bus(bus_name: String, linear: float) -> void:
	var index := AudioServer.get_bus_index(bus_name)
	if index < 0: return
	AudioServer.set_bus_volume_db(index, linear_to_db(maxf(linear, 0.0001)))
	AudioServer.set_bus_mute(index, linear <= 0.001)

## InputMap application: replaces only key events; every other event type
## (joystick buttons, axes) assigned by the shell survives remapping.
func apply_bindings() -> void:
	for action: String in REMAPPABLE:
		if not InputMap.has_action(action): continue
		var preserved: Array[InputEvent] = []
		for event: InputEvent in InputMap.action_get_events(action):
			if not event is InputEventKey: preserved.append(event)
		InputMap.action_erase_events(action)
		for event: InputEvent in preserved: InputMap.action_add_event(action, event)
		for key: int in PackedInt64Array(bindings.get(action, PackedInt64Array())):
			var key_event := InputEventKey.new()
			key_event.physical_keycode = key as Key
			InputMap.action_add_event(action, key_event)

func load_settings(path: String = PATH) -> bool:
	var config := ConfigFile.new()
	if config.load(path) != OK: return false
	master_volume = _volume(config, "audio", "master", master_volume)
	music_volume = _volume(config, "audio", "music", music_volume)
	sfx_volume = _volume(config, "audio", "sfx", sfx_volume)
	reduced_motion = _flag(config, "accessibility", "reduced_motion", false)
	set_text_scale(float(config.get_value("accessibility", "text_scale", 1.0)))
	bindings = {}
	for action: String in REMAPPABLE:
		var raw: Variant = config.get_value("input", action, PackedInt64Array())
		var keys := PackedInt64Array()
		if raw is PackedInt64Array or raw is Array:
			for value: Variant in raw:
				if value is int and value > 0: keys.append(value)
		if keys.is_empty(): keys = PackedInt64Array(DEFAULT_KEYS[action])
		bindings[action] = keys
	changed.emit()
	return true

func save_settings(path: String = PATH) -> bool:
	var config := ConfigFile.new()
	config.set_value("audio", "master", master_volume)
	config.set_value("audio", "music", music_volume)
	config.set_value("audio", "sfx", sfx_volume)
	config.set_value("accessibility", "reduced_motion", reduced_motion)
	config.set_value("accessibility", "text_scale", text_scale)
	for action: String in REMAPPABLE:
		config.set_value("input", action, PackedInt64Array(bindings[action]))
	var error := config.save(path)
	return error == OK

func _volume(config: ConfigFile, section: String, key: String, fallback: float) -> float:
	var value: Variant = config.get_value(section, key, fallback)
	if typeof(value) not in [TYPE_FLOAT, TYPE_INT]: return fallback
	return clampf(float(value), 0.0, 1.0)

## Strict boolean: stored strings and numbers never coerce into a flag.
func _flag(config: ConfigFile, section: String, key: String, fallback: bool) -> bool:
	var value: Variant = config.get_value(section, key, fallback)
	return value if value is bool else fallback
