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
## $liteTrimModules and $premiumToolNames: the drive TOOLS must never ship as Lite source. (The game-side
## runtime, runtime/mcp_runtime.gd, is one file for both editions and does ship; see runtime_observe_tools.gd.)

var server

const MCPJobsScript := preload("res://addons/beckett/core/jobs.gd")
const CallArgs := preload("res://addons/beckett/core/callargs.gd")
const PathGuard := preload("res://addons/beckett/core/path_guard.gd")
const RuntimeBridge := preload("res://addons/beckett/core/runtime_bridge.gd")


func _register(registry) -> void:
	registry.register({
		"name": "simulate_input",
		"description": "Inject input into the RUNNING game: keyboard, input actions, mouse (button + motion), GAMEPAD (joy_button, joy_axis) and TOUCH (touch, touch_drag). One event inline, or several via events:[...]. Injected events drive the action system and _input/_gui_input, NOT the raw polling APIs. Event grammar + the polling limit in full: help(tool=\"simulate_input\").",
		"help": "Event types: pass one inline, or several in order via events:[...].\n  {type:key, keycode:\"Space\", pressed:true}\n  {type:action, action:\"ui_accept\", pressed:true}\n  {type:mouse_button, button:1, position:[x,y], pressed:true}   button = MOUSE_BUTTON_* (1=left)\n  {type:mouse_motion, position:[x,y], relative:[dx,dy]}\n  {type:joy_button, button:0, pressed:true, device:0}           button = JOY_BUTTON_* index, 0=A\n  {type:joy_axis, axis:0, value:-1.0, device:0}                  axis = JOY_AXIS_* index, 0=left-X; value clamped -1..1\n  {type:touch, index:0, position:[x,y], pressed:true}\n  {type:touch_drag, index:0, position:[x,y], relative:[dx,dy]}\n\nPositions (1.17+) are in the root viewport's GUI space, the space of click_control's at, get_control_rect gui_center, ui_snapshot rect, drag and scroll. They are converted to window pixels before injection, so they land the same under any content scale. record_input records in that space too.\n\nLIMITS (read this before blaming the game): injected events drive the action system and the _input / _gui_input callbacks. Raw polling APIs such as Input.get_joy_axis() or Input.get_connected_joypads() do NOT reflect injected events. So a game reading actions (Input.get_vector, Input.is_action_pressed) works; one polling raw hardware does not, and no amount of injection will change that.\n\nTouch events arrive at _input as InputEventScreenTouch / InputEventScreenDrag. To also drive mouse-based UI from them, set the project's input_devices/pointing/emulate_mouse_from_touch.",
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
		"help": "Addressing: either path=\"/root/Main/Player\" (or a name, or a relative path), or a live selector: class (native OR a custom class_name) / name / text, optionally narrowed with nth (0-based) and under (an ancestor path).\n\nSub-resource paths: property accepts ':' to descend into a resource on the node.\n  \"environment:volumetric_fog_density\"\n  \"material_override:shader_parameter/tint\"\n  \"position:y\"\n\nValues are converted to the type the property declares, the way runtime_call converts arguments:\n  Vector3: [0, 6, 11] (how before/after return it), \"0 6 11\", \"0, 6, 11\", \"(0, 6, 11)\", \"Vector3(0, 6, 11)\" or {\"x\": 0, \"y\": 6, \"z\": 11}\n  Transform3D: [[x axis], [y axis], [z axis], [origin]] (each [x, y, z]), the same 12 numbers flat, or \"Transform3D(...)\"\n  Color: \"#ff8800\", a name like \"red\", [r, g, b] or [r, g, b, a] in 0..1, or \"Color(1, 0.5, 0, 1)\"\n  enum: its number (a refused name lists the numbers)\nA value that does not fit the type is an ERROR naming the type, never a zero written in its place.\n\nEvery write is READ BACK, and the read-back is the contract:\n  * the response carries before / after;\n  * an unknown property name is an error carrying a did-you-mean;\n  * a write that moved nothing is an ERROR, not a silent pass: the property is read-only, or game code rewrites it every frame;\n  * a value the engine clamped comes back with a note saying so.\nSo ok means the value is live right now, not merely that the call was accepted.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "property": {"type": "string"}, "value": {},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}, "required": ["property", "value"]},
		"handler": Callable(self, "_runtime_set"),
	})
	registry.register({
		"name": "runtime_call",
		"description": "Call a method on a node in the RUNNING game. args = positional array. Address by path OR a live selector: class (native or custom class_name) / name / text [+ nth]; resolves fresh each call (skip the find step). Returns the result plus the 'resolved' path that matched. Or expr= evaluates a GDScript expression there: help(tool=\"runtime_call\").",
		"help": "Two forms.\n\nmethod + args calls one method of a node: a path, or a selector (class, native or a custom class_name / name / text, narrowed with nth and under). Arguments are converted to the types the method declares: a Vector3 takes [x, y, z], \"x y z\", \"(x, y, z)\" or \"Vector3(x, y, z)\", a Transform3D [[x axis], [y axis], [z axis], [origin]]. set / set_deferred / set_indexed hold their value to the type of the property, as runtime_set_property does.\n\nexpr=<GDScript expression> evaluates one expression in the running game and returns its value: self is the node you name, else the scene root. A chain of reads is one call:\n  expr=\"get_node('Skeleton3D').get_bone_global_pose(get_node('Skeleton3D').find_bone('hand.R'))\"\n  path=Player expr=\"position.y + velocity.y\"\ninputs={name: value} binds names the expression reads, so a value is not spliced into its text: expr=\"get_node(n).hp\" inputs={\"n\": \"Player\"}. An input arrives as JSON has it: a number is a float (int(n) where a whole number is wanted) and a vector an array (Vector3(v[0], v[1], v[2])). A name GDScript already uses (max, str, Color, PI ...) would never be read, so it is refused.\n\nIn scope is what the node reaches: its properties and methods, get_node and get_tree (and through them every node of the game), the engine's utility functions (str, abs, lerp ...; GDScript's own range, len and load are not among them) and the constructors. The engine singletons (OS, Input, ResourceLoader) are not names an expression knows, and str_to_var and bytes_to_var_with_objects are refused. An expression can call methods that change the game, and it reaches whatever the game's scene tree reaches: it is a drive tool of the Full edition, not a sandbox. It runs in one frame: keep it to small reads.\n\nThe value comes back typed: an int is an int, a vector an array, a transform [[x axis], [y axis], [z axis], [origin]], an object its text. A value over 12,000 characters of JSON is cut, with a note saying how much there was. An expression that does not parse, fails to run (a missing node) or calls a refused function is an error that quotes it.",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "method": {"type": "string"}, "args": {"type": "array"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
			"expr": {"type": "string"}, "inputs": {"type": "object"},
		}},
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
		"help": "Why not simulate_input: click_control computes the Control's center and injects straight into the viewport in GUI space, bypassing the content-scale / stretch mismatch that makes a coordinate click miss buttons inside containers.\n\nHonest by design: it returns clicked=false with the reason instead of faking success:\n  * hidden;\n  * DISABLED;\n  * scrolled out of view (ScrollContainer ancestors are auto-scrolled first, so this only fires when scrolling could not reach it);\n  * OCCLUDED: another control would receive the event (a popup on top, a modal overlay, a covering ColorRect with mouse_filter STOP). It reports occluded_by=<path> and does NOT activate the wrong control.\n\nAUTO-WAIT: up to wait_ms (default 2000; 0 = a single attempt) for the target to become clickable, so fade-in menus and deferred layout just work. On timeout you get the LAST blocking reason, which is the useful one.\n\nSuccess may include received_by: a mouse_filter PASS child that took the event and bubbled it up to the target. That is a normal Godot outcome, not a miss.\n\nWhere the click lands (1.17): at is the control's center in the ROOT viewport's GUI space, taken through its CanvasLayer (scale, offset, follow_viewport) and the viewport's canvas_transform (a Camera2D), then up through each SubViewportContainer (its stretch_shrink) and embedded window (its position). It is where Godot draws the control: the same point as get_control_rect gui_center and ui_snapshot rect, and the space drag, scroll and simulate_input take. A control inside a SubViewport that no SubViewportContainer shows (a GUI on a 3D panel) is clicked straight in that SubViewport: the reply carries space=<its path>, at is in its own pixels, and nothing above it is checked. Behind a container that is hidden or has mouse_filter IGNORE, or with gui_disable_input on the way, the click is refused with the reason. A button other than 1 goes to whichever embedded window has focus (only a left press moves focus), so it is refused while a dialog that does not hold the target has focus.\n\nSelectors: path, or class / name / text, narrowed with nth (0-based) and under. A bare text selector is scoped to BaseButton, so nth indexes the SAME set and order as click_button_by_text; for a non-button text target, pass class as well.\n\nbutton: 1 = left (default), 2 = right, 3 = middle.",
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
		"help": "steps is an array of step objects, executed game-side across frames. Each step auto-waits under its own timeout (timeout_ms per step overrides step_timeout_ms).\n\n  {\"click\": \"Start\"}                        a bare string is a button-text selector\n  {\"click\": {path|class|name|nth|under}}     full click_control semantics, including the disabled / occlusion honesty\n  {\"type\": {name|path..., text, clear?, submit?}}   type_text semantics\n  {\"wait\": {ms: N}} | {\"wait\": {node: \"path\"}} | {\"wait\": {condition: \"<GDScript bool expr>\"}}\n  {\"assert\": {condition}} | {\"assert\": {node, property, equals}}\n  {\"input\": {events: [...]}}                 raw simulate_input passthrough\n  {\"inject\": {set: [{node, property, value}], call: [{node, method, args}], frames: N}}   patch state in (runtime_set_property / runtime_call machinery), then run N frames (default 1) before the next step\n  {\"state\": {node, path, op, value}}          assert on the game-owned state a node exposes: its _beckett_state() (or _mcp_state()); the group beckett_state (or mcp_state) is what get_remote_tree state=true lists; path is dotted into that dictionary (stats.hp, inventory.0, pos.x); op is eq (default) | ne | lt | le | gt | ge | contains | exists. Flat spelling: {\"kind\": \"state\", node, path, op, value}\n\nEvery result carries a status: pass | fail (an assert was evaluated and was false) | blocked (the step could not get to a judgement: its target never appeared, a wait timed out, an inject was refused, a state node has no state method).\n\nasserts and state steps have EVENTUALLY semantics: the step polls until the condition holds or the step times out, the way Playwright's expect() does. A UI that needs a frame or two to settle passes without a hand-placed wait.\n\nOn the first failure the flow stops and returns the per-step results, with the blocker named (\"occluded by ModalRoot\", \"never became visible\", ...) — you get where it got to, not just that it failed.\n\nops: run (default) | status (poll a flow still running) | abort. Refused while a time_control or replay window is open, because both drive the same frame stepper.",
		"input_schema": {"type": "object", "properties": {
			"steps": {"type": "array", "description": "array of {click|type|wait|assert|input|inject|state} step objects (op=run)"},
			"step_timeout_ms": {"type": "integer", "description": "per-step auto-wait budget (default 5000)"},
			"settle_frames": {"type": "integer", "description": "frames to let the UI react between steps (default 2)"},
			"op": {"type": "string", "description": "run (default) | status | abort"},
		}},
		"handler": Callable(self, "_ui_do"),
	})
	registry.register({
		"name": "click_node3d",
		"description": "Click a 3D node in the running game: projects its world origin to the screen via the Camera3D that renders it and injects mouse motion + press/release there, so the game's own picking (CollisionObject3D._input_event, or a camera raycast from the cursor) fires. Address by path OR selector (class/name/text [+nth]). Returns clicked=false with a warning if the node is behind the camera or projects off-screen. button=1 default. Notes: help(tool=\"click_node3d\").",
		"help": "The point clicked is the node's position, or the center of its bounding box for a VisualInstance3D (a mesh's origin often sits elsewhere).\n\nThe camera is the current Camera3D of the viewport the node is in when it has one, so a node inside a SubViewport (the pixel-art-3d layout's PixelView/SubViewport) is clicked through that SubViewport's camera. Otherwise click_world's rule picks it. Everything else (the route into a SubViewport, the refusals, the notes, physics picking) is as for click_world: help(tool=\"click_world\").",
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string"}, "button": {"type": "integer"},
			"class": {"type": "string"}, "name": {"type": "string"},
			"text": {"type": "string"}, "nth": {"type": "integer"}, "under": {"type": "string"},
		}},
		"handler": Callable(self, "_click_node3d"),
	})
	registry.register({
		"name": "click_world",
		"description": "Click at a 3D WORLD position in the running game (unprojected to the screen via the root's Camera3D, else a SubViewport's, then motion + press/release). position=[x,y,z]. Use when you know the world coordinate; for a node use click_node3d. Returns clicked=false with a warning if the point is behind the camera or off-screen. button=1 default. Notes: help(tool=\"click_world\").",
		"help": "Which camera: the root viewport's current Camera3D (as before 1.17), else the SubViewport with a current Camera3D that a visible SubViewportContainer shows over the largest part of the screen (a pixel-art main view beats a minimap; a tie goes to the later one in the tree). click_node3d tries its node's own viewport first. A SubViewport shown through a TextureRect (a ViewportTexture) is not modeled: click_node3d on a node inside it pushes straight into it, or aim simulate_input at the point on the TextureRect (ui_snapshot gives its rect).\n\nThe route: the point is projected in that SubViewport's pixels and pushed into the root where its container shows that pixel (container position + pixel * stretch_shrink), so the container forwards it like a real click. at is in the root's GUI space and via names the SubViewport. A SubViewport that no container shows is pushed into directly (space=<its path>, with a note).\n\nRefused (clicked=false, nothing sent): the point is behind the camera; it projects outside what the viewport shows, the hidden outer ring of the one-game-pixel-bigger layout included; an embedded window covers it (occluded_by); the container is hidden; a button other than 1 while a dialog has focus (Godot hands such a press to the focused window).\n\nSent with a note naming what will not see it: a control over the container takes the click (occluded_by; a mouse_filter PASS control hands it to its own parents, never to what is drawn under it); the container has mouse_filter IGNORE or the SubViewport has gui_disable_input (only the root's _input and _unhandled_input see it, or _input alone when a mouse_filter STOP control there takes the press, the container included); a mouse_filter STOP control takes the press first (only _input handlers see it); physics_object_picking is off in that viewport (a SubViewport's default: turn it on for CollisionObject3D input_event); the mouse is captured.\n\nPhysics picking runs on the next physics frame, and only in a viewport Godot believes the mouse is in. On 4.3 and later the injected hover motion arranges that. On 4.2 it works until the OS cursor first leaves the game window, then only while the cursor is over it, and with display/window/subwindows/embed_subwindows off the OS cursor decides on every version. event.position in _unhandled_input always carries the click; get_viewport().get_mouse_position() reads the OS cursor and does not.",
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
		"description": "Return a Control's rectangle in the running game: gui_rect (GUI space) + screen_rect (content-scale applied) plus their centers. Use gui_center for simulate_input mouse coordinates, or just call click_control. Address by path OR selector (class/name/text [+nth/under]).",
		"help": "gui_rect and gui_center (1.17) are in the ROOT viewport's GUI space: where the control is drawn, through its CanvasLayer, a Camera2D, each SubViewportContainer (stretch_shrink) and embedded window above it. It is the space click_control, drag, scroll and simulate_input take, and the space of ui_snapshot's rect.\n\nscreen_rect and screen_center are window pixels: the content-scale stretch, the KEEP margins and the window's own transform applied. That is what Input.parse_input_event and OS-level input aim at; a screenshot of a stretched window is in neither space (screenshot annotate=ui boxes controls on the picture itself).\n\nA control inside a SubViewport that no SubViewportContainer shows, or in a native window, carries space=<that viewport's path>, and its gui values are in that viewport's own pixels.",
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
		"help": "op=freeze      pauses the game (get_tree().paused).\nop=unfreeze    resumes it.\nop=step        {frames: N >= 1, default 1} runs N physics ticks, from a frozen or a running game, then freezes it. Every pausable node runs N _physics_process calls and the physics server steps N times; frames_stepped is counted in the game, after its own nodes ran each tick.\nop=step_until  {condition, timeout_sec: 10, max_frames?} runs ticks until a GDScript boolean expression, scene root in scope, is true: e.g. \"get_node('Player').position.y > 500\". It is read when the window opens (already true: no tick runs, immediate:true) and at the start of every tick, once the physics server has handed the scene its last step, and the game freezes before the first tick that would run on a true state. terminator: condition | max_frames | timeout | game_paused. frames: the ticks run. condition_value: what it read then.\nop=time_scale  {value} sets Engine.time_scale, clamped 0.01..10.0. 0 is rejected: use freeze.\nop=status      {running, paused, time_scale, physics_frames, in_step}. physics_frames is the engine's own counter: it keeps counting while frozen.\n\nunfreeze=true (step, step_until) leaves the game running when the window ends, with no settle frame; the reply describes the tick it ended on.\n\ninputs_per_frame (op=step), one array of events per tick:\n  [[{type:key, keycode:\"Space\", pressed:true}], [], [{type:key, keycode:\"Space\", pressed:false}]]\nholds Space on ticks 0 and 1 and lets go before tick 2. A batch longer than frames raises frames to cover it.\n\nTIMING: the events of tick t go in between tick t-1 and tick t (tick 0's when the window opens), outside physics, where real input arrives: _input, _gui_input and _unhandled_input handle them there, a _process frame between the two ticks sees them, and during tick t polled state (Input.is_action_pressed, is_key_pressed, get_vector) reads them and is_action_just_pressed is true, on Godot 4.2 and 4.3+ alike (a 4.2 headless game passes injected events to no node: only polled state sees them there). One exception: a RigidBody's _integrate_forces runs as the physics server hands over a step, at the start of a tick, so after an earlier step window the call that sets tick 0's forces already ran at that window's close and reads tick 0's events one step late (after op=freeze it reads them on time). While a window runs, Engine.max_physics_steps_per_frame is 1, so an idle frame follows every tick. Where none does (the Game view's speed above 1x on Godot 4.6+, or --fixed-fps below the physics rate) later events go in inside physics, at the end of the tick before theirs (4.2 then misses is_action_just_pressed), and the note says so.\n\nSETTLE: after the last tick the game runs one idle frame and is frozen again before that frame is drawn, so a screenshot and what _process draws show the stepped state. That frame moves idle-driven state (_process, Timers, Tweens, idle-mode AnimationPlayers) on by one real-time frame; when a step_until condition then reads differently, the note says what it reads. With physics interpolation on, the drawn frame shows the final transforms.\n\nNot stepped: nodes with process_mode ALWAYS, and code awaiting physics_frame or process_frame, run on every tick, frozen or not. A game that pauses the tree itself ends the window (terminator game_paused) and stays paused. A new step replaces an open one and lets go of what it held (the note says so). The editor waits as long as the window keeps running ticks, up to 30 s (a game with slow frames runs one tick per engine frame in a window, and the Game view's speed below 1x stretches it); a window still open then replies in_step:true: poll op=status.",
		"input_schema": {"type": "object", "properties": {
			"op": {"type": "string", "description": "freeze | unfreeze | step | step_until | time_scale | status"},
			"frames": {"type": "integer", "description": "op=step: physics ticks to run (>=1, default 1)"},
			"inputs_per_frame": {"type": "array", "description": "op=step: one array of events per tick; tick t's events reach the game before tick t runs"},
			"condition": {"type": "string", "description": "op=step_until: GDScript boolean expression, scene root in scope"},
			"timeout_sec": {"type": "number", "description": "op=step_until: wall-clock cap (default 10)"},
			"max_frames": {"type": "integer", "description": "op=step_until: optional physics-frame cap"},
			"unfreeze": {"type": "boolean", "description": "op=step/step_until: keep the game running after the window (default: frozen)"},
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



## Send a command that changes the game (1.17). A busy game still runs a command it did not answer in time, and a game
## that broke into the debugger after the send runs it when it resumes: the error then says so, and to read the state
## back before sending it again, because a call or an input sent twice runs twice.
func _change(cmd: Dictionary, timeout_ms: int = 4000) -> Dictionary:
	return RuntimeBridge.with_kind(server.bridge.send_command(cmd, timeout_ms), RuntimeBridge.KIND_CHANGE)


## Send a command that only reads: a timeout then says that nothing changed.
func _read(cmd: Dictionary, timeout_ms: int = 4000) -> Dictionary:
	return RuntimeBridge.with_kind(server.bridge.send_command(cmd, timeout_ms), RuntimeBridge.KIND_READ)


func _simulate_input(args: Dictionary) -> Dictionary:
	var events: Variant = args.get("events", null)
	if events == null or not (events is Array):
		events = [args]
	var prepared: Array = []
	for ev in events:
		if ev is Dictionary:
			prepared.append(_infer_event_type(ev))
	var r: Dictionary = _change({"cmd": "input", "events": prepared})
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
	var r: Dictionary = _change(cmd)
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
	var guard: Dictionary = PathGuard.check_read(path)
	if guard.has("error"):
		return guard
	if not FileAccess.file_exists(path):
		return {"error": "no such file: %s" % path}
	var r: Dictionary = _change({"cmd": "reload_shader", "path": path}, 10000)
	if not bool(r.get("ok", false)):
		var err := {"error": str(r.get("error", "reload_shader failed"))}
		if r.has("suggestion"):
			err["suggestion"] = str(r["suggestion"])
		return err
	return PathGuard.noted({"text": "%s → %s" % [path, str(r.get("note", "swapped"))]}, guard)


func _runtime_call(args: Dictionary) -> Dictionary:
	var expr := "" if args.get("expr") == null else str(args.get("expr")).strip_edges()
	var method := "" if args.get("method") == null else str(args.get("method")).strip_edges()
	if not expr.is_empty():
		if not method.is_empty():
			return {"error": "runtime_call takes method (a call) or expr (an expression), not both"}
		return _runtime_expr(args, expr)
	if method.is_empty():
		return {"error": "runtime_call needs method=<name> (with args), or expr=<GDScript expression>"}
	var call_args: Variant = args.get("args", [])
	if not (call_args is Array):
		call_args = []
	var cmd := {"cmd": "call", "method": str(args.get("method", "")), "args": call_args}
	_add_target(cmd, args)
	var r: Dictionary = _change(cmd)
	if not bool(r.get("ok", false)):
		var err := {"error": str(r.get("error", "call failed"))}
		if r.has("suggestion"):
			err["suggestion"] = str(r["suggestion"])
		return err
	var payload := {"result": r.get("result"), "resolved": r.get("resolved", "")}
	if r.has("warning"):
		payload["warning"] = r.get("warning")
	return {"json": payload}


## The most of an expression's value one reply carries, in characters of JSON: about 3k tokens (game_state's cap too).
const EXPR_RESULT_MAX := 12000
## How much of the expression an error quotes.
const EXPR_SHOWN_MAX := 200
## Inputs one expression may bind.
const EXPR_INPUTS_MAX := 32


## runtime_call expr= (1.17): one GDScript expression evaluated in the running game, its value back typed, in one call.
## On the scene root it is the game's `eval` command, which the playtest expr assert sends too; on the node the call
## names, or with `inputs` bound, it is `eval_at`, which a runtime from before 1.17 answers "unknown cmd" without running
## anything. Its errors quote the expression, a value too big for a reply is cut with a note, and the operands of a
## false-looking value are not read a second time (bare). The expression is not sandboxed: help says so.
func _runtime_expr(args: Dictionary, expr: String) -> Dictionary:
	var inputs: Variant = args.get("inputs", {})
	if inputs == null:
		inputs = {}
	if not (inputs is Dictionary):
		return {"error": "inputs must be an object of name: value pairs, such as {\"n\": \"Player\"}"}
	if (inputs as Dictionary).size() > EXPR_INPUTS_MAX:
		return {"error": "inputs: at most %d names per expression (got %d)" % [EXPR_INPUTS_MAX, (inputs as Dictionary).size()]}
	for k in inputs:
		var bad := input_name_error(str(k))
		if not bad.is_empty():
			return {"error": bad}
	var cmd := {"cmd": "eval", "expr": expr, "bare": true}
	if not (inputs as Dictionary).is_empty():
		cmd["inputs"] = inputs
	_add_target(cmd, args)
	for k in ["path", "class", "name", "text"]:
		if not str(cmd.get(k, "")).is_empty():
			cmd["cmd"] = "eval_at"
	if cmd.has("inputs"):
		cmd["cmd"] = "eval_at"
	var r: Dictionary = server.bridge.send_command(cmd)
	if not bool(r.get("ok", false)):
		var err := str(r.get("error", "eval failed"))
		if err == "unknown cmd" and cmd["cmd"] == "eval_at":
			return {"error": "the running game started before this Beckett: its runtime runs an expression only on the scene root, without inputs, and ran nothing. Restart it (stop_scene, then play_scene) and call again"}
		if err.begins_with("expr "):
			err += " (in: %s)" % expr_shown(expr)
		return {"error": err}
	var payload := capped_value(r.get("value"))
	payload["resolved"] = r.get("resolved", ".")
	return {"json": payload}


## {result} for an expression's value, or {result, note} when it is over EXPR_RESULT_MAX characters of JSON: an array or a
## dictionary keeps as many whole entries as fit, anything else is cut as text. Static and pure for the unit suite.
static func capped_value(v: Variant) -> Dictionary:
	var size := JSON.stringify(v).length()
	if size <= EXPR_RESULT_MAX:
		return {"result": v}
	var note := "the value is %d characters of JSON, over the %d one reply carries" % [size, EXPR_RESULT_MAX]
	var ask := "Ask for less: one entry, slice(0, 20), size()"
	var used := 2
	if v is Array:
		var kept: Array = []
		for item in v:
			used += JSON.stringify(item).length() + 1
			if used > EXPR_RESULT_MAX:
				break
			kept.append(item)
		return {"result": kept, "note": "%s: the first %d of %d entries are here. %s" % [note, kept.size(), (v as Array).size(), ask]}
	if v is Dictionary:
		var kept_map := {}
		for k in v:
			used += JSON.stringify(str(k)).length() + JSON.stringify(v[k]).length() + 2
			if used > EXPR_RESULT_MAX:
				break
			kept_map[k] = v[k]
		return {"result": kept_map, "note": "%s: the first %d of %d entries are here. %s" % [note, kept_map.size(), (v as Dictionary).size(), ask]}
	var text := str(v) if v is String else JSON.stringify(v)
	return {"result": text.left(EXPR_RESULT_MAX), "note": "%s: cut to its first %d characters" % [note, EXPR_RESULT_MAX]}


## "" when `name` can be an input of an expression, else why not. A name must be an identifier, and one GDScript already
## gives a meaning (a utility function such as max or str, a type such as Color, a constant such as PI, self, true) is
## read as that meaning before an input is looked at, so the expression would never see the value: such a name is tried
## on a probe expression and refused when it does not read back the value bound to it.
static func input_name_error(name: String) -> String:
	var shown := name.left(40)
	var ident := RegEx.create_from_string("^[A-Za-z_][A-Za-z0-9_]*$")
	if ident.search(name) == null:
		return "inputs: '%s' is not a name an expression can read: letters, digits and _, not starting with a digit" % shown
	var marker := "beckett-input-probe"
	var probe := Expression.new()
	if probe.parse(name, PackedStringArray([name])) == OK:
		var got: Variant = probe.execute([marker], null, false)
		if not probe.has_execute_failed() and got is String and got == marker:
			return ""
	return "inputs: '%s' already means something in GDScript (a built-in function, type or constant, such as max, str, Color or PI), so the expression would never read your value: pick another name" % shown


## The expression as an error quotes it: one line, cut at EXPR_SHOWN_MAX characters.
static func expr_shown(expr: String) -> String:
	var one := expr.replace("\r", " ").replace("\n", " ").strip_edges()
	return one if one.length() <= EXPR_SHOWN_MAX else one.left(EXPR_SHOWN_MAX) + "..."


func _find_ui_elements(args: Dictionary) -> Dictionary:
	var cls := str(args.get("class", "Control"))
	var r: Dictionary = _read({"cmd": "find", "class": cls, "max": int(args.get("max", 100))})
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "find failed"))}
	return {"json": {"nodes": r.get("nodes", [])}}


func _click_button_by_text(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "click_text", "text": str(args.get("text", ""))}
	for k in ["nth", "under", "all"]:
		if args.has(k):
			cmd[k] = args[k]
	var r: Dictionary = _change(cmd)
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
	var first: Dictionary = _change(cmd)
	var wait_ms := int(args.get("wait_ms", 2000))
	if wait_ms <= 0 or not _click_retryable(first):
		return _click_result(first)
	var lastbox: Array = [first]
	var tick := func() -> Dictionary:
		var r: Dictionary = _change(cmd)
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
	if r.has("space"):
		t += " in %s" % str(r["space"])
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
	var r: Dictionary = _change(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "type_text failed"))}
	if r.has("warning"):
		return {"text": "NOT typed into %s — %s" % [str(r.get("path", "")), str(r.get("warning", ""))]}
	if bool(r.get("per_frame", false)):
		var queued := int(r.get("queued", 0))
		var budget_ms := 2000 + queued * 67
		var lastbox: Array = [{}]
		var tick := func() -> Dictionary:
			var s: Dictionary = server.bridge.send_command({"cmd": "type_status"})
			if bool(s.get("timeout", false)):
				return {}
			lastbox[0] = s
			if not bool(s.get("ok", false)) or bool(s.get("done", false)):
				return {"done": s}
			return {}
		var polled: Dictionary = MCPJobsScript.poll_until(budget_ms, 30, tick, Callable(server.bridge, "poll_once"))
		var s: Dictionary = polled.get("done", lastbox[0])
		if s.is_empty():
			return {"error": "per-frame typing into %s: the game answered no status poll in %d ms (busy, or stopped in the debugger: get_play_state). It may still be typing: read the field back before you type again" % [str(r.get("path", "")), budget_ms]}
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
	return _click3d_result(_change(cmd), "click_node3d")


