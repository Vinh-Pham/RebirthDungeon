extends Node
## Headless playtest runner (v1.8, CI / regression). Plays every res://tests/playtests/*.json,
## replays each DETERMINISTICALLY (frame-anchored input injection), checks its asserts, and quits
## with a NON-ZERO exit code if any suite fails. Run it OUTSIDE the editor, e.g.:
##
##   godot --headless --path <project> res://addons/beckett/runtime/playtest_runner.tscn
##
## node_state / expr / screen_text asserts work headless, and so does no_overlap (v1.16: it asks this process's
## own physics which bodies penetrate each other); screenshot asserts need an RHI, so they
## are SKIPPED (with a note) here rather than failing the suite. Perf asserts (v1.9) follow the
## same honest split: memory_/orphan_ metrics are simulation-side and evaluate everywhere, but
## frame_ms_/fps_/draw_calls_ metrics reflect rendering cost -- meaningless without an RHI -- so
## they are SKIPPED when the runner is headless (run those in-editor via playtest op=run, or run
## this scene windowed). The replay algorithm mirrors mcp_runtime's game-side window; _build_event
## mirrors mcp_runtime._build_event -- kept local so the runner is a self-contained standalone tool
## with no editor/bridge dependency (event construction is duplicated; extend both sides together).
## Perf (1.17) is the editor window's own frame clock, runtime/replay_perf.gd, shared, not mirrored.
##
## Verdicts (v1.16), the same words playtest op=run uses: a suite is `ok` when everything passed,
## FAIL when any assert or invariant was evaluated and was false, BLOCKED when none failed but the run
## could not judge something (the scene would not load, a node an assert reads was missing, an
## expression could not be evaluated): nothing was verified, which is not a pass. Exit code: 1 when any
## suite FAILED, else 2 when any was BLOCKED, else 0. A suite's `invariants` are checked on EVERY
## physics frame of its replay by the same runtime/invariants.gd the in-editor run uses.

const PLAYTEST_DIR := "res://tests/playtests"
const SETTLE_FRAMES := 8
const PathGuard := preload("res://addons/beckett/core/path_guard.gd")
const CallArgs := preload("res://addons/beckett/core/callargs.gd")
const TypedJson := preload("res://addons/beckett/core/typed_json.gd")
const Invariants := preload("res://addons/beckett/runtime/invariants.gd")
const InputCodec := preload("res://addons/beckett/runtime/input_codec.gd")
const Overlap := preload("res://addons/beckett/runtime/physics_overlap.gd")
const ReplayPerf := preload("res://addons/beckett/runtime/replay_perf.gd")

var _inv := Invariants.new()
var _held: Dictionary = {}
var _queue: Array = []
var _qi := -1
var _phase := "idle"
var _doc: Dictionary = {}
var _events: Array = []
var _ei := 0
var _tick := 0
var _end := 0
var _scene: Node = null
var _suites_total := 0
var _suites_passed := 0
var _suites_failed := 0
var _suites_blocked := 0
var _finished := false
var _perf := ReplayPerf.new()


func _ready() -> void:
	print("[playtest] headless runner scanning %s" % PLAYTEST_DIR)
	Engine.max_physics_steps_per_frame = 1
	get_tree().process_frame.connect(_on_idle)
	_queue = _scan()
	_suites_total = _queue.size()
	if _queue.is_empty():
		print("[playtest] no suites found -- nothing to run")
		_finished = true
		get_tree().quit(0)
		return
	print("[playtest] %d suite(s) to run" % _suites_total)
	_advance()


func _scan() -> Array:
	var out: Array = []
	var dir := DirAccess.open(PLAYTEST_DIR)
	if dir == null:
		return out
	var names: Array = []
	dir.list_dir_begin()
	var e := dir.get_next()
	while e != "":
		if not dir.current_is_dir() and e.get_extension() == "json":
			names.append(e)
		e = dir.get_next()
	dir.list_dir_end()
	names.sort()
	for n in names:
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("%s/%s" % [PLAYTEST_DIR, n]))
		if parsed is Dictionary:
			out.append(parsed)
		else:
			print("[playtest] SKIP %s: not valid JSON" % n)
	return out


