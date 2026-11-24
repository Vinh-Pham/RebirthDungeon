# @@HEADER@@
extends SceneTree
## A playtest suite as a plain test: load the suite's scene, replay its recorded input frame by frame (or run its
## steps flow), judge every assert and per-frame rule that needs nothing but the running game, print one line
## per judgement and a summary, and exit 0 (pass), 1 (fail) or 2 (blocked: nothing failed, but something could
## not be judged). It uses no editor, no bridge and nothing else from the Beckett addon (no preload, no path
## into it), so it runs where Beckett is not installed or is switched off.
##
## This file is the TEMPLATE playtest op=export_gd fills in: the data block between the DATA-BEGIN and DATA-END
## marker lines is generated from a suite, everything else is copied as it is. The helpers below mirror the ones the editor
## run uses (invariants, input_codec, game_state, callargs, the runtime's resolver and property writer, the click
## route of ui_inspect and drive_aim, and the ui_do flow machine): when one changes, change its twin, and the unit
## suite will tell you if they drifted.

# @@DATA-BEGIN@@
const SUITE := ""
const SCENE := ""
const MODE := "events"
const SETTLE_FRAMES := 4
const STEP_TIMEOUT_MS := 5000
const EVENTS: Array = []
const STEPS: Array = []
const ASSERTS: Array = []
const INVARIANTS: Array = []
# @@DATA-END@@

const EXIT_PASS := 0
const EXIT_FAIL := 1
const EXIT_BLOCKED := 2
const FLOW_SETTLE_FRAMES := 2
const INJECT_MAX_FRAMES := 600
const LINE_MAX := 300

const INV_MAX_ITEMS := 16
const INV_MAX_NAME := 60
const INV_MAX_EXPR := 400
const REPORT_CAP := 160
const MAX_READS := 6
const PROPERTY_PATH := "a ':' starts a property path"
const SUBPATH_SHOWN_MAX := 200
const PURE_CALLS := ["get_node", "get_node_or_null", "get_parent", "get_child", "get_child_count", "get_children", "get_tree", "get_nodes_in_group", "get_path",
	"size", "length", "has", "abs", "absf", "absi", "min", "max", "mini", "maxi", "minf", "maxf", "clamp", "clampi", "clampf", "floor", "floorf", "floori",
	"ceil", "ceilf", "ceili", "round", "roundf", "roundi", "sqrt", "sign", "signf", "signi", "pow", "len", "str", "int", "float", "bool", "lerp", "lerpf"]
## The utility functions no expression may call (as Invariants.UNSAFE_CALLS): str_to_var loads any file a
## Resource("...") in its text names, outside the project as well.
const UNSAFE_CALLS := {
	"str_to_var": "it loads any file a Resource(\"...\") in its text names, outside the project as well",
	"bytes_to_var_with_objects": "it builds an object of any class out of bytes",
}
const STATE_OPS := ["eq", "ne", "lt", "le", "gt", "ge", "contains", "exists"]
const LIST_TYPES := [TYPE_ARRAY, TYPE_PACKED_BYTE_ARRAY, TYPE_PACKED_INT32_ARRAY, TYPE_PACKED_INT64_ARRAY,
	TYPE_PACKED_FLOAT32_ARRAY, TYPE_PACKED_FLOAT64_ARRAY, TYPE_PACKED_STRING_ARRAY, TYPE_PACKED_VECTOR2_ARRAY,
	TYPE_PACKED_VECTOR3_ARRAY, TYPE_PACKED_COLOR_ARRAY]

static var _re_call: RegEx = null
static var _filter_probed := false
static var _filter_override := false

var _scene: Node = null
var _phase := "setup"
var _t0 := 0
var _cap_ms := 0
var _cap_tick := 0
var _units: Array = []
var _done := false
var _events: Array = []
var _ei := 0
var _tick := 0
var _end := 0
var _inv: Array = []
var _inv_frame0 := 0
var _fi := 0
var _f_deadline := 0
var _f_t0 := 0
var _f_settle_left := 0
var _f_cond: Expression = null
var _f_cond_src := ""
var _f_last_wait := ""
var _f_evaluated := false
var _f_stopped := -1
var _inj_applied := false
var _inj_report: Array = []
var _inj_frames := 1
var _inj_f0_process := 0
var _inj_f0_physics := 0



func _initialize() -> void:
	print("[beckett-test] %s: %s suite on %s" % [one_line(SUITE, 80), "a steps" if MODE == "steps" else "an events", one_line(SCENE, 160)])
	var opened := inv_open(INVARIANTS)
	if not bool(opened["ok"]):
		_record("invariants", "fail", str(opened["error"]))
		_finish()
		return
	_inv = opened["items"]
	if SCENE.is_empty():
		_record("scene", "blocked", "the suite names no scene, so there is nothing to play: save it again with scene=res://...")
		_finish()
		return
	if not (SCENE.begins_with("res://") or SCENE.begins_with("user://")) or SCENE.contains(".."):
		_record("scene", "blocked", "'%s' is not a scene of this project (res:// or user://, no '..')" % one_line(SCENE, 100))
		_finish()
		return
	if not ResourceLoader.exists(SCENE):
		_record("scene", "blocked", "scene '%s' does not exist in this project" % SCENE)
		_finish()
		return
	var packed := load(SCENE) as PackedScene
	if packed == null:
		_record("scene", "blocked", "'%s' is not a scene that loads (see the errors above)" % SCENE)
		_finish()
		return
	_scene = packed.instantiate()
	if _scene == null:
		_record("scene", "blocked", "'%s' loaded but could not be instantiated" % SCENE)
		_finish()
		return
	root.add_child(_scene)
	current_scene = _scene
	_t0 = Time.get_ticks_msec()
	if MODE == "steps":
		_begin_flow()
	elif MODE == "events":
		_begin_replay()
	else:
		_record("suite", "blocked", "unknown suite mode '%s'" % MODE)
		_finish()


func _physics_process(_delta: float) -> bool:
	if _done:
		return false
	if _phase == "replay":
		if not paused:
			_replay_tick()
		_check_cap("the replay")
	elif _phase == "flow":
		if not paused and not _inv.is_empty():
			inv_check(_inv, _base(), Engine.get_physics_frames() - _inv_frame0)
	return false


## What expressions, paths and asserts are read against: the CURRENT scene, as the editor's runtime does (a game
## that switches scenes during the run is judged on the scene it is in, not on the one that was freed), else the root.
func _base() -> Node:
	if current_scene != null and is_instance_valid(current_scene):
		return current_scene
	return root


## A node's path as a reply names it: relative to the scene when it is inside it, the absolute /root/... path otherwise.
func _where(n: Node) -> String:
	var b := _base()
	return str(b.get_path_to(n)) if (n == b or b.is_ancestor_of(n)) else str(n.get_path())


func _process(_delta: float) -> bool:
	if not _done and _phase == "replay":
		_replay_inject()
	if not _done and _phase == "flow":
		_flow_tick()
		_check_cap("the steps flow")
	return false


func _check_cap(what: String) -> void:
	if _done or _cap_ms <= 0:
		return
	if Time.get_ticks_msec() - _t0 > _cap_ms:
		if _phase == "replay" and _tick > _cap_tick:
			_cap_tick = _tick
			_t0 = Time.get_ticks_msec()
			return
		_record("run", "blocked", "%s did not finish within %d ms: the game kept the tree paused, or this machine runs far slower than real time" % [what, _cap_ms])
		_finish()


## One printed judgement. Newlines would break the one-line-per-judgement format, and a name or a detail can
## carry text a suite or a game produced (so could a fake BECKETT_RESULT line), so both are flattened and cut.
func _record(unit: String, status: String, detail: String) -> void:
	if not ["pass", "fail", "blocked", "skip"].has(status):
		status = "fail"
	_units.append({"name": unit, "status": status, "detail": detail})
	print("  %-7s %s: %s" % [status, one_line(unit, 100), one_line(detail, LINE_MAX)])


func _finish() -> void:
	if _done:
		return
	_done = true
	_phase = "done"
	var tally := {"pass": 0, "fail": 0, "blocked": 0, "skip": 0}
	for u in _units:
		tally[str((u as Dictionary)["status"])] = int(tally[str((u as Dictionary)["status"])]) + 1
	var verdict := "pass"
	var code := EXIT_PASS
	if int(tally["fail"]) > 0:
		verdict = "fail"
		code = EXIT_FAIL
	elif int(tally["blocked"]) > 0:
		verdict = "blocked"
		code = EXIT_BLOCKED
	print("[beckett-test] %s %s: %d passed, %d failed, %d blocked, %d skipped" % [verdict.to_upper(), one_line(SUITE, 80), tally["pass"], tally["fail"], tally["blocked"], tally["skip"]])
	print("BECKETT_RESULT " + JSON.stringify({"suite": SUITE, "verdict": verdict, "passed": tally["pass"], "failed": tally["fail"], "blocked": tally["blocked"], "skipped": tally["skip"]}))
	quit(code)


## The main loop is ending. If the run has not said how it ended, the game ended it itself (get_tree().quit() in a
## game over or a Quit action, in the middle of the replay): the suite was not judged, which is blocked and never a
## pass. A per-frame rule that was already broken is still reported, and still a failure. (Without this the test
## exited 0 and printed nothing after the game's own last line.)
func _finalize() -> void:
	if _done:
		return
	_report_rules()
	_record("run", "blocked", "the run ended before the suite was judged: the game called get_tree().quit(), or the engine stopped")
	_finish()



func _begin_replay() -> void:
	_events = events_ordered(EVENTS)
	var last_f := 0
	if not _events.is_empty():
		last_f = int((_events[_events.size() - 1] as Dictionary).get("f", 0))
	_end = last_f + maxi(0, SETTLE_FRAMES)
	var fps := maxi(1, Engine.physics_ticks_per_second)
	_cap_ms = maxi(5000, 3 * int(1000.0 * float(_end + 10) / float(fps)) + 5000)
	Engine.max_physics_steps_per_frame = 1
	_phase = "replay"


## One physics frame of the replay, with the same timing the editor's window uses: the per-frame rules first, so frame N
## is judged on the state frame N-1 left; then the frame counts. Once the settle margin has passed, the asserts are judged
## on the state the game is in right then, before it runs another frame; with SETTLE_FRAMES 0 the events stamped with the
## last frame go in first, as the editor's window puts them in at its close.
func _replay_tick() -> void:
	if not _inv.is_empty():
		inv_check(_inv, _base(), _tick)
	_tick += 1
	if _tick > _end:
		_replay_inject()
		_report_rules()
		_judge_asserts()
		_finish()


## The idle part after a replay frame (MainLoop._process runs before every node's _process): the events stamped with the
## frame that just ran go in now, outside physics, the way real input arrives and the editor's replay puts them in, so an
## event stamped f acts from frame f+1 for _input, polled state and is_action_just_pressed alike. Input.parse_input_event only
## BUFFERS an event (the engine would deliver it at the end of the next engine frame), so the buffer is flushed by hand; and
## with one physics frame per engine frame (_begin_replay) a run that falls behind (a heavy first frame) still gets every
## event on its frame, the same way every time.
func _replay_inject() -> void:
	var sent := false
	while _ei < _events.size():
		var ev: Dictionary = _events[_ei]
		if int(ev.get("f", 0)) >= _tick:
			break
		var ie := build_event(ev)
		if ie != null:
			Input.parse_input_event(to_window(ie, root))
			sent = true
		_ei += 1
	if sent:
		Input.flush_buffered_events()


func _report_rules() -> void:
	for r in inv_results(_inv):
		_record("invariant %s" % str((r as Dictionary).get("name", "")), str((r as Dictionary).get("status", "")), str((r as Dictionary).get("detail", "")))


func _judge_asserts() -> void:
	for i in ASSERTS.size():
		var a: Variant = ASSERTS[i]
		if not (a is Dictionary):
			_record("asserts[%d]" % i, "skip", "not an object")
			continue
		var r := eval_assert(a, _base())
		_record("asserts[%d] %s" % [i, str((a as Dictionary).get("type", ""))], str(r["status"]), str(r["detail"]))



func _begin_flow() -> void:
	_phase = "flow"
	_fi = 0
	_inv_frame0 = Engine.get_physics_frames()
	var total := 0
	for s in STEPS:
		total += _step_timeout(s)
		if step_op(s) == "inject":
			var body: Variant = (s as Dictionary)["inject"] if (s as Dictionary).has("inject") else s
			var frames: Variant = (body as Dictionary).get("frames", 1) if body is Dictionary else 1
			total += inject_budget_ms(int(frames) if (frames is int or frames is float) else 1, Engine.physics_ticks_per_second, 1.0)
	_cap_ms = total + 15000
	if STEPS.is_empty():
		_end_flow()
		return
	_flow_arm()


func _step_timeout(step: Variant) -> int:
	if step is Dictionary and (step as Dictionary).has("timeout_ms"):
		return maxi(100, int((step as Dictionary)["timeout_ms"]))
	return maxi(100, STEP_TIMEOUT_MS)


func _flow_arm() -> void:
	_f_deadline = Time.get_ticks_msec() + _step_timeout(STEPS[_fi])
	_f_t0 = Time.get_ticks_msec()
	_f_cond = null
	_f_cond_src = ""
	_f_last_wait = ""
	_f_evaluated = false
	_inj_applied = false
	_inj_report = []


