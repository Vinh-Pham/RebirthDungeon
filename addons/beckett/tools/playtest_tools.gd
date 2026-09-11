@tool
extends RefCounted
class_name BeckettPlaytestTools

## Playtest suites (L5, Full): turn a recorded input run + asserts into a durable, rerunnable
## regression asset. `playtest op=save` writes res://tests/playtests/<name>.json; `op=run`
## replays it DETERMINISTICALLY (frame-stepped, game-side replay window) into the live game and
## evaluates its asserts; `op=list`/`op=show` inspect saved playtests.
##
## The run assumes the game is ALREADY playing and connected (play_scene -> wait_until
## game_connected first): a handler can't launch the game and wait for the runtime bridge in
## one synchronous call — that starves the main-thread frames the launch needs, the same reason
## wait_until yields (see run_tools.gd). Replay + asserts against a *connected* game are plain
## bridge round-trips, so they fit one handler.
##
## Full-only: pack.ps1 trims this module from the free Lite build (in $liteTrimModules), and
## `playtest` is in $premiumToolNames so the leak gate catches a stray registration. Classified
## L5 in effort.gd _DELTA.

const PLAYTEST_DIR := "res://tests/playtests"
const SCHEMA_VERSION := 1
const MCPJobsScript := preload("res://addons/beckett/core/jobs.gd")
const CapturesScript := preload("res://addons/beckett/core/captures.gd")

var server


func _register(registry) -> void:
	registry.register({
		"name": "playtest",
		"description": "Save and rerun PLAYTESTS — a recorded input run plus asserts, persisted under res://tests/playtests/ and replayable as a regression test. ops: save | run | list | show. A deterministic run frame-steps the replay, MEASURES perf, checks typed asserts, and leaves the game FROZEN for stable reads (time_control op=unfreeze to resume). report=true also writes a bug report. Assert grammar, perf metrics and the baseline loop: help(tool=\"playtest\").",
		"help": "ops\n  save {name, scene, events|steps, asserts}   writes the suite file\n  run  {name, deterministic=true, settle_frames=4, save_baseline=false, report=false}\n       replays it into the RUNNING game and checks the asserts. play_scene -> wait_until game_connected FIRST.\n  list                                        enumerates saved playtests\n  show {name}                                 dumps one\n\nReplay modes: a DETERMINISTIC run frame-steps a game-side window and needs events recorded by Beckett 1.8+ (they carry a frame stamp 'f'). Older or hand-authored events fall back to back-to-back replay, and the result says which one ran.\n\nAssert types:\n  {type:node_state, target, property, equals}\n  {type:screen_text, text}\n  {type:expr, condition:\"get_node('Player').position.y < 500\"}\n  {type:screenshot, baseline:\"res://...png\", min_peak_snr:30}   RHI-only; skipped with a warning when headless\n  {type:perf, metric, max|min}                                   1.9+\nThe screenshot assert saves its baseline on the first run, then compares with Image.compute_image_metrics peak_snr (dB, higher = more alike; identical frames read 1e10). On failure it writes <baseline>.actual.png and returns both paths plus the numbers.\n\nPERF: a deterministic run measures the window from Performance monitors (never modeled) and returns flat stats as result.perf — frames, frame_ms_min/avg/p95/max, fps_min/avg, memory_static_end, memory_delta, orphan_delta, draw_calls_end. A perf assert bounds any of them: {type:perf, metric:\"frame_ms_p95\", max:16.7} is a 60 fps frame budget. Frame / fps / draw metrics skip when the game is headless.\n\nThe optimize loop: save_baseline=true stamps this run's stats into the suite; every later run returns result.perf_diff with per-metric baseline / current / delta / delta_pct. Baseline, change the code, rerun, read the diff.\n\nreport=true (1.14) adds result.report — verdict, the failing asserts with expected vs actual, the repro (scene, mode, how to rerun), the engine errors captured during the run, the perf delta, and on FAILURE a capture of the frozen frame delivered as a capture:// link. It is also written to res://tests/playtests/<name>.report.json. See the qa-report skill.\n\nFor CI, use the headless runner (see the playtest skill): it plays every suite and exits non-zero on failure.",
		"input_schema": {"type": "object", "properties": {
			"op": {"type": "string", "description": "save | run | list | show"},
			"name": {"type": "string", "description": "playtest name (file stem under res://tests/playtests/)"},
			"scene": {"type": "string", "description": "op=save: the res:// scene the playtest plays (used by the headless runner)"},
			"events": {"type": "array", "description": "op=save: events from record_input action=stop — frame-exact replay + perf capture"},
			"steps": {"type": "array", "description": "op=save, instead of events: a semantic ui_do flow; no perf capture, in-editor only (see help)"},
			"step_timeout_ms": {"type": "integer", "description": "op=save with steps: per-step auto-wait budget stored in the suite (default 5000)"},
			"asserts": {"type": "array", "description": "op=save: typed asserts — node_state | screen_text | expr | perf | screenshot (grammar in help)"},
			"deterministic": {"type": "boolean", "description": "op=run: frame-stepped deterministic replay (default true); false = back-to-back"},
			"settle_frames": {"type": "integer", "description": "op=run: extra physics frames to advance after the last event before asserting (default 4)"},
			"save_baseline": {"type": "boolean", "description": "op=run: stamp this run's perf stats as the baseline later runs diff against (default false)"},
			"report": {"type": "boolean", "description": "op=run: also build the structured bug report (default false; see help)"},
		}, "required": ["op"]},
		"handler": Callable(self, "_playtest"),
	})


