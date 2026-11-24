extends GutTest
const Encounter = preload("res://scripts/spider_encounter.gd")
const ENEMY := {"health": 100, "damage_min": 10, "damage_max": 10, "defense": 2, "protection": 0}
const PLAYER := {"life": 100, "stamina": 12, "damage_min": 10, "damage_max": 10, "balance": 50.0, "critical": 0.0, "defense": 2, "protection": 0.0, "armor_pierce": 0}
var encounter: RefCounted

func before_each() -> void:
	encounter = Encounter.new()
	assert_true(encounter.begin(ENEMY, 123, PLAYER))

func test_independent_gauges_require_elapsed_time() -> void:
	assert_eq(encounter.act(Encounter.Action.ATTACK, {}), "")
	encounter.advance_time(2.5)
	assert_true(encounter.player_ready())
	assert_false(encounter.enemy_ready())
	encounter.act(Encounter.Action.ATTACK, {})
	assert_eq(encounter.player_gauge, 0.0)
	assert_eq(encounter.enemy_health, 96)
	assert_eq(encounter.health, 100)
	assert_eq(encounter.stamina, 10)

func test_smash_breaks_guard_with_armor_mitigation() -> void:
	encounter.advance_time(2.5)
	assert_string_contains(encounter.act(Encounter.Action.SMASH, {}), "Guard broken.")
	assert_eq(encounter.enemy_health, 89)

func test_attack_interrupts_enemy_smash() -> void:
	encounter.advance_time(5.0)
	encounter.intent = Encounter.Action.SMASH
	encounter.act(Encounter.Action.ATTACK, {})
	assert_eq(encounter.enemy_gauge, 0.0)
	assert_eq(encounter.enemy_health, 92)

func test_enemy_attack_preparation_interrupts_player_smash() -> void:
	encounter.advance_time(2.5)
	encounter.intent = Encounter.Action.ATTACK
	assert_string_contains(encounter.act(Encounter.Action.SMASH, {}), "Smash interrupted.")
	assert_eq(encounter.health, 100)
	assert_eq(encounter.enemy_health, 100)

func test_guard_reduces_next_hit_and_enemy_acts_independently() -> void:
	encounter.advance_time(5.0)
	encounter.stamina = 6
	encounter.act(Encounter.Action.DEFEND, {})
	encounter.intent = Encounter.Action.ATTACK
	encounter.act_enemy()
	assert_eq(encounter.health, 96)
	assert_eq(encounter.stamina, 10)
	assert_false(encounter.guarded)
	assert_eq(encounter.enemy_gauge, 0.0)

func test_enemy_smash_bypasses_guard() -> void:
	encounter.advance_time(5.0)
	encounter.act(Encounter.Action.DEFEND, {})
	encounter.intent = Encounter.Action.SMASH
	encounter.act_enemy()
	assert_eq(encounter.health, 89)

func test_rejected_action_preserves_state() -> void:
	encounter.advance_time(5.0)
	encounter.stamina = 1
	var before: Dictionary = encounter.snapshot()
	assert_string_contains(encounter.act(Encounter.Action.SMASH, {}), "Not enough stamina")
	assert_eq(encounter.snapshot(), before)
	assert_eq(encounter.act(3, {}), "")
	assert_eq(encounter.snapshot(), before)

func test_snapshot_restores_full_action_state() -> void:
	encounter.advance_time(5.0)
	var before: Dictionary = encounter.snapshot()
	var first: String = encounter.act(Encounter.Action.ATTACK, {})
	encounter.restore(before)
	assert_eq(encounter.snapshot(), before)
	assert_eq(encounter.act(Encounter.Action.ATTACK, {}), first)

func test_unknown_damage_stays_defensive_and_gauges_cap() -> void:
	var unknown := ENEMY.duplicate()
	unknown["damage_min"] = null
	encounter.begin(unknown, 123, PLAYER)
	for step in range(4):
		encounter.advance_time(100.0)
		assert_eq(encounter.enemy_gauge, 1.0)
		encounter.act_enemy()
		assert_eq(encounter.intent, Encounter.Action.DEFEND)
	assert_eq(encounter.health, 100)

func test_saved_health_is_preserved_and_capped() -> void:
	encounter.begin(ENEMY, 123, PLAYER, 35)
	assert_eq(encounter.health, 35)
	encounter.begin(ENEMY, 123, PLAYER, 150)
	assert_eq(encounter.health, 100)


func test_group_targeting_keeps_encounter_active_until_last_enemy() -> void:
	assert_true(encounter.begin_group([ENEMY, ENEMY], 123, PLAYER))
	encounter.enemy_at(1).health = 1
	encounter.player_gauge = 1.0
	encounter.act(Encounter.Action.ATTACK, {}, 1)
	assert_eq(encounter.enemy_at(1).health, 0)
	assert_eq(encounter.enemy_at(0).health, 100)
	assert_true(encounter.active)
	var before: Dictionary = encounter.snapshot()
	assert_eq(encounter.act(Encounter.Action.ATTACK, {}, 1), "")
	assert_eq(encounter.snapshot(), before)
	encounter.enemy_at(0).health = 1
	encounter.player_gauge = 1.0
	encounter.act(Encounter.Action.ATTACK, {}, 0)
	assert_false(encounter.active)


func test_group_clocks_and_rollback_are_independent() -> void:
	assert_true(encounter.begin_group([ENEMY, ENEMY], 123, PLAYER))
	encounter.advance_time(4.5)
	assert_true(encounter.enemy_ready(0))
	assert_false(encounter.enemy_ready(1))
	encounter.enemy_at(1).intent = Encounter.Action.ATTACK
	encounter.enemy_at(1).gauge = 1.0
	var before: Dictionary = encounter.snapshot()
	var message: String = encounter.act_enemy(1)
	assert_lt(encounter.health, 100)
	assert_eq(encounter.enemy_at(0).gauge, 1.0)
	assert_eq(encounter.enemy_at(1).gauge, 0.0)
	encounter.restore(before)
	assert_eq(encounter.snapshot(), before)
	assert_eq(encounter.act_enemy(1), message)
	encounter.enemy_at(1).health = 0
	encounter.advance_time(10.0)
	assert_eq(encounter.enemy_at(1).gauge, 0.0)
	assert_false(encounter.enemy_ready(1))


func test_limbo_intent_tree_preserves_cadence_and_defensive_variants() -> void:
	var brain = load("res://scripts/combat_intent_ai.gd")
	assert_eq(brain.choose(true, 0), Encounter.Action.DEFEND)
	assert_eq(brain.choose(true, 1), Encounter.Action.ATTACK)
	assert_eq(brain.choose(true, 2), Encounter.Action.SMASH)
	assert_eq(brain.choose(true, 3), Encounter.Action.DEFEND)
	assert_eq(brain.choose(false, 2), Encounter.Action.DEFEND)
