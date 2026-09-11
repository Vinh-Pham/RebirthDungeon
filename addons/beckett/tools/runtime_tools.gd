@tool
extends RefCounted
class_name BeckettRuntimeTools

## The DRIVE half of the play-test loop (L5): inject input, click UI/3D, drag/scroll,
## write runtime props, call methods, record/replay input — the agent actually plays
## the game. Everything here reaches the running game through the BeckettRuntimeBridge
## and MUTATES it. The read-only observe half (screenshot / live tree / runtime reads /
## perf / game_logs) lives in runtime_observe_tools.gd, a CORE module the free Lite
## build ships — Lite can SEE the game; this module (driving it) is the Full layer.
##
## This module is ALSO the Lite/Full SENTINEL: pack.ps1 trims it from the free build,
## and mcp_server.gd detects its absence to cap Lite at the See tier (L4). Keep it in
## $liteTrimModules and $premiumToolNames — the drive code must never ship as Lite source.

var server

const MCPJobsScript := preload("res://addons/beckett/core/jobs.gd")


func _register(registry) -> void:
	registry.register({
		"name": "simulate_input",
		"description": "Inject input into the RUNNING game: keyboard, input actions, mouse (button + motion), GAMEPAD (joy_button, joy_axis) and TOUCH (touch, touch_drag). One event inline, or several via events:[...]. Injected events drive the action system and _input/_gui_input, NOT the raw polling APIs. Event grammar + the polling limit in full: help(tool=\"simulate_input\").",
		"help": "Event types — pass one inline, or several in order via events:[...].\n  {type:key, keycode:\"Space\", pressed:true}\n  {type:action, action:\"ui_accept\", pressed:true}\n  {type:mouse_button, button:1, position:[x,y], pressed:true}   button = MOUSE_BUTTON_* (1=left)\n  {type:mouse_motion, position:[x,y], relative:[dx,dy]}\n  {type:joy_button, button:0, pressed:true, device:0}           button = JOY_BUTTON_* index, 0=A\n  {type:joy_axis, axis:0, value:-1.0, device:0}                  axis = JOY_AXIS_* index, 0=left-X; value clamped -1..1\n  {type:touch, index:0, position:[x,y], pressed:true}\n  {type:touch_drag, index:0, position:[x,y], relative:[dx,dy]}\n\nLIMITS (read this before blaming the game): injected events drive the action system and the _input / _gui_input callbacks. Raw polling APIs such as Input.get_joy_axis() or Input.get_connected_joypads() do NOT reflect injected events. So a game reading actions (Input.get_vector, Input.is_action_pressed) works; one polling raw hardware does not, and no amount of injection will change that.\n\nTouch events arrive at _input as InputEventScreenTouch / InputEventScreenDrag. To also drive mouse-based UI from them, set the project's input_devices/pointing/emulate_mouse_from_touch.",
		"input_schema": {"type": "object", "properties": {
			"events": {"type": "array"},
			"type": {"type": "string", "description": "key | action | mouse_button | mouse_motion | joy_button | joy_axis | touch | touch_drag"},
			"keycode": {"type": "string"},
			"action": {"type": "string"},
			"button": {"type": "integer", "description": "mouse_button: MOUSE_BUTTON_* (1=left); joy_button: JOY_BUTTON_* index (0=A)"},
			"axis": {"type": "integer", "description": "joy_axis: JOY_AXIS_* index (0=left-X, 1=left-Y, 2=right-X, 3=right-Y)"},
			"value": {"type": "number", "description": "joy_axis: axis value, clamped -1.0..1.0"},
			"device": {"type": "integer", "description": "joy_button/joy_axis: joypad device id (default 0)"},
			"index": {"type": "integer", "description": "touch/touch_drag: finger index (default 0)"},
			"position": {"type": "array"},
			"relative": {"type": "array", "description": "mouse_motion/touch_drag: delta since last event [dx,dy]"},
			"pressed": {"type": "boolean"},
		}},
		"handler": Callable(self, "_simulate_input"),
	})
	registry.register({
		"name": "runtime_set_property",
		"description": "Set a property on a node in the RUNNING game (live, not persisted). Address by path OR a live selector: class / name / text [+ nth]. property accepts SUB-RESOURCE paths with ':'. Every write is read back, so ok is proof the value is actually live. Selector forms, sub-resource syntax and the failure modes: help(tool=\"runtime_set_property\").",
		"help": "Addressing: either path=\"/root/Main/Player\" (or a name, or a relative path), or a live selector — class (native OR a custom class_name) / name / text, optionally narrowed with nth (0-based) and under (an ancestor path).\n\nSub-resource paths: property accepts ':' to descend into a resource on the node.\n  \"environment:volumetric_fog_density\"\n  \"material_override:shader_parameter/tint\"\n  \"position:y\"\n\nEvery write is READ BACK, and the read-back is the contract:\n  * the response carries before / after;\n  * an unknown property name is an error carrying a did-you-mean;\n  * a write that moved nothing is an ERROR, not a silent pass — the property is read-only, or game code rewrites it every frame;\n  * a value the engine clamped comes back with a note saying so.\nSo ok means the value is live right now, not merely that the call was accepted.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "property": {"type": "string"}, "value": {},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}, "required": ["property", "value"]},
		"handler": Callable(self, "_runtime_set"),
	})
	registry.register({
		"name": "runtime_call",
		"description": "Call a method on a node in the RUNNING game. args = positional array. Address by path OR a live selector: class (native or custom class_name) / name / text [+ nth] — resolves fresh each call (skip the find step). Returns the result plus the 'resolved' path that matched.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "method": {"type": "string"}, "args": {"type": "array"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}, "required": ["method"]},
		"handler": Callable(self, "_runtime_call"),
	})
	registry.register({
		"name": "find_ui_elements",
		"description": "List UI nodes in the running game (default class Control; e.g. class=Button). Matches native and custom class_name. Returns path/class/text. For non-UI nodes use find_nodes.",
		"readonly": true,
		"input_schema": {"type": "object", "properties": {
			"class": {"type": "string"}, "max": {"type": "integer"},
		}},
		"handler": Callable(self, "_find_ui_elements"),
	})
	registry.register({
		"name": "click_button_by_text",
		"description": "Find a button in the running game whose text contains the string and click it (emits pressed). Disambiguate when the text repeats: nth=pick the Nth match (0-based, document order); under=node path to scope the search; all=true returns every match (path/text/class) instead of clicking. A DISABLED button is refused (clicked=false) — the real UI would ignore it. Note this emits the signal directly (fast semantic path, no input pipeline); click_control is the full-fidelity click.",
		"input_schema": {"type": "object", "properties": {
			"text": {"type": "string"}, "nth": {"type": "integer"},
			"under": {"type": "string"}, "all": {"type": "boolean"},
		}, "required": ["text"]},
		"handler": Callable(self, "_click_button_by_text"),
	})
	registry.register({
		"name": "click_control",
		"description": "Click a Control in the RUNNING game — the accurate UI click; prefer it over simulate_input for anything in a container. Injects press+release in GUI space, AUTO-WAITS for the target to become clickable, and refuses honestly (clicked=false + reason) rather than faking success when the control is hidden, disabled, scrolled away or occluded. Address by path OR selector (class/name/text [+nth]). Selectors, waiting and the refusal reasons: help(tool=\"click_control\").",
		"help": "Why not simulate_input: click_control computes the Control's center and injects straight into the viewport in GUI space, bypassing the content-scale / stretch mismatch that makes a coordinate click miss buttons inside containers.\n\nHonest by design — it returns clicked=false with the reason instead of faking success:\n  * hidden;\n  * DISABLED;\n  * scrolled out of view (ScrollContainer ancestors are auto-scrolled first, so this only fires when scrolling could not reach it);\n  * OCCLUDED — another control would receive the event (a popup on top, a modal overlay, a covering ColorRect with mouse_filter STOP). It reports occluded_by=<path> and does NOT activate the wrong control.\n\nAUTO-WAIT: up to wait_ms (default 2000; 0 = a single attempt) for the target to become clickable, so fade-in menus and deferred layout just work. On timeout you get the LAST blocking reason, which is the useful one.\n\nSuccess may include received_by — a mouse_filter PASS child that took the event and bubbled it up to the target. That is a normal Godot outcome, not a miss.\n\nSelectors: path, or class / name / text, narrowed with nth (0-based) and under. A bare text selector is scoped to BaseButton, so nth indexes the SAME set and order as click_button_by_text; for a non-button text target, pass class as well.\n\nbutton: 1 = left (default), 2 = right, 3 = middle.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "button": {"type": "integer"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
			"wait_ms": {"type": "integer", "description": "max ms to auto-wait for the control to become clickable (default 2000; 0 = no wait)"},
		}},
		"handler": Callable(self, "_click_control"),
	})
	registry.register({
		"name": "type_text",
		"description": "Type into a text field in the RUNNING game as REAL per-character key events, so text_changed / validation / max_length / text_submitted fire — unlike runtime_set_property, which fires no signals. Returns text_after: what the field actually ACCEPTED. NOTE 'text' is the string to TYPE, not a selector; address by path OR class/name [+nth/under]. Frame semantics (per_frame), clear/submit and the refusals: help(tool=\"type_text\").",
		"help": "Events, not assignment: each character is a real InputEventKey carrying unicode, so text_changed, validators, max_length and text_submitted all fire. runtime_set_property text=... fires none of them, which is why a UI that validates as you type looks broken under it.\n\nFrame semantics:\n  * default — the characters land within ONE frame, so LineEdit's deferred text_changed coalesces to a single emission per call. These are paste semantics, like a player hitting Ctrl+V.\n  * per_frame=true (1.11) — ONE character per frame. Per-keystroke handlers (text_changed on every key, typing minigames, character rate limits) see real typing. The call returns once the stream finishes.\n\nAddressing: 'text' is the PAYLOAD. Target by path, or class / name, narrowed with nth and under. The `text` SELECTOR is deliberately unavailable on this tool — the argument name is taken.\n\nclear=true (default) replaces the existing content; false inserts at the caret.\nsubmit=true presses Enter after typing (LineEdit fires text_submitted).\nA '\\n' inside the string presses Enter mid-stream (a TextEdit line break).\n\nRefuses honestly when the target is hidden, disabled, not editable or not focusable — and returns text_after in the same call, read back after the field applied max_length and any filters, so you never have to guess what was accepted.",
		"input_schema": {"type": "object", "properties": {
			"text": {"type": "string", "description": "the string to type (payload, not a selector)"},
			"path": {"type": "string"}, "class": {"type": "string"}, "name": {"type": "string"},
			"nth": {"type": "integer"}, "under": {"type": "string"},
			"clear": {"type": "boolean", "description": "replace the existing content first (default true; false = insert at the caret)"},
			"submit": {"type": "boolean", "description": "press Enter after typing (default false)"},
			"per_frame": {"type": "boolean", "description": "one char per frame, so text_changed fires per keystroke (default false = paste semantics)"},
		}, "required": ["text"]},
		"handler": Callable(self, "_type_text"),
	})
	registry.register({
		"name": "ui_do",
		"description": "Run a whole semantic UI flow in ONE call — the multi-round-trip killer. steps = an array executed GAME-side across frames, each auto-waiting under its own timeout: click / type / wait / assert / input. Stops on the first failure and returns per-step results naming the blocker. op=run (default) | status | abort; refused while a time_control or replay window is open. Step grammar: help(tool=\"ui_do\").",
		"help": "steps is an array of step objects, executed game-side across frames. Each step auto-waits under its own timeout (timeout_ms per step overrides step_timeout_ms).\n\n  {\"click\": \"Start\"}                        a bare string is a button-text selector\n  {\"click\": {path|class|name|nth|under}}     full click_control semantics, including the disabled / occlusion honesty\n  {\"type\": {name|path..., text, clear?, submit?}}   type_text semantics\n  {\"wait\": {ms: N}} | {\"wait\": {node: \"path\"}} | {\"wait\": {condition: \"<GDScript bool expr>\"}}\n  {\"assert\": {condition}} | {\"assert\": {node, property, equals}}\n  {\"input\": {events: [...]}}                 raw simulate_input passthrough\n\nasserts have EVENTUALLY semantics: the step polls until the condition holds or the step times out, the way Playwright's expect() does. A UI that needs a frame or two to settle passes without a hand-placed wait.\n\nOn the first failure the flow stops and returns the per-step results, with the blocker named (\"occluded by ModalRoot\", \"never became visible\", ...) — you get where it got to, not just that it failed.\n\nops: run (default) | status (poll a flow still running) | abort. Refused while a time_control or replay window is open, because both drive the same frame stepper.",
		"input_schema": {"type": "object", "properties": {
			"steps": {"type": "array", "description": "array of {click|type|wait|assert|input} step objects (op=run)"},
			"step_timeout_ms": {"type": "integer", "description": "per-step auto-wait budget (default 5000)"},
			"settle_frames": {"type": "integer", "description": "frames to let the UI react between steps (default 2)"},
			"op": {"type": "string", "description": "run (default) | status | abort"},
		}},
		"handler": Callable(self, "_ui_do"),
	})
	registry.register({
		"name": "click_node3d",
		"description": "Click a 3D node in the running game: projects its world origin to the screen via the active Camera3D and injects mouse motion + press/release there, so the game's own picking (CollisionObject3D._input_event, or a camera raycast from the cursor) fires. Address by path OR selector (class/name/text [+nth]). Returns clicked=false with a warning if the node is behind the camera or projects off-screen. button=1 default.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "button": {"type": "integer"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}},
		"handler": Callable(self, "_click_node3d"),
	})
	registry.register({
		"name": "click_world",
		"description": "Click at a 3D WORLD position in the running game (unprojected to the screen via the active Camera3D, then motion + press/release). position=[x,y,z]. Use when you know the world coordinate; for a node use click_node3d. Returns clicked=false with a warning if the point is behind the camera or off-screen. button=1 default.",
		"input_schema": {"type": "object", "properties": {
			"position": {"type": "array", "description": "[x,y,z] world coords"},
			"button": {"type": "integer"},
		}, "required": ["position"]},
		"handler": Callable(self, "_click_node3d_world"),
	})
	registry.register({
		"name": "scroll",
		"description": "Mouse-wheel scroll in the running game, at a target Control's center (path OR selector class/name/text[+nth/under]) or an explicit position=[x,y] (gui-space). amount = wheel notches: positive scrolls DOWN, negative UP (default 1). Use to bring off-screen list/menu items into view before click_control.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "position": {"type": "array"}, "amount": {"type": "integer"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}},
		"handler": Callable(self, "_scroll"),
	})
	registry.register({
		"name": "drag",
		"description": "Drag in the running game: press at from=[x,y], glide to to=[x,y] (gui-space coords), release — for sliders, drag-and-drop, camera pans. button=1 default; steps = motion interpolation count (default 8). Get coords from get_control_rect (gui_center) or get_remote_tree.",
		"input_schema": {"type": "object", "properties": {
			"from": {"type": "array"}, "to": {"type": "array"},
			"button": {"type": "integer"}, "steps": {"type": "integer"},
		}, "required": ["from", "to"]},
		"handler": Callable(self, "_drag"),
	})
	registry.register({
		"name": "get_control_rect",
		"description": "Return a Control's rectangle in the running game: gui_rect (canvas space) + screen_rect (content-scale applied) plus their centers. Use screen_center for simulate_input mouse coordinates, or just call click_control. Address by path OR selector (class/name/text [+nth/under]).",
		"readonly": true,
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}},
		"handler": Callable(self, "_get_control_rect"),
	})
	registry.register({
		"name": "record_input",
		"description": "Record real input from the running game. action=start begins capture (then drive the game manually); action=stop returns the captured 'events' array (timestamped) to feed into replay_input. Captures keyboard, mouse, gamepad (joy_button/joy_axis) and touch (touch/touch_drag) events: the same set simulate_input injects, so a recorded session round-trips through replay_input.",
		"input_schema": {"type": "object", "properties": {
			"action": {"type": "string", "description": "start | stop"},
		}, "required": ["action"]},
		"handler": Callable(self, "_record_input"),
	})
	registry.register({
		"name": "replay_input",
		"description": "Replay an event sequence (from record_input stop, or hand-authored) into the running game. Handles every simulate_input event type (key/action/mouse/joy_button/joy_axis/touch/touch_drag). realtime=true honors each event's 't' timestamp for original-speed playback; otherwise events fire back-to-back.",
		"input_schema": {"type": "object", "properties": {
			"events": {"type": "array"}, "realtime": {"type": "boolean"},
		}, "required": ["events"]},
		"handler": Callable(self, "_replay_input"),
	})
	registry.register({
		"name": "time_control",
		"description": "Deterministic control of the RUNNING game: freeze time, step EXACT physics frames, run until a condition, or scale time. ops: freeze | unfreeze | step | step_until | time_scale | status. Other runtime reads (screenshot, get_remote_tree, runtime_get_property, get_play_state) keep working while frozen. Per-op arguments, the step_until terminators and the inputs_per_frame timing rule: help(tool=\"time_control\").",
		"help": "op=freeze      pauses the game (get_tree().paused).\nop=unfreeze    resumes it.\nop=step        {frames: N >= 1, default 1} runs EXACTLY N physics ticks from any state, then re-pauses. Returns the physics-frame delta, which equals N.\nop=step_until  {condition, timeout_sec: 10, max_frames?} unpauses and evaluates a GDScript boolean expression against the running scene root every physics tick — e.g. \"get_node('Player').position.y > 500\" — pausing the instant it is true, or on timeout / max_frames. Reports WHICH terminator fired, the frames consumed, and the final value of the expression.\nop=time_scale  {value} sets Engine.time_scale, clamped 0.01..10.0. 0 is rejected: use freeze.\nop=status      {running, paused, time_scale, physics_frames, in_step}.\n\ninputs_per_frame (op=step) injects events INSIDE the stepped window, one array per tick:\n  [[{type:key, keycode:\"Space\", pressed:true}], [], [{type:key, keycode:\"Space\", pressed:false}]]\nholds jump for two frames, then releases. The index is the tick offset, and a batch longer than `frames` raises frames to cover it.\n\nTIMING (measured, not assumed): _input / _gui_input see an event on the tick it is queued for, but POLLED state — Input.is_key_pressed, Input.is_action_pressed — only reflects it from the NEXT tick. A press queued at tick 2 reads as pressed by polling code from tick 3. Assert accordingly, or you will chase an off-by-one that is not a bug.",
		"input_schema": {"type": "object", "properties": {
			"op": {"type": "string", "description": "freeze | unfreeze | step | step_until | time_scale | status"},
			"frames": {"type": "integer", "description": "op=step: physics ticks to run (>=1, default 1)"},
			"inputs_per_frame": {"type": "array", "description": "op=step: events to inject inside the window, one array per tick (see help — polled state lags by one tick)"},
			"condition": {"type": "string", "description": "op=step_until: GDScript boolean expression, scene root in scope"},
			"timeout_sec": {"type": "number", "description": "op=step_until: wall-clock cap (default 10)"},
			"max_frames": {"type": "integer", "description": "op=step_until: optional physics-frame cap"},
			"value": {"type": "number", "description": "op=time_scale: new Engine.time_scale (0.01..10.0)"},
		}, "required": ["op"]},
		"handler": Callable(self, "_time_control"),
	})
	registry.register({
		"name": "reload_shader",
		"description": "Hot-swap an edited .gdshader into the RUNNING game without restarting it: reloads the file from disk (bypassing the game's resource cache) and reassigns it to every live ShaderMaterial using it, including next_pass chains and per-surface overrides. Turns the shader loop from write -> stop -> play -> wait -> re-place the camera (~40 s) into write -> reload -> screenshot. Returns how many materials were swapped; zero is reported as an error, not a silent success. A shader with a compile error still LOADS — check game_logs after the next frame.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string", "description": "res:// path to the .gdshader file"},
		}, "required": ["path"]},
		"handler": Callable(self, "_reload_shader"),
	})



