extends SceneTree
func _initialize() -> void:
	var h := preload("res://tests/integration/save_fixture.gd").new()
	var repo := preload("res://scripts/data/save_repository.gd").new()
	repo.configure(OS.get_cmdline_user_args()[0],h.catalog())
	var loaded := repo.load_checkpoint()
	if loaded.status != "ok":
		quit(1)
		return
	var s: SessionShell = loaded.session
	var valid: bool = s.mode == int(OS.get_cmdline_user_args()[4]) and (s.mode != SessionShell.Mode.RESULTS or s.exploration.pending_gold == 0) and s.hero.potions == int(OS.get_cmdline_user_args()[1]) and s.hero.committed_gold == int(OS.get_cmdline_user_args()[2]) and (OS.get_cmdline_user_args()[3] != "true" or s.hero.current == s.hero.maximum)
	print("TOWN_FRESH_PROCESS: ", "PASS" if valid else "FAIL")
	quit(0 if valid else 1)
