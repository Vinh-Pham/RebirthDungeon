extends Node2D
## Godot adapter. Owns physics/navigation, publishes copied continuation to Main.
signal continuation_changed(position: Vector2, discovered: Array[String])
signal interaction_requested(stable_id: String, kind: String)
signal menu_requested
signal abandon_requested
signal progression_requested(tab: String)
var conversation_camera: PhantomCamera2D
const PlayerScene = preload("res://scenes/exploration/player.tscn")
const InteractionMarkerScript = preload("res://scripts/exploration/interaction_marker.gd")
@export var town: bool = false
var session_id: int
var revision: int
var session_valid: Callable
var discovered: Array[String] = []
var resolved: Array[String] = []
var initial_position := Vector2(96,160)
var player: CharacterBody2D
var navigation_ready: bool = false
var focused: bool = true
var panel_open: bool = false
var transition_locked: bool = false
var _sync_epoch: int = 0
var _navigation_map: RID
var _require_neutral: bool = false
var _pending_point := Vector2.INF
var _approach_id: String = ""
var _overlaps: Dictionary = {}
var _hint: Label
var _panel: PanelContainer
@onready var camera: Camera2D = $Camera2D
@onready var phantom: PhantomCamera2D = $ExplorationCamera

func configure(id: int, expected_revision: int, continuation: Dictionary, validator: Callable) -> void:
	session_id = id
	revision = expected_revision
	session_valid = validator
	if not continuation.is_empty():
		initial_position = Vector2(continuation.position.x, continuation.position.y)
		if not town:
			discovered.assign(continuation.discovered)
			resolved.assign(continuation.resolved)

func _draw() -> void:
	draw_rect(Rect2(-10000,-10000,20000,20000), Color("#0e1b21"))

func _ready() -> void:
	process_physics_priority = -10
	# Isolate this installation from old scenes and other viewports.
	_navigation_map = NavigationServer2D.map_create()
	NavigationServer2D.map_set_active(_navigation_map, true)
	if town:
		discovered = ["room.haven"]
	elif discovered.is_empty():
		discovered = ["room.threshold"]
	player = PlayerScene.instantiate()
	player.name = "Player"
	player.visible = false
	player.input_allowed = can_move
	add_child(player)
	player.agent.set_navigation_map(_navigation_map)
	for room: Node2D in $Rooms.get_children():
		room.region.set_navigation_map(_navigation_map)
		room.set_discovered(discovered.has(room.room_id))
		if discovered.has(room.next_room_id):
			room.open_connector()
		for marker: Node in room.get_children():
			if marker.get_script() == InteractionMarkerScript:
				if resolved.has(marker.stable_id):
					marker.hide()
				marker.body_entered.connect(_on_overlap.bind(marker.stable_id, true))
				marker.body_exited.connect(_on_overlap.bind(marker.stable_id, false))
	_build_hud()
	phantom.set_follow_target(player)
	phantom.set_priority(20)
	get_viewport().size_changed.connect(_resize_camera)
	_resize_camera()
	_sync_navigation(true)

func _resize_camera() -> void:
	if not is_inside_tree() or not is_instance_valid(phantom) or not phantom.is_inside_tree(): return
	# The host alone applies transforms. A capped view span gives consistent
	# room readability across compact and ultrawide landscape viewports.
	var extent := get_viewport_rect().size
	var zoom_value := maxf(extent.y / 400.0, extent.x / 720.0)
	phantom.zoom = Vector2.ONE * zoom_value
	phantom.limit_left = -120
	phantom.limit_top = -90
	phantom.limit_right = 600 if town else 1720
	phantom.limit_bottom = 410

func _sync_navigation(restore: bool = false) -> void:
	navigation_ready = false
	player.stop()
	_sync_epoch += 1
	var epoch := _sync_epoch
	var map := _navigation_map
	var before := NavigationServer2D.map_get_iteration_id(map)
	await get_tree().physics_frame
	await get_tree().physics_frame
	while is_inside_tree() and epoch == _sync_epoch and (NavigationServer2D.map_get_iteration_id(map) <= before or not _regions_synchronized(map)):
		await get_tree().physics_frame
	if not is_inside_tree() or epoch != _sync_epoch:
		return
	if restore:
		# Apply continuation only after this installation has synchronized.
		var point := NavigationServer2D.map_get_closest_point(map, initial_position)
		player.global_position = point
		player.visible = true
		phantom.set_follow_target(player)
	navigation_ready = true

func _regions_synchronized(map: RID) -> bool:
	for room: Node2D in $Rooms.get_children():
		if discovered.has(room.room_id):
			var center := room.global_position + Vector2(240,160)
			if NavigationServer2D.map_get_closest_point_owner(map, center) != room.region.get_rid():
				return false
	return true

func valid_session() -> bool:
	return session_valid.is_valid() and session_valid.call(session_id, revision)

