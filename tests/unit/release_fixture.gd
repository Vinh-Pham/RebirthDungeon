extends RefCounted
## Phase 13 candidate freeze: the engine, content/rules versions and addon
## versions recorded in docs/evidence/phase13/README.md are asserted so any
## drift fails automation instead of silently changing the release candidate.
const H = preload("res://tests/integration/save_fixture.gd")

const FROZEN_ADDONS := {
	"addons/godot_state_charts/plugin.cfg": "0.22.5",
	"addons/dialogue_manager/plugin.cfg": "4.1.0",
	"addons/quest_system/plugin.cfg": "2.0.2",
	"addons/phantom_camera/plugin.cfg": "0.11.0.3",
	"addons/beckett/plugin.cfg": "1.15.0",
	"addons/limboai/version.txt": "v1.8.1",
}
const FROZEN_CONTENT_VERSION := 3
const FROZEN_LIMIT_VERSIONS := {"schema": 1, "rules": 1, "generator": 1, "rng": 1}

var failures := PackedStringArray()
var checks := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Release: " + label)

## Shared with the integration matrix: parse one addon version file.
static func addon_version(path: String) -> String:
	if not FileAccess.file_exists(path): return ""
	var text := FileAccess.get_file_as_string(path)
	if path.ends_with(".txt"): return text.strip_edges()
	for line: String in text.split("\n"):
		if line.begins_with("version="):
			return line.trim_prefix("version=").trim_suffix("\r").strip_edges().trim_prefix("\"").trim_suffix("\"")
	return ""

func run() -> PackedStringArray:
	# Engine pin: the manifest constant must equal the running editor.
	var engine := Engine.get_version_info()
	var actual := "%d.%d.%d.%s.%s.%s" % [engine.major, engine.minor, engine.patch, engine.status, engine.build, engine.hash.substr(0, 9)]
	check(actual == preload("res://scripts/domain/rules/rule_limits.gd").ENGINE, "running editor matches the frozen engine pin")
	# Rules/schema/generator/RNG versions.
	check(preload("res://scripts/domain/rules/rule_limits.gd").SCHEMA == FROZEN_LIMIT_VERSIONS.schema, "schema version frozen")
	check(preload("res://scripts/domain/rules/rule_limits.gd").RULES == FROZEN_LIMIT_VERSIONS.rules, "rules version frozen")
	check(preload("res://scripts/domain/rules/rule_limits.gd").GENERATOR == FROZEN_LIMIT_VERSIONS.generator, "generator version frozen")
	check(preload("res://scripts/domain/rules/rule_limits.gd").RNG == FROZEN_LIMIT_VERSIONS.rng, "rng version frozen")
	# Content version: the catalog manifest carries the frozen content revision.
	var catalog := H.new().catalog()
	check(catalog.versions().get("content") == FROZEN_CONTENT_VERSION, "content version frozen at %d" % FROZEN_CONTENT_VERSION)
	check(catalog.versions().get("generator") == FROZEN_LIMIT_VERSIONS.generator, "manifest generator matches the frozen version")
	# Addon stack: every pinned version file must match the freeze exactly.
	for path: String in FROZEN_ADDONS:
		var found := addon_version(path)
		check(found == FROZEN_ADDONS[path], "frozen addon %s == %s (found %s)" % [path, FROZEN_ADDONS[path], found])
	# The automation gate fails on purpose-driven failures (verified by verify.py;
	# here we assert the runner exposes the switch and a nonzero contract marker).
	var runner := FileAccess.get_file_as_string("res://tests/run_tests.gd")
	check(runner.contains("--prove-failure") and runner.contains("quit(1)"), "runner exposes an intentional-failure switch with a failing exit")
	print("RELEASE_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL", checks])
	return failures
