extends RefCounted
const H = preload("res://tests/integration/save_fixture.gd")
const F = preload("res://tests/unit/progression_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const Repo = preload("res://scripts/data/save_repository.gd")
var failures := PackedStringArray()
var checks := 0
func check(value: bool,label: String) -> void:
	checks += 1
	if not value: failures.append("Progression integration: "+label)
func fresh_process(path: String,ap: int,rank: String,locked: bool = false) -> bool:
	var output: Array = []
	var args := PackedStringArray(["--headless","--path",ProjectSettings.globalize_path("res://"),"--script","res://tests/fixtures/progression_process.gd","--",path,str(ap),rank])
	if locked: args.append("locked")
	var code := OS.execute(OS.get_executable_path(),args,output,true)
	print(str(output[0]).strip_edges())
	return code == 0 and not str(output[0]).contains("ERROR:")
func run(tree: SceneTree) -> PackedStringArray:
	var c := H.new().catalog()
	var f := F.new()
	var s := f.fresh(c)
	s.hero.training["skill.sword"] = 100
	s.hero.growth.ap = 1
	var directory := "user://phase8-test-"+str(Time.get_ticks_usec())
	var repo := Repo.new()
	repo.configure(directory,c)
	check(repo.save(s),"initial durable profile")
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.save_directory = directory
	tree.root.add_child(main)
	await H.new().frames(tree,10)
	main.resume_checkpoint()
	await H.new().frames(tree,15)
	main.set_application_focused(true)
	main._open_progression("Skills")
	check(is_instance_valid(main._progression_view),"production progression panel opens")
	check(not main._world.can_move(),"panel freezes movement")
	var before := main._session.revision
	var serial: int = main._progression_serial
	main.repository.fault = "open"
	var data := {"item":"skill.sword","quantity":1,"destination":"","column":0,"row":0}
	main._progression_intent("rank_up",data,main._session.session_id,before,serial)
	check(main.checkpoint.state == "failed" and main._session.hero.growth.ap == 1 and main._session.hero.skill_ranks["skill.sword"] == "F","write failure retains live AP/rank")
	check(fresh_process(directory,1,"F"),"restart before retry")
	main.retry_checkpoint()
	await H.new().frames(tree,15)
	check(main._session.hero.skill_ranks["skill.sword"] == "E" and main._session.hero.growth.ap == 0,"retry publishes once")
	main.retry_checkpoint()
	check(fresh_process(directory,0,"E"),"restart after retry")
	check(not main._progression_intent("rank_up",data,main._session.session_id,before,serial).accepted,"stale panel rejected")
	main._open_progression("Inventory")
	main.set_application_focused(false)
	check(not is_instance_valid(main._progression_view),"focus loss closes panel")
	main.set_application_focused(true)
	main._open_progression("Character")
	await H.new().frames(tree,2)
	var cancel := InputEventAction.new()
	cancel.action = "shell_back"
	cancel.pressed = true
	main._progression_view._input(cancel)
	check(not is_instance_valid(main._progression_view),"keyboard/controller Back dismisses panel")
	main.queue_free()
	await H.new().frames(tree,10)
	# Active inventory-backed locked hand with provenance and independent RNG survives process boundary.
	s.exploration = preload("res://scripts/domain/state/exploration_state.gd").new()
	s.mode = SessionShell.Mode.BATTLE
	P.begin(s)
	preload("res://scripts/domain/rules/battle_rules.gd").begin(s,"encounter.gallery",c)
	s.exploration.active_encounter = "encounter.gallery"
	s = H.new().step(s,c,"select_skill","select-growth")
	s = H.new().step(s,c,"roll","roll-growth")
	repo.load_checkpoint() # Refresh sequence after the application wrote newer slots.
	check(repo.save(s),"locked inventory-backed hand saves: "+repo.last_error)
	check(fresh_process(directory,1,"F",true),"fresh-process locked hand")
	var capture := preload("res://scripts/domain/state/combat_checkpoint.gd")
	check(capture.capture(repo.load_checkpoint().session) == capture.capture(s),"all pending and reserved state exact")
	print("PROGRESSION_INTEGRATION: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures
