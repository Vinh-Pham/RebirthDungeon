extends Node2D
## Cosmetic stage, isolated in its own viewport. Never reads or writes domain objects.
const FLOOR = preload("res://assets/art/exploration/floor.png")
@onready var hero: Sprite2D = $Hero
@onready var enemy: Sprite2D = $Enemy
@onready var wide: PhantomCamera2D = $Wide
@onready var detail: PhantomCamera2D = $Detail
@onready var camera: Camera2D = $Camera2D
var _motion: Tween
var reduced_motion: bool = false

func _ready() -> void:
	get_viewport().size_changed.connect(_fit)
	_fit()

func _fit() -> void:
	var dimensions := get_viewport_rect().size
	var factor := clampf(minf(dimensions.x / 780.0, dimensions.y / 170.0), 0.25, 2.5)
	wide.zoom = Vector2.ONE * factor
	detail.zoom = Vector2.ONE * factor
	queue_redraw()

func present(snapshot: Dictionary, events: Array) -> void:
	enemy.modulate = Color(0.5,0.5,0.5,0.6) if snapshot.battle.enemies[0].current[0] <= 0 else Color.WHITE
	var selected: bool = not String(snapshot.battle.selected_skill).is_empty()
	detail.position.x = -24 if snapshot.battle.target_id == "hero" else 24
	detail.set_priority(30 if selected else 10)
	wide.set_priority(20)
	for event: Dictionary in events:
		if event.type == "effect" and not reduced_motion:
			skip_motion()
			var sprite: Sprite2D = hero if event.actor_id == "hero" else enemy
			_motion = create_tween()
			_motion.tween_property(sprite, "position:y", -9.0, 0.08)
			_motion.tween_property(sprite, "position:y", 0.0, 0.12)

func set_reduced_motion(enabled: bool) -> void:
	reduced_motion = enabled
	wide.set_tween_duration(0.0 if enabled else 0.2)
	detail.set_tween_duration(0.0 if enabled else 0.2)
	if enabled: skip_motion()

func skip_motion() -> void:
	if _motion != null: _motion.kill()
	hero.position.y = 0
	enemy.position.y = 0
	camera.get_node("PhantomCameraHost").skip_transition()

func _draw() -> void:
	draw_rect(Rect2(-2000,-1000,4000,2000), Color("#0e191e"))
	draw_texture_rect(FLOOR, Rect2(-390,-76,780,152), true, Color("#445c62"))
	for x: int in range(-384,384,32):
		draw_rect(Rect2(x,-82,30,10),Color("#526165"))
		draw_rect(Rect2(x,72,30,8),Color("#27383e"))
	for x: int in [-344,344]:
		draw_rect(Rect2(x,-38,12,38),Color("#29373b"))
		draw_rect(Rect2(x+3,-36,6,12),Color("#d8b776"))
	draw_circle(Vector2(-170,32),31,Color(0,0,0,0.3))
	draw_circle(Vector2(170,32),36,Color(0,0,0,0.3))

func _exit_tree() -> void:
	if _motion != null: _motion.kill()