## One attempt per frame, like the editor's flow. {} from a step means "not ready yet, try again next frame".
func _flow_tick() -> void:
	Input.flush_buffered_events()
	if _f_settle_left > 0:
		_f_settle_left -= 1
		return
	var step: Variant = STEPS[_fi]
	var r := _flow_try(step)
	if r.is_empty():
		if Time.get_ticks_msec() > _f_deadline:
			var why := "step %d timed out after %d ms" % [_fi, _step_timeout(step)]
			if _f_last_wait != "":
				why += " - last blocker: %s" % _f_last_wait
			var verdict := "fail" if (step_judges(step) and _f_evaluated) else "blocked"
			_flow_finish_step(step, {"ok": false, "status": verdict, "error": why})
		return
	_flow_finish_step(step, r)


func _flow_finish_step(step: Variant, r: Dictionary) -> void:
	var status := str(r.get("status", ""))
	if status.is_empty():
		status = "pass" if bool(r.get("ok", false)) else "blocked"
	_record("steps[%d] %s" % [_fi, step_op(step)], status, str(r.get("detail", r.get("error", ""))))
	if not bool(r.get("ok", false)):
		_f_stopped = _fi
		_end_flow()
		return
	_fi += 1
	if _fi >= STEPS.size():
		_end_flow()
		return
	_f_settle_left = FLOW_SETTLE_FRAMES
	_flow_arm()


func _end_flow() -> void:
	_phase = "done"
	_report_rules()
	if _f_stopped == -1:
		_judge_asserts()
	else:
		var why := "the steps flow stopped at step %d" % _f_stopped
		for k in range(_f_stopped + 1, STEPS.size()):
			_record("steps[%d] %s" % [k, step_op(STEPS[k])], "skip", "not run: %s" % why)
		for i in ASSERTS.size():
			var a: Variant = ASSERTS[i]
			var kind := str((a as Dictionary).get("type", "")) if a is Dictionary else ""
			_record("asserts[%d] %s" % [i, kind], "skip", "not evaluated: %s" % why)
	_finish()


static func step_op(step: Variant) -> String:
	if not (step is Dictionary):
		return "?"
	var d: Dictionary = step
	for k in ["click", "type", "wait", "assert", "input"]:
		if d.has(k):
			return k
	if d.has("inject") or str(d.get("kind", "")) == "inject":
		return "inject"
	if d.has("state") or str(d.get("kind", "")) == "state":
		return "state"
	return "?"


## A step that judges a value (an assert, a state step): on a timeout it is a fail when it read one.
static func step_judges(step: Variant) -> bool:
	return step is Dictionary and ((step as Dictionary).has("assert") or step_op(step) == "state")


func _flow_try(step: Variant) -> Dictionary:
	if not (step is Dictionary):
		return {"ok": false, "status": "fail", "error": "a step must be an object, got: %s" % str(step).left(60)}
	var d: Dictionary = step
	if d.has("click"):
		return _try_click(selector_of(d["click"]))
	if d.has("type"):
		return _try_type(d["type"] if d["type"] is Dictionary else {})
	if d.has("wait"):
		return _try_wait(d["wait"] if d["wait"] is Dictionary else {})
	if d.has("assert"):
		return _try_assert(d["assert"] if d["assert"] is Dictionary else {})
	if d.has("input"):
		var events: Variant = (d["input"] as Dictionary).get("events", []) if d["input"] is Dictionary else []
		var count := 0
		if events is Array:
			for e in events:
				if e is Dictionary:
					var ie := build_event(e)
					if ie != null:
						Input.parse_input_event(to_window(ie, root))
						count += 1
		return {"ok": true, "detail": "dispatched %d event(s)" % count}
	if d.has("inject") or str(d.get("kind", "")) == "inject":
		var body: Variant = d["inject"] if d.has("inject") else d
		return _try_inject(body if body is Dictionary else {})
	if d.has("state") or str(d.get("kind", "")) == "state":
		var sbody: Variant = d["state"] if d.has("state") else d
		return _try_state(sbody if sbody is Dictionary else {})
	return {"ok": false, "status": "fail", "error": "unknown step: use one of click/type/wait/assert/input/inject/state"}


static func selector_of(v: Variant) -> Dictionary:
	if v is String:
		return {"text": str(v)}
	return (v as Dictionary).duplicate() if v is Dictionary else {}


## A step that names its node with a ':' property path fails at once, as malformed: it never resolves, so waiting on it
## would only run the step's timeout out. {} for any other target. (The ui_do flow's _subpath_fail.)
static func subpath_fail(why: String) -> Dictionary:
	return {} if why.is_empty() else {"ok": false, "status": "fail", "error": why}


## Click a Control: press and release at its center, pushed in GUI space the way the editor's click does: the center
## goes through the control's canvas transform (a scaled CanvasLayer, a Camera2D) and up through each
## SubViewportContainer and embedded window to the viewport that takes the push (click_point). The editor's click
## also refuses an occluded or clipped target and scrolls a hidden one into view; this one does not look: if
## something else covers the control, that control gets the click, as for a player.
func _try_click(sel: Dictionary) -> Dictionary:
	var spec := sel.duplicate()
	var bad := subpath_fail(target_refusal(spec))
	if not bad.is_empty():
		return bad
	if str(spec.get("text", "")) != "" and str(spec.get("class", "")) == "" and str(spec.get("path", "")) == "" and str(spec.get("name", "")) == "":
		spec["class"] = "BaseButton"
	var n := resolve_target(_base(), spec)
	if n == null:
		_f_last_wait = not_found_text(spec)
		return {}
	if not (n is Control):
		return {"ok": false, "error": "not a Control (%s): use an input step for anything else" % n.get_class()}
	var ctrl := n as Control
	var where := _where(ctrl)
	if not ctrl.is_visible_in_tree():
		_f_last_wait = "control is hidden (not visible in tree)"
		return {}
	if "disabled" in ctrl and bool(ctrl.get("disabled")):
		_f_last_wait = "control is disabled"
		return {}
	var point := click_point(ctrl)
	if not bool(point["ok"]):
		_f_last_wait = str(point["why"])
		return {}
	var push_vp: Viewport = point["vp"]
	var at: Vector2 = point["at"]
	var button := int(spec.get("button", 1)) as MouseButton
	var down := InputEventMouseButton.new()
	down.button_index = button
	down.pressed = true
	down.position = at
	down.global_position = at
	push_vp.push_input(down, true)
	var up := InputEventMouseButton.new()
	up.button_index = button
	up.pressed = false
	up.position = at
	up.global_position = at
	push_vp.push_input(up, true)
	return {"ok": true, "detail": "clicked %s" % where}


## Where the editor's click_control pushes for a control, without its occlusion and clipping checks: {ok, vp, at,
## direct, why}. ok is false, with why, when no click from the screen gets there (a container that is hidden or has
## mouse_filter IGNORE, input turned off on the way). (runtime/drive_aim.gd's click_route, the same math: the unit suite
## holds the two together.)
static func click_point(c: Control) -> Dictionary:
	var rt := route_of(c.get_viewport())
	var at: Vector2 = (rt["xf"] as Transform2D) * (c.get_global_transform_with_canvas() * (c.size * 0.5))
	return {"ok": str(rt["why"]).is_empty(), "vp": rt["vp"], "at": at, "direct": rt["direct"], "why": rt["why"]}


## From a viewport's GUI space up to the viewport that takes the push: through each SubViewportContainer (sub_hop) and
## embedded window (window_hop), stopping at a native window or at a SubViewport no container shows (direct).
## (UiInspect.route, without the hop list.)
static func route_of(vp: Viewport) -> Dictionary:
	var xf := Transform2D.IDENTITY
	var why := ""
	var direct := false
	var levels := 0
	var cur := vp
	while cur != null:
		var w := cur as Window
		var emb: Viewport = null
		var c: SubViewportContainer = null
		if w != null:
			emb = embedder_of(w) if w.is_embedded() else null
			if emb == null:
				break
		elif cur is SubViewport:
			c = cur.get_parent() as SubViewportContainer
			if c == null:
				direct = true
				break
		else:
			break
		if levels == 8:
			why = "viewports nested deeper than 8"
			break
		levels += 1
		if w != null:
			if why.is_empty() and (not w.visible or w.gui_disable_input):
				why = "window %s is hidden or takes no input" % str(w.get_path())
			xf = window_hop(w.position, w.get_final_transform()) * xf
			cur = emb
		else:
			if why.is_empty() and (not c.is_visible_in_tree() or mouse_filter_of(c) == Control.MOUSE_FILTER_IGNORE or cur.gui_disable_input):
				why = "%s is hidden or ignores the mouse, or %s takes no input: no click gets through" % [str(c.get_path()), str(cur.get_path())]
			xf = sub_hop(c.get_global_transform_with_canvas(), cur.get_final_transform(), c.stretch, c.stretch_shrink) * xf
			cur = c.get_viewport()
	return {"vp": cur, "xf": xf, "direct": direct, "why": why}


## One SubViewportContainer level: container transform * scale(stretch_shrink when stretch) * the SubViewport's final
## transform, the inverse of how the container forwards a click. (UiInspect.sub_hop.)
static func sub_hop(container_xf: Transform2D, sub_final: Transform2D, stretch: bool, shrink: int) -> Transform2D:
	var k := float(maxi(1, shrink)) if stretch else 1.0
	return container_xf * Transform2D.IDENTITY.scaled(Vector2(k, k)) * sub_final


## One embedded window level: its position plus its final transform. (UiInspect.window_hop.)
static func window_hop(win_pos: Vector2i, win_final: Transform2D) -> Transform2D:
	return Transform2D(0.0, Vector2(win_pos)) * win_final


## The viewport a Window is embedded in: the nearest one above it with gui_embed_subwindows on. (UiInspect.embedder_of.)
static func embedder_of(w: Window) -> Viewport:
	var par := w.get_parent()
	var vp: Viewport = par.get_viewport() if par != null else null
	while vp != null and not vp.gui_embed_subwindows:
		var up := vp.get_parent()
		vp = up.get_viewport() if up != null else null
	return vp


## The mouse filter Godot acts on: the 4.5+ effective one where the engine has it. (UiInspect.mouse_filter_of.)
static func mouse_filter_of(c: Control) -> int:
	if not _filter_probed:
		_filter_probed = true
		_filter_override = ClassDB.class_has_method("Control", "get_mouse_filter_with_override")
	if _filter_override:
		return int(c.call("get_mouse_filter_with_override"))
	return c.mouse_filter


## A positional input event from the root's GUI space (where a recording's positions are) to window pixels, the space
## Input.parse_input_event takes, so a recorded click lands where it was recorded under any content scale.
## (runtime/drive_aim.gd's gui_to_window.)
static func to_window(ev: InputEvent, win: Viewport) -> InputEvent:
	if not (ev is InputEventMouse or ev is InputEventScreenTouch or ev is InputEventScreenDrag):
		return ev
	var out: InputEvent = ev.xformed_by(win.get_final_transform())
	if out is InputEventMouse:
		(out as InputEventMouse).global_position = (out as InputEventMouse).position
	return out


## Type text into a focusable Control as real key events (each character carries its unicode), so text_changed
## and validation fire the way they do for a player. All characters land in one frame (paste semantics).
func _try_type(msg: Dictionary) -> Dictionary:
	var spec := msg.duplicate()
	spec.erase("text")
	var bad := subpath_fail(target_refusal(spec))
	if not bad.is_empty():
		return bad
	var n := resolve_target(_base(), spec)
	if n == null:
		_f_last_wait = not_found_text(spec)
		return {}
	if not (n is Control):
		return {"ok": false, "error": "not a Control (%s): type drives focusable text inputs" % n.get_class()}
	var ctrl := n as Control
	var where := _where(ctrl)
	if not ctrl.is_visible_in_tree():
		_f_last_wait = "control is hidden"
		return {}
	if "disabled" in ctrl and bool(ctrl.get("disabled")):
		_f_last_wait = "control is disabled"
		return {}
	if "editable" in ctrl and not bool(ctrl.get("editable")):
		_f_last_wait = "control is not editable"
		return {}
	if ctrl.focus_mode == Control.FOCUS_NONE:
		return {"ok": false, "error": "%s has focus_mode NONE: it cannot take keyboard input" % where}
	ctrl.grab_focus()
	if root.gui_get_focus_owner() != ctrl:
		return {"ok": false, "error": "could not focus %s: another control refuses to release focus" % where}
	var text := str(msg.get("text", ""))
	var submit := to_bool(msg.get("submit"))
	if to_bool(msg.get("clear"), true):
		if ctrl.has_method("select_all"):
			ctrl.call("select_all")
			if text.is_empty():
				_push_key(KEY_BACKSPACE, 0)
		elif "text" in ctrl:
			ctrl.set("text", "")
	var typed := 0
	for i in text.length():
		var code := text.unicode_at(i)
		if code == 10:
			_push_key(KEY_ENTER, 0)
		else:
			_push_key(0, code)
		typed += 1
	if submit:
		_push_key(KEY_ENTER, 0)
	var detail := "typed %d char(s) into %s" % [typed, where]
	if "text" in ctrl:
		detail += " (text now '%s')" % str(ctrl.get("text")).left(60)
	return {"ok": true, "detail": detail}


func _push_key(keycode: int, unicode: int) -> void:
	var down := InputEventKey.new()
	down.keycode = keycode as Key
	down.physical_keycode = keycode as Key
	down.unicode = unicode
	down.pressed = true
	root.push_input(down)
	var up := InputEventKey.new()
	up.keycode = keycode as Key
	up.physical_keycode = keycode as Key
	up.pressed = false
	root.push_input(up)


