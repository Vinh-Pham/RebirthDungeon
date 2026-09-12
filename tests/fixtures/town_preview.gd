extends DungeonApplication
## Isolated rendered acceptance harness. Methods travel via actual navigation
## and issue normal commands; only seed_fixture creates a known starting profile.
func _init() -> void:
	save_directory = "user://phase7-rendered"
func seed_fixture() -> void:
	var h := preload("res://tests/integration/save_fixture.gd").new()
	var c := h.catalog()
	var s := h.session(c)
	s.mode = Mode.TOWN
	s.battle = null
	s.exploration = null
	s.hero.committed_gold = 25
	s.hero.current[0] = 12
	DirAccess.make_dir_recursive_absolute(save_directory)
	for i: int in 2:
		var path := save_directory.path_join("checkpoint_%d.json" % i)
		if FileAccess.file_exists(path): DirAccess.remove_absolute(path)
	var repo := preload("res://scripts/data/save_repository.gd").new()
	repo.configure(save_directory,c)
	repo.save(s)
	_open_storage()
func walk_to(x: float, y: float) -> bool:
	set_application_focused(true)
	var owner := get_viewport().gui_get_focus_owner()
	if owner != null: owner.release_focus()
	return _world.queue_destination(Vector2(x,y))
func fail_next_write() -> void:
	repository.fault = "open"
func summary() -> Dictionary:
	return {"mode":_session.mode,"revision":_session.revision,"gold":_session.hero.committed_gold,
		"potions":_session.hero.potions,"pools":_session.hero.current,"gate":checkpoint.state,
		"dialogue":is_instance_valid(_dialogue),"camera":_world.conversation_camera.get_priority() if is_instance_valid(_world) and is_instance_valid(_world.conversation_camera) else 20}
func attack() -> Dictionary:
	set_application_focused(true)
	var s := _session
	if s.mode != Mode.BATTLE: return {"error":"not battle"}
	var kind := "select_skill" if s.battle.selected_skill.is_empty() else ("roll" if s.battle.phase == 0 else "commit")
	return submit_intent({"session_id":s.session_id,"expected_revision":s.revision,"operation_id":"preview:"+str(s.revision),
		"kind":kind,"actor_id":"hero","skill_id":"skill.sword" if kind == "select_skill" else "","target_id":"enemy.0" if kind == "select_skill" else ""})
func compact_window() -> void:
	get_window().size = Vector2i(960,540)
