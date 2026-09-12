@tool
extends BTAction
func _tick(_delta: float) -> Status:
	var choices: Array = blackboard.get_var(&"choices", [], false)
	if choices.is_empty(): return FAILURE
	blackboard.set_var(&"proposal", choices[0].duplicate(true))
	return SUCCESS
