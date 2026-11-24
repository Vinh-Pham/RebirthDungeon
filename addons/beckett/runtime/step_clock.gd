extends RefCounted
## The tick clock behind time_control's step windows (op=step, op=step_until) and the playtest replay window (1.17).
## Full-only: pack.ps1 trims this file from Lite, and mcp_runtime.gd loads it by path (never preloads it), so a build
## without it answers "Full-edition feature" instead of failing to parse.
##
## What it replaced lost a tick. The runtime node is PROCESS_MODE_ALWAYS and early in the physics order, so the old window
## counted a tick in its own _physics_process and froze the game inside that same tick, before the scene's nodes and the
## physics server ran it: a step of N gave the scene N-1 ticks (frames=1 gave it none) while the reply said N. Its input
## waited in the engine's buffer until the next engine frame, and the last tick's input reached a frozen game.
##
## How this one runs a window (engine order read in the 4.2, 4.4.1, 4.6.2 and 4.7 sources: main.cpp Main::iteration,
## scene_tree.cpp physics_process / process / process_timers):
## - While a window runs, Engine.max_physics_steps_per_frame is 1, so an idle part (SceneTree.process_frame) follows
##   every physics tick before the next one. The old value is put back on every way out (close, abort, a replaced
##   window, a scene restart, the runtime leaving the tree).
## - HEAD: the SceneTree.physics_frame signal starts every tick, after the physics server handed the scene the last
##   step (flush_queries) and before picking and every node. There the clock counts the tick before when the pausable
##   witness (TickProbe, last in the physics order) ran in it and the tree was still unpaused once it ended, and it
##   freezes the game at the head of the tick after the last one: tree.paused stops that tick's nodes and switches the
##   physics server off before its step, so the scene's nodes and the server both ran exactly N ticks.
## - INPUT: the events of tick t go in during the idle part between tick t-1 and tick t (tick 0's when the window
##   opens), through the runtime's _inject and one Input.flush_buffered_events(). That is outside physics, where real
##   input arrives, so _input sees them before tick t, and during tick t is_action_pressed and is_action_just_pressed
##   read them on 4.2 and on 4.3+ alike (4.2 moves the physics counter at the end of a tick; 4.3+ stamps a press with
##   the next tick's number).
## - Two heads with no idle part between them (the Game view's speed above 1x on 4.6+, or --fixed-fps below the physics
##   rate) leave no such point: the late tick's events go in at its head, and from then on each tick's events go in at
##   the end of the tick before (a deferred call from the head, run after that tick's nodes and before its physics step).
##   The window says so in its note.
## - SETTLE: after the close the game runs one idle frame. The pause is lifted at process_frame and put back by a
##   deferred call that a 0 s idle timer queues, which runs after every _process, idle Timer and Tween and before the
##   frame is drawn, so a screenshot and _process-driven state show the stepped state. With physics interpolation on,
##   root.reset_physics_interpolation() (4.3+, reached by name) first makes the drawn frame the final one; an engine
##   without it waits one frozen tick instead.
## - The handlers do nothing while the runtime node cannot process: the editor's Game view Suspend (4.4+) keeps the
##   tree's signals and timers going, but nothing of the game runs, and the engine refuses to change the pause.

const CallArgs := preload("res://addons/beckett/core/callargs.gd")
const InputCodec := preload("res://addons/beckett/runtime/input_codec.gd")
const TypedJson := preload("res://addons/beckett/core/typed_json.gd")

enum Phase { IDLE, RUNNING, CLOSE_WAIT, SETTLE, SETTLING, DONE }

## A replay stamp past this is no recording (over 4 hours at 60 Hz): the window refuses it rather than plan that many frames.
const REPLAY_FRAMES_MAX := 1000000
const PROBE_NAME := "BeckettTickProbe"
## Last in the default physics order (process_physics_priority sorts ascending), so it runs after the scene's own nodes.
const PROBE_PRIORITY := 2147483647


## The witness: it runs only in a tick the pausable scene runs. Its mode is PAUSABLE on purpose (INHERIT would take the
## runtime's ALWAYS). Created at the first window, and it processes nothing outside a running window.
class TickProbe extends Node:
	var ran := false

	func _physics_process(_delta: float) -> void:
		ran = true


