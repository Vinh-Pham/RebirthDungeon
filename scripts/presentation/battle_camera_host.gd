extends "res://addons/phantom_camera/scripts/phantom_camera_host/phantom_camera_host.gd"
## Cosmetic skip for the pinned Phantom Camera 0.11 host.
## Finish the addon's own transition; no second writer drives Camera2D.
func skip_transition() -> void:
	if get_active_pcam() != null and get_trigger_pcam_tween():
		_pcam_tween(_tween_duration)
