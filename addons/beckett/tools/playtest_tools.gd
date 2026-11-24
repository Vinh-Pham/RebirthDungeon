@tool
extends RefCounted
class_name BeckettPlaytestTools

## Playtest suites (L5, Full): turn a recorded input run + asserts into a durable, rerunnable
## regression asset. `playtest op=save` writes res://tests/playtests/<name>.json; `op=run`
## replays it DETERMINISTICALLY (frame-stepped, game-side replay window) into the live game and
## evaluates its asserts and per-frame invariants; `op=repeat` (v1.16) runs it n times, restarting the
## scene before each run, and reports pass^k, the flaky steps and the first divergence;
## `op=list`/`op=show` inspect saved playtests; `op=export_gd` (v1.16, playtest_export.gd) writes a suite as a
## standalone GDScript test that runs with no editor and no Beckett (CI).
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
const SCHEMA_VERSION := 2
const SCHEMA_BASE := 1
const MCPJobsScript := preload("res://addons/beckett/core/jobs.gd")
const CapturesScript := preload("res://addons/beckett/core/captures.gd")
const PathGuard := preload("res://addons/beckett/core/path_guard.gd")
const CallArgs := preload("res://addons/beckett/core/callargs.gd")
const TypedJson := preload("res://addons/beckett/core/typed_json.gd")
const Invariants := preload("res://addons/beckett/runtime/invariants.gd")
const UiDo := preload("res://addons/beckett/runtime/ui_do.gd")
const GameState := preload("res://addons/beckett/runtime/game_state.gd")
const Mutate := preload("res://addons/beckett/tools/playtest_mutate.gd")
const Select := preload("res://addons/beckett/tools/playtest_select.gd")
const Export := preload("res://addons/beckett/tools/playtest_export.gd")
const Overlap := preload("res://addons/beckett/runtime/physics_overlap.gd")
const RuntimeBridge := preload("res://addons/beckett/core/runtime_bridge.gd")
const Version := preload("res://addons/beckett/core/version.gd")

const OVERLAP_TIMEOUT_MS := 8000
const RELOAD_TIMEOUT_MS := 12000
const BREAK_REASON_CAP := 1000

const REPEAT_DEFAULT := 5
const REPEAT_MAX := 50
const MUTATE_DEFAULT := 10
const MUTATE_MAX := 50
const SUITES_SHOWN := 60

var server
## One batch call (repeat, mutate, run_all) blocks the editor at most this long (the replay waits each run
## holds are unchanged); a batch that would run past it stops early and says so. A var so the unit suite can shorten it.
var repeat_cap_ms := 45000
## How long a restarted scene may take to come back before the batch gives up (a var for the same reason).
## Generous: a heavy 3D scene can take seconds to load, and the wait only ever matters when something is wrong.
var restart_cap_ms := 15000
## What git says changed, for run_all since=: (project dir, ref) -> {files} | {error}. Empty means ask git
## (Select.changed_files); the unit suite swaps in a canned answer.
var changed_files_fn: Callable = Callable()
## True while a batch op (repeat, mutate, run_all) runs one suite: that run starts right after a scene restart (see _perf_broken).
var _after_restart := false


func _register(registry) -> void:
	registry.register({
		"name": "playtest",
		"description": "Save and rerun PLAYTESTS: recorded input plus asserts under res://tests/playtests/, replayable as a regression test. ops: save | run | repeat (n runs: pass^k, flaky steps) | mutate (do asserts catch faults?) | run_all (since=<git ref>: only suites a change reaches) | export_gd (CI test with no editor or Beckett) | list | show. A deterministic run frame-steps the replay, MEASURES perf, checks typed asserts (incl. no_overlap: physics clipping), and leaves the game FROZEN (time_control op=unfreeze to resume). report=true writes a bug report. Grammar, perf, baselines: help(tool=\"playtest\").",
		"help": "ops\n  save {name, scene, events|steps, asserts, invariants}   writes the suite file\n  run  {name, deterministic=true, settle_frames=4, save_baseline=false, report=false}\n       replays it into the RUNNING game and checks the asserts. play_scene -> wait_until game_connected FIRST.\n  repeat {name, n=5 (1-50), settle_frames, deterministic}   runs it n times back to back (see REPEAT)\n  mutate {name, max=10 (1-50), from=0, settle_frames, deterministic}   would the asserts notice a fault? (see MUTATE)\n  run_all {since, compare, from, settle_frames, deterministic}        every saved suite, or those a change reaches (see RUN_ALL)\n  export_gd {name, path=res://tests/beckett/<name>_test.gd, settle_frames=4}   writes the suite as a standalone test that needs no editor and no Beckett (see EXPORT_GD)\n  list                                       enumerates saved playtests\n  show {name}                                 dumps one\n\nReplay modes: a DETERMINISTIC run frame-steps a game-side window and needs events recorded by Beckett 1.8+ (they carry a frame stamp 'f'). Older or hand-authored events fall back to back-to-back replay, and the result says which one ran. The window runs one physics frame per engine frame (1.17), so a game that renders below its physics rate replays in slow motion: op=run waits while its frames keep advancing, up to ~45 s (longer when the recording itself needs it). Where frames still ran back to back (--fixed-fps below the physics rate, the Game view's speed above 1x), some events went in inside physics, and result.replay.note says so.\n\nAssert types:\n  {type:node_state, target, property, equals}\n  {type:screen_text, text}\n  {type:expr, condition:\"get_node('Player').position.y < 500\"}   a false one reports the values it read\n  {type:screenshot, baseline:\"res://...png\", min_peak_snr:30}   RHI-only; skipped with a warning when headless\n  {type:perf, metric, max|min}                                   1.9+\n  {type:no_overlap, paths, group, min_depth, max_pairs, max_bodies}    1.16: no physics bodies clip (see NO_OVERLAP)\nThe screenshot assert saves its baseline on the first run, then compares with Image.compute_image_metrics peak_snr (dB, higher = more alike; identical frames read 1e10). On failure it writes <baseline>.actual.png and returns both paths plus the numbers.\n\nPERF: a deterministic run times every frame of the window in the game itself (1.17; never modeled) and returns flat stats as result.perf: frames (the frame intervals timed), frame_ms_min/avg/p95/max (the wall time from one frame to the next, ms), fps_min/avg (the same clock), memory_static_end, memory_delta, orphan_delta, draw_calls_end. A perf assert bounds any of them: {type:perf, metric:\"frame_ms_p95\", max:20} leaves a vsync'd 60 Hz game room over its 16.7 ms frames. Frame / fps / draw metrics skip when the game is headless.\n\nThe optimize loop: save_baseline=true stamps this run's stats into the suite; every later run returns result.perf_diff with per-metric baseline / current / delta / delta_pct. Baseline, change the code, rerun, read the diff.\nA baseline also stores a fingerprint (OS, CPU, GPU, display, renderer, viewport size, engine, debug/release build, and a hash of the recorded run). Each later run reports result.perf_baseline_comparable (true, false, or \"unknown\" for a baseline saved before 1.16 when the game also runs a runtime older than 1.17) and perf_baseline_mismatch {field: [baseline, now]}; a baseline saved before 1.17 was timed by another clock and reads false (perf_clock 1 -> 2), and so does one read by a game still on an older runtime (perf_clock 2 -> 1: restart the game). perf_diff is still returned, but when comparable is false it compares unlike runs, so do not read it as a regression: re-capture with save_baseline=true. Absolute perf asserts never depend on it. A batch (repeat, mutate, run_all) measures right after a scene restart, so the window includes the scene's load: a perf bound broken there is reported blocked, not failed, and one that holds passes. Judge perf with op=run on a scene that has been running.\n\nVERDICTS (1.16): every assert and step ends pass | fail | skip | blocked. fail = it was evaluated and was false. blocked = the run could not get to a judgement (the scene failed to load, the game is not connected or dropped, the node it reads was missing, a wait timed out before its assert could run): nothing was judged, so fix the setup, not the game (only an assert can FAIL: a click that never became possible is blocked, so add an assert step on the control's state if a disabled button should fail the suite). skip = not applicable here (a headless screenshot, a first-run baseline). The suite verdict is fail if anything failed, else blocked if anything was blocked, else pass: result.verdict says which, result.blocked counts them, ok is true only for pass. A malformed assert (unknown perf metric, an expression that does not parse) still FAILS loudly.\n\nINVARIANTS (1.16): invariants:[{name, expr}] (max 16) are GDScript booleans checked on EVERY physics frame of the replay window, not only at the end: {name:\"hp_never_negative\", expr:\"get_node('Player').health >= 0\"}. The first violation of each is reported with its frame (the replay's own numbering, the same as an event's f), the expression and the values it read, and a violated invariant fails the run. They must be pure reads (they run every frame); use get_node_or_null for a node that may not exist yet. Each shows up in result.asserts as {type:invariant, name, status, first_violation}. They need the deterministic replay window or a steps suite; a non-deterministic replay skips them.\n\nINJECT (1.16, steps suites): {inject:{set:[{node, property, value}], call:[{node, method, args}], frames:N}} (or flat: {kind:\"inject\", set, call, frames}) patches state into the live game through the same machinery as runtime_set_property / runtime_call, then lets it run N frames (default 1) before the next step: set Player.health to 0, run 2 frames, assert the game-over panel shows, instead of playing all the way there. Every target must exist before anything is applied; a write or call the game refuses ends the step blocked.\n\nSTATE (1.16, steps suites): {state:{node, path, op, value}} (or flat: {kind:\"state\", node, path, op, value}) asserts on the game-owned state a node exposes through func _beckett_state() -> Dictionary (or _mcp_state()); the node is in the group beckett_state (or mcp_state), which is what get_remote_tree state=true lists, but the step only needs the method. path is dotted into that dictionary (stats.hp, inventory.0, pos.x); op is eq (default) | ne | lt | le | gt | ge | contains | exists (value:false asks for a key that is NOT there); value is compared after it is coerced to the type the state holds ([1, 2] matches a Vector2, \"true\" a bool, 3 matches 3.0). Like an assert it polls until it holds or the step times out: a fail when the state was read and stayed wrong, blocked when the node never appeared or has no state method. A malformed step is refused at save. For an events suite, read the same thing in an expr assert: get_node('Player')._beckett_state().hp > 0.\n\nNO_OVERLAP (1.16): {type:\"no_overlap\", paths:[node paths], group:\"name\", min_depth:n, max_pairs:n (1-200, default 20), max_bodies:n (1-2000, default 500)} asks the physics ENGINE which bodies penetrate each other, 2D and 3D, instead of asking a screenshot whether things look clipped (a vision model flags objects that merely touch and misses a collider buried in a wall). A pair counts when its deepest contact is more than min_depth (default 0.5 px in 2D, 0.05 m in 3D; a number you give applies to both): the engine lets a body resting on the floor sink 0.3 px (2D) or 0.01-0.02 m (3D), so a smaller bound flags everything standing still, and touching shapes (depth 0) are never a pair. paths (a node that is not a body stands for the bodies below it) and group say what to check: each of those bodies is tested against every other body in its space, named or not; with neither, every physics body is checked. Never counted, because they are not clips: Areas, disabled shapes, 2D one-way shapes, a body and its own ancestors or descendants, bodies whose layers and masks never interact, collision exceptions (joints add them), and two STATIC bodies unless one of them is named (level geometry overlaps by design). pass says how many bodies were checked and what was left out. fail lists result.asserts[].pairs: {a, b, depth, normal (from a toward b: move a by -normal*depth to separate them), at (the contact point), space}. blocked when a path or group names nothing, no body was found, or the scan did not finish (more bodies than max_bodies, or its ~1.5 s budget ran out): a partial scan is never a pass. It reads the settled, frozen state, so settle_frames lets a body spawned inside a wall be pushed out first. The headless runner runs it; export_gd lists it as not_run.\n\nREPEAT (1.16): op=repeat restarts the current scene before EACH run (the scene and the resources it names are re-read from disk, in place; Godot 4.2 has no deep reload, so there the .tres files it names come from the cache and the reply's reset says so), runs the suite n times, and restarts it once more at the end so a following op=run starts clean. (A handler cannot relaunch the game; whatever lives outside them - autoloads, files on disk, a script's own variables - is NOT reset, and a suite that depends on it reads as flaky.) Result: runs, passes, pass_rate (the mean), pass_all (pass^k: true only when all n passed; a suite can pass one attempt and still fail 1 in 5), outcomes (verdict per run), steps (per assert / step outcome counts), flaky_steps (steps whose pass/fail outcome flipped between runs, most flips first), flaky_blocked (the same for blocked flips, ranked apart from fail flips), first_divergence (the first step whose observed result differs from run 1, with both details; null when every run looked the same). One call blocks the editor for at most ~45 s: a longer batch stops early (truncated:true, runs < requested). save_baseline and report are ignored.\n\nMUTATE (1.16): op=mutate asks \"would this suite notice if the game were wrong?\". It runs the suite clean once (one that does not pass is refused: a result on a red suite means nothing), then reruns it with ONE fault put in at the start of each fresh replay, and counts the faults it catches. The faults come from what the suite names (the nodes and properties in its asserts, invariants and steps): a number set to 0 and negated (a property already at 0 is set to 1 instead), a bool flipped, a node's process_mode set to disabled, and one signal connection its scene declares, cut. Each goes in through the write path the inject step uses (value coercion, read back), the scene is restarted before every run, and a property changed outside the scene (an autoload) is written back. A fault the suite FAILS or goes BLOCKED on is KILLED; one it still passes on SURVIVED. Result: total (faults judged), killed, survived, score (killed / total), survivors [{target, operator, change, reads, hint}] (hint: \"no assertion notices Player.health = 0\", reads: the asserts that name it), caught [{target, operator, change, by}] (by: the failing assert that reads the faulted value, else the first that failed), skipped [{target, why}] (a value that is not a number or bool, a fault the game would not take, a run that could not finish: none of these count toward the score), planned, not_run and next_from. max bounds the faults tried per call and one call stops at the ~45 s the editor may spend: call again with from=next_from for the rest. A survivor is an assert that cannot fail for that fault: assert on it, or tighten the assert that reads it. Mutate a suite that is stable (op=repeat first): one that flips between runs makes faults look caught. The game is left on the suite's scene, restarted and frozen.\n\nRUN_ALL (1.16): op=run_all runs every saved suite in name order, each from a restart of its own scene (a suite that saved no scene runs on the current one), so it needs one play_scene, not one per suite; it ends by putting the game back on the scene it found, restarted. Result: suites [{name, verdict, passed, failed, blocked, skipped, ms, problem}], the counts and the overall verdict (ok only when every suite ran and passed). since=<git ref> runs only the suites a change can reach: it asks git what differs from the ref (git diff --name-only <ref> plus untracked files; git must be on PATH and the project inside a repository; a ref may not start with \"-\" or hold whitespace or control characters), then keeps a suite when a changed file is its own file or screenshot baseline, its scene, or anything the scene loads (resources through the engine's dependency list, scripts through the res:// literals in preload / load / extends and through class_name use; a literal that names a folder or the front of a built name, \"res://data/jobs/\" or \"res://levels/lv_%d.tscn\", counts as everything under it). A change to project.godot, to an autoload or a resource a project setting names (or what those load, or a folder they spell out), or to a data file no resource references (JSON, CSV, text: a script may read it by path) selects EVERY suite and says why; docs and tooling files select nothing. selection {since, mode: impact|all, why, changed, selected, skipped, reasons{suite: why}, unreached} says what it did. compare=true (needs since) runs EVERYTHING, then reports compare {would_run, would_skip, skipped_failed, false_negatives}: suites selection would have skipped that failed (or were already red before the change: rerun on the ref to tell). A path a script gets without writing its front down (read from a file, or put together from pieces that never start with res://) is invisible to selection, which is exactly what compare measures: run it now and then to learn how far to trust since. One call stops at the ~45 s the editor may spend (truncated, next_from): call again with from.\n\nEXPORT_GD (1.16): op=export_gd writes a saved suite as ONE plain GDScript test, res://tests/beckett/<name>_test.gd by default (path= for another .gd file inside the project). It runs with no editor and no Beckett (the addon may be switched off or not installed): godot --headless --path <project> --script res://tests/beckett/<name>_test.gd. It loads the suite's scene, replays the recorded events frame by frame with the timing op=run uses (invariants judged at the start of each physics frame, the asserts once the settle frames have passed) or runs the steps flow, prints one line per judgement and a summary, and exits 0 on pass, 1 on fail and 2 on blocked (nothing failed, but the scene or a node was missing, or the game quit before the suite was judged). The last line is BECKETT_RESULT {suite, verdict, passed, failed, blocked, skipped}. It runs node_state, screen_text and expr asserts, the invariants, and in a steps suite click, type, wait, assert, input, inject and state steps (click and type do not check that a control is uncovered or on screen, the editor's do). It does NOT run screenshot asserts (they need a rendered frame) or perf asserts (perf is measured in the editor's replay window): those, an unknown assert type, an unknown step kind and an event type nobody knows are listed in the reply as not_run and in the file's header, so nothing is dropped silently. The test prints an assert it cannot run as skip, and an unknown step fails the flow there, as it does in the editor. A run takes about as long as the recording; adding --fixed-fps <the project's physics rate> to the command runs it as fast as the machine allows (a 30 s recording in under a second, same physics frames: logic keyed to the wall clock or to _process's delta sees another clock). Every string the file takes from the suite is escaped, so a node path or an expression cannot turn into code, and the engine loads the finished file once before it is written: one that would not compile is refused, with nothing written. The file is written only where an earlier export wrote one (a script you wrote yourself is never overwritten), through the project write rule, and read back. Export again after the suite changes. Result: path, suite, mode, scene, bytes, counts, not_run, run (the command), exit_codes, notes, replaced.\n\nreport=true (1.14) adds result.report: verdict, the failing asserts with expected vs actual, the repro (scene, mode, how to rerun), the engine errors captured during the run, the perf delta, and on a run that did not pass (fail or blocked) a capture of the frozen frame delivered as a capture:// link. It is also written to res://tests/playtests/<name>.report.json. See the qa-report skill.\n\nFor CI, use the headless runner (see the playtest skill): it plays every suite and exits 1 on a failure, 2 when nothing failed but a suite was blocked. To run ONE suite with no editor and no Beckett at all, op=export_gd.",
		"input_schema": {"type": "object", "properties": {
			"op": {"type": "string", "description": "save | run | repeat | mutate | run_all | export_gd | list | show"},
			"name": {"type": "string", "description": "playtest name (file stem under res://tests/playtests/)"},
			"scene": {"type": "string", "description": "op=save: the res:// scene the playtest plays (used by the headless runner)"},
			"events": {"type": "array", "description": "op=save: events from record_input action=stop — frame-exact replay + perf capture"},
			"steps": {"type": "array", "description": "op=save, instead of events: a semantic ui_do flow; no perf capture (see help)"},
			"step_timeout_ms": {"type": "integer", "description": "op=save with steps: per-step auto-wait budget stored in the suite (default 5000)"},
			"asserts": {"type": "array", "description": "op=save: typed asserts — node_state | screen_text | expr | perf | screenshot | no_overlap (grammar in help)"},
			"invariants": {"type": "array", "description": "op=save: [{name, expr}] rules checked every physics frame (max 16)"},
			"n": {"type": "integer", "description": "op=repeat: runs back to back, 1-50 (default 5)"},
			"max": {"type": "integer", "description": "op=mutate: faults per call, 1-50 (default 10)"},
			"from": {"type": "integer", "description": "op=mutate / run_all: resume at the last reply's next_from"},
			"since": {"type": "string", "description": "op=run_all: only suites a change since this git ref reaches"},
			"compare": {"type": "boolean", "description": "op=run_all with since: run all, report what selection missed"},
			"deterministic": {"type": "boolean", "description": "op=run: frame-stepped deterministic replay (default true); false = back-to-back"},
			"settle_frames": {"type": "integer", "description": "op=run / export_gd: extra physics frames to advance after the last event before asserting (default 4)"},
			"path": {"type": "string", "description": "op=export_gd: where to write the test (default res://tests/beckett/<name>_test.gd)"},
			"save_baseline": {"type": "boolean", "description": "op=run: stamp this run's perf stats as the baseline later runs diff against (default false)"},
			"report": {"type": "boolean", "description": "op=run: also build the structured bug report (default false; see help)"},
		}, "required": ["op"]},
		"handler": Callable(self, "_playtest"),
	})