func _advance() -> void:
	if _scene != null and is_instance_valid(_scene):
		_scene.queue_free()
		_scene = null
	if InputCodec.release_all(_held) > 0:
		Input.flush_buffered_events()
	_qi += 1
	if _qi >= _queue.size():
		_finish()
		return
	_doc = _queue[_qi]
	var doc_steps: Array = _doc.get("steps", []) if _doc.get("steps", []) is Array else []
	if not doc_steps.is_empty():
		print("[playtest] SKIP %s: steps suite (semantic flow) — run in-editor via playtest op=run" % str(_doc.get("name", "?")))
		_suites_total -= 1
		call_deferred("_advance")
		return
	var inv_open: Dictionary = _inv.open(_doc.get("invariants", null))
	if not bool(inv_open.get("ok", false)):
		print("[playtest] FAIL %s: invariants: %s" % [_doc.get("name", "?"), str(inv_open.get("error", ""))])
		_suites_failed += 1
		call_deferred("_advance")
		return
	var scene_path := str(_doc.get("scene", ""))
	var packed: PackedScene = null
	if not scene_path.is_empty() and ResourceLoader.exists(scene_path):
		packed = load(scene_path) as PackedScene
	if packed == null:
		print("[playtest] BLOCKED %s: scene '%s' not found or not a scene" % [_doc.get("name", "?"), scene_path])
		_suites_blocked += 1
		call_deferred("_advance")
		return
	_scene = packed.instantiate()
	if _scene == null:
		print("[playtest] BLOCKED %s: scene '%s' loaded but could not be instantiated" % [_doc.get("name", "?"), scene_path])
		_suites_blocked += 1
		call_deferred("_advance")
		return
	add_child(_scene)
	var evs: Array = _doc.get("events", []) if _doc.get("events", []) is Array else []
	evs = evs.duplicate()
	evs.sort_custom(func(a, b): return int(a.get("f", 0)) < int(b.get("f", 0)))
	_events = evs
	_ei = 0
	_tick = 0
	var last_f := 0
	if evs.size() > 0:
		last_f = int(evs[-1].get("f", 0))
	_end = last_f + SETTLE_FRAMES
	_perf.begin()
	_phase = "replay"


## The replay window's frame clock (1.17): one fixed point per process frame, a no-op outside a window.
func _process(_delta: float) -> void:
	_perf.frame(Time.get_ticks_usec())


func _physics_process(_delta: float) -> void:
	if _phase != "replay":
		return
	if _scene == null or not is_instance_valid(_scene):
		_scene_gone()
		return
	if _inv.active:
		_inv.check(_scene, _tick)
	_tick += 1
	if _ei >= _events.size() and _tick > _end:
		_phase = "assert"
		_perf.end()
		_run_asserts()
		call_deferred("_advance")


## The idle part after a replay frame (SceneTree.process_frame, before every _process): the events stamped with the frame
## that just ran go in now, outside physics, so an event stamped f acts from frame f+1 for _input, polled state and
## is_action_just_pressed alike, as in the editor's replay. Input.parse_input_event only BUFFERS an event, and the engine
## would deliver it at the end of the next engine iteration, so the buffer is flushed by hand. Before 1.17 the runner
## flushed at the start of its own _physics_process, after the nodes that run before it in that frame.
func _on_idle() -> void:
	if _phase != "replay":
		return
	var sent := false
	while _ei < _events.size():
		var ev: Dictionary = _events[_ei]
		if int(ev.get("f", 0)) >= _tick:
			break
		var ie := _build_event(ev)
		if ie != null:
			ie = _to_window(ie)
			Input.parse_input_event(ie)
			InputCodec.track(_held, ie)
			sent = true
		_ei += 1
	if sent:
		Input.flush_buffered_events()


