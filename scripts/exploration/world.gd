extends Node2D
## Godot adapter. Owns physics/navigation, publishes copied continuation to Main.
signal continuation_changed(position: Vector2, discovered: Array[String])
signal interaction_requested(stable_id: String, kind: String)
signal menu_requested
signal abandon_requested
signal progression_requested(tab: String)
signal settings_requested
signal feedback_requested(name: String)
var conversation_camera: PhantomCamera2D
const PlayerScene = preload("res://scenes/exploration/player.tscn")
const InteractionMarkerScript = preload("res://scripts/exploration/interaction_marker.gd")
const RoomScene = preload("res://scenes/exploration/room.tscn")
const MarkerScene = preload("res://scenes/exploration/interaction_marker.tscn")
const Progression = preload("res://scripts/domain/rules/progression_rules.gd")
## System bar palette from the authored reference: pink HP, violet mana,
## amber stamina and a teal experience track.
const VITAL_NAMES := ["HP", "Mana", "Stamina"]
const VITAL_TINTS := [Color(0.878, 0.267, 0.486), Color(0.482, 0.251, 0.788), Color(0.851, 0.647, 0.133)]
const EXP_TINT := Color(0.149, 0.776, 0.635)
## StyleBox corner indexes (top-left, top-right); the Corner enum is not
## reachable as StyleBox members from GDScript on this engine build.
const CORNER_TOP_LEFT := 0
const CORNER_TOP_RIGHT := 1
@export var town: bool = false
## Authored presentation for layout records written before generated labels.
const LEGACY_TITLES := {"room.threshold":"The threshold","room.gallery":"Moss gallery","room.sanctum":"The quiet vault","room.nave":"The flooded nave"}
## Phase 11: the persisted layout. Rooms, encounter bindings and the exit room
## come from the exploration capture; nothing here is regenerated. An empty
## continuation (development fixtures) installs the authored Undercrypt chain.
const DungeonState = preload("res://scripts/domain/state/exploration_state.gd")
var rooms: Array = DungeonState.LAYOUT.duplicate(true)
var bindings: Array = DungeonState.LEGACY_BINDINGS.duplicate(true)
var exit_room_id: String = DungeonState.LEGACY_EXIT
## Phase 12 persisted presentation, mirrored from the settings service.
var text_scale: float = 1.0
var reduced_motion: bool = false
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
## Bottom system bar presentation, updated from copied observations only.
var _vital_bars: Array[ProgressBar] = []
var _vital_texts: Array[Label] = []
var _bar_labels: Array[Label] = []
var _level_text: Label
var _exp_bar: ProgressBar
var _exp_text: Label
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
			# The capture wire keeps the historical "layout" key.
			rooms = continuation.get("layout", []).duplicate(true)
			bindings = continuation.get("bindings", []).duplicate(true)
			exit_room_id = str(continuation.get("exit_room_id", ""))

func _draw() -> void:
	draw_rect(Rect2(-10000,-10000,20000,20000), Color("#0e1b21"))

func _ready() -> void:
	process_physics_priority = -10
	# Isolate this installation from old scenes and other viewports.
	_navigation_map = NavigationServer2D.map_create()
	NavigationServer2D.map_set_active(_navigation_map, true)
	if town:
		discovered = ["room.haven"]
	else:
		_build_dungeon()
		if discovered.is_empty(): discovered = [entry_room_id()]
	player = PlayerScene.instantiate()
	player.name = "Player"
	player.visible = false
	player.input_allowed = can_move
	add_child(player)
	player.agent.set_navigation_map(_navigation_map)
	player.reduced_motion = reduced_motion
	for room: Node2D in $Rooms.get_children():
		room.region.set_navigation_map(_navigation_map)
		room.set_discovered(discovered.has(room.room_id))
		if discovered.has(room.next_room_id):
			room.open_connector()
		for marker: Node in room.get_children():
			if marker.get_script() == InteractionMarkerScript:
				marker.reduced_motion = reduced_motion
				if resolved.has(marker.stable_id):
					marker.hide()
				marker.body_entered.connect(_on_overlap.bind(marker.stable_id, true))
				marker.body_exited.connect(_on_overlap.bind(marker.stable_id, false))
	_build_hud()
	phantom.set_follow_target(player)
	phantom.set_priority(20)
	phantom.follow_damping = not reduced_motion
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
	# Dungeon limits derive from the installed layout so generated chains of any
	# authored length stay framed; discovery masking keeps hidden rooms unseen.
	var right := 600.0 if town else 2280.0
	if not town:
		for record: Variant in rooms:
			if record is Dictionary: right = maxf(right, float(record.get("x", 0.0)) + 600.0)
	phantom.limit_right = int(right)
	phantom.limit_bottom = 410

