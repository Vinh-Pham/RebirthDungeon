extends RefCounted
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Resolver = preload("res://scripts/domain/commands/command_resolver.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Repository = preload("res://scripts/data/save_repository.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
var failures := PackedStringArray()
var checks: int = 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label)
func catalog() -> RefCounted:
	var result := Catalog.new()
	result.publish(load("res://content/catalog.tres"))
	return result
func session(c: RefCounted) -> SessionShell:
	var result := SessionShell.new()
	result.hero = Hero.new()
	result.hero.configure(c.definition("actor.hero"),"hero")
	result.content_versions = c.versions()
	result.mode = SessionShell.Mode.BATTLE
	result.exploration = Exploration.new()
	result.exploration.discovered.assign(["room.threshold","room.gallery"])
	result.exploration.position_x = 650.25
	result.exploration.position_y = 168.75
	Rules.begin(result,"encounter.gallery",c)
	result.exploration.active_encounter = "encounter.gallery"
	return result
func intent(s: SessionShell, kind: String, serial: String) -> Dictionary:
	var result := {"session_id":s.session_id,"expected_revision":s.revision,"operation_id":serial,
		"kind":kind,"actor_id":"hero","skill_id":"skill.fortify" if kind == "select_skill" else "","target_id":"hero" if kind == "select_skill" else ""}
	if kind in ["keep","reroll"]: result.indices = [0] if kind == "keep" else [1,2]
	return result
func step(s: SessionShell, c: RefCounted, kind: String, serial: String) -> SessionShell:
	var result := Resolver.resolve(s,Resolver.parse_intent(intent(s,kind,serial)),c)
	if not result.accepted: print("Fixture command rejected: ",kind," ",result.code)
	return result.candidate if result.accepted else null
func rewrap(data: Dictionary, sequence_value: int = 1) -> String:
	var payload := JSON.stringify(Codec.wire(data),"",true,true)
	return JSON.stringify({"format":Codec.FORMAT,"sequence":str(sequence_value),"payload":payload,
		"checksum":(Codec.FORMAT+"\n"+str(sequence_value)+"\n"+payload).sha256_text()})
func write(path: String, text: String) -> void:
	var file := FileAccess.open(path,FileAccess.WRITE)
	file.store_string(text)
	file.close()
func frames(tree: SceneTree, count: int = 6) -> void:
	for i: int in count: await tree.process_frame

