class_name StatusState
extends RefCounted
var definition_id: String = ""
var source_id: String = ""
var remaining_activations: int = 0
var magnitude: int = 0
func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.definition_id = definition_id
	result.source_id = source_id
	result.remaining_activations = remaining_activations
	result.magnitude = magnitude
	return result
func observation() -> Dictionary:
	return {"definition_id": definition_id, "source_id": source_id, "remaining_activations": remaining_activations, "magnitude": magnitude}