func _playtest(args: Dictionary) -> Dictionary:
	_after_restart = false
	match str(args.get("op", "")).to_lower():
		"save": return _save(args)
		"run": return _with_read_note(_run(args), str(args.get("name", "")))
		"repeat": return _with_read_note(_repeat(args), str(args.get("name", "")))
		"mutate": return _with_read_note(_mutate(args), str(args.get("name", "")))
		"run_all": return _with_read_note(_run_all(args), "")
		"export_gd": return _with_read_note(_export_gd(args), str(args.get("name", "")))
		"list": return _with_read_note(_list(), "")
		"show": return _with_read_note(_show(args), str(args.get("name", "")))
		_: return {"error": "unknown op '%s': use save | run | repeat | mutate | run_all | export_gd | list | show" % str(args.get("op", ""))}


## The reply of an op that READ a suite (or the suite folder), carrying the note when that read went ahead
## outside the project: outside reads are switched on and the folder or the file is a link that leaves it.
## _load and _list refuse such a read when they are off, so this only ever adds the note.
func _with_read_note(reply: Dictionary, pname: String) -> Dictionary:
	var clean := _sanitize(pname)
	var guard: Dictionary = PathGuard.check_read("%s/%s.json" % [PLAYTEST_DIR, clean]) if not clean.is_empty() else PathGuard.check_read(PLAYTEST_DIR)
	return PathGuard.noted(reply, guard)



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
	var inv: Dictionary = Invariants.normalize(args.get("invariants", null))
	if not bool(inv.get("ok", false)):
		return {"error": "op=save: %s" % str(inv.get("error", "invalid invariants"))}
	for ai in (asserts as Array).size():
		var asr: Variant = (asserts as Array)[ai]
		if asr is Dictionary and _is_no_overlap(asr):
			var oerr: String = Overlap.spec_error(asr)
			if not oerr.is_empty():
				return {"error": "op=save: asserts[%d] (no_overlap): %s" % [ai, oerr]}
		var aunsafe := _unsafe_condition(asr)
		if not aunsafe.is_empty():
			return {"error": "op=save: asserts[%d]: %s" % [ai, aunsafe]}
	for si in (steps as Array).size():
		var step: Variant = (steps as Array)[si]
		var sunsafe := _unsafe_condition(step)
		if not sunsafe.is_empty():
			return {"error": "op=save: steps[%d]: %s" % [si, sunsafe]}
		if step is Dictionary and UiDo.is_inject(step):
			var ierr: String = UiDo.inject_error(UiDo.inject_body(step))
			if not ierr.is_empty():
				return {"error": "op=save: steps[%d]: %s" % [si, ierr]}
		if step is Dictionary and UiDo.is_state(step):
			var serr: String = GameState.spec_error(UiDo.state_body(step))
			if not serr.is_empty():
				return {"error": "op=save: steps[%d]: %s" % [si, serr]}
	var doc := {
		"schema_version": schema_for(steps as Array, inv["items"] as Array, asserts as Array),
		"name": pname,
		"scene": str(args.get("scene", "")),
		"created": Time.get_datetime_string_from_system(false, true),
		"engine": String(Engine.get_version_info().get("string", "")),
		"beckett": _beckett_version(),
		"asserts": asserts,
	}
	if not (inv["items"] as Array).is_empty():
		doc["invariants"] = inv["items"]
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
	var rules := (", %d invariants" % (inv["items"] as Array).size()) if not (inv["items"] as Array).is_empty() else ""
	return {"text": "saved playtest '%s' -> %s/%s.json (%s, %d asserts%s)" % [pname, PLAYTEST_DIR, pname, what, (asserts as Array).size(), rules]}


## The format a suite is saved as. One that uses a 1.16 feature (per-frame invariants, an inject step, a
## state step, a no_overlap assert) is schema 2, so a Beckett older than 1.16 refuses it with its own "upgrade
## Beckett" error instead of running it with the rules silently absent (or, for a step it does not know,
## failing it as "unknown step", and for an assert it does not know skipping it); every other suite stays
## schema 1 and opens everywhere.
static func schema_for(steps: Array, invariants: Array, asserts: Array = []) -> int:
	if not invariants.is_empty():
		return SCHEMA_VERSION
	for s in steps:
		if s is Dictionary and (UiDo.is_inject(s) or UiDo.is_state(s)):
			return SCHEMA_VERSION
	for a in asserts:
		if a is Dictionary and _is_no_overlap(a):
			return SCHEMA_VERSION
	return SCHEMA_BASE


static func _is_no_overlap(a: Dictionary) -> bool:
	return str(a.get("type", "")).to_lower() == "no_overlap"


## Why the expression an assert or a step carries may not be evaluated (Invariants.unsafe_call), or "": its
## "condition", at the top level ({type: expr, condition}) or one object down ({wait: {condition}}). The game refuses
## it as well; saying so at save is where a mistake is cheap.
static func _unsafe_condition(v: Variant) -> String:
	if not (v is Dictionary):
		return ""
	var holders: Array = [v]
	for k in (v as Dictionary):
		if (v as Dictionary)[k] is Dictionary:
			holders.append((v as Dictionary)[k])
	for h in holders:
		if (h as Dictionary).has("condition"):
			var why := Invariants.unsafe_call(str((h as Dictionary)["condition"]))
			if not why.is_empty():
				return why
	return ""


