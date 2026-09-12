extends RefCounted
const Helper = preload("res://tests/integration/save_fixture.gd")
const Resolver = preload("res://scripts/domain/commands/command_resolver.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Mode = SessionShell.Mode
var failures := PackedStringArray()
var checks: int = 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label)
func command(s: SessionShell, kind: String, op: String = "") -> RefCounted:
	var target := "npc.keeper"
	if kind == "enter_dungeon": target = "entrance.undercrypt"
	elif kind == "abandon": target = "dungeon.undercrypt"
	elif kind == "use_potion": target = ""
	return Resolver.parse_intent({"session_id":s.session_id,"expected_revision":s.revision,
		"operation_id":op if not op.is_empty() else kind+str(s.revision),"kind":kind,"actor_id":"hero","skill_id":"","target_id":target})
func frames(tree: SceneTree, count: int = 6) -> void:
	for i: int in count:
		await tree.physics_frame
		await tree.process_frame
func click(node: Node, text: String) -> bool:
	if not is_instance_valid(node): return false
	for child: Node in node.get_children():
		if child is Button and child.text == text:
			child.pressed.emit()
			return true
		if click(child,text): return true
	return false

func run(tree: SceneTree) -> PackedStringArray:
	var h := Helper.new()
	var c := h.catalog()
	var s := h.session(c)
	s.battle = null
	s.exploration = null
	s.mode = Mode.TOWN
	s.hero.committed_gold = 25
	var original := Capture.capture(s)
	var purchase := Resolver.resolve(s,command(s,"buy_potion","purchase"),c)
	check(purchase.accepted and purchase.candidate.hero.potions == 1 and purchase.candidate.hero.committed_gold == 20,"Atomic potion purchase")
	check(Capture.capture(s) == original,"Purchase mutated source")
	s = purchase.candidate
	check(Resolver.resolve(s,command(s,"buy_potion","purchase"),c).code == "duplicate_operation","Purchase deduplicated")
	for i: int in 4: s = Resolver.resolve(s,command(s,"buy_potion"),c).candidate
	var before := Capture.capture(s)
	check(not Resolver.resolve(s,command(s,"buy_potion"),c).accepted and Capture.capture(s) == before,"Unaffordable purchase isolated")
	s.hero.committed_gold = 20
	check(Resolver.resolve(s,command(s,"buy_potion"),c).code == "supplies_full","Potion bound enforced")
	s.hero.current.fill(0)
	s.hero.shield = 3
	s.hero.cooldowns["skill.fortify"] = 1
	check(not Resolver.resolve(s,command(s,"enter_dungeon"),c).accepted,"Defeated hero must recover")
	s = Resolver.resolve(s,command(s,"recover"),c).candidate
	check(s.hero.current == s.hero.maximum and s.hero.shield == 0 and s.hero.cooldowns.is_empty() and s.hero.potions == 5 and s.hero.committed_gold == 20,"Free explicit recovery")
	s = Resolver.resolve(s,command(s,"enter_dungeon"),c).candidate
	check(s.mode == Mode.DUNGEON and s.exploration.pending_gold == 0,"Entry starts saved run")
	s.exploration.pending_gold = 10
	var abandoned := Resolver.resolve(s,command(s,"abandon"),c)
	check(abandoned.accepted and abandoned.candidate.exploration.pending_gold == 0 and abandoned.candidate.hero.potions == 5 and abandoned.candidate.hero.committed_gold == 20,"Abandon retention")
	check(Codec.new().decode(Codec.new().encode(abandoned.candidate,1),c).status == "ok","Abandonment resumes without battle")
	var b := h.session(c)
	b.hero.potions = 2
	b.hero.current[0] = 5
	before = Capture.capture(b)
	var potion := Resolver.resolve(b,command(b,"use_potion"),c)
	check(potion.accepted and potion.candidate.hero.potions == 1 and potion.candidate.hero.current[0] == 20,"Potion heals and consumes one")
	check(potion.candidate.battle.activation == 1 and potion.candidate.battle.active_actor_id == "enemy.0","Potion spends full activation")
	check(potion.candidate.rng.capture() == b.rng.capture() and Capture.capture(b) == before,"Potion consumes no RNG and isolates source")
	check(not Resolver.resolve(potion.candidate,command(potion.candidate,"use_potion"),c).accepted,"Enemy activation rejects potion")
	b = h.step(b,c,"select_skill","select")
	b = h.step(b,c,"roll","roll")
	before = Capture.capture(b)
	check(not Resolver.resolve(b,command(b,"use_potion"),c).accepted and Capture.capture(b) == before,"Locked potion rejected without payment")
	var doomed := h.session(c)
	doomed.hero.potions = 3
	doomed.hero.committed_gold = 20
	doomed.hero.current[0] = 1
	doomed.exploration.pending_gold = 10
	doomed.battle.active_actor_id = "enemy.0"
	var strike := command(doomed,"use_potion")
	strike.kind = "enemy_action"
	strike.actor_id = "enemy.0"
	strike.skill_id = "skill.enemy_strike"
	strike.target_id = "hero"
	var defeated := Resolver.resolve(doomed,strike,c)
	check(defeated.accepted and defeated.candidate.battle.outcome == "defeat" and defeated.candidate.exploration.pending_gold == 0,"Defeat discards pending gold")
	check(defeated.candidate.hero.potions == 3 and defeated.candidate.hero.committed_gold == 20,"Defeat retains unconsumed supplies and committed gold")
	var potion_repo := preload("res://scripts/data/save_repository.gd").new()
	potion_repo.configure("user://phase7-potion-"+str(Time.get_ticks_usec()),c)
	var original_potion := h.session(c)
	original_potion.hero.potions = 2
	original_potion.hero.current[0] = 5
	check(potion_repo.save(original_potion),"Potion source checkpoint")
	var potion_result := Resolver.resolve(original_potion,command(original_potion,"use_potion"),c)
	var gate := preload("res://scripts/application/durable_checkpoint.gd").new()
	gate.repository = potion_repo
	potion_repo.fault = "open"
	check(not gate.stage(potion_result) and potion_repo.load_checkpoint().session.hero.potions == 2,"Failed potion write keeps previous supplies")
	check(gate.retry(),"Potion retry writes retained candidate")
	var saved_potion: SessionShell = potion_repo.load_checkpoint().session
	check(saved_potion.hero.potions == 1 and saved_potion.battle.activation == 1 and saved_potion.battle.active_actor_id == "enemy.0","Potion consumption and next activation saved atomically")
	var data := Capture.capture(s)
	data.hero.potions = 6
	check(Codec.new().decode(h.rewrap(data),c).status == "corrupt","Save rejects excessive supplies")
	data = Capture.capture(s)
	data.hero.erase("potions")
	var payload := JSON.stringify(Codec.wire(data),"",true,true)
	var legacy := JSON.stringify({"format":"rebirth.session.v1","sequence":"1","payload":payload,"checksum":("rebirth.session.v1\n1\n"+payload).sha256_text()})
	var migrated := Codec.new().decode(legacy,c)
	check(migrated.status == "ok" and migrated.session.hero.potions == 0 and migrated.session.hero.committed_gold == 20,"Phase 6 migration preserves gold and grants no supplies")
	# Actual application, Dialogue Manager, camera, and durable checkpoint boundary.
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.save_directory = "user://phase7-test-"+str(Time.get_ticks_usec())
	tree.root.add_child(main)
	await frames(tree)
	main.request_mode(Mode.LOADING,1,main._session.revision)
	await frames(tree,15)
	main._session.hero.committed_gold = 20
	main.checkpoint_now()
	main._world.player.position = Vector2(208,130)
	await frames(tree,2)
	main._world_interaction("npc.keeper","npc",1,main._session.revision)
	await frames(tree)
	check(is_instance_valid(main._dialogue),"Keeper opens real Dialogue Manager")
	check(not main._world.can_move() and main._world.conversation_camera.get_priority() == 30,"Dialogue owns input and camera")
	check(click(main._dialogue,"Buy one potion — 5 gold"),"Authored buy response available")
	await frames(tree)
	check(main._session.hero.potions == 0,"Dialogue traversal grants nothing")
	main.repository.fault = "open"
	check(click(main._dialogue,"Confirm"),"Explicit purchase confirmation")
	await frames(tree)
	check(main.checkpoint.state == "failed" and main._session.hero.potions == 0 and main._session.hero.committed_gold == 20,"Failed purchase not published")
	check(main._save_overlay != null and not main._world.can_move(),"Write failure gates exploration")
	check(fresh_resume(main.save_directory,0,20,false),"Restart after failed write restores previous supplies")
	main.retry_checkpoint()
	await frames(tree,15)
	check(main._session.hero.potions == 1 and main._session.hero.committed_gold == 15,"Retry publishes purchase once")
	main.retry_checkpoint()
	check(main._session.hero.potions == 1,"Repeated retry cannot grant")
	check(fresh_resume(main.save_directory,1,15,false),"Restart after purchase preserves one grant")
	var disk: Dictionary = main.repository.load_checkpoint()
	check(disk.status == "ok" and disk.session.hero.potions == 1,"Purchase is durable")
	# Out-of-range, stale token, cancelled await, focus loss and normal dialogue end.
	main._world.player.position = Vector2(208,130)
	await frames(tree,2)
	main._open_dialogue("npc.keeper","recovery")
	var serial: int = main._dialogue_serial
	var revision: int = main._session.revision
	await frames(tree)
	main._world.player.position = Vector2(96,160)
	check(not main._confirm_service("recover",1,revision,serial).accepted,"Confirmation revalidates proximity")
	check(main._session.revision == revision,"Out-of-range service unchanged")
	main._world.player.position = Vector2(208,130)
	main._open_dialogue("npc.keeper","keeper")
	var cancel := InputEventAction.new()
	cancel.action = "shell_back"
	cancel.pressed = true
	main._dialogue._input(cancel)
	await frames(tree)
	check(not is_instance_valid(main._dialogue) and not is_instance_valid(main._world.conversation_camera),"Cancelled await releases conversation camera")
	check(not main._confirm_service("recover",1,revision,serial).accepted,"Stale conversation rejected")
	main._open_dialogue("npc.keeper","keeper")
	await frames(tree)
	check(click(main._dialogue,"Goodbye"),"Normal dialogue end response")
	await frames(tree)
	check(not is_instance_valid(main._dialogue) and main._world.phantom.get_priority() == 20,"Normal end restores exploration camera")
	main._open_dialogue("npc.keeper","keeper")
	await frames(tree)
	main.set_application_focused(false)
	check(not is_instance_valid(main._dialogue),"Focus loss dismisses without service")
	main.set_application_focused(true)
	await frames(tree)
	main._world.player.position = Vector2(208,130)
	main._session.hero.current[0] = 1
	main._open_dialogue("npc.keeper","recovery")
	await frames(tree)
	check(click(main._dialogue,"Confirm"),"Recovery confirmation")
	await frames(tree,15)
	check(main._session.hero.current == main._session.hero.maximum and main._session.hero.potions == 1,"Recovery committed with supplies retained")
	check(fresh_resume(main.save_directory,1,15,true),"Fresh-process recovery resume")
	var compact := SubViewport.new()
	compact.size = Vector2i(960,540)
	tree.root.add_child(compact)
	var balloon := preload("res://scripts/presentation/town_dialogue.gd").new()
	compact.add_child(balloon)
	balloon.start(main.observation(),"keeper",func() -> bool: return true)
	await frames(tree)
	var button_count := 0
	for child: Node in balloon._body.get_children():
		if child is Button:
			button_count += 1
			check(Rect2(Vector2.ZERO,Vector2(960,540)).encloses(child.get_global_rect()) and child.size.y >= 48,"Compact dialogue touch target fits viewport")
			check(not child.focus_next.is_empty() and not child.focus_previous.is_empty(),"Dialogue focus chain is explicit")
	check(button_count == 5,"Compact keeper choices rendered")
	compact.queue_free()
	await frames(tree)
	main._open_dialogue("npc.keeper","keeper")
	main._replace_view()
	await frames(tree)
	check(not is_instance_valid(main._dialogue),"Scene replacement cancels pending dialogue")
	main._world.player.position = Vector2(416,160)
	main._open_dialogue("entrance.undercrypt","enter")
	await frames(tree)
	check(click(main._dialogue,"Confirm"),"Dungeon entry confirmation")
	await frames(tree,15)
	check(main._session.mode == Mode.DUNGEON,"Dialogue entry durably changes mode")
	main._session.exploration.pending_gold = 10
	main.checkpoint_now()
	main._open_abandon()
	await frames(tree)
	var pending_before: int = main._session.exploration.pending_gold
	main.repository.fault = "after_write"
	check(click(main._dialogue,"Confirm"),"Explicit abandonment confirmation")
	await frames(tree)
	check(main.checkpoint.state == "failed" and main._session.exploration.pending_gold == pending_before,"Interrupted abandonment waits for publication")
	check(fresh_resume(main.save_directory,1,15,true,Mode.RESULTS),"Restart after completed write resumes abandonment without replay")
	main.retry_checkpoint()
	await frames(tree)
	check(main._session.mode == Mode.RESULTS and main._session.exploration.pending_gold == 0 and main._session.hero.potions == 1 and main._session.hero.committed_gold == 15,"Abandon retry preserves unused supplies and committed gold")
	main.request_mode(Mode.TOWN,1,main._session.revision)
	await frames(tree,15)
	check(main._session.exploration == null and main._session.battle == null,"Abandoned run returns to fresh town")
	tree.root.remove_child(main)
	main.queue_free()
	await frames(tree)
	print("TOWN_SERVICES_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

func fresh_resume(directory: String, potions: int, gold: int, full: bool, mode: int = Mode.TOWN) -> bool:
	var output: Array = []
	var code := OS.execute(OS.get_executable_path(),["--headless","--path",ProjectSettings.globalize_path("res://"),"--script","res://tests/fixtures/town_resume.gd","--",directory,str(potions),str(gold),str(full),str(mode)],output,true)
	print("SERVICE_FRESH_PROCESS: ",code," potions=",potions," gold=",gold," full=",full)
	return code == 0 and not "".join(output).contains("SCRIPT ERROR:")