func _try_wait(w: Dictionary) -> Dictionary:
	if w.has("ms"):
		if Time.get_ticks_msec() - _f_t0 >= int(w["ms"]):
			return {"ok": true, "detail": "waited %d ms" % int(w["ms"])}
		_f_last_wait = "waiting %d ms" % int(w["ms"])
		return {}
	if w.has("node"):
		var bad := subpath_fail(subpath_refusal("node", str(w["node"]), "", false))
		if not bad.is_empty():
			return bad
		if resolve_node(_base(), str(w["node"])) != null:
			return {"ok": true, "detail": "node appeared: %s" % str(w["node"])}
		_f_last_wait = "node not found yet: %s" % str(w["node"])
		return {}
	if w.has("condition"):
		return _eventually(str(w["condition"]), "wait")
	return {"ok": false, "status": "fail", "error": "wait needs one of ms / node / condition"}


func _try_assert(a: Dictionary) -> Dictionary:
	if a.has("condition"):
		return _eventually(str(a["condition"]), "assert")
	if a.has("node") and a.has("property"):
		var bad := subpath_fail(subpath_refusal("node", str(a["node"]), "", false))
		if not bad.is_empty():
			return bad
		var n := resolve_node(_base(), str(a["node"]))
		if n == null:
			_f_last_wait = "assert target not found yet: %s" % str(a["node"])
			return {}
		var actual: Variant = n.get(str(a["property"]))
		_f_evaluated = true
		if loose_equal(actual, a.get("equals")):
			return {"ok": true, "detail": "%s.%s == %s" % [str(a["node"]), str(a["property"]), str(a.get("equals"))]}
		_f_last_wait = "%s.%s = %s (want %s)" % [str(a["node"]), str(a["property"]), str(render_value(actual)), str(a.get("equals"))]
		return {}
	return {"ok": false, "status": "fail", "error": "assert needs condition, or node+property+equals"}


func _eventually(src: String, what: String) -> Dictionary:
	if _f_cond == null or _f_cond_src != src:
		var unsafe := unsafe_call(src)
		if not unsafe.is_empty():
			return {"ok": false, "status": "fail", "error": "%s condition refused: %s" % [what, unsafe]}
		_f_cond = Expression.new()
		_f_cond_src = src
		if _f_cond.parse(src) != OK:
			return {"ok": false, "status": "fail", "error": "%s condition parse error: %s" % [what, _f_cond.get_error_text()]}
	var v: Variant = _f_cond.execute([], _base(), true)
	if _f_cond.has_execute_failed():
		_f_last_wait = "%s condition exec error: %s" % [what, _f_cond.get_error_text()]
		return {}
	_f_evaluated = true
	if to_bool(v):
		return {"ok": true, "detail": "%s: %s -> true" % [what, src]}
	_f_last_wait = "%s: %s -> %s" % [what, src, str(render_value(v))]
	return {}


## {inject: {set, call, frames}}: patch state into the game, then let it run on it. Until EVERY target exists nothing
## is applied (a call is not idempotent, so a half-applied inject must never be retried); then all of it goes in at
## once, sets before calls, through the same value coercion and read-back the editor's write uses; then the step
## holds until `frames` physics AND process frames have passed, so the next step reads the state AFTER the game ran
## on what was injected. A refused write or call ends the step blocked: the flow could not be arranged.
func _try_inject(spec: Dictionary) -> Dictionary:
	if not _inj_applied:
		var bad := inject_error(spec)
		if not bad.is_empty():
			return {"ok": false, "status": "fail", "error": bad}
		var sets: Array = spec.get("set", []) if spec.get("set", []) is Array else []
		var calls: Array = spec.get("call", []) if spec.get("call", []) is Array else []
		for i in sets.size():
			var sd: Dictionary = sets[i]
			var sbad := subpath_fail(subpath_refusal("node", str(sd["node"]), str(sd["property"]), true))
			if not sbad.is_empty():
				sbad["error"] = "inject set[%d]: %s" % [i, sbad["error"]]
				return sbad
		for i in calls.size():
			var cbad := subpath_fail(subpath_refusal("node", str((calls[i] as Dictionary)["node"]), "", false))
			if not cbad.is_empty():
				cbad["error"] = "inject call[%d]: %s" % [i, cbad["error"]]
				return cbad
		for e in sets + calls:
			if resolve_node(_base(), str((e as Dictionary)["node"])) == null:
				_f_last_wait = "inject target not found yet: %s" % str((e as Dictionary)["node"]).left(80)
				return {}
		var applied: Array = []
		for e in sets:
			var ed: Dictionary = e
			var r := write_property(resolve_node(_base(), str(ed["node"])), str(ed["property"]), ed["value"])
			if not bool(r.get("ok", false)):
				return {"ok": false, "status": "blocked", "applied": applied,
					"error": ("inject set %s.%s failed: %s" % [str(ed["node"]), str(ed["property"]), str(r.get("error", "refused"))]).left(240)}
			applied.append(("set %s.%s: %s -> %s" % [str(ed["node"]), str(ed["property"]), str(r.get("before")), str(r.get("after"))]).left(160))
		for e in calls:
			var cd: Dictionary = e
			var cr := call_method(resolve_node(_base(), str(cd["node"])), str(cd["method"]), cd.get("args", []))
			if not bool(cr.get("ok", false)):
				return {"ok": false, "status": "blocked", "applied": applied,
					"error": ("inject call %s.%s failed: %s" % [str(cd["node"]), str(cd["method"]), str(cr.get("error", "refused"))]).left(240)}
			applied.append(("call %s.%s -> %s" % [str(cd["node"]), str(cd["method"]), str(cr.get("result"))]).left(160))
		_inj_applied = true
		_inj_report = applied
		_inj_frames = clampi(int(spec.get("frames", 1)), 1, INJECT_MAX_FRAMES)
		_inj_f0_process = Engine.get_process_frames()
		_inj_f0_physics = Engine.get_physics_frames()
		_f_deadline = maxi(_f_deadline, Time.get_ticks_msec() + inject_budget_ms(_inj_frames, Engine.physics_ticks_per_second, Engine.time_scale))
	if Engine.get_process_frames() - _inj_f0_process >= _inj_frames and Engine.get_physics_frames() - _inj_f0_physics >= _inj_frames:
		return {"ok": true, "detail": "applied %d change(s), stepped %d frame(s)" % [_inj_report.size(), _inj_frames], "applied": _inj_report}
	_f_last_wait = "stepping %d frame(s) after the inject" % _inj_frames
	return {}


## How long the stepping of an inject may take, in ms: `frames` physics frames at the project's rate (the time scale makes
## a second of physics shorter or longer), doubled for a game that hitches, and a second on top. (UiDo.inject_budget_ms.)
static func inject_budget_ms(frames: int, ticks_per_second: int, time_scale: float) -> int:
	var rate := maxf(1.0, float(ticks_per_second)) * clampf(time_scale, 0.1, 10.0)
	return int(2000.0 * float(clampi(frames, 1, INJECT_MAX_FRAMES)) / rate) + 1000


## {state: {node, path, op, value}}: assert on the state a node exposes through _beckett_state() (or _mcp_state()),
## polling like an assert. A malformed step fails at once; a node that does not exist yet is waited for; a node with
## no state method ends the step blocked at once; a state that was read and does not satisfy the condition keeps the
## step polling, and a timeout then is a fail.
func _try_state(spec: Dictionary) -> Dictionary:
	var bad := state_spec_error(spec)
	if not bad.is_empty():
		return {"ok": false, "status": "fail", "error": bad}
	var sub_bad := subpath_fail(subpath_refusal("node", str(spec["node"]), "", false))
	if not sub_bad.is_empty():
		return sub_bad
	var n := resolve_node(_base(), str(spec["node"]))
	if n == null:
		_f_last_wait = "state node not found yet: %s" % str(spec["node"]).left(80)
		return {}
	var r := state_evaluate(n, spec)
	if bool(r.get("evaluated", false)):
		_f_evaluated = true
	match str(r.get("status", "")):
		"pass":
			return {"ok": true, "detail": str(r["detail"])}
		"blocked":
			return {"ok": false, "status": "blocked", "error": str(r["detail"])}
	_f_last_wait = str(r.get("detail", ""))
	return {}



## Judge one end-state assert: {status: pass | fail | blocked | skip, detail}. The kinds that need a rendered frame
## or the editor's measuring window (screenshot, perf) are skipped here, and say so: see the header of this file.
static func eval_assert(a: Dictionary, base: Node) -> Dictionary:
	match str(a.get("type", "")).to_lower():
		"node_state":
			var target := str(a.get("target", ""))
			var refused := subpath_refusal("path", target, str(a.get("property", "")), true)
			if not refused.is_empty():
				return {"status": "fail", "detail": refused}
			var n := resolve_node(base, target)
			if n == null:
				return {"status": "blocked", "detail": "node not found: %s" % target}
			var got := read_property(n, str(a.get("property", "")))
			if not bool(got.get("ok", false)):
				return {"status": "fail", "detail": str(got.get("error", "get failed"))}
			var expected: Variant = a.get("equals")
			if loose_equal(got["value"], expected):
				return {"status": "pass", "detail": "%s.%s == %s" % [target, str(a.get("property", "")), str(expected)]}
			return {"status": "fail", "detail": "%s.%s = %s (expected %s)" % [target, str(a.get("property", "")), str(render_value(got["value"])), str(expected)]}
		"screen_text":
			var needle := str(a.get("text", ""))
			var found := false
			for c in base.get_children():
				if find_text(c, needle):
					found = true
					break
			if found:
				return {"status": "pass", "detail": "found '%s' on screen" % needle}
			return {"status": "fail", "detail": "text '%s' not found on screen" % needle}
		"expr":
			var cond := str(a.get("condition", ""))
			var unsafe := unsafe_call(cond)
			if not unsafe.is_empty():
				return {"status": "fail", "detail": "expr refused: %s" % unsafe}
			var ex := Expression.new()
			if ex.parse(cond) != OK:
				return {"status": "fail", "detail": "expr parse error: %s" % ex.get_error_text()}
			var v: Variant = ex.execute([], base, true)
			if ex.has_execute_failed():
				return {"status": "blocked", "detail": "expr exec error: %s" % ex.get_error_text()}
			if to_bool(v):
				return {"status": "pass", "detail": "%s -> true" % cond}
			return {"status": "fail", "detail": "%s -> %s (want true)%s" % [cond, str(render_value(v)), reads_suffix(reads_of(cond.strip_edges(), base))]}
		"screenshot":
			return {"status": "skip", "detail": "not run here: a screenshot assert needs a rendered frame (playtest op=run in the editor runs it)"}
		"perf":
			return {"status": "skip", "detail": "not run here: perf is measured in the editor's replay window, and a render-less CI loop has no frame cost to bound (playtest op=run runs it)"}
	return {"status": "skip", "detail": "unknown assert type"}


## "; read: <operand> = <value>, ..." for a false expr assert that can say what it read, else "".
static func reads_suffix(reads: Dictionary) -> String:
	if reads.is_empty():
		return ""
	var parts: Array = []
	for k in reads:
		parts.append("%s = %s" % [str(k).left(80), str(reads[k]).left(60)])
	return "; read: " + ", ".join(parts)


## Does a node_state assert hold? The one rule every node_state assert judges by (same_value, below), so this test and the
## editor's run give one suite one verdict.
static func loose_equal(actual: Variant, expected: Variant) -> bool:
	return same_value(actual, expected)



const VALUE_LITERALS := ["Vector2", "Vector2i", "Vector3", "Vector3i", "Vector4", "Vector4i", "Quaternion", "Rect2", "Rect2i",
	"Transform2D", "Basis", "Transform3D", "Projection", "AABB", "Plane"]
const PRINT_MARKS := ["X:", "Y:", "Z:", "W:", "O:", "P:", "S:", "N:", "D:", "(", ")", "[", "]", ","]


## Does `actual` hold the value `expected` asks for? Both rendered; numbers by value (two whole numbers exactly, so 12 is
## 12.0 and 123456 is not 123457; with a fraction, within is_equal_approx), arrays and dictionaries entry by entry, the
## same text, and last, where the value read is a vector, a color or a matrix in some spelling, the numbers each one
## spells, in order ("(0.0, 6.0, 11.0)", "0 6 11", "Vector3(0, 6, 11)" and {"x": 0, "y": 6, "z": 11} all match a Vector3
## at (0, 6, 11)).
static func same_value(actual: Variant, expected: Variant) -> bool:
	return same_rendered(render_value(actual), render_value(expected))


static func same_rendered(a: Variant, e: Variant) -> bool:
	if (a is int or a is float) and (e is int or e is float):
		if whole_number(a) and whole_number(e):
			return int(a) == int(e)
		return is_equal_approx(float(a), float(e))
	if a is Array and e is Array and (a as Array).size() == (e as Array).size():
		var items_same := true
		for i in (a as Array).size():
			if not same_rendered(a[i], e[i]):
				items_same = false
				break
		if items_same:
			return true
	if a is Dictionary and e is Dictionary and (a as Dictionary).size() == (e as Dictionary).size():
		var keys_same := true
		for k in a:
			if not (e as Dictionary).has(k) or not same_rendered(a[k], e[k]):
				keys_same = false
				break
		if keys_same:
			return true
	if str(a) == str(e):
		return true
	if not numbers_comparable(a, e):
		return false
	var an: Variant = numbers_of(a)
	var en: Variant = numbers_of(e)
	if an == null or en == null or (an as Array).is_empty() or (an as Array).size() != (en as Array).size():
		return false
	for i in (an as Array).size():
		if not same_rendered(an[i], en[i]):
			return false
	return true


