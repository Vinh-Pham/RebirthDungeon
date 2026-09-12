extends DungeonApplication
## Beckett-only driver, excluded from every export pack.

func resize_fixture(width: int, height: int) -> void:
	get_window().size = Vector2i(width, height)
	get_window().content_scale_size = Vector2i(width, height)

func inject_loading_failure() -> void:
	required_resource_overrides = {"res://assets/art/dungeon_mark.svg": "res://assets/art/missing_fixture.svg"}

func _init() -> void:
	progression_enabled = false
	persistence_enabled = false
