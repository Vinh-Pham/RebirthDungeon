class_name ItemState
extends RefCounted
var instance_id: String = ""
var definition_id: String = ""
var quantity: int = 1
var origin_id: String = ""
var container: String = "overflow"
var column: int = 0
var row: int = 0
var locked: bool = false
var pages: Array[String] = []
var rolled_modifiers: Dictionary[String, int] = {}
func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.instance_id = instance_id
	result.definition_id = definition_id
	result.quantity = quantity
	result.origin_id = origin_id
	result.container = container
	result.column = column
	result.row = row
	result.locked = locked
	result.pages = pages.duplicate()
	result.rolled_modifiers = rolled_modifiers.duplicate()
	return result
func observation() -> Dictionary:
	return {"instance_id": instance_id, "definition_id": definition_id, "quantity": quantity, "rolled_modifiers": rolled_modifiers.duplicate(), "origin_id":origin_id, "container":container, "column":column, "row":row, "locked":locked, "pages":pages.duplicate()}
