extends RefCounted
## Where the drive tools aim (1.17), game side: the point a click on a control is pushed at (click_route), whether a
## press that is not a left click gets there while an embedded window has focus (press_focus_refusal,
## point_focus_refusal), and the space Input.parse_input_event takes (gui_to_window).
##
## Full edition only: click_control, scroll, simulate_input, replay_input, time_control's inputs, ui_do and the 3D
## clicks use these, and pack.ps1 trims this file from Lite. mcp_runtime loads it by path when one of those commands
## needs it (the physics_overlap pattern), and world_click.gd, Full-only too, preloads it. The geometry under it (route,
## the hit test) stays in UiInspect, which Lite's ui_snapshot and screenshot annotate=ui use too.
## 4.2+ floor: Window.has_focus, Viewport.gui_embed_subwindows / get_final_transform and InputEvent.xformed_by are 4.0
## APIs.

const UiInspect := preload("res://addons/beckett/runtime/ui_inspect.gd")


## UiInspect.route() for a click at a control's center, plus local (the center in its own viewport's GUI space) and at
## (the point to push, in the GUI space of the viewport the route lands in).
static func click_route(c: Control, scene_root: Node = null) -> Dictionary:
	var rt := UiInspect.route(c.get_viewport(), scene_root)
	var local := UiInspect.gui_center(c)
	rt["local"] = local
	rt["at"] = (rt["xf"] as Transform2D) * local
	return rt


## The embedded window of `vp` that has focus, or null. Godot hands that window every event pushed into vp but a left
## press, which first focuses the window under it (or none): a right or middle press, a wheel notch and the mouse motion
## all go to the focused window wherever they are aimed, and vp's own _input never sees them
## (Viewport._sub_windows_forward_input runs first; measured on 4.4.1, 4.6.2 and 4.7).
static func focused_window(vp: Viewport) -> Window:
	if not vp.gui_embed_subwindows:
		return null
	for w in UiInspect.collect_windows(vp):
		if (w as Window).has_focus():
			return w
	return null


## Why a press of `button` pushed along route rt would not reach the window the route goes through (or the root canvas):
## "" when it would. Only a left press moves focus; any other press goes to the focused embedded window.
static func press_focus_refusal(rt: Dictionary, button: int, scene_root: Node) -> String:
	if button == MOUSE_BUTTON_LEFT:
		return ""
	var focused := focused_window(rt["vp"])
	var hops: Array = rt.get("hops", [])
	var outer: Window = null
	if not hops.is_empty() and (hops[hops.size() - 1] as Dictionary)["via"] is Window:
		outer = (hops[hops.size() - 1] as Dictionary)["via"]
	if focused == outer:
		return ""
	if focused != null:
		return _taken_by(focused, scene_root)
	return "%s does not have focus, and Godot hands a press that is not a left click only to the window that has focus: click inside it with button 1 first" % UiInspect.path_of(outer, scene_root)


## press_focus_refusal for a bare point p in vp's GUI space (scroll position=). The focused embedded window gets the press
## at p, so what is drawn at p gets it when p is inside that window, and nothing does when p is outside it. With no window
## focused it goes to vp's own canvas at p, where a player's would go too.
static func point_focus_refusal(vp: Viewport, p: Vector2, button: int, scene_root: Node) -> String:
	if button == MOUSE_BUTTON_LEFT:
		return ""
	var focused := focused_window(vp)
	if focused == null or Rect2(Vector2(focused.position), Vector2(focused.size)).has_point(p):
		return ""
	return _taken_by(focused, scene_root)


static func _taken_by(focused: Window, scene_root: Node) -> String:
	return "%s has focus, and Godot hands every press that is not a left click to the window that has focus: close it, or click elsewhere with button 1 first" % UiInspect.path_of(focused, scene_root)


## A positional input event from the ROOT viewport's GUI space (where every position Beckett takes lives, and where the
## recorder sees events) to window pixels, the space Input.parse_input_event takes: the root applies the inverse of its
## get_final_transform() to every parsed event (Window._window_input), so this is that transform, and the event lands
## where it was aimed under any content scale or KEEP margin. global_position becomes the window position, as on an event
## from the OS. An event with no position comes back as it is.
static func gui_to_window(ev: InputEvent, win: Viewport) -> InputEvent:
	if not (ev is InputEventMouse or ev is InputEventScreenTouch or ev is InputEventScreenDrag):
		return ev
	var out: InputEvent = ev.xformed_by(win.get_final_transform())
	if out is InputEventMouse:
		(out as InputEventMouse).global_position = (out as InputEventMouse).position
	return out