func _playtest(args: Dictionary) -> Dictionary:
	match str(args.get("op", "")).to_lower():
		"save": return _save(args)
		"run": return _run(args)
		"list": return _list()
		"show": return _show(args)
		_: return {"error": "unknown op '%s' — use save | run | list | show" % str(args.get("op", ""))}



func _save(args: Dictionary) -> Dictionary:
	var pname := _sanitize(str(args.get("name", "")))
	if pname.is_empty():
		return {"error": "op=save needs a 'name'"}
	var events: Variant = args.get("events", [])
	if not (events is Array):
		events = []
	var steps: Variant = args.get("steps", [])
	if not (steps is Array):
		steps = []
	if (events as Array).is_empty() and (steps as Array).is_empty():
		return {"error": "op=save needs 'events' (from record_input action=stop) OR 'steps' (a ui_do flow: click/type/wait/assert/input objects)"}
	if not (events as Array).is_empty() and not (steps as Array).is_empty():
		return {"error": "a suite is events OR steps, not both — save them as two suites"}
	var asserts: Variant = args.get("asserts", [])
	if not (asserts is Array):
		asserts = []
	var doc := {
		"schema_version": SCHEMA_VERSION,
		"name": pname,
		"scene": str(args.get("scene", "")),
		"created": Time.get_datetime_string_from_system(false, true),
		"engine": String(Engine.get_version_info().get("string", "")),
		"beckett": _beckett_version(),
		"asserts": asserts,
	}
	if not (steps as Array).is_empty():
		doc["steps"] = steps
		if args.has("step_timeout_ms"):
			doc["step_timeout_ms"] = int(args.get("step_timeout_ms", 5000))
	else:
		doc["events"] = events
	var werr := _store(pname, doc)
	if werr != "":
		return {"error": werr}
	var what := ("%d steps" % (steps as Array).size()) if not (steps as Array).is_empty() else ("%d events" % (events as Array).size())
	return {"text": "saved playtest '%s' -> %s/%s.json (%s, %d asserts)" % [pname, PLAYTEST_DIR, pname, what, (asserts as Array).size()]}


## Write a playtest doc to its file under PLAYTEST_DIR; "" on success, else the error text.
## Shared by op=save and the run-time baseline update (save_baseline).
func _store(pname: String, doc: Dictionary) -> String:
	if not DirAccess.dir_exists_absolute(PLAYTEST_DIR):
		DirAccess.make_dir_recursive_absolute(PLAYTEST_DIR)
	var path := "%s/%s.json" % [PLAYTEST_DIR, pname]
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return "could not write %s (%s)" % [path, error_string(FileAccess.get_open_error())]
	f.store_string(JSON.stringify(doc, "\t"))
	f.close()
	return ""