## A recorded position is in the root's GUI space (the recorder sees events after the root made them local), and
## Input.parse_input_event takes window pixels: carry it there, as the editor's replay does (mcp_runtime._inject,
## drive_aim.gd's gui_to_window), so a click lands where it was recorded under any content scale, the headless root's
## too. Kept local, like _build_event: the unit suite runs this runner in scratch projects that carry only its preloads.
func _to_window(ie: InputEvent) -> InputEvent:
	if not (ie is InputEventMouse or ie is InputEventScreenTouch or ie is InputEventScreenDrag):
		return ie
	var out: InputEvent = ie.xformed_by(get_tree().root.get_final_transform())
	if out is InputEventMouse:
		(out as InputEventMouse).global_position = (out as InputEventMouse).position
	return out


func _run_asserts() -> void:
	var nm := str(_doc.get("name", "?"))
	var asserts: Array = _doc.get("asserts", []) if _doc.get("asserts", []) is Array else []
	var p := 0
	var f := 0
	var b := 0
	var details: Array = []
	var items: Array = []
	for r in _inv.results():
		items.append({"status": str(r.get("status", "")), "detail": "invariant %s: %s" % [str(r.get("name", "")), str(r.get("detail", ""))]})
	for a in asserts:
		if a is Dictionary:
			items.append(_eval_assert(a))
	for r in items:
		details.append("      [%s] %s" % [str(r.get("status", "?")), str(r.get("detail", ""))])
		match str(r.get("status", "")):
			"pass": p += 1
			"fail": f += 1
			"blocked": b += 1
	if f > 0:
		_suites_failed += 1
	elif b > 0:
		_suites_blocked += 1
	else:
		_suites_passed += 1
	print("[playtest] %s %s  (%d/%d asserts passed%s)" % [("FAIL" if f > 0 else ("BLOCKED" if b > 0 else "ok  ")), nm, p, p + f + b, (", %d blocked" % b) if b > 0 else ""])
	var perf := _perf_summary()
	if not perf.is_empty():
		print("      perf: frames=%d frame_ms avg=%.2f p95=%.2f max=%.2f | mem_delta=%d orphan_delta=%d%s" % [
			int(perf.get("frames", 0)), float(perf.get("frame_ms_avg", 0.0)), float(perf.get("frame_ms_p95", 0.0)),
			float(perf.get("frame_ms_max", 0.0)), int(perf.get("memory_delta", 0)), int(perf.get("orphan_delta", 0)),
			" (headless: frame/fps figures are render-less)" if _is_headless() else ""])
	for d in details:
		print(d)


func _eval_assert(a: Dictionary) -> Dictionary:
	match str(a.get("type", "")).to_lower():
		"node_state":
			var n := _scene.get_node_or_null(NodePath(str(a.get("target", ""))))
			if n == null:
				return {"status": "blocked", "detail": "node_state: node not found '%s'" % str(a.get("target", ""))}
			var actual: Variant = n.get(str(a.get("property", "")))
			if _values_equal(actual, a.get("equals")):
				return {"status": "pass", "detail": "node_state %s.%s == %s" % [str(a.get("target", "")), str(a.get("property", "")), str(a.get("equals"))]}
			return {"status": "fail", "detail": "node_state %s.%s = %s (want %s)" % [str(a.get("target", "")), str(a.get("property", "")), str(TypedJson.render(actual)), str(a.get("equals"))]}
		"expr":
			var unsafe := Invariants.unsafe_call(str(a.get("condition", "")))
			if not unsafe.is_empty():
				return {"status": "fail", "detail": "expr refused: %s" % unsafe}
			var ex := Expression.new()
			if ex.parse(str(a.get("condition", ""))) != OK:
				return {"status": "fail", "detail": "expr parse: %s" % ex.get_error_text()}
			var v: Variant = ex.execute([], _scene, true)
			if ex.has_execute_failed():
				return {"status": "blocked", "detail": "expr exec: %s" % ex.get_error_text()}
			if CallArgs.to_bool(v):
				return {"status": "pass", "detail": "expr %s -> true" % str(a.get("condition", ""))}
			return {"status": "fail", "detail": "expr %s -> %s" % [str(a.get("condition", "")), str(TypedJson.render(v))]}
		"screen_text":
			if _find_text(_scene, str(a.get("text", ""))):
				return {"status": "pass", "detail": "screen_text found '%s'" % str(a.get("text", ""))}
			return {"status": "fail", "detail": "screen_text '%s' not found" % str(a.get("text", ""))}
		"screenshot":
			return _eval_screenshot(a)
		"perf":
			return _eval_perf_assert(a)
		"no_overlap":
			var judged := Overlap.judge(Overlap.run(_scene.get_tree() if _scene != null else null, _scene, a))
			return {"status": str(judged["status"]), "detail": str(judged["detail"])}
		_:
			return {"status": "skip", "detail": "unknown assert type '%s'" % str(a.get("type", ""))}