func _simulate_input(args: Dictionary) -> Dictionary:
	var events: Variant = args.get("events", null)
	if events == null or not (events is Array):
		events = [args]
	var prepared: Array = []
	for ev in events:
		if ev is Dictionary:
			prepared.append(_infer_event_type(ev))
	var r: Dictionary = server.bridge.send_command({"cmd": "input", "events": prepared})
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "input failed"))}
	var n := int(r.get("dispatched", 0))
	if n == 0:
		return {"error": "0 events dispatched: each event needs one of these shapes: {action, pressed} | {keycode, pressed} | {button, position, pressed} | {position} (mouse motion) | {type:joy_button, button} | {type:joy_axis, axis, value} | {type:touch, index, position, pressed} | {type:touch_drag, index, position, relative}."}
	return {"text": "dispatched %d input event(s)" % n}


## A missing 'type' was the #1 silent failure here (the game skips unknown events
## and reports success with 0 dispatched) — infer it from the fields instead.
func _infer_event_type(ev: Dictionary) -> Dictionary:
	if ev.has("type"):
		return ev
	var e := ev.duplicate()
	if e.has("action"):
		e["type"] = "action"
	elif e.has("keycode"):
		e["type"] = "key"
	elif e.has("axis"):
		e["type"] = "joy_axis"
	elif e.has("index"):
		e["type"] = "touch_drag" if e.has("relative") else "touch"
	elif e.has("button"):
		e["type"] = "mouse_button"
	elif e.has("position"):
		e["type"] = "mouse_motion"
	return e


