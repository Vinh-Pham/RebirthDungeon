class_name BattleState
extends RefCounted
## Data contract only. Phase 4 owns activation rules and timing.
const Actor = preload("res://scripts/domain/state/actor_state.gd")
enum Phase { PRE_ROLL, LOCKED, RESOLVED, FINISHED }
var encounter_id: String = ""
var phase: Phase = Phase.PRE_ROLL
var active_actor_id: String = "hero"
## The hero's pools live only in SessionShell.hero, never duplicated here.
var enemies: Array[Actor] = []
var selected_skill: String = ""
var selected_rank: String = ""
var target_id: String = ""
var hand: PackedInt32Array = []
var kept: Array[bool] = [false, false, false, false, false]
var rerolls_remaining: int = 2
var locked_inputs: Dictionary = {}
var content_versions: Dictionary = {}

func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.encounter_id = encounter_id
	result.phase = phase
	result.active_actor_id = active_actor_id
	for actor: Actor in enemies:
		result.enemies.append(actor.copy())
	result.selected_skill = selected_skill
	result.selected_rank = selected_rank
	result.target_id = target_id
	result.hand = hand.duplicate()
	result.kept = kept.duplicate()
	result.rerolls_remaining = rerolls_remaining
	result.locked_inputs = locked_inputs.duplicate(true)
	result.content_versions = content_versions.duplicate(true)
	return result

func observation() -> Dictionary:
	var actors: Array[Dictionary] = []
	for actor: Actor in enemies:
		actors.append(actor.observation())
	return {"encounter_id": encounter_id, "phase": phase, "active_actor_id": active_actor_id,
		"enemies": actors, "selected_skill": selected_skill, "selected_rank": selected_rank,
		"target_id": target_id, "hand": hand.duplicate(), "kept": kept.duplicate(),
		"rerolls_remaining": rerolls_remaining, "locked_inputs": locked_inputs.duplicate(true),
		"content_versions": content_versions.duplicate(true)}
