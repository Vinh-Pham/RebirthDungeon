@tool
extends BTAction
## Authored multi-enemy rule: prefer supporting a living ally, then fall back
## to the first legal action in stable order. Reads copied choices only.
func _tick(_delta: float) -> Status:
	var choices: Array = blackboard.get_var(&"choices", [], false)
	if choices.is_empty(): return FAILURE
	for choice: Dictionary in choices:
		if str(choice.get("target_id","")).begins_with("enemy."):
			blackboard.set_var(&"proposal", choice.duplicate(true))
			return SUCCESS
	blackboard.set_var(&"proposal", choices[0].duplicate(true))
	return SUCCESS