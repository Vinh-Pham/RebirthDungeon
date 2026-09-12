@tool
extends BTCondition
## Reads a copied list only; the domain validates the eventual proposal again.
func _tick(_delta: float) -> Status:
	var choices: Array = blackboard.get_var(&"choices", [], false)
	return SUCCESS if not choices.is_empty() else FAILURE
