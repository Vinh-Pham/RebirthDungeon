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

func run(tree: SceneTree) -> PackedStringArray:
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	tree.root.add_child(main)
	await frames(tree)
	main.request_mode(Mode.LOADING, 1, main.observation().revision)
	await settle_world(tree, main)
	var world: Node2D = main._world
	check(world.player.global_position.distance_to(Vector2(96,160)) < 1, "Spawn restoration must happen after map sync")
	check(world.visible_markers().size() == 2, "Town markers must be fully observable")
	check(world.phantom.follow_target == world.player, "Phantom Camera must bind current player")
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
	check(world.panel_open, "NPC approach did not open proximity fixture")
	world.close_panel()
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
	await settle_world(tree, main)
	check(main.observation().mode == Mode.DUNGEON, "Town entrance did not enter dungeon")
	world = main._world
	check(world.discovered == ["room.threshold"], "New dungeon revealed extra rooms")
	check(world.visible_markers().is_empty(), "Hidden encounter leaked into observation")
	check(not world.get_node("Rooms/Gallery").visible, "Unknown room was rendered")
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
	await walk(tree, world, Vector2(430,160))
	await settle_world(tree, main)
	check(world.discovered.has("room.gallery"), "Doorway approach did not reveal gallery")
	check(world.visible_markers().size() == 1, "Discovery exposed wrong encounter count")
	# A revealed but disconnected authored region must not become a teleport.
	var gallery: Node2D = world.get_node("Rooms/Gallery")
	gallery.position.y = 600
	world._sync_navigation()
	await settle_world(tree,main)
	world.queue_destination(Vector2(650,760))
	await frames(tree,8)
	check(not world.player.path_active, "Disconnected navigation target remained active")
	gallery.position.y = 0
	world._sync_navigation()
	await settle_world(tree,main)
	await walk(tree, world, Vector2(650,160))
	check(world.player.global_position.distance_to(Vector2(650,160)) < 5, "Navigation failed narrow connector")
	check(not world.discovered.has("room.sanctum"), "Route revealed distant room")
	var token := main.observation()
	main._world_interaction("encounter.gallery","encounter",token.session_id,token.revision-1)
	check(main.observation().mode == Mode.DUNGEON, "Stale encounter callback accepted")
	await walk(tree, world, Vector2(848,160))
	await frames(tree)
	check(main.observation().mode == Mode.BATTLE, "Encounter did not enter separate fixture")
	var saved: Dictionary = main._session.exploration.capture()
	check(saved.active_encounter == "encounter.gallery", "Wrong encounter captured")
	var battle_revision: int = main.observation().revision
	check(not main.request_mode(Mode.MENU,1,battle_revision), "Battle fixture allowed an unresolved escape")
	main._world_interaction("encounter.gallery","encounter",token.session_id,token.revision)
	check(main.observation().revision == battle_revision, "Duplicate encounter entered twice")
	var json := JSON.stringify(saved)
	check(JSON.parse_string(json) is Dictionary, "Continuation is not JSON data")
	check(main.resolve_encounter_fixture(1,battle_revision), "Fixture outcome rejected")
	check(not main.resolve_encounter_fixture(1,battle_revision), "Duplicate fixture outcome accepted")
	check(not main._world.navigation_ready, "Replacement enabled before navigation sync")
	await settle_world(tree, main)
	world = main._world
	check(world.player.global_position.distance_to(Vector2(saved.position.x,saved.position.y)) < 1, "Return lost saved position")
	check(world.visible_markers().is_empty(), "Resolved encounter survived / hidden encounter leaked")
	check(world.phantom.follow_target == world.player, "Camera retained old player")
	check(main._session.exploration.resolved == ["encounter.gallery"], "Outcome removed unrelated encounter")
	await walk(tree, world, Vector2(990,160))
	await settle_world(tree,main)
	check(world.discovered.size() == 3, "Second doorway did not reveal sanctum")
	await walk(tree, world, Vector2(1408,160))
	await frames(tree)
	check(main.observation().mode == Mode.BATTLE, "Second encounter did not trigger")
	main.resolve_encounter_fixture(1,main.observation().revision)
	await settle_world(tree,main)
	world = main._world
	await walk(tree,world,Vector2(1552,160))
	await frames(tree)
	check(main.observation().mode == Mode.RESULTS, "Resolved dungeon exit did not reach results")
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