func _run(args: Dictionary) -> Dictionary:
	if server.bridge == null or not server.bridge.is_game_connected():
		return {"error": "game not running/connected — play_scene, then wait_until condition=game_connected, then playtest op=run"}
	var pname := _sanitize(str(args.get("name", "")))
	var doc := _load(pname)
	if doc.has("error"):
		return doc
	var events: Array = doc.get("events", []) if doc.get("events", []) is Array else []
	var asserts: Array = doc.get("asserts", []) if doc.get("asserts", []) is Array else []
	var suite_steps: Array = doc.get("steps", []) if doc.get("steps", []) is Array else []
	if not suite_steps.is_empty():
		return _run_steps(pname, doc, suite_steps, asserts, bool(args.get("report", false)))
	var want_det := bool(args.get("deterministic", true))
	var has_frames := _events_have_frames(events)
	var deterministic := want_det and has_frames

	var replay: Dictionary
	if deterministic:
		replay = _replay_window(events, maxi(0, int(args.get("settle_frames", 4))))
	else:
		replay = _replay_plain(events)
	if replay.has("error"):
		return replay
	var perf: Dictionary = replay.get("perf", {}) if replay.get("perf", {}) is Dictionary else {}
	replay.erase("perf")

	var game_headless := false
	if not perf.is_empty() and _has_perf_assert(asserts):
		var hr := _bridge({"cmd": "eval", "expr": "DisplayServer.get_name()"})
		game_headless = bool(hr.get("ok", false)) and str(hr.get("value", "")) == "headless"

	var results: Array = []
	var passed := 0
	var failed := 0
	var skipped := 0
	for a in asserts:
		if not (a is Dictionary):
			continue
		var res := _eval_assert(a, perf, game_headless)
		results.append(res)
		match str(res.get("status", "")):
			"pass": passed += 1
			"fail": failed += 1
			_: skipped += 1

	var out := {
		"name": pname,
		"ok": failed == 0,
		"passed": passed,
		"failed": failed,
		"skipped": skipped,
		"deterministic": deterministic,
		"replay": replay,
		"asserts": results,
		"note": "game left FROZEN for stable asserts — time_control op=unfreeze to resume" + ("" if deterministic else " (non-deterministic: events had no frame stamp 'f'; re-record on 1.8+ for frame-exact replay)"),
	}
	if not perf.is_empty():
		out["perf"] = perf
		var base_wrap: Dictionary = doc.get("perf_baseline", {}) if doc.get("perf_baseline", {}) is Dictionary else {}
		var base: Dictionary = base_wrap.get("stats", {}) if base_wrap.get("stats", {}) is Dictionary else {}
		if not base.is_empty():
			out["perf_diff"] = _perf_diff(base, perf)
			out["perf_baseline_captured"] = str(base_wrap.get("captured", ""))
		if bool(args.get("save_baseline", false)):
			doc["perf_baseline"] = {
				"captured": Time.get_datetime_string_from_system(false, true),
				"engine": String(Engine.get_version_info().get("string", "")),
				"stats": perf,
			}
			var werr := _store(pname, doc)
			out["baseline"] = ("update failed: " + werr) if werr != "" else "saved — future runs report perf_diff vs this run"
	elif bool(args.get("save_baseline", false)):
		out["baseline"] = "not saved — no perf capture (only the deterministic replay window measures; needs events with frame stamps and deterministic=true)"
	if not bool(args.get("report", false)):
		return {"json": out}
	return _with_report(pname, doc, out, {
		"mode": "deterministic" if deterministic else "plain",
		"settle_frames": maxi(0, int(args.get("settle_frames", 4))),
		"events": events.size(),
	})


