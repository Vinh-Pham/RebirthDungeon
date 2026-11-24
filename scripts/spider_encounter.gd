extends RefCounted
## Independent readiness clocks and deterministic melee counter resolution.

const Stats = preload("res://scripts/character_stats.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const IntentAI = preload("res://scripts/combat_intent_ai.gd")

enum Action { ATTACK, DEFEND, SMASH, COUNTERATTACK, WINDMILL }

const ATTACK_COST := 2
const SMASH_COST := 6
const GUARD_RECOVERY := 4

const PLAYER_CHARGE_SECONDS := 2.5
const ENEMY_CHARGE_SECONDS := 4.5

var player_gauge := 0.0
var enemy_gauge: float:
	get:
		return _enemies[0].gauge if not _enemies.is_empty() else 0.0
	set(value):
		if not _enemies.is_empty():
			_enemies[0].gauge = value
var guarded := false
var countering := false
var training_events: Array[String] = []
var enemy_actions: int:
	get:
		return _enemies[0].actions if not _enemies.is_empty() else 0
	set(value):
		if not _enemies.is_empty():
			_enemies[0].actions = value
var health := 0
var stamina := 0
var enemy_health: int:
	get:
		return _enemies[0].health if not _enemies.is_empty() else 0
	set(value):
		if not _enemies.is_empty():
			_enemies[0].health = value
var intent: int:
	get:
		return _enemies[0].intent if not _enemies.is_empty() else Action.DEFEND
	set(value):
		if not _enemies.is_empty():
			_enemies[0].intent = value
var active := false
var round_number := 0
var last_player_hit := false
var last_enemy_hit := false
class EnemyState:
	extends RefCounted
	var health := 0
	var gauge := 0.0
	var intent: int = Action.DEFEND
	var actions := 0
	var stats: Dictionary
	var charge_seconds := ENEMY_CHARGE_SECONDS
	var can_attack := false

var _enemies: Array[EnemyState] = []
var _intent_owner: Node
var _character: Dictionary = {}
var _rng := RandomNumberGenerator.new()
var rng_state: int:
	get:
		return _rng.state
	set(value):
		_rng.state = value


func begin(enemy_stats: Dictionary, seed_value: int, character_stats: Dictionary, current_health := -1) -> bool:
	return begin_group([enemy_stats], seed_value, character_stats, current_health)


func begin_group(enemies: Array, seed_value: int, character_stats: Dictionary, current_health := -1, owner_node: Node = null) -> bool:
	active = false
	_intent_owner = owner_node
	_enemies.clear()
	for data in enemies:
		if not data is Dictionary or not _number(data.get("health")) or float(data["health"]) <= 0.0:
			_enemies.clear()
			return false
		var state := EnemyState.new()
		state.stats = data.duplicate(true)
		state.health = int(data["health"])
		state.charge_seconds = ENEMY_CHARGE_SECONDS + _enemies.size() * 0.65
		var damage_min: Variant = data.get("damage_min")
		var damage_max: Variant = data.get("damage_max")
		state.can_attack = _number(damage_min) and _number(damage_max) and damage_min >= 0 and damage_max >= damage_min
		_enemies.append(state)
	if _enemies.is_empty():
		return false
	_character = character_stats
	health = int(_character["life"]) if current_health < 0 else clampi(current_health, 1, int(_character["life"]))
	stamina = int(_character["stamina"])
	round_number = 0
	player_gauge = 0.0
	guarded = false
	countering = false
	training_events.clear()
	last_player_hit = false
	last_enemy_hit = false
	_rng.seed = seed_value
	for enemy in _enemies:
		enemy.intent = IntentAI.choose(enemy.can_attack, enemy.actions, _intent_owner)
	active = true
	return true


func enemy_count() -> int:
	return _enemies.size()


func enemy_at(index: int) -> EnemyState:
	return _enemies[index] if index >= 0 and index < _enemies.size() else null


func _living_enemies() -> bool:
	for enemy in _enemies:
		if enemy.health > 0:
			return true
	return false


func stamina_cost(action: int) -> int:
	# A delver always has a way to recover stamina in ATB.
	var skill: String = {Action.SMASH: "smash", Action.COUNTERATTACK: "counterattack", Action.WINDMILL: "windmill"}.get(action, "")
	var effect: Dictionary = _character.get("skill_effects", {}).get(skill, {})
	if effect.has("stamina_use"):
		return int(effect["stamina_use"])
	match action:
		Action.ATTACK: return ATTACK_COST
		Action.SMASH: return SMASH_COST
		Action.COUNTERATTACK: return 4
		Action.WINDMILL: return 8
		_: return 0


func act(player_action: int, weapon: Dictionary, target_index := 0) -> String:
	var target := enemy_at(target_index)
	if target == null or target.health <= 0:
		return ""
	if not player_ready() or player_action < Action.ATTACK or player_action > Action.WINDMILL:
		return ""
	var cost := stamina_cost(player_action)
	if stamina < cost:
		return "Not enough stamina. Defend to recover it."

	training_events.clear()
	last_player_hit = false
	last_enemy_hit = false
	stamina -= cost
	if player_action == Action.DEFEND:
		stamina = mini(stamina + GUARD_RECOVERY, int(_character["stamina"]))
	guarded = player_action == Action.DEFEND
	countering = player_action == Action.COUNTERATTACK
	if guarded:
		training_events.append("use_defense")
	if countering:
		training_events.append("use_a_counterattack")

	var outgoing := 0
	var base_damage := 0
	var critical := false
	var reason := ""
	if player_action == Action.SMASH and target.intent == Action.ATTACK:
		reason = "Smash interrupted."
	elif player_action not in [Action.DEFEND, Action.COUNTERATTACK]:
		last_player_hit = true
		outgoing = Stats.roll_melee(_character, _rng)
		training_events.append("attack")
		if player_action in [Action.SMASH, Action.WINDMILL]:
			training_events.append("knock_down_an_enemy")
		if Catalog.is_sword(weapon):
			training_events.append("attack_an_enemy_with_sword")
		if player_action == Action.SMASH:
			training_events.append("use_the_skill_successfully")
		elif player_action == Action.WINDMILL:
			training_events.append("windmill_attack")
		if player_action == Action.WINDMILL:
			var effect: Dictionary = _character.get("skill_effects", {}).get("windmill", {})
			outgoing = int(ceil(outgoing * float(effect.get("human_giant_damage", 100)) / 100.0))
		var critical_chance := float(_character["critical"])
		if player_action == Action.SMASH:
			var effect: Dictionary = _character.get("skill_effects", {}).get("smash", {})
			outgoing = int(ceil(outgoing * float(effect.get("damage_human_elf", 100)) / 100.0)) + (3 if effect.is_empty() else 0)
			if int(weapon.get("hands", 1)) == 2:
				var multiplier := str(effect.get("additional_multiplier_two_handed_weapons", "x1.2")).trim_prefix("x")
				outgoing = int(ceil(outgoing * (multiplier.to_float() if multiplier.is_valid_float() else 1.2)))
				critical_chance += float(effect.get("additional_critical_two_handed_weapons", 5.0))
		var enemy_protection := _known_enemy_stat(target.stats, "protection")
		critical_chance = clampf(critical_chance - enemy_protection * 2.0, 0.0, 30.0)
		critical = critical_chance > 0.0 and _rng.randf() * 100.0 < critical_chance
		if critical:
			training_events.append("score_a_critical_hit")
			outgoing = int(ceil(outgoing * float(_character.get("critical_multiplier", 1.5))))
			if player_action == Action.SMASH:
				training_events.append("get_a_critical_hit_with_smash")
		base_damage = outgoing
		outgoing = _outgoing_damage(base_damage, target)

	var enemy_name: String = target.stats.get("name", "Spider")
	if player_action in [Action.ATTACK, Action.WINDMILL] and target.intent == Action.DEFEND:
		outgoing = int(ceil(outgoing * 0.5))
		training_events.append("observe_an_enemy_using_the_defense_skill")
		training_events.append("watch_an_enemy_defend_itself")
		reason = "%s guards." % enemy_name
	elif player_action == Action.SMASH and target.intent == Action.DEFEND:
		training_events.append("land_a_special_skill_on_a_defending_enemy")
		training_events.append("successful_in_using_a_special_skill_to_attack_a_defending_enemy")
		reason = "Guard broken."

	target.health = maxi(0, target.health - outgoing)
	if player_action == Action.WINDMILL:
		var targets := 1
		var defeated := 1 if target.health == 0 else 0
		for other in _enemies:
			if other != target and other.health > 0:
				targets += 1
				var damage := _outgoing_damage(base_damage, other)
				if other.intent == Action.DEFEND:
					damage = ceili(damage * 0.5)
				other.health = maxi(0, other.health - damage)
				if other.health == 0:
					defeated += 1
					training_events.append("windmill_defeat_enemy")
					training_events.append("defeat_enemy")
					if Catalog.is_sword(weapon):
						training_events.append("defeat_an_enemy_with_sword")
		if targets > 1:
			reason += " Windmill hits %d enemies." % targets
		if targets >= 4:
			training_events.append("attack_4_or_more_enemies")
		if defeated >= 4:
			training_events.append("defeat_4_or_more_enemies")
	if target.health == 0:
		training_events.append("defeat_enemy")
		if critical:
			training_events.append("finish_off_an_enemy_with_a_critical_hit")
		if Catalog.is_sword(weapon):
			training_events.append("defeat_an_enemy_with_sword")
		if player_action == Action.SMASH:
			training_events.append("use_smash_as_the_final_blow")
			training_events.append("perform_a_finishing_blow_with_smash")
			if critical:
				training_events.append("get_a_critical_hit_as_the_final_blow")
		if player_action == Action.WINDMILL:
			training_events.append("windmill_defeat_enemy")
	if player_action == Action.ATTACK and target.intent == Action.SMASH:
		target.gauge = 0.0
		target.intent = Action.DEFEND
		reason = "Enemy Smash interrupted."
	player_gauge = 0.0
	round_number += 1
	active = health > 0 and _living_enemies()
	if last_player_hit:
		reason += " Dealt %d damage." % outgoing
	elif player_action == Action.DEFEND and reason.is_empty():
		reason = "You guard."
	var result := reason.strip_edges()
	if critical and outgoing > 0:
		result += " Critical hit."
	if health <= 0:
		result += " You fall."
	elif target.health <= 0:
		result += " %s defeated." % enemy_name
	return result.strip_edges()


func refresh_character_stats(character_stats: Dictionary) -> void:
	_character = character_stats


func _outgoing_damage(damage: int, enemy: EnemyState) -> int:
	var defense := maxf(0.0, _known_enemy_stat(enemy.stats, "defense") - float(_character["armor_pierce"]))
	return _mitigate(damage, defense, _known_enemy_stat(enemy.stats, "protection"))


func _mitigate(damage: int, defense: float, protection: float) -> int:
	return int(ceil(maxf(0.0, damage - defense) * (1.0 - clampf(protection, 0.0, 100.0) / 100.0)))


func _known_enemy_stat(stats: Dictionary, key: String) -> float:
	var value: Variant = stats.get(key)
	return float(value) if _number(value) else 0.0


func _number(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floor(float(value))


func advance_time(delta: float) -> void:
	if not active or not is_finite(delta) or delta <= 0.0:
		return
	player_gauge = minf(1.0, player_gauge + delta / PLAYER_CHARGE_SECONDS)
	for enemy in _enemies:
		if enemy.health > 0:
			enemy.gauge = minf(1.0, enemy.gauge + delta / enemy.charge_seconds)


func player_ready() -> bool:
	return active and player_gauge >= 1.0


func enemy_ready(index := 0) -> bool:
	var enemy := enemy_at(index)
	return active and enemy != null and enemy.health > 0 and enemy.gauge >= 1.0


func act_enemy(index := 0) -> String:
	if not enemy_ready(index):
		return ""
	training_events.clear()
	last_player_hit = false
	last_enemy_hit = false
	var enemy := _enemies[index]
	var enemy_name: String = enemy.stats.get("name", "Spider")
	var damage := 0
	var reason := "%s guards." % enemy_name
	if enemy.intent != Action.DEFEND and enemy.can_attack:
		last_enemy_hit = true
		var normal_hit := _rng.randi_range(int(enemy.stats["damage_min"]), int(enemy.stats["damage_max"]))
		var hit := normal_hit
		if enemy.intent == Action.SMASH:
			hit += 3
		damage = _mitigate(hit, float(_character["defense"]), float(_character["protection"]))
		if countering:
			var effect: Dictionary = _character.get("skill_effects", {}).get("counterattack", {})
			var reflected := normal_hit * float(effect.get("damage_from_opponent_human_giant", 50)) / 100.0
			var critical_chance := _known_enemy_stat(enemy.stats, "critical") + float(effect.get("additional_critical_upon_activation", 0))
			if critical_chance > 0.0 and _rng.randf() * 100.0 < minf(critical_chance, 30.0):
				reflected *= 1.5
				training_events.append("score_a_critical_hit")
				training_events.append("counterattack_with_a_critical_hit")
			reflected += Stats.roll_melee(_character, _rng) * float(effect.get("damage_from_self_human_elf", 50)) / 100.0
			var counter_damage := _outgoing_damage(ceili(reflected), enemy)
			enemy.health = maxi(0, enemy.health - counter_damage)
			training_events.append("attack")
			training_events.append("knock_down_an_enemy")
			if enemy.health == 0:
				training_events.append("defeat_enemy")
			damage = 0
			countering = false
			last_enemy_hit = false
			training_events.append("counter_an_enemy_s_special_attack" if enemy.intent == Action.SMASH else "counter_an_enemy_s_attack")
			reason = "You counter %s for %d damage." % [enemy_name, counter_damage]
		elif guarded and enemy.intent == Action.ATTACK:
			training_events.append("block_attack")
			var effect: Dictionary = _character.get("skill_effects", {}).get("defense", {})
			damage = _mitigate(hit, float(_character["defense"]) + float(effect.get("defense_bonus_human_elf", 0)), float(_character["protection"]) + float(effect.get("protection_bonus_human_elf", 0)))
			damage = int(ceil(damage * 0.5))
			reason = "You guard against %s." % enemy_name
		else:
			reason = ("%s breaks your guard." if guarded else "%s strikes.") % enemy_name
		if last_enemy_hit and _character.get("light_armor_equipped", false):
			training_events.append("take_melee_attacks_while_wearing_light_armor")
		guarded = false
	else:
		training_events.append("observe_an_enemy_using_the_defense_skill")
		training_events.append("watch_an_enemy_defend_itself")
	health = maxi(0, health - damage)
	enemy.gauge = 0.0
	enemy.actions += 1
	enemy.intent = IntentAI.choose(enemy.can_attack, enemy.actions, _intent_owner)
	active = health > 0 and _living_enemies()
	if not last_enemy_hit:
		return reason
	return "%s Took %d damage.%s" % [reason, damage, " You fall." if health <= 0 else ""]


func snapshot() -> Dictionary:
	var state := {}
	for field in ["health", "stamina", "active", "round_number", "last_player_hit", "last_enemy_hit", "player_gauge", "guarded", "countering", "rng_state"]:
		state[field] = get(field)
	state["enemies"] = []
	for enemy in _enemies:
		state["enemies"].append({"health": enemy.health, "gauge": enemy.gauge, "intent": enemy.intent, "actions": enemy.actions})
	return state


func restore(state: Dictionary) -> void:
	for field in state:
		if field != "enemies":
			set(field, state[field])
	for index in range(_enemies.size()):
		for field in state["enemies"][index]:
			_enemies[index].set(field, state["enemies"][index][field])