## Screenshot assert, mirroring playtest_tools._eval_screenshot (extend BOTH). This used to
## skip unconditionally with "headless: no RHI" — true in CI, a lie whenever the runner is
## driven windowed, where it silently passed a suite that never compared anything. Ask the
## DisplayServer instead of assuming.
func _eval_screenshot(a: Dictionary) -> Dictionary:
	var baseline := str(a.get("baseline", ""))
	var perr: String = PathGuard.write_path_error(baseline)
	if not perr.is_empty():
		return {"status": "skip", "detail": "screenshot: baseline %s (got '%s'); nothing was written" % [perr, baseline.c_escape()]}
	if DisplayServer.get_name() == "headless":
		return {"status": "skip", "detail": "screenshot skipped (headless: there is no RHI to capture)"}
	var vp: Viewport = _scene.get_viewport() if _scene != null else null
	var tex: ViewportTexture = vp.get_texture() if vp != null else null
	var cur: Image = tex.get_image() if tex != null else null
	if cur == null:
		return {"status": "skip", "detail": "screenshot: could not read the viewport"}
	if not FileAccess.file_exists(baseline):
		DirAccess.make_dir_recursive_absolute(baseline.get_base_dir())
		cur.save_png(baseline)
		return {"status": "skip", "detail": "screenshot: baseline saved (first run): %s" % baseline}
	var base := Image.new()
	if base.load(baseline) != OK:
		return {"status": "skip", "detail": "screenshot: could not load baseline %s" % baseline}
	if cur.get_width() != base.get_width() or cur.get_height() != base.get_height():
		cur.resize(base.get_width(), base.get_height(), Image.INTERPOLATE_BILINEAR)
	cur.convert(Image.FORMAT_RGBA8)
	base.convert(Image.FORMAT_RGBA8)
	if not base.has_method("compute_image_metrics"):
		return {"status": "skip", "detail": "screenshot: this Godot has no Image.compute_image_metrics"}
	var m: Dictionary = base.call("compute_image_metrics", cur, false)
	var snr := float(m.get("peak_snr", 0.0))
	var want := float(a.get("min_peak_snr", 30.0))
	if snr >= want:
		return {"status": "pass", "detail": "screenshot peak_snr %.2f dB >= %.2f" % [snr, want]}
	var saved := _save_actual(cur, baseline)
	return {"status": "fail", "detail": "screenshot peak_snr %.2f dB < %.2f | baseline: %s | %s" % [snr, want, baseline, ("actual: " + str(saved["actual"])) if saved.has("actual") else str(saved["why"])]}


## Save the frame a failed screenshot assert saw next to its baseline: {actual: path}, or {why} when the write
## rule refuses the name (the derived <baseline>.actual.png can be a link out of the project even when the baseline
## is not). Mirrors playtest_tools._save_actual (extend BOTH).
func _save_actual(cur: Image, baseline: String) -> Dictionary:
	var actual := baseline.get_basename() + ".actual.png"
	var perr: String = PathGuard.write_path_error(actual)
	if not perr.is_empty():
		return {"why": "the actual frame was not written (%s %s)" % [actual.c_escape().left(160), perr]}
	cur.save_png(actual)
	return {"actual": actual}