func entry_room_id() -> String:
	return str(rooms[0].room_id) if not rooms.is_empty() else "room.threshold"

## Rebuild the authored/generated chain from the persisted layout: one room
## scene per record, discovery gates between neighbours, encounter markers for
## the saved bindings and the exit arch inside the exit room. The room template
## keeps every corridor at the same clearance, so any valid chain is traversable.
func _build_dungeon() -> void:
	for index: int in rooms.size():
		var record: Dictionary = rooms[index] if rooms[index] is Dictionary else {}
		if record.is_empty(): continue
		var room: Node2D = RoomScene.instantiate()
		room.name = "Room%d" % index
		room.position = Vector2(float(record.get("x", 0.0)), float(record.get("y", 0.0)))
		room.room_id = str(record.get("room_id", ""))
		room.title = str(record.get("label", LEGACY_TITLES.get(room.room_id, room.room_id)))
		room.left_door = index > 0
		room.right_door = index < rooms.size() - 1
		room.next_room_id = str(rooms[index + 1].room_id) if index < rooms.size() - 1 else ""
		$Rooms.add_child(room)
		if index < rooms.size() - 1:
			var gate: Area2D = MarkerScene.instantiate()
			gate.position = Vector2(448, 160)
			gate.stable_id = "connector.%s.%s" % [room.room_id.trim_prefix("room."), room.next_room_id.trim_prefix("room.")]
			gate.kind = "discovery"
			gate.destination_id = room.next_room_id
			gate.radius = 28.0
			room.add_child(gate)
	for record: Variant in bindings:
		if not record is Dictionary: continue
		var host := _room_node(str(record.get("room_id", "")))
		if host == null: continue
		var marker: Area2D = MarkerScene.instantiate()
		# The nave guardian keeps its authored deeper placement.
		marker.position = Vector2(240, 160) if host.room_id == "room.nave" else Vector2(288, 160)
		marker.stable_id = str(record.get("encounter_id", ""))
		marker.kind = "encounter"
		marker.label = str(record.get("label", ""))
		host.add_child(marker)
	var exit_host := _room_node(exit_room_id)
	if exit_host != null:
		var arch: Area2D = MarkerScene.instantiate()
		arch.position = Vector2(432, 160)
		arch.stable_id = "exit.undercrypt"
		arch.kind = "exit"
		arch.label = "Return arch"
		exit_host.add_child(arch)

func _room_node(room_id: String) -> Node2D:
	for room: Node2D in $Rooms.get_children():
		if room.room_id == room_id: return room
	return null

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
			feedback_requested.emit("discover")
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
	margin.name = "Margin"
	margin.theme = load("res://scenes/ui/shell_theme.tres")
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for edge: String in ["left","right","top","bottom"]:
		margin.add_theme_constant_override("margin_" + edge, 24)
	layer.add_child(margin)
	var stack := VBoxContainer.new()
	stack.name = "Stack"
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
	# The journal window launchers live in the bottom system bar now; the
	# titles journal keeps its top-bar entry.
	for tab: String in ["Titles"]:
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
	var settings_button := Button.new()
	settings_button.text = "Settings"
	settings_button.custom_minimum_size = Vector2(110,48)
	settings_button.focus_entered.connect(suspend_input)
	settings_button.pressed.connect(func() -> void:
		freeze()
		settings_requested.emit())
	top.add_child(settings_button)
	var spacer := Control.new()
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_child(spacer)
	_hint = Label.new()
	_hint.text = "WASD / arrows to move  ·  Click or tap to walk  ·  Approach the eastern arch"
	_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint.add_theme_font_size_override("font_size",roundi(16 * text_scale))
	stack.add_child(_hint)
	# The system bar is full-bleed outside this margin stack, so the stack
	# reserves its height to keep the hint and top controls clear of it.
	var bar_space := Control.new()
	bar_space.name = "BarSpace"
	bar_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.add_child(bar_space)
	_build_system_bar(layer, bar_space)