## A whole number a double holds exactly (under 2^53): two such numbers compare exactly.
static func whole_number(x: Variant) -> bool:
	return x is int or (absf(x) < 9007199254740992.0 and x == floorf(x))


## May the value read and the one asked for be judged by the numbers they spell? A vector's array against text or
## {"x": ..}, a nested one (a transform) against its numbers flat, a game's old "(0.0, 6.0, 11.0)" or "[X: ...]" text
## against any spelling, and a number against its text. So 12 is not [12], and [1, 2, 3, 4] is not [[1, 2], [3, 4]].
static func numbers_comparable(a: Variant, e: Variant) -> bool:
	if a is Array:
		return e is String or e is Dictionary or (e is Array and nested_array(a) and not nested_array(e))
	if a is String:
		var s := (a as String).strip_edges()
		return s.begins_with("(") or s.begins_with("[")
	return (a is int or a is float) and e is String


static func nested_array(v: Array) -> bool:
	for x in v:
		if x is Array:
			return true
	return false


## A value as the editor's reply carries it: an int stays an int, a vector is the array of its components, a transform
## [[x axis], [y axis], [z axis], [origin]], an object or a Callable its text, a float that is not finite its text.
static func render_value(v: Variant) -> Variant:
	var t := typeof(v)
	match t:
		TYPE_NIL, TYPE_BOOL, TYPE_INT, TYPE_STRING:
			return v
		TYPE_FLOAT:
			if is_nan(v) or is_inf(v):
				return str(v)
			return v
		TYPE_STRING_NAME, TYPE_NODE_PATH:
			return str(v)
		TYPE_VECTOR2, TYPE_VECTOR2I:
			return [value_component(v.x), value_component(v.y)]
		TYPE_VECTOR3, TYPE_VECTOR3I:
			return [value_component(v.x), value_component(v.y), value_component(v.z)]
		TYPE_VECTOR4, TYPE_VECTOR4I, TYPE_QUATERNION:
			return [value_component(v.x), value_component(v.y), value_component(v.z), value_component(v.w)]
		TYPE_COLOR:
			return [value_component(v.r), value_component(v.g), value_component(v.b), value_component(v.a)]
		TYPE_RECT2, TYPE_RECT2I, TYPE_AABB:
			return [render_value(v.position), render_value(v.size)]
		TYPE_PLANE:
			return [render_value(v.normal), value_component(v.d)]
		TYPE_TRANSFORM2D:
			return [render_value(v.x), render_value(v.y), render_value(v.origin)]
		TYPE_BASIS:
			return [render_value(v.x), render_value(v.y), render_value(v.z)]
		TYPE_TRANSFORM3D:
			return [render_value(v.basis.x), render_value(v.basis.y), render_value(v.basis.z), render_value(v.origin)]
		TYPE_PROJECTION:
			return [render_value(v.x), render_value(v.y), render_value(v.z), render_value(v.w)]
		TYPE_ARRAY:
			if json_shaped(v):
				return v
			var out: Array = []
			for e in v:
				out.append(render_value(e))
			return out
		TYPE_DICTIONARY:
			if json_shaped(v):
				return v
			var d := {}
			for k in v:
				d[str(k)] = render_value(v[k])
			return d
		TYPE_PACKED_FLOAT32_ARRAY:
			var floats: Array = []
			for e in v:
				floats.append(value_component(e))
			return floats
	if t >= TYPE_PACKED_BYTE_ARRAY and t < TYPE_MAX:
		var items: Array = []
		for e in v:
			items.append(render_value(e))
		return items
	return str(v)


## Is `v` already what render_value makes of it (plain data with String keys)?
static func json_shaped(v: Variant) -> bool:
	match typeof(v):
		TYPE_NIL, TYPE_BOOL, TYPE_INT, TYPE_STRING:
			return true
		TYPE_FLOAT:
			return not (is_nan(v) or is_inf(v))
		TYPE_ARRAY:
			if (v as Array).is_typed():
				return false
			for e in v:
				if not json_shaped(e):
					return false
			return true
		TYPE_DICTIONARY:
			for k in v:
				if not (k is String) or not json_shaped(v[k]):
					return false
			return true
	return false


static func value_component(x: Variant) -> Variant:
	if x is int:
		return x
	var f := float(x)
	if is_nan(f) or is_inf(f):
		return str(f)
	if f == floorf(f) and absf(f) < 9007199254740992.0:
		return int(f)
	return short_float(f)


## The shortest decimal, 6 to 9 significant digits, that reads back as the same float32 as `f` (f itself when it is none).
static func short_float(f: float) -> float:
	if PackedFloat32Array([f])[0] != f:
		return f
	var magnitude := floori(log(absf(f)) / log(10.0))
	for digits in range(6, 10):
		var back := String.num(f, clampi(digits - 1 - magnitude, 0, 32)).to_float()
		if PackedFloat32Array([back])[0] == f:
			return back
	return f


static func numbers_of(v: Variant) -> Variant:
	if v is int or v is float:
		return [v]
	if v is String:
		return text_numbers(v)
	if v is Array:
		var out: Array = []
		for e in v:
			var part: Variant = numbers_of(e)
			if part == null:
				return null
			out.append_array(part)
		return out
	if v is Dictionary:
		var d: Dictionary = v
		for names in [["x", "y", "z", "w"], ["r", "g", "b", "a"]]:
			if d.size() < 2 or d.size() > 4 or not d.has(names[0]):
				continue
			var out: Array = []
			for i in d.size():
				var c: Variant = d.get(names[i])
				if not (c is int or c is float):
					return null
				out.append(c)
			return out
	return null


## The numbers in text: a Godot literal of a vector, matrix or color type (read as that type), the way str() prints a
## value, or bare numbers. null for any other text.
static func text_numbers(text: String) -> Variant:
	var s := text.strip_edges()
	var open := s.find("(")
	if open > 0 and s.ends_with(")"):
		var type_name := s.left(open).strip_edges()
		if type_name == "Color":
			var c: Dictionary = coerce_color(s)
			if not bool(c.get("ok", false)):
				return null
			return numbers_of(render_value(c.get("value")))
		if VALUE_LITERALS.has(type_name):
			var lit: Variant = plain_literal(s, [type_name])
			if lit == null:
				return null
			return numbers_of(render_value(lit))
		return null
	for m in PRINT_MARKS:
		s = s.replace(m, " ")
	var out: Array = []
	for part in s.split(" ", false):
		if part.is_valid_int():
			out.append(part.to_int())
		elif part.is_valid_float():
			out.append(part.to_float())
		elif part in ["inf", "-inf", "nan"]:
			out.append(part)
		else:
			return null
	if out.is_empty():
		return null
	return out


## Is some node at or under `node` carrying a `text` property that contains `needle` (case-insensitive)? Every node
## matches an empty needle, which is how the editor's find treats it.
static func find_text(node: Node, needle: String) -> bool:
	if needle.is_empty() or node_text(node).findn(needle) != -1:
		return true
	for c in node.get_children():
		if find_text(c, needle):
			return true
	return false


static func node_text(n: Node) -> String:
	for p in n.get_property_list():
		if str(p.get("name", "")) == "text":
			return str(n.get("text"))
	return ""



## A node by path or name: relative to the scene, an absolute /root/... path, a name found anywhere under the scene,
## and last a name found anywhere in the tree (an autoload, an overlay). A path with a ':' in it is none of them: no
## node name holds one, and get_node_or_null would drop it and answer with the node before it (see subpath_refusal).
static func resolve_node(base: Node, path: String) -> Node:
	if base == null:
		return null
	if path.is_empty() or path == "." or path == str(base.name):
		return base
	if path.contains(":"):
		return null
	var tree := base.get_tree()
	if path.begins_with("/root") and tree != null:
		var absolute := tree.root.get_node_or_null(NodePath(path))
		if absolute != null:
			return absolute
	var n := base.get_node_or_null(NodePath(path))
	if n != null:
		return n
	n = base.find_child(path, true, false)
	if n != null:
		return n
	if tree != null and tree.root != null:
		n = tree.root.find_child(path, true, false)
	return n


## A node by path, or by a selector {class, name, text, nth, under}: the nth match in document order.
static func resolve_target(base: Node, spec: Dictionary) -> Node:
	var path := str(spec.get("path", ""))
	if not path.is_empty():
		return resolve_node(base, path)
	var cls := str(spec.get("class", ""))
	var name_q := str(spec.get("name", ""))
	var text_q := str(spec.get("text", ""))
	if cls == "" and name_q == "" and text_q == "":
		return null
	var scope := base
	var under := str(spec.get("under", ""))
	if not under.is_empty():
		scope = resolve_node(base, under)
	if scope == null:
		return null
	var out: Array = []
	select_walk(scope, cls, name_q, text_q, out)
	var nth := int(spec.get("nth", 0))
	if nth < 0 or nth >= out.size():
		return null
	return out[nth]


static func select_walk(node: Node, cls: String, name_q: String, text_q: String, out: Array) -> void:
	var ok := true
	if cls != "" and not class_match(node, cls):
		ok = false
	if ok and name_q != "" and str(node.name).findn(name_q) == -1:
		ok = false
	if ok and text_q != "" and node_text(node).findn(text_q) == -1:
		ok = false
	if ok:
		out.append(node)
	for c in node.get_children():
		select_walk(c, cls, name_q, text_q, out)


## A class filter against the native class chain AND a script's class_name (is_class alone misses custom nodes).
static func class_match(node: Node, cls: String) -> bool:
	if cls == "":
		return true
	if node.is_class(cls):
		return true
	var s = node.get_script()
	if s != null and s.has_method("get_global_name"):
		var g = s.get_global_name()
		return g != null and str(g) != "" and str(g).nocasecmp_to(cls) == 0
	return false


## Why `value`, given in `field` as a node path, names no node: "" when it is not a property path. A ':' starts a property
## path (Ground:material_override is the material_override property of Ground), which a node lookup would drop, so the
## step would act on Ground itself. `prop` is the property named beside the path, appended to the split the words
## suggest; `with_property` false tells the node alone. The words never start with "node not found", so nothing waits
## on them. (The runtime's subpath_refusal, word for word.)
static func subpath_refusal(field: String, value: String, prop: String = "", with_property: bool = true) -> String:
	var colon := value.find(":")
	if colon == -1 or value.contains("://"):
		return ""
	var node := value.left(colon)
	if node.is_empty():
		node = "."
	var rest := value.substr(colon + 1)
	if not prop.is_empty():
		rest = prop if rest.is_empty() else rest + ":" + prop
	var why := "%s '%s' is not a node path: %s, and %s names a node." % [field, subpath_shown(value), PROPERTY_PATH, field]
	if with_property and not rest.is_empty():
		return why + " Put the node in %s and the property part in property: %s=%s property=%s" % [field, field, subpath_shown(node), subpath_shown(rest)]
	return why + " Pass %s=%s" % [field, subpath_shown(node)]


static func subpath_shown(text: String) -> String:
	var t := text.replace("\n", " ").replace("\r", " ")
	return t if t.length() <= SUBPATH_SHOWN_MAX else t.left(SUBPATH_SHOWN_MAX) + "..."


## The ':' refusal for a target spec, or "": its path, or with no path the `under` it is scoped to. (The runtime's
## _target_refusal.)
static func target_refusal(spec: Dictionary) -> String:
	var path := str(spec.get("path", ""))
	if not path.is_empty():
		return subpath_refusal("path", path, str(spec.get("prop", "")), spec.has("prop"))
	return subpath_refusal("under", str(spec.get("under", "")), "", false)


static func not_found_text(spec: Dictionary) -> String:
	var refused := target_refusal(spec)
	if not refused.is_empty():
		return refused
	var path := str(spec.get("path", ""))
	if not path.is_empty():
		return "node not found: %s" % path
	var sel: Array = []
	for k in ["class", "name", "text"]:
		var v := str(spec.get(k, ""))
		if v != "":
			sel.append("%s=%s" % [k, v])
	if sel.is_empty():
		return "no path or selector (class/name/text) given"
	return "no node matches selector %s (nth=%d)" % [", ".join(sel), int(spec.get("nth", 0))]



## The object that owns the last segment of a possibly-nested property path ("environment:fog_density"), walked hop
## by hop so a typo names the hop it failed on. {ok, owner, leaf, indexed} or {ok: false, error}.
static func property_owner(obj: Object, prop: String) -> Dictionary:
	if prop.is_empty():
		return {"ok": false, "error": "prop is required (the property name, e.g. position or environment:fog_density)"}
	var parts := prop.split(":", false)
	if parts.is_empty():
		return {"ok": false, "error": "prop is required"}
	var holder: Object = obj
	for i in range(parts.size() - 1):
		var seg := str(parts[i])
		if not has_property(holder, seg):
			return {"ok": false, "error": "%s has no property '%s'%s" % [holder.get_class(), seg, "" if seg == prop else " (in path '%s')" % prop]}
		var nxt: Variant = holder.get(seg)
		if nxt == null:
			return {"ok": false, "error": "%s.%s is null, so '%s' cannot be reached" % [holder.get_class(), seg, prop]}
		if not (nxt is Object):
			return {"ok": true, "owner": obj, "leaf": prop, "indexed": true}
		holder = nxt as Object
		if not is_instance_valid(holder):
			return {"ok": false, "error": "%s in '%s' points at a freed object" % [seg, prop]}
	var leaf := str(parts[parts.size() - 1])
	if not has_property(holder, leaf):
		return {"ok": false, "error": "%s has no property '%s'%s" % [holder.get_class(), leaf, "" if leaf == prop else " (in path '%s')" % prop]}
	return {"ok": true, "owner": holder, "leaf": leaf, "indexed": false}