## Perf assert: {type:"perf", metric:<flat key>, max:<num>[, min:<num>]}. Metrics come from
## _perf_summary(). Rendering-cost metrics (frame_ms_*/fps_*/draw_calls_*) are skipped when
## headless -- a render-less loop's frame numbers would vacuously pass and teach nothing.
func _eval_perf_assert(a: Dictionary) -> Dictionary:
	var metric := str(a.get("metric", ""))
	if _is_headless() and (metric.begins_with("frame_ms") or metric.begins_with("fps") or metric.begins_with("draw_calls")):
		return {"status": "skip", "detail": "perf %s skipped (headless: no RHI, rendering cost not measured) -- run in-editor via playtest op=run" % metric}
	var perf := _perf_summary()
	if not perf.has(metric):
		return {"status": "fail", "detail": "perf: unknown metric '%s' (have: %s)" % [metric, ", ".join(PackedStringArray(perf.keys()))]}
	if not (a.has("max") or a.has("min")):
		return {"status": "fail", "detail": "perf %s: assert needs 'max' and/or 'min'" % metric}
	var value := float(perf[metric])
	if a.has("max") and value > float(a.get("max")):
		return {"status": "fail", "detail": "perf %s = %.2f > max %.2f" % [metric, value, float(a.get("max"))]}
	if a.has("min") and value < float(a.get("min")):
		return {"status": "fail", "detail": "perf %s = %.2f < min %.2f" % [metric, value, float(a.get("min"))]}
	var bound := ("max %.2f" % float(a.get("max"))) if a.has("max") else ("min %.2f" % float(a.get("min")))
	return {"status": "pass", "detail": "perf %s = %.2f within %s" % [metric, value, bound]}


func _is_headless() -> bool:
	return DisplayServer.get_name() == "headless"


## Flat perf summary of the replay just run ({} if no frame was timed): the editor-side capture's own
## summary, so suites assert one metric name everywhere: frames, frame_ms_min/avg/p95/max,
## fps_min/avg, memory_static_end, memory_delta, orphan_delta, draw_calls_end.
func _perf_summary() -> Dictionary:
	return _perf.summary()


func _find_text(node: Node, needle: String) -> bool:
	if needle == "":
		return false
	var t: Variant = node.get("text")
	if t is String and (t as String).findn(needle) != -1:
		return true
	for c in node.get_children():
		if _find_text(c, needle):
			return true
	return false


func _finish() -> void:
	_finished = true
	var passed := _suites_total - _suites_failed - _suites_blocked
	var tail := ""
	if _suites_failed > 0 or _suites_blocked > 0:
		tail = " (%d failed, %d blocked)" % [_suites_failed, _suites_blocked]
	print("[playtest] === %d/%d suites passed%s ===" % [passed, _suites_total, tail])
	get_tree().quit(_exit_code())


## 1 when any suite FAILED, else 2 when any was BLOCKED (nothing failed, but something was not verified),
## else 0. A CI that only checks "non-zero" treats both as red; one that cares can tell them apart.
func _exit_code() -> int:
	return 1 if _suites_failed > 0 else (2 if _suites_blocked > 0 else 0)


## The suite's scene was freed under its own replay: nothing it asserts can be read any more. The suite is
## BLOCKED (never a pass, never a failed assert), and the run goes on with the next one.
func _scene_gone() -> void:
	_phase = "assert"
	_perf.end()
	_scene = null
	print("[playtest] BLOCKED %s  (the scene was freed during the replay, by queue_free() or a scene change: nothing could be judged)" % str(_doc.get("name", "?")))
	_suites_blocked += 1
	call_deferred("_advance")


