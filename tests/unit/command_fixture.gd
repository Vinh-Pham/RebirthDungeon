extends RefCounted
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Actor = preload("res://scripts/domain/state/actor_state.gd")
const Battle = preload("res://scripts/domain/state/battle_state.gd")
const Item = preload("res://scripts/domain/state/item_state.gd")
const Status = preload("res://scripts/domain/state/status_state.gd")
const Resolver = preload("res://scripts/domain/commands/command_resolver.gd")
const Command = preload("res://scripts/domain/commands/domain_command.gd")
const Manifest = preload("res://scripts/data/definitions/catalog_manifest.gd")
var _failures: PackedStringArray = []
var _checks: int = 0

func _check(condition: bool, label: String) -> void:
	_checks += 1
	if not condition: _failures.append(label)

func make_session(catalog: Catalog) -> Session:
	var session := Session.new()
	session.mode = Session.Mode.BATTLE
	session.content_versions = catalog.versions()
	session.hero = Hero.new()
	session.hero.configure(catalog.definition("actor.hero"), "hero")
	session.battle = Battle.new()
	session.battle.encounter_id = "encounter.training"
	session.battle.content_versions = catalog.versions()
	var enemy := Actor.new()
	enemy.configure(catalog.definition("actor.training_enemy"), "enemy.0")
	session.battle.enemies.append(enemy)
	return session

func make_command() -> Command:
	return Resolver.parse_intent({"session_id": 1, "expected_revision": 0, "operation_id": "selection.1",
		"kind": "select_skill", "actor_id": "hero", "skill_id": "skill.sword", "target_id": "enemy.0"})