## v1.14 bug report: turn a run result into ONE artifact a human (or an issue tracker) can
## act on without replaying the session — the failing asserts with expected vs actual, how to
## reproduce, what the engine complained about, what perf did, and, only when the run FAILED,
## a picture of the frozen frame delivered as a capture:// link rather than inline base64.
##
## Attaches the report to the run result, writes it beside the suite, and returns the handler
## dict (so the caller just `return`s it). A failure anywhere in here degrades to "the run
## result without that section" — a report is a convenience, and it must never be the reason
## a green run reads as broken.
func _with_report(pname: String, doc: Dictionary, run: Dictionary, repro_extra: Dictionary) -> Dictionary:
	var ok := bool(run.get("ok", false))
	var failures: Array = []
	for a in run.get("asserts", []):
		if a is Dictionary and str((a as Dictionary).get("status", "")) == "fail":
			failures.append(a)
	for s in run.get("step_results", []):
		if s is Dictionary and not bool((s as Dictionary).get("ok", true)):
			failures.append(s)
	var rep := {
		"verdict": "pass" if ok else "fail",
		"suite": pname,
		"when": Time.get_datetime_string_from_system(false, true),
		"engine": String(Engine.get_version_info().get("string", "")),
		"beckett": _beckett_version(),
		"totals": {
			"passed": int(run.get("passed", 0)),
			"failed": int(run.get("failed", 0)),
			"skipped": int(run.get("skipped", 0)),
		},
		"failures": failures,
		"repro": _repro(pname, doc, repro_extra),
	}
	var errors := _game_errors()
	if not errors.is_empty():
		rep["errors"] = errors
	if run.has("perf"):
		rep["perf"] = run["perf"]
	if run.has("perf_diff"):
		rep["perf_delta"] = run["perf_diff"]
	var out := {"json": run}
	if not ok:
		var frame := _failure_frame()
		if not frame.is_empty():
			rep["frame"] = {"uri": str(frame["uri"]), "path": str(frame["path"]), "bytes": int(frame["bytes"])}
			out["resource_links"] = [{
				"uri": str(frame["uri"]),
				"name": "%s failure frame" % pname,
				"description": "The frozen frame at the moment %s failed." % pname,
				"mimeType": str(frame["mime"]),
			}]
	var path := "%s/%s.report.json" % [PLAYTEST_DIR, pname]
	var werr := _write_report(path, rep)
	rep["written_to"] = path if werr.is_empty() else ("not written: " + werr)
	run["report"] = rep
	return out


## Repro block: everything needed to run this again, including the literal call.
func _repro(pname: String, doc: Dictionary, extra: Dictionary) -> Dictionary:
	var r := {
		"scene": str(doc.get("scene", "")),
		"rerun": "play_scene scene=\"%s\" -> wait_until condition=game_connected -> playtest op=run name=\"%s\"" % [str(doc.get("scene", "")), pname],
		"suite_file": "%s/%s.json" % [PLAYTEST_DIR, pname],
	}
	for k in extra:
		r[k] = extra[k]
	return r


## The RUNNING game's own error buffer for this session. Game-side, not editor-side: an
## assert failing because the game pushed an error is the commonest real cause, and that
## error never reaches the editor's log. Empty on Godot < 4.5, where the game cannot install
## a log sink at all (OS.add_logger is 4.5+) — reported as absent, never as "no errors".
func _game_errors(limit: int = 20) -> Array:
	var r := _bridge({"cmd": "logs", "level": "error", "limit": limit})
	if not bool(r.get("ok", false)):
		return []
	if not bool(r.get("capture_active", true)):
		return [{"note": "error capture unavailable on this Godot version (needs 4.5+); check logs_read instead"}]
	var entries: Variant = r.get("entries", [])
	return entries if entries is Array else []


## Capture the frozen frame and park it in the capture store. Annotated, because a failure
## frame is read to answer "what was on screen and what could have been clicked".
func _failure_frame() -> Dictionary:
	var r := _bridge({"cmd": "screenshot", "max_dim": 1280, "annotate": "ui"})
	if not bool(r.get("ok", false)):
		return {}
	var data := str(r.get("data", r.get("png", "")))
	if data.is_empty():
		return {}
	var stored: Dictionary = CapturesScript.store(data, str(r.get("mime", "image/png")))
	return {} if stored.has("error") else stored


func _write_report(path: String, rep: Dictionary) -> String:
	if not DirAccess.dir_exists_absolute(PLAYTEST_DIR):
		DirAccess.make_dir_recursive_absolute(PLAYTEST_DIR)
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return "could not write %s (%s)" % [path, error_string(FileAccess.get_open_error())]
	f.store_string(JSON.stringify(rep, "\t"))
	f.close()
	return ""


