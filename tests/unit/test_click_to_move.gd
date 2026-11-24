extends GutTest

const Layout = preload("res://scripts/exploration_layout.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const ORIGIN := Vector2(11, 24)
const TILE := Vector2(20, 24)

var _layout: Layout
var _player := Vector2i.ZERO
var _steps: Array[Vector2i] = []
var _can_move := true
var _reject_step := false


func before_each() -> void:
	_player = Vector2i.ZERO
	_steps.clear()
	_can_move = true
	_reject_step = false
	_layout = Layout.new()
	add_child_autofree(_layout)
	var walkable := {}
	for x in range(5):
		for y in range(3):
			walkable[Vector2i(x, y)] = true
	_layout.configure("Test floor", Vector2i(5, 3), walkable, {}, {}, Satchel.new())
	_layout.configure_click_movement(ORIGIN, TILE, [Vector2i(2, 0), Vector2i(2, 1)], func() -> bool: return _can_move, _move)
	_layout.set_player(_player)
	_layout.set_process(false)


func _move(direction: Vector2i) -> void:
	_steps.append(direction)
	if not _reject_step:
		_player += direction
		_layout.set_player(_player)


func _click(cell: Vector2i) -> void:
	await get_tree().process_frame
	var position := _layout.map_canvas.global_position + ORIGIN + Vector2(cell) * TILE + TILE * 0.5
	var motion := InputEventMouseMotion.new()
	motion.position = position
	get_viewport().push_input(motion, true)
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.position = position
	click.pressed = true
	get_viewport().push_input(click, true)
	click.pressed = false
	get_viewport().push_input(click, true)


func _finish_route() -> void:
	for index in range(25):
		_layout._process(0.1)


func test_click_routes_around_blocked_tiles_with_cardinal_steps() -> void:
	await _click(Vector2i(4, 0))
	_finish_route()
	assert_eq(_player, Vector2i(4, 0))
	var visited := Vector2i.ZERO
	for direction in _steps:
		assert_eq(absi(direction.x) + absi(direction.y), 1)
		visited += direction
		assert_false(visited in [Vector2i(2, 0), Vector2i(2, 1)])


func test_clicking_blocked_tile_does_not_move() -> void:
	await _click(Vector2i(2, 0))
	_finish_route()
	assert_eq(_player, Vector2i.ZERO)
	assert_eq(_steps.size(), 0)


func test_route_stops_when_movement_is_interrupted() -> void:
	await _click(Vector2i(4, 0))
	_can_move = false
	var stopped := _player
	_finish_route()
	assert_eq(_player, stopped)
	_can_move = true
	_finish_route()
	assert_eq(_player, stopped)


func test_rejected_step_stops_route() -> void:
	_reject_step = true
	await _click(Vector2i(4, 0))
	_finish_route()
	assert_eq(_player, Vector2i.ZERO)
	assert_eq(_steps.size(), 1)


func test_open_inventory_cancels_and_blocks_map_routes() -> void:
	await _click(Vector2i(4, 0))
	var stopped := _player
	assert_ne(stopped, Vector2i.ZERO)
	_layout.open_inventory()
	await _click(Vector2i(4, 0))
	_finish_route()
	assert_eq(_player, stopped)
	_layout.close_inventory()
	await _click(Vector2i(4, 0))
	_finish_route()
	assert_eq(_player, Vector2i(4, 0))
