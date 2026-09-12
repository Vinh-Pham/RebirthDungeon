extends RefCounted

const Mode = SessionShell.Mode

func _settle(tree: SceneTree) -> void:
	for frame: int in 4:
		await tree.process_frame

func run(tree: SceneTree) -> PackedStringArray:
	var failures := PackedStringArray()
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	tree.root.add_child(main)
	await _settle(tree)
	var initial := main.observation()
	if not InputMap.has_action(&"shell_back") or not Input.emulate_mouse_from_touch:
		failures.append("Application input map / touch routing not installed")
	var action_count := InputMap.action_get_events(&"shell_back").size()
	preload("res://scripts/application/shell_input_map.gd").configure()
	if InputMap.action_get_events(&"shell_back").size() != action_count:
		failures.append("Repeated input setup duplicated bindings")
	var copy := main.observation()
	copy.mode = Mode.BATTLE
	if main.observation() != initial:
		failures.append("Observation leaked mutable session state")
	if main.request_mode(Mode.BATTLE, initial.session_id, initial.revision):
		failures.append("Illegal menu-to-battle command accepted")
	var chart := main.get_node("ModeChart") as StateChart
	chart.send_event(&"to_1")
	await _settle(tree)
	if main.observation() != initial:
		failures.append("Unauthorized chart event changed session")
	main.set_application_focused(false)
	if main.request_mode(Mode.LOADING, initial.session_id, initial.revision):
		failures.append("Unfocused input accepted")
	main.set_application_focused(true)
	main.required_resource_overrides = {"res://assets/art/dungeon_mark.svg": "res://assets/art/missing_fixture.svg"}
	main.request_mode(Mode.LOADING, initial.session_id, initial.revision)
	await _settle(tree)
	var blocked := main.observation()
	if blocked.mode != Mode.LOADING or not main.loading_error.contains("missing_fixture.svg"):
		failures.append("Missing required resource must visibly block loading")
	if main.request_mode(Mode.TOWN, blocked.session_id, blocked.revision):
		failures.append("Loading failure allowed town entry")
	main.request_mode(Mode.MENU, blocked.session_id, blocked.revision)
	await _settle(tree)
	main.required_resource_overrides.clear()
	for cycle: int in 3:
		var before := main.observation()
		var old_view := main.get_node("UI/UIHost/Layout/ModeHost/ModeView") as ShellModeView
		var stale_callback: Callable = main._on_intent.bind(Mode.LOADING, before.session_id, before.revision, weakref(old_view))
		if not main.request_mode(Mode.LOADING, before.session_id, before.revision):
			failures.append("Valid loading request rejected")
		if main.request_mode(Mode.LOADING, before.session_id, before.revision):
			failures.append("Duplicate command accepted")
		stale_callback.call()
		await _settle(tree)
		stale_callback.call() # The former view has now been freed.
		var after := main.observation()
		if after.mode != Mode.TOWN or after.revision != before.revision + 2 or after.session_id != initial.session_id:
			failures.append("Loading/town must enter exactly once without losing session")
		if main.request_mode(Mode.DUNGEON, before.session_id, before.revision):
			failures.append("Stale revision accepted")
		if main.request_mode(Mode.DUNGEON, after.session_id + 1, after.revision):
			failures.append("Wrong session accepted")
		for target: int in [Mode.DUNGEON, Mode.RESULTS, Mode.TOWN, Mode.MENU]:
			before = main.observation()
			if not main.request_mode(target, before.session_id, before.revision):
				failures.append("Legal fixture navigation rejected: %d" % target)
			await _settle(tree)
			after = main.observation()
			if after.mode != target or after.revision != before.revision + 1:
				failures.append("Mode transition must publish exactly once")
			if main.get_node("UI/UIHost/Layout/ModeHost").get_child_count() != 1:
				failures.append("Old mode view survived replacement")
	main.development_enabled = false
	var before := main.observation()
	if main.request_mode(Mode.LOADING, before.session_id, before.revision):
		failures.append("Development destinations exposed with development disabled")
	main.queue_free()
	await _settle(tree)
	print("SHELL_FIXTURE: %s" % ("PASS" if failures.is_empty() else "FAIL"))
	return failures
