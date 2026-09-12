extends DungeonApplication
func _init() -> void:
	save_directory = "user://phase8-rendered"
func seed_fixture() -> void:
	var h := preload("res://tests/unit/progression_fixture.gd").new()
	var c := preload("res://tests/integration/save_fixture.gd").new().catalog()
	var s := h.fresh(c)
	DirAccess.make_dir_recursive_absolute(save_directory)
	for i: int in 2:
		var path := save_directory.path_join("checkpoint_%d.json" % i)
		if FileAccess.file_exists(path): DirAccess.remove_absolute(path)
	var repo := preload("res://scripts/data/save_repository.gd").new()
	repo.configure(save_directory,c)
	assert(repo.save(s),repo.last_error)
	_open_storage()
func walk_to(x: float,y: float) -> bool:
	set_application_focused(true)
	var owner := get_viewport().gui_get_focus_owner()
	if owner != null: owner.release_focus()
	return _world.queue_destination(Vector2(x,y))
func compact_window() -> void:
	get_window().size = Vector2i(960,540)
func progression_summary() -> Dictionary:
	return {"growth":_session.hero.growth,"stats":_session.hero.stats,"items":_session.hero.observation().items,"mode":_session.mode,"gate":checkpoint.state}

func battle_step() -> Dictionary:
	set_application_focused(true)
	var s := _session
	if s.mode != Mode.BATTLE: return {"mode":s.mode}
	if s.battle.phase == 3:
		complete_battle(s.session_id,s.revision)
		return {"outcome":s.battle.outcome}
	if s.battle.active_actor_id != "hero": return {"waiting":"enemy"}
	var kind := "select_skill" if s.battle.selected_skill.is_empty() else ("roll" if s.battle.phase == 0 else "commit")
	var training: int = s.exploration.progression.training.get("skill.fortify",0)
	var skill := "skill.fortify" if training < 100 else "skill.sword"
	return submit_intent({"session_id":s.session_id,"expected_revision":s.revision,"operation_id":"rendered:"+str(s.revision),"kind":kind,"actor_id":"hero","skill_id":skill if kind == "select_skill" else "","target_id":("hero" if skill == "skill.fortify" else "enemy.0") if kind == "select_skill" else ""})