## Steps suite (v1.10 P1): semantic selector-based steps executed through the game-side
## ui_do window — resilient to layout shifts where a recorded-coordinate replay silently
## misses. NOT frame-exact, so no perf capture (record events for the perf loop). Freezes
## after the flow so asserts read a settled state, same contract as the replay path.
func _run_steps(pname: String, doc: Dictionary, steps: Array, asserts: Array, want_report: bool = false) -> Dictionary:
	var cmd := {"cmd": "ui_do_open", "steps": steps}
	if doc.has("step_timeout_ms"):
		cmd["step_timeout_ms"] = doc["step_timeout_ms"]
	var opened := _bridge(cmd)
	if not bool(opened.get("ok", false)):
		return {"error": "ui_do window failed to open: %s" % str(opened.get("error", ""))}
	var cap_ms: int = mini(steps.size() * maxi(100, int(doc.get("step_timeout_ms", 5000))) + 3000, 60000)
	var tick := func() -> Dictionary:
		var st := _bridge({"cmd": "ui_do_status"})
		if not bool(st.get("ok", false)):
			return {"error": "ui_do_status failed: %s" % str(st.get("error", ""))}
		if bool(st.get("done", false)):
			return {"st": st}
		return {}
	var res: Dictionary = MCPJobsScript.poll_until(cap_ms, 60, tick, Callable(server.bridge, "poll_once"))
	if res.has("error"):
		return {"error": str(res["error"])}
	if not res.has("st"):
		var ab := _bridge({"cmd": "ui_do_abort"})
		return {"error": "steps did not finish within %d ms (aborted; %d step(s) had completed)" % [cap_ms, int(ab.get("completed_steps", 0))]}
	var st: Dictionary = res["st"]
	var step_results: Array = st.get("results", [])
	var steps_failed := bool(st.get("failed", false))
	var _fr := _bridge({"cmd": "tc_freeze"})
	var results: Array = []
	var passed := 0
	var failed := 0
	var skipped := 0
	for a in asserts:
		if not (a is Dictionary):
			continue
		var r := _eval_assert(a, {}, false)
		results.append(r)
		match str(r.get("status", "")):
			"pass": passed += 1
			"fail": failed += 1
			_: skipped += 1
	var out := {
		"name": pname,
		"ok": (not steps_failed) and failed == 0,
		"mode": "steps",
		"steps_completed": step_results.size(),
		"steps_total": steps.size(),
		"steps_failed": steps_failed,
		"step_results": step_results,
		"passed": passed,
		"failed": failed,
		"skipped": skipped,
		"asserts": results,
		"note": "steps suite (semantic, not frame-exact): no perf capture; game left FROZEN — time_control op=unfreeze to resume",
	}
	if not want_report:
		return {"json": out}
	return _with_report(pname, doc, out, {
		"mode": "steps",
		"steps_total": steps.size(),
		"steps_completed": step_results.size(),
	})


## Deterministic replay: open the game-side replay window and poll until it closes. The game
## injects each event at its recorded physics frame and re-pauses at the end (see mcp_runtime
## _replay_open / _replay_step_tick), so asserts read a settled, reproducible state.
func _replay_window(events: Array, settle: int) -> Dictionary:
	var open_r := _bridge({"cmd": "replay_open", "events": events, "settle_frames": settle})
	if not bool(open_r.get("ok", false)):
		return {"error": "replay_open failed: %s" % str(open_r.get("error", ""))}
	var end_frame := int(open_r.get("end_frame", 0))
	var phys_fps: int = maxi(1, int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 60)))
	var cap_ms: int = maxi(3000, int(1000.0 * float(end_frame + 10) / float(phys_fps)) + 2000)
	var tick := func() -> Dictionary:
		var st := _bridge({"cmd": "replay_status"})
		if not bool(st.get("ok", false)):
			return {"error": "replay_status failed: %s" % str(st.get("error", ""))}
		if not bool(st.get("replaying", false)):
			var perf: Dictionary = st.get("perf", {}) if st.get("perf", {}) is Dictionary else {}
			return {"mode": "deterministic", "events": events.size(), "injected": int(st.get("injected", 0)), "frames": int(st.get("frames", 0)), "perf": perf}
		return {}
	var r: Dictionary = MCPJobsScript.poll_until(cap_ms, 16, tick, Callable(server.bridge, "poll_once"))
	if r.has("timeout"):
		return {"error": "replay window did not close within %d ms" % cap_ms}
	return r


