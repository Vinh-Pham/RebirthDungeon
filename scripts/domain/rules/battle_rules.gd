extends RefCounted
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Battle = preload("res://scripts/domain/state/battle_state.gd")
const Actor = preload("res://scripts/domain/state/actor_state.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Math = preload("res://scripts/domain/rules/combat_math.gd")
const Dice = preload("res://scripts/domain/rules/dice_rules.gd")
const Progression = preload("res://scripts/domain/rules/progression_rules.gd")
const MAX_ENEMIES := 3

## The hero-side combatant: the borrowed champion in a mission battle,
## otherwise the hero. Mission champions use the instance id "hero" so every
## combat rule stays uniform; session.hero never fights inside a mission.
static func participant(session: Session) -> Actor:
	if session.battle != null and session.battle.champion != null: return session.battle.champion
	return session.hero

static func begin(session: Session, encounter_id: String, catalog: RefCounted, champion: Actor = null) -> bool:
	var encounter: Resource = catalog.definition(encounter_id)
	if encounter == null or encounter.actor_ids.is_empty() or encounter.actor_ids.size() > MAX_ENEMIES: return false
	var hero_side: Actor = champion
	if hero_side == null:
		if session.hero == null or session.hero.current[0] <= 0: return false
		hero_side = session.hero
		hero_side.shield_equipped = _hero_shield(hero_side, catalog)
	session.battle = Battle.new()
	session.battle.encounter_id = encounter_id
	session.battle.content_versions = catalog.versions()
	session.battle.pending_gold = encounter.pending_gold
	if champion != null:
		session.battle.champion = champion
		session.battle.mission_id = session.mission_id
	for i: int in encounter.actor_ids.size():
		var definition: Resource = catalog.definition(encounter.actor_ids[i])
		if definition == null:
			session.battle = null
			return false
		var enemy := Actor.new()
		enemy.configure(definition, "enemy.%d" % i)
		session.battle.enemies.append(enemy)
	session.battle.active_actor_id = "hero" if encounter.first_actor == "hero" else session.battle.enemies[0].instance_id
	return true

## The hero's shield tag derives from equipped off-hand gear at battle begin.
static func _hero_shield(hero: Actor, catalog: RefCounted) -> bool:
	if hero is Hero:
		for item: RefCounted in hero.items:
			if not item.container.begins_with("equip:"): continue
			var definition: Resource = catalog.definition(item.definition_id)
			if definition != null and definition.slot == "off_hand": return true
	return false

static func actor(session: Session, id: String) -> Actor:
	if id == "hero": return participant(session)
	for enemy: Actor in session.battle.enemies:
		if enemy.instance_id == id: return enemy
	return null

static func living_enemies(session: Session) -> Array[Actor]:
	var result: Array[Actor] = []
	for enemy: Actor in session.battle.enemies:
		if enemy.current[0] > 0: result.append(enemy)
	return result

static func _is_enemy(actor: Actor) -> bool:
	return actor != null and actor.instance_id.begins_with("enemy.")

static func _hostile(source: Actor, target: Actor) -> bool:
	return _is_enemy(source) != _is_enemy(target)

## Stable hostile member list for target-set skills; area attacks freeze it.
static func hostiles(session: Session, source: Actor) -> Array[Actor]:
	var result: Array[Actor] = []
	if _is_enemy(source):
		var hero_side: Actor = participant(session)
		if hero_side != null and hero_side.current[0] > 0: result.append(hero_side)
	else:
		result.assign(living_enemies(session))
	return result

## Role-playing mission entry: validates eligibility, builds the borrowed
## champion and starts the authored encounter as an isolated battle.
static func begin_mission(session: Session, mission_id: String, catalog: RefCounted) -> String:
	var mission: Variant = Progression.CONFIG.missions.get(mission_id)
	if not mission is Dictionary: return "Unknown mission."
	if session.mode != Session.Mode.TOWN: return "Missions begin in town."
	if session.mission_id != "" or session.battle != null: return "A mission is already active."
	if session.hero == null or session.hero.current[0] <= 0: return "Recover before entering a memory."
	if Progression.mission_record(session.hero, mission_id).get("state","") == "claimed": return "This memory is already recorded."
	var npc: Resource = catalog.definition(str(mission.npc))
	if npc == null: return "The memory's owner is missing."
	var champion := Actor.new()
	champion.configure(npc, "hero")
	session.mission_id = mission_id
	if not begin(session, str(mission.encounter), catalog, champion):
		session.mission_id = ""
		return "The memory cannot be entered."
	return ""

static func selection(session: Session, source_id: String, skill_id: String, target_id: String, catalog: RefCounted) -> Dictionary:
	var source := actor(session, source_id)
	if source == null or source.current[0] <= 0: return {"error": "not_active_actor"}
	var skill: Resource = catalog.definition(skill_id)
	if skill == null or not source.skill_ranks.has(skill_id): return {"error": "unlearned_skill"}
	var rank: Resource = Math.rank_of(skill, str(source.skill_ranks[skill_id]))
	if rank == null: return {"error": "unsupported_rank"}
	if not skill.weapon.is_empty() and source.weapon != skill.weapon: return {"error": "weapon_required"}
	if source.cooldowns.has(skill_id): return {"error": "cooldown"}
	# Final Hit cannot be recast while its nonstacking status is active.
	if skill.effect == "final_hit" and not skill.status_id.is_empty():
		var status: Resource = catalog.definition(skill.status_id)
		var group: String = status.stack_group if status != null and not status.stack_group.is_empty() else skill.status_id
		for active: RefCounted in source.statuses:
			if active.group == group: return {"error": "already_active"}
	var inputs := Math.inputs(source, _representative(session, source, skill, target_id), skill, rank, catalog)
	match skill.target:
		"self":
			# Self-targeted skills reject spoofed or mismatched targets.
			if not target_id.is_empty() and target_id != source.instance_id: return {"error": "invalid_target"}
			target_id = source.instance_id
		"hostile":
			var target := actor(session, target_id)
			if target == null or target.current[0] <= 0 or not _hostile(source, target):
				return {"error": "invalid_target"}
		"ally":
			var target := actor(session, target_id)
			if target == null or target.current[0] <= 0 or _hostile(source, target) or target == source:
				return {"error": "invalid_target"}
		"hostile_all":
			var members: Array[Actor] = hostiles(session, source)
			if members.is_empty(): return {"error": "invalid_target"}
			target_id = ""
			var magical: bool = skill.effect == "magic_damage"
			var frozen: Array[Dictionary] = []
			for member: Actor in members:
				frozen.append({"instance_id": member.instance_id,
					"defense": Math.effective(member, "stat.magic_defense" if magical else "stat.defense", catalog),
					"protection": Math.effective(member, "stat.magic_protection" if magical else "stat.protection", catalog),
					"shield": member.shield})
			inputs["targets"] = frozen
			var ids: Array[String] = []
			for entry: Dictionary in frozen: ids.append(str(entry.instance_id))
			inputs["target_ids"] = ids
		_:
			return {"error": "invalid_target"}
	inputs["target_id"] = target_id
	if not Math.affordable(source, Math.costs(source, rank)): return {"error": "unaffordable"}
	return inputs

## Real actor for frozen stat capture: single-target skills freeze their one
## target; area skills freeze the first living member's inline fields unused.
static func _representative(session: Session, source: Actor, skill: Resource, target_id: String) -> Actor:
	match skill.target:
		"self": return source
		"hostile", "ally": return actor(session, target_id)
		"hostile_all":
			var members: Array[Actor] = hostiles(session, source)
			return members[0] if not members.is_empty() else null
		_: return null

## Legal enemy intents for the active enemy, in stable authored order.
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
		var target_id: String = source.instance_id
		if skill.target == "hostile":
			var hero_side: Actor = participant(session)
			if hero_side == null or hero_side.current[0] <= 0: continue
			target_id = hero_side.instance_id
		elif skill.target == "ally":
			var found := false
			for other: Actor in session.battle.enemies:
				if other != source and other.current[0] > 0:
					target_id = other.instance_id
					found = true
					break
			if not found: continue # Authored fallback: no living ally, no offer.
		elif skill.target != "self": continue
		var choice := selection(session, source.instance_id, id, target_id, catalog)
		if not choice.has("error") and not choice.uses_dice:
			result.append({"skill_id": id, "target_id": choice.target_id})
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

## One committed activation: payment, counter interception, per-target hits
## with critical checks, statuses, training, then defeat/victory evaluation.
static func finish(session: Session, catalog: RefCounted, discard: bool, events: Array[Dictionary]) -> void:
	var battle := session.battle
	var source := actor(session, battle.active_actor_id)
	if battle.phase == Battle.Phase.LOCKED:
		var locked := battle.locked_inputs
		for i: int in 3: source.current[i] -= source.reserved[i]
		source.reserved.fill(0)
		if not discard:
			_apply(session, source, locked, catalog, events)
		else:
			events.append({"type": "activation_completed", "actor_id": source.instance_id, "passed": true})
	else:
		events.append({"type": "activation_completed", "actor_id": source.instance_id, "passed": discard})
	Math.end_activation(source)
	battle.activation += 1
	_advance(session, source, catalog, events)
	battle.selected_skill = ""
	battle.selected_rank = ""
	battle.target_id = ""
	battle.hand.clear()
	battle.kept.fill(false)
	battle.rerolls_remaining = 2
	battle.locked_inputs.clear()

## Effect resolution for one committed, non-discarded hand.
static func _apply(session: Session, source: Actor, locked: Dictionary, catalog: RefCounted, events: Array[Dictionary]) -> void:
	var battle := session.battle
	var pips: int = 0
	var combination: int = 0
	var combo := Vector2i(1, 1)
	if locked.uses_dice:
		combination = Dice.classify(battle.hand)
		combo = catalog.combination(combination)
		for pip: int in battle.hand: pips += pip
	match locked.effect:
		"physical_damage", "magic_damage":
			# Counter interception: an eligible single-target physical hit on a
			# prepared defender is negated and repelled inside this transaction.
			if locked.effect == "physical_damage" and not locked.has("targets"):
				var defender := actor(session, _target_id_of(locked))
				if defender != null and defender != source and _hostile(source, defender) and not defender.reaction.is_empty():
					_consume_counter(session, defender, source, locked, catalog, events)
					return
			var bonus: int = Math.critical_bonus(source, catalog)
			var hits: int = 0
			var kills: int = 0
			var criticals: int = 0
			for target_input: Dictionary in Math.target_inputs(locked):
				var target := actor(session, _target_id_of(target_input))
				if target == null or target.current[0] <= 0: continue
				var critical: bool = false
				# One explicit draw per valid target, stable order, no draw at
				# zero chance. Drawn inside this committed candidate, so save
				# retries reproduce identical critical outcomes.
				if int(locked.critical_chance) > 0:
					critical = session.rng.stream("combat").bounded(Math.BASIS) < int(locked.critical_chance)
				var hit: Dictionary = Math.resolve_hit(locked, target_input, pips, combination, combo, bonus if critical else 0)
				target.shield -= int(hit.absorbed)
				target.current[0] = maxi(0, target.current[0] - int(hit.amount))
				hits += 1
				kills += 1 if target.current[0] == 0 else 0
				criticals += 1 if hit.critical else 0
				events.append({"type": "effect", "actor_id": source.instance_id, "target_id": target.instance_id,
					"skill_id": locked.skill_id, "preview": {"amount": hit.amount, "absorbed": hit.absorbed,
					"critical": hit.critical, "pips": pips, "combination": combination}})
			if hits > 0 and source == participant(session):
				# Only the hero-side combatant trains the run; enemy or champion
				# activations must never write hero progression.
				Progression.activation(session, str(locked.skill_id), {"hits": hits, "kills": kills, "criticals": criticals}, source, catalog)
			# On-hit status: single-target damage skills only; the hero-side
			# area skill authors none, and frozen sets would fan it out.
			if not String(locked.status_id).is_empty():
				var status: Resource = catalog.definition(locked.status_id)
				var hit_target := actor(session, _target_id_of(locked))
				if status != null and hit_target != null and hit_target.current[0] > 0:
					Math.apply_status(hit_target, status, source.instance_id, status.magnitude,
						int(locked.duration) if int(locked.duration) > 0 else status.duration, source.instance_id)
		"shield", "stat_buff":
			var target := actor(session, str(locked.target_id))
			if target != null and target.current[0] > 0:
				var status: Resource = catalog.definition(locked.status_id)
				# Shield magnitude keeps the combination multiplier.
				var magnitude: int = Math.floor_div((int(locked.base) + int(locked.pip_scale) * pips) * combo.x, combo.y)
				Math.apply_status(target, status, source.instance_id, magnitude if locked.effect == "shield" else status.magnitude,
					int(locked.duration) if int(locked.duration) > 0 else status.duration, source.instance_id)
				if int(locked.cooldown) > 0:
					source.cooldowns[str(locked.skill_id)] = source.completed_activations + int(locked.cooldown) + 1
				if source == participant(session):
					Progression.activation(session, str(locked.skill_id), {})
				events.append({"type": "effect", "actor_id": source.instance_id, "target_id": target.instance_id,
					"skill_id": locked.skill_id, "preview": {"amount": 0, "absorbed": 0, "critical": false, "pips": pips, "combination": combination}})
		"counter":
			# Prepare one charge; stored power already includes the combination.
			source.reaction = {"skill_id": str(locked.skill_id), "power": clampi(Math.floor_div((int(locked.base) + int(locked.pip_scale) * pips) * combo.x, combo.y), 0, Math.CAP)}
			if int(locked.cooldown) > 0:
				source.cooldowns[str(locked.skill_id)] = source.completed_activations + int(locked.cooldown) + 1
			if source == participant(session):
				Progression.activation(session, str(locked.skill_id), {})
			events.append({"type": "effect", "actor_id": source.instance_id, "target_id": source.instance_id,
				"skill_id": locked.skill_id, "preview": {"amount": 0, "absorbed": 0, "critical": false, "pips": pips, "combination": combination}})
		"final_hit":
			var target := actor(session, str(locked.target_id))
			if target != null and target.current[0] > 0:
				var status: Resource = catalog.definition(locked.status_id)
				# The resolved magnitude is stored once; later attacks never reroll it.
				var magnitude: int = clampi(Math.floor_div((int(locked.base) + int(locked.pip_scale) * pips) * combo.x, combo.y), 0, Math.CAP)
				Math.apply_status(target, status, source.instance_id, magnitude,
					int(locked.duration) if int(locked.duration) > 0 else status.duration, source.instance_id)
				if int(locked.cooldown) > 0:
					source.cooldowns[str(locked.skill_id)] = source.completed_activations + int(locked.cooldown) + 1
				if source == participant(session):
					Progression.activation(session, str(locked.skill_id), {})
				events.append({"type": "effect", "actor_id": source.instance_id, "target_id": target.instance_id,
					"skill_id": locked.skill_id, "preview": {"amount": magnitude, "absorbed": 0, "critical": false, "pips": pips, "combination": combination}})

## The counter check resolves a single locked target: inline target_id for
## single-target actions, frozen member ids for area actions.
static func _target_id_of(target_input: Dictionary) -> String:
	return str(target_input.get("instance_id", target_input.get("target_id","")))

## The defender consumes the stance, negates the hit and retaliates once.
static func _consume_counter(session: Session, defender: Actor, attacker: Actor, locked: Dictionary, catalog: RefCounted, events: Array[Dictionary]) -> void:
	var stance: Dictionary = defender.reaction
	defender.reaction = {}
	var hit: Dictionary = Math.counter_hit(stance, attacker, catalog)
	attacker.shield -= int(hit.absorbed)
	attacker.current[0] = maxi(0, attacker.current[0] - int(hit.amount))
	events.append({"type": "counter", "actor_id": defender.instance_id, "target_id": attacker.instance_id,
		"skill_id": str(stance.get("skill_id","")), "amount": int(hit.amount), "absorbed": int(hit.absorbed),
		"negated_skill": str(locked.skill_id)})
	if defender == participant(session):
		Progression.reaction(session, str(stance.skill_id))
	# No on-hit status, no critical draw, no further damage from this action.

## Turn order: hero side, then enemies in stable authored order, skipping the
## defeated. Reaction stances expire at the start of the owner's next turn.
static func _advance(session: Session, finished: Actor, catalog: RefCounted, events: Array[Dictionary]) -> void:
	var battle := session.battle
	if participant(session).current[0] <= 0:
		battle.outcome = "defeat"
	elif living_enemies(session).is_empty():
		battle.outcome = "victory"
	if not battle.outcome.is_empty():
		battle.phase = Battle.Phase.FINISHED
		if battle.mission_id.is_empty() and session.exploration != null:
			if battle.outcome == "victory" and not session.exploration.resolved.has(battle.encounter_id):
				Progression.encounter(session, catalog)
				session.exploration.resolved.append(battle.encounter_id)
				session.exploration.pending_gold = mini(Math.CAP, session.exploration.pending_gold + battle.pending_gold)
			elif battle.outcome == "defeat":
				session.exploration.pending_gold = 0
		events.append({"type": "battle_finished", "outcome": battle.outcome})
		return
	var order: Array[Actor] = [participant(session)]
	for enemy: Actor in battle.enemies: order.append(enemy)
	var start: int = order.find(finished)
	for step: int in range(1, order.size() + 1):
		var candidate: Actor = order[posmod(start + step, order.size())]
		if candidate != null and candidate.current[0] > 0:
			battle.active_actor_id = candidate.instance_id
			break
	battle.phase = Battle.Phase.PRE_ROLL
	var next: Actor = actor(session, battle.active_actor_id)
	if next != null and not next.reaction.is_empty(): next.reaction = {}