## Write a playtest doc to its file under PLAYTEST_DIR; "" on success, else the error text.
## Shared by op=save and the run-time baseline update (save_baseline).
func _store(pname: String, doc: Dictionary) -> String:
	var path := "%s/%s.json" % [PLAYTEST_DIR, pname]
	var perr: String = PathGuard.write_path_error(path)
	if not perr.is_empty():
		return "%s: %s" % [path, perr]
	if not DirAccess.dir_exists_absolute(PLAYTEST_DIR):
		DirAccess.make_dir_recursive_absolute(PLAYTEST_DIR)
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
	var invariants: Array = doc.get("invariants", []) if doc.get("invariants", []) is Array else []
	if not suite_steps.is_empty():
		return _run_steps(pname, doc, suite_steps, asserts, CallArgs.flag(args, "report"))
	var want_det := CallArgs.flag(args, "deterministic", true)
	var has_frames := _events_have_frames(events)
	var deterministic := want_det and has_frames

	var replay: Dictionary
	if deterministic:
		replay = _replay_window(events, maxi(0, int(args.get("settle_frames", 4))), invariants)
	else:
		replay = _replay_plain(events)
	if replay.has("error"):
		return replay
	var perf: Dictionary = replay.get("perf", {}) if replay.get("perf", {}) is Dictionary else {}
	replay.erase("perf")

	var results: Array = []
	if not invariants.is_empty():
		var inv_res: Array = replay.get("invariants", []) if replay.get("invariants", []) is Array else []
		if inv_res.is_empty():
			if deterministic:
				inv_res = _invariants_unjudged(invariants, "blocked", "the game reported no invariant results (a runtime older than this editor?)")
			else:
				inv_res = _invariants_unjudged(invariants, "skip", "not checked: a non-deterministic replay has no per-frame window (the events need frame stamps 'f' and deterministic=true)")
		results.append_array(inv_res)
	replay.erase("invariants")

	var game_headless := false
	if not perf.is_empty() and _has_perf_assert(asserts):
		game_headless = _game_is_headless()

	results.append_array(_eval_all(asserts, perf, game_headless))
	var tally := tally_of(results)
	var verdict := verdict_of(int(tally["fail"]), int(tally["blocked"]))

	var out := {
		"name": pname,
		"ok": verdict == "pass",
		"verdict": verdict,
		"passed": tally["pass"],
		"failed": tally["fail"],
		"blocked": tally["blocked"],
		"skipped": tally["skip"],
		"deterministic": deterministic,
		"replay": replay,
		"asserts": results,
		"note": "game left FROZEN for stable asserts — time_control op=unfreeze to resume" + ("" if deterministic else " (non-deterministic: events had no frame stamp 'f'; re-record on 1.8+ for frame-exact replay)"),
	}
	if not perf.is_empty():
		out["perf"] = perf
		var base_wrap: Dictionary = doc.get("perf_baseline", {}) if doc.get("perf_baseline", {}) is Dictionary else {}
		var base: Dictionary = base_wrap.get("stats", {}) if base_wrap.get("stats", {}) is Dictionary else {}
		var want_save := CallArgs.flag(args, "save_baseline")
		var fp: Dictionary = _fingerprint(doc) if (not base.is_empty() or want_save) else {}
		if not base.is_empty():
			out["perf_diff"] = _perf_diff(base, perf)
			out["perf_baseline_captured"] = str(base_wrap.get("captured", ""))
			var cmp := fingerprint_compare(base_wrap.get("fingerprint"), fp)
			out["perf_baseline_comparable"] = cmp["comparable"]
			out["perf_baseline_mismatch"] = cmp["mismatch"]
			var why := comparability_note(cmp)
			if not why.is_empty():
				out["note"] = "%s %s" % [out["note"], why]
		if want_save:
			doc["perf_baseline"] = {
				"captured": Time.get_datetime_string_from_system(false, true),
				"engine": String(Engine.get_version_info().get("string", "")),
				"fingerprint": fp,
				"stats": perf,
			}
			var werr := _store(pname, doc)
			out["baseline"] = ("update failed: " + werr) if werr != "" else "saved — future runs report perf_diff vs this run"
	elif CallArgs.flag(args, "save_baseline"):
		out["baseline"] = "not saved — no perf capture (only the deterministic replay window measures; needs events with frame stamps and deterministic=true)"
	if not CallArgs.flag(args, "report"):
		return {"json": out}
	return _with_report(pname, doc, out, {
		"mode": "deterministic" if deterministic else "plain",
		"settle_frames": maxi(0, int(args.get("settle_frames", 4))),
		"events": events.size(),
	})


## v1.14 bug report: turn a run result into ONE artifact a human (or an issue tracker) can
## act on without replaying the session — the failing asserts with expected vs actual, how to
## reproduce, what the engine complained about, what perf did, and, only when the run did not pass
## (failed or blocked), a picture of the frozen frame delivered as a capture:// link rather than inline base64.
##
## Attaches the report to the run result, writes it beside the suite, and returns the handler
## dict (so the caller just `return`s it). A failure anywhere in here degrades to "the run
## result without that section" — a report is a convenience, and it must never be the reason
## a green run reads as broken.
func _with_report(pname: String, doc: Dictionary, run: Dictionary, repro_extra: Dictionary) -> Dictionary:
	var ok := bool(run.get("ok", false))
	var failures: Array = []
	for a in run.get("asserts", []):
		if a is Dictionary and ["fail", "blocked"].has(str((a as Dictionary).get("status", ""))):
			failures.append(a)
	for s in run.get("step_results", []):
		if s is Dictionary and not bool((s as Dictionary).get("ok", true)):
			failures.append(s)
	var rep := {
		"verdict": str(run.get("verdict", "pass" if ok else "fail")),
		"suite": pname,
		"when": Time.get_datetime_string_from_system(false, true),
		"engine": String(Engine.get_version_info().get("string", "")),
		"beckett": _beckett_version(),
		"totals": {
			"passed": int(run.get("passed", 0)),
			"failed": int(run.get("failed", 0)),
			"blocked": int(run.get("blocked", 0)),
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
	if run.has("perf_baseline_comparable"):
		rep["perf_baseline_comparable"] = run["perf_baseline_comparable"]
		if not (run["perf_baseline_mismatch"] as Dictionary).is_empty():
			rep["perf_baseline_mismatch"] = run["perf_baseline_mismatch"]
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
	var perr: String = PathGuard.write_path_error(path)
	if not perr.is_empty():
		return "%s: %s" % [path, perr]
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
	var invariants: Array = doc.get("invariants", []) if doc.get("invariants", []) is Array else []
	if not invariants.is_empty():
		cmd["invariants"] = invariants
	var opened := _bridge(cmd)
	if not bool(opened.get("ok", false)):
		return {"error": "ui_do window failed to open: %s" % str(opened.get("error", ""))}
	var cap_ms: int = _steps_cap_ms(doc, steps)
	var tick := func() -> Dictionary:
		var st := _bridge({"cmd": "ui_do_status"})
		if bool(st.get("timeout", false)):
			return {}
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
	var stopped_at := -1
	for k in step_results.size():
		if step_results[k] is Dictionary:
			(step_results[k] as Dictionary)["status"] = status_of(step_results[k])
			if stopped_at == -1 and str((step_results[k] as Dictionary)["status"]) != "pass":
				stopped_at = k
	var flow_done := stopped_at == -1 and step_results.size() >= steps.size()
	var steps_failed := bool(st.get("failed", false)) or not flow_done
	var _fr := _bridge({"cmd": "tc_freeze"})
	var results: Array = []
	if not invariants.is_empty():
		var inv_res: Array = st.get("invariants", []) if st.get("invariants", []) is Array else []
		if inv_res.is_empty():
			inv_res = _invariants_unjudged(invariants, "blocked", "the game reported no invariant results (a runtime older than this editor?)")
		results.append_array(inv_res)
	if flow_done:
		results.append_array(_eval_all(asserts, {}, false))
	else:
		var stop_text := "the steps flow stopped at step %d (%s)" % [stopped_at, status_of(step_results[stopped_at])] if stopped_at >= 0 else "the steps flow did not finish"
		for i in asserts.size():
			if asserts[i] is Dictionary:
				results.append({"type": str((asserts[i] as Dictionary).get("type", "")), "status": "skip", "i": i, "detail": "not evaluated: %s" % stop_text})
	var tally := tally_of(step_results + results)
	var verdict := verdict_of(int(tally["fail"]), int(tally["blocked"]))
	var out := {
		"name": pname,
		"ok": verdict == "pass",
		"verdict": verdict,
		"mode": "steps",
		"steps_completed": step_results.size(),
		"steps_total": steps.size(),
		"steps_failed": steps_failed,
		"step_results": step_results,
		"passed": tally["pass"],
		"failed": tally["fail"],
		"blocked": tally["blocked"],
		"skipped": tally["skip"],
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


## How long the editor waits for a steps flow before it gives up on the game: every step's own timeout, the stepping
## time of its inject steps, and a little room, but never more than a minute (this call holds the editor's main thread).
func _steps_cap_ms(doc: Dictionary, steps: Array) -> int:
	return mini(steps.size() * maxi(100, int(doc.get("step_timeout_ms", 5000))) + 3000 + _inject_time_ms(steps), 60000)


## The time the inject steps of a flow may spend stepping frames (UiDo.inject_budget_ms for each, at the project's
## physics rate): the game gives a step that long to finish, so the editor must not give up on the flow sooner.
func _inject_time_ms(steps: Array) -> int:
	var phys_fps: int = maxi(1, int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 60)))
	var total := 0
	for s in steps:
		if s is Dictionary and UiDo.is_inject(s):
			var body: Variant = UiDo.inject_body(s)
			var frames: Variant = (body as Dictionary).get("frames", 1) if body is Dictionary else 1
			total += UiDo.inject_budget_ms(int(frames) if (frames is int or frames is float) else 1, phys_fps, 1.0)
	return total


## Deterministic replay: open the game-side replay window and poll until it closes. The game's tick clock
## (runtime/step_clock.gd) puts each event in before the frame after its stamp, counts the frames the scene
## ran and freezes the game at the end, after one settle frame, so asserts read a settled, reproducible state.
## A window the game ended itself (it paused the tree) or that a freeze or restart cut short is an error with
## the reason, at once: those asserts would read a run that did not happen.
func _replay_window(events: Array, settle: int, invariants: Array = []) -> Dictionary:
	var open_cmd := {"cmd": "replay_open", "events": events, "settle_frames": settle}
	if not invariants.is_empty():
		open_cmd["invariants"] = invariants
	var open_r := _bridge(open_cmd)
	if not bool(open_r.get("ok", false)):
		return {"error": "replay_open failed: %s" % str(open_r.get("error", ""))}
	var end_frame := int(open_r.get("end_frame", 0))
	var phys_fps: int = maxi(1, int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 60)))
	return _replay_poll(maxi(3000, int(1000.0 * float(end_frame + 10) / float(phys_fps)) + 2000), events.size(), end_frame)


## Poll replay_status until the window closes. `cap_ms` is the wait the recording needs at the physics rate. The window runs
## one physics frame per engine frame, so a game that renders below its physics rate replays in slow motion: one still
## running frames when the wait runs out gets another cap_ms while its frame count keeps moving, up to repeat_cap_ms in all
## (the most the editor spends in one call), and only a window that stopped moving, or ran out of that, is an error.
func _replay_poll(cap_ms: int, n_events: int, end_frame: int) -> Dictionary:
	var last: Array = [{}]
	var tick := func() -> Dictionary:
		var st := _bridge({"cmd": "replay_status"})
		if bool(st.get("timeout", false)):
			return {}
		if not bool(st.get("ok", false)):
			return {"error": "replay_status failed: %s" % str(st.get("error", ""))}
		last[0] = st
		if not bool(st.get("replaying", false)):
			var term := str(st.get("terminator", "done"))
			if not term.is_empty() and term != "done":
				var why := str(st.get("note", "")).strip_edges()
				if why.is_empty():
					why = "%s after %d frame(s)" % [term.left(40), int(st.get("frames", 0))]
				return {"error": "replay stopped: %s" % why.left(240)}
			var perf: Dictionary = st.get("perf", {}) if st.get("perf", {}) is Dictionary else {}
			var closed := {"mode": "deterministic", "events": n_events, "injected": int(st.get("injected", 0)), "frames": int(st.get("frames", 0)), "perf": perf}
			var inv_list: Variant = st.get("invariants", [])
			if inv_list is Array and not (inv_list as Array).is_empty():
				closed["invariants"] = inv_list
			if not str(st.get("note", "")).is_empty():
				closed["note"] = str(st["note"]).left(400)
			return closed
		return {}
	var frames := func() -> int: return int((last[0] as Dictionary).get("frames", 0))
	var t0 := Time.get_ticks_msec()
	var r: Dictionary = MCPJobsScript.poll_while_moving(cap_ms, maxi(cap_ms, repeat_cap_ms), 16, tick, frames, Callable(server.bridge, "poll_once"))
	if r.has("timeout"):
		return {"error": "replay window did not close within %d ms (it had run %d of %d frames)" % [Time.get_ticks_msec() - t0, frames.call(), end_frame]}
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



## What op=repeat's reply says a restart resets. `deep` is whether the engine has ResourceLoader's deep reload
## (4.3+, what scene_reload uses): Godot 4.2 re-reads the scene file, but the .tres files it names come from the cache
## there (mcp_runtime.deep_replace_mode), so a change a run made to one of those carries into the next run.
static func reset_text(deep: bool) -> String:
	var head := "the current scene was restarted before every run (and once more after the last, so a following op=run starts clean), and "
	var tail := "; state outside them is not reset: autoloads, files on disk, a script's own variables that no resource saves"
	if deep:
		return head + "its resources (sub-resources, the .tres files it names) re-read from disk" + tail
	return head + "its sub-resources re-read from disk, while the .tres files it names come from the cache on this Godot (no deep reload before 4.3)" + tail


