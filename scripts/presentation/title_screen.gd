extends ShellModeView
## Penpot composition. Emits only the existing revision-scoped loading intent.
## Lettering is exported artwork; Button.text retains its semantic action name.

const WALL = preload("res://assets/art/title_screen/wall.png")
const STATUE = preload("res://assets/art/title_screen/statue.png")
const TITLE = preload("res://assets/art/title_screen/title.png")
const DICE = preload("res://assets/art/title_screen/dice.png")
const VIGNETTE = preload("res://assets/art/title_screen/vignette.png")
const START = preload("res://assets/art/title_screen/start.png")
var _factor: float = 1.0
var _origin := Vector2.ZERO

func _ready() -> void:
	resized.connect(_layout_art)
	_layout_art()

func configure(observation: Dictionary, _heading: String, description: String, choices: Dictionary) -> void:
	_observation = observation.duplicate(true)
	var button: Button = $Controls/StartGame
	_buttons.append(button)
	button.pressed.connect(_request.bind(SessionShell.Mode.LOADING), CONNECT_DEFERRED)
	button.visible = choices.has(SessionShell.Mode.LOADING)
	button.focus_neighbor_top = NodePath(".")
	button.focus_neighbor_bottom = NodePath(".")
	button.focus_next = NodePath(".")
	button.focus_previous = NodePath(".")
	var normal := StyleBoxTexture.new()
	normal.texture = START
	for state: String in ["normal", "hover", "pressed", "disabled"]:
		button.add_theme_stylebox_override(state, normal)
	var focus := StyleBoxFlat.new()
	focus.bg_color = Color.TRANSPARENT
	focus.border_color = Color("#efc75e")
	focus.set_border_width_all(3)
	focus.set_expand_margin_all(5)
	button.add_theme_stylebox_override("focus", focus)
	for state: String in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_disabled_color"]:
		button.add_theme_color_override(state, Color.TRANSPARENT)
	button.mouse_entered.connect(func() -> void: button.self_modulate = Color(1.18, 1.18, 1.18))
	button.mouse_exited.connect(func() -> void: button.self_modulate = Color.WHITE)
	$Controls/Error.text = description if not description.begins_with("Explore.") else ""
	_layout_art()

func _layout_art() -> void:
	if not size.is_finite() or size.x <= 0.0 or size.y <= 0.0:
		_factor = 0.0
		queue_redraw()
		return
	_factor = minf(size.x / 1280.0, size.y / 720.0)
	_origin = (size - Vector2(1280, 720) * _factor) * 0.5
	$Controls/StartGame.position = _origin + Vector2(88, 568) * _factor
	$Controls/StartGame.size = Vector2(300, 68) * _factor
	$Controls/Error.position = _origin + Vector2(56, 270) * _factor
	$Controls/Error.size = Vector2(380, 250) * _factor
	queue_redraw()

func _draw() -> void:
	if _factor <= 0.0: return
	# Extend the wall behind the centered composition on wider landscapes.
	draw_set_transform(Vector2(0, _origin.y), 0.0, Vector2.ONE * _factor)
	draw_texture_rect(WALL, Rect2(0, -157, maxf(1672, size.x / _factor), 941), false)
	draw_texture_rect(VIGNETTE, Rect2(0, 0, size.x / _factor, size.y / _factor), false)
	draw_set_transform(_origin, 0.0, Vector2.ONE * _factor)
	draw_texture(TITLE, Vector2(36, 36))
	draw_texture(DICE, Vector2(127, 197))
	draw_texture(STATUE, Vector2(488, 20))