## Copy path + selector fields (class/name/text/nth) from tool args into a bridge cmd,
## so every runtime node op accepts either a path or a live selector. (Also in
## runtime_observe_tools.gd — a tiny helper shared by the drive and observe halves.)
func _add_target(cmd: Dictionary, args: Dictionary) -> void:
	for k in ["path", "class", "name", "text", "nth", "under"]:
		if args.has(k):
			cmd[k] = args[k]


func _runtime_set(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "set", "prop": str(args.get("property", "")), "value": args.get("value")}
	_add_target(cmd, args)
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		var err := {"error": str(r.get("error", "set failed"))}
		if r.has("suggestion"):
			err["suggestion"] = str(r["suggestion"])
		return err
	var payload := {
		"set": "%s.%s" % [str(r.get("resolved", args.get("path", ""))), str(args.get("property", ""))],
		"before": r.get("before"),
		"after": r.get("after"),
	}
	if r.has("note"):
		payload["note"] = str(r["note"])
	elif not bool(r.get("changed", false)):
		payload["note"] = "the value was already what you asked for — nothing changed"
	return {"json": payload}


func _reload_shader(args: Dictionary) -> Dictionary:
	if not server.bridge.is_game_connected():
		return {"error": "game not running (no runtime connection). Call play_scene first, then wait_until condition=game_connected."}
	var path := str(args.get("path", ""))
	if not path.begins_with("res://"):
		return {"error": "path must be a res:// path to a .gdshader file (got '%s')" % path}
	if not FileAccess.file_exists(path):
		return {"error": "no such file: %s" % path}
	var r: Dictionary = server.bridge.send_command({"cmd": "reload_shader", "path": path}, 10000)
	if not bool(r.get("ok", false)):
		var err := {"error": str(r.get("error", "reload_shader failed"))}
		if r.has("suggestion"):
			err["suggestion"] = str(r["suggestion"])
		return err
	return {"text": "%s → %s" % [path, str(r.get("note", "swapped"))]}


