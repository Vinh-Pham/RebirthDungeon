extends Button
var item_id: String = ""
var column: int
var row: int
var panel: Node
func _get_drag_data(_position: Vector2) -> Variant:
	if item_id.is_empty(): return null
	var label := Label.new()
	label.text = tooltip_text
	set_drag_preview(label)
	return {"inventory_item":item_id}
func _can_drop_data(_position: Vector2, data: Variant) -> bool:
	return data is Dictionary and data.get("inventory_item") is String and panel.can_move_item(data.inventory_item,column,row)
func _drop_data(_position: Vector2, data: Variant) -> void:
	panel.move_item(data.inventory_item,column,row)