func can_move() -> bool:
	if not navigation_ready or not focused or panel_open or transition_locked or not valid_session():
		return false
	if get_viewport().gui_get_focus_owner() != null:
		return false
	if _require_neutral:
		for key: int in [KEY_W, KEY_A, KEY_S, KEY_D, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT]:
			if Input.is_physical_key_pressed(key):
				return false
		if not Input.get_vector("move_left","move_right","move_up","move_down").is_zero_approx():
			return false
		_require_neutral = false
	return true

func suspend_input() -> void:
	_pending_point = Vector2.INF
	_approach_id = ""
	_require_neutral = true
	if is_instance_valid(player):
		player.stop()
	for action: StringName in [&"move_left", &"move_right", &"move_up", &"move_down"]:
		Input.action_release(action)

func set_focused(value: bool) -> void:
	focused = value
	suspend_input()

func freeze() -> void:
	transition_locked = true
	suspend_input()

func _unhandled_input(event: InputEvent) -> void:
	var point := Vector2.INF
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and event.device != InputEvent.DEVICE_ID_EMULATION:
		point = event.position
	elif event is InputEventScreenTouch and event.pressed and event.index == 0:
		point = event.position
	if point == Vector2.INF:
		return
	if not panel_open:
		var owner := get_viewport().gui_get_focus_owner()
		if owner != null:
			owner.release_focus()
	if can_move():
		# Viewport coordinates, including camera zoom and stretch, to world space.
		queue_destination(get_canvas_transform().affine_inverse() * point)
	get_viewport().set_input_as_handled()

func queue_destination(point: Vector2) -> bool:
	if not can_move() or not point.is_finite():
		return false
	_pending_point = point
	_approach_id = ""
	return true

func visible_markers() -> Array[Node2D]:
	var result: Array[Node2D] = []
	for room: Node2D in $Rooms.get_children():
		if not discovered.has(room.room_id):
			continue
		for node: Node in room.get_children():
			if node.get_script() == InteractionMarkerScript and node.kind != "discovery" and not resolved.has(node.stable_id):
				result.append(node)
	return result

func observation() -> Dictionary:
	var markers: Array[Dictionary] = []
	for marker: Node2D in visible_markers():
		markers.append({"id": marker.stable_id, "kind": marker.kind, "label": marker.label,
			"position": {"x": marker.global_position.x, "y": marker.global_position.y}})
	return {"world_id": "town.haven" if town else "dungeon.undercrypt",
		"discovered": discovered.duplicate(), "markers": markers,
		"position": {"x": player.global_position.x, "y": player.global_position.y},
		"navigation_ready": navigation_ready}

func _physics_process(_delta: float) -> void:
	if not can_move():
		player.stop()
		return
	if not Input.get_vector("move_left","move_right","move_up","move_down").is_zero_approx():
		_approach_id = ""
		_pending_point = Vector2.INF
	if _pending_point != Vector2.INF:
		var target := _pending_point
		_pending_point = Vector2.INF
		for marker: Node2D in visible_markers():
			if target.distance_to(marker.global_position) <= marker.radius + 10:
				target = marker.get_node("Approach").global_position
				_approach_id = marker.stable_id
				break
		player.stop()
		var map := _navigation_map
		var closest := NavigationServer2D.map_get_closest_point(map, target)
		if closest.distance_to(target) > 2.0:
			_hint.text = "Choose a reachable point in a revealed room."
			_approach_id = ""
		else:
			var path := NavigationServer2D.map_get_path(map, player.global_position, target, true)
			if path.is_empty() or path[path.size()-1].distance_to(target) > 2.0:
				_hint.text = "That route is blocked."
				_approach_id = ""
			else:
				player.navigate(target)
	for room: Node2D in $Rooms.get_children():
		if not discovered.has(room.room_id):
			continue
		for marker: Node in room.get_children():
			if not marker.get_script() == InteractionMarkerScript:
				continue
			if marker.kind == "discovery":
				if not discovered.has(marker.destination_id) and player.global_position.distance_to(marker.global_position) <= marker.radius:
					_reveal(marker.destination_id)
					return
			elif not resolved.has(marker.stable_id) and (marker.stable_id == _approach_id or _overlaps.has(marker.stable_id)):
				if marker.kind == "npc" and marker.stable_id != _approach_id:
					continue
				if interaction_is_valid(marker.stable_id):
					_approach_id = ""
					freeze()
					continuation_changed.emit(player.global_position, discovered.duplicate())
					interaction_requested.emit(marker.stable_id, marker.kind)
					return
	continuation_changed.emit(player.global_position, discovered.duplicate())

func interaction_is_valid(id: String, allow_transition: bool = false) -> bool:
	if not valid_session() or not navigation_ready or not focused or panel_open or (not allow_transition and not can_move()):
		return false
	for marker: Node2D in visible_markers():
		if marker.stable_id == id:
			if player.global_position.distance_to(marker.global_position) > marker.radius:
				return false
			var query := PhysicsRayQueryParameters2D.create(player.global_position, marker.global_position, 1)
			return get_world_2d().direct_space_state.intersect_ray(query).is_empty()
	return false

