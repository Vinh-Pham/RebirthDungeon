extends GutTest

const Encounter = preload("res://scripts/spider_encounter.gd")
const ENEMY := {"health": 100, "damage_min": 10, "damage_max": 10, "defense": 2, "protection": 0}
const PLAYER := {"life": 100, "stamina": 12, "damage_min": 10, "damage_max": 10, "balance": 50.0, "critical": 0.0, "defense": 2, "protection": 0.0, "armor_pierce": 0}

var encounter: RefCounted


func before_each() -> void:
	encounter = Encounter.new()
	assert_true(encounter.begin(ENEMY, 123, PLAYER))


func test_normal_attack_is_reduced_by_guard() -> void:
	encounter.act(Encounter.Action.ATTACK, {})
	assert_eq(encounter.enemy_health, 96)
	assert_eq(encounter.health, 100)
	assert_eq(encounter.stamina, 10)


func test_smash_breaks_guard_but_preserves_armor_mitigation() -> void:
	var message: String = encounter.act(Encounter.Action.SMASH, {})
	assert_string_contains(message, "Guard broken.")
	assert_eq(encounter.enemy_health, 89)
	assert_eq(encounter.stamina, 6)


func test_normal_attack_interrupts_smash() -> void:
	encounter.act(Encounter.Action.DEFEND, {})
	assert_eq(encounter.intent, Encounter.Action.ATTACK)
	var message: String = encounter.act(Encounter.Action.SMASH, {})
	assert_string_contains(message, "Smash interrupted.")
	assert_eq(encounter.enemy_health, 100)
	assert_eq(encounter.health, 92)


func test_defend_halves_mitigated_damage_and_recovers_stamina() -> void:
	encounter.act(Encounter.Action.SMASH, {})
	encounter.act(Encounter.Action.DEFEND, {})
	assert_eq(encounter.health, 96)
	assert_eq(encounter.stamina, 10)


func test_insufficient_stamina_does_not_advance_turn() -> void:
	encounter.stamina = 1
	var message: String = encounter.act(Encounter.Action.SMASH, {})
	assert_string_contains(message, "Not enough stamina")
	assert_eq(encounter.round_number, 0)
	assert_eq(encounter.stamina, 1)
	assert_eq(encounter.enemy_health, 100)
	assert_eq(encounter.intent, Encounter.Action.DEFEND)


func test_tonic_heals_then_allows_enemy_response() -> void:
	encounter.act(Encounter.Action.DEFEND, {})
	encounter.health = 50
	encounter.act(Encounter.Action.TONIC, {})
	assert_eq(encounter.health, 72)
	assert_eq(encounter.enemy_health, 100)


func test_double_knockout_is_a_player_defeat() -> void:
	var lethal := ENEMY.duplicate()
	lethal["health"] = 1
	lethal["damage_min"] = 200
	lethal["damage_max"] = 200
	encounter.begin(lethal, 123, PLAYER)
	encounter.act(Encounter.Action.DEFEND, {})
	var message: String = encounter.act(Encounter.Action.ATTACK, {})
	assert_eq(encounter.health, 0)
	assert_eq(encounter.enemy_health, 0)
	assert_false(encounter.active)
	assert_string_contains(message, "You fall.")


func test_unknown_melee_damage_stays_defensive() -> void:
	var unknown := ENEMY.duplicate()
	unknown["damage_min"] = null
	unknown["damage_max"] = null
	encounter.begin(unknown, 123, PLAYER)
	for turn in range(4):
		encounter.act(Encounter.Action.DEFEND, {})
		assert_eq(encounter.intent, Encounter.Action.DEFEND)
	assert_eq(encounter.health, 100)


func test_existing_health_is_preserved_and_capped() -> void:
	encounter.begin(ENEMY, 123, PLAYER, 35)
	assert_eq(encounter.health, 35)
	encounter.begin(ENEMY, 123, PLAYER, 150)
	assert_eq(encounter.health, 100)
