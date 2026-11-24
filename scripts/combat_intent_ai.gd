extends RefCounted
## Evaluates LimboAI when a monster prepares its next action.

const INTENT_TREE = preload("res://scripts/ai/combat_intent.tres")


static func choose(can_attack: bool, actions: int, owner_node: Node = null) -> int:
	# Resolve the native type explicitly if an editor still has Beehave's class cached.
	var context = ClassDB.instantiate("Blackboard")
	context.set_var("can_attack", can_attack)
	context.set_var("actions", actions)
	var agent := owner_node if owner_node != null else Node.new()
	var instance = INTENT_TREE.call("instantiate", agent, context, agent, agent)
	instance.update(0.0)
	var intent := int(context.get_var("intent", 1))
	instance = null
	if owner_node == null:
		agent.free()
	return intent