func _click_node3d_world(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "click_world", "position": args.get("position", [])}
	if args.has("button"):
		cmd["button"] = int(args["button"])
	return _click3d_result(_change(cmd), "click_world")


## at is in the root's GUI space (or in `space`'s pixels), not screen pixels; via names the SubViewport whose camera
## was used, and a note says what will not see the click.
func _click3d_result(r: Dictionary, what: String) -> Dictionary:
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", what + " failed"))}
	var via := (" via %s" % str(r["via"])) if r.has("via") else ""
	if not bool(r.get("clicked", false)):
		return {"text": "NOT clicked (%s)%s: %s" % [str(r.get("target", "")), via, str(r.get("warning", "off-screen"))]}
	var t := "clicked %s at %s (world %s)%s" % [str(r.get("target", "")), str(r.get("at", [])), str(r.get("world", [])), via]
	if r.has("space") and str(r["space"]) != str(r.get("via", "")):
		t += " in %s" % str(r["space"])
	if r.has("note"):
		t += " - %s" % str(r["note"])
	return {"text": t}


func _scroll(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "scroll"}
	for k in ["position", "amount"]:
		if args.has(k):
			cmd[k] = args[k]
	_add_target(cmd, args)
	var r: Dictionary = _change(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "scroll failed"))}
	return {"text": "scrolled %s x%d at %s" % [str(r.get("direction", "")), int(r.get("scrolled", 0)), str(r.get("at", []))]}