func _runtime_call(args: Dictionary) -> Dictionary:
	var call_args: Variant = args.get("args", [])
	if not (call_args is Array):
		call_args = []
	var cmd := {"cmd": "call", "method": str(args.get("method", "")), "args": call_args}
	_add_target(cmd, args)
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "call failed"))}
	var payload := {"result": r.get("result"), "resolved": r.get("resolved", "")}
	if r.has("warning"):
		payload["warning"] = r.get("warning")
	return {"json": payload}


func _find_ui_elements(args: Dictionary) -> Dictionary:
	var cls := str(args.get("class", "Control"))
	var r: Dictionary = server.bridge.send_command({"cmd": "find", "class": cls, "max": int(args.get("max", 100))})
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "find failed"))}
	return {"json": {"nodes": r.get("nodes", [])}}


func _click_button_by_text(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "click_text", "text": str(args.get("text", ""))}
	for k in ["nth", "under", "all"]:
		if args.has(k):
			cmd[k] = args[k]
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "click failed"))}
	if r.has("matches"):
		return {"json": {"matches": r.get("matches", []), "count": r.get("count", 0)}}
	if not bool(r.get("clicked", true)):
		return {"text": "NOT clicked %s — %s" % [str(r.get("path", "")), str(r.get("warning", "no reason given"))]}
	return {"text": "clicked %s (%d match(es))" % [str(r.get("path", "")), int(r.get("match_count", 1))]}


