@tool
extends BTAction
func _tick(_delta: float) -> Status:
	blackboard.set_var(&"ticks", int(blackboard.get_var(&"ticks", 0, false)) + 1)
	return RUNNING