## Bottom system bar: settings entry on the left, hero vitals, and the journal
## window launchers above the experience bar (Quests and Pets remain
## placeholders). The bar spans the full viewport width and sits flush with
## the bottom screen edge. Presentation only — every value arrives as a copied
## observation through present_vitals(); nothing here reads the session,
## grants rewards or changes gameplay outcomes.
func _build_system_bar(layer: CanvasLayer, bar_space: Control) -> void:
	var strip := PanelContainer.new()
	strip.name = "SystemBar"
	var strip_style := StyleBoxFlat.new()
	strip_style.bg_color = Color(0.03, 0.06, 0.08, 0.92)
	strip_style.set_corner_radius(CORNER_TOP_LEFT, 6)
	strip_style.set_corner_radius(CORNER_TOP_RIGHT, 6)
	strip_style.set_content_margin_all(8)
	strip.add_theme_stylebox_override("panel", strip_style)
	# Anchored across the whole viewport with the bottom edge at zero offset;
	# growing upward keeps the authored content height flush to the screen.
	layer.add_child(strip)
	strip.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	strip.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_sync_bar_space(strip, bar_space)
	strip.resized.connect(_sync_bar_space.call_deferred.bind(strip, bar_space))
	var row := HBoxContainer.new()
	row.name = "SystemRow"
	row.add_theme_constant_override("separation", 16)
	strip.add_child(row)
	var menu_button := Button.new()
	menu_button.name = "MenuButton"
	menu_button.text = "MENU"
	menu_button.custom_minimum_size = Vector2(84, 48)
	menu_button.size_flags_vertical = Control.SIZE_SHRINK_END
	menu_button.tooltip_text = "Open settings"
	menu_button.focus_entered.connect(suspend_input)
	menu_button.pressed.connect(func() -> void:
		freeze()
		settings_requested.emit())
	row.add_child(menu_button)
	var vitals := VBoxContainer.new()
	vitals.name = "Vitals"
	vitals.size_flags_vertical = Control.SIZE_SHRINK_END
	vitals.add_theme_constant_override("separation", 4)
	row.add_child(vitals)
	for pool: int in 3:
		vitals.add_child(_vital_bar(pool))
	var left_space := Control.new()
	left_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	left_space.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(left_space)
	var center := VBoxContainer.new()
	center.name = "CenterColumn"
	center.add_theme_constant_override("separation", 6)
	row.add_child(center)
	var windows := HBoxContainer.new()
	windows.name = "WindowButtons"
	windows.alignment = BoxContainer.ALIGNMENT_CENTER
	windows.add_theme_constant_override("separation", 8)
	center.add_child(windows)
	# Journal launchers request their windows through Main's validated
	# progression flow; Quests and Pets stay placeholders until those windows
	# exist. Pressing returns focus to the world when nothing opens.
	for title: String in ["Character", "Skills", "Quests", "Inventory", "Pets"]:
		var window_button := Button.new()
		window_button.text = title
		window_button.custom_minimum_size.y = 44
		window_button.focus_entered.connect(suspend_input)
		if title in ["Character", "Skills", "Inventory"]:
			window_button.tooltip_text = "Open the %s window" % title
			window_button.pressed.connect(func() -> void: progression_requested.emit(title))
		else:
			window_button.tooltip_text = "%s window is not implemented yet" % title
			window_button.pressed.connect(window_button.release_focus)
		windows.add_child(window_button)
	var exp_row := HBoxContainer.new()
	exp_row.name = "ExpRow"
	exp_row.add_theme_constant_override("separation", 8)
	center.add_child(exp_row)
	_level_text = Label.new()
	_level_text.name = "Lv"
	_level_text.text = "Lv 1"
	_level_text.add_theme_font_size_override("font_size", roundi(14 * text_scale))
	_bar_labels.append(_level_text)
	exp_row.add_child(_level_text)
	_exp_bar = ProgressBar.new()
	_exp_bar.name = "ExpBar"
	_exp_bar.show_percentage = false
	_exp_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_exp_bar.custom_minimum_size = Vector2(420, 22)
	_exp_bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_style_bar(_exp_bar, EXP_TINT)
	_exp_text = Label.new()
	_exp_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_style_overlay_text(_exp_text)
	_exp_bar.add_child(_exp_text)
	_bar_labels.append(_exp_text)
	exp_row.add_child(_exp_bar)
	var right_space := Control.new()
	right_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	right_space.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(right_space)