## v1.10: atomic check+click with an actionability AUTO-WAIT. A clicked=false reply is
## side-effect-free (the game refused: hidden/disabled/occluded/clipped), so polling the
## click itself is safe — the moment the target becomes actionable the same call lands it,
## and the click fires at most once. Mirrors _tc_poll_window's bounded poll + bridge pump.
func _click_control(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "click_control"}
	if args.has("button"):
		cmd["button"] = int(args["button"])
	_add_target(cmd, args)
	var first: Dictionary = server.bridge.send_command(cmd)
	var wait_ms := int(args.get("wait_ms", 2000))
	if wait_ms <= 0 or not _click_retryable(first):
		return _click_result(first)
	var lastbox: Array = [first]
	var tick := func() -> Dictionary:
		var r: Dictionary = server.bridge.send_command(cmd)
		lastbox[0] = r
		if not _click_retryable(r):
			return {"done": r}
		return {}
	var polled: Dictionary = MCPJobsScript.poll_until(wait_ms, 120, tick, Callable(server.bridge, "poll_once"))
	if polled.has("done"):
		return _click_result(polled["done"])
	var out := _click_result(lastbox[0])
	if out.has("text"):
		out["text"] = str(out["text"]) + " (auto-waited %d ms — pass wait_ms to change)" % wait_ms
	return out


## Worth retrying inside the wait window: the game said "not clickable YET" (clicked=false
## is side-effect-free) or the node does not exist yet (menus build async). Hard errors
## (not a Control, no viewport) stop the wait immediately.
func _click_retryable(r: Dictionary) -> bool:
	if not bool(r.get("ok", false)):
		var e := str(r.get("error", ""))
		return e.begins_with("node not found") or e.begins_with("no node matches")
	return not bool(r.get("clicked", false))