## op=repeat: run a saved suite n times back to back, through the same path op=run uses, and say how
## stable it is. One passing attempt says little about a game with any nondeterminism in it: a model
## that scores 51.7% on one attempt sits at 39.4% when it must pass five times out of five (OpenGameEval,
## arXiv 2610.02563), so beside the mean (pass_rate) the batch reports pass^k (pass_all: EVERY run
## passed), which steps flipped between runs, and where the runs first looked different.
##
## Every run starts from a freshly restarted scene (_restart_game): the second run of a suite that
## starts from what the first run left behind measures the leftovers, not the game. The batch runs
## inside ONE handler like op=run does (no await), so it is bounded by repeat_cap_ms: when the next run
## would not fit, it stops and says so (truncated) instead of freezing the editor for minutes.
func _repeat(args: Dictionary) -> Dictionary:
	if server.bridge == null or not server.bridge.is_game_connected():
		return {"error": "game not running/connected: play_scene, then wait_until condition=game_connected, then playtest op=repeat"}
	var pname := _sanitize(str(args.get("name", "")))
	var doc := _load(pname)
	if doc.has("error"):
		return doc
	var asked: Variant = args.get("n", null)
	if asked == null:
		asked = REPEAT_DEFAULT
	var n := 0
	if asked is int or asked is float:
		n = int(asked)
	elif asked is String and (asked as String).strip_edges().is_valid_int():
		n = int((asked as String).strip_edges())
	if n < 1:
		return {"error": "op=repeat: n must be a whole number from 1 to %d (default %d), got %s" % [REPEAT_MAX, REPEAT_DEFAULT, str(asked)]}
	var notes: Array = []
	if n > REPEAT_MAX:
		notes.append("n capped at %d (asked for %d)" % [REPEAT_MAX, n])
		n = REPEAT_MAX
	var real_time := _runs_in_real_time(doc, args)
	var run_args := {"name": pname}
	for k in ["deterministic", "settle_frames"]:
		if args.has(k):
			run_args[k] = args[k]
	for k in ["save_baseline", "report"]:
		if CallArgs.flag(args, k):
			notes.append("%s is ignored by repeat (a batch neither stamps a baseline nor writes a report)" % k)

	var t0 := Time.get_ticks_msec()
	var runs: Array = []
	var slowest := 0
	var truncated := false
	var stopped := ""
	var timeouts_in_a_row := 0
	for i in n:
		if i > 0 and (Time.get_ticks_msec() - t0) + int(1.25 * float(slowest)) > repeat_cap_ms:
			truncated = true
			break
		var r0 := Time.get_ticks_msec()
		var once := _repeat_once(run_args, real_time)
		slowest = maxi(slowest, Time.get_ticks_msec() - r0)
		var run: Dictionary = once.get("run", {})
		if run.is_empty():
			if runs.is_empty():
				return {"error": str(once.get("stop", "cannot restart the scene"))}
			stopped = str(once.get("stop", ""))
			break
		run["ms"] = Time.get_ticks_msec() - r0
		runs.append(run)
		if not str(once.get("stop", "")).is_empty():
			stopped = str(once["stop"])
			break
		timeouts_in_a_row = (timeouts_in_a_row + 1) if bool(once.get("timeout", false)) else 0
		if timeouts_in_a_row >= 2:
			stopped = "the game stopped answering: two runs in a row timed out (a busy or suspended game, or one stopped in the editor's debugger: get_play_state shows debugger_break; if it runs embedded, check the Game workspace's Suspend button)"
			break

	if stopped.is_empty():
		var left := _restart_game(real_time, "", "op=repeat")
		if left.has("error"):
			notes.append("the scene could not be restarted at the end (%s): stop_scene + play_scene before the next op=run" % str(left["error"]).left(160))

	var agg := aggregate(runs)
	var done := int(agg["runs"])
	var out := {
		"name": pname,
		"requested": n,
		"runs": done,
		"mode": str((runs[0] as Dictionary).get("mode", "")),
		"passes": agg["passes"],
		"fails": agg["fails"],
		"blocked": agg["blocked"],
		"pass_rate": agg["pass_rate"],
		"pass_all": done == n and int(agg["passes"]) == n,
		"verdict": verdict_of(int(agg["fails"]), int(agg["blocked"])),
		"outcomes": agg["outcomes"],
		"steps": agg["steps"],
		"flaky_steps": agg["flaky_steps"],
		"first_divergence": agg["first_divergence"],
		"reset": reset_text(ClassDB.class_has_integer_constant("ResourceLoader", "CACHE_MODE_REPLACE_DEEP")),
		"elapsed_ms": Time.get_ticks_msec() - t0,
	}
	if not (agg["flaky_blocked"] as Array).is_empty():
		out["flaky_blocked"] = agg["flaky_blocked"]
	var run_errors: Array = []
	for k in runs.size():
		if not str((runs[k] as Dictionary).get("reason", "")).is_empty():
			run_errors.append({"run": k + 1, "error": str((runs[k] as Dictionary)["reason"])})
	if not run_errors.is_empty():
		out["run_errors"] = run_errors
	if truncated:
		out["truncated"] = true
		notes.append("stopped after %d of %d runs: the next one would not fit the %d s the editor may spend in one call (a run takes ~%d ms) - shorten the suite, or call again for another batch" % [done, n, int(repeat_cap_ms / 1000.0), slowest])
	if not stopped.is_empty():
		out["aborted"] = stopped
	if not notes.is_empty():
		out["note"] = ". ".join(notes)
	return {"json": out}


## Does this suite run in real time, so a restarted game has to be UNfrozen for it? Only the deterministic
## replay window unpauses the game itself (at its first frame); a steps flow and a plain (back-to-back)
## replay run in real time.
func _runs_in_real_time(doc: Dictionary, args: Dictionary) -> bool:
	var doc_steps: Variant = doc.get("steps", [])
	var steps_suite: bool = doc_steps is Array and not (doc_steps as Array).is_empty()
	var doc_events: Variant = doc.get("events", [])
	var frame_window: bool = not steps_suite and CallArgs.flag(args, "deterministic", true) and doc_events is Array and _events_have_frames(doc_events as Array)
	return not frame_window


## One member of a batch: restart the scene (the suite's own when `scene` is given), then run the suite
## the way op=run does. Returns {run} (a run_summary, or a blocked one when the run itself errored), plus
## {stop} when the batch cannot go on (the game connection is gone), or only {stop} when the restart failed
## and no run took place.
##
## `arrange` (op=mutate) is called on the fresh, still FROZEN game, before the run starts: it puts a fault
## in. {error} from it means the fault could not be applied, and then nothing runs: {skip: why}.
func _repeat_once(run_args: Dictionary, unfreeze: bool, scene: String = "", arrange: Callable = Callable(), who: String = "op=repeat") -> Dictionary:
	var arranged := arrange.is_valid()
	var up := _restart_game(unfreeze and not arranged, scene, who)
	if up.has("error"):
		return {"stop": str(up["error"])}
	if arranged:
		var fault: Dictionary = arrange.call()
		if fault.has("error"):
			return {"skip": str(fault["error"])}
		if unfreeze:
			_bridge({"cmd": "tc_unfreeze"})
	_after_restart = true
	var r := _run(run_args)
	_after_restart = false
	if r.has("error"):
		var why := str(r["error"])
		var res := {"run": {"verdict": "blocked", "units": [], "reason": why.left(BREAK_REASON_CAP if is_break(why) else 240)}}
		if is_disconnect(why):
			res["stop"] = "the game connection was lost during the batch (%s)" % why.left(160)
		elif is_break(why):
			res["stop"] = why.left(BREAK_REASON_CAP)
		elif why.contains("runtime timeout"):
			res["timeout"] = true
		return res
	return {"run": run_summary(r["json"] as Dictionary)}


## Start the current scene over from its file (or, with `scene`, switch the game to that scene), frozen, and
## wait until the new scene is up. A run that goes in real time (a steps flow, or a plain back-to-back
## replay) is unfrozen afterwards; a deterministic replay is not (its window unpauses at its first frame, so
## the scene never runs a frame before the replay says so). {} when the scene is back, else {error} saying
## why and what to do instead. `who` names the op in that advice.
func _restart_game(unfreeze: bool, scene: String = "", who: String = "op=repeat") -> Dictionary:
	var instead := "%s restarts the scene before every run so each starts clean; if this game cannot be restarted that way, stop_scene + play_scene and use op=run for each attempt" % who
	var cmd := {"cmd": "scene_reload"}
	if not scene.is_empty():
		cmd["scene"] = scene
	var r := _bridge_reload(cmd)
	if not bool(r.get("ok", false)) and str(r.get("error", "")).contains("runtime timeout"):
		r = _bridge_reload(cmd)
	var in_flight := not bool(r.get("ok", false)) and bool(r.get("pending", false))
	if not bool(r.get("ok", false)) and not in_flight:
		var why := str(r.get("error", "scene_reload failed"))
		if is_break(why):
			return {"error": why}
		return {"error": "cannot restart the scene between runs: %s. %s" % [why, instead]}
	var waited := _await_scene(0 if in_flight else int(r.get("old_id", 0)), instead)
	if waited.has("error"):
		return waited
	if in_flight and not scene.is_empty():
		r = _bridge_reload(cmd)
		if not bool(r.get("ok", false)):
			return {"error": "cannot restart the scene between runs: %s. %s" % [str(r.get("error", "scene_reload failed")), instead]}
		waited = _await_scene(int(r.get("old_id", 0)), instead)
		if waited.has("error"):
			return waited
	if unfreeze:
		_bridge({"cmd": "tc_unfreeze"})
	return {}


## Wait until the game reports a ready scene other than `old_id` (0: any ready scene). {} when it is up,
## else {error}.
func _await_scene(old_id: int, instead: String) -> Dictionary:
	var tick := func() -> Dictionary:
		var s := _bridge({"cmd": "scene_state"})
		if not bool(s.get("ok", false)):
			var why := str(s.get("error", "scene_state failed"))
			if why.contains("runtime timeout"):
				return {}
			return {"error": why}
		var sid := int(s.get("id", 0))
		if sid != 0 and sid != old_id and bool(s.get("ready", false)):
			return {"up": true}
		return {}
	var p: Dictionary = MCPJobsScript.poll_until(restart_cap_ms, 15, tick, Callable(server.bridge, "poll_once"))
	if p.has("error"):
		return {"error": "the restarted scene could not be read: %s" % str(p["error"])}
	if p.has("timeout"):
		return {"error": "the scene did not come back within %d ms of the restart. %s" % [restart_cap_ms, instead]}
	return {}



## A whole-number argument from a client that may send it as text: {value, capped} or {error}. Absent or
## null is the default; a number past `hi` is capped (and the caller says so), one below `lo` is refused.
func _count_arg(args: Dictionary, key: String, default: int, lo: int, hi: int, who: String) -> Dictionary:
	var asked: Variant = args.get(key, null)
	if asked == null:
		return {"value": default, "capped": false}
	var n := 0
	var whole := false
	if asked is int:
		n = asked
		whole = true
	elif asked is float and is_finite(asked) and asked == floorf(asked):
		n = int(asked)
		whole = true
	elif asked is String and (asked as String).strip_edges().is_valid_int():
		n = int((asked as String).strip_edges())
		whole = true
	if not whole or n < lo:
		return {"error": "%s: %s must be a whole number from %d%s, got %s" % [who, key, lo, (" to %d" % hi) if hi < 1000000 else " up", str(asked).left(40)]}
	return {"value": mini(n, hi), "capped": n > hi}


## A scene a suite names, as the game can be asked to play it: "" for none (the suite runs on the scene that
## is running) or the path, else {error} when it is not a scene of this project.
func _suite_scene(doc: Dictionary) -> Dictionary:
	var scene := str(doc.get("scene", "")).strip_edges()
	if scene.is_empty():
		return {"scene": ""}
	var bad: String = PathGuard.check_read(scene).get("error", "")
	if bad.is_empty() and not (scene.begins_with("res://") or scene.begins_with("user://")):
		bad = "it must be a res:// or user:// path"
	if bad.is_empty() and not ResourceLoader.exists(scene):
		bad = "that file does not exist"
	if not bad.is_empty():
		return {"error": "the suite's scene '%s' cannot be played: %s" % [scene.left(160), bad.left(200)]}
	return {"scene": scene}


## Every saved suite's name, in name order: {names} or {error} (the folder is refused by the read guard). A
## report written beside a suite (<name>.report.json) is not one, and neither is a file whose name op=save
## would never have made (its stem could not be loaded by name).
func _suite_names() -> Dictionary:
	var guard: Dictionary = PathGuard.check_read(PLAYTEST_DIR)
	if guard.has("error"):
		return guard
	var names: Array = []
	var odd: Array = []
	var dir := DirAccess.open(PLAYTEST_DIR)
	if dir != null:
		dir.list_dir_begin()
		var e := dir.get_next()
		while e != "":
			if not dir.current_is_dir() and e.get_extension() == "json" and not e.ends_with(".report.json"):
				var stem := e.get_basename()
				if _sanitize(stem) == stem:
					names.append(stem)
				else:
					odd.append(e)
			e = dir.get_next()
		dir.list_dir_end()
	names.sort()
	return {"names": names, "odd": odd}



