extends SceneTree
func _initialize() -> void:
	run.call_deferred()
func run() -> void:
	var failures: PackedStringArray = await preload("res://tests/integration/town_services_fixture.gd").new().run(self)
	for failure: String in failures: print("FAIL: ",failure)
	quit(0 if failures.is_empty() else 1)
