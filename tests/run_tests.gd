extends SceneTree
## Exit 0 = pass; 1 = failed checks. The verifier also catches crashes/parse errors.

const BaselineFixture = preload("res://tests/fixtures/baseline_fixture.gd")

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var negative := OS.get_cmdline_user_args().has("--prove-failure")
	var failures: PackedStringArray = await BaselineFixture.new().run(self, negative)
	if not negative:
		failures.append_array(load("res://tests/unit/catalog_fixture.gd").new().run())
		failures.append_array(load("res://tests/unit/rng_fixture.gd").new().run())
		failures.append_array(load("res://tests/unit/command_fixture.gd").new().run())
		failures.append_array(load("res://tests/unit/combat_fixture.gd").new().run())
		failures.append_array(await load("res://tests/integration/combat_ai_fixture.gd").new().run(self))
		failures.append_array(await load("res://tests/integration/addon_fixture.gd").new().run(self))
		failures.append_array(await load("res://tests/integration/shell_fixture.gd").new().run(self))
		failures.append_array(await load("res://tests/integration/content_loading_fixture.gd").new().run(self))
		failures.append_array(await load("res://tests/integration/exploration_fixture.gd").new().run(self))
	for failure: String in failures:
		print("FAIL: " + failure)
	if failures.is_empty():
		print("TEST_RESULT: PASS")
		quit(0)
	else:
		print("TEST_RESULT: FAIL (%d checks)" % failures.size())
		quit(1)