func _reveal(id: String) -> void:
	for room: Node2D in $Rooms.get_children():
		if room.room_id == id:
			discovered.append(id)
			room.set_discovered(true)
			for previous: Node2D in $Rooms.get_children():
				if previous.next_room_id == id:
					previous.open_connector()
			_hint.text = room.title + " discovered"
			continuation_changed.emit(player.global_position, discovered.duplicate())
			_sync_navigation()
			return

func _on_overlap(body: Node2D, id: String, entered: bool) -> void:
	if body != player:
		return
	if entered:
		_overlaps[id] = true
	else:
		_overlaps.erase(id)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	layer.name = "HUD"
	add_child(layer)
	var margin := MarginContainer.new()
	margin.theme = load("res://scenes/ui/shell_theme.tres")
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for edge: String in ["left","right","top","bottom"]:
		margin.add_theme_constant_override("margin_" + edge, 24)
	layer.add_child(margin)
	var stack := VBoxContainer.new()
	stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(stack)
	var top := HFlowContainer.new()
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.add_child(top)
	var heading := Label.new()
	heading.text = "HAVEN  /  Town square" if town else "UNDERCRYPT  /  Exploration"
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_theme_font_size_override("font_size", 20)
	heading.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(heading)
	for tab: String in ["Inventory","Skills","Character","Titles"]:
		var feature := Button.new()
		feature.text = tab
		feature.custom_minimum_size.y = 48
		feature.pressed.connect(func() -> void: progression_requested.emit(tab))
		top.add_child(feature)
	var help := Button.new()
	help.text = "Field notes"
	help.custom_minimum_size = Vector2(120,48)
	help.focus_entered.connect(suspend_input)
	help.pressed.connect(show_panel.bind("Field notes", "Move with WASD or arrow keys. Click or tap a revealed floor to walk there.\n\nClick the keeper to approach and talk. Approach a sentinel to open the encounter fixture.\n\nSuccess retains pending gold, XP, training, items and title evidence. Defeat or abandonment discards them and loses 30% of carried gold; banked gold and unspent brought items are safe. Consumed items never return. Overflow must be withdrawn before entry.\n\nUse Menu to pause your journey."))
	top.add_child(help)
	if not town:
		var abandon := Button.new()
		abandon.text = "Abandon"
		abandon.custom_minimum_size = Vector2(100,48)
		abandon.pressed.connect(func() -> void: abandon_requested.emit())
		top.add_child(abandon)
	var menu := Button.new()
	menu.text = "Menu"
	menu.custom_minimum_size = Vector2(80,48)
	menu.focus_entered.connect(suspend_input)
	menu.pressed.connect(func() -> void:
		freeze()
		menu_requested.emit())
	top.add_child(menu)
	var spacer := Control.new()
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_child(spacer)
	_hint = Label.new()
	_hint.text = "WASD / arrows to move  ·  Click or tap to walk  ·  Approach the eastern arch"
	_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint.add_theme_font_size_override("font_size",16)
	stack.add_child(_hint)

func show_panel(title: String, body: String) -> void:
	if panel_open:
		return
	panel_open = true
	suspend_input()
	var blocker := ColorRect.new()
	blocker.name = "Blocker"
	blocker.color = Color(0.02,0.04,0.05,0.8)
	blocker.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	$HUD.add_child(blocker)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	blocker.add_child(center)
	_panel = PanelContainer.new()
	center.add_child(_panel)
	var stack := VBoxContainer.new()
	stack.custom_minimum_size = Vector2(520,0)
	_panel.add_child(stack)
	var heading := Label.new()
	heading.text = title
	heading.add_theme_font_size_override("font_size",24)
	stack.add_child(heading)
	var text := Label.new()
	text.text = body
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(text)
	var close := Button.new()
	close.text = "Continue exploring"
	close.custom_minimum_size.y = 48
	close.pressed.connect(close_panel)
	stack.add_child(close)
	close.grab_focus()

func close_panel() -> void:
	if not panel_open:
		return
	var owner := get_viewport().gui_get_focus_owner()
	if owner != null:
		owner.release_focus()
	$HUD/Blocker.queue_free()
	panel_open = false
	suspend_input()

func _exit_tree() -> void:
	_sync_epoch += 1
	if _navigation_map.is_valid():
		NavigationServer2D.free_rid(_navigation_map)
	if is_instance_valid(phantom):
		phantom.set_priority(0)
		phantom.set_follow_target(null)

func begin_conversation(id: String) -> void:
	freeze()
	conversation_camera = PhantomCamera2D.new()
	conversation_camera.name = "ConversationCamera"
	conversation_camera.zoom = phantom.zoom
	conversation_camera.tween_on_load = false
	conversation_camera.position = player.position
	for marker: Node2D in visible_markers():
		if marker.stable_id == id:
			conversation_camera.position = (marker.position + player.position) * 0.5
	add_child(conversation_camera)
	conversation_camera.set_priority(30)

func end_conversation(id: String) -> void:
	if is_instance_valid(conversation_camera):
		conversation_camera.set_priority(0)
		remove_child(conversation_camera)
		conversation_camera.queue_free()
	conversation_camera = null
	_overlaps.erase(id)
	transition_locked = false
	suspend_input()