func _click_result(r: Dictionary) -> Dictionary:
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "click_control failed"))}
	if not bool(r.get("clicked", false)):
		return {"text": "NOT clicked %s — %s" % [str(r.get("path", "")), str(r.get("warning", "no reason given"))]}
	var t := "clicked %s at %s" % [str(r.get("path", "")), str(r.get("at", []))]
	if r.has("received_by"):
		t += " (received by %s)" % str(r.get("received_by", ""))
	if r.has("note"):
		t += " — %s" % str(r.get("note", ""))
	return {"text": t}


func _type_text(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "type_text", "text": str(args.get("text", ""))}
	for k in ["path", "class", "name", "nth", "under", "clear", "submit", "per_frame"]:
		if args.has(k):
			cmd[k] = args[k]
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "type_text failed"))}
	if r.has("warning"):
		return {"text": "NOT typed into %s — %s" % [str(r.get("path", "")), str(r.get("warning", ""))]}
	if bool(r.get("per_frame", false)):
		var queued := int(r.get("queued", 0))
		var budget_ms := 2000 + queued * 67
		var lastbox: Array = [r]
		var tick := func() -> Dictionary:
			var s: Dictionary = server.bridge.send_command({"cmd": "type_status"})
			lastbox[0] = s
			if not bool(s.get("ok", false)) or bool(s.get("done", false)):
				return {"done": s}
			return {}
		var polled: Dictionary = MCPJobsScript.poll_until(budget_ms, 30, tick, Callable(server.bridge, "poll_once"))
		var s: Dictionary = polled.get("done", lastbox[0])
		if not bool(s.get("ok", true)):
			return {"error": str(s.get("error", "type_status failed"))}
		if not bool(s.get("done", false)):
			return {"error": "per-frame typing did not finish in %d ms (%d/%d chars in) - is the game paused? time_control op=unfreeze, or drop per_frame" % [budget_ms, int(s.get("typed", 0)), queued]}
		var tf := "typed %d char(s) into %s frame-by-frame" % [int(s.get("typed", 0)), str(s.get("path", r.get("path", "")))]
		if s.has("warning"):
			tf += " - %s" % str(s.get("warning", ""))
		if s.has("text_after"):
			tf += " — text is now \"%s\"" % str(s.get("text_after", ""))
		return {"text": tf}
	var t := "typed %d char(s) into %s" % [int(r.get("typed", 0)), str(r.get("path", ""))]
	if bool(r.get("submitted", false)):
		t += " + Enter"
	if r.has("text_after"):
		t += " — text is now \"%s\"" % str(r.get("text_after", ""))
	return {"text": t}


func _click_node3d(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "click_node3d"}
	if args.has("button"):
		cmd["button"] = int(args["button"])
	_add_target(cmd, args)
	return _click3d_result(server.bridge.send_command(cmd), "click_node3d")


func _click_node3d_world(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "click_world", "position": args.get("position", [])}
	if args.has("button"):
		cmd["button"] = int(args["button"])
	return _click3d_result(server.bridge.send_command(cmd), "click_world")


func _click3d_result(r: Dictionary, what: String) -> Dictionary:
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", what + " failed"))}
	if not bool(r.get("clicked", false)):
		return {"text": "NOT clicked (%s) — %s" % [str(r.get("target", "")), str(r.get("warning", "off-screen"))]}
	return {"text": "clicked %s at screen %s (world %s)" % [str(r.get("target", "")), str(r.get("at", [])), str(r.get("world", []))]}


func _scroll(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "scroll"}
	for k in ["position", "amount"]:
		if args.has(k):
			cmd[k] = args[k]
	_add_target(cmd, args)
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "scroll failed"))}
	return {"text": "scrolled %s x%d at %s" % [str(r.get("direction", "")), int(r.get("scrolled", 0)), str(r.get("at", []))]}


func _drag(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "drag", "from": args.get("from", []), "to": args.get("to", [])}
	for k in ["button", "steps"]:
		if args.has(k):
			cmd[k] = args[k]
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "drag failed"))}
	return {"text": "dragged %s -> %s (%d steps)" % [str(r.get("from", [])), str(r.get("to", [])), int(r.get("steps", 0))]}


func _get_control_rect(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "control_rect"}
	_add_target(cmd, args)
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "control_rect failed"))}
	return {"json": r.get("rect", {})}


## One editor call, one game-side window: open it, then poll ui_do_status the same
## bounded way _tc_poll_window does. The editor blocks at most UIDO_POLL_CAP_MS — a
## longer flow returns {in_progress} and the agent re-checks with op=status.
const UIDO_POLL_CAP_MS := 30000

