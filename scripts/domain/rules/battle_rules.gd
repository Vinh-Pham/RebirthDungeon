extends RefCounted
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Battle = preload("res://scripts/domain/state/battle_state.gd")
const Actor = preload("res://scripts/domain/state/actor_state.gd")
const Math = preload("res://scripts/domain/rules/combat_math.gd")
const Dice = preload("res://scripts/domain/rules/dice_rules.gd")

static func begin(session: Session, encounter_id: String, catalog: RefCounted) -> bool:
	var encounter: Resource = catalog.definition(encounter_id)
	if encounter == null or session.hero == null or session.hero.current[0] <= 0: return false
	session.battle = Battle.new()
	session.battle.encounter_id = encounter_id
	session.battle.content_versions = catalog.versions()
	session.battle.pending_gold = encounter.pending_gold
	var enemy := Actor.new()
	enemy.configure(catalog.definition(encounter.actor_ids[0]), "enemy.0")
	session.battle.enemies.append(enemy)
	session.battle.active_actor_id = "hero" if encounter.first_actor == "hero" else enemy.instance_id
	return true

static func actor(session: Session, id: String) -> Actor:
	if session.hero.instance_id == id: return session.hero
	for enemy: Actor in session.battle.enemies:
		if enemy.instance_id == id: return enemy
	return null

static func selection(session: Session, source_id: String, skill_id: String, target_id: String, catalog: RefCounted) -> Dictionary:
	var source := actor(session, source_id)
	if source == null or source.current[0] <= 0: return {"error": "not_active_actor"}
	var skill: Resource = catalog.definition(skill_id)
	if skill == null or not source.skill_ranks.has(skill_id): return {"error": "unlearned_skill"}
	var rank: Resource
	for entry: Resource in skill.ranks:
		if entry.rank == source.skill_ranks[skill_id]: rank = entry
	if rank == null: return {"error": "unsupported_rank"}
	if not skill.weapon.is_empty() and source.weapon != skill.weapon: return {"error": "weapon_required"}
	if source.cooldowns.has(skill_id): return {"error": "cooldown"}
	var target := actor(session, target_id)
	if target == null or target.current[0] <= 0 or (skill.target == "self" and source != target) or (skill.target == "hostile" and (source == session.hero) == (target == session.hero)):
		return {"error": "invalid_target"}
	if not Math.affordable(source, Math.costs(source, rank)): return {"error": "unaffordable"}
	return Math.inputs(source, target, skill, rank, catalog)

static func legal_enemy_actions(session: Session, catalog: RefCounted) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	if session.battle == null or session.battle.phase != Battle.Phase.PRE_ROLL or session.battle.active_actor_id == "hero":
		return result
	var source := actor(session, session.battle.active_actor_id)
	var ids: Array = source.skill_ranks.keys()
	ids.sort()
	for id: String in ids:
		var skill: Resource = catalog.definition(id)
		if skill == null: continue
		var target_id: String = source.instance_id if skill.target == "self" else session.hero.instance_id
		var choice := selection(session, source.instance_id, id, target_id, catalog)
		if not choice.has("error") and not choice.uses_dice:
			result.append({"skill_id": id, "target_id": target_id})
	return result

static func lock(session: Session, inputs: Dictionary) -> void:
	var battle := session.battle
	battle.locked_inputs = inputs.duplicate(true)
	battle.selected_skill = inputs.skill_id
	battle.selected_rank = inputs.rank
	battle.target_id = inputs.target_id
	actor(session, battle.active_actor_id).reserved = inputs.costs.duplicate()
	battle.phase = Battle.Phase.LOCKED
	battle.hand.clear()
	if inputs.uses_dice:
		for i: int in 5: battle.hand.append(Dice.sample(inputs.weights, session.rng.stream("combat")))

static func finish(session: Session, catalog: RefCounted, discard: bool, events: Array[Dictionary]) -> void:
	var battle := session.battle
	var source := actor(session, battle.active_actor_id)
	if battle.phase == Battle.Phase.LOCKED:
		var locked := battle.locked_inputs
		for i: int in 3: source.current[i] -= source.reserved[i]
		source.reserved.fill(0)
		if not discard:
			var target := actor(session, battle.target_id)
			var effect := Math.preview(locked, battle.hand, catalog)
			if locked.effect in ["physical_damage", "magic_damage"]:
				target.shield -= int(effect.absorbed)
				target.current[0] = maxi(0, target.current[0] - int(effect.amount))
			if not String(locked.status_id).is_empty() and target.current[0] > 0:
				var status: Resource = catalog.definition(locked.status_id)
				Math.apply_status(target, status, source.instance_id, int(effect.amount) if locked.effect == "shield" else status.magnitude,
					int(locked.duration) if int(locked.duration) > 0 else status.duration, source.instance_id)
			if int(locked.cooldown) > 0:
				source.cooldowns[battle.selected_skill] = source.completed_activations + int(locked.cooldown) + 1
			events.append({"type": "effect", "actor_id": source.instance_id, "target_id": target.instance_id, "skill_id": battle.selected_skill, "preview": effect})
	events.append({"type": "activation_completed", "actor_id": source.instance_id, "passed": discard})
	Math.end_activation(source)
	battle.activation += 1
	# Periodic defeat is evaluated before rewards, with hero defeat precedence.
	if session.hero.current[0] <= 0: battle.outcome = "defeat"
	elif battle.enemies[0].current[0] <= 0: battle.outcome = "victory"
	if not battle.outcome.is_empty():
		battle.phase = Battle.Phase.FINISHED
		if session.exploration != null:
			if battle.outcome == "victory" and not session.exploration.resolved.has(battle.encounter_id):
				session.exploration.resolved.append(battle.encounter_id)
				session.exploration.pending_gold = mini(Math.CAP, session.exploration.pending_gold + battle.pending_gold)
			elif battle.outcome == "defeat":
				session.exploration.pending_gold = 0
		events.append({"type": "battle_finished", "outcome": battle.outcome})
	else:
		battle.active_actor_id = battle.enemies[0].instance_id if source == session.hero else session.hero.instance_id
		battle.phase = Battle.Phase.PRE_ROLL
	battle.selected_skill = ""
	battle.selected_rank = ""
	battle.target_id = ""
	battle.hand.clear()
	battle.kept.fill(false)
	battle.rerolls_remaining = 2
	battle.locked_inputs.clear()
