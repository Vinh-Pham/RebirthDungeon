extends SceneTree
func _init() -> void:
	_run.call_deferred()
func _run() -> void:
	var failures: PackedStringArray = await preload("res://tests/integration/save_fixture.gd").new().run(self)
	for failure: String in failures: print("SAVE_FAILURE: "+failure)
	quit(0 if failures.is_empty() else 1)
