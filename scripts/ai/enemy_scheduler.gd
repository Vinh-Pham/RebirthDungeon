extends Node
## Exactly one manual tree update per enemy activation. Each actor owns a
## BTPlayer and blackboard; trees read copied choices and never touch domain
## state. The domain revalidates every proposal and owns the fallback pass.
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const TREES := {
	"actor.training_enemy": preload("res://content/ai/sentinel.tres"),
	"actor.memory_shade": preload("res://content/ai/sentinel.tres"),
	"actor.acolyte": preload("res://content/ai/acolyte.tres"),
}
const FALLBACK_TREE := "res://content/ai/sentinel.tres"
var _players: Dictionary = {}
var _last_token: String = ""

func _ready() -> void:
	pass # Trees instantiate lazily per active enemy actor.

## Drop per-agent players so a new session cannot inherit stale blackboards.
func reset() -> void:
	for key: String in _players:
		var player: BTPlayer = _players[key]
		if is_instance_valid(player): player.queue_free()
	_players.clear()
	_last_token = ""

func _player_for(actor_id: String, definition_id: String) -> BTPlayer:
	var player: BTPlayer = _players.get(actor_id)
	if player != null: return player
	player = BTPlayer.new()
	player.update_mode = BTPlayer.MANUAL
	var tree: Variant = TREES.get(definition_id, FALLBACK_TREE)
	player.behavior_tree = tree if tree is BehaviorTree else load(str(tree))
	player.set_scene_root_hint(self)
	add_child(player)
	_players[actor_id] = player
	return player

## Test/integration accessor for one agent's manual player and blackboard.
func player_for(actor_id: String, definition_id: String) -> BTPlayer:
	return _player_for(actor_id, definition_id)

func propose(session: RefCounted, catalog: RefCounted) -> Dictionary:
	if session.battle == null or session.battle.phase != session.battle.Phase.PRE_ROLL or session.battle.active_actor_id == "hero":
		return {}
	var actor_id: String = session.battle.active_actor_id
	var token := "%d:%s:%s:%d:%d" % [session.session_id, session.battle.encounter_id, actor_id, session.battle.activation, session.revision]
	if token == _last_token: return {}
	_last_token = token
	var actor := Rules.actor(session, actor_id)
	if actor == null: return {}
	var choices := Rules.legal_enemy_actions(session, catalog)
	var player := _player_for(actor_id, actor.definition_id)
	player.blackboard.set_var(&"choices", choices.duplicate(true))
	player.blackboard.set_var(&"proposal", {})
	player.update(0.0) # Authored tree is synchronous; bounded to one tick.
	var proposal: Dictionary = player.blackboard.get_var(&"proposal", {}, false)
	# Stable deterministic priority: no sampling, so the isolated AI stream is untouched.
	return {"session_id": session.session_id, "expected_revision": session.revision,
		"operation_id": "ai:" + token, "kind": "enemy_action", "actor_id": actor_id,
		"skill_id": proposal.get("skill_id", ""), "target_id": proposal.get("target_id", "")}
