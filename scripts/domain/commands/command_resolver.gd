class_name CommandResolver
extends RefCounted
## Validation is read-only; all payments, rolls and effects belong to a copied candidate.
const Command = preload("res://scripts/domain/commands/domain_command.gd")
const Result = preload("res://scripts/domain/commands/command_result.gd")
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Dice = preload("res://scripts/domain/rules/dice_rules.gd")
const Progression = preload("res://scripts/domain/rules/progression_rules.gd")
const Inventory = preload("res://scripts/domain/rules/inventory_rules.gd")
const Dungeon = preload("res://scripts/domain/rules/dungeon_rules.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
const KINDS := ["select_skill", "roll", "keep", "reroll", "commit", "pass", "enemy_action", "buy_potion", "recover", "enter_dungeon", "abandon", "use_potion"]

static func parse_intent(intent: Dictionary) -> Command:
	var expected := {"session_id": TYPE_INT, "expected_revision": TYPE_INT, "operation_id": TYPE_STRING,
		"kind": TYPE_STRING, "actor_id": TYPE_STRING, "skill_id": TYPE_STRING, "target_id": TYPE_STRING}
	if intent.get("kind") in ["keep", "reroll"]: expected["indices"] = TYPE_ARRAY
	if intent.get("kind") in Progression.KINDS: expected["data"] = TYPE_DICTIONARY
	if intent.size() != expected.size(): return null
	for key: String in expected:
		if typeof(intent.get(key)) != expected[key]: return null
	var command := Command.new()
	for key: String in expected: command.set(key, intent[key].duplicate(true) if key in ["indices","data"] else intent[key])
	return command

static func resolve(session: Session, command: Command, catalog: Catalog) -> Result:
	if session == null or command == null or catalog == null or not catalog.is_ready(): return _reject("invalid_command")
	if not session.matches(command.session_id, command.expected_revision): return _reject("stale_session_or_revision", command)
	if command.operation_id.strip_edges().is_empty() or command.operation_id.length() > 128: return _reject("invalid_operation_id", command)
	if session.accepted_operations.has(command.operation_id): return _reject("duplicate_operation", command)
	if session.revision >= 9223372036854775807: return _reject("revision_exhausted", command)
	if command.kind == "mission_enter": return _mission(session,command,catalog)
	if command.kind in Progression.KINDS: return _progression(session,command,catalog)
	if command.kind not in KINDS: return _reject("unsupported_command", command)
	if command.kind in ["buy_potion","recover","enter_dungeon","abandon"]:
		return _service(session,command,catalog)
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
		"use_potion":
			if battle.phase != battle.Phase.PRE_ROLL: return _reject("selection_locked", command)
			if session.hero.potions <= 0: return _reject("no_potions", command)
			if session.hero.current[0] >= session.hero.maximum[0]: return _reject("health_full", command)
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
		"use_potion":
			if candidate.hero.growth.is_empty(): candidate.hero.potions -= 1
			elif not Inventory.use_potion(candidate.hero): return _reject("No unlocked carried potion.",command)
			candidate.hero.current[0] = mini(candidate.hero.maximum[0], candidate.hero.current[0] + 15)
			events.append({"type":"potion_used","healing":15})
			Rules.finish(candidate,catalog,false,events)
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

## RP mission entry: one validated town transaction that isolates the borrowed
## NPC champion into its own battle. The hero's state never participates.
static func _mission(session: Session, command: Command, catalog: Catalog) -> Result:
	if session.hero == null or session.content_versions != catalog.versions(): return _reject("invalid_mission",command)
	if command.actor_id != "hero" or not command.skill_id.is_empty(): return _reject("invalid_mission",command)
	if command.target_id != "npc.keeper": return _reject("invalid_mission_target",command)
	if typeof(command.data.get("item")) != TYPE_STRING: return _reject("invalid_mission",command)
	var candidate: Session = session.copy()
	var error: String = Rules.begin_mission(candidate, command.data.item, catalog)
	if not error.is_empty(): return _reject(error,command)
	candidate.mode = Session.Mode.BATTLE
	candidate.revision += 1
	candidate.accepted_operations[command.operation_id] = candidate.revision
	var result := Result.new()
	result.accepted = true
	result.code = "accepted"
	result.operation_id = command.operation_id
	result.candidate = candidate
	result.events.append({"type":"mission_entered","mission_id":command.data.item,
		"session_id":candidate.session_id,"revision":candidate.revision,"operation_id":command.operation_id})
	return result

static func _reject(code: String, command: Command = null) -> Result:
	var result := Result.new()
	result.code = code
	if command != null: result.operation_id = command.operation_id
	return result

## Phase 11: one seeded expedition layout per accepted entry. The run seed mixes
## a bounded generation-stream draw with the session identity, so expeditions
## differ across runs and sessions while staying fully reproducible. The whole
## candidate is discarded on rejection, so a failed entry leaves the session's
## state and RNG unchanged.
static func _generate_exploration(candidate: Session, catalog: Catalog) -> String:
	var def: Resource = catalog.definition("dungeon.undercrypt")
	if def == null: return "dungeon_unavailable"
	var draw: int = candidate.rng.stream("generation").bounded(Limits.VALUE_MAX)
	if draw < 0: return "dungeon_unavailable"
	var payload: Dictionary = Dungeon.generate(def, catalog.definition, candidate.rng.stream("generation"),
		(draw + candidate.session_id) % (Limits.VALUE_MAX + 1), "dungeon.undercrypt")
	if payload.has("error"): return str(payload.error)
	candidate.exploration.layout_id = str(payload.layout_id)
	candidate.exploration.rooms = payload.rooms.duplicate(true)
	candidate.exploration.bindings = payload.bindings.duplicate(true)
	candidate.exploration.exit_room_id = str(payload.exit_room_id)
	candidate.exploration.run_seed = int(payload.run_seed)
	candidate.exploration.world_id = str(payload.world_id)
	candidate.exploration.discovered.assign([str(payload.rooms[0].room_id)])
	return ""

## Temporary first-loop service values: one potion per purchase, 5 gold, cap 5.
## Spatial/session ownership is revalidated by Main before this pure resolver.
static func _service(session: Session, command: Command, catalog: Catalog) -> Result:
	if session.hero == null or session.content_versions != catalog.versions(): return _reject("invalid_service",command)
	if command.actor_id != "hero" or not command.skill_id.is_empty(): return _reject("invalid_service",command)
	if command.kind == "abandon":
		if session.mode != Session.Mode.DUNGEON or session.exploration == null or not session.exploration.active_encounter.is_empty(): return _reject("not_exploring",command)
		if command.target_id != "dungeon.undercrypt": return _reject("invalid_target",command)
	else:
		if session.mode != Session.Mode.TOWN: return _reject("not_in_town",command)
		if command.target_id != ("entrance.undercrypt" if command.kind == "enter_dungeon" else "npc.keeper"): return _reject("invalid_target",command)
	if command.kind == "buy_potion" and not session.hero.growth.is_empty():
		command.kind = "buy_item"
		command.data = {"item":"item.potion","destination":"","column":0,"row":0,"quantity":1}
		return _progression(session,command,catalog)
	if command.kind == "enter_dungeon" and not session.hero.growth.is_empty():
		if Inventory.capacity(session.hero,catalog)-session.hero.committed_gold < 25:
			return _reject("Bank gold to reserve 25 capacity for expedition rewards.",command)
		for item: RefCounted in session.hero.items:
			if item.container == "overflow": return _reject("Withdraw all reward overflow before entering.",command)
	if command.kind == "buy_potion":
		if session.hero.committed_gold < 5: return _reject("insufficient_gold",command)
		if session.hero.potions >= 5: return _reject("supplies_full",command)
	if command.kind == "enter_dungeon" and session.hero.current[0] <= 0: return _reject("recovery_required",command)
	var candidate: Session = session.copy()
	match command.kind:
		"buy_potion":
			candidate.hero.committed_gold -= 5
			candidate.hero.potions += 1
		"recover":
			candidate.hero.current = candidate.hero.maximum.duplicate()
			candidate.hero.reserved.fill(0)
			candidate.hero.statuses.clear()
			candidate.hero.cooldowns.clear()
			candidate.hero.shield = 0
		"enter_dungeon":
			candidate.exploration = preload("res://scripts/domain/state/exploration_state.gd").new()
			var generated := _generate_exploration(candidate, catalog)
			if not generated.is_empty(): return _reject(generated,command)
			candidate.battle = null
			candidate.mode = Session.Mode.DUNGEON
			Progression.begin(candidate)
		"abandon":
			var outcome_error := Progression.finish(candidate,false,catalog)
			if not outcome_error.is_empty(): return _reject(outcome_error,command)
			candidate.exploration.pending_gold = 0
			candidate.battle = null
			candidate.hero.statuses.clear()
			candidate.hero.cooldowns.clear()
			candidate.hero.shield = 0
			candidate.mode = Session.Mode.RESULTS
	candidate.revision += 1
	candidate.accepted_operations[command.operation_id] = candidate.revision
	var result := Result.new()
	result.accepted = true
	result.code = "accepted"
	result.operation_id = command.operation_id
	result.candidate = candidate
	result.events.append({"type":command.kind,"session_id":candidate.session_id,"revision":candidate.revision,"operation_id":command.operation_id})
	return result

static func _progression(session: Session, command: Command, catalog: Catalog) -> Result:
	if session.hero == null or command.actor_id != "hero" or not command.skill_id.is_empty() or session.content_versions != catalog.versions(): return _reject("invalid_progression_command",command)
	if command.kind in ["buy_item","sell_item","bank_deposit","bank_withdraw","learn_lesson","apply_enchant","burn_item"] and command.target_id != "npc.keeper": return _reject("invalid_service_target",command)
	if command.kind == "quest_claim":
		var quest: Variant = Progression.CONFIG.quests.get(command.data.get("item",""),null)
		if quest is Dictionary and quest.get("delivery","auto") == "npc" and command.target_id != "npc.keeper":
			return _reject("Return this quest to the keeper.",command)
	var candidate: Session = session.copy()
	var error := Progression.action(candidate,command.kind,command.data,command.operation_id,catalog)
	if not error.is_empty(): return _reject(error,command)
	candidate.revision += 1
	candidate.accepted_operations[command.operation_id] = candidate.revision
	var result := Result.new()
	result.accepted = true
	result.code = "accepted"
	result.operation_id = command.operation_id
	result.candidate = candidate
	result.events.append({"type":command.kind,"session_id":candidate.session_id,"revision":candidate.revision,"operation_id":command.operation_id,"detail":Progression.detail})
	return result

## Phase 10: role-playing mission entry (mission_enter) resolves here as well.