static func has_property(obj: Object, prop: String) -> bool:
	for p in obj.get_property_list():
		if str(p.get("name", "")) == prop:
			return true
	return false


static func read_at(res: Dictionary) -> Variant:
	var holder: Object = res["owner"]
	if bool(res.get("indexed", false)):
		return holder.get_indexed(NodePath(str(res["leaf"])))
	return holder.get(str(res["leaf"]))


static func read_property(obj: Object, prop: String) -> Dictionary:
	var res := property_owner(obj, prop)
	if not bool(res.get("ok", false)):
		return res
	return {"ok": true, "value": read_at(res)}


## Write a property the way the editor's runtime_set_property does: coerce the JSON value to the type the property
## declares, refuse one that cannot be stored, write, READ BACK. A write that moved nothing is an error; one the engine
## adjusted (clamped, normalized) says so. {ok, before, after} or {ok: false, error}.
static func write_property(n: Object, prop: String, value: Variant) -> Dictionary:
	var res := property_owner(n, prop)
	if not bool(res.get("ok", false)):
		return res
	var before: Variant = read_at(res)
	var fit := coerce_for_write(res, before, value)
	if not bool(fit.get("ok", false)):
		return {"ok": false, "error": "%s.%s: %s" % [(res["owner"] as Object).get_class(), str(res["leaf"]), str(fit["error"])]}
	var want: Variant = fit["value"]
	var holder: Object = res["owner"]
	if bool(res.get("indexed", false)):
		holder.set_indexed(NodePath(str(res["leaf"])), want)
	else:
		holder.set(str(res["leaf"]), want)
	var after: Variant = read_at(res)
	var out := {"ok": true, "before": before, "after": after}
	if value_eq(after, want):
		return out
	if value_eq(before, after):
		return {"ok": false, "error": "write did not stick: %s.%s is still %s (wanted %s)" % [holder.get_class(), str(res["leaf"]), str(after), str(want)]}
	return out


## The value a write to the resolved property `res` (holding `current`) stores: {ok, value} or {ok: false, error}. The
## type is the one the property declares, else (a struct member, an untyped variable) the one of the value it holds;
## an untyped variable holding an int also takes a fraction.
static func coerce_for_write(res: Dictionary, current: Variant, value: Variant) -> Dictionary:
	var info := declared(res)
	var want := int(info.get("type", TYPE_NIL))
	var untyped := want == TYPE_NIL and not bool(res.get("indexed", false))
	if want == TYPE_NIL:
		want = typeof(current)
	elif want == TYPE_STRING and typeof(current) in [TYPE_STRING_NAME, TYPE_NODE_PATH]:
		want = typeof(current)
	if value is String and not (want in [TYPE_STRING, TYPE_STRING_NAME, TYPE_NODE_PATH]):
		var raw := (value as String).strip_edges()
		if raw.begins_with("[") or raw.begins_with("{"):
			var parsed: Variant = JSON.parse_string(raw)
			if parsed is Array or parsed is Dictionary:
				value = parsed
	if want == TYPE_NIL:
		return {"ok": true, "value": value}
	if want == TYPE_NODE_PATH and typeof(value) == TYPE_NIL:
		return {"ok": true, "value": NodePath()}
	if want == TYPE_OBJECT:
		if typeof(value) == TYPE_NIL or value is Object:
			return {"ok": true, "value": value}
		return coerce_error("expected an object - only null (to clear it) can be written to an object property")
	var r := coerce(value, want)
	if not bool(r.get("ok", false)) and untyped and want == TYPE_INT:
		var as_float := coerce(value, TYPE_FLOAT)
		if bool(as_float.get("ok", false)):
			r = as_float
	return r


## The property-list entry of a resolved leaf, {} for a struct member (position:y).
static func declared(res: Dictionary) -> Dictionary:
	if bool(res.get("indexed", false)):
		return {}
	var leaf := str(res.get("leaf", ""))
	for p in (res["owner"] as Object).get_property_list():
		if str(p.get("name", "")) == leaf:
			return p
	return {}


static func value_eq(a: Variant, b: Variant) -> bool:
	if typeof(a) != typeof(b):
		return false
	match typeof(a):
		TYPE_FLOAT:
			return is_equal_approx(float(a), float(b))
		TYPE_VECTOR2, TYPE_VECTOR3, TYPE_VECTOR4, TYPE_COLOR, TYPE_QUATERNION, TYPE_PLANE, TYPE_TRANSFORM2D, TYPE_TRANSFORM3D, TYPE_BASIS:
			return a.is_equal_approx(b)
	return a == b


static func vec2_of(v: Variant) -> Vector2:
	if v is Array and v.size() >= 2:
		return Vector2(v[0], v[1])
	if v is Dictionary:
		return Vector2(v.get("x", 0), v.get("y", 0))
	return Vector2.ZERO


## Call a method with its arguments coerced to the declared parameter types. A raw callv with a mis-typed argument
## does not run the method (the engine prints an error and returns null), so a mismatch is an error here instead.
## set / set_deferred / set_indexed take the value as a Variant, and a native property given another type stores its
## default, so a property that resolves holds that value to its type, as a write does.
static func call_method(n: Object, method: String, raw_args: Variant) -> Dictionary:
	if n == null or not n.has_method(method):
		return {"ok": false, "error": "%s has no method '%s'" % [n.get_class() if n != null else "the node", method]}
	var prep := prepare_args(n, method, raw_args if raw_args is Array else [])
	if not bool(prep.get("ok", false)):
		return {"ok": false, "error": "%s.%s: %s" % [n.get_class(), method, str(prep.get("error", "argument mismatch"))]}
	var call_args: Array = (prep["args"] as Array).duplicate()
	if method in ["set", "set_deferred", "set_indexed"] and call_args.size() == 2:
		var res := property_owner(n, str(call_args[0]))
		if bool(res.get("ok", false)):
			var fit := coerce_for_write(res, read_at(res), call_args[1])
			if not bool(fit.get("ok", false)):
				return {"ok": false, "error": "%s.%s: arg 1 (value): %s" % [n.get_class(), method, str(fit["error"])]}
			call_args[1] = fit["value"]
	return {"ok": true, "result": n.callv(method, call_args)}


static func prepare_args(obj: Object, method: String, raw_args: Array) -> Dictionary:
	var meta: Dictionary = {}
	for m in obj.get_method_list():
		if str(m.get("name", "")) == method:
			meta = m
			break
	if meta.is_empty():
		return {"ok": true, "args": raw_args}
	var decl: Array = meta.get("args", [])
	var defaults: Array = meta.get("default_args", [])
	var vararg := (int(meta.get("flags", 0)) & METHOD_FLAG_VARARG) != 0
	var required := decl.size() - defaults.size()
	if raw_args.size() < required:
		return {"ok": false, "error": "takes at least %d arg(s), got %d - signature: %s" % [required, raw_args.size(), signature_of(meta)]}
	if not vararg and raw_args.size() > decl.size():
		return {"ok": false, "error": "takes at most %d arg(s), got %d - signature: %s" % [decl.size(), raw_args.size(), signature_of(meta)]}
	var out: Array = []
	for i in range(raw_args.size()):
		if i >= decl.size():
			out.append(raw_args[i])
			continue
		var a: Dictionary = decl[i]
		var want := int(a.get("type", TYPE_NIL))
		var aname := str(a.get("name", "arg%d" % i))
		if want == TYPE_OBJECT:
			var rv: Variant = raw_args[i]
			if rv == null or typeof(rv) == TYPE_OBJECT:
				out.append(rv)
				continue
			if rv is String and obj is Node:
				var o := resolve_node(obj as Node, rv)
				if o != null:
					out.append(o)
					continue
				return {"ok": false, "error": "arg %d (%s): could not resolve '%s' to a live object" % [i, aname, str(rv)]}
			var cls := str(a.get("class_name", ""))
			return {"ok": false, "error": "arg %d (%s): expected %s - pass a node name/path" % [i, aname, "Object" if cls.is_empty() else cls]}
		var r := coerce(raw_args[i], want)
		if not bool(r.get("ok", false)):
			return {"ok": false, "error": "arg %d (%s): %s" % [i, aname, str(r.get("error", "type mismatch"))]}
		out.append(r["value"])
	return {"ok": true, "args": out}


static func signature_of(meta: Dictionary) -> String:
	var parts: Array = []
	for a in meta.get("args", []):
		var t := int((a as Dictionary).get("type", TYPE_NIL))
		var tn := "Variant"
		if t == TYPE_OBJECT:
			tn = str((a as Dictionary).get("class_name", ""))
			if tn.is_empty():
				tn = "Object"
		elif t != TYPE_NIL:
			tn = type_string(t)
		parts.append("%s %s" % [tn, str((a as Dictionary).get("name", "arg"))])
	return "%s(%s)" % [str(meta.get("name", "?")), ", ".join(parts)]


## "" when `spec` is a well-formed inject step body, else what is wrong with it.
static func inject_error(spec: Variant) -> String:
	if not (spec is Dictionary):
		return "inject takes an object: {set: [{node, property, value}], call: [{node, method, args}], frames: N}"
	var sets: Variant = (spec as Dictionary).get("set", [])
	var calls: Variant = (spec as Dictionary).get("call", [])
	if not (sets is Array) or not (calls is Array):
		return "inject: set and call must be arrays"
	if (sets as Array).is_empty() and (calls as Array).is_empty():
		return "inject needs set and/or call (nothing to apply)"
	for i in (sets as Array).size():
		var s: Variant = (sets as Array)[i]
		if not (s is Dictionary) or str((s as Dictionary).get("node", "")).is_empty() or str((s as Dictionary).get("property", "")).is_empty() or not (s as Dictionary).has("value"):
			return "inject set[%d] needs {node, property, value}" % i
	for i in (calls as Array).size():
		var c: Variant = (calls as Array)[i]
		if not (c is Dictionary) or str((c as Dictionary).get("node", "")).is_empty() or str((c as Dictionary).get("method", "")).is_empty():
			return "inject call[%d] needs {node, method, args?}" % i
		if (c as Dictionary).has("args") and not ((c as Dictionary)["args"] is Array):
			return "inject call[%d]: args must be an array" % i
	return ""



## Coerce ONE JSON-decoded value to the Variant type `want`: {ok, value} or {ok: false, error}. The types a game
## property or method argument usually is; anything else is an error that says so.
static func coerce(raw: Variant, want: int) -> Dictionary:
	if want == TYPE_NIL or typeof(raw) == want:
		return {"ok": true, "value": raw}
	match want:
		TYPE_BOOL:
			if raw is int and (raw == 0 or raw == 1):
				return {"ok": true, "value": raw == 1}
			if raw is float and (raw == 0.0 or raw == 1.0):
				return {"ok": true, "value": raw == 1.0}
			if raw is String:
				var s := (raw as String).to_lower()
				if s in ["true", "1", "yes"]:
					return {"ok": true, "value": true}
				if s in ["false", "0", "no"]:
					return {"ok": true, "value": false}
			return coerce_error("expected bool, got %s" % show_value(raw))
		TYPE_INT:
			if raw is float:
				if raw == floor(raw):
					return {"ok": true, "value": int(raw)}
				return coerce_error("expected int, got fractional %s" % str(raw))
			if raw is String and (raw as String).strip_edges().is_valid_int():
				return {"ok": true, "value": (raw as String).strip_edges().to_int()}
			return coerce_error("expected int, got %s" % show_value(raw))
		TYPE_FLOAT:
			if raw is int:
				return {"ok": true, "value": float(raw)}
			if raw is String and (raw as String).strip_edges().is_valid_float():
				return {"ok": true, "value": (raw as String).strip_edges().to_float()}
			return coerce_error("expected float, got %s" % show_value(raw))
		TYPE_STRING:
			if raw is int or raw is float or raw is bool or raw is StringName or raw is NodePath:
				return {"ok": true, "value": str(raw)}
			return coerce_error("expected String, got %s" % show_value(raw))
		TYPE_STRING_NAME:
			if raw is String or raw is NodePath:
				return {"ok": true, "value": StringName(literal_text(str(raw), "&", "StringName"))}
			return coerce_error("expected StringName, got %s" % show_value(raw))
		TYPE_NODE_PATH:
			if raw is String or raw is StringName:
				return {"ok": true, "value": NodePath(literal_text(str(raw), "^", "NodePath"))}
			return coerce_error("expected NodePath, got %s" % show_value(raw))
		TYPE_VECTOR2:
			return coerce_vector(raw, 2, false)
		TYPE_VECTOR2I:
			return coerce_vector(raw, 2, true)
		TYPE_VECTOR3:
			return coerce_vector(raw, 3, false)
		TYPE_VECTOR3I:
			return coerce_vector(raw, 3, true)
		TYPE_VECTOR4:
			return coerce_vector(raw, 4, false)
		TYPE_VECTOR4I:
			return coerce_vector(raw, 4, true)
		TYPE_COLOR:
			return coerce_color(raw)
		TYPE_QUATERNION:
			if raw is Array and (raw as Array).size() == 4 and all_numbers(raw):
				return {"ok": true, "value": Quaternion(raw[0], raw[1], raw[2], raw[3])}
			return coerce_literal(raw, want, 'pass [x,y,z,w] or "Quaternion(...)"')
		TYPE_RECT2, TYPE_RECT2I, TYPE_TRANSFORM2D, TYPE_BASIS, TYPE_TRANSFORM3D, TYPE_PROJECTION, TYPE_AABB, TYPE_PLANE:
			return coerce_matrix(raw, want)
	return coerce_error("expected %s, got %s (the standalone test coerces bool, int, float, String, StringName, NodePath, vectors, Color, Quaternion, Rect2, the transforms, Basis, Projection, AABB and Plane)" % [type_string(want), show_value(raw)])