var _host: Node = null
var _inject := Callable()
var _auto := true
var _attached := false
var _probe: TickProbe = null
var _phase: int = Phase.IDLE
var _kind := ""
var _gen := 0
var _ticks := 0
var _target := 0
var _plan: Array = []
var _delivered := 0
var _sent := 0
var _injected := 0
var _late := 0
var _held: Dictionary = {}
var _armed := false
var _idle_seen := false
var _end_paused := -1
var _tail_mode := false
var _terminator := ""
var _notes: Array = []
var _unfreeze := false
var _saved_steps := -1
var _lifted := false
var _settle_blocked := false
var _expr: Expression = null
var _base := Callable()
var _safe := Callable()
var _cond_value: Variant = null
var _max_frames := 0
var _deadline_ms := 0
var _on_head := Callable()
var _total_events := 0



## The plan of a step window: frames is at least 1 and raised to the batch size (grown says so); an entry that is not
## an Array is a tick with no input.
static func plan_ticks(per_frame: Variant, frames: int) -> Dictionary:
	var ticks: Array = []
	if per_frame is Array:
		for b in (per_frame as Array):
			ticks.append((b as Array).duplicate() if b is Array else [])
	var n := maxi(1, frames)
	var grown := ticks.size() > n
	if grown:
		n = ticks.size()
	return {"ticks": ticks, "frames": n, "grown": grown}


## The plan of a replay window. An event stamped f is the input of frame f+1, so it goes in at index f+1 (a missing f
## counts as 0, and a stamp below -1 goes in before frame 0); events that share a frame keep their order, and a frame
## with none holds null. The window runs end = the last f + settle complete frames, so with settle 0 the last events sit
## past the last tick (index end+1) and go in at the close, while the game still runs. A stamp past REPLAY_FRAMES_MAX
## gives {error}.
static func plan_replay(events: Variant, settle: int) -> Dictionary:
	var ticks: Array = []
	var total := 0
	var last_f := 0
	if events is Array:
		for e in (events as Array):
			if not (e is Dictionary):
				continue
			var f := int((e as Dictionary).get("f", 0))
			if f > REPLAY_FRAMES_MAX:
				return {"error": "an event is stamped f=%d, past the %d frames a replay may run" % [f, REPLAY_FRAMES_MAX]}
			last_f = f if total == 0 else maxi(last_f, f)
			var i := maxi(0, f + 1)
			if ticks.size() <= i:
				ticks.resize(i + 1)
			if not (ticks[i] is Array):
				ticks[i] = []
			(ticks[i] as Array).append(e)
			total += 1
	return {"ticks": ticks, "end": maxi(0, last_f + maxi(0, settle)), "total": total}


## Why a window closes at a head, or "" to run another tick. count and replay: done once the target is reached. until:
## the condition first, then max_frames, then the deadline.
static func close_reason(kind: String, ticks: int, target: int, max_frames: int, now_ms: int, deadline_ms: int, cond_true: bool) -> String:
	if kind == "until":
		if cond_true:
			return "condition"
		if max_frames > 0 and ticks >= max_frames:
			return "max_frames"
		if now_ms >= deadline_ms:
			return "timeout"
		return ""
	return "done" if ticks >= target else ""



## Hook the clock to the runtime node. auto=false (the unit suite) connects nothing and creates no timer and no
## deferred call: the caller drives on_physics_frame, on_process_frame and settle_end itself. Safe to call again.
func attach(host: Node, inject: Callable, auto := true) -> void:
	_host = host
	_inject = inject
	_auto = auto
	_attached = true
	if auto and host != null and host.is_inside_tree():
		var tree := host.get_tree()
		if not tree.physics_frame.is_connected(on_physics_frame):
			tree.physics_frame.connect(on_physics_frame)
		if not tree.process_frame.is_connected(on_process_frame):
			tree.process_frame.connect(on_process_frame)


