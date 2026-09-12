extends DungeonApplication
## Beckett-only fault/restart harness; never touches the normal profile.
func _init() -> void:
	save_directory = "user://phase6-rendered"
func seed_fixture(kind: String = "locked") -> void:
	var helper := preload("res://tests/integration/save_fixture.gd").new()
	var c := helper.catalog()
	DirAccess.make_dir_recursive_absolute(save_directory)
	for i: int in 2:
		var path := save_directory.path_join("checkpoint_%d.json" % i)
		if FileAccess.file_exists(path): DirAccess.remove_absolute(path)
	var s := helper.session(c)
	s = helper.step(s,c,"select_skill","select")
	s = helper.step(s,c,"roll","roll")
	s = helper.step(s,c,"keep","keep")
	var repo := preload("res://scripts/data/save_repository.gd").new()
	repo.configure(save_directory,c)
	repo.save(s)
	if kind == "fallback": helper.write(repo.slot_path(1),"{interrupted")
	elif kind == "corrupt": helper.write(repo.slot_path(0),"{damaged")
	elif kind == "incompatible":
		var data := preload("res://scripts/domain/state/combat_checkpoint.gd").capture(s)
		data.content_versions.rules = 999
		helper.write(repo.slot_path(0),helper.rewrap(data))
	_open_storage()
func fail_next_write() -> void:
	repository.fault = "open"
func reroll_fixture() -> void:
	_battle_view.send_action("reroll")
func saved_summary() -> Dictionary:
	var saved: Dictionary = repository.load_checkpoint()
	return {"status":saved.status,"revision":_session.revision,"hand":_session.battle.hand if _session.battle != null else [],
		"gate":checkpoint.state,"sequence":repository.sequence}

func commit_reroll_fixture() -> Dictionary:
	set_application_focused(true)
	var intent := preload("res://tests/integration/save_fixture.gd").new().intent(_session,"reroll","rendered:reroll")
	intent.indices = [1,2,3,4]
	return submit_intent(intent)
