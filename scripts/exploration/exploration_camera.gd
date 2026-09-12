extends "res://addons/phantom_camera/scripts/phantom_camera/phantom_camera_2d.gd"
## Phantom Camera 0.11 uses its manager's root-window size for limit clamping.
## Use this camera's viewport so previews and reconstructed subviews frame correctly.
func _set_limit_clamp_position(value: Vector2) -> Vector2:
	var half_extent := get_viewport_rect().size / zoom / 2.0
	var lower := Vector2(limit_left,limit_top) + half_extent
	var upper := Vector2(limit_right,limit_bottom) - half_extent
	value.x = clampf(value.x,lower.x,upper.x) if lower.x <= upper.x else (limit_left + limit_right) / 2.0
	value.y = clampf(value.y,lower.y,upper.y) if lower.y <= upper.y else (limit_top + limit_bottom) / 2.0
	return value
