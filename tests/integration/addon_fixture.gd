extends RefCounted

func run(tree: SceneTree) -> PackedStringArray:
	preload("res://scripts/application/addon_lifecycle.gd").configure_runtime()
	var failures := PackedStringArray()
	for singleton: String in ["DialogueManager", "PhantomCameraManager", "QuestSystem"]:
		var configured: String = ProjectSettings.get_setting("autoload/" + singleton, "")
		var path := configured.trim_prefix("*")
		if not ResourceLoader.exists(path) or tree.root.get_node_or_null(singleton) == null:
			failures.append("Autoload must resolve and instantiate: " + singleton)
		print("AUTOLOAD: %s -> %s" % [singleton, ResourceUID.get_id_path(ResourceUID.text_to_id(path))])
	if not ClassDB.class_exists("BTPlayer") or not ClassDB.class_exists("BTAction"):
		failures.append("LimboAI native classes are unavailable")
		return failures
	var fixture := Node2D.new()
	fixture.name = "AddonSmoke"
	tree.root.add_child(fixture)
	# Exercise the local recursive-array compatibility patch without using chart
	# serialization as a game save. The production session remains authoritative.
	var chart := StateChart.new()
	var states := CompoundState.new()
	states.name = "Modes"
	var first_state := AtomicState.new()
	first_state.name = "First"
	var next_state := AtomicState.new()
	next_state.name = "Next"
	states.add_child(first_state)
	states.add_child(next_state)
	states.initial_state = NodePath("First")
	var transition := Transition.new()
	transition.event = &"next"
	transition.to = NodePath("../../Next")
	first_state.add_child(transition)
	chart.add_child(states)
	fixture.add_child(chart)
	await tree.process_frame
	chart.send_event(&"next")
	await tree.process_frame
	var snapshot := StateChartSerializer.serialize(chart).duplicate(true) as SerializedStateChart
	if snapshot.state.children.size() != 2 or not snapshot.state.children[1] is SerializedStateChartState:
		failures.append("State Charts serialization lost typed child resources")
	if not StateChartSerializer.deserialize(snapshot, chart).is_empty() or not next_state.active:
		failures.append("State Charts serialization round trip lost active state")
	var behavior := BehaviorTree.new()
	behavior.blackboard_plan = BlackboardPlan.new()
	behavior.root_task = load("res://tests/fixtures/addons/smoke_action.gd").new()
	var players: Array[BTPlayer] = []
	for index: int in 2:
		var player := BTPlayer.new()
		player.name = "SmokeAI%d" % index
		player.update_mode = BTPlayer.MANUAL
		player.behavior_tree = behavior
		player.set_scene_root_hint(fixture)
		fixture.add_child(player)
		players.append(player)
	for frame: int in 3:
		await tree.process_frame
	if players[0].blackboard.has_var(&"smoke_ticks"):
		failures.append("Manual AI ran without an explicit update")
	players[0].update(0.0)
	if players[0].blackboard.get_var(&"smoke_ticks", 0) != 1 or players[1].blackboard.has_var(&"smoke_ticks"):
		failures.append("LimboAI task execution / blackboard isolation failed")
	var camera := Camera2D.new()
	fixture.add_child(camera)
	var host := PhantomCameraHost.new()
	camera.add_child(host)
	var first := PhantomCamera2D.new()
	first.set_priority(10)
	fixture.add_child(first)
	var second := PhantomCamera2D.new()
	second.set_priority(20)
	fixture.add_child(second)
	await tree.process_frame
	if host.get_active_pcam() != second:
		failures.append("Phantom Camera did not select highest priority")
	second.set_priority(0)
	await tree.process_frame
	if host.get_active_pcam() != first:
		failures.append("Phantom Camera did not restore lower view")
	var authored := load("res://tests/fixtures/addons/smoke.dialogue") as DialogueResource
	var dialogue := authored.duplicate(true) as DialogueResource if authored != null else null
	if dialogue == null:
		failures.append("Dialogue Manager cue did not import")
	else:
		var manager := tree.root.get_node("DialogueManager")
		var line: DialogueLine = await manager.get_next_dialogue_line(dialogue, "start", [fixture])
		if line == null or line.text != "Addon qualification only.":
			failures.append("Dialogue Manager compiled cue did not execute")
		elif await manager.get_next_dialogue_line(dialogue, line.next_id, [fixture]) != null:
			failures.append("Dialogue Manager cue did not end")
		# 4.1.0 stores data.resource = resource: remove the self-cycle on our
		# isolated runtime copy; the loaded authored resource remains read-only.
		for data: Dictionary in dialogue.lines.values():
			data.erase("resource")
	var quests := tree.root.get_node("QuestSystem")
	var before: Array[int] = []
	for pool: Node in quests.get_all_pools():
		before.append(pool.get_all_quests().size())
	var quest := Quest.new()
	quest.id = 1900000001
	quest.quest_name = "Isolated addon smoke"
	quests.mark_quest_as_available(quest)
	quests.start_quest(quest)
	if not quests.is_quest_active(quest) or quests.is_quest_available(quest):
		failures.append("QuestSystem start pool transition failed")
	quests.complete_quest(quest)
	if quests.is_quest_completed(quest):
		failures.append("QuestSystem completed without objective evidence")
	quest.objective_completed = true
	quests.update_quest(quest)
	quests.complete_quest(quest)
	if not quests.is_quest_completed(quest) or quests.is_quest_active(quest):
		failures.append("QuestSystem completion pool transition failed")
	var index := 0
	for pool: Node in quests.get_all_pools():
		pool.remove_quest(quest)
		if pool.get_all_quests().size() != before[index]:
			failures.append("QuestSystem smoke left autoload pool state behind")
		index += 1
	fixture.queue_free()
	await tree.process_frame
	await tree.process_frame
	var cameras := tree.root.get_node("PhantomCameraManager")
	if not cameras.get_phantom_camera_hosts().is_empty() or not cameras.get_phantom_camera_2ds().is_empty():
		failures.append("Phantom Camera registrations survived fixture teardown")
	print("ADDON_SMOKE: %s" % ("PASS" if failures.is_empty() else "FAIL"))
	return failures
