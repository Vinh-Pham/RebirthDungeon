extends SceneTree
func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var c := preload("res://tests/integration/save_fixture.gd").new().catalog()
	var repo := preload("res://scripts/data/save_repository.gd").new()
	repo.configure(args[0],c)
	var result := repo.load_checkpoint()
	var ok: bool = result.status == "ok"
	if ok:
		ok = result.session.hero.growth.ap == int(args[1]) and result.session.hero.skill_ranks["skill.sword"] == args[2]
		if args.size() > 3: ok = ok and result.session.battle != null and result.session.battle.phase == 1
	print("PROGRESSION_FRESH_PROCESS: ",ok)
	quit(0 if ok else 1)