## op=mutate: would this suite notice if the game were wrong? Run it clean once, then rerun it with ONE
## fault put in at the start of each fresh replay, and see which faults it catches (the suite fails or goes
## blocked: KILLED) and which it passes on anyway (SURVIVED: an assertion that cannot fail for that fault).
## What the faults are, and why they come from what the suite names, is in playtest_mutate.gd.
##
## A suite that does not pass clean is refused: every fault would "kill" it, and that proves nothing. A fault
## goes in through the same game-side write path as the inject step (runtime `set`: value coercion, read
## back) on the freshly restarted, still frozen scene, so it lands before the first frame of the replay; the
## scene is restarted again before the next one, and a property changed outside the scene (an autoload,
## which a restart does not reset) is written back. Bounded like op=repeat: `max` faults and the editor's
## time budget, with `from` to carry on in the next call.
func _mutate(args: Dictionary) -> Dictionary:
	if server.bridge == null or not server.bridge.is_game_connected():
		return {"error": "game not running/connected: play_scene, then wait_until condition=game_connected, then playtest op=mutate"}
	var pname := _sanitize(str(args.get("name", "")))
	var doc := _load(pname)
	if doc.has("error"):
		return doc
	var max_r := _count_arg(args, "max", MUTATE_DEFAULT, 1, MUTATE_MAX, "op=mutate")
	if max_r.has("error"):
		return max_r
	var from_r := _count_arg(args, "from", 0, 0, 1000000, "op=mutate")
	if from_r.has("error"):
		return from_r
	var notes: Array = []
	if bool(max_r["capped"]):
		notes.append("max capped at %d" % MUTATE_MAX)
	var tg := Mutate.targets_of(doc)
	if (tg["props"] as Array).is_empty() and (tg["nodes"] as Array).is_empty():
		return {"error": "op=mutate: the suite names no node or property to fault (its asserts, invariants and steps read nothing from the game), so there is nothing to check. Add node_state / expr asserts that read the game's state, then mutate it again"}
	if (tg["props"] as Array).size() > Mutate.MAX_PROPS or (tg["nodes"] as Array).size() > Mutate.MAX_NODES:
		notes.append("only the first %d properties and %d nodes the suite names were considered" % [Mutate.MAX_PROPS, Mutate.MAX_NODES])
	var sc := _suite_scene(doc)
	if sc.has("error"):
		return {"error": "op=mutate: %s" % str(sc["error"])}
	var scene: String = sc["scene"]
	var run_args := {"name": pname}
	for k in ["deterministic", "settle_frames"]:
		if args.has(k):
			run_args[k] = args[k]
	var real_time := _runs_in_real_time(doc, args)
	var t0 := Time.get_ticks_msec()

	var clean := _repeat_once(run_args, real_time, scene, Callable(), "op=mutate")
	if not clean.has("run"):
		return {"error": "op=mutate: could not start the clean run: %s" % str(clean.get("stop", "the scene would not restart"))}
	var crun: Dictionary = clean["run"]
	var slowest := Time.get_ticks_msec() - t0
	if str(crun["verdict"]) != "pass":
		var why := Mutate.first_problem(crun.get("units", []) if crun.get("units", []) is Array else [])
		if why.is_empty():
			why = str(crun.get("reason", "no detail"))
		return {"error": "op=mutate: the suite does not pass on its own (verdict %s: %s), so a fault result would mean nothing. Make it pass first (playtest op=run), then mutate it. If op=run passes, the suite is not stable: playtest op=repeat shows which step flips" % [str(crun["verdict"]), why.left(200)]}

	var up := _restart_game(false, scene, "op=mutate")
	if up.has("error"):
		return {"error": "op=mutate: %s" % str(up["error"])}
	var cands := _mutation_candidates(tg, scene)
	var plan := Mutate.plan(cands)
	var dropped: Array = cands["dropped"]
	if plan.is_empty():
		var why_none: Array = []
		for d in dropped.slice(0, 3):
			why_none.append("%s: %s" % [str(d["target"]), str(d["why"])])
		var detail := (" (" + "; ".join(PackedStringArray(why_none)) + ")") if not why_none.is_empty() else ""
		return {"error": "op=mutate: nothing the suite names can be faulted%s. Only numbers, bools, a node's process_mode and a scene's declared connections are tried" % detail}

	var start := int(from_r["value"])
	var window: Array = plan.slice(start, start + int(max_r["value"]))
	var caught: Array = []
	var survivors: Array = []
	var skipped: Array = []
	var stopped := ""
	var truncated := false
	var tried := 0
	var timeouts_in_a_row := 0
	for k in window.size():
		if k > 0 and (Time.get_ticks_msec() - t0) + int(1.25 * float(slowest)) > repeat_cap_ms:
			truncated = true
			break
		var m: Dictionary = window[k]
		var undo := {}
		var r0 := Time.get_ticks_msec()
		var once := _repeat_once(run_args, real_time, scene, Callable(self, "_apply_mutant").bind(m, undo), "op=mutate")
		slowest = maxi(slowest, Time.get_ticks_msec() - r0)
		_revert_mutant(undo)
		tried = k + 1
		if once.has("skip"):
			skipped.append({"target": m["target"], "operator": m["operator"], "why": "could not be applied: " + str(once["skip"]).left(160)})
			continue
		if not once.has("run"):
			stopped = str(once.get("stop", "cannot restart the scene"))
			tried = k
			break
		var run: Dictionary = once["run"]
		var verdict := Mutate.outcome_of(run)
		if verdict == "inconclusive":
			skipped.append({"target": m["target"], "operator": m["operator"], "why": "inconclusive, the run did not finish: " + str(run.get("reason", "no detail")).left(160)})
		elif verdict == "killed":
			caught.append({"target": m["target"], "operator": m["operator"], "change": m["change"], "by": Mutate.first_problem(run.get("units", []), m["reads"])})
		else:
			survivors.append({"target": m["target"], "operator": m["operator"], "change": m["change"], "reads": m["reads"], "hint": Mutate.hint_of(m)})
		if not str(once.get("stop", "")).is_empty():
			stopped = str(once["stop"])
			tried = k
			break
		timeouts_in_a_row = (timeouts_in_a_row + 1) if bool(once.get("timeout", false)) else 0
		if timeouts_in_a_row >= 2:
			stopped = "the game stopped answering: two runs in a row timed out (a busy or suspended game, or one stopped in the editor's debugger: get_play_state shows debugger_break; if it runs embedded, check the Game workspace's Suspend button)"
			break

	var left := _restart_game(false, scene, "op=mutate")
	if left.has("error"):
		notes.append("the scene could not be restarted at the end (%s): stop_scene + play_scene before the next run" % str(left["error"]).left(160))
	var total := caught.size() + survivors.size()
	var next := start + tried
	var out := {
		"name": pname,
		"clean": "pass",
		"planned": plan.size(),
		"total": total,
		"killed": caught.size(),
		"survived": survivors.size(),
		"score": Mutate.score_of(caught.size(), survivors.size()),
		"survivors": survivors,
		"caught": caught,
		"not_run": maxi(0, plan.size() - next),
		"restored": "the scene was restarted after the last fault; a property changed outside the scene (an autoload) was written back",
		"elapsed_ms": Time.get_ticks_msec() - t0,
	}
	if next < plan.size():
		out["next_from"] = next
	if not skipped.is_empty() or not dropped.is_empty():
		var why_not: Array = skipped.duplicate()
		for d in dropped:
			why_not.append({"target": d["target"], "why": d["why"]})
		out["skipped"] = why_not.slice(0, 20)
	if truncated:
		out["truncated"] = true
		notes.append("stopped after %d of the %d faults asked for: the next one would not fit the %d s the editor may spend in one call (a run takes ~%d ms) - call again with from=%d" % [tried, window.size(), int(repeat_cap_ms / 1000.0), slowest, next])
	if not stopped.is_empty():
		out["aborted"] = stopped
	if window.is_empty():
		notes.append("from=%d is past the last of the %d faults" % [start, plan.size()])
	if total == 0:
		notes.append("no fault was judged, so there is no score")
	if not notes.is_empty():
		out["note"] = ". ".join(notes)
	return {"json": out}


## The start-of-scene values the faults are built from, read from the game: every property the suite names
## (kept when it is a number or a bool) and every node's process_mode, plus the one declared connection.
## {props, nodes, connection, dropped}; `dropped` says why a name produced no fault.
func _mutation_candidates(tg: Dictionary, scene: String) -> Dictionary:
	var props: Array = []
	var nodes: Array = []
	var dropped: Array = []
	var prop_at := {}
	var node_at := {}
	for p in (tg["props"] as Array).slice(0, Mutate.MAX_PROPS):
		var r := _bridge({"cmd": "get", "path": p["node"], "prop": p["property"]})
		var label := Mutate.label_of(str(p["node"]), str(p["property"]))
		if not bool(r.get("ok", false)):
			dropped.append({"target": label, "why": str(r.get("error", "could not be read")).left(120)})
			continue
		var v: Variant = r.get("value")
		if Mutate.operators_for(v).is_empty():
			dropped.append({"target": label, "why": "not a number or a bool (%s), so there is nothing to flip or zero" % str(v).left(30)})
			continue
		var pkey := "%s\n%s" % [str(r.get("resolved", p["node"])), str(p["property"])]
		if prop_at.has(pkey):
			Mutate.add_reads((props[int(prop_at[pkey])] as Dictionary)["reads"], p["reads"])
			continue
		prop_at[pkey] = props.size()
		props.append({"node": p["node"], "property": p["property"], "reads": (p["reads"] as Array).duplicate(), "value": v})
	for n in (tg["nodes"] as Array).slice(0, Mutate.MAX_NODES):
		var r := _bridge({"cmd": "get", "path": n["node"], "prop": "process_mode"})
		if not bool(r.get("ok", false)):
			dropped.append({"target": str(n["node"]), "why": str(r.get("error", "could not be read")).left(120)})
			continue
		var nkey := str(r.get("resolved", n["node"]))
		if node_at.has(nkey):
			Mutate.add_reads((nodes[int(node_at[nkey])] as Dictionary)["reads"], n["reads"])
			continue
		node_at[nkey] = nodes.size()
		nodes.append({"node": n["node"], "reads": (n["reads"] as Array).duplicate(), "process_mode": int(r.get("value", 0))})
	return {"props": props, "nodes": nodes, "connection": Mutate.connection_of(scene, tg["nodes"]), "dropped": dropped}


## Put one fault into the fresh, frozen game. {} when it is in, {error} when the game would not take it (a
## fault that cannot be applied is skipped, never counted as caught or survived). `undo` receives what
## _revert_mutant needs to put a property back.
func _apply_mutant(m: Dictionary, undo: Dictionary) -> Dictionary:
	if str(m["kind"]) == "disconnect":
		var c := {"source": m["node"], "signal": m["signal"], "target": m["to_node"], "method": m["method"]}
		var before := _bridge({"cmd": "eval", "expr": Mutate.connected_expr(c)})
		if not bool(before.get("ok", false)) or before.get("value") != true:
			return {"error": "the connection is not there in the running scene (%s)" % str(before.get("error", "not connected")).left(100)}
		var cut := _bridge({"cmd": "eval", "expr": Mutate.disconnect_expr(c)})
		if not bool(cut.get("ok", false)):
			return {"error": "the game refused the disconnect: %s" % str(cut.get("error", "")).left(120)}
		var after := _bridge({"cmd": "eval", "expr": Mutate.connected_expr(c)})
		if not bool(after.get("ok", false)) or after.get("value") != false:
			return {"error": "the disconnect did not take effect"}
		return {}
	var r := _bridge({"cmd": "set", "path": m["node"], "prop": m["property"], "value": m["to"]})
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "the write was refused")).left(160)}
	undo["path"] = m["node"]
	undo["prop"] = m["property"]
	undo["value"] = r.get("before", m["from"])
	return {}


## Write a faulted property back (best effort: the node may be gone by now, and a scene node is replaced by
## the next restart anyway). It matters for what a restart does not reset: an autoload.
func _revert_mutant(undo: Dictionary) -> void:
	if undo.is_empty():
		return
	_bridge({"cmd": "set", "path": undo["path"], "prop": undo["prop"], "value": undo["value"]})