func _drag(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "drag", "from": args.get("from", []), "to": args.get("to", [])}
	for k in ["button", "steps"]:
		if args.has(k):
			cmd[k] = args[k]
	var r: Dictionary = _change(cmd)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "drag failed"))}
	return {"text": "dragged %s -> %s (%d steps)" % [str(r.get("from", [])), str(r.get("to", [])), int(r.get("steps", 0))]}


func _get_control_rect(args: Dictionary) -> Dictionary:
	var cmd := {"cmd": "control_rect"}
	_add_target(cmd, args)
	var r: Dictionary = _read(cmd)
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
		return _uido_report(_read({"cmd": "ui_do_status"}))
	if op == "abort":
		var ra: Dictionary = _change({"cmd": "ui_do_abort"})
		if not bool(ra.get("ok", false)):
			return {"error": str(ra.get("error", "ui_do abort failed"))}
		return {"text": "ui_do aborted (%d step(s) had completed)" % int(ra.get("completed_steps", 0))}
	var steps: Variant = args.get("steps", null)
	if not (steps is Array) or (steps as Array).is_empty():
		return {"error": "op=run needs steps: a non-empty array of {click|type|wait|assert|input|inject|state} objects"}
	var cmd := {"cmd": "ui_do_open", "steps": steps}
	for k in ["step_timeout_ms", "settle_frames"]:
		if args.has(k):
			cmd[k] = args[k]
	var opened: Dictionary = _change(cmd)
	if not bool(opened.get("ok", false)):
		return {"error": str(opened.get("error", "ui_do failed to open"))}
	var lastbox: Array = [{}]
	var tick := func() -> Dictionary:
		var r: Dictionary = server.bridge.send_command({"cmd": "ui_do_status"}, 1500)
		if bool(r.get("timeout", false)):
			return {}
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
		var r1: Dictionary = _change({"cmd": "record_start"})
		if not bool(r1.get("ok", false)):
			return {"error": str(r1.get("error", "record_start failed"))}
		return {"text": "recording input — drive the game, then call record_input action=stop"}
	if action == "stop":
		var r2: Dictionary = _change({"cmd": "record_stop"})
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
	var realtime := CallArgs.flag(args, "realtime")
	var dispatched := 0
	var last_t := 0.0
	for i in events.size():
		var e: Variant = events[i]
		if not (e is Dictionary):
			continue
		if realtime:
			var t := float(e.get("t", 0.0))
			var gap := int(clampf(t - last_t, 0.0, 5000.0))
			if gap > 0:
				server.bridge.poll_once()
				OS.delay_msec(gap)
			last_t = t
		var r: Dictionary = _change({"cmd": "input", "events": [e]})
		if r.has("timeout") or r.has("delivered"):
			return {"error": "event %d of %d got no answer, so %d event(s) after it were not sent (%d replayed before it). %s" % [i + 1, events.size(), events.size() - i - 1, dispatched, str(r.get("error", ""))]}
		if bool(r.get("ok", false)):
			dispatched += int(r.get("dispatched", 0))
	return {"text": "replayed %d input event(s)%s" % [dispatched, " (realtime)" if realtime else ""]}



