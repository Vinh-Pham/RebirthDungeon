extends RefCounted
const Mode = SessionShell.Mode
var failures := PackedStringArray()
var checks: int = 0

func check(value: bool, message: String) -> void:
	checks += 1
	if not value:
		failures.append(message)

func frames(tree: SceneTree, count: int = 4) -> void:
	for i: int in count:
		await tree.physics_frame
		await tree.process_frame

func settle_world(tree: SceneTree, main: Node) -> void:
	for i: int in 180:
		await frames(tree, 1)
		if is_instance_valid(main._world) and main._world.navigation_ready:
			return
	check(false, "Navigation installation did not synchronize")

func _room_node(world: Node2D, room_id: String) -> Node2D:
	for room: Node2D in world.get_node("Rooms").get_children():
		if room.room_id == room_id: return room
	return null

func _bindings_in(expedition: RefCounted, room_id: String) -> Array:
	var result: Array = []
	for record: Variant in expedition.bindings:
		if record is Dictionary and str(record.room_id) == room_id: result.append(record)
	return result

func _room_index(expedition: RefCounted, room_id: String) -> int:
	for index: int in expedition.rooms.size():
		if str(expedition.rooms[index].room_id) == room_id: return index
	return 0

func walk(tree: SceneTree, world: Node2D, point: Vector2, max_frames: int = 400) -> void:
	var queued: bool = world.queue_destination(point)
	check(queued, "Destination rejected before routing: %s" % point)
	if not queued:
		return
	for i: int in max_frames:
		await frames(tree, 1)
		if not is_instance_valid(world) or not world.is_inside_tree() or world.transition_locked or world.panel_open:
			return
		if world.navigation_ready and (world.player.global_position.distance_to(point) < 5 or (i > 10 and not world.player.path_active)):
			return

func check_system_bar(tree: SceneTree, main: Node) -> void:
	var strip: PanelContainer = main._world.get_node("HUD/SystemBar")
	var row: HBoxContainer = strip.get_node("SystemRow")
	check(strip.anchor_left == 0.0 and strip.anchor_right == 1.0, "System bar must span the full viewport width")
	check(strip.anchor_bottom == 1.0 and strip.offset_bottom == 0.0 and strip.offset_left == 0.0 and strip.offset_right == 0.0, "System bar must sit flush with the bottom screen edge")
	check(strip.grow_vertical == Control.GROW_DIRECTION_BEGIN, "System bar must grow upward from the bottom edge")
	var reserved: Control = main._world.get_node("HUD/Margin/Stack/BarSpace")
	check(ceilf(strip.size.y) > 0.0 and ceilf(reserved.custom_minimum_size.y) == ceilf(strip.size.y), "HUD stack must reserve the live system bar height")
	check(row.get_node("MenuButton").text == "MENU", "System bar must host the settings entry")
	var vitals: VBoxContainer = row.get_node("Vitals")
	check(vitals.get_child_count() == 3, "System bar must show three vital pools")
	var hero: Dictionary = main.observation().hero
	for pool: int in 3:
		var vital: ProgressBar = vitals.get_child(pool)
		check(int(vital.max_value) == int(hero.maximum[pool]), "Vital %d maximum must mirror the observation" % pool)
		check(int(vital.value) == int(hero.current[pool]), "Vital %d value must mirror the observation" % pool)
	var exp_row: HBoxContainer = row.get_node("CenterColumn/ExpRow")
	var exp_bar: ProgressBar = exp_row.get_node("ExpBar")
	var rules := preload("res://scripts/domain/rules/progression_rules.gd")
	check(int(exp_bar.max_value) == int(rules.CONFIG.xp_to_next[0]), "Experience bar must track the first level requirement")
	check(is_equal_approx(float(exp_bar.value), 0.0), "Experience bar must start empty")
	check(exp_row.get_node("Lv").text == "Lv 1", "Level label must mirror growth")
	var windows: HBoxContainer = row.get_node("CenterColumn/WindowButtons")
	var world: Node2D = main._world
	# Journal launchers route through Main's progression flow; without
	# progression they must surface the gated expedition notice. Placeholders
	# must open nothing. Both must return focus to the world.
	var expected := {"Character": true, "Skills": true, "Quests": false, "Inventory": true, "Pets": false}
	check(windows.get_child_count() == expected.size(), "Window launcher set changed")
	for window_button: Button in windows.get_children():
		check(expected.has(window_button.text), "Unexpected window launcher %s" % window_button.text)
		window_button.grab_focus()
		window_button.pressed.emit()
		if expected[window_button.text]:
			check(world.panel_open, "%s launcher did not open the journal flow" % window_button.text)
			check(not is_instance_valid(main._progression_view), "Gated journal launcher opened the journal without progression")
			world.close_panel()
			check(not world.panel_open, "Gated journal notice must close")
		else:
			check(not world.panel_open, "Placeholder launcher %s opened a window" % window_button.text)
		check(main.get_viewport().gui_get_focus_owner() == null, "Launcher %s must return focus to the world" % window_button.text)
	check(not is_instance_valid(main._progression_view) and not is_instance_valid(main._dialogue), "Launcher opened an unexpected window")
	var menu_button: Button = row.get_node("MenuButton")
	menu_button.pressed.emit()
	check(is_instance_valid(main._settings_panel), "System bar settings entry did not open settings")
	await frames(tree, 2)
	check(main.get_viewport().gui_get_focus_owner() == main._settings_panel._close, "Settings panel must take initial focus")
	main._close_settings()
	await frames(tree)
	check(not is_instance_valid(main._settings_panel), "Settings panel must close")
	check(not main._world.transition_locked, "Settings flow must release the world")

