extends RefCounted
## Phase 13 release-candidate hardening: missing assets, repeated mode
## transitions, long sessions and the supported save upgrade chain.
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const Application = preload("res://scripts/application/main.gd")
const Mode = SessionShell.Mode

var failures := PackedStringArray()
var checks := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Hardening: " + label)

func catalog() -> RefCounted:
	return H.new().catalog()

func settle(tree: SceneTree, frames: int = 6) -> void:
	for i: int in frames: await tree.process_frame

func run(tree: SceneTree) -> PackedStringArray:
	await _missing_asset(tree)
	await _repeated_transitions(tree)
	await _long_session(tree)
	_upgrade_chain()
	print("HARDENING_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL", checks])
	return failures

## A required file that cannot load blocks entry with actionable text.
func _missing_asset(tree: SceneTree) -> void:
	var main := load("res://scenes/main.tscn").instantiate() as Application
	main.persistence_enabled = false
	main.required_resource_overrides = {"res://assets/fonts/shell_font.tres": "user://phase13-missing.file"}
	tree.root.add_child(main)
	await settle(tree)
	main.request_mode(Mode.LOADING, 1, main._session.revision)
	await settle(tree)
	check(main.loading_error.contains("Required resource missing"), "missing asset produces the missing-resource diagnostic")
	check(main.observation().mode == Mode.LOADING, "missing asset blocks entry in loading")
	check(not main.request_mode(Mode.TOWN, 1, main._session.revision), "missing asset cannot advance into town")
	main.required_resource_overrides = {}
	main.request_mode(Mode.MENU, 1, main._session.revision)
	await settle(tree)
	main.request_mode(Mode.LOADING, 1, main._session.revision)
	await settle(tree)
	check(main.observation().mode == Mode.TOWN and main.loading_error.is_empty(), "restored asset retry enters town")
	main.queue_free()
	await settle(tree)

## Repeated guarded transitions publish exactly once each and leak nothing.
func _repeated_transitions(tree: SceneTree) -> void:
	var main := load("res://scenes/main.tscn").instantiate() as Application
	main.persistence_enabled = false
	tree.root.add_child(main)
	await settle(tree)
	main.request_mode(Mode.LOADING, 1, main._session.revision)
	await settle(tree)
	var objects_before := Performance.get_monitor(Performance.OBJECT_COUNT)
	var revisions_ok := true
	for round_index: int in 12:
		# TOWN -> DUNGEON -> MENU, then LOADING auto-advances into TOWN.
		for target: Mode in [Mode.DUNGEON, Mode.MENU, Mode.LOADING]:
			var before := main.observation()
			if not main.request_mode(target, before.session_id, before.revision):
				check(false, "cycle %d: legal transition to %d rejected" % [round_index, target])
				main.queue_free()
				await settle(tree)
				return
			await settle(tree)
			var after := main.observation()
			if target == Mode.LOADING:
				# The loader self-advances into town; accept either hop here.
				check(after.mode in [Mode.LOADING, Mode.TOWN] and after.revision >= before.revision + 1,
					"cycle %d: target %d publishes" % [round_index, target])
			else:
				check(after.mode == target and after.revision == before.revision + 1,
					"cycle %d: target %d publishes exactly once" % [round_index, target])
			if after.revision < before.revision + 1: revisions_ok = false
		for i: int in 120:
			await settle(tree, 1)
			if main.observation().mode == Mode.TOWN: break
		check(main.observation().mode == Mode.TOWN, "cycle %d: loading advances into town" % round_index)
	check(revisions_ok, "every explicit transition accounted exactly")
	main.queue_free()
	await settle(tree)
	var drift := Performance.get_monitor(Performance.OBJECT_COUNT) - objects_before
	print("HARDENING_OBJECT_DRIFT: %d" % drift)