## One op-dispatched rollup (house rule: one tool, not N wrappers, cf. animation_manage).
## freeze/unfreeze/time_scale/status are single bridge round-trips. step/step_until can't
## complete inside one round-trip: the game must run physics FRAMES, which only advance
## between game-loop iterations, so a synchronous handler would block the very frames it
## waits for (the same reason wait_until yields). Instead the game OPENS a window on its tick
## clock (runtime/step_clock.gd) and replies at once; we POLL tc_step_status here, mirroring
## wait_until's bounded loop + bridge.poll_once(), until the window closes, then report what
## the game counted.
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
			return _tc_simple({"cmd": "tc_status"}, RuntimeBridge.KIND_READ)
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
func _tc_simple(cmd: Dictionary, kind: String = "change") -> Dictionary:
	var r: Dictionary = RuntimeBridge.with_kind(server.bridge.send_command(cmd), kind)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "time_control failed"))}
	return {"json": _tc_clean(r)}


func _tc_clean(r: Dictionary) -> Dictionary:
	var out := r.duplicate()
	out.erase("ok")
	out.erase("_id")
	return out


## op=step: open a fixed-frame window, then poll until it closes. frames_stepped is the game's own count of the ticks
## its scene ran, after its nodes ran each one (runtime/step_clock.gd); the engine's frame counter is no witness for it,
## because it also counts ticks the scene skipped, so the reply carries no counter.
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
	if CallArgs.flag(args, "unfreeze"):
		cmd["unfreeze"] = true
	var open_r: Dictionary = _change(cmd)
	if not bool(open_r.get("ok", false)):
		return {"error": str(open_r.get("error", "step failed"))}
	frames = maxi(frames, int(open_r.get("frames_requested", frames)))
	var tps: int = int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 60))
	var final := _tc_poll_window(step_poll_cap_ms(frames, tps))
	if final.has("error"):
		return final
	var out := {
		"op": "step",
		"frames_requested": frames,
		"frames_stepped": int(final.get("frames", 0)),
		"paused": final.get("paused", true),
		"time_scale": final.get("time_scale", 1.0),
	}
	if final.has("inputs_injected"):
		out["inputs_injected"] = final.get("inputs_injected")
	var notes: Array = []
	if bool(final.get("in_step", false)):
		out["in_step"] = true
		notes.append("still running after the editor poll cap: time_control op=status says when it has ended")
	elif str(final.get("terminator", "done")) != "done":
		out["terminator"] = str(final.get("terminator", ""))
	for n in [open_r.get("note", ""), final.get("note", "")]:
		if not str(n).is_empty():
			notes.append(str(n))
	if not notes.is_empty():
		out["note"] = "; ".join(PackedStringArray(notes))
	return {"json": out}