## op=run_all: every saved suite in name order, each from a restart of its own scene (so one play_scene is
## enough, not one per suite), or with since=<git ref> only the suites a change can reach. compare=true runs
## everything and then says which suites selection would have skipped and whether any of them failed.
## Selection lives in playtest_select.gd; the run is op=repeat's, one run per suite, with the same editor
## time budget (a long list stops early and says where to carry on).
func _run_all(args: Dictionary) -> Dictionary:
	var since_v: Variant = args.get("since", null)
	var since := "" if since_v == null else str(since_v).strip_edges()
	var compare := CallArgs.flag(args, "compare")
	if compare and since.is_empty():
		return {"error": "op=run_all: compare=true needs since=<git ref>: it measures what selecting by that ref would have skipped"}
	var from_r := _count_arg(args, "from", 0, 0, 1000000, "op=run_all")
	if from_r.has("error"):
		return from_r
	var listed := _suite_names()
	if listed.has("error"):
		return listed
	var names: Array = listed["names"]
	var notes: Array = []
	if not (listed["odd"] as Array).is_empty():
		notes.append("%d file(s) in %s are not suites op=save could have written (a name outside A-Z a-z 0-9 _ -) and were left out" % [(listed["odd"] as Array).size(), PLAYTEST_DIR])

	var selection: Dictionary = {}
	if not since.is_empty():
		selection = _select_suites(since, names)
		if selection.has("error"):
			return selection
	var chosen: Array = names if (since.is_empty() or compare) else selection["selected"]
	var start := int(from_r["value"])
	var to_run: Array = chosen.slice(start)
	var out := {"total": chosen.size(), "ran": 0}
	if not since.is_empty():
		out["selection"] = _selection_reply(selection)
	if to_run.is_empty():
		out["verdict"] = "pass"
		out["ok"] = true
		out["suites"] = []
		if names.is_empty():
			notes.append("no saved suites")
		elif start > 0:
			notes.append("from=%d is past the last suite" % start)
		else:
			notes.append("nothing was run: no suite is reachable from the change")
		out["note"] = ". ".join(notes)
		return {"json": out}
	if server.bridge == null or not server.bridge.is_game_connected():
		return {"error": "game not running/connected: play_scene, then wait_until condition=game_connected, then playtest op=run_all"}

	var run_args := {}
	for k in ["deterministic", "settle_frames"]:
		if args.has(k):
			run_args[k] = args[k]
	var found := _bridge({"cmd": "scene_state"})
	var start_scene := str(found.get("scene", "")) if bool(found.get("ok", false)) else ""
	var t0 := Time.get_ticks_msec()
	var results: Array = []
	var slowest := 0
	var truncated := false
	var stopped := ""
	var retry_at := -1
	var timeouts_in_a_row := 0
	for i in to_run.size():
		if i > 0 and (Time.get_ticks_msec() - t0) + int(1.25 * float(slowest)) > repeat_cap_ms:
			truncated = true
			break
		var s0 := Time.get_ticks_msec()
		var one := _run_suite_fresh(str(to_run[i]), run_args, args)
		slowest = maxi(slowest, Time.get_ticks_msec() - s0)
		one["entry"]["ms"] = Time.get_ticks_msec() - s0
		results.append(one["entry"])
		if not str(one.get("stop", "")).is_empty():
			stopped = str(one["stop"])
			retry_at = start + i
			break
		timeouts_in_a_row = (timeouts_in_a_row + 1) if bool(one.get("timeout", false)) else 0
		if timeouts_in_a_row >= 2:
			stopped = "the game stopped answering: two runs in a row timed out (a busy or suspended game, or one stopped in the editor's debugger: get_play_state shows debugger_break; if it runs embedded, check the Game workspace's Suspend button)"
			break

	if stopped.is_empty():
		var back := _restart_game(false, start_scene, "op=run_all")
		if back.has("error"):
			notes.append("the scene could not be restarted at the end (%s): stop_scene + play_scene before the next op=run" % str(back["error"]).left(160))

	var passed := 0
	var failed := 0
	var blocked := 0
	var verdicts := {}
	for e in results:
		verdicts[str(e["name"])] = str(e["verdict"])
		match str(e["verdict"]):
			"pass": passed += 1
			"fail": failed += 1
			_: blocked += 1
	var verdict := verdict_of(failed, blocked)
	var next := retry_at if retry_at >= 0 else start + results.size()
	out["ran"] = results.size()
	out["passed"] = passed
	out["failed"] = failed
	out["blocked"] = blocked
	out["verdict"] = verdict
	out["ok"] = verdict == "pass" and not truncated and stopped.is_empty()
	out["suites"] = results.slice(0, SUITES_SHOWN)
	if results.size() > SUITES_SHOWN:
		notes.append("%d more suites ran than are listed here (the counts cover all of them; the ones that did not pass come first)" % (results.size() - SUITES_SHOWN))
		out["suites"] = _worst_first(results).slice(0, SUITES_SHOWN)
	out["elapsed_ms"] = Time.get_ticks_msec() - t0
	if next < chosen.size():
		out["next_from"] = next
	if compare:
		out["compare"] = _compare_reply(selection, verdicts, since)
	if truncated:
		out["truncated"] = true
		notes.append("stopped after %d of %d suites: the next one would not fit the %d s the editor may spend in one call (a suite takes ~%d ms) - call again with from=%d" % [results.size(), to_run.size(), int(repeat_cap_ms / 1000.0), slowest, next])
	if not stopped.is_empty():
		out["aborted"] = stopped
	if not notes.is_empty():
		out["note"] = ". ".join(notes)
	return {"json": out}


## One suite of a run_all, from a restart of its own scene: {entry, stop?, timeout?}. The entry is the
## suite's line in the reply; a suite that could not be started (its scene is missing, the file does not
## load) is blocked with the reason, and the batch goes on. `stop` is set only when the game is gone.
func _run_suite_fresh(name: String, run_args: Dictionary, args: Dictionary) -> Dictionary:
	var entry := {"name": name, "verdict": "blocked"}
	var doc := _load(name)
	if doc.has("error"):
		entry["problem"] = str(doc["error"]).left(200)
		return {"entry": entry}
	var sc := _suite_scene(doc)
	entry["scene"] = str(doc.get("scene", "")).left(200)
	if sc.has("error"):
		entry["problem"] = str(sc["error"]).left(200)
		return {"entry": entry}
	var ra := run_args.duplicate()
	ra["name"] = name
	var once := _repeat_once(ra, _runs_in_real_time(doc, args), str(sc["scene"]), Callable(), "op=run_all")
	var res := {"entry": entry}
	if not once.has("run"):
		var why := str(once.get("stop", "cannot restart the scene"))
		entry["problem"] = why.left(BREAK_REASON_CAP if is_break(why) else 200)
		if is_disconnect(why):
			res["stop"] = "the game connection was lost during the batch (%s)" % why.left(160)
		elif is_break(why):
			res["stop"] = why.left(BREAK_REASON_CAP)
		elif why.contains("runtime timeout"):
			res["timeout"] = true
		return res
	var run: Dictionary = once["run"]
	var units: Array = run.get("units", []) if run.get("units", []) is Array else []
	var tally := tally_of(units)
	entry["verdict"] = str(run["verdict"])
	entry["mode"] = str(run.get("mode", ""))
	entry["passed"] = tally["pass"]
	entry["failed"] = tally["fail"]
	entry["blocked"] = tally["blocked"]
	entry["skipped"] = tally["skip"]
	if str(run["verdict"]) != "pass":
		var problem := Mutate.first_problem(units)
		entry["problem"] = (problem if not problem.is_empty() else str(run.get("reason", "no detail"))).left(200)
	if not str(once.get("stop", "")).is_empty():
		res["stop"] = str(once["stop"])
	elif bool(once.get("timeout", false)):
		res["timeout"] = true
	return res


## The suites that did not pass, then the ones that did, each group in name order: what a reply that cannot
## list every suite should show first.
func _worst_first(results: Array) -> Array:
	var bad: Array = []
	var good: Array = []
	for e in results:
		(good if str(e["verdict"]) == "pass" else bad).append(e)
	return bad + good


## What git says, and what that selects: {error} when the ref or git is unusable, else the selection (see
## playtest_select.gd). Reads each suite's scene closure, so it is the one slow part of a since= call.
func _select_suites(since: String, names: Array) -> Dictionary:
	var bad := Select.ref_error(since)
	if not bad.is_empty():
		return {"error": "op=run_all: since: %s" % bad}
	var project_dir := ProjectSettings.globalize_path("res://")
	var changed: Dictionary = changed_files_fn.call(project_dir, since) if changed_files_fn.is_valid() else Select.changed_files(project_dir, since)
	if changed.has("error"):
		return {"error": "op=run_all: %s" % str(changed["error"])}
	var classes := Select.global_classes()
	var memo := {}
	var guard_memo := {}
	var infos: Array = []
	for n in names:
		var path := "%s/%s.json" % [PLAYTEST_DIR, n]
		var doc := _load(str(n))
		if doc.has("error"):
			infos.append({"name": n, "deps": null, "own": [path]})
			continue
		var d := Select.suite_deps(doc, path, classes, memo, guard_memo)
		infos.append({"name": n, "deps": d["deps"], "own": d["own"]})
	var sel := Select.select(changed["files"], infos, Select.closure(Select.global_roots(), classes, memo, guard_memo), bool(changed.get("capped", false)))
	sel["since"] = since
	return sel


## The selection as a reply carries it: the lists in full, the reasons for the first SUITES_SHOWN suites.
func _selection_reply(sel: Dictionary) -> Dictionary:
	var reasons := {}
	var shown := 0
	for n in (sel["selected"] as Array) + (sel["skipped"] as Array):
		if shown >= SUITES_SHOWN:
			break
		reasons[str(n)] = sel["reasons"][n]
		shown += 1
	var out := {"since": sel["since"], "mode": sel["mode"], "changed": sel["changed"], "ignored": sel["ignored"],
		"selected": sel["selected"], "skipped": sel["skipped"], "reasons": reasons}
	if not str(sel.get("why", "")).is_empty():
		out["why"] = sel["why"]
	if int(sel.get("unreached_count", 0)) > 0:
		out["unreached"] = sel["unreached"]
		out["unreached_count"] = sel["unreached_count"]
	return out


## compare=true's answer: of the suites selection would have skipped, how many failed in the full run.
func _compare_reply(sel: Dictionary, verdicts: Dictionary, since: String) -> Dictionary:
	var c := Select.compare(sel, verdicts)
	var fn := int(c["false_negatives"])
	var note := ""
	if str(sel.get("mode", "")) == "all":
		note = "selection chose ALL suites (%s), so it would have skipped nothing" % str(sel.get("why", "")).left(120)
	elif int(c["would_skip"]) == 0:
		note = "selection would have skipped nothing"
	elif fn > 0:
		note = "%d suite(s) selection would have skipped FAILED: either the change reaches them in a way the dependency list cannot see (a path built at runtime), or they were already red before it (rerun on %s to tell)" % [fn, since.left(40)]
	elif int(c["checked"]) < int(c["would_skip"]):
		note = "none of the %d skipped suites that ran failed; %d more were not reached in this call" % [int(c["checked"]), int(c["would_skip"]) - int(c["checked"])]
	else:
		note = "selection would have skipped %d suite(s) and none of them failed: no false negative for this change" % int(c["would_skip"])
	c["since"] = since
	c["note"] = note
	return c


## One run's result as the batch sees it: its verdict, its mode, and a flat list of UNITS (every
## invariant, steps-flow step and assert, in the order they happened) each with a status and the detail
## the game gave. Pure, so the unit suite pins it.
static func run_summary(out: Dictionary) -> Dictionary:
	var units: Array = []
	var asserts: Array = out.get("asserts", []) if out.get("asserts", []) is Array else []
	for a in asserts:
		if a is Dictionary and str((a as Dictionary).get("type", "")) == "invariant":
			units.append(_unit("invariant:%s" % str((a as Dictionary).get("name", "")).left(60), "invariant", a))
	var step_results: Array = out.get("step_results", []) if out.get("step_results", []) is Array else []
	for k in step_results.size():
		if step_results[k] is Dictionary:
			var s: Dictionary = step_results[k]
			units.append(_unit("steps[%d]" % int(s.get("step", k)), str(s.get("op", "step")), s))
	var pos := 0
	for a in asserts:
		if not (a is Dictionary) or str((a as Dictionary).get("type", "")) == "invariant":
			continue
		units.append(_unit("asserts[%d]" % int((a as Dictionary).get("i", pos)), str((a as Dictionary).get("type", "")), a))
		pos += 1
	var mode := "steps" if str(out.get("mode", "")) == "steps" else ("deterministic" if bool(out.get("deterministic", false)) else "plain")
	return {"verdict": str(out.get("verdict", "pass" if bool(out.get("ok", false)) else "fail")), "mode": mode, "units": units}


static func _unit(id: String, type: String, item: Dictionary) -> Dictionary:
	return {"id": id, "type": type.left(40), "status": status_of(item), "detail": str(item.get("detail", item.get("error", ""))).left(200)}