## How many numbers each part of a matrix-family value holds, in the order a runtime read returns them (CallArgs.MATRIX_PARTS).
const MATRIX_PARTS := {
	TYPE_RECT2: [2, 2], TYPE_RECT2I: [2, 2], TYPE_TRANSFORM2D: [2, 2, 2], TYPE_BASIS: [3, 3, 3],
	TYPE_TRANSFORM3D: [3, 3, 3, 3], TYPE_PROJECTION: [4, 4, 4, 4], TYPE_AABB: [3, 3], TYPE_PLANE: [3, 1],
}


## A matrix-family value from the nested array a runtime read returns ([[x axis], [y axis], [z axis], [origin]] for a
## Transform3D, [[normal], d] for a Plane), the same numbers flat, or its literal: what CallArgs._matrix takes.
static func coerce_matrix(raw: Variant, want: int) -> Dictionary:
	var parts: Array = MATRIX_PARTS[want]
	var count := 0
	for p in parts:
		count += int(p)
	var n: Array = []
	if raw is Array and all_numbers(raw):
		n = raw
	elif raw is Array and (raw as Array).size() == parts.size():
		for i in parts.size():
			var part: Variant = raw[i]
			if int(parts[i]) == 1 and (part is int or part is float):
				n.append(part)
			elif part is Array and (part as Array).size() == int(parts[i]) and all_numbers(part):
				n.append_array(part)
			else:
				n = []
				break
	if n.size() != count:
		return coerce_literal(raw, want, 'pass the nested array a runtime read returns, the same %d numbers flat, or "%s(...)"' % [count, type_string(want)])
	match want:
		TYPE_RECT2:
			return {"ok": true, "value": Rect2(n[0], n[1], n[2], n[3])}
		TYPE_RECT2I:
			return {"ok": true, "value": Rect2i(int(n[0]), int(n[1]), int(n[2]), int(n[3]))}
		TYPE_TRANSFORM2D:
			return {"ok": true, "value": Transform2D(Vector2(n[0], n[1]), Vector2(n[2], n[3]), Vector2(n[4], n[5]))}
		TYPE_BASIS:
			return {"ok": true, "value": Basis(Vector3(n[0], n[1], n[2]), Vector3(n[3], n[4], n[5]), Vector3(n[6], n[7], n[8]))}
		TYPE_TRANSFORM3D:
			return {"ok": true, "value": Transform3D(Basis(Vector3(n[0], n[1], n[2]), Vector3(n[3], n[4], n[5]), Vector3(n[6], n[7], n[8])), Vector3(n[9], n[10], n[11]))}
		TYPE_PROJECTION:
			return {"ok": true, "value": Projection(Vector4(n[0], n[1], n[2], n[3]), Vector4(n[4], n[5], n[6], n[7]), Vector4(n[8], n[9], n[10], n[11]), Vector4(n[12], n[13], n[14], n[15]))}
		TYPE_AABB:
			return {"ok": true, "value": AABB(Vector3(n[0], n[1], n[2]), Vector3(n[3], n[4], n[5]))}
	return {"ok": true, "value": Plane(Vector3(n[0], n[1], n[2]), float(n[3]))}


static func coerce_literal(raw: Variant, want: int, hint: String) -> Dictionary:
	if raw is String:
		var parsed: Variant = plain_literal(raw as String, [type_string(want)])
		if typeof(parsed) == want:
			return {"ok": true, "value": parsed}
	return coerce_error("expected %s, got %s - %s" % [type_string(want), show_value(raw), hint])


## The value of a literal that is ONE constructor named in `names` holding nothing but numbers, read with str_to_var;
## null for any other text. As CallArgs.literal: str_to_var loads whatever a Resource("...") in the text names, from
## any folder.
static func plain_literal(text: String, names: Array) -> Variant:
	var s := text.strip_edges()
	var open := s.find("(")
	if open < 1 or not s.ends_with(")") or not names.has(s.left(open).strip_edges()):
		return null
	for part in s.substr(open + 1, s.length() - open - 2).split(","):
		var p := part.strip_edges()
		if not (p.is_valid_float() or p in ["inf", "-inf", "inf_neg", "nan"]):
			return null
	return str_to_var(s)


## The path or name a NodePath or StringName literal spells (NodePath("a/b"), ^"a/b", &"n", StringName("n"), or the
## text in plain quotes), else `s` as it came. Read by hand, as CallArgs reads it.
static func literal_text(s: String, sigil: String, ctor: String) -> String:
	var t := s.strip_edges()
	if t.begins_with(sigil + "\""):
		t = t.substr(sigil.length())
	elif t.begins_with(ctor + "(") and t.ends_with(")"):
		t = t.substr(ctor.length() + 1, t.length() - ctor.length() - 2).strip_edges()
		if t.is_empty():
			return ""
	if t.length() >= 2 and t.begins_with("\"") and t.ends_with("\""):
		return t.substr(1, t.length() - 2).c_unescape()
	return s


static func all_numbers(arr: Array) -> bool:
	for e in arr:
		if not (e is int or e is float):
			return false
	return true


static func coerce_vector(raw: Variant, dim: int, as_int: bool) -> Dictionary:
	var want_name := "Vector%d%s" % [dim, "i" if as_int else ""]
	var comps: Array = []
	match typeof(raw):
		TYPE_VECTOR2, TYPE_VECTOR2I:
			if dim == 2:
				comps = [float(raw.x), float(raw.y)]
		TYPE_VECTOR3, TYPE_VECTOR3I:
			if dim == 3:
				comps = [float(raw.x), float(raw.y), float(raw.z)]
		TYPE_VECTOR4, TYPE_VECTOR4I:
			if dim == 4:
				comps = [float(raw.x), float(raw.y), float(raw.z), float(raw.w)]
		TYPE_ARRAY:
			if (raw as Array).size() != dim:
				return coerce_error("expected %s: the array needs exactly %d numbers, got %d" % [want_name, dim, (raw as Array).size()])
			for e in raw:
				if not (e is int or e is float):
					return coerce_error("expected %s: array element %s is not a number" % [want_name, show_value(e)])
				comps.append(float(e))
		TYPE_DICTIONARY:
			for k in (["x", "y", "z", "w"].slice(0, dim)):
				var v: Variant = (raw as Dictionary).get(k)
				if not (v is int or v is float):
					return coerce_error('expected %s: the dict needs a numeric "%s"' % [want_name, k])
				comps.append(float(v))
		TYPE_STRING:
			var parsed: Variant = plain_literal(raw as String, ["Vector2", "Vector2i", "Vector3", "Vector3i", "Vector4", "Vector4i"])
			match typeof(parsed):
				TYPE_VECTOR2, TYPE_VECTOR2I, TYPE_VECTOR3, TYPE_VECTOR3I, TYPE_VECTOR4, TYPE_VECTOR4I:
					return coerce_vector(parsed, dim, as_int)
			var parts := components(raw)
			if parts.size() == dim:
				for p in parts:
					if not p.is_valid_float():
						return coerce_error("expected %s: '%s' is not a number" % [want_name, p])
					comps.append(p.to_float())
	if comps.size() != dim:
		return coerce_error('expected %s - pass [x,y,..], {"x":..}, or "x y .."' % want_name)
	if dim == 2:
		if as_int:
			return {"ok": true, "value": Vector2i(int(comps[0]), int(comps[1]))}
		return {"ok": true, "value": Vector2(comps[0], comps[1])}
	if dim == 3:
		if as_int:
			return {"ok": true, "value": Vector3i(int(comps[0]), int(comps[1]), int(comps[2]))}
		return {"ok": true, "value": Vector3(comps[0], comps[1], comps[2])}
	if as_int:
		return {"ok": true, "value": Vector4i(int(comps[0]), int(comps[1]), int(comps[2]), int(comps[3]))}
	return {"ok": true, "value": Vector4(comps[0], comps[1], comps[2], comps[3])}


static func coerce_color(raw: Variant) -> Dictionary:
	match typeof(raw):
		TYPE_COLOR:
			return {"ok": true, "value": raw}
		TYPE_STRING:
			var c: Variant = color_text(raw as String)
			if c is Color:
				return {"ok": true, "value": c}
			return coerce_error('expected Color: "%s" is not a hex value, a color name or 3-4 numbers' % (raw as String).strip_edges())
		TYPE_ARRAY:
			var arr := raw as Array
			var numbers := true
			for e in arr:
				if not (e is int or e is float):
					numbers = false
			if (arr.size() == 3 or arr.size() == 4) and numbers:
				return {"ok": true, "value": Color(arr[0], arr[1], arr[2], arr[3] if arr.size() > 3 else 1.0)}
		TYPE_DICTIONARY:
			var d := raw as Dictionary
			if (d.get("r") is int or d.get("r") is float) and (d.get("g") is int or d.get("g") is float) and (d.get("b") is int or d.get("b") is float):
				return {"ok": true, "value": Color(d.get("r"), d.get("g"), d.get("b"), d.get("a", 1.0))}
	return coerce_error('expected Color - pass "#rrggbb", a color name, or [r,g,b,a]')


## A Color from text, or null when the text is none: a hex code or a name ("#ffd900", "gold", "Color.GOLD"), or three
## or four numbers as GDScript writes them ("Color(1, 0.85, 0)", 'Color("#ffd900")'), as str() prints them
## ("(1, 0.85, 0, 1)") or bare ("0.14 0.16 0.23 1"). Read by hand, not with str_to_var, as CallArgs reads it.
static func color_text(text: String) -> Variant:
	var s := text.strip_edges()
	var none := Color(-9999.0, -9999.0, -9999.0, -9999.0)
	var c := Color.from_string(s.trim_prefix("Color."), none)
	if c != none:
		return c
	var inner := s.trim_prefix("Color").strip_edges()
	if inner.begins_with("(") and inner.ends_with(")"):
		inner = inner.substr(1, inner.length() - 2).strip_edges()
	if inner.length() >= 2 and inner.begins_with("\"") and inner.ends_with("\""):
		c = Color.from_string(inner.substr(1, inner.length() - 2), none)
		if c == none:
			return null
		return c
	var parts := components(inner)
	if parts.size() != 3 and parts.size() != 4:
		return null
	var ch: Array = []
	for p in parts:
		if not p.is_valid_float():
			return null
		ch.append(p.to_float())
	return Color(ch[0], ch[1], ch[2], ch[3] if ch.size() == 4 else 1.0)


## The components of a vector or a color written as text: "1 0 0", "1, 0, 0", or either inside one pair of brackets,
## "(1.0, 0.0, 0.0)" (how str() prints one) or "[1, 0, 0]".
static func components(raw: String) -> PackedStringArray:
	var s := raw.strip_edges()
	if s.length() >= 2 and ((s.begins_with("(") and s.ends_with(")")) or (s.begins_with("[") and s.ends_with("]"))):
		s = s.substr(1, s.length() - 2)
	return s.replace(",", " ").split(" ", false)


static func coerce_error(msg: String) -> Dictionary:
	return {"ok": false, "error": msg}


static func show_value(v: Variant) -> String:
	var s := str(v)
	if s.length() > 48:
		s = s.substr(0, 48) + "..."
	return "%s (%s)" % [s, type_string(typeof(v))]


## A JSON-decoded flag as a bool: the safe spelling of bool(args.get("x", false)). GDScript 4 has no bool(String).
static func to_bool(raw: Variant, default: bool = false) -> bool:
	match typeof(raw):
		TYPE_BOOL:
			return raw
		TYPE_INT, TYPE_FLOAT:
			return raw != 0
		TYPE_STRING, TYPE_STRING_NAME:
			match str(raw).strip_edges().to_lower():
				"true", "1", "yes":
					return true
				"false", "0", "no":
					return false
	return default


static func one_line(s: String, cap: int) -> String:
	var t := s.replace("\r", " ").replace("\n", " ")
	return t if t.length() <= cap else t.substr(0, cap) + "..."



## Recorded events in the order they replay: by frame stamp `f`, and events that share a frame keep the order they were
## recorded in. A recording already is in that order, so it is left alone.
static func events_ordered(events: Array) -> Array:
	var copy: Array = events.duplicate(true)
	var sorted := true
	var prev := -2147483648
	for e in copy:
		var f := int((e as Dictionary).get("f", 0)) if e is Dictionary else 0
		if f < prev:
			sorted = false
			break
		prev = f
	if sorted:
		return copy
	var keyed: Array = []
	for i in copy.size():
		keyed.append([int((copy[i] as Dictionary).get("f", 0)) if copy[i] is Dictionary else 0, i, copy[i]])
	keyed.sort_custom(func(a, b): return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1]))
	var out: Array = []
	for k in keyed:
		out.append(k[2])
	return out


