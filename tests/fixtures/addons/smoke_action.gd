@tool
extends BTAction

func _tick(_delta: float) -> Status:
	blackboard.set_var(&"smoke_ticks", int(blackboard.get_var(&"smoke_ticks", 0, false)) + 1)
	return SUCCESS
