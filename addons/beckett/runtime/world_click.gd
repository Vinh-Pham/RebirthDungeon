extends RefCounted
## click_world and click_node3d, game side (1.17): find the camera that renders the point, carry the point up to the
## viewport that takes the push the way Godot hands a real click down (UiInspect.route), say what will and will not
## receive the click, then push hover + press + release there. Before 1.17 both asked only the root viewport for a
## camera, so the pixel-art-3d layout (its Camera3D inside PixelView/SubViewport, none in the root) could not be
## clicked at all ("no active Camera3D"), and a point inside a SubViewport was pushed as if it were a window point.
##
## Full edition only: pack.ps1 trims this file from Lite, and mcp_runtime loads it by path when a 3D click is asked for
## (the physics_overlap pattern), so the free edition carries no 3D drive code. The geometry under it (route, the hit
## test) is UiInspect's, which Lite's ui_snapshot and screenshot annotate=ui use too; the focused-window rule is
## drive_aim.gd's, trimmed from Lite with this file.
## 4.2+ floor: Camera3D.unproject_position / is_position_behind, Viewport.get_camera_3d / physics_object_picking,
## Node.find_children and Node.NOTIFICATION_VP_MOUSE_ENTER are 4.0 APIs.

const UiInspect := preload("res://addons/beckett/runtime/ui_inspect.gd")
const DriveAim := preload("res://addons/beckett/runtime/drive_aim.gd")


## Which camera, in which viewport: the camera of the node's own viewport first (click_node3d), then the root's (the
## 1.16 rule, so a game with its camera in the root is clicked as before), then, among the SubViewports a visible
## SubViewportContainer shows, the one with a current camera that covers the most of the screen, the later one in tree
## order on a tie: a pixel-art game's main view wins over its minimap. {vp, cam}, or {} when there is none.
static func camera_view(tree_root: Window, node_vp: Viewport) -> Dictionary:
	if node_vp != null:
		var own := node_vp.get_camera_3d()
		if own != null:
			return {"vp": node_vp, "cam": own}
	var rc := tree_root.get_camera_3d()
	if rc != null:
		return {"vp": tree_root, "cam": rc}
	var best: Dictionary = {}
	var best_area := -1.0
	for sv in _shown_subviewports(tree_root):
		var cam := (sv as Viewport).get_camera_3d()
		if cam == null:
			continue
		var rt := UiInspect.route(sv, null)
		if bool(rt["direct"]):
			continue
		var shown: Rect2 = ((rt["xf"] as Transform2D) * (sv as Viewport).get_visible_rect()).intersection((rt["vp"] as Viewport).get_visible_rect())
		var area := shown.get_area()
		if area >= best_area:
			best_area = area
			best = {"vp": sv, "cam": cam}
	return best


## The SubViewports a visible SubViewportContainer shows, in tree order.
static func _shown_subviewports(tree_root: Node) -> Array:
	var out: Array = []
	for c in tree_root.find_children("*", "SubViewportContainer", true, false):
		if not (c as CanvasItem).is_visible_in_tree():
			continue
		for k in (c as Node).get_children():
			if k is SubViewport:
				out.append(k)
	return out


## A short note when physics picking will not see the click, "" when it will (as far as properties can tell: whether
## Godot thinks the mouse is in the viewport cannot be read from a script, so that goes in help, not in a note).
static func picking_note(where: String, picking: bool, captured: bool) -> String:
	if captured:
		return "the mouse is captured (Input.mouse_mode), so physics picking ignores clicks: CollisionObject3D input_event will not fire"
	if not picking:
		return "physics_object_picking is off in %s: CollisionObject3D input_event will not fire" % where
	return ""


## The control in receiver's chain of parents that takes a pointer event and ends it there (an effective mouse_filter
## STOP), walked the way Viewport._gui_call_input walks it; null when the chain ends unhandled, which hands the click on
## to _unhandled_input and physics picking. A top_level item ends the chain.
static func stop_owner(receiver: Node) -> Control:
	var ci: Node = receiver
	while ci is CanvasItem:
		if ci is Control and UiInspect.mouse_filter_of(ci as Control) == Control.MOUSE_FILTER_STOP:
			return ci as Control
		if (ci as CanvasItem).top_level:
			return null
		ci = ci.get_parent()
	return null


## The embedded window (of `land`) a click there lands in, or null: the pick found a window itself (its empty area or
## an exclusive one) or a control inside one.
static func _window_taking(taker: Node, land: Viewport) -> Window:
	if taker == null:
		return null
	var w: Window = taker as Window if taker is Window else taker.get_viewport() as Window
	if w != null and w != land and w.is_embedded():
		return w
	return null