## The numbers of a batch from its runs ([{verdict, units}] in run order). Pure.
##  - passes / fails / blocked count RUNS by their verdict; pass_rate is the mean.
##  - steps: for every unit, how many runs ended pass / fail / blocked / skip, with one example detail
##    of each non-passing outcome.
##  - flaky_steps: units whose outcome FLIPPED between consecutive runs between pass and fail, most flips
##    first; flaky_blocked ranks flips to or from blocked apart (a node that is sometimes missing is not
##    the same finding as a value that is sometimes wrong). A skip is no judgement and flips nothing.
##  - first_divergence: the first unit (in step order) whose observed result differs from run 1's, with
##    both details; null when every run looked the same. It compares what the game SAID (status plus
##    detail), so it catches a failing assert that fails with a different value each run, which no
##    outcome count can. A perf unit compares by status only (its numbers differ every run).
static func aggregate(runs: Array) -> Dictionary:
	var n := runs.size()
	var passes := 0
	var fails := 0
	var blocked := 0
	var outcomes: Array = []
	for r in runs:
		var v := str((r as Dictionary).get("verdict", "fail"))
		outcomes.append(v)
		if v == "pass":
			passes += 1
		elif v == "blocked":
			blocked += 1
		else:
			fails += 1
	var order: Array = []
	var stats := {}
	for r in runs:
		for u in (r as Dictionary).get("units", []):
			var ud: Dictionary = u
			var id := str(ud["id"])
			if not stats.has(id):
				stats[id] = {"type": str(ud["type"]), "counts": {}, "seq": [], "examples": {}}
				order.append(id)
			var st: Dictionary = stats[id]
			var s := str(ud["status"])
			var counts: Dictionary = st["counts"]
			counts[s] = int(counts.get(s, 0)) + 1
			if s != "skip":
				(st["seq"] as Array).append(s)
			if s != "pass" and not (st["examples"] as Dictionary).has(s):
				(st["examples"] as Dictionary)[s] = str(ud["detail"])
	var steps: Array = []
	var flaky: Array = []
	var flaky_blocked: Array = []
	for pos in order.size():
		var id := str(order[pos])
		var st: Dictionary = stats[id]
		var seq: Array = st["seq"]
		var fail_flips := 0
		var blocked_flips := 0
		for k in range(1, seq.size()):
			if seq[k] == seq[k - 1]:
				continue
			if seq[k] == "blocked" or seq[k - 1] == "blocked":
				blocked_flips += 1
			else:
				fail_flips += 1
		var entry := {"step": id, "type": st["type"], "outcomes": st["counts"]}
		if not (st["examples"] as Dictionary).is_empty():
			entry["examples"] = st["examples"]
		steps.append(entry)
		if fail_flips > 0:
			flaky.append({"step": id, "type": st["type"], "flips": fail_flips, "outcomes": st["counts"], "examples": st["examples"], "pos": pos})
		if blocked_flips > 0:
			flaky_blocked.append({"step": id, "type": st["type"], "flips": blocked_flips, "outcomes": st["counts"], "examples": st["examples"], "pos": pos})
	for list in [flaky, flaky_blocked]:
		(list as Array).sort_custom(func(a, b): return int(a["flips"]) > int(b["flips"]) or (int(a["flips"]) == int(b["flips"]) and int(a["pos"]) < int(b["pos"])))
		for e in list:
			(e as Dictionary).erase("pos")
	var first: Variant = null
	var ref_i := -1
	for ri in n:
		if not ((runs[ri] as Dictionary).get("units", []) as Array).is_empty():
			ref_i = ri
			break
	if n > 1 and ref_i != -1:
		var ref := {}
		for u in (runs[ref_i] as Dictionary).get("units", []):
			ref[str((u as Dictionary)["id"])] = u
		var best_pos := -1
		var best_run := -1
		for ri in range(ref_i + 1, n):
			for u in (runs[ri] as Dictionary).get("units", []):
				var ud: Dictionary = u
				var id := str(ud["id"])
				if not ref.has(id):
					continue
				var was: Dictionary = ref[id]
				if str(was["status"]) == "skip" or str(ud["status"]) == "skip" or _digest(was) == _digest(ud):
					continue
				var pos := order.find(id)
				if best_pos == -1 or pos < best_pos or (pos == best_pos and ri < best_run):
					best_pos = pos
					best_run = ri
					first = {"step": id, "type": str(ud["type"]), "run": ri + 1, "vs_run": ref_i + 1,
						"was": "%s: %s" % [str(was["status"]), str(was["detail"])], "now": "%s: %s" % [str(ud["status"]), str(ud["detail"])]}
	return {"runs": n, "passes": passes, "fails": fails, "blocked": blocked,
		"pass_rate": snappedf(float(passes) / float(maxi(1, n)), 0.0001), "outcomes": outcomes,
		"steps": steps, "flaky_steps": flaky, "flaky_blocked": flaky_blocked, "first_divergence": first}


## What a unit "looked like" for first_divergence. A perf unit's detail carries the measured numbers,
## which differ on every run by nature, so only its status counts.
static func _digest(u: Dictionary) -> String:
	return "%s|%s" % [str(u["status"]), "" if str(u["type"]) == "perf" else str(u["detail"])]



func _eval_assert(a: Dictionary, perf: Dictionary = {}, game_headless: bool = false) -> Dictionary:
	match str(a.get("type", "")).to_lower():
		"perf":
			return _eval_perf_assert(a, perf, game_headless)
		"node_state":
			var r := _bridge({"cmd": "get", "path": str(a.get("target", "")), "prop": str(a.get("property", ""))})
			if not bool(r.get("ok", false)):
				return _judge(a, str(r.get("error", "get failed")))
			var actual: Variant = r.get("value")
			var expected: Variant = a.get("equals")
			if _values_equal(actual, expected):
				return _pass(a, "%s.%s == %s" % [str(a.get("target", "")), str(a.get("property", "")), str(expected)])
			return _fail(a, "%s.%s = %s (expected %s)" % [str(a.get("target", "")), str(a.get("property", "")), str(actual), str(expected)])
		"screen_text":
			var r := _bridge({"cmd": "find", "text": str(a.get("text", "")), "max": 1})
			if not bool(r.get("ok", false)):
				return _judge(a, str(r.get("error", "find failed")))
			if (r.get("nodes", []) as Array).size() > 0:
				return _pass(a, "found '%s' on screen" % str(a.get("text", "")))
			return _fail(a, "text '%s' not found on screen" % str(a.get("text", "")))
		"expr":
			var r := _bridge({"cmd": "eval", "expr": str(a.get("condition", ""))})
			if not bool(r.get("ok", false)):
				return _judge(a, str(r.get("error", "eval failed")))
			if CallArgs.to_bool(r.get("value")):
				return _pass(a, "%s -> true" % str(a.get("condition", "")))
			return _fail(a, "%s -> %s (want true)%s" % [str(a.get("condition", "")), str(r.get("value")), reads_suffix(r)])
		"screenshot":
			return _eval_screenshot(a)
		"no_overlap":
			return _eval_no_overlap(a)
		_:
			return {"type": str(a.get("type", "")), "status": "skip", "detail": "unknown assert type"}


## no_overlap assert (v1.16 M5d): ask the game's physics which bodies penetrate each other and judge the answer.
## Mirrored by playtest_runner for the headless runner; the wording lives in runtime/physics_overlap.gd (judge),
## so both say the same thing. An assert that names nothing the game has, or whose game is gone, is BLOCKED.
func _eval_no_overlap(a: Dictionary) -> Dictionary:
	var spec_err := Overlap.spec_error(a)
	if not spec_err.is_empty():
		return _fail(a, "no_overlap: %s" % spec_err)
	var cmd := {"cmd": "physics_overlap"}
	for k in ["paths", "group", "min_depth", "max_pairs", "max_bodies"]:
		if a.has(k):
			cmd[k] = a[k]
	var r: Dictionary = server.bridge.send_command(cmd, OVERLAP_TIMEOUT_MS)
	if not bool(r.get("ok", false)):
		var err := str(r.get("error", "physics_overlap failed"))
		if err == "unknown cmd":
			return _blocked(a, "no_overlap: the running game predates this check (its runtime does not know physics_overlap): stop and play again")
		if is_unjudged(err):
			return _blocked(a, "no_overlap: %s" % err)
		var judged := Overlap.judge(r)
		return {"type": str(a.get("type", "")), "status": str(judged["status"]), "detail": str(judged["detail"])}
	var j := Overlap.judge(r)
	var out := {"type": str(a.get("type", "")), "status": str(j["status"]), "detail": str(j["detail"])}
	if not (j.get("pairs", []) as Array).is_empty():
		out["pairs"] = j["pairs"]
	return out


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
		return _perf_broken(a, "perf %s = %.2f > max %.2f" % [metric, value, float(a.get("max"))])
	if a.has("min") and value < float(a.get("min")):
		return _perf_broken(a, "perf %s = %.2f < min %.2f" % [metric, value, float(a.get("min"))])
	var bound := ("max %.2f" % float(a.get("max"))) if a.has("max") else ("min %.2f" % float(a.get("min")))
	return _pass(a, "perf %s = %.2f within %s" % [metric, value, bound])


## A perf bound that was broken. A batch op (repeat, mutate, run_all) starts every run from a restarted
## scene, so the window it measures includes that scene's load: a heavy 3D scene put a 6 s hitch into
## frame_ms_p95 there (6,243 ms against 76 ms on a scene that had been running). A number over budget in that
## window says nothing about the game at rest, so it is BLOCKED with the reason, not failed; a bound that
## holds still passes (the cold start is the worse case). op=run on a running scene judges it for real.
func _perf_broken(a: Dictionary, detail: String) -> Dictionary:
	if _after_restart:
		return _blocked(a, "%s [right after a scene restart: the window includes the scene's load, so not judged; use op=run]" % detail)
	return _fail(a, detail)


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
	var perr: String = PathGuard.write_path_error(baseline)
	if not perr.is_empty():
		return _skip("screenshot", "baseline %s (got '%s'); nothing was written" % [perr, baseline.c_escape()])
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
	var saved := _save_actual(cur, baseline)
	var actual := str(saved.get("actual", ""))
	var f := _fail(a, detail + " | baseline: %s | %s | max channel delta %d, rms %.2f" % [
		baseline, ("actual: " + actual) if not actual.is_empty() else str(saved["why"]), int(m.get("max", 0)), float(m.get("root_mean_squared", 0.0))])
	f["peak_snr"] = snr
	f["baseline"] = baseline
	if not actual.is_empty():
		f["actual"] = actual
	return f


## Save the frame a failed screenshot assert saw next to its baseline: {actual: path}, or {why} when the write
## rule refuses the name. The derived <baseline>.actual.png is a file the baseline's own check never looked at:
## when it is a link, the write would land wherever the link points (a cloned repository can ship one).
## Mirrored by playtest_runner._save_actual (extend BOTH).
func _save_actual(cur: Image, baseline: String) -> Dictionary:
	var actual := baseline.get_basename() + ".actual.png"
	var perr: String = PathGuard.write_path_error(actual)
	if not perr.is_empty():
		return {"why": "the actual frame was not written (%s %s)" % [actual.c_escape().left(160), perr]}
	cur.save_png(actual)
	return {"actual": actual}



## op=export_gd: write a saved suite as a standalone GDScript test (playtest_export.gd builds it). It runs with
## `godot --headless --path <project> --script <file>`, with no editor, no bridge and Beckett switched off, so a
## CI job can run what an agent verified. Needs no game: it reads the suite and writes one file.
##
## The file is written where the caller says, which has to be a .gd file inside the project and goes through the
## shared write rule (core/path_guard.gd). An existing file is replaced only if an earlier export wrote it: a
## script somebody wrote by hand is never overwritten by a typo in `path`. What the test cannot run is listed in
## the reply (and in the file's header) instead of being dropped.
func _export_gd(args: Dictionary) -> Dictionary:
	var pname := _sanitize(str(args.get("name", "")))
	var doc := _load(pname)
	if doc.has("error"):
		return doc
	var path := str(args.get("path", "")).strip_edges()
	if path.is_empty():
		path = Export.default_path(pname)
	var perr := Export.path_error(path)
	if not perr.is_empty():
		return {"error": "op=export_gd: path '%s': %s" % [path.c_escape().left(160), perr]}
	var replaced := false
	if FileAccess.file_exists(path):
		var existing := FileAccess.open(path, FileAccess.READ)
		var first_line := existing.get_line() if existing != null else ""
		if existing != null:
			existing.close()
		if not first_line.begins_with(Export.GENERATED_MARK):
			return {"error": "op=export_gd: %s already exists and was not written by export_gd, so it is not overwritten. Pick another path, or delete that file if you mean to replace it." % path}
		replaced = true
	var built := Export.build(doc, {
		"settle_frames": maxi(0, int(args.get("settle_frames", 4))),
		"path": path,
		"source": "%s/%s.json" % [PLAYTEST_DIR, pname],
		"beckett": _beckett_version(),
	})
	if built.has("error"):
		return {"error": "op=export_gd: %s" % str(built["error"])}
	var source := str(built["source"])
	var dir := path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir):
		var derr := DirAccess.make_dir_recursive_absolute(dir)
		if derr != OK:
			return {"error": "op=export_gd: could not create %s (%s)" % [dir, error_string(derr)]}
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return {"error": "op=export_gd: could not write %s (%s)" % [path, error_string(FileAccess.get_open_error())]}
	f.store_string(source)
	f.close()
	var want := source.to_utf8_buffer().size()
	var back := FileAccess.get_file_as_bytes(path).size()
	if back != want:
		return {"error": "op=export_gd: wrote %s but it reads back as %d bytes, not %d (a full disk, or another program changed it): the file may be incomplete, export again" % [path, back, want]}
	var out := {
		"path": path,
		"suite": pname,
		"mode": str(built["mode"]),
		"scene": str(doc.get("scene", "")),
		"bytes": want,
		"counts": built["counts"],
		"not_run": built["not_run"],
		"run": "godot --headless --path \"%s\" --script %s" % [ProjectSettings.globalize_path("res://").trim_suffix("/"), path],
		"exit_codes": "0 pass, 1 fail, 2 blocked (nothing failed, but something could not be judged)",
	}
	var notes: Array = built["notes"]
	if not ResourceLoader.exists(str(doc.get("scene", ""))):
		notes.append("the scene %s does not exist in this project (yet): the test reports blocked until it does" % str(doc.get("scene", "")).left(120).c_escape())
	if not notes.is_empty():
		out["notes"] = notes
	if replaced:
		out["replaced"] = true
	return {"json": out}



