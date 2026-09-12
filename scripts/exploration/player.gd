extends CharacterBody2D
## Both input routes use this body. Navigation never writes position.
const SPEED: float = 140.0
var input_allowed: Callable
var path_active: bool = false
var stalled_seconds: float = 0.0
@onready var agent: NavigationAgent2D = $NavigationAgent2D
@onready var sprite: Sprite2D = $Sprite2D

func stop() -> void:
	path_active = false
	velocity = Vector2.ZERO
	stalled_seconds = 0.0

func navigate(target: Vector2) -> void:
	agent.target_position = target
	path_active = true
	stalled_seconds = 0.0

func _physics_process(delta: float) -> void:
	if not input_allowed.is_valid() or not input_allowed.call():
		stop()
		return
	var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if not direction.is_zero_approx():
		path_active = false
	elif path_active:
		# Advance the agent exactly once per active physics update.
		var next := agent.get_next_path_position()
		if agent.is_navigation_finished():
			stop()
			return
		direction = global_position.direction_to(next)
		# Avoid overshoot at lower physics rates.
		direction *= minf(1.0, global_position.distance_to(next) / (SPEED * delta))
	velocity = direction * SPEED
	var before := global_position
	move_and_slide()
	if path_active and before.distance_to(global_position) < 0.05:
		stalled_seconds += delta
		if stalled_seconds > 0.3:
			stop()
	else:
		stalled_seconds = 0.0
	if absf(direction.x) > 0.05:
		sprite.flip_h = direction.x < 0