## The runtime is leaving the tree: end any window (the step setting goes back) and let go of the tree's signals.
func detach() -> void:
	abort()
	_restore_steps()
	_attached = false
	if _host != null and is_instance_valid(_host) and _host.is_inside_tree():
		var tree := _host.get_tree()
		if tree.physics_frame.is_connected(on_physics_frame):
			tree.physics_frame.disconnect(on_physics_frame)
		if tree.process_frame.is_connected(on_process_frame):
			tree.process_frame.disconnect(on_process_frame)


## Is the clock hooked to this host (and not detached since)?
func attached_to(host: Node) -> bool:
	return _attached and _host == host



## op=step: run `frames` ticks with one batch of events per tick, then freeze (unless unfreeze).
func open_count(frames: int, per_frame: Variant, unfreeze: bool) -> Dictionary:
	if is_replay():
		return {"ok": false, "error": "a playtest replay window is open: let it finish (playtest op=run waits for it) before stepping"}
	var plan := plan_ticks(per_frame, frames)
	var replaced := _replace()
	if not _reset("count", unfreeze):
		return {"ok": false, "error": "no scene tree"}
	_plan = plan["ticks"]
	_target = int(plan["frames"])
	_run()
	var out := {"ok": true, "started": true, "kind": "count", "frames_requested": _target}
	if not _plan.is_empty():
		out["input_frames"] = _plan.size()
	var notes: Array = []
	if bool(plan["grown"]):
		notes.append("frames raised to %d to cover the inputs_per_frame batch" % _target)
	if not replaced.is_empty():
		notes.append(replaced)
	if not notes.is_empty():
		out["note"] = "; ".join(PackedStringArray(notes))
	return out


## op=step_until: run ticks until `expr` (parsed, checked safe by the caller) reads true at the start of a tick, or
## max_frames ticks ran, or timeout_sec passed. A condition already true runs no tick at all.
func open_until(expr: Expression, max_frames: int, timeout_sec: float, unfreeze: bool, base: Callable, safe: Callable) -> Dictionary:
	if is_replay():
		return {"ok": false, "error": "a playtest replay window is open: let it finish (playtest op=run waits for it) before stepping"}
	var replaced := _replace()
	if not _reset("until", unfreeze):
		return {"ok": false, "error": "no scene tree"}
	_expr = expr
	_base = base
	_safe = safe
	_max_frames = maxi(0, max_frames)
	_deadline_ms = Time.get_ticks_msec() + int(timeout_sec * 1000.0)
	var tree := _tree()
	if _eval():
		_terminator = "condition"
		_phase = Phase.DONE
		tree.paused = not unfreeze
		var now := {"ok": true, "started": false, "kind": "until", "immediate": true, "terminator": "condition", "frames": 0,
			"condition_value": _shown(_cond_value), "paused": tree.paused}
		if not replaced.is_empty():
			now["note"] = replaced
		return now
	_run()
	var out := {"ok": true, "started": true, "kind": "until", "immediate": false, "timeout_sec": timeout_sec, "max_frames": _max_frames}
	if not replaced.is_empty():
		out["note"] = replaced
	return out


## playtest op=run's deterministic replay: each event goes in before the frame after its stamp, `settle` more frames
## run after the last stamp, then the game freezes for the asserts. on_head(frame, closing) runs at every head.
func open_replay(events: Variant, settle: int, on_head: Callable) -> Dictionary:
	if is_open() and _kind != "replay":
		return {"ok": false, "error": "a time_control step window is open: let it finish, or time_control op=freeze, before replay"}
	var plan := plan_replay(events, settle)
	if plan.has("error"):
		return {"ok": false, "error": plan["error"]}
	_replace()
	if not _reset("replay", false):
		return {"ok": false, "error": "no scene tree"}
	_plan = plan["ticks"]
	_target = int(plan["end"])
	_total_events = int(plan["total"])
	_on_head = on_head
	_run()
	return {"ok": true, "started": true, "events": _total_events, "end_frame": _target}


## An explicit freeze, unfreeze or scene restart ends the open window where it stands (the caller sets the pause).
func abort() -> void:
	if not is_open():
		return
	_gen += 1
	_terminator = "aborted"
	_ticks = _ran_so_far()
	_notes.append("time_control op=freeze / op=unfreeze or a scene restart ended the window after %d tick(s)" % _ticks)
	_end_window()
	_lifted = false
	_settle_blocked = false
	_phase = Phase.DONE