func run(tree: SceneTree) -> PackedStringArray:
	var c := catalog()
	var s := session(c)
	s.session_id = 9223372036854775700
	s = step(s,c,"select_skill","select")
	s = step(s,c,"roll","roll")
	s = step(s,c,"keep","keep")
	var codec := Codec.new()
	var encoded := codec.encode(s,9007199254740993)
	var decoded := codec.decode(encoded,c)
	check(decoded.status == "ok","Locked checkpoint validates: "+codec.error)
	if decoded.status != "ok": return failures
	check(decoded.sequence == 9007199254740993,"Exact 64-bit sequence")
	check(Capture.capture(decoded.session) == Capture.capture(s),"Exact full session round trip")
	check(Capture.capture(step(decoded.session,c,"reroll","next")) == Capture.capture(step(s,c,"reroll","next")),"Restored RNG continuation")
	check(Resolver.resolve(decoded.session,Resolver.parse_intent(intent(decoded.session,"keep","keep")),c).code == "duplicate_operation","Operation deduplication survives load")
	for mutation: String in ["float_integer","bad_face","bad_kept","bad_cost","unknown_skill","nan_position","bad_mode","bad_reference","extra_field","negative_pool","bad_status","invalid_rng","layout","unfinished_mode","bad_reward","resolved_active"]:
		var data := Capture.capture(s)
		match mutation:
			"float_integer": data.revision = 3.0
			"bad_face": data.battle.hand[0] = 7
			"bad_kept": data.battle.kept = [true]
			"bad_cost": data.battle.locked_inputs.costs[2] = 99
			"unknown_skill": data.hero.skill_ranks["skill.unknown"] = "F"
			"nan_position": data.exploration.position.x = "NaN"
			"bad_mode": data.mode = 77
			"bad_reference": data.battle.enemies[0].definition_id = "room.gallery"
			"extra_field": data["node_path"] = "res://scenes/main.tscn"
			"negative_pool": data.hero.current[0] = -1
			"bad_status": data.hero.statuses = [42]
			"invalid_rng": data.rng.streams.combat.state = "9223372036854775808"
			"layout": data.exploration.layout[1].x = 600.0
			"unfinished_mode": data.mode = SessionShell.Mode.DUNGEON
			"bad_reward": data.battle.pending_gold = 999
			"resolved_active": data.exploration.resolved.append("encounter.gallery")
		check(codec.decode(rewrap(data),c).status != "ok","Reject "+mutation)
	var nonfinite := Capture.capture(s)
	nonfinite.exploration.position.x = INF
	check(codec.restore(nonfinite,c) == null,"Nonfinite coordinate rejected")
	var incompatible := Capture.capture(s)
	incompatible.content_versions.rules = 999
	check(codec.decode(rewrap(incompatible),c).status == "incompatible","Unsupported rules visible")
	check(codec.decode(encoded.left(encoded.length()/2),c).status == "corrupt","Truncated file rejected")
	var corrupt: Dictionary = JSON.parse_string(encoded)
	corrupt.checksum = "wrong"
	check(codec.decode(JSON.stringify(corrupt),c).status == "corrupt","Checksum rejected")
	var path := "user://phase6-tests-%d-%d" % [OS.get_process_id(),Time.get_ticks_usec()]
	var repo := Repository.new()
	repo.configure("user://../outside",c)
	check(not repo.save(s),"Reject traversal outside user storage")
	repo.configure("res://profile",c)
	check(not repo.save(s),"Reject project save path")
	repo.configure(path,c)
	check(repo.load_checkpoint().status == "empty","Missing slots are empty")
	check(repo.save(s),"First slot saved: "+repo.last_error)
	var first := FileAccess.get_file_as_string(repo.slot_path(0))
	var next := step(s,c,"reroll","next")
	for fault: String in ["open","truncate","readback","after_write"]:
		repo.fault = fault
		check(not repo.save(next),"Injected "+fault)
		check(FileAccess.get_file_as_string(repo.slot_path(0)) == first,"Previous valid slot retained "+fault)
		check(repo.save(next),"Same candidate retry "+fault+": "+repo.last_error)
		check(Capture.capture(repo.load_checkpoint().session) == Capture.capture(next),"Retry exact "+fault)
		# Reestablish a known previous slot for the next fault case.
		check(repo.save(s),"Reset repository fixture checkpoint")
		first = FileAccess.get_file_as_string(repo.slot_path(repo.active_slot))
		if repo.active_slot != 0:
			check(repo.save(s),"Align fixture slot")
			first = FileAccess.get_file_as_string(repo.slot_path(0))
	var before_bad := FileAccess.get_file_as_string(repo.slot_path(repo.active_slot))
	var bad_slot := 1-repo.active_slot
	write(repo.slot_path(bad_slot),"{interrupted")
	var recovery := repo.load_checkpoint()
	check(recovery.status == "recovery","Valid fallback is surfaced")
	check(not repo.save(s),"Recovery gates overwrites")
	check(repo.allow_recovery(),"Explicit recovery preserves originals")
	check(repo.save(s),"Recovery resumes writing")
	check(not Array(DirAccess.get_files_at(path)).filter(func(name: String): return name.ends_with(".recovery")).is_empty(),"Original recovery files retained")
	check(not before_bad.is_empty(),"Retained prior bytes")
	# A real Main restores charts/camera and gates a failed candidate before publishing.
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.progression_enabled = false # Preserve the pre-progression contract fixture.
	main.save_directory = path
	tree.root.add_child(main)
	await frames(tree,10)
	check(main._save_overlay != null and main._resume_candidate != null,"Startup offers Continue")
	main.resume_checkpoint()
	await frames(tree,10)
	check(main._battle_view.flow.current == "Locked","Chart restored from locked disk observation")
	check(Capture.capture(main._session) == Capture.capture(s),"Re-entry has no effects")
	var before := Capture.capture(main._session)
	main.repository.fault = "open"
	main.submit_intent(intent(main._session,"reroll","disk-reroll"))
	await frames(tree)
	check(main.checkpoint.state == "failed" and Capture.capture(main._session) == before,"Failed real write gates publication")
	var pending := Capture.capture(main.checkpoint.pending.candidate)
	main.submit_intent(intent(main._session,"reroll","another"))
	main.retry_checkpoint()
	await frames(tree)
	check(Capture.capture(main._session) == pending,"Real Retry exact candidate/RNG")
	check(main.repository.load_checkpoint().session.rng.capture() == main._session.rng.capture(),"Disk RNG equals published RNG")
	main.set_application_focused(false)
	check(not main._battle_view._enabled,"Focus suspension gates input")
	main.set_application_focused(true)
	main.queue_free()
	await frames(tree)
	# Persisted statuses and an enemy activation resume without replaying the hero.
	var committed := step(s,c,"commit","commit-status")
	var status_record := codec.decode(codec.encode(committed,1),c)
	check(status_record.status == "ok" and not status_record.session.hero.statuses.is_empty(),"Status source, duration and shield survive codec")
	var scheduler := preload("res://scripts/ai/enemy_scheduler.gd").new()
	tree.root.add_child(scheduler)
	var proposal: Dictionary = scheduler.propose(committed,c)
	var enemy_result := Resolver.resolve(committed,Resolver.parse_intent(proposal),c)
	check(enemy_result.accepted and codec.decode(codec.encode(enemy_result.candidate,2),c).status == "ok","Post-enemy debuff/cooldown continuation validates")
	scheduler.queue_free()
	await frames(tree)
	# Real navigation checkpoints do not publish mode changes on failure.
	var navigation := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	navigation.progression_enabled = false # Preserve the pre-progression contract fixture.
	navigation.save_directory = path+"/navigation"
	tree.root.add_child(navigation)
	await frames(tree,10)
	navigation.repository.fault = "open"
	navigation.request_mode(SessionShell.Mode.LOADING,1,navigation._session.revision)
	await frames(tree,10)
	check(navigation._session.mode == SessionShell.Mode.LOADING and navigation.checkpoint.state == "failed","Town entry waits for checkpoint")
	navigation.retry_checkpoint()
	await frames(tree,15)
	check(navigation._session.mode == SessionShell.Mode.TOWN and navigation.repository.load_checkpoint().session.mode == SessionShell.Mode.TOWN,"Town entry committed before world")
	navigation._world._require_neutral = false
	navigation.checkpoint_now()
	check(not navigation._world._require_neutral,"Periodic checkpoint preserves movement input")
	navigation.repository.fault = "open"
	navigation.request_mode(SessionShell.Mode.DUNGEON,1,navigation._session.revision)
	check(navigation._session.mode == SessionShell.Mode.TOWN and navigation.checkpoint.busy(),"Dungeon entry failure keeps town source")
	navigation.retry_checkpoint()
	await frames(tree,15)
	check(navigation._session.mode == SessionShell.Mode.DUNGEON and navigation._world != null,"Dungeon retry installs one world")
	navigation._capture_continuation(Vector2(650.25,168.75),["room.threshold","room.gallery"],1,navigation._session.revision)
	navigation._world.player.global_position = Vector2(650.25,168.75)
	navigation._world.discovered.assign(["room.threshold","room.gallery"])
	navigation.set_application_focused(false)
	var world_saved: SessionShell = navigation.repository.load_checkpoint().session
	check(world_saved.exploration.position_x == 650.25 and world_saved.exploration.discovered.has("room.gallery"),"Focus checkpoint captures exploration continuation")
	check(world_saved.exploration.capture().layout == Exploration.LAYOUT,"Authored layout is retained")
	navigation.set_application_focused(true)
	var entry: SessionShell = navigation._session.copy()
	Rules.begin(entry,"encounter.gallery",c)
	entry.exploration.active_encounter = "encounter.gallery"
	navigation._navigation_candidate = entry
	navigation._encounter_authorized = true
	navigation.repository.fault = "open"
	navigation.request_mode(SessionShell.Mode.BATTLE,1,navigation._session.revision)
	navigation._encounter_authorized = false
	check(navigation._session.battle == null and navigation.checkpoint.busy(),"Failed battle entry does not mutate source")
	navigation.retry_checkpoint()
	await frames(tree,10)
	check(navigation._session.mode == SessionShell.Mode.BATTLE and navigation._world == null,"Battle entry restores separate stage after saving")
	var select_attack := intent(navigation._session,"select_skill","attack-select")
	select_attack.skill_id = "skill.sword"
	select_attack.target_id = "enemy.0"
	navigation.submit_intent(select_attack)
	navigation.submit_intent(intent(navigation._session,"roll","attack-roll"))
	var locked_before := Capture.capture(navigation._session)
	navigation.repository.fault = "open"
	navigation.submit_intent(intent(navigation._session,"commit","attack-commit"))
	check(Capture.capture(navigation._session) == locked_before and navigation._session.exploration.pending_gold == 0,"Failed victory does not pay or award")
	navigation.retry_checkpoint()
	await frames(tree)
	check(navigation._session.battle.outcome == "victory" and navigation._session.exploration.pending_gold == 10,"Victory checkpoint awards pending gold once")
	navigation.retry_checkpoint()
	check(navigation._session.exploration.pending_gold == 10,"Repeated Retry cannot award twice")
	navigation.repository.fault = "open"
	navigation.complete_battle(1,navigation._session.revision)
	check(navigation._session.mode == SessionShell.Mode.BATTLE and navigation._session.exploration.active_encounter == "encounter.gallery","Return waits for disk")
	navigation.retry_checkpoint()
	await frames(tree,15)
	check(navigation._session.mode == SessionShell.Mode.DUNGEON and navigation._session.exploration.active_encounter.is_empty(),"Return saved before reconstruction")
	check(navigation._session.exploration.resolved.has("encounter.gallery"),"Resolved encounter remains removed")
	# Supply a cleared-run fixture to exercise the actual exit transaction.
	navigation._session.exploration.discovered.assign(["room.threshold","room.gallery","room.sanctum"])
	navigation._session.exploration.resolved.assign(["encounter.gallery","encounter.sanctum"])
	navigation._session.exploration.pending_gold = 25
	navigation._replace_view()
	for i: int in 120:
		if navigation._world.navigation_ready: break
		await tree.physics_frame
	navigation._world.player.global_position = Vector2(1552,160)
	navigation.repository.fault = "open"
	navigation._world_interaction("exit.undercrypt","exit",1,navigation._session.revision)
	check(navigation.checkpoint.busy() and navigation._session.hero.committed_gold == 0 and navigation._session.exploration.pending_gold == 25,"Failed run exit keeps both balances unchanged")
	navigation.retry_checkpoint()
	await frames(tree)
	check(navigation._session.mode == SessionShell.Mode.RESULTS and navigation._session.hero.committed_gold == 25 and navigation._session.exploration.pending_gold == 0,"Run result saved atomically")
	navigation.retry_checkpoint()
	check(navigation._session.hero.committed_gold == 25,"Run result cannot commit gold twice")
	check(navigation.repository.load_checkpoint().session.hero.committed_gold == 25,"Result survives disk restore")
	navigation.request_mode(SessionShell.Mode.TOWN,1,navigation._session.revision)
	await frames(tree,15)
	check(navigation._session.exploration == null and navigation._session.battle == null and navigation._session.town_position_x == 96.0,"Town return clears run and resumes safely away from entrance")
	navigation.queue_free()
	await frames(tree)
	# Separate OS processes exercise actual restart and future command continuation.
	var output: Array = []
	var process_path := path+"/fresh"
	for stage: String in ["write","resume","write-ai","resume-ai","write-torn","resume-torn","write-after","resume-after","write-world","resume-world","write-town","resume-town"]:
		output.clear()
		var exit_code := OS.execute(OS.get_executable_path(),PackedStringArray(["--headless","--path",ProjectSettings.globalize_path("res://"),"--script","res://tests/fixtures/save_process.gd","--",process_path,stage]),output,true)
		print("FRESH_PROCESS ",stage,": ",exit_code)
		check(exit_code == 0 and not "".join(output).contains("SCRIPT ERROR:"),"Fresh process "+stage+": "+"".join(output))
	print("SAVE_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures
