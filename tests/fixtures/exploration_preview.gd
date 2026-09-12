extends Control
## Rendered compact/wide and frame-cap harness; excluded from shipping packs.
var viewport: SubViewport
var display: Sprite2D
var main: Node
func _ready() -> void:
	viewport = SubViewport.new()
	viewport.name = "World"
	viewport.world_2d = World2D.new()
	viewport.size = Vector2i(960,540)
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(viewport)
	display = Sprite2D.new()
	display.centered = false
	get_viewport().size_changed.connect(func() -> void: resize_preview(viewport.size.x,viewport.size.y,Engine.max_fps))
	display.texture = viewport.get_texture()
	add_child(display)
	main = load("res://scenes/main.tscn").instantiate()
	viewport.add_child(main)
	for i: int in 6:
		await get_tree().process_frame
	resize_preview(960,540,30)
	main.request_mode(SessionShell.Mode.LOADING,1,main.observation().revision)

func resize_preview(width: int, height: int, frame_cap: int) -> void:
	viewport.size = Vector2i(width,height)
	var available := get_viewport_rect().size
	if available.x < 1 or available.y < 1:
		return
	var factor := minf(available.x / float(width), available.y / float(height))
	display.transform = Transform2D(Vector2(factor,0),Vector2(0,factor),(available-Vector2(width,height)*factor)/2.0)
	Engine.max_fps = frame_cap

func _input(event: InputEvent) -> void:
	if is_instance_valid(display):
		viewport.push_input(event.xformed_by(display.transform.affine_inverse()), true)

func dungeon() -> void:
	main.request_mode(SessionShell.Mode.DUNGEON,1,main.observation().revision)

func destination(x: float, y: float) -> bool:
	return main._world.queue_destination(Vector2(x,y))

func snapshot() -> Dictionary:
	return main.observation()

func _exit_tree() -> void:
	Engine.max_fps = 0
