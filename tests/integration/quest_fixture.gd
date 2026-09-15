extends RefCounted
const H = preload("res://tests/integration/save_fixture.gd")
const Rules = preload("res://scripts/domain/rules/progression_rules.gd")
const Repo = preload("res://scripts/data/save_repository.gd")
var failures := PackedStringArray()
var checks := 0
func check(value: bool,label: String) -> void:
	checks += 1
	if not value: failures.append("Quest integration: "+label)
func frames(tree: SceneTree, count: int = 6) -> void:
	for i: int in count:
		await tree.process_frame
func click(node: Node, text: String) -> bool:
	if not is_instance_valid(node): return false
	for child: Node in node.get_children():
		if child is Button and child.text == text:
			child.pressed.emit()
			return true
		if click(child,text): return true
	return false
func pool_ids(main: Node, pool: String) -> Array:
	var manager: Node = main.get_tree().root.get_node("QuestSystem")
	return manager.get(pool).get_ids_from_quests()
func serial_intent(main: Node, kind: String, item: String) -> void:
	var serial: int = main._progression_serial+1
	main._progression_serial = serial
	var id: int = main._session.session_id
	var revision: int = main._session.revision
	main._service_authorized = false
	main.submit_intent({"session_id":id,"expected_revision":revision,"operation_id":"qi:%s:%d:%d" % [kind,id,serial],
		"kind":kind,"actor_id":"hero","skill_id":"","target_id":"",
		"data":{"item":item,"destination":"","column":0,"row":0,"quantity":1}})
func fresh_process(directory: String, expected: Array) -> bool:
	var output: Array = []
	var args := PackedStringArray(["--headless","--path",ProjectSettings.globalize_path("res://"),"--script","res://tests/fixtures/quest_process.gd","--",directory])
	for entry: String in expected: args.append(entry)
	var code := OS.execute(OS.get_executable_path(),args,output,true)
	print("QUEST_FRESH: ",code," ",str(output[0]).strip_edges().split("\n")[0])
	return code == 0 and not str(output[0]).contains("SCRIPT ERROR")