## The runner left the tree before it said how the run ended: a game called get_tree().quit() mid-replay, or its code
## changed the scene, which frees the scene the runner itself runs as (change_scene_to_file replaces the current scene).
## Either way no more suite will be judged, and in the second nothing would ever end the process. That is blocked,
## said in words and in the exit code, and never a silent 0.
func _exit_tree() -> void:
	if _finished:
		return
	_finished = true
	if _phase == "replay" and _inv.active:
		var broken := false
		for r in _inv.results():
			if str((r as Dictionary).get("status", "")) == "fail":
				print("      [fail] invariant %s: %s" % [str((r as Dictionary).get("name", "")), str((r as Dictionary).get("detail", ""))])
				broken = true
		if broken:
			_suites_failed += 1
	var unjudged := maxi(0, _suites_total - _suites_passed - _suites_failed - _suites_blocked)
	print("[playtest] BLOCKED: the run ended early (the game called get_tree().quit(), or changed the scene the runner runs as); %d of %d suite(s) were not judged" % [unjudged, _suites_total])
	print("[playtest] === %d/%d suites passed (%d failed, %d blocked, %d not judged) ===" % [_suites_passed, _suites_total, _suites_failed, _suites_blocked, unjudged])
	var tree := get_tree()
	if tree != null:
		tree.quit(1 if _suites_failed > 0 else 2)


func _build_event(e: Dictionary) -> InputEvent:
	match str(e.get("type", "")):
		"key":
			var k := InputEventKey.new()
			var kc: int = OS.find_keycode_from_string(str(e.get("keycode", "")))
			k.keycode = kc
			k.physical_keycode = kc
			k.pressed = CallArgs.flag(e, "pressed", true)
			var uni: Variant = e.get("unicode", 0)
			if uni is String and (uni as String).length() > 0:
				k.unicode = (uni as String).unicode_at(0)
			else:
				k.unicode = int(uni) if (uni is int or uni is float) else 0
			return k
		"action":
			var a := InputEventAction.new()
			a.action = StringName(str(e.get("action", "")))
			a.pressed = CallArgs.flag(e, "pressed", true)
			a.strength = float(e.get("strength", 1.0)) if a.pressed else 0.0
			return a
		"mouse_button":
			var mb := InputEventMouseButton.new()
			mb.button_index = int(e.get("button", 1))
			mb.pressed = CallArgs.flag(e, "pressed", true)
			mb.position = _vec2(e.get("position", [0, 0]))
			return mb
		"mouse_motion":
			var mm := InputEventMouseMotion.new()
			mm.position = _vec2(e.get("position", [0, 0]))
			mm.relative = _vec2(e.get("relative", [0, 0]))
			return mm
		"joy_button":
			var jb := InputEventJoypadButton.new()
			jb.button_index = int(e.get("button", 0))
			jb.pressed = CallArgs.flag(e, "pressed", true)
			jb.device = int(e.get("device", 0))
			return jb
		"joy_axis":
			var ja := InputEventJoypadMotion.new()
			ja.axis = int(e.get("axis", 0))
			ja.axis_value = clampf(float(e.get("value", 0.0)), -1.0, 1.0)
			ja.device = int(e.get("device", 0))
			return ja
		"touch":
			var st := InputEventScreenTouch.new()
			st.index = int(e.get("index", 0))
			st.position = _vec2(e.get("position", [0, 0]))
			st.pressed = CallArgs.flag(e, "pressed", true)
			return st
		"touch_drag":
			var sd := InputEventScreenDrag.new()
			sd.index = int(e.get("index", 0))
			sd.position = _vec2(e.get("position", [0, 0]))
			sd.relative = _vec2(e.get("relative", [0, 0]))
			return sd
		_:
			return null


func _vec2(v: Variant) -> Vector2:
	if v is Array and (v as Array).size() >= 2:
		return Vector2(v[0], v[1])
	if v is Dictionary:
		return Vector2(v.get("x", 0), v.get("y", 0))
	return Vector2.ZERO


## Does a node_state assert hold? TypedJson.same, the rule the editor's run judges by (1.17): the live value here and the
## value the editor reads off the game get the same verdict, a number matches its JSON float (1 is 1.0), and a vector
## matches [0, 6, 11], "0 6 11" or the "(0.0, 6.0, 11.0)" a suite saved before 1.17 holds.
func _values_equal(actual: Variant, expected: Variant) -> bool:
	return TypedJson.same(actual, expected)