## A wire-format event dictionary as an InputEvent (null for a type it does not know). Godot 4.7 gave synthesized
## keyboard and mouse events a real device id; it is looked up through ClassDB because naming the constant would be
## a parse error on older engines.
static func build_event(e: Dictionary) -> InputEvent:
	var device_keyboard := -1
	var device_mouse := -1
	if ClassDB.class_has_integer_constant("InputEvent", "DEVICE_ID_KEYBOARD"):
		device_keyboard = ClassDB.class_get_integer_constant("InputEvent", "DEVICE_ID_KEYBOARD")
	if ClassDB.class_has_integer_constant("InputEvent", "DEVICE_ID_MOUSE"):
		device_mouse = ClassDB.class_get_integer_constant("InputEvent", "DEVICE_ID_MOUSE")
	match str(e.get("type", "")):
		"key":
			var k := InputEventKey.new()
			var kc: int = OS.find_keycode_from_string(str(e.get("keycode", "")))
			k.keycode = kc as Key
			k.physical_keycode = kc as Key
			k.pressed = to_bool(e.get("pressed"), true)
			var uni: Variant = e.get("unicode", 0)
			if uni is String and (uni as String).length() > 0:
				k.unicode = (uni as String).unicode_at(0)
			else:
				k.unicode = int(uni) if (uni is int or uni is float) else 0
			if device_keyboard >= 0:
				k.device = device_keyboard
			return k
		"action":
			var a := InputEventAction.new()
			a.action = StringName(str(e.get("action", "")))
			a.pressed = to_bool(e.get("pressed"), true)
			a.strength = float(e.get("strength", 1.0)) if a.pressed else 0.0
			return a
		"mouse_button":
			var mb := InputEventMouseButton.new()
			mb.button_index = int(e.get("button", 1)) as MouseButton
			mb.pressed = to_bool(e.get("pressed"), true)
			mb.position = vec2_of(e.get("position", [0, 0]))
			if device_mouse >= 0:
				mb.device = device_mouse
			return mb
		"mouse_motion":
			var mm := InputEventMouseMotion.new()
			mm.position = vec2_of(e.get("position", [0, 0]))
			mm.relative = vec2_of(e.get("relative", [0, 0]))
			if device_mouse >= 0:
				mm.device = device_mouse
			return mm
		"joy_button":
			var jb := InputEventJoypadButton.new()
			jb.button_index = int(e.get("button", 0)) as JoyButton
			jb.pressed = to_bool(e.get("pressed"), true)
			jb.device = int(e.get("device", 0))
			return jb
		"joy_axis":
			var ja := InputEventJoypadMotion.new()
			ja.axis = int(e.get("axis", 0)) as JoyAxis
			ja.axis_value = clampf(float(e.get("value", 0.0)), -1.0, 1.0)
			ja.device = int(e.get("device", 0))
			return ja
		"touch":
			var st := InputEventScreenTouch.new()
			st.index = int(e.get("index", 0))
			st.position = vec2_of(e.get("position", [0, 0]))
			st.pressed = to_bool(e.get("pressed"), true)
			return st
		"touch_drag":
			var sd := InputEventScreenDrag.new()
			sd.index = int(e.get("index", 0))
			sd.position = vec2_of(e.get("position", [0, 0]))
			sd.relative = vec2_of(e.get("relative", [0, 0]))
			return sd
	return null



## Load a suite's invariants: {ok: true, items} (each with its compiled Expression and counters) or {ok: false, error}.
## A rule set that does not load is the suite author's to fix, so nothing is run with a rule silently absent.
static func inv_open(list: Variant) -> Dictionary:
	if list == null:
		return {"ok": true, "items": []}
	if not (list is Array):
		return {"ok": false, "error": "invariants must be an array of {name, expr} objects"}
	var arr: Array = list
	if arr.size() > INV_MAX_ITEMS:
		return {"ok": false, "error": "at most %d invariants per suite (got %d): each one is evaluated on every physics frame, so the list is capped" % [INV_MAX_ITEMS, arr.size()]}
	var items: Array = []
	var seen := {}
	for i in arr.size():
		var e: Variant = arr[i]
		if not (e is Dictionary):
			return {"ok": false, "error": "invariant %d must be an object {name, expr}, got: %s" % [i, str(e).left(60)]}
		var src: Variant = (e as Dictionary).get("expr", null)
		if not (src is String) or (src as String).strip_edges().is_empty():
			return {"ok": false, "error": "invariant %d needs an 'expr' string: a GDScript boolean such as \"get_node('Player').health >= 0\"" % i}
		var text := (src as String).strip_edges()
		if text.length() > INV_MAX_EXPR:
			return {"ok": false, "error": "invariant %d: expr is %d characters, the limit is %d" % [i, text.length(), INV_MAX_EXPR]}
		var nm_raw: Variant = (e as Dictionary).get("name", null)
		var nm := (str(nm_raw).strip_edges() if nm_raw != null else "")
		if nm.is_empty():
			nm = "inv%d" % (i + 1)
		if nm.length() > INV_MAX_NAME:
			return {"ok": false, "error": "invariant %d: name is %d characters, the limit is %d" % [i, nm.length(), INV_MAX_NAME]}
		if seen.has(nm):
			return {"ok": false, "error": "two invariants are named '%s': names identify them in the results, so they must differ" % nm}
		seen[nm] = true
		var unsafe := unsafe_call(text)
		if not unsafe.is_empty():
			return {"ok": false, "error": "invariant '%s': %s" % [nm, unsafe]}
		var ex := Expression.new()
		if ex.parse(text) != OK:
			return {"ok": false, "error": "invariant '%s' does not parse: %s" % [nm, ex.get_error_text()]}
		items.append({"name": nm, "expr": text, "ex": ex, "checked": 0, "violations": 0, "errors": 0, "last_error": "", "first": {}})
	return {"ok": true, "items": items}


## Evaluate every rule once, against `base` (the scene root), for physics frame `frame`.
static func inv_check(items: Array, base: Object, frame: int) -> void:
	for it in items:
		var ex: Expression = it["ex"]
		var v: Variant = ex.execute([], base, false)
		if ex.has_execute_failed():
			it["errors"] = int(it["errors"]) + 1
			if str(it["last_error"]).is_empty():
				it["last_error"] = ex.get_error_text().left(REPORT_CAP)
			continue
		it["checked"] = int(it["checked"]) + 1
		if to_bool(v):
			continue
		it["violations"] = int(it["violations"]) + 1
		if (it["first"] as Dictionary).is_empty():
			var first := {"frame": frame, "reads": reads_of(str(it["expr"]), base)}
			if not (v is bool):
				first["value"] = plain_value(v)
			it["first"] = first


static func inv_results(items: Array) -> Array:
	var out: Array = []
	for it in items:
		out.append(inv_result_of(it))
	return out


static func inv_result_of(it: Dictionary) -> Dictionary:
	var checked := int(it["checked"])
	var violations := int(it["violations"])
	var errors := int(it["errors"])
	var r := {"type": "invariant", "name": str(it["name"]), "checked": checked, "violations": violations}
	if errors > 0:
		r["errors"] = errors
	if violations > 0:
		var first: Dictionary = it["first"]
		r["status"] = "fail"
		r["expr"] = str(it["expr"]).left(REPORT_CAP)
		r["first_violation"] = first
		r["detail"] = "violated at frame %d (%d of %d checked frames): %s" % [int(first.get("frame", 0)), violations, checked, inv_reads_text(first)]
	elif checked == 0:
		r["status"] = "blocked"
		r["expr"] = str(it["expr"]).left(REPORT_CAP)
		r["detail"] = "never evaluated, so nothing was judged: %s" % (with_hint(str(it["last_error"])) if errors > 0 else "no physics frame ran in the window")
	else:
		r["status"] = "pass"
		var d := "held on %d frame(s)" % checked
		if errors > 0:
			d += ", %d frame(s) could not be evaluated (%s)" % [errors, with_hint(str(it["last_error"]))]
		r["detail"] = d
	return r


static func with_hint(err: String) -> String:
	if err.contains("base type Object") or err.contains("instance is null"):
		return err + " - a node it names may be missing: guard it, e.g. get_node_or_null('X') == null or get_node('X').health >= 0"
	return err


static func inv_reads_text(first: Dictionary) -> String:
	var reads: Variant = first.get("reads", {})
	var parts: Array = []
	if reads is Dictionary:
		for k in reads:
			parts.append("%s = %s" % [str(k), str(reads[k])])
	if parts.is_empty():
		return "value %s" % str(first.get("value", false))
	return ", ".join(parts)


## The values an expression read, for a violation report: the operands of its comparisons, evaluated on their own.
## Best effort and called ONCE, at the first violation: an operand that cannot be evaluated is left out. An operand
## is evaluated a SECOND time here, so one that calls something with an effect of its own (a game's method, a draw
## of random numbers) is left out too: only property reads and calls that are safe to repeat are read (is_pure_read).
static func reads_of(src: String, base: Object) -> Dictionary:
	var out := {}
	for operand in operands_of(src):
		if out.size() >= MAX_READS:
			break
		if not is_pure_read(operand):
			continue
		var ex := Expression.new()
		if ex.parse(operand) != OK:
			continue
		var v: Variant = ex.execute([], base, false)
		if ex.has_execute_failed():
			continue
		out[operand.left(REPORT_CAP)] = plain_value(v)
	return out


## Is this operand safe to evaluate again? Property reads are; so are the calls in PURE_CALLS, any name that starts
## with is_ or has_ (a test), and a capitalised name (a constructor). A call to anything else may change the game, or
## answer differently the second time. Text inside a string literal is not code. (Invariants.is_pure_read.)
static func is_pure_read(operand: String) -> bool:
	if _re_call == null:
		_re_call = RegEx.create_from_string("([A-Za-z_][A-Za-z0-9_]*)\\s*\\(")
	for m in _re_call.search_all(without_strings(operand)):
		var fn := m.get_string(1)
		if PURE_CALLS.has(fn) or fn.begins_with("is_") or fn.begins_with("has_") or (fn[0] >= "A" and fn[0] <= "Z"):
			continue
		return false
	return true


## "" when the expression `src` may be evaluated, else why not (as Invariants.unsafe_call).
static func unsafe_call(src: String) -> String:
	if _re_call == null:
		_re_call = RegEx.create_from_string("([A-Za-z_][A-Za-z0-9_]*)\\s*\\(")
	for m in _re_call.search_all(without_strings(src)):
		var fn := m.get_string(1)
		if UNSAFE_CALLS.has(fn):
			return "an expression may not call %s(): %s" % [fn, UNSAFE_CALLS[fn]]
	return ""


## `s` with the inside of every string literal emptied, so a call-shaped text in a string is not mistaken for a call.
static func without_strings(s: String) -> String:
	var out := ""
	var quote := ""
	var i := 0
	while i < s.length():
		var c := s[i]
		if quote != "":
			if c == "\\":
				i += 2
				continue
			if c == quote:
				quote = ""
				out += c
		elif c == "'" or c == "\"":
			quote = c
			out += c
		else:
			out += c
		i += 1
	return out


## The non-literal operands of an expression's comparisons, in source order, de-duplicated.
static func operands_of(src: String, depth: int = 0) -> Array:
	var out: Array = []
	for clause in split_logic(src):
		var c := strip_wrapping(String(clause).strip_edges())
		if c.is_empty():
			continue
		if depth < 4 and c != String(clause).strip_edges() and split_logic(c).size() > 1:
			for o in operands_of(c, depth + 1):
				if not out.has(o):
					out.append(o)
			continue
		var sides := split_comparison(c)
		for side in sides:
			var s := strip_wrapping(String(side).strip_edges())
			if s.is_empty() or is_literal(s) or out.has(s):
				continue
			out.append(s)
	return out


static func split_logic(src: String) -> Array:
	var out: Array = []
	var depth := 0
	var quote := ""
	var start := 0
	var i := 0
	var n := src.length()
	while i < n:
		var c := src[i]
		if quote != "":
			if c == "\\":
				i += 2
				continue
			if c == quote:
				quote = ""
			i += 1
			continue
		if c == "'" or c == "\"":
			quote = c
		elif c == "(" or c == "[" or c == "{":
			depth += 1
		elif c == ")" or c == "]" or c == "}":
			depth -= 1
		elif depth == 0:
			var skip := logic_len(src, i)
			if skip > 0:
				out.append(src.substr(start, i - start))
				i += skip
				start = i
				continue
		i += 1
	out.append(src.substr(start))
	return out


static func logic_len(src: String, i: int) -> int:
	var two := src.substr(i, 2)
	if two == "&&" or two == "||":
		return 2
	for word in ["and", "or"]:
		var w: String = word
		if src.substr(i, w.length()) == w and (i == 0 or not is_ident(src[i - 1])) \
				and (i + w.length() >= src.length() or not is_ident(src[i + w.length()])):
			return w.length()
	return 0


