class_name CommandResolver
extends RefCounted
## Validation is read-only; all payments, rolls and effects belong to a copied candidate.
const Command = preload("res://scripts/domain/commands/domain_command.gd")
const Result = preload("res://scripts/domain/commands/command_result.gd")
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Dice = preload("res://scripts/domain/rules/dice_rules.gd")
const KINDS := ["select_skill", "roll", "keep", "reroll", "commit", "pass", "enemy_action"]

static func parse_intent(intent: Dictionary) -> Command:
	var expected := {"session_id": TYPE_INT, "expected_revision": TYPE_INT, "operation_id": TYPE_STRING,
		"kind": TYPE_STRING, "actor_id": TYPE_STRING, "skill_id": TYPE_STRING, "target_id": TYPE_STRING}
	if intent.get("kind") in ["keep", "reroll"]: expected["indices"] = TYPE_ARRAY
	if intent.size() != expected.size(): return null
	for key: String in expected:
		if typeof(intent.get(key)) != expected[key]: return null
	var command := Command.new()
	for key: String in expected: command.set(key, intent[key].duplicate() if key == "indices" else intent[key])
	return command

static func resolve(session: Session, command: Command, catalog: Catalog) -> Result:
	if session == null or command == null or catalog == null or not catalog.is_ready(): return _reject("invalid_command")
	if not session.matches(command.session_id, command.expected_revision): return _reject("stale_session_or_revision", command)
	if command.operation_id.strip_edges().is_empty() or command.operation_id.length() > 128: return _reject("invalid_operation_id", command)
	if session.accepted_operations.has(command.operation_id): return _reject("duplicate_operation", command)
	if session.revision >= 9223372036854775807: return _reject("revision_exhausted", command)
	if command.kind not in KINDS: return _reject("unsupported_command", command)
	if session.mode != Session.Mode.BATTLE or session.battle == null or session.hero == null: return _reject("no_battle", command)
	var battle := session.battle
	if battle.phase == battle.Phase.FINISHED: return _reject("battle_finished", command)
	if command.kind == "select_skill" and battle.phase != battle.Phase.PRE_ROLL: return _reject("selection_locked", command)
	if command.actor_id != battle.active_actor_id or Rules.actor(session, command.actor_id) == null or Rules.actor(session, command.actor_id).current[0] <= 0:
		return _reject("not_active_hero" if command.kind != "enemy_action" else "not_active_actor", command)
	if command.kind != "enemy_action" and command.actor_id != session.hero.instance_id: return _reject("not_active_hero", command)
	if session.content_versions != catalog.versions() or battle.content_versions != session.content_versions: return _reject("content_version_mismatch", command)
	var inputs := {}
	match command.kind:
		"select_skill", "roll", "enemy_action":
			if battle.phase != battle.Phase.PRE_ROLL: return _reject("selection_locked", command)
			if command.kind == "enemy_action" and command.actor_id == "hero": return _reject("not_active_enemy", command)
			if command.kind == "enemy_action" and command.skill_id.is_empty():
				pass # Explicit fallback pass, validated against the activation token.
			else:
				var skill_id: String = battle.selected_skill if command.kind == "roll" else command.skill_id
				var target_id: String = battle.target_id if command.kind == "roll" else command.target_id
				inputs = Rules.selection(session, command.actor_id, skill_id, target_id, catalog)
				if inputs.has("error"): return _reject(inputs.error, command)
				if command.kind == "enemy_action" and inputs.uses_dice: return _reject("enemy_dice_unsupported", command)
		"keep":
			if battle.phase != battle.Phase.LOCKED or battle.hand.size() != 5: return _reject("not_locked", command)
			if command.indices.size() != 1 or typeof(command.indices[0]) != TYPE_INT or command.indices[0] < 0 or command.indices[0] > 4:
				return _reject("invalid_subset", command)
		"reroll":
			if battle.phase != battle.Phase.LOCKED or battle.rerolls_remaining <= 0: return _reject("no_rerolls", command)
			if not Dice.valid_subset(command.indices, battle.kept): return _reject("invalid_subset", command)
		"commit":
			if battle.phase != battle.Phase.LOCKED: return _reject("not_locked", command)
		"pass":
			if battle.phase not in [battle.Phase.PRE_ROLL, battle.Phase.LOCKED]: return _reject("invalid_phase", command)
	# No state or RNG changes occur above this line.
	var candidate: Session = session.copy()
	var next := candidate.battle
	var events: Array[Dictionary] = []
	match command.kind:
		"select_skill":
			next.selected_skill = inputs.skill_id
			next.selected_rank = inputs.rank
			next.target_id = inputs.target_id
			events.append({"type": "skill_selected", "skill_id": inputs.skill_id, "rank": inputs.rank, "target_id": inputs.target_id})
		"roll":
			Rules.lock(candidate, inputs)
			events.append({"type": "rolled", "hand": next.hand.duplicate()})
		"keep":
			next.kept[command.indices[0]] = not next.kept[command.indices[0]]
		"reroll":
			var indices := command.indices.duplicate()
			indices.sort()
			for index: int in indices:
				next.hand[index] = Dice.sample(next.locked_inputs.weights, candidate.rng.stream("combat"))
			next.rerolls_remaining -= 1
			events.append({"type": "rerolled", "hand": next.hand.duplicate()})
		"commit", "pass":
			Rules.finish(candidate, catalog, command.kind == "pass", events)
		"enemy_action":
			if not inputs.is_empty(): Rules.lock(candidate, inputs)
			Rules.finish(candidate, catalog, inputs.is_empty(), events)
	candidate.revision += 1
	candidate.accepted_operations[command.operation_id] = candidate.revision
	for event: Dictionary in events:
		event.merge({"session_id": candidate.session_id, "revision": candidate.revision, "operation_id": command.operation_id})
	var result := Result.new()
	result.accepted = true
	result.code = "accepted"
	result.operation_id = command.operation_id
	result.candidate = candidate
	result.events = events
	return result

static func _reject(code: String, command: Command = null) -> Result:
	var result := Result.new()
	result.code = code
	if command != null: result.operation_id = command.operation_id
	return result