## op=step_until: open a condition window (or take the immediate-true fast path), then poll
## until the game reports a terminator (condition | max_frames | timeout | game_paused).
func _tc_step_until(args: Dictionary) -> Dictionary:
	var cond := str(args.get("condition", "")).strip_edges()
	if cond.is_empty():
		return {"error": "step_until needs a 'condition' expression"}
	var cmd := {"cmd": "tc_step_until", "condition": cond}
	for k in ["timeout_sec", "max_frames"]:
		if args.has(k):
			cmd[k] = args[k]
	if CallArgs.flag(args, "unfreeze"):
		cmd["unfreeze"] = true
	var open_r: Dictionary = _change(cmd)
	if not bool(open_r.get("ok", false)):
		return {"error": str(open_r.get("error", "step_until failed"))}
	if not bool(open_r.get("started", false)) and bool(open_r.get("immediate", false)):
		var now := {"op": "step_until", "terminator": "condition", "immediate": true, "frames": 0,
			"condition_value": open_r.get("condition_value"), "paused": open_r.get("paused", true)}
		if not str(open_r.get("note", "")).is_empty():
			now["note"] = str(open_r["note"])
		return {"json": now}
	var timeout_sec := float(open_r.get("timeout_sec", 10.0))
	var final := _tc_poll_window(int(timeout_sec * 1000.0) + 2000)
	if final.has("error"):
		return final
	if bool(final.get("in_step", false)):
		return {"json": {
			"op": "step_until", "terminator": "in_progress",
			"frames": final.get("frames", 0), "in_step": true,
			"note": "still running after the editor poll cap: call time_control op=status, or step_until again with a smaller timeout_sec",
		}}
	var out := {
		"op": "step_until",
		"terminator": final.get("terminator", ""),
		"frames": final.get("frames", 0),
		"condition_value": final.get("condition_value"),
		"paused": final.get("paused", true),
	}
	var notes: Array = []
	for n in [open_r.get("note", ""), final.get("note", "")]:
		if not str(n).is_empty():
			notes.append(str(n))
	if not notes.is_empty():
		out["note"] = "; ".join(PackedStringArray(notes))
	return {"json": out}


