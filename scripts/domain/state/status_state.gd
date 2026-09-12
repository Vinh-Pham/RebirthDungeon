class_name StatusState
extends RefCounted
var group: String = ""
var priority: int = 0
var effect: String = ""
var stat_id: String = ""
var percent: bool = false
var first_tick: int = 0
var definition_id: String = ""
var source_id: String = ""
var remaining_activations: int = 0
var magnitude: int = 0
func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.group = group
	result.priority = priority
	result.effect = effect
	result.stat_id = stat_id
	result.percent = percent
	result.first_tick = first_tick
	result.definition_id = definition_id
	result.source_id = source_id
	result.remaining_activations = remaining_activations
	result.magnitude = magnitude
	return result
func observation() -> Dictionary:
	return {"group": group, "priority": priority, "effect": effect, "stat_id": stat_id,
		"percent": percent, "first_tick": first_tick, "definition_id": definition_id, "source_id": source_id, "remaining_activations": remaining_activations, "magnitude": magnitude}