## Plain replay: fire events back-to-back (no frame anchoring), then freeze so asserts read a
## stable frame. Used when events predate the frame stamp or deterministic=false was asked for.
func _replay_plain(events: Array) -> Dictionary:
	var injected := 0
	for e in events:
		if not (e is Dictionary):
			continue
		var r := _bridge({"cmd": "input", "events": [e]})
		injected += int(r.get("dispatched", 0))
	_bridge({"cmd": "tc_freeze"})
	return {"mode": "plain", "events": events.size(), "injected": injected}



func _eval_assert(a: Dictionary, perf: Dictionary = {}, game_headless: bool = false) -> Dictionary:
	match str(a.get("type", "")).to_lower():
		"perf":
			return _eval_perf_assert(a, perf, game_headless)
		"node_state":
			var r := _bridge({"cmd": "get", "path": str(a.get("target", "")), "prop": str(a.get("property", ""))})
			if not bool(r.get("ok", false)):
				return _fail(a, str(r.get("error", "get failed")))
			var actual: Variant = r.get("value")
			var expected: Variant = a.get("equals")
			if _values_equal(actual, expected):
				return _pass(a, "%s.%s == %s" % [str(a.get("target", "")), str(a.get("property", "")), str(expected)])
			return _fail(a, "%s.%s = %s (expected %s)" % [str(a.get("target", "")), str(a.get("property", "")), str(actual), str(expected)])
		"screen_text":
			var r := _bridge({"cmd": "find", "text": str(a.get("text", "")), "max": 1})
			if bool(r.get("ok", false)) and (r.get("nodes", []) as Array).size() > 0:
				return _pass(a, "found '%s' on screen" % str(a.get("text", "")))
			return _fail(a, "text '%s' not found on screen" % str(a.get("text", "")))
		"expr":
			var r := _bridge({"cmd": "eval", "expr": str(a.get("condition", ""))})
			if not bool(r.get("ok", false)):
				return _fail(a, str(r.get("error", "eval failed")))
			if bool(r.get("value", false)):
				return _pass(a, "%s -> true" % str(a.get("condition", "")))
			return _fail(a, "%s -> %s (want true)" % [str(a.get("condition", "")), str(r.get("value"))])
		"screenshot":
			return _eval_screenshot(a)
		_:
			return {"type": str(a.get("type", "")), "status": "skip", "detail": "unknown assert type"}


## Perf assert (v1.9): {type:"perf", metric:<flat key>, max:<num>[, min:<num>]}. Metrics come
## from the deterministic replay window's capture: frames, frame_ms_min/avg/p95/max,
## fps_min/avg, memory_static_end, memory_delta, orphan_delta, draw_calls_end — all measured
## Performance monitors, never modeled. Mirrors playtest_runner._eval_perf_assert (extend both).
func _eval_perf_assert(a: Dictionary, perf: Dictionary, game_headless: bool) -> Dictionary:
	if perf.is_empty():
		return _skip("perf", "no perf capture — perf asserts need the deterministic replay window (events with frame stamps, deterministic=true)")
	var metric := str(a.get("metric", ""))
	if game_headless and (metric.begins_with("frame_ms") or metric.begins_with("fps") or metric.begins_with("draw_calls")):
		return _skip("perf", "%s skipped: the game is headless (no RHI) so rendering cost is not measured — play windowed for frame/fps/draw metrics" % metric)
	if not perf.has(metric):
		return _fail(a, "unknown perf metric '%s' (have: %s)" % [metric, ", ".join(PackedStringArray(perf.keys()))])
	if not (a.has("max") or a.has("min")):
		return _fail(a, "perf assert needs 'max' and/or 'min' (metric %s)" % metric)
	var value := float(perf[metric])
	if a.has("max") and value > float(a.get("max")):
		return _fail(a, "perf %s = %.2f > max %.2f" % [metric, value, float(a.get("max"))])
	if a.has("min") and value < float(a.get("min")):
		return _fail(a, "perf %s = %.2f < min %.2f" % [metric, value, float(a.get("min"))])
	var bound := ("max %.2f" % float(a.get("max"))) if a.has("max") else ("min %.2f" % float(a.get("min")))
	return _pass(a, "perf %s = %.2f within %s" % [metric, value, bound])