func run(tree: SceneTree) -> PackedStringArray:
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.progression_enabled = false # Preserve the pre-progression contract fixture.
	main.persistence_enabled = false
	tree.root.add_child(main)
	await frames(tree)
	main.request_mode(Mode.LOADING, 1, main.observation().revision)
	await settle_world(tree, main)
	var world: Node2D = main._world
	check(world.player.global_position.distance_to(Vector2(96,160)) < 1, "Spawn restoration must happen after map sync")
	check(world.visible_markers().size() == 2, "Town markers must be fully observable")
	check(world.phantom.follow_target == world.player, "Phantom Camera must bind current player")
	await check_system_bar(tree, main)
	var detached := main.observation()
	detached.exploration.discovered.append("room.secret")
	check(not world.discovered.has("room.secret"), "Exploration observation leaked mutable discovery")
	var keeper: Node2D = world.get_node("Rooms/Haven/Keeper")
	keeper.position = Vector2(-8,160)
	world.player.global_position = Vector2(10,160)
	await frames(tree,2)
	check(not world.interaction_is_valid("npc.keeper"), "NPC interaction crossed an obstructing wall")
	keeper.position = Vector2(208,112)
	world.player.global_position = Vector2(96,160)
	await frames(tree,2)
	check(not world.interaction_is_valid("npc.keeper"), "Distant NPC interaction accepted")
	await walk(tree, world, Vector2(208,112))
	await frames(tree)
	check(is_instance_valid(main._dialogue), "NPC approach did not open dialogue")
	main._close_dialogue()
	await frames(tree)
	var before: Vector2 = world.player.global_position
	world.show_panel("Test panel", "Blocking input fixture")
	Input.action_press("move_right")
	await frames(tree, 12)
	check(world.player.global_position.distance_to(before) < 0.1, "Panel allowed held movement")
	check(not world.queue_destination(Vector2(300,160)), "Panel accepted world tap")
	world.close_panel()
	Input.action_release("move_right")
	await frames(tree)
	main.set_application_focused(false)
	Input.action_press("move_right")
	await frames(tree, 12)
	check(world.player.global_position.distance_to(before) < 0.1, "Focus loss allowed movement")
	main.set_application_focused(true)
	Input.action_release("move_right")
	await frames(tree)
	await walk(tree, world, Vector2(416,160))
	await frames(tree)
	# Fixture scaffolding: a survivable hero so the sweep can win every bound
	# guardian, including the optional twin-enemy watch, without potions.
	main._session.hero.maximum[0] = 200
	main._session.hero.current[0] = 200
	main._confirm_service("enter_dungeon","",1,main._session.revision,main._dialogue_serial)
	await settle_world(tree, main)
	check(main.observation().mode == Mode.DUNGEON, "Town entrance did not enter dungeon")
	world = main._world
	var dungeon_vitals: VBoxContainer = world.get_node("HUD/SystemBar/SystemRow/Vitals")
	check(int(dungeon_vitals.get_child(0).value) == 200, "Dungeon HUD vitals did not re-present hero pools")
	var expedition: RefCounted = main._session.exploration
	check(world.discovered == [world.entry_room_id()], "New dungeon revealed extra rooms")
	check(world.visible_markers().is_empty(), "Hidden encounter leaked into observation")
	var hidden_rendered := false
	for room: Node2D in world.get_node("Rooms").get_children():
		if not world.discovered.has(room.room_id) and room.visible: hidden_rendered = true
	check(not hidden_rendered, "Unknown room was rendered")
	check(not main.request_mode(Mode.BATTLE,1,main.observation().revision), "Battle entered without encounter authorization")
	check(world.queue_destination(Vector2(800,160)), "Visible input should queue for validation")
	await frames(tree, 12)
	check(not world.player.path_active and world.player.global_position.distance_to(Vector2(96,160)) < 1, "Route entered hidden space")
	world.queue_destination(Vector2(-500,-500))
	await frames(tree, 5)
	check(not world.player.path_active, "Out-of-map target remained active")
	Input.action_press("move_left")
	await frames(tree, 70)
	Input.action_release("move_left")
	check(world.player.global_position.x >= 7.8, "Keyboard crossed wall collision")
	# Sweep the generated chain room by room: doorway reveals, every bound
	# guardian, then the exit arch. All of it follows the saved stable ids.
	var first_room: String = str(expedition.rooms[1].room_id)
	await walk(tree, world, Vector2(430,160))
	await settle_world(tree, main)
	check(world.discovered.has(first_room), "Doorway approach did not reveal the next room")
	var first_bindings := _bindings_in(expedition, first_room)
	check(world.visible_markers().size() == first_bindings.size(), "Discovery exposed wrong encounter count")
	# A revealed but disconnected authored region must not become a teleport.
	var revealed: Node2D = _room_node(world, first_room)
	revealed.position.y = 600
	world._sync_navigation()
	await settle_world(tree,main)
	world.queue_destination(Vector2(650,760))
	await frames(tree,8)
	check(not world.player.path_active, "Disconnected navigation target remained active")
	revealed.position.y = 0
	world._sync_navigation()
	await settle_world(tree,main)
	await walk(tree, world, Vector2(650,160))
	check(world.player.global_position.distance_to(Vector2(650,160)) < 5, "Navigation failed narrow connector")
	var exit_room: String = str(expedition.exit_room_id)
	check(not world.discovered.has(exit_room) or exit_room == first_room, "Route revealed distant room")
	var token := main.observation()
	var first_id: String = str(first_bindings[0].encounter_id) if not first_bindings.is_empty() else ""
	main._world_interaction(first_id,"encounter",token.session_id,token.revision-1)
	check(main.observation().mode == Mode.DUNGEON, "Stale encounter callback accepted")
	await walk(tree, world, Vector2(1*560.0+288.0,160))
	await frames(tree)
	check(main.observation().mode == Mode.BATTLE, "Encounter did not enter separate fixture")
	var saved: Dictionary = main._session.exploration.capture()
	check(saved.active_encounter == first_id, "Wrong encounter captured")
	var combat_before: Dictionary = main.observation()
	Input.action_press("move_right")
	await frames(tree, 8)
	Input.action_release("move_right")
	check(main.observation() == combat_before, "Movement and frame updates cannot advance battle")
	main.set_application_focused(false)
	var rejected: Dictionary = main.submit_intent({"session_id":1, "expected_revision":main._session.revision, "operation_id":"unfocused", "kind":"pass", "actor_id":"hero", "skill_id":"", "target_id":""})
	check(not rejected.accepted and main.observation() == combat_before, "Unfocused battle rejects actions")
	main.set_application_focused(true)
	check(not main.request_mode(Mode.RESULTS,1,main.observation().revision), "Unfinished battle cannot escape to results")
	var battle_revision: int = main.observation().revision
	check(not main.request_mode(Mode.MENU,1,battle_revision), "Battle fixture allowed an unresolved escape")
	main._world_interaction(first_id,"encounter",token.session_id,token.revision)
	check(main.observation().revision == battle_revision, "Duplicate encounter entered twice")
	var json := JSON.stringify(saved)
	check(JSON.parse_string(json) is Dictionary, "Continuation is not JSON data")
	check(not main.complete_battle(1,battle_revision), "Unfinished battle cannot return")
	await win_battle(tree, main)
	check(not main.complete_battle(1,battle_revision), "Duplicate battle outcome accepted")
	check(main.observation().mode == Mode.DUNGEON, "Combat victory must return to dungeon")
	await settle_world(tree, main)
	world = main._world
	check(world.player.global_position.distance_to(Vector2(saved.position.x,saved.position.y)) < 1, "Return lost saved position")
	for marker: Node2D in world.visible_markers():
		check(not world.resolved.has(marker.stable_id), "Resolved encounter survived / hidden encounter leaked")
	check(world.phantom.follow_target == world.player, "Camera retained old player")
	check(main._session.exploration.resolved == [first_id], "Outcome removed unrelated encounter")
	# Continue through the remaining rooms: reveal each doorway, fight whatever
	# guardian the saved layout binds there, then leave through the exit arch.
	for index: int in range(2, expedition.rooms.size()):
		var room_id: String = str(expedition.rooms[index].room_id)
		if not is_instance_valid(world): world = main._world
		if not is_instance_valid(world): break
		if not world.discovered.has(room_id):
			await walk(tree, world, Vector2((index-1)*560.0+448.0,160))
			await settle_world(tree, main)
			world = main._world
			check(world.discovered.has(room_id), "Second doorway did not reveal " + room_id)
		var bound := _bindings_in(expedition, room_id)
		if bound.is_empty(): continue
		var local_x := 240.0 if room_id == "room.nave" else 288.0
		await walk(tree, world, Vector2(index*560.0+local_x,160))
		await frames(tree)
		check(main.observation().mode == Mode.BATTLE, "Second encounter did not trigger")
		await win_battle(tree, main)
		await settle_world(tree,main)
		world = main._world
	check(main._session.exploration.resolved.size() == expedition.bindings.size(), "Sweep resolved every bound guardian")
	if not is_instance_valid(world): world = main._world
	check(is_instance_valid(world) and main.observation().mode == Mode.DUNGEON, "Sweep ends back in the generated dungeon")
	if is_instance_valid(world) and main.observation().mode == Mode.DUNGEON:
		var exit_index := _room_index(expedition, exit_room)
		await walk(tree,world,Vector2(exit_index*560.0+432.0,160))
		await frames(tree)
		check(main.observation().mode == Mode.RESULTS, "Resolved dungeon exit did not reach results")
		var expected_gold := 0
		for id: String in main._session.exploration.resolved:
			expected_gold += main._catalog.definition(id).pending_gold
		check(main._session.hero.committed_gold == expected_gold and main._session.exploration.pending_gold == 0, "Exit commits pending gold once")
	# Physics-rate tolerance, independent camera rebind and viewport conversion.
	for hz: int in [30, 120]:
		Engine.physics_ticks_per_second = hz
		var viewport := SubViewport.new()
		viewport.size = Vector2i(960,540) if hz == 30 else Vector2i(1920,720)
		viewport.world_2d = World2D.new()
		tree.root.add_child(viewport)
		var scene: Node2D = load("res://scenes/exploration/dungeon.tscn").instantiate()
		scene.configure(7,9,{},func(id: int, rev: int) -> bool: return id == 7 and rev == 9)
		viewport.add_child(scene)
		for i: int in 180:
			await frames(tree,1)
			if scene.navigation_ready: break
		check(scene.navigation_ready, "Rate fixture navigation sync")
		await frames(tree,4)
		var initial_screen: Vector2 = scene.get_canvas_transform() * scene.player.global_position
		check(Rect2(Vector2.ZERO,Vector2(viewport.size)).grow(-20).has_point(initial_screen), "Initial dungeon camera clipped restored hero")
		# Stay well away from interaction triggers.
		scene.player.global_position = Vector2(96,240)
		Input.action_press("move_right")
		await frames(tree,hz / 2)
		Input.action_release("move_right")
		check(absf(scene.player.global_position.x - 166.0) < 10, "Movement speed varies with physics tick rate")
		var hero_screen: Vector2 = scene.get_canvas_transform() * scene.player.global_position
		check(Rect2(Vector2.ZERO,Vector2(viewport.size)).grow(-20).has_point(hero_screen), "Camera limit framing clipped hero in resized viewport")
		var target := Vector2(260,240)
		var screen: Vector2 = scene.get_canvas_transform() * target
		var tap := InputEventScreenTouch.new()
		tap.position = screen
		tap.pressed = true
		scene._unhandled_input(tap)
		await frames(tree,hz)
		check(scene.player.global_position.distance_to(target) < 5, "Tap did not convert through resized camera")
		var position: Vector2 = scene.player.global_position
		scene.show_panel("Input ownership", "Fixture")
		tap.position = Vector2(0,0)
		scene._unhandled_input(tap)
		await frames(tree,4)
		check(scene.player.global_position.distance_to(position) < 0.1, "Panel-owned touch leaked")
		scene.close_panel()
		viewport.queue_free()
		await frames(tree,3)
	Engine.physics_ticks_per_second = 60
	main.queue_free()
	await frames(tree)
	print("EXPLORATION_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

func win_battle(tree: SceneTree, main: Node) -> void:
	var fixture := preload("res://tests/unit/combat_fixture.gd").new()
	fixture.catalog = main._catalog
	for activation: int in 60:
		if main._session.battle.phase == 3: break
		if main._session.battle.active_actor_id == "hero":
			var target := "enemy.0"
			for i: int in main._session.battle.enemies.size():
				if main._session.battle.enemies[i].current[0] > 0:
					target = "enemy.%d" % i
					break
			var kind: String = "pass" if main._session.hero.current[2] < 5 else "select_skill"
			var cmd: RefCounted = fixture.command(main._session,kind,"skill.sword",target)
			var intent := {"session_id":cmd.session_id,"expected_revision":cmd.expected_revision,"operation_id":"integration:%d" % cmd.expected_revision,
				"kind":kind,"actor_id":"hero","skill_id":"skill.sword","target_id":target}
			check(main.submit_intent(intent).accepted,"Combat integration selection/pass")
			if kind == "select_skill":
				for action: String in ["roll","commit"]:
					intent.expected_revision = main._session.revision
					intent.operation_id = "integration:%d" % main._session.revision
					intent.kind = action
					check(main.submit_intent(intent).accepted,"Combat integration " + action)
		await frames(tree,1)
	check(main._session.battle.outcome == "victory","Real command-driven encounter victory")
	check(main.complete_battle(main._session.session_id,main._session.revision),"Completed battle return")
