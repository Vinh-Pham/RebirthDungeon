class_name CommandResolver
extends RefCounted
## Phase 2 implements only pre-roll selection. No rolls, costs or turns resolve.
const Command = preload("res://scripts/domain/commands/domain_command.gd")
const Result = preload("res://scripts/domain/commands/command_result.gd")
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Skill = preload("res://scripts/data/definitions/skill_definition.gd")
const Actor = preload("res://scripts/domain/state/actor_state.gd")

static func parse_intent(intent: Dictionary) -> Command:
	var expected := {"session_id": TYPE_INT, "expected_revision": TYPE_INT, "operation_id": TYPE_STRING,
		"kind": TYPE_STRING, "actor_id": TYPE_STRING, "skill_id": TYPE_STRING, "target_id": TYPE_STRING}
	if intent.size() != expected.size():
		return null
	for key: String in expected:
		if typeof(intent.get(key)) != expected[key]:
			return null
	var command := Command.new()
	for key: String in expected:
		command.set(key, intent[key])
	return command

static func resolve(session: Session, command: Command, catalog: Catalog) -> Result:
	if session == null or command == null or catalog == null or not catalog.is_ready():
		return _reject("invalid_command")
	if not session.matches(command.session_id, command.expected_revision):
		return _reject("stale_session_or_revision", command)
	if command.operation_id.strip_edges().is_empty() or command.operation_id.length() > 128:
		return _reject("invalid_operation_id", command)
	if session.accepted_operations.has(command.operation_id):
		return _reject("duplicate_operation", command)
	if session.revision >= 9223372036854775807:
		return _reject("revision_exhausted", command)
	if command.kind != "select_skill":
		return _reject("unsupported_command", command)
	if session.mode != Session.Mode.BATTLE or session.battle == null or session.hero == null:
		return _reject("no_battle", command)
	var battle := session.battle
	var hero := session.hero
	if battle.phase != battle.Phase.PRE_ROLL:
		return _reject("selection_locked", command)
	if command.actor_id != hero.instance_id or battle.active_actor_id != hero.instance_id or hero.current[0] <= 0:
		return _reject("not_active_hero", command)
	if session.content_versions != catalog.versions() or battle.content_versions != session.content_versions:
		return _reject("content_version_mismatch", command)
	var skill := catalog.definition(command.skill_id) as Skill
	if skill == null or not hero.skill_ranks.has(command.skill_id):
		return _reject("unlearned_skill", command)
	var rank: Skill.Rank
	for authored: Skill.Rank in skill.ranks:
		if authored.rank == hero.skill_ranks[command.skill_id]:
			rank = authored
	if rank == null:
		return _reject("unsupported_rank", command)
	if not skill.weapon.is_empty() and hero.weapon != skill.weapon:
		return _reject("weapon_required", command)
	var target: Actor = hero if command.target_id == hero.instance_id else null
	for enemy: Actor in battle.enemies:
		if enemy.instance_id == command.target_id:
			target = enemy
	if target == null or target.current[0] <= 0 or (skill.target == "self" and target != hero) or (skill.target == "hostile" and target == hero):
		return _reject("invalid_target", command)
	var costs := PackedInt64Array([rank.hp_cost, rank.mp_cost, rank.sp_cost])
	for i: int in 3:
		if hero.current[i] - hero.reserved[i] - costs[i] < (1 if i == 0 else 0):
			return _reject("unaffordable", command)
	# Nothing before this point modifies a state object or draws RNG.
	var candidate: Session = session.copy()
	candidate.battle.selected_skill = command.skill_id
	candidate.battle.selected_rank = rank.rank
	candidate.battle.target_id = command.target_id
	candidate.revision += 1
	candidate.accepted_operations[command.operation_id] = candidate.revision
	var result := Result.new()
	result.accepted = true
	result.code = "accepted"
	result.operation_id = command.operation_id
	result.candidate = candidate
	result.events.append({"type": "skill_selected", "session_id": candidate.session_id,
		"revision": candidate.revision, "operation_id": command.operation_id,
		"skill_id": command.skill_id, "rank": rank.rank, "target_id": command.target_id})
	return result

static func _reject(code: String, command: Command = null) -> Result:
	var result := Result.new()
	result.code = code
	if command != null:
		result.operation_id = command.operation_id
	return result
