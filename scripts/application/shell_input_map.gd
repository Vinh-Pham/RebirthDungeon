class_name ShellInputMap
extends RefCounted
## Idempotent application-owned action registration, also used in fresh exports.

static func configure() -> void:
	if not InputMap.has_action(&"shell_back"):
		InputMap.add_action(&"shell_back")
	var back := InputEventKey.new()
	back.physical_keycode = KEY_ESCAPE
	_add(&"shell_back", back)
	var cancel := InputEventJoypadButton.new()
	cancel.button_index = JOY_BUTTON_B
	_add(&"shell_back", cancel)
	var accept := InputEventJoypadButton.new()
	accept.button_index = JOY_BUTTON_A
	_add(&"ui_accept", accept)
	for binding: Array in [[&"ui_up", JOY_BUTTON_DPAD_UP], [&"ui_down", JOY_BUTTON_DPAD_DOWN], [&"ui_left", JOY_BUTTON_DPAD_LEFT], [&"ui_right", JOY_BUTTON_DPAD_RIGHT]]:
		var direction := InputEventJoypadButton.new()
		direction.button_index = binding[1]
		_add(binding[0], direction)
	for binding: Array in [[&"move_left", KEY_A, KEY_LEFT], [&"move_right", KEY_D, KEY_RIGHT], [&"move_up", KEY_W, KEY_UP], [&"move_down", KEY_S, KEY_DOWN]]:
		if not InputMap.has_action(binding[0]):
			InputMap.add_action(binding[0])
		for key: int in [binding[1], binding[2]]:
			var event := InputEventKey.new()
			event.physical_keycode = key
			_add(binding[0], event)
	Input.emulate_mouse_from_touch = true

static func _add(action: StringName, event: InputEvent) -> void:
	if not InputMap.action_has_event(action, event):
		InputMap.action_add_event(action, event)