func is_open() -> bool:
	return _phase == Phase.RUNNING or _phase == Phase.CLOSE_WAIT or _phase == Phase.SETTLE or _phase == Phase.SETTLING


## A step or step_until window is open (what time_control reports as in_step).
func in_step() -> bool:
	return is_open() and _kind != "replay"


func is_replay() -> bool:
	return is_open() and _kind == "replay"


## The step window's state, for tc_step_status: frames is the ticks the scene ran.
func status() -> Dictionary:
	var out := {"kind": _kind, "frames": _ticks, "in_step": in_step()}
	if _injected > 0:
		out["inputs_injected"] = _injected
	if not is_open() and not _terminator.is_empty():
		out["terminator"] = _terminator
		if _kind == "until":
			out["condition_value"] = _shown(_cond_value)
	var note := _note_text()
	if not note.is_empty():
		out["note"] = note
	return out


## The replay window's state, for replay_status: frames is the frames the scene ran.
func replay_status() -> Dictionary:
	if _kind != "replay":
		return {"replaying": false, "injected": 0, "frames": 0, "total_events": 0, "remaining": 0}
	var out := {"replaying": is_open(), "injected": _injected, "frames": _ticks, "total_events": _total_events, "remaining": _total_events - _sent}
	if not is_open() and _terminator != "done" and not _terminator.is_empty():
		out["terminator"] = _terminator
	var note := _note_text()
	if not note.is_empty():
		out["note"] = note
	return out



## SceneTree.physics_frame: the head of a tick.
func on_physics_frame() -> void:
	if _phase == Phase.IDLE or _phase == Phase.DONE:
		return
	if not _awake():
		return
	match _phase:
		Phase.RUNNING:
			_head()
		Phase.CLOSE_WAIT:
			_phase = Phase.SETTLE
		Phase.SETTLING:
			if _settle_blocked:
				settle_end()


## SceneTree.process_frame: the start of an idle part, before every _process.
func on_process_frame() -> void:
	if _phase == Phase.IDLE or _phase == Phase.DONE:
		return
	if not _awake():
		return
	match _phase:
		Phase.RUNNING:
			_idle_seen = true
			if _armed:
				var tree := _tree()
				var paused := tree == null or tree.paused
				if _end_paused < 0:
					_end_paused = 1 if paused else 0
				if not paused:
					_deliver_upto(_ticks + 1)
		Phase.SETTLE:
			settle_begin()
		Phase.SETTLING:
			if _settle_blocked:
				settle_end()


func _head() -> void:
	var tree := _tree()
	if tree == null:
		return
	var cut_short := false
	if _armed:
		_armed = false
		if _armed_counts(tree):
			_ticks += 1
		else:
			cut_short = true
	if tree.paused:
		if cut_short:
			_stop("game_paused", "the game paused the tree during tick %d, so that tick did not finish; it stays paused" % (_ticks + 1))
		else:
			_stop("game_paused", "the game paused the tree itself after %d tick(s); it stays paused" % _ticks)
		return
	var cond_true := _eval() if _kind == "until" else false
	var why := close_reason(_kind, _ticks, _target, _max_frames, Time.get_ticks_msec(), _deadline_ms, cond_true)
	if _on_head.is_valid():
		_on_head.call(_ticks, not why.is_empty())
	if not why.is_empty():
		_deliver_upto(_plan.size() - 1)
		_close(why)
		return
	if _delivered <= _ticks and _delivered < _plan.size():
		_tail_mode = true
		_late += _deliver_upto(_ticks)
	_delivered = maxi(_delivered, _ticks + 1)
	_ensure_probe()
	if _probe != null:
		_probe.ran = false
	_armed = true
	_idle_seen = false
	_end_paused = -1
	if _tail_mode and _auto and _delivered < _plan.size():
		call_deferred("_tail_now", _gen)


## Back-to-back ticks: the next tick's events go in at the end of this one, after its nodes and before its physics step.
func _tail_now(gen: int) -> void:
	if gen != _gen or _phase != Phase.RUNNING or not _armed or _idle_seen:
		return
	var tree := _tree()
	if tree == null or tree.paused:
		return
	_late += _deliver_upto(_ticks + 1)