## How long op=step waits for its window: the frames at the physics rate plus 8 more (the closing tick, a frozen
## tick when interpolation needs one, the settle frame and the poll that sees it, and slack) plus 1.5 s; never under 2 s.
## A rate of 0 or less counts as one tick a second.
static func step_poll_cap_ms(frames: int, ticks_per_second: int) -> int:
	return maxi(2000, int(1000.0 * float(frames + 8) / float(maxi(1, ticks_per_second))) + 1500)


## The longest one op=step / op=step_until call waits for a window that is still running ticks (see _tc_poll_window).
const STEP_POLL_MAX_MS := 30000


## Poll the game's tc_step_status until the window closes (in_step=false). Mirrors wait_until: hold the main thread
## briefly, pump the bridge each pass so its _process can't starve, and sleep a beat between polls. `cap_ms` is the wait the
## window should need; one still running ticks when it runs out gets another cap_ms while its frame count keeps moving, up to
## STEP_POLL_MAX_MS in all (MCPJobsScript.poll_while_moving). A game whose frames are slow runs one tick per engine frame in a
## window (step_clock.gd), and the Game view's speed below 1x stretches it, so the cap from the physics rate alone can be short.
func _tc_poll_window(cap_ms: int) -> Dictionary:
	var lastbox: Array = [{}]
	var tick := func() -> Dictionary:
		var r: Dictionary = server.bridge.send_command({"cmd": "tc_step_status"}, 1500)
		if bool(r.get("timeout", false)):
			return {}
		if not bool(r.get("ok", false)):
			return {"error": str(r.get("error", "tc_step_status failed"))}
		lastbox[0] = r
		if not bool(r.get("in_step", false)):
			return {"closed": r}
		return {}
	var frames := func() -> int: return int((lastbox[0] as Dictionary).get("frames", 0))
	var res: Dictionary = MCPJobsScript.poll_while_moving(cap_ms, maxi(cap_ms, STEP_POLL_MAX_MS), 16, tick, frames, Callable(server.bridge, "poll_once"))
	if res.has("error"):
		return res
	if res.has("closed"):
		return _tc_clean(res["closed"])
	var last: Dictionary = lastbox[0]
	return _tc_clean(last) if not last.is_empty() else {"error": "the game answered no status poll while stepping (busy for the whole %d ms): the step still runs, so call time_control op=status before you step again" % cap_ms}