func _ui_do(args: Dictionary) -> Dictionary:
	if not server.bridge.is_game_connected():
		return {"error": "game not running (runtime channel not connected) — play_scene, then wait_until condition=game_connected"}
	var op := str(args.get("op", "run")).to_lower()
	if op == "status":
		return _uido_report(server.bridge.send_command({"cmd": "ui_do_status"}))
	if op == "abort":
		var ra: Dictionary = server.bridge.send_command({"cmd": "ui_do_abort"})
		if not bool(ra.get("ok", false)):
			return {"error": str(ra.get("error", "ui_do abort failed"))}
		return {"text": "ui_do aborted (%d step(s) had completed)" % int(ra.get("completed_steps", 0))}
	var steps: Variant = args.get("steps", null)
	if not (steps is Array) or (steps as Array).is_empty():
		return {"error": "op=run needs steps: a non-empty array of {click|type|wait|assert|input} objects"}
	var cmd := {"cmd": "ui_do_open", "steps": steps}
	for k in ["step_timeout_ms", "settle_frames"]:
		if args.has(k):
			cmd[k] = args[k]
	var opened: Dictionary = server.bridge.send_command(cmd)
	if not bool(opened.get("ok", false)):
		return {"error": str(opened.get("error", "ui_do failed to open"))}
	var lastbox: Array = [{}]
	var tick := func() -> Dictionary:
		var r: Dictionary = server.bridge.send_command({"cmd": "ui_do_status"}, 1500)
		if not bool(r.get("ok", false)):
			return {"error": str(r.get("error", "ui_do_status failed"))}
		lastbox[0] = r
		if bool(r.get("done", false)):
			return {"closed": r}
		return {}
	var res: Dictionary = MCPJobsScript.poll_until(UIDO_POLL_CAP_MS, 100, tick, Callable(server.bridge, "poll_once"))
	if res.has("error"):
		return {"error": str(res["error"])}
	if res.has("closed"):
		return _uido_report(res["closed"])
	var last: Dictionary = lastbox[0]
	return {"json": {"in_progress": true, "current": last.get("current", 0), "total": last.get("total", 0),
		"results": last.get("results", []),
		"note": "still running after the editor poll cap — call ui_do op=status to keep tracking, or op=abort"}}


func _uido_report(r: Dictionary) -> Dictionary:
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "ui_do_status failed"))}
	var results: Array = r.get("results", [])
	var failed := bool(r.get("failed", false))
	var out := {
		"done": bool(r.get("done", false)),
		"failed": failed,
		"completed": results.size(),
		"total": int(r.get("total", 0)),
		"results": results,
	}
	if failed and not results.is_empty():
		out["failed_step"] = results[-1]
	return {"json": out}


func _record_input(args: Dictionary) -> Dictionary:
	if not server.bridge.is_game_connected():
		return {"error": "game not running"}
	var action := str(args.get("action", "")).to_lower()
	if action == "start":
		var r1: Dictionary = server.bridge.send_command({"cmd": "record_start"})
		if not bool(r1.get("ok", false)):
			return {"error": str(r1.get("error", "record_start failed"))}
		return {"text": "recording input — drive the game, then call record_input action=stop"}
	if action == "stop":
		var r2: Dictionary = server.bridge.send_command({"cmd": "record_stop"})
		if not bool(r2.get("ok", false)):
			return {"error": str(r2.get("error", "record_stop failed"))}
		var events: Array = r2.get("events", [])
		return {"json": {"count": events.size(), "events": events, "note": "Feed this 'events' array to replay_input."}}
	return {"error": "action must be start or stop"}


func _replay_input(args: Dictionary) -> Dictionary:
	if not server.bridge.is_game_connected():
		return {"error": "game not running"}
	var events: Variant = args.get("events", [])
	if not (events is Array) or events.is_empty():
		return {"error": "events array required (from record_input action=stop)"}
	var realtime := bool(args.get("realtime", false))
	var dispatched := 0
	var last_t := 0.0
	for e in events:
		if not (e is Dictionary):
			continue
		if realtime:
			var t := float(e.get("t", 0.0))
			var gap := int(clampf(t - last_t, 0.0, 5000.0))
			if gap > 0:
				server.bridge.poll_once()
				OS.delay_msec(gap)
			last_t = t
		var r: Dictionary = server.bridge.send_command({"cmd": "input", "events": [e]})
		if bool(r.get("ok", false)):
			dispatched += int(r.get("dispatched", 0))
	return {"text": "replayed %d input event(s)%s" % [dispatched, " (realtime)" if realtime else ""]}



## One op-dispatched rollup (house rule: one tool, not N wrappers — cf. animation_manage).
## freeze/unfreeze/time_scale/status are single bridge round-trips. step/step_until can't
## complete inside one round-trip — the game must run physics FRAMES, which only advance
## between game-loop iterations, so a synchronous handler would block the very frames it
## waits for (the same reason wait_until yields). Instead the game OPENS a stepping window
## and replies at once; we POLL tc_step_status here — mirroring wait_until's bounded loop +
## bridge.poll_once() — until the window closes, then return the frame delta.
func _time_control(args: Dictionary) -> Dictionary:
	if not server.bridge.is_game_connected():
		return {"error": "game not running (runtime channel not connected) — play_scene, then wait_until condition=game_connected"}
	var op := str(args.get("op", "")).to_lower()
	match op:
		"freeze":
			return _tc_simple({"cmd": "tc_freeze"})
		"unfreeze":
			return _tc_simple({"cmd": "tc_unfreeze"})
		"status":
			return _tc_simple({"cmd": "tc_status"})
		"time_scale":
			var cmd := {"cmd": "tc_time_scale"}
			if args.has("value"):
				cmd["value"] = args["value"]
			return _tc_simple(cmd)
		"step":
			return _tc_step(args)
		"step_until":
			return _tc_step_until(args)
		_:
			return {"error": "unknown op '%s' — use freeze | unfreeze | step | step_until | time_scale | status" % op}


## Single bridge round-trip; strip the transport 'ok'/'_id' keys and surface the rest as
## structuredContent (the serializer gives text + structuredContent from a {json} dict).
func _tc_simple(cmd: Dictionary) -> Dictionary:
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "time_control failed"))}
	return {"json": _tc_clean(r)}


func _tc_clean(r: Dictionary) -> Dictionary:
	var out := r.duplicate()
	out.erase("ok")
	out.erase("_id")
	return out


