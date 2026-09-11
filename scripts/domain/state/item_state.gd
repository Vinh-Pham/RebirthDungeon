class_name ItemState
extends RefCounted
var instance_id: String = ""
var definition_id: String = ""
var quantity: int = 1
var rolled_modifiers: Dictionary[String, int] = {}
func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.instance_id = instance_id
	result.definition_id = definition_id
	result.quantity = quantity
	result.rolled_modifiers = rolled_modifiers.duplicate()
	return result
func observation() -> Dictionary:
	return {"instance_id": instance_id, "definition_id": definition_id, "quantity": quantity, "rolled_modifiers": rolled_modifiers.duplicate()}
