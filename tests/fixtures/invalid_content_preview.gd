extends Node
## Renderable development fixture; excluded from every shipping preset.
func _ready() -> void:
	var main := preload("res://scenes/main.tscn").instantiate()
	main.persistence_enabled = false
	main.catalog_path = "res://tests/fixtures/invalid_catalog.tres"
	add_child(main)
