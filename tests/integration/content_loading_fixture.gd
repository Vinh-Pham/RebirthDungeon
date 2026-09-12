extends RefCounted
const Application = preload("res://scripts/application/main.gd")
const Mode = SessionShell.Mode

func _settle(tree: SceneTree) -> void:
	for frame: int in 5:
		await tree.process_frame

func run(tree: SceneTree) -> PackedStringArray:
	var failures: PackedStringArray = []
	var main := load("res://scenes/main.tscn").instantiate() as Application
	main.persistence_enabled = false
	main.catalog_path = "res://tests/fixtures/invalid_catalog.tres"
	tree.root.add_child(main)
	await _settle(tree)
	if main.observation().hero != {} or not main.loading_error.contains("schema_version"):
		failures.append("Invalid required content must not publish a hero")
	var state := main.observation()
	main.request_mode(Mode.LOADING, state.session_id, state.revision)
	await _settle(tree)
	var label := main.get_node("UI/UIHost/Layout/ModeHost/ModeView/Description") as Label
	if label == null or not label.text.contains("schema_version"):
		failures.append("Catalog diagnostics must be visible in loading UI")
	state = main.observation()
	if state.mode != Mode.LOADING or main.request_mode(Mode.TOWN, state.session_id, state.revision):
		failures.append("Invalid catalog cannot advance into town")
	main.request_mode(Mode.MENU, state.session_id, state.revision)
	await _settle(tree)
	main.catalog_path = "res://content/catalog.tres"
	state = main.observation()
	main.request_mode(Mode.LOADING, state.session_id, state.revision)
	await _settle(tree)
	if main.observation().mode != Mode.TOWN or not main.loading_error.is_empty() or main.observation().hero.current[0] != 30:
		failures.append("Corrected content retry must initialize one hero and enter town")
	var before := main.observation()
	var rejected := main.submit_intent({"not": "a command"})
	if rejected.accepted or main.observation() != before:
		failures.append("Malformed addon intent changed authoritative application state")
	# Re-entering loading must not refill an existing runtime actor.
	main._session.hero.current[0] = 7
	state = main.observation()
	main.request_mode(Mode.MENU, state.session_id, state.revision)
	await _settle(tree)
	state = main.observation()
	main.request_mode(Mode.LOADING, state.session_id, state.revision)
	await _settle(tree)
	if main.observation().hero.current[0] != 7:
		failures.append("Reloading the catalog refilled the hero")
	# Isolated in-memory battle: no battle gameplay is exposed by the shell.
	var fixture: RefCounted = load("res://tests/unit/command_fixture.gd").new()
	main._session = fixture.make_session(main._catalog)
	var delivered: Array[Dictionary] = []
	var reentrant: Array[Dictionary] = []
	main.accepted_result.connect(func(event: Dictionary):
		delivered.append(event.duplicate(true))
		event["skill_id"] = "tampered.by.presentation"
		reentrant.append(main.submit_intent({"session_id": 1, "expected_revision": 1, "operation_id": "callback", "kind": "select_skill", "actor_id": "hero", "skill_id": "skill.sword", "target_id": "enemy.0"}))
	)
	var intent := {"session_id": 1, "expected_revision": 0, "operation_id": "application.selection",
		"kind": "select_skill", "actor_id": "hero", "skill_id": "skill.sword", "target_id": "enemy.0"}
	var accepted := main.submit_intent(intent)
	if not accepted.accepted or delivered.size() != 1 or main.observation().revision != 1 or main.observation().battle.selected_skill != "skill.sword" or accepted.events[0].skill_id != "skill.sword":
		failures.append("Application must publish one accepted result with copied event data")
	if reentrant.is_empty() or reentrant[0].accepted:
		failures.append("Accepted-result callbacks must not reenter publication")
	intent.expected_revision = 1
	if main.submit_intent(intent).accepted or delivered.size() != 1:
		failures.append("Duplicate addon intent republished an event")
	main.queue_free()
	await _settle(tree)
	print("CONTENT_LOADING_FIXTURE: %s" % ("PASS" if failures.is_empty() else "FAIL"))
	return failures