func _close(why: String) -> void:
	_terminator = why
	_end_window()
	var tree := _tree()
	if _unfreeze or tree == null:
		_phase = Phase.DONE
		return
	tree.paused = true
	if _interpolated(tree) and not tree.root.has_method("reset_physics_interpolation"):
		_phase = Phase.CLOSE_WAIT
	else:
		_phase = Phase.SETTLE


## The game paused the tree itself: the window ends where it is, and the game's own pause stays (no settle frame).
func _stop(why: String, detail: String) -> void:
	_terminator = why
	_notes.append(detail)
	_end_window()
	_phase = Phase.DONE


## The settle frame begins (process_frame, before every _process): lift the pause, and queue the call that puts it back.
func settle_begin() -> void:
	var tree := _tree()
	if tree == null:
		_phase = Phase.DONE
		return
	if tree.paused:
		tree.paused = false
		_lifted = true
	if _interpolated(tree) and tree.root.has_method("reset_physics_interpolation"):
		tree.root.call("reset_physics_interpolation")
	_phase = Phase.SETTLING
	if _auto:
		tree.create_timer(0.0, true, false, true).timeout.connect(_settle_timer.bind(_gen))


## The 0 s idle timer fires after every _process of the frame; the deferred call it queues runs in the engine's message
## flush after the scene's process step, which is the last point a script reaches before the frame is drawn.
func _settle_timer(gen: int) -> void:
	if gen == _gen:
		call_deferred("_settle_now", gen)


func _settle_now(gen: int) -> void:
	if gen != _gen or _phase != Phase.SETTLING:
		return
	if not _awake():
		_settle_blocked = true
		return
	settle_end()


## The settle frame ends: the pause goes back, and a step_until condition is read once more, because that frame ran the
## game's idle-driven state (_process, Timers, Tweens) one real-time frame on.
func settle_end() -> void:
	_settle_blocked = false
	var tree := _tree()
	if _lifted and tree != null:
		tree.paused = true
	_lifted = false
	if _kind == "until" and _expr != null:
		var was: Variant = _cond_value
		_eval()
		var now: Variant = _cond_value
		_cond_value = was
		if typeof(was) != typeof(now) or was != now:
			_notes.append("the condition reads %s after the settle frame" % str(now).left(80))
	_phase = Phase.DONE



## The tick let run at the last head counts when the witness ran in it and the tree was unpaused once it ended (seen at the
## first idle part after it, or now when none came).
func _armed_counts(tree: SceneTree) -> bool:
	var ended_paused := (_end_paused == 1) if _end_paused >= 0 else (tree == null or tree.paused)
	var ran := _probe.ran if (_probe != null and is_instance_valid(_probe)) else not ended_paused
	return ran and not ended_paused


## The ticks counted, plus the one let run at the last head when it counts (the next head would count it).
func _ran_so_far() -> int:
	return _ticks + (1 if _armed and _armed_counts(_tree()) else 0)


func _awake() -> bool:
	return _host != null and is_instance_valid(_host) and _host.is_inside_tree() and _host.can_process()


func _tree() -> SceneTree:
	if _host == null or not is_instance_valid(_host) or not _host.is_inside_tree():
		return null
	return _host.get_tree()


## Physics interpolation on (SceneTree.physics_interpolation is 4.3+, so it is read by name).
func _interpolated(tree: SceneTree) -> bool:
	var on: Variant = tree.get("physics_interpolation")
	return on is bool and on


## A new window replaces an open one of the same family: the note names it, and what it pressed is let go.
func _replace() -> String:
	if not is_open():
		return ""
	var what: String = {"count": "step", "until": "step_until", "replay": "replay"}.get(_kind, _kind)
	var n := _ran_so_far()
	var released := _release_held()
	_end_window()
	_gen += 1
	_phase = Phase.DONE
	return "the open %s window was ended after %d tick(s)%s" % [what, n, "" if released == 0 else " and let go of %d input(s) it held" % released]