func _list() -> Dictionary:
	var out: Array = []
	var guard: Dictionary = PathGuard.check_read(PLAYTEST_DIR)
	if guard.has("error"):
		return guard
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
						"invariants": (doc.get("invariants", []) as Array).size() if doc.get("invariants", []) is Array else 0,
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
	var guard: Dictionary = PathGuard.check_read(path)
	if guard.has("error"):
		return guard
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


## The environment a perf baseline was measured in. A frame time only means something next to
## another taken on the same machine, GPU, renderer, window size, engine and build, from the same
## recorded run, so a baseline carries this and a later run compares against it.
##
## Editor-side, because the game is the same binary on the same machine reading the same project:
## OS, CPU, engine version, the CONFIGURED renderer and viewport size, and the suite hash.
## Game-side, because the editor's own value is meaningless for a number the GAME measured (a
## headless editor has no GPU adapter at all, yet launches a windowed game): the GPU adapter and
## vendor, the display server (windowed or headless), the rendering driver actually in use, and
## debug vs release. A game that predates the "fingerprint" command simply leaves those out.
## perf_clock (1.17) names what timed frame_ms and fps, and it is the game's: the clock runs there
## (runtime/replay_perf.gd), so a game still on an older runtime cannot be stamped with a newer clock.
func _fingerprint(doc: Dictionary) -> Dictionary:
	var fp := {
		"os": OS.get_name(),
		"cpu": OS.get_processor_name(),
		"engine": String(Engine.get_version_info().get("string", "")),
		"rendering_method": str(ProjectSettings.get_setting("rendering/renderer/rendering_method", "")),
		"viewport": "%dx%d" % [int(ProjectSettings.get_setting("display/window/size/viewport_width", 0)), int(ProjectSettings.get_setting("display/window/size/viewport_height", 0))],
		"suite": suite_hash(doc),
	}
	var g := _bridge({"cmd": "fingerprint"})
	if bool(g.get("ok", false)):
		for k in ["gpu", "gpu_vendor", "display", "rendering_driver", "build", "perf_clock"]:
			if g.has(k):
				fp[k] = str(g[k])
	return fp


## Is the GAME running without a display server? Asked of the game through the fingerprint command:
## the editor's own answer is no answer (a headless editor still launches a windowed game), and the
## `eval` command this used to ask cannot say, because an Expression sees no engine singletons, so
## "DisplayServer.get_name()" always failed and a headless game's render-less frame times were
## judged against frame budgets instead of being skipped as help() promises.
func _game_is_headless() -> bool:
	var g := _bridge({"cmd": "fingerprint"})
	return bool(g.get("ok", false)) and str(g.get("display", "")) == "headless"


## The recorded run itself. The same suite name with different events is a different test, so a
## baseline from the old recording must not be diffed against the new one.
static func suite_hash(doc: Dictionary) -> String:
	var body: Variant = doc.get("events", [])
	if not (body is Array) or (body as Array).is_empty():
		body = doc.get("steps", [])
	return JSON.stringify(body).md5_text()


## Is a stored baseline comparable with the environment of THIS run? Pure (no engine state), so the
## unit suite pins it. {comparable: true | false | "unknown", mismatch: {field: [baseline, now]}};
## "unknown" is a legacy baseline with no fingerprint (saved before 1.16). Only fields BOTH sides
## carry are compared: a field one side could not read says nothing about whether the runs differ.
## The one exception is perf_clock (1.17), what timed the frames: a side that names none was timed
## by clock 1 (Godot's once-a-second monitors, read on every physics tick: a baseline saved before
## 1.17, or a game still on an older runtime), and two clocks are two different measurements, so
## that baseline is not comparable.
static func fingerprint_compare(base: Variant, cur: Dictionary) -> Dictionary:
	var b: Dictionary = base if base is Dictionary else {}
	var mismatch := {}
	var was := "1" if b.get("perf_clock") == null else str(b["perf_clock"])
	var now := "1" if cur.get("perf_clock") == null else str(cur["perf_clock"])
	if was != now:
		mismatch["perf_clock"] = [was, now]
	if b.is_empty():
		return {"comparable": false, "mismatch": mismatch} if not mismatch.is_empty() else {"comparable": "unknown", "mismatch": {}}
	for k in b:
		if str(k) == "perf_clock" or not cur.has(k) or b[k] == null or cur[k] == null:
			continue
		if str(b[k]) != str(cur[k]):
			mismatch[str(k)] = [b[k], cur[k]]
	return {"comparable": mismatch.is_empty(), "mismatch": mismatch}


## The sentence a run's note gets when perf_diff is not like for like; "" when it is.
static func comparability_note(cmp: Dictionary) -> String:
	var verdict: Variant = cmp.get("comparable")
	if verdict is bool and verdict:
		return ""
	if not (verdict is bool):
		return "PERF BASELINE UNVERIFIED: it carries no fingerprint (saved before 1.16), so perf_diff may be comparing unlike runs. save_baseline=true on this setup re-stamps it with one."
	var parts: Array = []
	var mismatch: Dictionary = cmp.get("mismatch", {})
	for k in mismatch:
		if str(k) == "perf_clock":
			continue
		var pair: Array = mismatch[k]
		parts.append("%s %s -> %s" % [k, str(pair[0]).left(40), str(pair[1]).left(40)])
	var tail := "Re-capture with save_baseline=true on this setup. Absolute perf asserts are not affected."
	if mismatch.has("perf_clock"):
		var clocks: Array = mismatch["perf_clock"]
		var also := "" if parts.is_empty() else " It was also measured on a different setup (%s)." % "; ".join(parts)
		if str(clocks[1]) == "1":
			return "PERF BASELINE NOT COMPARABLE: this run's frame_ms and fps come from a game still on a runtime older than Beckett 1.17, which reads Godot's once-a-second monitors (perf_clock %s -> 1), and the baseline timed every frame, so perf_diff compares two different measurements.%s Restart the game (stop_scene, then play_scene) so it runs the current runtime. Absolute perf asserts are not affected." % [str(clocks[0]).left(8), also]
		var how := "before Beckett 1.17, from Godot's once-a-second monitors read on every physics tick" if str(clocks[0]) == "1" else "by another clock"
		return "PERF BASELINE NOT COMPARABLE: its frame_ms and fps were measured %s (perf_clock %s -> %s), and this run times every frame, so perf_diff compares two different measurements.%s %s" % [how, str(clocks[0]).left(8), str(clocks[1]).left(8), also, tail]
	return "PERF BASELINE NOT COMPARABLE: it was measured on a different setup (%s), so perf_diff compares unlike runs - do not read its deltas as a regression or an improvement. %s" % ["; ".join(parts), tail]


func _bridge(cmd: Dictionary) -> Dictionary:
	return server.bridge.send_command(cmd)


## scene_reload reads the scene's resources from disk again inside the game's own handler (mcp_runtime._change_scene_afresh),
## which takes as long as loading them: a heavy scene must not read as a game that stopped answering after the default 4 s.
func _bridge_reload(cmd: Dictionary) -> Dictionary:
	return server.bridge.send_command(cmd, RELOAD_TIMEOUT_MS)


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
	return Version.current()


func _pass(a: Dictionary, detail: String) -> Dictionary:
	return {"type": str(a.get("type", "")), "status": "pass", "detail": detail}


func _fail(a: Dictionary, detail: String) -> Dictionary:
	return {"type": str(a.get("type", "")), "status": "fail", "detail": detail}


func _skip(kind: String, detail: String) -> Dictionary:
	return {"type": kind, "status": "skip", "detail": detail}


## The run could not get to a judgement: nothing was evaluated, so nothing is claimed about the game.
func _blocked(a: Dictionary, detail: String) -> Dictionary:
	return {"type": str(a.get("type", "")), "status": "blocked", "detail": detail}


## The result of a read that came back with an error: blocked when the run could not get to a judgement
## (see is_unjudged), else a fail, the way every such error read before 1.16.
func _judge(a: Dictionary, err: String) -> Dictionary:
	return _blocked(a, err) if is_unjudged(err) else _fail(a, err)


## Evaluate a suite's asserts in order, each result stamped with its index in the suite's array (`i`)
## so a reader, and a repeat batch, can name the assert.
func _eval_all(asserts: Array, perf: Dictionary, game_headless: bool) -> Array:
	var out: Array = []
	for i in asserts.size():
		var a: Variant = asserts[i]
		if not (a is Dictionary):
			continue
		var res := _eval_assert(a, perf, game_headless)
		res["i"] = i
		out.append(res)
	return out


## One result per invariant for a run that could not check them (status "blocked" when it should have,
## "skip" when the mode has no per-frame window), so they never read as "held".
func _invariants_unjudged(invariants: Array, status: String, why: String) -> Array:
	var out: Array = []
	for it in invariants:
		if it is Dictionary:
			out.append({"type": "invariant", "name": str((it as Dictionary).get("name", "")), "status": status,
				"expr": str((it as Dictionary).get("expr", "")).left(160), "detail": why})
	return out



## "; read: <operand> = <value>, ..." for a false expr assert whose game said what it read (the operands
## of its comparisons), else "". The value that broke an assert is what a reader needs, and what tells two
## runs of a flaky suite apart when both come back false.
static func reads_suffix(reply: Dictionary) -> String:
	var reads: Variant = reply.get("reads", null)
	if not (reads is Dictionary) or (reads as Dictionary).is_empty():
		return ""
	var parts: Array = []
	for k in reads:
		parts.append("%s = %s" % [str(k).left(80), str(reads[k]).left(60)])
	return "; read: " + ", ".join(parts)


## pass | fail | skip | blocked for an assert result or a steps-flow step result. A result from a
## runtime that predates the status field is read from its ok flag.
static func status_of(item: Variant) -> String:
	if not (item is Dictionary):
		return "fail"
	var s := str((item as Dictionary).get("status", ""))
	if s == "pass" or s == "fail" or s == "skip" or s == "blocked":
		return s
	return "pass" if bool((item as Dictionary).get("ok", false)) else "fail"


## The suite's verdict: fail if anything failed, else blocked if anything was blocked, else pass.
static func verdict_of(failed: int, blocked: int) -> String:
	if failed > 0:
		return "fail"
	return "blocked" if blocked > 0 else "pass"


## {pass, fail, blocked, skip} counts over a list of result dicts.
static func tally_of(items: Array) -> Dictionary:
	var t := {"pass": 0, "fail": 0, "blocked": 0, "skip": 0}
	for it in items:
		if it is Dictionary:
			var s := status_of(it)
			t[s] = int(t[s]) + 1
	return t


## Does an error from the game mean the run could not get to a judgement? True for a lost game
## connection, for a target that is not there (a node, the scene), and for an expression that parsed
## but could not be evaluated. A reply that says the target IS there and is wrong (a property that does
## not exist, an expression that does not parse) was judged, and fails.
static func is_unjudged(err: String) -> bool:
	if is_channel_error(err):
		return true
	for p in ["node not found", "no node matches", "no current scene", "expr exec error"]:
		if err.begins_with(p):
			return true
	return false


## A game connection that is gone, or not answering: the game stopped, crashed, was suspended, is busy, or is
## paused in the editor's debugger.
static func is_channel_error(err: String) -> bool:
	return is_disconnect(err) or is_break(err) or err.contains("runtime timeout")


## The runtime bridge said the game is paused in the editor's debugger (a script error or a breakpoint) and
## answered without waiting. Unlike a busy game it stays that way until someone presses Continue or the run is
## stopped, so nothing in a batch retries it. The answer is the bridge's own text, complete with the next step,
## and is passed on whole rather than cut to the usual reason length.
static func is_break(err: String) -> bool:
	return err.contains(RuntimeBridge.BREAK_MARK)


## A game connection that is GONE (as opposed to slow): no game, or the link dropped mid-request.
static func is_disconnect(err: String) -> bool:
	return err.contains("game not running") or err.contains("runtime disconnected")


## Does a node_state assert hold? TypedJson.same, the rule the headless runner, ui_do's assert step and the exported test
## judge by too (1.17), so one suite gets one verdict wherever it runs. `actual` is the value the game's reply carries
## (an int, an array for a vector), or the text an older runtime sent. Numbers match by value (1 is 1.0, which JSON makes
## every expected number), and a vector matches whichever way the suite spells it: [0, 6, 11], "0 6 11", or the
## "(0.0, 6.0, 11.0)" a read printed before 1.17, so a suite saved then still passes.
func _values_equal(actual: Variant, expected: Variant) -> bool:
	return TypedJson.same(actual, expected)