## op=step: open a fixed-frame window, then poll until it closes. The physics-frame delta
## (after - before) MUST equal the frames requested — we compute and assert it here so the
## agent gets a hard, checkable number rather than trusting the tick counter alone.
func _tc_step(args: Dictionary) -> Dictionary:
	var frames: int = maxi(1, int(args.get("frames", 1)))
	var cmd := {"cmd": "tc_step", "frames": frames}
	var ipf: Variant = args.get("inputs_per_frame", null)
	if ipf != null:
		if not (ipf is Array):
			return {"error": "inputs_per_frame must be an array of per-tick event arrays, e.g. [[{\"type\":\"key\",\"keycode\":\"Space\",\"pressed\":true}], []]"}
		for b in (ipf as Array):
			if not (b is Array):
				return {"error": "each inputs_per_frame entry must itself be an ARRAY of events (use [] for a tick with no input)"}
		cmd["inputs_per_frame"] = ipf
		frames = maxi(frames, (ipf as Array).size())
	var open_r: Dictionary = server.bridge.send_command(cmd)
	if not bool(open_r.get("ok", false)):
		return {"error": str(open_r.get("error", "step failed"))}
	var before := int(open_r.get("physics_frames_before", 0))
	var final := _tc_poll_window(frames)
	if final.has("error"):
		return final
	var after := int(final.get("physics_frames_after", before))
	var stepped := int(final.get("frames", 0))
	var delta := after - before
	var out := {
		"op": "step",
		"frames_requested": frames,
		"frames_stepped": stepped,
		"physics_frames_before": before,
		"physics_frames_after": after,
		"physics_frame_delta": delta,
		"delta_matches": delta == frames,
		"paused": final.get("paused", true),
		"time_scale": final.get("time_scale", 1.0),
		"in_step": final.get("in_step", false),
	}
	if final.has("inputs_injected"):
		out["inputs_injected"] = final.get("inputs_injected")
	if open_r.has("note"):
		out["note"] = str(open_r["note"])
	if not bool(final.get("in_step", false)) and delta != frames:
		out["warning"] = "physics frame delta %d != frames requested %d" % [delta, frames]
	return {"json": out}


## op=step_until: open a condition window (or take the immediate-true fast path), then poll
## until the game reports a terminator (condition | timeout | max_frames).
func _tc_step_until(args: Dictionary) -> Dictionary:
	var cond := str(args.get("condition", "")).strip_edges()
	if cond.is_empty():
		return {"error": "step_until needs a 'condition' expression"}
	var cmd := {"cmd": "tc_step_until", "condition": cond}
	for k in ["timeout_sec", "max_frames"]:
		if args.has(k):
			cmd[k] = args[k]
	var open_r: Dictionary = server.bridge.send_command(cmd)
	if not bool(open_r.get("ok", false)):
		return {"error": str(open_r.get("error", "step_until failed"))}
	var before := int(open_r.get("physics_frames_before", 0))
	if not bool(open_r.get("started", false)) and bool(open_r.get("immediate", false)):
		return {"json": {
			"op": "step_until", "condition": cond, "terminator": "condition",
			"immediate": true, "frames": 0, "physics_frames_before": before,
			"condition_value": open_r.get("condition_value"),
		}}
	var timeout_sec := float(open_r.get("timeout_sec", 10.0))
	var final := _tc_poll_window(-1, int(timeout_sec * 1000.0) + 2000)
	if final.has("error"):
		return final
	if bool(final.get("in_step", false)):
		return {"json": {
			"op": "step_until", "condition": cond, "terminator": "in_progress",
			"frames": final.get("frames", 0), "in_step": true,
			"note": "still running after the editor poll cap — call time_control op=status, or step_until again with a smaller timeout_sec",
		}}
	var after := int(final.get("physics_frames_after", before))
	return {"json": {
		"op": "step_until",
		"condition": cond,
		"terminator": final.get("terminator", ""),
		"frames": final.get("frames", 0),
		"physics_frames_before": before,
		"physics_frames_after": after,
		"physics_frame_delta": after - before,
		"condition_value": final.get("condition_value"),
		"paused": final.get("paused", true),
	}}


## Poll the game's tc_step_status until the window closes (in_step=false) or the editor-side
## cap elapses. Mirrors wait_until: hold the main thread briefly, pump the bridge each pass so
## its _process can't starve, and sleep a beat between polls. expected_frames>0 gives a tight
## cap for fixed steps (they finish in ~frames/physics_fps seconds); pass -1 for step_until.
func _tc_poll_window(expected_frames: int, cap_ms: int = -1) -> Dictionary:
	if cap_ms < 0:
		var phys_fps: int = maxi(1, int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 60)))
		cap_ms = maxi(2000, int(1000.0 * float(expected_frames + 5) / float(phys_fps)) + 1500)
	var lastbox: Array = [{}]
	var tick := func() -> Dictionary:
		var r: Dictionary = server.bridge.send_command({"cmd": "tc_step_status"}, 1500)
		if not bool(r.get("ok", false)):
			return {"error": str(r.get("error", "tc_step_status failed"))}
		lastbox[0] = r
		if not bool(r.get("in_step", false)):
			return {"closed": r}
		return {}
	var res: Dictionary = MCPJobsScript.poll_until(cap_ms, 16, tick, Callable(server.bridge, "poll_once"))
	if res.has("error"):
		return res
	if res.has("closed"):
		return _tc_clean(res["closed"])
	var last: Dictionary = lastbox[0]
	return _tc_clean(last) if not last.is_empty() else {"error": "no status from game while stepping"}