func _reset(kind: String, unfreeze: bool) -> bool:
	if _tree() == null:
		return false
	_gen += 1
	_kind = kind
	_ticks = 0
	_target = 0
	_plan = []
	_delivered = 0
	_sent = 0
	_injected = 0
	_late = 0
	_held = {}
	_armed = false
	_idle_seen = false
	_end_paused = -1
	_tail_mode = false
	_terminator = ""
	_notes = []
	_unfreeze = unfreeze
	_lifted = false
	_settle_blocked = false
	_expr = null
	_base = Callable()
	_safe = Callable()
	_cond_value = null
	_max_frames = 0
	_deadline_ms = 0
	_on_head = Callable()
	_total_events = 0
	return true


## Start running: one physics tick per engine frame, the witness on, the game unpaused, tick 0's events in.
func _run() -> void:
	if _saved_steps < 0:
		_saved_steps = Engine.max_physics_steps_per_frame
	Engine.max_physics_steps_per_frame = 1
	_ensure_probe()
	if _probe != null:
		_probe.ran = false
		_probe.set_physics_process(true)
	_phase = Phase.RUNNING
	_tree().paused = false
	_deliver_upto(0)


## Leaving RUNNING, whichever way: the step setting goes back and the witness stops.
func _end_window() -> void:
	_armed = false
	_restore_steps()
	if _probe != null and is_instance_valid(_probe):
		_probe.set_physics_process(false)


func _restore_steps() -> void:
	if _saved_steps >= 0:
		Engine.max_physics_steps_per_frame = _saved_steps
		_saved_steps = -1


func _ensure_probe() -> void:
	if _probe != null and is_instance_valid(_probe) and _probe.is_inside_tree():
		return
	_probe = null
	if _host == null or not is_instance_valid(_host) or not _host.is_inside_tree():
		return
	var p := TickProbe.new()
	p.name = PROBE_NAME
	p.process_mode = Node.PROCESS_MODE_PAUSABLE
	p.process_physics_priority = PROBE_PRIORITY
	_host.add_child(p)
	_probe = p


## Deliver every index up to `i` not yet delivered, then flush the engine's input buffer once. Returns the events sent.
func _deliver_upto(i: int) -> int:
	var sent := 0
	while _delivered <= i:
		if _delivered < _plan.size() and _plan[_delivered] is Array:
			for e in (_plan[_delivered] as Array):
				if not (e is Dictionary):
					continue
				_sent += 1
				var ie: InputEvent = InputCodec.build_event(e)
				if ie == null:
					continue
				InputCodec.track(_held, ie)
				if _inject.is_valid():
					_inject.call(ie)
				_injected += 1
				sent += 1
		_delivered += 1
	if sent > 0:
		Input.flush_buffered_events()
	return sent


## Let go of what this window pressed and never released (through the runtime's _inject, so its own record agrees).
func _release_held() -> int:
	var n := _held.size()
	for sig in _held:
		if _inject.is_valid():
			_inject.call(_held[sig])
	_held.clear()
	if n > 0:
		Input.flush_buffered_events()
	return n


## step_until's condition, against the current scene (the tree root when there is none). An error reads as "not yet".
func _eval() -> bool:
	if _expr == null:
		return false
	var base: Variant = _base.call() if _base.is_valid() else null
	if not (base is Object):
		var tree := _tree()
		base = tree.root if tree != null else null
	var v: Variant = _expr.execute([], base, true)
	if _expr.has_execute_failed():
		_cond_value = "error: " + _expr.get_error_text()
		return false
	_cond_value = TypedJson.to_plain(v)
	return CallArgs.to_bool(v)


## The condition's value as a reply shows it. The caller's _safe runs while that reply is built, when it knows whether
## the reply goes out typed (a condition judged on a tick is judged between replies).
func _shown(v: Variant) -> Variant:
	return _safe.call(v) if _safe.is_valid() else v


func _note_text() -> String:
	var parts: Array = _notes.duplicate()
	if _late > 0:
		parts.append("ticks ran back to back (the Game view's speed above 1x, or --fixed-fps), so %d input event(s) went in inside physics, at the start of their tick or the end of the one before" % _late)
	return "; ".join(PackedStringArray(parts))
