extends SceneTree
const Fixture = preload("res://tests/integration/save_fixture.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Repository = preload("res://scripts/data/save_repository.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
func _init() -> void:
	_run.call_deferred()
func _run() -> void:
	var args := OS.get_cmdline_user_args()
	var helper := Fixture.new()
	var c := helper.catalog()
	var repo := Repository.new()
	var directory := args[0]+("-"+args[1].get_slice("-",1) if args[1].contains("-") else "")
	repo.configure(directory,c)
	if args[1].begins_with("write"):
		var s := helper.session(c)
		s = helper.step(s,c,"select_skill","select")
		s = helper.step(s,c,"roll","roll")
		s = helper.step(s,c,"keep","keep")
		if not repo.save(s):
			print(repo.last_error)
			quit(1)
			return
		var future: SessionShell
		if args[1] in ["write-world","write-town"]:
			s.hero.reserved.fill(0)
			s.battle = null
			s.mode = SessionShell.Mode.DUNGEON
			s.exploration.active_encounter = ""
			if args[1] == "write-town":
				s.mode = SessionShell.Mode.TOWN
				s.exploration = null
				s.town_position_x = 220.5
				s.town_position_y = 120.25
			if not repo.save(s):
				print(repo.last_error)
				quit(1)
				return
			future = s.copy()
		elif args[1] == "write-ai":
			s = helper.step(s,c,"commit","commit-status")
			if not repo.save(s):
				print(repo.last_error)
				quit(1)
				return
			var scheduler := preload("res://scripts/ai/enemy_scheduler.gd").new()
			root.add_child(scheduler)
			var proposal: Dictionary = scheduler.propose(s,c)
			future = preload("res://scripts/domain/commands/command_resolver.gd").resolve(s,preload("res://scripts/domain/commands/command_resolver.gd").parse_intent(proposal),c).candidate
			scheduler.queue_free()
			await helper.frames(self)
		else:
			if args[1] in ["write-torn","write-after"]:
				var attempted := helper.step(s,c,"reroll","attempt")
				repo.fault = "truncate" if args[1] == "write-torn" else "after_write"
				repo.save(attempted)
				if args[1] == "write-after": s = attempted
			future = helper.step(s,c,"reroll","future")
		helper.write(directory+"/expected.json",Codec.new().encode(future,1))
		print("FRESH_WRITE: PASS")
		quit(0)
		return
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.progression_enabled = false # Preserve the pre-progression contract fixture.
	main.save_directory = directory
	root.add_child(main)
	await helper.frames(self,12)
	var title_observation := main.observation()
	main.request_mode(SessionShell.Mode.LOADING,title_observation.session_id,title_observation.revision)
	for title_frame: int in 10: await self.process_frame
	main.resume_checkpoint()
	await helper.frames(self,12)
	if args[1] in ["resume-world","resume-town"]:
		for i: int in 120:
			if is_instance_valid(main._world) and main._world.navigation_ready: break
			await physics_frame
		var expected_world := Codec.new().decode(FileAccess.get_file_as_string(directory+"/expected.json"),c)
		if expected_world.status != "ok" or Capture.capture(main._session) != Capture.capture(expected_world.session) or not main._world.navigation_ready or main._world.phantom.follow_target != main._world.player:
			print("Fresh world continuation mismatch")
			quit(1)
			return
		main.queue_free()
		await helper.frames(self)
		print("FRESH_WORLD: PASS")
		quit(0)
		return
	if main._battle_view == null or main._battle_view.flow.current != ("Selection" if args[1] == "resume-ai" else "Locked"):
		print("Fresh chart did not restore")
		quit(1)
		return
	var result := {"accepted":true}
	if args[1] != "resume-ai": result = main.submit_intent(helper.intent(main._session,"reroll","future"))
	else:
		main._schedule_enemy()
		main._schedule_enemy()
	await helper.frames(self)
	var expected := Codec.new().decode(FileAccess.get_file_as_string(directory+"/expected.json"),c)
	if not result.accepted or expected.status != "ok" or Capture.capture(main._session) != Capture.capture(expected.session):
		print("Fresh continuation mismatch")
		quit(1)
		return
	main.queue_free()
	await helper.frames(self)
	print("FRESH_RESUME: PASS")
	quit(0)