## The whole flow behind click_world and click_node3d: a click at a world point. node_vp is the viewport the clicked
## node is in (click_node3d), null for click_world. Pushes into a viewport only once nothing refuses.
static func click(tree_root: Window, scene_root: Node, world: Vector3, button: int, label: String, node_vp: Viewport) -> Dictionary:
	var view := camera_view(tree_root, node_vp)
	if view.is_empty():
		return {"ok": false, "error": "no current Camera3D in the running scene: none in the root viewport, and none in a SubViewport that a visible SubViewportContainer shows"}
	var cam: Camera3D = view["cam"]
	var vp: Viewport = view["vp"]
	var out := {"ok": true, "target": label}
	var where := "the root viewport"
	if vp != tree_root:
		where = UiInspect.path_of(vp, scene_root)
		out["via"] = where
	if cam.is_position_behind(world):
		out["clicked"] = false
		out["warning"] = "world point is behind the camera, so it is not on screen"
		return out
	var p := cam.unproject_position(world)
	var rt := UiInspect.route(vp, scene_root)
	var land: Viewport = rt["vp"]
	var at: Vector2 = (rt["xf"] as Transform2D) * p
	out["at"] = [at.x, at.y]
	var block := str(rt["block"])
	if block == "hidden" or block == "deep":
		out["clicked"] = false
		out["warning"] = str(rt["why"])
		return out
	var clipping := UiInspect.hop_clipping(p, rt)
	if not vp.get_visible_rect().has_point(p) or clipping != null:
		out["clicked"] = false
		out["warning"] = "world point projects off-screen at (%d, %d)" % [int(at.x), int(at.y)]
		if vp.get_visible_rect().has_point(p):
			out["warning"] += " (outside what %s shows)" % UiInspect.path_of(clipping, scene_root)
		return out
	var hit := UiInspect.hit_along(null, rt, p)
	var blocker: Node = hit["blocker"]
	var receiver: Node = hit["receiver"]
	var win := _window_taking(blocker if blocker != null else receiver, land)
	if win != null:
		out["clicked"] = false
		out["occluded_by"] = UiInspect.path_of(win, scene_root)
		out["warning"] = "a window (%s) covers this point and takes the click" % out["occluded_by"]
		return out
	var focus_why := DriveAim.press_focus_refusal(rt, button, scene_root)
	if not focus_why.is_empty():
		out["clicked"] = false
		out["warning"] = focus_why
		return out
	var notes: Array = []
	var focused := DriveAim.focused_window(land)
	var hops_all: Array = rt["hops"]
	var outer_win: Node = (hops_all[hops_all.size() - 1] as Dictionary)["via"] if not hops_all.is_empty() else null
	if focused != null and focused != outer_win:
		notes.append("%s had focus and took the hover motion; the left press then took focus from it" % UiInspect.path_of(focused, scene_root))
	var land_where := "the root viewport" if land == tree_root else UiInspect.path_of(land, scene_root)
	var reaches := true
	if not str(rt["why"]).is_empty():
		var seen := "_input sees" if stop_owner(UiInspect.pick_at(land, land, at)) != null else "_input and _unhandled_input see"
		notes.append("%s: only %s's %s this click" % [str(rt["why"]), land_where, seen])
		reaches = false
	elif blocker != null:
		var level: Dictionary = hops_all[int(hit["level"])]
		out["occluded_by"] = UiInspect.path_of(blocker, scene_root)
		var after := "_input" if stop_owner(blocker) != null else "_input and _unhandled_input"
		notes.append("%s (%s) covers %s here and takes the click, so %s does not receive it; %s's %s handlers still see it" % [
			out["occluded_by"], blocker.get_class(), UiInspect.path_of(level["via"], scene_root),
			UiInspect.path_of(level["vp"], scene_root), land_where, after])
		reaches = false
	else:
		var stopper := stop_owner(receiver)
		if stopper != null:
			notes.append("%s (mouse_filter STOP) takes this click first: _unhandled_input and physics picking never see it, only _input handlers do" % UiInspect.path_of(stopper, scene_root))
			reaches = false
	if bool(rt["direct"]):
		notes.append("%s is not shown by a SubViewportContainer: the click was pushed straight into it" % land_where)
	for h in rt["hops"]:
		var via: Node = (h as Dictionary)["via"]
		if via is SubViewportContainer and via.get_script() != null and via.has_method("_propagate_input_event"):
			notes.append("%s has a script _propagate_input_event, which can keep the click from %s" % [UiInspect.path_of(via, scene_root), UiInspect.path_of((h as Dictionary)["vp"], scene_root)])
	if reaches:
		var pn := picking_note(where, vp.physics_object_picking, Input.mouse_mode == Input.MOUSE_MODE_CAPTURED)
		if not pn.is_empty():
			notes.append(pn)
	if bool(rt["direct"]):
		land.notification(Node.NOTIFICATION_VP_MOUSE_ENTER)
	var motion := InputEventMouseMotion.new()
	motion.position = at
	motion.global_position = at
	land.push_input(motion, true)
	var down := InputEventMouseButton.new()
	down.button_index = button
	down.pressed = true
	down.position = at
	down.global_position = at
	land.push_input(down, true)
	var up := InputEventMouseButton.new()
	up.button_index = button
	up.pressed = false
	up.position = at
	up.global_position = at
	land.push_input(up, true)
	out["clicked"] = true
	out["world"] = [world.x, world.y, world.z]
	if not notes.is_empty():
		out["note"] = "; ".join(PackedStringArray(notes))
	if land != tree_root:
		out["space"] = UiInspect.path_of(land, scene_root)
	return out