static func split_comparison(clause: String) -> Array:
	var depth := 0
	var quote := ""
	var i := 0
	var n := clause.length()
	while i < n:
		var c := clause[i]
		if quote != "":
			if c == "\\":
				i += 2
				continue
			if c == quote:
				quote = ""
			i += 1
			continue
		if c == "'" or c == "\"":
			quote = c
		elif c == "(" or c == "[" or c == "{":
			depth += 1
		elif c == ")" or c == "]" or c == "}":
			depth -= 1
		elif depth == 0:
			var two := clause.substr(i, 2)
			if two == "==" or two == "!=" or two == "<=" or two == ">=":
				return [clause.substr(0, i), clause.substr(i + 2)]
			if (c == "<" or c == ">") and two != "<<" and two != ">>":
				return [clause.substr(0, i), clause.substr(i + 1)]
		i += 1
	return [clause]


static func strip_wrapping(s: String) -> String:
	var t := s.strip_edges()
	if t.begins_with("!") and not t.begins_with("!="):
		t = t.substr(1).strip_edges()
	elif t.begins_with("not ") or t.begins_with("not("):
		t = t.substr(3).strip_edges()
	while t.length() >= 2 and t.begins_with("(") and t.ends_with(")") and closes_at_end(t):
		t = t.substr(1, t.length() - 2).strip_edges()
	return t


static func closes_at_end(t: String) -> bool:
	var depth := 0
	var quote := ""
	var i := 0
	while i < t.length():
		var c := t[i]
		if quote != "":
			if c == "\\":
				i += 2
				continue
			if c == quote:
				quote = ""
		elif c == "'" or c == "\"":
			quote = c
		elif c == "(":
			depth += 1
		elif c == ")":
			depth -= 1
			if depth == 0:
				return i == t.length() - 1
		i += 1
	return false


static func is_ident(c: String) -> bool:
	return c == "_" or (c >= "a" and c <= "z") or (c >= "A" and c <= "Z") or (c >= "0" and c <= "9")


static func is_literal(s: String) -> bool:
	if s == "true" or s == "false" or s == "null":
		return true
	if s.is_valid_float():
		return true
	if s.length() >= 2 and (s[0] == "'" or s[0] == "\"") and s[s.length() - 1] == s[0]:
		return true
	return false


## A JSON-safe copy of a value for a result: bool/int/finite float/String stay as they are, anything else is its text.
static func plain_value(v: Variant) -> Variant:
	if v is bool or v is int:
		return v
	if v is float:
		return v if (not is_nan(v) and not is_inf(v)) else str(v)
	if v is String:
		return (v as String).left(REPORT_CAP)
	return str(v).left(REPORT_CAP)



static func state_method(node: Object) -> String:
	if node.has_method("_beckett_state"):
		return "_beckett_state"
	if node.has_method("_mcp_state"):
		return "_mcp_state"
	return ""


## "" when `spec` is a well-formed state step body, else what is wrong with it.
static func state_spec_error(spec: Variant) -> String:
	if not (spec is Dictionary):
		return "state takes an object: {node, path, op, value} (ops: %s)" % ", ".join(STATE_OPS)
	var d: Dictionary = spec
	if str(d.get("node", "")).strip_edges().is_empty():
		return "state needs a 'node': the path or name of a node that exposes state"
	if str(d.get("path", "")).strip_edges().is_empty():
		return "state needs a 'path' into the node's state dictionary (dotted: stats.hp, inventory.0)"
	var op := str(d.get("op", "eq")).strip_edges().to_lower()
	if not STATE_OPS.has(op):
		return "state op '%s' is not one of: %s" % [op, ", ".join(STATE_OPS)]
	if op != "exists" and not d.has("value"):
		return "state op %s needs a 'value' to compare with" % op
	return ""


## Judge one state step against a node: {status: pass | fail | blocked, detail, evaluated}.
static func state_evaluate(node: Object, spec: Dictionary) -> Dictionary:
	var op := str(spec.get("op", "eq")).strip_edges().to_lower()
	var path := str(spec.get("path", "")).strip_edges()
	var label := "state %s.%s" % [str(spec.get("node", "")).left(60), path.left(60)]
	if node == null or not is_instance_valid(node):
		return {"status": "blocked", "evaluated": false, "detail": "%s: the node is gone" % label}
	var m := state_method(node)
	if m.is_empty():
		return {"status": "blocked", "evaluated": false, "detail": "%s: the node has no _beckett_state() or _mcp_state(): add `func _beckett_state() -> Dictionary` to its script and put the node in the group \"beckett_state\"" % label}
	var state: Variant = node.call(m)
	if not (state is Dictionary):
		return {"status": "blocked", "evaluated": false, "detail": "%s: %s() returned %s, not a Dictionary (if it raised an error, game_logs has it)" % [label, m, type_string(typeof(state))]}
	var found := state_lookup(state, path)
	if op == "exists":
		var want := to_bool(spec.get("value"), true)
		if bool(found["found"]) == want:
			return {"status": "pass", "evaluated": true, "detail": "%s %s" % [label, "exists" if want else "does not exist"]}
		return {"status": "fail", "evaluated": true, "detail": "%s %s" % [label, "does not exist" if want else "exists"]}
	if not bool(found["found"]):
		return {"status": "fail", "evaluated": true, "detail": "%s: %s" % [label, state_missing_text(found)]}
	var actual: Variant = found["value"]
	var expected: Variant = spec.get("value")
	var cmp := state_compare(op, actual, expected)
	var shown := "%s = %s" % [label, str(actual).left(REPORT_CAP)]
	if str(cmp["error"]) != "":
		return {"status": "fail", "evaluated": true, "detail": "%s: %s" % [shown, str(cmp["error"])]}
	if bool(cmp["holds"]):
		return {"status": "pass", "evaluated": true, "detail": "%s (%s %s)" % [shown, op, str(expected).left(REPORT_CAP)]}
	return {"status": "fail", "evaluated": true, "detail": "%s, wanted %s %s" % [shown, op, str(expected).left(REPORT_CAP)]}


static func state_missing_text(found: Dictionary) -> String:
	var at := str(found.get("at", ""))
	var s := "has no '%s'" % str(found.get("missing", ""))
	if not at.is_empty():
		s += " under '%s'" % at
	var keys: Variant = found.get("keys", [])
	if keys is Array and not (keys as Array).is_empty():
		s += " (it has: %s)" % ", ".join(PackedStringArray(keys)).left(REPORT_CAP)
	return s


## Walk a dotted path through a state value: {found: true, value, at} or {found: false, at, missing, keys}.
static func state_lookup(state: Variant, dotted: String) -> Dictionary:
	var cur: Variant = state
	var at := ""
	for seg in dotted.split(".", false):
		var s := String(seg)
		var nxt := state_child(cur, s)
		if not bool(nxt["found"]):
			var keys: Array = []
			if cur is Dictionary:
				for k in cur:
					keys.append(str(k).left(40))
					if keys.size() >= 12:
						break
			return {"found": false, "at": at, "missing": s, "keys": keys}
		cur = nxt["value"]
		at = s if at.is_empty() else at + "." + s
	return {"found": true, "value": cur, "at": at}


static func state_child(cur: Variant, seg: String) -> Dictionary:
	var t := typeof(cur)
	if t == TYPE_DICTIONARY:
		var d: Dictionary = cur
		if d.has(seg):
			return {"found": true, "value": d[seg]}
		if d.has(StringName(seg)):
			return {"found": true, "value": d[StringName(seg)]}
		if seg.is_valid_int() and d.has(seg.to_int()):
			return {"found": true, "value": d[seg.to_int()]}
	elif t in LIST_TYPES:
		if seg.is_valid_int():
			var n: int = cur.size()
			var i := seg.to_int()
			if i < 0:
				i += n
			if i >= 0 and i < n:
				return {"found": true, "value": cur[i]}
	elif t == TYPE_VECTOR2 or t == TYPE_VECTOR2I:
		if seg in ["x", "y"]:
			return {"found": true, "value": cur[seg]}
	elif t == TYPE_VECTOR3 or t == TYPE_VECTOR3I:
		if seg in ["x", "y", "z"]:
			return {"found": true, "value": cur[seg]}
	elif t == TYPE_VECTOR4 or t == TYPE_VECTOR4I or t == TYPE_QUATERNION:
		if seg in ["x", "y", "z", "w"]:
			return {"found": true, "value": cur[seg]}
	elif t == TYPE_COLOR:
		if seg in ["r", "g", "b", "a"]:
			return {"found": true, "value": cur[seg]}
	elif t == TYPE_RECT2 or t == TYPE_RECT2I:
		if seg in ["position", "size"]:
			return {"found": true, "value": cur[seg]}
	elif t == TYPE_OBJECT and is_instance_valid(cur):
		for p in (cur as Object).get_property_list():
			if str(p.get("name", "")) == seg:
				return {"found": true, "value": (cur as Object).get(seg)}
	return {"found": false}


## {holds, error}: does `actual` satisfy `op expected`? `error` is set when the comparison is not meaningful.
static func state_compare(op: String, actual: Variant, expected: Variant) -> Dictionary:
	match op:
		"eq":
			return {"holds": state_equal(actual, expected), "error": ""}
		"ne":
			return {"holds": not state_equal(actual, expected), "error": ""}
		"lt", "le", "gt", "ge":
			return state_order(op, actual, expected)
		"contains":
			return state_contains(actual, expected)
	return {"holds": false, "error": "unknown op '%s'" % op}


static func state_equal(actual: Variant, expected: Variant) -> bool:
	var ta := typeof(actual)
	var te := typeof(expected)
	var a_num := ta == TYPE_INT or ta == TYPE_FLOAT
	var e_num := te == TYPE_INT or te == TYPE_FLOAT
	if a_num and e_num:
		if ta == TYPE_INT and te == TYPE_INT:
			return actual == expected
		return is_equal_approx(float(actual), float(expected))
	if ta == TYPE_NIL or te == TYPE_NIL:
		return ta == te
	var a_text := ta == TYPE_STRING or ta == TYPE_STRING_NAME
	var e_text := te == TYPE_STRING or te == TYPE_STRING_NAME
	if a_text and e_text:
		return str(actual) == str(expected)
	if ta == TYPE_DICTIONARY and te == TYPE_DICTIONARY:
		if (actual as Dictionary).size() != (expected as Dictionary).size():
			return false
		for k in actual:
			var found := false
			for k2 in expected:
				if str(k2) == str(k):
					found = true
					if not state_equal(actual[k], expected[k2]):
						return false
					break
			if not found:
				return false
		return true
	if ta == TYPE_ARRAY and te == TYPE_ARRAY:
		if (actual as Array).size() != (expected as Array).size():
			return false
		for i in (actual as Array).size():
			if not state_equal(actual[i], expected[i]):
				return false
		return true
	if ta != te:
		var c := coerce(expected, ta)
		if not bool(c.get("ok", false)):
			return false
		return state_equal(actual, c["value"])
	if ta == TYPE_VECTOR2 or ta == TYPE_VECTOR3 or ta == TYPE_VECTOR4 or ta == TYPE_COLOR or ta == TYPE_QUATERNION or ta == TYPE_PLANE:
		return actual.is_equal_approx(expected)
	return actual == expected


static func state_order(op: String, actual: Variant, expected: Variant) -> Dictionary:
	var e: Variant = expected
	var a_num := typeof(actual) == TYPE_INT or typeof(actual) == TYPE_FLOAT
	if a_num and typeof(e) == TYPE_STRING and (e as String).strip_edges().is_valid_float():
		e = (e as String).strip_edges().to_float()
	var e_num := typeof(e) == TYPE_INT or typeof(e) == TYPE_FLOAT
	if a_num and e_num:
		return {"holds": state_order_numbers(op, actual, e), "error": ""}
	var a_text := typeof(actual) == TYPE_STRING or typeof(actual) == TYPE_STRING_NAME
	var e_text := typeof(e) == TYPE_STRING or typeof(e) == TYPE_STRING_NAME
	if a_text and e_text:
		var s := str(actual)
		var t := str(e)
		match op:
			"lt": return {"holds": s < t, "error": ""}
			"le": return {"holds": s <= t, "error": ""}
			"gt": return {"holds": s > t, "error": ""}
		return {"holds": s >= t, "error": ""}
	return {"holds": false, "error": "%s orders two numbers or two strings, but the state is %s and the step wants %s" % [op, type_string(typeof(actual)), type_string(typeof(expected))]}


static func state_order_numbers(op: String, a: Variant, e: Variant) -> bool:
	if typeof(a) == TYPE_INT and typeof(e) == TYPE_INT:
		match op:
			"lt": return a < e
			"le": return a <= e
			"gt": return a > e
		return a >= e
	var x := float(a)
	var y := float(e)
	var same := is_equal_approx(x, y)
	match op:
		"lt": return x < y and not same
		"le": return x < y or same
		"gt": return x > y and not same
	return x > y or same


static func state_contains(actual: Variant, expected: Variant) -> Dictionary:
	var t := typeof(actual)
	if t == TYPE_STRING or t == TYPE_STRING_NAME:
		return {"holds": str(actual).contains(str(expected)), "error": ""}
	if t == TYPE_DICTIONARY:
		for k in actual:
			if str(k) == str(expected):
				return {"holds": true, "error": ""}
		return {"holds": false, "error": ""}
	if t in LIST_TYPES:
		for e in actual:
			if state_equal(e, expected):
				return {"holds": true, "error": ""}
		return {"holds": false, "error": ""}
	return {"holds": false, "error": "contains works on a string, an array or a dictionary, but the state is %s" % type_string(t)}
