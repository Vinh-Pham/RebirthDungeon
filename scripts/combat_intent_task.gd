@tool
extends BTAction
## Selects one branch of the spider's readable combat cadence.

@export var phase := 0
@export var chosen_intent := 1
@export var defensive_fallback := false


func _tick(_delta: float) -> Status:
	if not defensive_fallback:
		if not blackboard.get_var("can_attack", false):
			return FAILURE
		if int(blackboard.get_var("actions", 0)) % 3 != phase:
			return FAILURE
	blackboard.set_var("intent", chosen_intent)
	return SUCCESS
