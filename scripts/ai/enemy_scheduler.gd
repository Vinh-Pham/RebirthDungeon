extends Node
## Exactly one manual tree update per activation. No frame callbacks or live domain refs in tasks.
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const TREE = preload("res://content/ai/sentinel.tres")
var player: BTPlayer
var _last_token: String = ""

func _ready() -> void:
	player = BTPlayer.new()
	player.update_mode = BTPlayer.MANUAL
	player.behavior_tree = TREE
	player.set_scene_root_hint(self)
	add_child(player)

func propose(session: RefCounted, catalog: RefCounted) -> Dictionary:
	if session.battle == null or session.battle.phase != session.battle.Phase.PRE_ROLL or session.battle.active_actor_id == "hero":
		return {}
	var token := "%d:%s:%d:%d" % [session.session_id, session.battle.encounter_id, session.battle.activation, session.revision]
	if token == _last_token: return {}
	_last_token = token
	var choices := Rules.legal_enemy_actions(session, catalog)
	player.blackboard.set_var(&"choices", choices.duplicate(true))
	player.blackboard.set_var(&"proposal", {})
	player.update(0.0) # Authored tree is synchronous; bounded to one tick.
	var proposal: Dictionary = player.blackboard.get_var(&"proposal", {}, false)
	# Stable deterministic priority: no sampling, so the isolated AI stream is untouched.
	return {"session_id": session.session_id, "expected_revision": session.revision,
		"operation_id": "ai:" + token, "kind": "enemy_action", "actor_id": session.battle.active_actor_id,
		"skill_id": proposal.get("skill_id", ""), "target_id": proposal.get("target_id", "")}
