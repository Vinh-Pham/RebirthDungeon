extends Control
## Excluded rendered UI matrix harness using the real application and battle.
var viewport: SubViewport
var display: Sprite2D
var main: DungeonApplication
func _ready() -> void:
	_start.call_deferred()
func _start() -> void:
	var environment: Dictionary = await preload("res://tests/integration/battle_ui_fixture.gd").new().setup(get_tree(),Vector2i(960,540))
	viewport = environment.viewport
	viewport.name = "BattleMatrix"
	main = environment.main
	display = Sprite2D.new()
	display.centered = false
	display.texture = viewport.get_texture()
	add_child(display)
	get_viewport().size_changed.connect(_fit)
	_fit()
func _fit() -> void:
	if not is_instance_valid(display): return
	var available := get_viewport_rect().size
	var dimensions := Vector2(viewport.size)
	var factor := minf(available.x/dimensions.x,available.y/dimensions.y)
	display.transform = Transform2D(Vector2(factor,0),Vector2(0,factor),(available-dimensions*factor)/2.0)
func resize_preview(width: int, height: int, text_scale: float = 1.0) -> void:
	viewport.size = Vector2i(width,height)
	main._battle_view.set_text_scale(text_scale)
	_fit()
func safe_area(left: float, top: float, right: float, bottom: float) -> void:
	main._battle_view.set_safe_insets(Vector4(left,top,right,bottom))
func select_skill(id: String) -> void:
	main._battle_view.choose_skill(id)
func action(kind: String, indices: Array = []) -> void:
	main._battle_view.send_action(kind,indices)
func snapshot() -> Dictionary:
	return main.observation()
func save_test(behavior: String) -> void:
	main.set_next_checkpoint_test(behavior)
func finish_save(success: bool) -> void:
	main.complete_checkpoint_test(1,main._session.revision,success)
func _input(event: InputEvent) -> void:
	if is_instance_valid(display):
		viewport.push_input(event.xformed_by(display.transform.affine_inverse()),true)
		get_viewport().set_input_as_handled()
func _exit_tree() -> void:
	if is_instance_valid(viewport): viewport.queue_free()

func focus(value: bool) -> void:
	main.set_application_focused(value)

func ui_state() -> Dictionary:
	return {"focused":main._focused, "pending":main._battle_view._request_pending, "enabled":main._battle_view._enabled, "phase":main._battle_view.flow.current, "revision":main._session.revision}
