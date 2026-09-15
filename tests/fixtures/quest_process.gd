extends SceneTree
## Fresh-process quest continuation: pools reconstruct from the combined save
## without replaying rewards. Args: directory [id:state ...]
func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var c := preload("res://tests/integration/save_fixture.gd").new().catalog()
	var repo := preload("res://scripts/data/save_repository.gd").new()
	repo.configure(args[0],c)
	var loaded := repo.load_checkpoint()
	if loaded.status != "ok":
		print("QUEST_FRESH_PROCESS: no session")
		quit(1)
		return
	var s: SessionShell = loaded.session
	var expected := {}
	for index: int in range(1,args.size()):
		var pair: PackedStringArray = args[index].split(":")
		expected[pair[0]] = pair[1]
	var ok: bool = true
	for quest_id: String in expected:
		var state: String = str(s.hero.growth.quests.get(quest_id,{}).get("state","locked"))
		if state != expected[quest_id]:
			print("QUEST_FRESH_PROCESS: %s is %s, expected %s" % [quest_id,state,expected[quest_id]])
			ok = false
	if ok:
		var adapter := preload("res://scripts/application/quest_adapter.gd").new()
		adapter.sync(s)
		var manager := root.get_node("QuestSystem")
		var in_active: Array = manager.active.get_ids_from_quests()
		var in_available: Array = manager.available.get_ids_from_quests()
		var in_completed: Array = manager.completed.get_ids_from_quests()
		for quest_id: String in expected:
			var numeric: int = int(preload("res://scripts/domain/rules/progression_rules.gd").CONFIG.quests[quest_id].numeric)
			var state: String = expected[quest_id]
			if state == "active" and not in_active.has(numeric): ok = false
			if state == "available" and not in_available.has(numeric): ok = false
			if state == "claimed" and not in_completed.has(numeric): ok = false
			if state == "locked" and (in_active.has(numeric) or in_available.has(numeric) or in_completed.has(numeric)): ok = false
		print("QUEST_POOLS: active=%s available=%s completed=%s" % [str(in_active),str(in_available),str(in_completed)])
	print("QUEST_FRESH_PROCESS: ","PASS" if ok else "FAIL")
	quit(0 if ok else 1)