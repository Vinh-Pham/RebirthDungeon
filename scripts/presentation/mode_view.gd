class_name ShellModeView
extends VBoxContainer
## A copied observation plus local intents; never holds the session.

signal intent_requested(target: int, session_id: int, revision: int)
var _observation: Dictionary = {}
var _attached: bool = true
var _buttons: Array[Button] = []

func configure(observation: Dictionary, heading: String, description: String, choices: Dictionary) -> void:
	_observation = observation.duplicate(true)
	$Heading.text = heading
	$Description.text = description
	for target: int in choices:
		var button := Button.new()
		button.text = choices[target]
		button.custom_minimum_size = Vector2(280, 48)
		button.pressed.connect(_request.bind(target),CONNECT_DEFERRED)
		$Actions.add_child(button)
		_buttons.append(button)
	for index: int in _buttons.size():
		var button := _buttons[index]
		button.focus_neighbor_top = button.get_path_to(_buttons[(index - 1 + _buttons.size()) % _buttons.size()])
		button.focus_neighbor_bottom = button.get_path_to(_buttons[(index + 1) % _buttons.size()])
		button.focus_next = button.focus_neighbor_bottom
		button.focus_previous = button.focus_neighbor_top

func _request(target: int) -> void:
	if _attached:
		intent_requested.emit(target, _observation.session_id, _observation.revision)

func set_input_enabled(enabled: bool) -> void:
	for button: Button in _buttons:
		button.disabled = not enabled
		if not enabled and button.is_inside_tree():
			button.release_focus()
	if enabled and not _buttons.is_empty():
		_buttons[0].grab_focus()

func detach() -> void:
	_attached = false
	set_input_enabled(false)
	for button: Button in _buttons:
		if button.is_inside_tree():
			button.release_focus()