## Keep the margin stack's reservation in sync with the live bar height, so
## layout changes to the bar can never overlap the hint or the top controls.
func _sync_bar_space(strip: PanelContainer, bar_space: Control) -> void:
	var reserved := ceilf(strip.size.y)
	if bar_space.custom_minimum_size.y != reserved:
		bar_space.custom_minimum_size.y = reserved

func _vital_bar(pool: int) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.name = "Vital%d" % pool
	bar.show_percentage = false
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.custom_minimum_size = Vector2(220, 20)
	_style_bar(bar, VITAL_TINTS[pool])
	var text := Label.new()
	text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_style_overlay_text(text)
	text.text = VITAL_NAMES[pool] + " 0/0"
	bar.add_child(text)
	_vital_bars.append(bar)
	_vital_texts.append(text)
	_bar_labels.append(text)
	return bar

func _style_bar(bar: ProgressBar, tint: Color) -> void:
	var fill := StyleBoxFlat.new()
	fill.bg_color = tint
	fill.set_corner_radius_all(4)
	var track := StyleBoxFlat.new()
	track.bg_color = Color(0.05, 0.08, 0.1, 0.9)
	track.set_corner_radius_all(4)
	track.set_border_width_all(1)
	track.border_color = Color(0.25, 0.32, 0.36)
	bar.add_theme_stylebox_override("fill", fill)
	bar.add_theme_stylebox_override("background", track)

func _style_overlay_text(label: Label) -> void:
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", roundi(14 * text_scale))
	label.add_theme_color_override("font_color", Color(0.94, 0.96, 0.94))

## Present a copied session observation as pool and growth ratios. The world
## treats the observation as read-only and never reaches into the session.
func present_vitals(observation: Dictionary) -> void:
	if _vital_bars.is_empty() or _exp_bar == null or _level_text == null:
		return
	var hero: Dictionary = observation.get("hero", {})
	if hero.is_empty():
		return
	var current: Variant = hero.get("current")
	var maximum: Variant = hero.get("maximum")
	if current == null or maximum == null or current.size() < 3 or maximum.size() < 3:
		return
	for pool: int in 3:
		_vital_bars[pool].max_value = maxi(1, int(maximum[pool]))
		_vital_bars[pool].value = clampi(int(current[pool]), 0, int(maximum[pool]))
		_vital_texts[pool].text = "%s %d/%d" % [VITAL_NAMES[pool], clampi(int(current[pool]), 0, int(maximum[pool])), int(maximum[pool])]
	# Committed growth only: empty growth (development fixtures) reads as level 1.
	var growth: Dictionary = hero.get("growth", {})
	var level := maxi(1, int(growth.get("level", 1)))
	var xp := maxi(0, int(growth.get("xp", 0)))
	_level_text.text = "Lv %d" % level
	if level <= Progression.CONFIG.xp_to_next.size():
		var needed := maxi(1, int(Progression.CONFIG.xp_to_next[level - 1]))
		_exp_bar.max_value = needed
		_exp_bar.value = mini(xp, needed)
		_exp_text.text = "%.1f%%" % [100.0 * float(mini(xp, needed)) / float(needed)]
	else:
		_exp_bar.max_value = 1.0
		_exp_bar.value = 1.0
		_exp_text.text = "MAX"

## Phase 12 live presentation updates from the settings panel.
func set_text_scale(value: float) -> void:
	text_scale = clampf(value, 1.0, 1.4)
	_hint.add_theme_font_size_override("font_size",roundi(16 * text_scale))
	for label: Label in _bar_labels:
		label.add_theme_font_size_override("font_size", roundi(14 * text_scale))

func set_reduced_motion(value: bool) -> void:
	reduced_motion = value
	if is_instance_valid(phantom): phantom.follow_damping = not reduced_motion
	player.reduced_motion = reduced_motion
	for marker: Node in find_children("*", "", true, false):
		if marker.get_script() == InteractionMarkerScript: marker.reduced_motion = reduced_motion

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
