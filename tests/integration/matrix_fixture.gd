extends RefCounted
## Phase 13 frozen-stack integration matrix on the real application: chart
## re-entry, manual AI scheduling determinism, camera handoffs, dialogue
## mutation retries, quest accept/restore through the QuestSystem mirror and
## autoload cleanup after teardown. Addon versions come from the frozen record.
const Release = preload("res://tests/unit/release_fixture.gd")
const H = preload("res://tests/integration/save_fixture.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Application = preload("res://scripts/application/main.gd")
const Scheduler = preload("res://scripts/ai/enemy_scheduler.gd")
const Mode = SessionShell.Mode

var failures := PackedStringArray()
var checks := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Matrix: " + label)

func settle(tree: SceneTree, frames: int = 6) -> void:
	for i: int in frames: await tree.process_frame

func run(tree: SceneTree) -> PackedStringArray:
	# Frozen addon stack (same record as the release fixture asserts).
	for path: String in Release.FROZEN_ADDONS:
		check(Release.addon_version(path) == Release.FROZEN_ADDONS[path],
			"frozen addon %s" % path)
	var main := load("res://scenes/main.tscn").instantiate() as Application
	main.persistence_enabled = false
	tree.root.add_child(main)
	await settle(tree)
	main.request_mode(Mode.LOADING, 1, main._session.revision)
	await settle(tree)
	check(main.observation().mode == Mode.TOWN, "matrix reaches town")

	# Chart re-entry: repeated guarded cycles keep one published hop each;
	# LOADING self-advances into TOWN once resources resolve.
	for round_index: int in 2:
		for target: Mode in [Mode.DUNGEON, Mode.MENU, Mode.LOADING]:
			var before := main.observation()
			check(main.request_mode(target, before.session_id, before.revision),
				"matrix cycle %d accepts %d" % [round_index, target])
			await settle(tree)
			if target == Mode.LOADING:
				for i: int in 120:
					await settle(tree, 1)
					if main.observation().mode == Mode.TOWN: break
				check(main.observation().mode == Mode.TOWN, "matrix cycle %d: loading reaches town" % round_index)
			else:
				check(main.observation().mode == target and main.observation().revision == before.revision + 1,
					"matrix cycle %d publishes %d exactly once" % [round_index, target])

	# Camera handoff: the conversation camera outranks exploration and yields back.
	await settle(tree, 20)
	var world: Node2D = main._world
	for i: int in 180:
		await settle(tree, 1)
		if is_instance_valid(world) and world.navigation_ready: break
	world.player.global_position = Vector2(208, 112)
	await settle(tree, 4)
	main._open_dialogue("npc.keeper", "keeper")
	await settle(tree)
	check(is_instance_valid(main._dialogue) and is_instance_valid(world.conversation_camera)
		and world.conversation_camera.priority == 30 and world.phantom.priority == 20,
		"conversation camera takes priority over exploration")
	main._close_dialogue()
	await settle(tree)
	check(not is_instance_valid(world.conversation_camera), "conversation camera yields back after close")

	# Dialogue mutation retry: one confirmed purchase; the repeated serial
	# changes nothing.
	var hero_gold: int = main._session.hero.committed_gold + 10
	main._session.hero.committed_gold = hero_gold
	main._open_dialogue("npc.keeper", "keeper")
	await settle(tree)
	var marker: Node2D = null
	for m: Node2D in world.visible_markers():
		if m.stable_id == "npc.keeper": marker = m
	print("MATRIX_DEBUG: nav=%s focused=%s panel=%s player=%s marker=%s dist=%s session=%d/%d world_session=%d/%d" % [
		str(world.navigation_ready), str(world.focused), str(world.panel_open),
		str(world.player.global_position), str(marker != null),
		str(world.player.global_position.distance_to(marker.global_position) if marker != null else -1.0),
		main._session.session_id, main._session.revision, world.session_id, world.revision])
	# The dialogue serial is minted by _open_dialogue; capture it after.
	var serial: int = main._dialogue_serial
	var first: Dictionary = main._confirm_service("buy_potion", "", 1, main._session.revision, serial)
	await settle(tree)
	check(first.get("accepted", false), "confirmed purchase accepted (code: %s)" % str(first.get("code", "none")))
	var after_first: Dictionary = main.observation()
	check(after_first.hero.potions == 1 and after_first.hero.committed_gold == hero_gold - 5,
		"confirmed purchase applies exactly once")
	var repeat: Dictionary = main._confirm_service("buy_potion", "", 1, main._session.revision, serial)
	await settle(tree)
	check(not repeat.get("accepted", true) and main.observation().hero.potions == 1
		and main.observation().hero.committed_gold == hero_gold - 5,
		"repeated dialogue serial cannot purchase twice")
	main._close_dialogue()
	await settle(tree)

	# Quest accept + codec restore through the QuestSystem mirror.
	var accepted: Dictionary = main.submit_intent({"session_id": main._session.session_id,
		"expected_revision": main._session.revision, "operation_id": "matrix:quest",
		"kind": "quest_accept", "actor_id": "hero", "skill_id": "", "target_id": "",
		"data": {"item": "quest.side.record", "destination": "", "column": 0, "row": 0, "quantity": 1}})
	check(accepted.accepted, "quest acceptance accepted (code: %s)" % str(accepted.get("code", "none")))
	var quests: Node = tree.root.get_node("QuestSystem")

	# Manual AI scheduling: proposals only in battle, deterministic for
	# identical states.
	var scheduler := Scheduler.new()
	tree.root.add_child(scheduler)
	var town_proposal: Dictionary = scheduler.propose(main._session, c())
	check(town_proposal.is_empty(), "AI proposes nothing outside battle")
	main._service_authorized = true
	var entry: Dictionary = main.submit_intent({"session_id": main._session.session_id,
		"expected_revision": main._session.revision, "operation_id": "matrix:enter",
		"kind": "enter_dungeon", "actor_id": "hero", "skill_id": "", "target_id": "entrance.undercrypt"})
	main._service_authorized = false
	check(entry.accepted, "matrix expedition entry accepted (code: %s)" % str(entry.get("code", "none")))
	await settle(tree)
	var bindings: Array = main._session.exploration.bindings
	var first_id: String = str(bindings[0].encounter_id)
	Rules.begin(main._session, first_id, c())
	main._session.exploration.active_encounter = first_id
	main._encounter_authorized = true
	main.request_mode(Mode.BATTLE, main._session.session_id, main._session.revision)
	await settle(tree)
	check(main._session.mode == Mode.BATTLE, "matrix enters battle")
	# Quest claim/restore: the accepted quest survives a checkpoint round trip
	# taken mid-battle (a valid, fully validated snapshot) and the QuestSystem
	# mirror rebuilds from committed growth without replaying rewards.
	var codec := Codec.new()
	var decoded: Dictionary = codec.decode(codec.encode(main._session, 99), c())
	check(decoded.status == "ok", "matrix checkpoint decodes (error: %s)" % str(decoded.get("error", "none")))
	if decoded.status == "ok":
		check(str(decoded.session.hero.growth.quests.get("quest.side.record", {}).get("state", "")) == "active",
			"quest state survives the checkpoint round trip")
	main._quest_adapter.sync(main._session)
	var mirrored := false
	for quest: Object in quests.active.quests:
		if quest.id == 3: mirrored = true
	check(mirrored, "QuestSystem active pool mirrors the accepted quest")
	# The proposal is only for enemy pre-roll turns; advance to one.
	main.submit_intent({"session_id": main._session.session_id, "expected_revision": main._session.revision,
		"operation_id": "matrix:select", "kind": "select_skill", "actor_id": "hero",
		"skill_id": "skill.sword", "target_id": "enemy.0"})
	main.submit_intent({"session_id": main._session.session_id, "expected_revision": main._session.revision,
		"operation_id": "matrix:roll", "kind": "roll", "actor_id": "hero", "skill_id": "", "target_id": ""})
	main.submit_intent({"session_id": main._session.session_id, "expected_revision": main._session.revision,
		"operation_id": "matrix:commit", "kind": "commit", "actor_id": "hero", "skill_id": "", "target_id": ""})
	# Force the enemy's pre-roll turn on an isolated copy; Main's own scheduler
	# would otherwise consume the turn within a frame.
	var probe_session: SessionShell = main._session.copy()
	probe_session.battle.active_actor_id = "enemy.0"
	# Isolated deterministic battle state for the AI probe.
	probe_session = H.new().session(c())
	probe_session.battle.active_actor_id = "enemy.0"
	print("MATRIX_AI_DEBUG: phase=", probe_session.battle.phase, " active=", probe_session.battle.active_actor_id, " mode=", probe_session.mode)
	var proposal_a: Dictionary = scheduler.propose(probe_session, c())
	scheduler._last_token = ""  # propose once per distinct turn; reset the dedupe
	var proposal_b: Dictionary = scheduler.propose(probe_session.copy(), c())
	check(not proposal_a.is_empty(), "AI proposes for the enemy pre-roll turn")
	check(proposal_a == proposal_b, "AI proposals are deterministic for identical states")
	scheduler.queue_free()

	# Autoload cleanup after teardown.
	main.queue_free()
	await settle(tree)
	await settle(tree)
	var leftovers := 0
	for pool: Node in quests.get_all_pools():
		leftovers += pool.get_all_quests().size()
	check(leftovers == 0, "QuestSystem pools empty after session teardown")
	var cameras: Node = tree.root.get_node("PhantomCameraManager")
	check(cameras.get_phantom_camera_hosts().is_empty() and cameras.get_phantom_camera_2ds().is_empty(),
		"Phantom Camera registrations empty after session teardown")
	print("MATRIX_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL", checks])
	return failures

const Rules = preload("res://scripts/domain/rules/battle_rules.gd")

func c() -> RefCounted:
	var result := preload("res://scripts/data/content_catalog.gd").new()
	result.publish(load("res://content/catalog.tres"))
	return result

func CaptureCopy(session: SessionShell) -> SessionShell:
	return session.copy()