## Screenshot assert (v1.12 W2). Compares the live frame against a baseline PNG with the
## engine's own Image.compute_image_metrics -> peak_snr (dB, higher = more alike), instead
## of the old 64x64 downsample-and-sum. That downsample was a "did anything change at all"
## detector: it threw away 99.9% of the pixels, so a whole misdrawn character could pass
## while an AA seam could fail. Measured reference points on 4.6.2 and 4.7 (identical
## engines): identical frames = 1e10, one changed pixel in 64x64 = 39.1, fully different
## = 3.0. The 30 dB default sits below AA/dither noise but well above any real regression.
## Mirrored by playtest_runner._eval_screenshot for the headless runner (extend BOTH).
const SNR_DEFAULT := 30.0


func _eval_screenshot(a: Dictionary) -> Dictionary:
	var baseline := str(a.get("baseline", ""))
	if not (baseline.begins_with("res://") or baseline.begins_with("user://")):
		return _skip("screenshot", "baseline must be a res:// or user:// path")
	var r := _bridge({"cmd": "screenshot"})
	if not bool(r.get("ok", false)):
		return _skip("screenshot", "no RHI (headless?) — screenshot asserts need a windowed play session")
	var cur := Image.new()
	if cur.load_png_from_buffer(Marshalls.base64_to_raw(str(r.get("png", r.get("data", ""))))) != OK:
		return _skip("screenshot", "could not decode screenshot")
	if not FileAccess.file_exists(baseline):
		var derr := DirAccess.make_dir_recursive_absolute(baseline.get_base_dir())
		if derr != OK and not DirAccess.dir_exists_absolute(baseline.get_base_dir()):
			return _skip("screenshot", "cannot create %s" % baseline.get_base_dir())
		cur.save_png(baseline)
		return _skip("screenshot", "baseline saved (first run): %s — rerun to compare against it" % baseline)
	var base := Image.new()
	if base.load(baseline) != OK:
		return _skip("screenshot", "could not load baseline %s" % baseline)
	var resized := false
	if cur.get_width() != base.get_width() or cur.get_height() != base.get_height():
		cur.resize(base.get_width(), base.get_height(), Image.INTERPOLATE_BILINEAR)
		resized = true
	cur.convert(Image.FORMAT_RGBA8)
	base.convert(Image.FORMAT_RGBA8)
	if not base.has_method("compute_image_metrics"):
		return _skip("screenshot", "this Godot has no Image.compute_image_metrics; screenshot asserts need a newer engine (verified present on 4.6.2 and 4.7)")
	var m: Dictionary = base.call("compute_image_metrics", cur, false)
	var snr := float(m.get("peak_snr", 0.0))
	var want := float(a.get("min_peak_snr", SNR_DEFAULT))
	var detail := "peak_snr %.2f dB (need >= %.2f)" % [snr, want]
	if resized:
		detail += " [current frame resized to the baseline's %dx%d]" % [base.get_width(), base.get_height()]
	if a.has("tolerance"):
		detail += " [note: 'tolerance' is no longer used — this assert compares peak_snr; set min_peak_snr instead]"
	if snr >= want:
		return _pass(a, detail)
	var actual := baseline.get_basename() + ".actual.png"
	cur.save_png(actual)
	var f := _fail(a, detail + " | baseline: %s | actual: %s | max channel delta %d, rms %.2f" % [
		baseline, actual, int(m.get("max", 0)), float(m.get("root_mean_squared", 0.0))])
	f["peak_snr"] = snr
	f["baseline"] = baseline
	f["actual"] = actual
	return f



func _list() -> Dictionary:
	var out: Array = []
	var dir := DirAccess.open(PLAYTEST_DIR)
	if dir != null:
		dir.list_dir_begin()
		var e := dir.get_next()
		while e != "":
			if not dir.current_is_dir() and e.get_extension() == "json":
				var doc := _load(e.get_basename())
				if not doc.has("error"):
					out.append({
						"name": str(doc.get("name", e.get_basename())),
						"scene": str(doc.get("scene", "")),
						"events": (doc.get("events", []) as Array).size() if doc.get("events", []) is Array else 0,
						"steps": (doc.get("steps", []) as Array).size() if doc.get("steps", []) is Array else 0,
						"asserts": (doc.get("asserts", []) as Array).size() if doc.get("asserts", []) is Array else 0,
					})
			e = dir.get_next()
		dir.list_dir_end()
	return {"json": {"dir": PLAYTEST_DIR, "count": out.size(), "playtests": out}}