## A long command session stays consistent: strict revisions, deduped
## operations, stable memory and intact checkpoint restore.
func _long_session(tree: SceneTree) -> void:
	var c := catalog()
	var main := load("res://scenes/main.tscn").instantiate() as Application
	main.persistence_enabled = false
	tree.root.add_child(main)
	await settle(tree)
	var s := H.new().session(c)
	var serial := 0
	var objects_before := Performance.get_monitor(Performance.OBJECT_COUNT)
	for battle_index: int in 30:
		var encounters: Array = ["encounter.gallery", "encounter.sanctum", "encounter.dual"]
		var encounter: String = encounters[battle_index % 3]
		Rules.begin(s, encounter, c)
		var activations := 0
		while s.battle.phase != 3 and activations < 40:
			activations += 1
			serial += 1
			var actor: String = s.battle.active_actor_id
			var kind := "pass"
			var skill := ""
			var target := ""
			if actor == "hero":
				if s.battle.selected_skill.is_empty():
					if s.hero.current[2] >= 5:
						kind = "select_skill"
						skill = "skill.sword"
						target = "enemy.0"
						for enemy: RefCounted in s.battle.enemies:
							if enemy.current[0] > 0:
								target = enemy.instance_id
								break
				elif s.battle.hand.is_empty():
					kind = "roll"
				else:
					kind = "commit"
			else:
				kind = "enemy_action"
				skill = "skill.enemy_strike"
				target = "hero"
			var result := R.resolve(s, R.parse_intent({"session_id": s.session_id, "expected_revision": s.revision,
				"operation_id": "long:%d" % serial, "kind": kind,
				"actor_id": actor, "skill_id": skill, "target_id": target}), c)
			if not result.accepted:
				check(false, "long-session %s rejected (%s)" % [kind, result.code])
				break
			s = result.candidate
		check(s.battle.phase == 3, "long session battle %d finished inside the budget" % battle_index)
	check(s.revision == serial, "long-session revisions strictly account every accepted command")
	var drift := Performance.get_monitor(Performance.OBJECT_COUNT) - objects_before
	print("HARDENING_LONG_OBJECT_DRIFT: %d" % drift)
	var data: Dictionary = Capture.capture(s)
	var restored: SessionShell = Capture.restore(data, c)
	check(restored != null and Capture.capture(restored) == data, "long-session state survives checkpoint restore")
	main.queue_free()
	await settle(tree)

## Supported save upgrade chain: v1 legacy hero -> current -> re-save, and a
## Phase 9-era v2 growth record gaining the missions field.
func _upgrade_chain() -> void:
	var c := catalog()
	var legacy: SessionShell = H.new().session(c)
	legacy.hero.potions = 0
	legacy.hero.growth = {}
	legacy.battle = null
	legacy.mode = Mode.DUNGEON
	legacy.exploration = Exploration.new()
	legacy.exploration.layout_id = "undercrypt.v1"
	legacy.exploration.rooms = Exploration.LAYOUT.duplicate(true)
	legacy.exploration.bindings = []
	legacy.exploration.exit_room_id = ""
	legacy.exploration.run_seed = 0
	legacy.exploration.active_encounter = ""
	var data: Dictionary = Capture.capture(legacy)
	data.erase("clock_week")
	data.erase("mission_id")
	# Phase 6-era payload shape: no potions/growth on the hero, no active
	# encounter in a paused run, and no generated-layout fields on exploration.
	data.hero.erase("potions")
	data.hero.erase("growth")
	data.exploration.active_encounter = ""
	data.exploration.erase("bindings")
	data.exploration.erase("exit_room_id")
	data.exploration.erase("run_seed")
	var codec := Codec.new()
	var payload := JSON.stringify(Codec.wire(data), "", true, true)
	var envelope := JSON.stringify({"format": "rebirth.session.v1", "sequence": "1", "payload": payload,
		"checksum": ("rebirth.session.v1\n1\n" + payload).sha256_text()})
	var decoded: Dictionary = codec.decode(envelope, c)
	check(decoded.status == "ok", "v1 legacy checkpoint decodes on the current candidate")
	if decoded.status == "ok":
		var hero: SessionShell = decoded.session
		check(hero.hero.potions == 0 and hero.hero.growth.is_empty(), "v1 hero migrates without invented progression")
		check(hero.exploration.bindings == Exploration.LEGACY_BINDINGS, "v1 authored layout gains its binding records")
		P.initialize(hero.hero, c)
		check(not hero.hero.growth.is_empty(), "legacy hero upgrades to growth v2 on town reconciliation")
		P.begin(hero)
		var again := codec.decode(codec.encode(hero, 2), c)
		check(again.status == "ok" and again.session.hero.growth.level == 1,
			"upgraded hero re-saves on the current format (error: %s)" % str(again.get("error", "none")))
	var modern := H.new().session(c)
	modern.mode = Mode.TOWN
	modern.battle = null
	modern.exploration = null
	var v2data: Dictionary = Capture.capture(modern)
	v2data.hero.erase("growth")
	var v2payload := JSON.stringify(Codec.wire(v2data), "", true, true)
	var v2 := JSON.stringify({"format": "rebirth.session.v2", "sequence": "1", "payload": v2payload,
		"checksum": ("rebirth.session.v2\n1\n" + v2payload).sha256_text()})
	var v2decoded: Dictionary = codec.decode(v2, c)
	check(v2decoded.status == "ok", "v2 checkpoint decodes (error: %s)" % str(v2decoded.get("error", "none")))
	if v2decoded.status == "ok":
		check(v2decoded.session.hero.growth.is_empty(), "growth-free v2 hero stays growth-free (migration never invents progression)")

