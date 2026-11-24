extends RefCounted
## Discrete melee adaptation. Smash adds 3 damage and Defend halves normal hits.
## Stamina costs and Defend's recovery use Rebirth Dungeon's turn-based balance.

const Stats = preload("res://scripts/character_stats.gd")

enum Action { ATTACK, DEFEND, SMASH, TONIC }

const ATTACK_COST := 2
const SMASH_COST := 6
const GUARD_RECOVERY := 4

var health := 0
var stamina := 0
var enemy_health := 0
var intent: int = Action.DEFEND
var active := false
var round_number := 0
var _enemy: Dictionary = {}
var _character: Dictionary = {}
var _rng := RandomNumberGenerator.new()
var _can_attack := false


func begin(enemy_stats: Dictionary, seed_value: int, character_stats: Dictionary, current_health := -1) -> bool:
	active = false
	if not _number(enemy_stats.get("health")) or float(enemy_stats["health"]) <= 0.0:
		return false
	_enemy = enemy_stats
	_character = character_stats
	health = int(_character["life"]) if current_health < 0 else clampi(current_health, 1, int(_character["life"]))
	stamina = int(_character["stamina"])
	enemy_health = int(_enemy["health"])
	round_number = 0
	_rng.seed = seed_value
	_can_attack = _number(_enemy.get("damage_min")) and _number(_enemy.get("damage_max"))
	if _can_attack:
		_can_attack = int(_enemy["damage_min"]) >= 0 and int(_enemy["damage_max"]) >= int(_enemy["damage_min"])
	active = true
	_commit_intent()
	return true


func stamina_cost(action: int) -> int:
	match action:
		Action.ATTACK: return ATTACK_COST
		Action.SMASH: return SMASH_COST
		_: return 0


func act(player_action: int, weapon: Dictionary) -> String:
	if not active or player_action < Action.ATTACK or player_action > Action.TONIC:
		return ""
	var cost := stamina_cost(player_action)
	if stamina < cost:
		return "Not enough stamina. Defend to recover it."

	var restored := 0
	if player_action == Action.TONIC:
		restored = mini(30, int(_character["life"]) - health)
		health += restored
	stamina -= cost
	if player_action == Action.DEFEND:
		stamina = mini(stamina + GUARD_RECOVERY, int(_character["stamina"]))
	var incoming := 0
	if intent == Action.ATTACK:
		var hit := _rng.randi_range(int(_enemy["damage_min"]), int(_enemy["damage_max"]))
		incoming = _mitigate(hit, float(_character["defense"]), float(_character["protection"]))

	var outgoing := 0
	var critical := false
	var reason := "Tonic restored %d Life." % restored if player_action == Action.TONIC else ""
	if player_action == Action.SMASH and intent == Action.ATTACK:
		reason = "Smash interrupted."
	elif player_action != Action.DEFEND and player_action != Action.TONIC:
		outgoing = Stats.roll_melee(_character, _rng)
		var critical_chance := float(_character["critical"])
		if player_action == Action.SMASH:
			outgoing += 3
			if int(weapon.get("hands", 1)) == 2:
				critical_chance += 5.0
		var enemy_protection := _known_enemy_stat("protection")
		critical_chance = clampf(critical_chance - enemy_protection * 2.0, 0.0, 30.0)
		critical = critical_chance > 0.0 and _rng.randf() * 100.0 < critical_chance
		if critical:
			outgoing = int(ceil(outgoing * 1.5))
		var enemy_defense := maxf(0.0, _known_enemy_stat("defense") - float(_character["armor_pierce"]))
		outgoing = _mitigate(outgoing, enemy_defense, enemy_protection)

	if player_action == Action.ATTACK and intent == Action.DEFEND:
		outgoing = int(ceil(outgoing * 0.5))
		reason = "Spider guards."
	elif player_action == Action.DEFEND and intent == Action.ATTACK:
		incoming = int(ceil(incoming * 0.5))
		reason = "You guard."
	elif player_action == Action.SMASH and intent == Action.DEFEND:
		reason = "Guard broken."
	elif player_action == Action.DEFEND and intent == Action.DEFEND:
		reason = "Both guard."

	health = maxi(0, health - incoming)
	enemy_health = maxi(0, enemy_health - outgoing)
	round_number += 1
	active = health > 0 and enemy_health > 0
	var result := "%s Dealt %d. Took %d." % [reason, outgoing, incoming]
	if critical and outgoing > 0:
		result += " Critical hit."
	if health <= 0:
		result += " You fall."
	elif enemy_health <= 0:
		result += " Spider defeated."
	else:
		_commit_intent()
	return result.strip_edges()


func _commit_intent() -> void:
	intent = Action.ATTACK if _can_attack and round_number % 2 == 1 else Action.DEFEND


func _mitigate(damage: int, defense: float, protection: float) -> int:
	return int(ceil(maxf(0.0, damage - defense) * (1.0 - clampf(protection, 0.0, 100.0) / 100.0)))


func _known_enemy_stat(key: String) -> float:
	var value: Variant = _enemy.get(key)
	return float(value) if _number(value) else 0.0


func _number(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floor(float(value))