func _show(args: Dictionary) -> Dictionary:
	var doc := _load(_sanitize(str(args.get("name", ""))))
	if doc.has("error"):
		return doc
	return {"json": doc}



func _load(pname: String) -> Dictionary:
	if pname.is_empty():
		return {"error": "playtest 'name' required"}
	var path := "%s/%s.json" % [PLAYTEST_DIR, pname]
	if not FileAccess.file_exists(path):
		return {"error": "no playtest at %s (playtest op=list to see saved ones)" % path}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not (parsed is Dictionary):
		return {"error": "playtest %s is not valid JSON" % path}
	var ver := int((parsed as Dictionary).get("schema_version", 1))
	if ver > SCHEMA_VERSION:
		return {"error": "playtest %s is schema_version %d; this build reads up to %d — upgrade Beckett" % [path, ver, SCHEMA_VERSION]}
	return parsed


func _events_have_frames(events: Array) -> bool:
	for e in events:
		if e is Dictionary and (e as Dictionary).has("f"):
			return true
	return false


func _has_perf_assert(asserts: Array) -> bool:
	for a in asserts:
		if a is Dictionary and str((a as Dictionary).get("type", "")).to_lower() == "perf":
			return true
	return false


## Per-metric delta of this run vs the stored baseline: {metric: {baseline, current, delta[,
## delta_pct]}}. Only metrics present in BOTH captures diff; delta_pct is omitted for a zero
## baseline. Positive delta = this run is higher (slower/bigger for the ms/memory metrics).
func _perf_diff(base: Dictionary, cur: Dictionary) -> Dictionary:
	var out: Dictionary = {}
	for k in cur:
		if not base.has(k):
			continue
		if not ((cur[k] is int or cur[k] is float) and (base[k] is int or base[k] is float)):
			continue
		var b := float(base[k])
		var c := float(cur[k])
		var entry := {"baseline": b, "current": c, "delta": c - b}
		if absf(b) > 0.000001:
			entry["delta_pct"] = 100.0 * (c - b) / b
		out[k] = entry
	return out


func _bridge(cmd: Dictionary) -> Dictionary:
	return server.bridge.send_command(cmd)


## Safe file stem: strip any directory + extension, then keep only [A-Za-z0-9_-] so a name can
## never escape PLAYTEST_DIR. Version-safe (no String.validate_filename, which is 4.3+).
func _sanitize(pname: String) -> String:
	var stem := pname.strip_edges().get_file().get_basename()
	const OK_CHARS := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
	var safe := ""
	for i in stem.length():
		safe += stem[i] if OK_CHARS.find(stem[i]) >= 0 else "_"
	return safe


func _beckett_version() -> String:
	var cfg := ConfigFile.new()
	if cfg.load("res://addons/beckett/plugin.cfg") == OK:
		return str(cfg.get_value("plugin", "version", ""))
	return ""


func _pass(a: Dictionary, detail: String) -> Dictionary:
	return {"type": str(a.get("type", "")), "status": "pass", "detail": detail}


func _fail(a: Dictionary, detail: String) -> Dictionary:
	return {"type": str(a.get("type", "")), "status": "fail", "detail": detail}


func _skip(kind: String, detail: String) -> Dictionary:
	return {"type": kind, "status": "skip", "detail": detail}


## Numeric-tolerant equality: an int property read (1) must match a JSON-loaded float expected
## (1.0) - JSON parsing turns every number into a float, so a plain str() compare would spuriously
## fail 1 vs 1.0. Non-numbers fall back to a string compare (covers bool/String/Vector via str()).
func _values_equal(actual: Variant, expected: Variant) -> bool:
	if (actual is int or actual is float) and (expected is int or expected is float):
		return is_equal_approx(float(actual), float(expected))
	return str(actual) == str(expected)