func run() -> PackedStringArray:
	var catalog := Catalog.new()
	catalog.publish(load("res://content/catalog.tres"))
	var session := make_session(catalog)
	var source := catalog.definition("actor.hero") as Manifest.ACTORS
	var a := Hero.new()
	var b := Hero.new()
	a.configure(source, "a"); b.configure(source, "b")
	a.current[0] = 2
	a.reserved[2] = 5
	a.stats["stat.strength"] = 99
	a.training["skill.sword"] = 50
	var status := Status.new()
	status.definition_id = "status.fortified"; status.remaining_activations = 3
	a.statuses.append(status)
	var item := Item.new()
	item.instance_id = "item_instance.1"; item.definition_id = "item.training_sword"
	item.rolled_modifiers["stat.strength"] = 2
	a.items.append(item)
	_check(b.current[0] == 30 and source.max_hp == 30 and b.reserved[2] == 0, "Shared actor definition must not share pools/reservations")
	_check(b.training["skill.sword"] == 0 and b.stats["stat.strength"] == 3 and b.statuses.is_empty(), "Stats, training and statuses are per actor")
	var copied: Hero = a.copy()
	copied.items[0].rolled_modifiers["stat.strength"] = 100
	copied.statuses[0].remaining_activations = 1
	copied.current[0] = 1
	_check(a.items[0].rolled_modifiers["stat.strength"] == 2 and a.statuses[0].remaining_activations == 3 and a.current[0] == 2, "Nested runtime graph copy")
	var observation := a.observation()
	observation.items[0].rolled_modifiers["stat.strength"] = 500
	observation.statuses[0].remaining_activations = 0
	observation.current[0] = 0
	_check(a.current[0] == 2 and a.items[0].rolled_modifiers["stat.strength"] == 2 and a.statuses[0].remaining_activations == 3, "Copied presentation observations")
	var command := make_command()
	var before := session.observation()
	var rng_before := session.rng.capture()
	var result := Resolver.resolve(session, command, catalog)
	_check(result.accepted and result.candidate.revision == 1, "Valid selection prepares next revision")
	_check(session.observation() == before and session.rng.capture() == rng_before, "Resolver leaves source unchanged")
	_check(result.candidate.battle.selected_skill == "skill.sword" and result.candidate.battle.selected_rank == "F", "Selected learned rank")
	_check(result.candidate.hero.current == session.hero.current and result.candidate.hero.reserved == session.hero.reserved and result.candidate.rng.capture() == rng_before, "Selection spends/reserves/draws nothing")
	var repeat := Resolver.resolve(session, command, catalog)
	_check(repeat.observation() == result.observation() and repeat.candidate.observation() == result.candidate.observation(), "Same command/state gives identical ordered result")
	var exported := result.observation()
	exported.events[0].skill_id = "skill.fake"
	_check(result.events[0].skill_id == "skill.sword", "Result events are copied outward")
	var published: Session = result.candidate
	var published_before := published.observation()
	command.expected_revision = published.revision
	var duplicate := Resolver.resolve(published, command, catalog)
	_check(not duplicate.accepted and duplicate.code == "duplicate_operation" and duplicate.candidate == null and published.observation() == published_before, "Duplicate operation at current revision rejected")
	var cases: Array[Dictionary] = [
		{"code": "stale_session_or_revision", "change": func(s: Session, c: Command): c.session_id = 2},
		{"code": "stale_session_or_revision", "change": func(s: Session, c: Command): c.expected_revision = -1},
		{"code": "invalid_operation_id", "change": func(s: Session, c: Command): c.operation_id = ""},
		{"code": "unsupported_command", "change": func(s: Session, c: Command): c.kind = "roll_dice"},
		{"code": "no_battle", "change": func(s: Session, c: Command): s.mode = Session.Mode.TOWN},
		{"code": "selection_locked", "change": func(s: Session, c: Command): s.battle.phase = Battle.Phase.LOCKED},
		{"code": "not_active_hero", "change": func(s: Session, c: Command): c.actor_id = "enemy.0"},
		{"code": "not_active_hero", "change": func(s: Session, c: Command): s.hero.current[0] = 0},
		{"code": "not_active_hero", "change": func(s: Session, c: Command): s.battle.active_actor_id = "enemy.0"},
		{"code": "content_version_mismatch", "change": func(s: Session, c: Command): s.battle.content_versions.content += 1},
		{"code": "unlearned_skill", "change": func(s: Session, c: Command): c.skill_id = "skill.missing"},
		{"code": "unlearned_skill", "change": func(s: Session, c: Command): c.skill_id = "skill.enemy_strike"},
		{"code": "unsupported_rank", "change": func(s: Session, c: Command): s.hero.skill_ranks["skill.sword"] = "1"},
		{"code": "weapon_required", "change": func(s: Session, c: Command): s.hero.weapon = ""},
		{"code": "invalid_target", "change": func(s: Session, c: Command): c.target_id = "outside.encounter"},
		{"code": "invalid_target", "change": func(s: Session, c: Command): c.target_id = "hero"},
		{"code": "invalid_target", "change": func(s: Session, c: Command): s.battle.enemies[0].current[0] = 0},
		{"code": "invalid_target", "change": func(s: Session, c: Command): c.skill_id = "skill.fortify"},
		{"code": "unaffordable", "change": func(s: Session, c: Command): s.hero.current[2] = 4},
		{"code": "unaffordable", "change": func(s: Session, c: Command): s.hero.reserved[2] = 16},
	]
	for test_case: Dictionary in cases:
		var altered := make_session(catalog)
		command = make_command()
		test_case.change.call(altered, command)
		before = altered.observation()
		rng_before = altered.rng.capture()
		var operations := altered.accepted_operations.duplicate()
		result = Resolver.resolve(altered, command, catalog)
		_check(not result.accepted and result.code == test_case.code and result.candidate == null and result.events.is_empty(), "Reject " + test_case.code)
		_check(altered.observation() == before and altered.rng.capture() == rng_before and altered.accepted_operations == operations, "Rejected command isolation: " + test_case.code)
	command = make_command()
	command.skill_id = "skill.fortify"; command.target_id = "hero"
	_check(Resolver.resolve(session, command, catalog).accepted, "Legal self-target selection")
	_check(Resolver.parse_intent({"session_id": 1}) == null, "Incomplete intent rejected")
	var bad_intent := {"session_id": 1.0, "expected_revision": 0, "operation_id": "x", "kind": "select_skill", "actor_id": "hero", "skill_id": "skill.sword", "target_id": "enemy.0"}
	_check(Resolver.parse_intent(bad_intent) == null, "No implicit numeric conversion at addon boundary")
	_check(not Resolver.resolve(session, null, catalog).accepted, "Null command rejection")
	var copied_session: Session = session.copy()
	copied_session.battle.kept[0] = true
	copied_session.battle.locked_inputs["costs"] = [1, 2, 3]
	copied_session.rng.stream("combat").next_u32()
	_check(not session.battle.kept[0] and session.battle.locked_inputs.is_empty() and session.rng.capture() != copied_session.rng.capture(), "Battle state and RNG copies are independent")
	print("COMMAND_FIXTURE: %s (%d checks)" % ["PASS" if _failures.is_empty() else "FAIL", _checks])
	return _failures
