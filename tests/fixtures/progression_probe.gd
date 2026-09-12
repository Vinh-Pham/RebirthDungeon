extends SceneTree
func _initialize() -> void:
	_run.call_deferred()
func _run() -> void:
	var failures := preload("res://tests/unit/progression_fixture.gd").new().run()
	failures.append_array(await preload("res://tests/integration/progression_fixture.gd").new().run(self))
	for failure: String in failures: print("FAIL: ",failure)
	quit(0 if failures.is_empty() else 1)