func run(tree: SceneTree) -> PackedStringArray:
	var h := H.new()
	var c := h.catalog()
	var s := h.session(c)
	s.battle = null
	s.exploration = null
	s.mode = SessionShell.Mode.TOWN
	s.hero.committed_gold = 300
	var directory := "user://phase9-test-"+str(Time.get_ticks_usec())
	var repo := Repo.new()
	repo.configure(directory,c)
	check(repo.save(s),"initial durable profile")
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.save_directory = directory
	main.clock_provider = func() -> int: return 5000
	tree.root.add_child(main)
	await h.frames(tree,10)
	var obs := main.observation()
	main.request_mode(SessionShell.Mode.LOADING,obs.session_id,obs.revision)
	for i: int in 10: await tree.process_frame
	main.resume_checkpoint()
	await frames(tree,15)
	main.set_application_focused(true)
	# Legacy upgrade delivered the start quests; pools mirror committed state.
	check(str(main._session.hero.growth.quests.get("quest.main.seal",{}).get("state","")) == "active","Application initializes the mainstream quest")
	check(pool_ids(main,"active").has(1),"QuestSystem active pool mirrors the numeric mainstream id")
	check(pool_ids(main,"available").has(3) and pool_ids(main,"available").has(4),"QuestSystem available pool mirrors offered sidequests")
	check(not pool_ids(main,"available").has(2),"Locked successor quest stays out of every pool")
	# Journal feedback renders committed states.
	main._open_progression("Quests")
	check(is_instance_valid(main._progression_view),"Quest journal opens")
	var offered := false
	var mainstream := false
	for node: Node in main._progression_view._content.get_children():
		if node is Label:
			offered = offered or node.text.contains("Offered")
			mainstream = mainstream or node.text.contains("The Broken Seal")
	check(offered,"Journal distinguishes offered quests")
	check(mainstream,"Journal lists the mainstream chain")
	main._close_progression()
	await frames(tree,2)
	# Dialogue offer: conversation-driven acceptance through the save gate.
	main._world.player.position = Vector2(208,130)
	main._open_dialogue("npc.keeper","keeper")
	await frames(tree)
	check(click(main._dialogue,"Ask about work"),"Keeper offers work when a quest is offered")
	await frames(tree)
	check(click(main._dialogue,"Hear the keeper's offer"),"Offer cue is reachable")
	await frames(tree)
	check(click(main._dialogue,"Confirm"),"Offer confirmation")
	await frames(tree,15)
	check(str(main._session.hero.growth.quests["quest.side.record"].state) == "active","Dialogue acceptance commits through the save gate")
	check(pool_ids(main,"active").has(3) and not pool_ids(main,"available").has(3),"Accepted quest moves pools after publication")
	# Interrupted acceptance waits, resumes in a fresh process, then publishes once.
	main.repository.fault = "open"
	serial_intent(main,"quest_accept","quest.side.focus_unlock")
	check(main.checkpoint.state == "failed" and str(main._session.hero.growth.quests["quest.side.focus_unlock"].state) == "available","Interrupted acceptance keeps the live session unchanged")
	check(fresh_process(directory,["quest.main.seal:active","quest.side.record:active","quest.side.focus_unlock:available","quest.main.expedition:locked"]),"Fresh process reconstructs identical quest state and pools")
	main.retry_checkpoint()
	await frames(tree,15)
	check(str(main._session.hero.growth.quests["quest.side.focus_unlock"].state) == "active","Retry publishes the acceptance once")
	check(pool_ids(main,"active").has(4),"Retry moves the pool exactly once")
	main.repository.fault = ""
	check(fresh_process(directory,["quest.main.seal:active","quest.side.record:active","quest.side.focus_unlock:active"]),"Fresh process after retry matches without replay")
	# Session switching must not leak quest instances between sessions.
	var other := h.session(c)
	other.battle = null
	other.exploration = null
	other.mode = SessionShell.Mode.TOWN
	other.session_id = 4242
	Rules.initialize(other.hero,c)
	other.hero.growth.quests["quest.side.record"] = {"state":"claimed","stage":0,"claim":"fixture"}
	main._quest_adapter.sync(other)
	check(pool_ids(main,"completed").has(3) and not pool_ids(main,"active").has(3),"Syncing another session mirrors only its committed state")
	main._quest_adapter.sync(main._session)
	check(pool_ids(main,"active").has(3) and not pool_ids(main,"completed").has(3),"Returning to the live session restores its pools")
	# Complete level/train/rebirth cycle through the save gate, then retry a
	# failed save without duplicated rewards.
	main._service_authorized = true
	var withdraw := main.submit_intent({"session_id":main._session.session_id,"expected_revision":main._session.revision,"operation_id":"qi:withdraw",
		"kind":"bank_withdraw","actor_id":"hero","skill_id":"","target_id":"npc.keeper",
		"data":{"item":"","destination":"","column":0,"row":0,"quantity":60}})
	main._service_authorized = false
	check(withdraw.accepted,"Bank withdrawal funds the rebirth cost")
	main._session.hero.growth.level = Rules.CONFIG.xp_to_next.size()+1
	main._session.hero.growth.cumulative = 4
	var rebirth := main.submit_intent({"session_id":main._session.session_id,"expected_revision":main._session.revision,"operation_id":"qi:rebirth",
		"kind":"rebirth","actor_id":"hero","skill_id":"","target_id":"",
		"data":{"item":"talent.magic","destination":"12","column":0,"row":0,"quantity":1}})
	check(rebirth.accepted,"Rebirth commits through the save gate: "+str(rebirth.code))
	check(int(main._session.hero.growth.level) == 1 and int(main._session.hero.growth.age) == 12,"Rebirth resets life growth in the live session")
	check(int(main._session.hero.growth.cumulative) > 1 and main._session.hero.growth.quests.has("quest.main.seal"),"Rebirth preserves cumulative level and quest history")
	check(str(main._session.hero.growth.quests["quest.side.record"].state) == "active","Claims survive rebirth")
	check(pool_ids(main,"active").has(7),"Talent-rebirth trigger delivered its skill quest pool entry")
	main.repository.fault = "open"
	serial_intent(main,"quest_track","quest.main.seal")
	check(main.checkpoint.state == "failed","Failed save blocks dependent mutation")
	main.retry_checkpoint()
	await frames(tree,15)
	check(not main.checkpoint.busy() and str(main._session.hero.growth.track) == "quest.main.seal","Retry writes the same candidate exactly once")
	main.repository.fault = ""
	main.queue_free()
	await frames(tree,10)
	print("QUEST_INTEGRATION: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures