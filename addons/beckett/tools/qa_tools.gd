@tool
extends RefCounted
class_name BeckettQaTools

## QA / assertions (P1) — the verify half of the autonomous loop. Assertions return a
## clear PASS, or surface an error so the agent notices a failure and fixes it.

const Reflect := preload("res://addons/beckett/core/reflection.gd")
const PathGuard := preload("res://addons/beckett/core/path_guard.gd")
const CallArgs := preload("res://addons/beckett/core/callargs.gd")
const TypedJson := preload("res://addons/beckett/core/typed_json.gd")
const ImageDiff := preload("res://addons/beckett/tools/image_diff.gd")
const CapturesScript := preload("res://addons/beckett/core/captures.gd")
const ObserveTools := preload("res://addons/beckett/tools/runtime_observe_tools.gd")

var server


func _register(registry) -> void:
	registry.register({
		"name": "assert_node_state",
		"description": "Assert a node's property equals an expected value. Checks the open scene by default; set runtime=true to check the running game. Fails loudly (error) if it doesn't match.",
		"readonly": true,
		"input_schema": {"type": "object", "properties": {
			"target": {"type": "string"}, "property": {"type": "string"},
			"equals": {}, "runtime": {"type": "boolean"},
		}, "required": ["target", "property", "equals"]},
		"handler": Callable(self, "_assert_node_state"),
	})
	registry.register({
		"name": "assert_screen_text",
		"description": "Assert that some visible UI node in the running game has text containing the given string.",
		"readonly": true,
		"input_schema": {"type": "object", "properties": {
			"text": {"type": "string"},
		}, "required": ["text"]},
		"handler": Callable(self, "_assert_screen_text"),
	})
	registry.register({
		"name": "compare_screenshots",
		"description": "Capture the running game and compare against a baseline PNG (res:// or user://). First run (or save_baseline=true) saves the baseline; later runs return diff_pct, changed pixels, pass/fail vs tolerance. Needs a non-headless play session (RHI). help(tool=\"compare_screenshots\").",
		"help": "Fields of a compare:\n  diff_pct    both frames shrunk to 64x64 and their mean channel difference in percent: the number pass and tolerance judge, computed as it always was. Soft light over the whole frame reads about 2% here, while a few hundred flickering pixels barely move it.\n  changed     the pixels whose largest channel (R, G, B or A) moved by more than threshold levels (a whole number 0..255, default 8), counted over every pixel at the captured resolution. changed_pct is their share of the frame.\n  bbox        [x, y, w, h] around them when any changed, in the form screenshot region= takes: capture that region to look closer.\n  max_delta   the largest channel move anywhere in the frame, counted or not: 2 is soft light, 200 a real change.\nThe counts need the frame and the baseline at the same size. When they differ, size_mismatch gives both sizes and the counts are left out; diff_pct still compares them the old way. save_baseline=true mints a new baseline.\n\ndiff_image=true also parks a picture of the change in the capture store (the frame dimmed to gray, each changed pixel magenta) and returns its capture:// link and absolute path, never the picture itself. It is made only when something changed.\n\nviewport=<SubViewport path> compares that SubViewport's own game pixels at their native size, as screenshot viewport= reads them. The baseline has to be captured the same way: save_baseline=true with the same viewport=, or screenshot viewport=<path> save_to=<baseline>. A window baseline against a game-pixel frame is a size mismatch. A SubViewport that is not redrawing (its container hidden, or its update mode Disabled or Once) adds stale, \"may be an old frame\": nothing changed then proves nothing. hdr says a float frame was converted to 8 bits.\n\nCost: the game sends the frame at full resolution (loopback bytes, no tokens), and the count runs on the editor's main thread. Identical frames return at once, a change under the threshold everywhere costs one native pass, and only the 32x32 tiles that differ are scanned pixel by pixel.",
		"readonly": true,
		"input_schema": {"type": "object", "properties": {
			"baseline": {"type": "string", "description": "res:// or user:// PNG path"},
			"tolerance": {"type": "number", "description": "max diff_pct to pass (default 2.0)"},
			"save_baseline": {"type": "boolean"},
			"threshold": {"type": "integer", "description": "change cutoff, 0..255 levels (default 8)"},
			"diff_image": {"type": "boolean"},
			"viewport": {"type": "string", "description": "SubViewport path, as in screenshot"},
		}, "required": ["baseline"]},
		"handler": Callable(self, "_compare_screenshots"),
	})
	registry.register({
		"name": "ui_audit",
		"description": "Deterministic layout QA over the RUNNING game's UI — the checks vision does badly and rect math does exactly: offscreen, zero_size, overlap, text_overflow, small_target (touch), mouse_only, plus the keyboard/gamepad focus GRAPH. Returns {issues, counts, checked, focus}. Run it after building UI, before shipping, or when a player says \"I can't click that\". Scope with path=. Every issue kind defined: help(tool=\"ui_audit\").",
		"output_schema": {"type": "object", "properties": {
			"issues": {"type": "array"}, "counts": {"type": "object"},
			"checked": {"type": "object"}, "focus": {"type": "object"},
			"viewport": {"type": "array"}, "truncated": {"type": "boolean"},
		}, "required": ["issues", "counts", "checked", "focus"]},
		"help": "Issue kinds:\n  offscreen         a VISIBLE interactive control lying entirely outside the viewport\n  zero_size         a control with no area to hit\n  overlap           two interactive controls overlapping >= overlap_min_ratio of the smaller one, in the same window, neither an ancestor of the other\n  text_overflow     a Label or Button whose text needs more pixels than the control has. Measured via minimum size; autowrap labels are excluded, because wrapping is not overflow\n  small_target      an interactive rect below touch_min px. Pass 44 for a mobile audit (the platform guideline); 0 = off, and off is the default\n  mouse_only        a BaseButton with focus_mode NONE, so keyboard and gamepad can never reach it\n\nRects are compared in the root viewport's GUI space, the space ui_snapshot reports (1.17), so controls on different CanvasLayers, inside SubViewports and in dialogs line up as they do on screen.\n\nThe focus GRAPH (1.11) walks Tab / arrow navigation the way a player without a mouse does:\n  no_initial_focus    focusables exist but nothing HAS focus, so a gamepad user cannot start navigating\n  focus_unreachable   no chain of focus moves from the entry point ever reaches it\n  focus_dead_end      focus can enter but never leave\n\nReturns {issues, counts, checked, focus: {focusable, entry, reachable}}.",
		"readonly": true,
		"input_schema": {"type": "object", "properties": {
			"path": {"type": "string", "description": "subtree root to scope the audit"},
			"touch_min": {"type": "number", "description": "flag interactive targets smaller than this many px (0 = off; 44 = mobile guideline)"},
			"overlap_min_ratio": {"type": "number", "description": "overlap fraction of the smaller control to flag (default 0.25)"},
			"max": {"type": "integer", "description": "issue cap (default 100)"},
		}},
		"handler": Callable(self, "_ui_audit"),
	})
	registry.register({
		"name": "assert_scene",
		"description": "Assert a SAVED scene file has the structure you expect: at least min_nodes nodes, every class in require_types present, and (optionally) that it is the project's main scene. Reads the .tscn from disk — cannot be faked from chat — so it's the objective gate after building or generating any scene.",
		"readonly": true,
		"output_schema": {"type": "object", "properties": {
			"pass": {"type": "boolean"}, "reasons": {"type": "array"},
			"scene": {"type": "string"}, "main_scene_set": {"type": "boolean"},
			"node_count": {"type": "integer"}, "types_present": {"type": "array"},
			"missing_types": {"type": "array"},
		}, "required": ["pass", "reasons"]},
		"input_schema": {"type": "object", "properties": {
			"scene": {"type": "string", "description": "scene path (default: application/run/main_scene)"},
			"min_nodes": {"type": "integer", "description": "minimum node count (default 1)"},
			"require_types": {"type": "array", "items": {"type": "string"}, "description": "class names that MUST appear, e.g. [\"CharacterBody2D\",\"Area2D\"]"},
			"require_main_scene": {"type": "boolean", "description": "also assert this scene IS application/run/main_scene"},
		}},
		"handler": Callable(self, "_assert_scene"),
	})


func _ui_audit(args: Dictionary) -> Dictionary:
	if not server.bridge.is_game_connected():
		return {"error": "game not running (no runtime connection). Call play_scene first, then wait_until condition=game_connected."}
	var cmd := {"cmd": "ui_audit"}
	for k in ["path", "touch_min", "overlap_min_ratio", "max"]:
		if args.has(k):
			cmd[k] = args[k]
	var r: Dictionary = server.bridge.send_command(cmd, 8000)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "ui_audit failed"))}
	var out := r.duplicate()
	out.erase("ok")
	out.erase("_id")
	return {"json": out}


## Both branches judge by TypedJson.same, the rule every node_state assert uses (1.17): equals arrives as JSON, so a
## whole number is a float, and the old text compare failed an int property against it ("12" is not "12.0" on 4.4+)
## on the editor branch, and on the runtime branch as soon as a read returned the int. The editor branch shows the form
## it always printed, and holds when either that form or the value itself matches.
func _assert_node_state(args: Dictionary) -> Dictionary:
	var target := str(args.get("target", ""))
	var prop := str(args.get("property", ""))
	var actual: Variant
	var live: Variant
	if CallArgs.flag(args, "runtime"):
		var r: Dictionary = server.bridge.send_command({"cmd": "get", "path": target, "prop": prop})
		if not bool(r.get("ok", false)):
			return {"error": str(r.get("error", "runtime get failed"))}
		actual = r.get("value")
		live = actual
	else:
		var obj := Reflect.resolve(target)
		if obj == null:
			return {"error": Reflect.miss(target)}
		live = obj.get(prop)
		actual = Reflect.to_json_safe(live)
	var expected: Variant = args.get("equals")
	if TypedJson.same(actual, expected) or TypedJson.same(live, expected):
		return {"text": "PASS: %s.%s == %s" % [target, prop, str(expected)]}
	return {"error": "assertion failed: %s.%s = %s (expected %s)" % [target, prop, str(actual), str(expected)]}


func _assert_screen_text(args: Dictionary) -> Dictionary:
	var text := str(args.get("text", ""))
	var r: Dictionary = server.bridge.send_command({"cmd": "find", "text": text, "max": 1})
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "game not running"))}
	var nodes: Array = r.get("nodes", [])
	if nodes.size() > 0:
		return {"text": "PASS: found '%s' on screen (%s)" % [text, str(nodes[0].get("path", ""))]}
	return {"error": "assertion failed: text '%s' not found on screen" % text}


func _assert_scene(args: Dictionary) -> Dictionary:
	var scene := str(args.get("scene", ""))
	var main_setting := str(ProjectSettings.get_setting("application/run/main_scene", ""))
	if scene.is_empty():
		scene = main_setting
	if scene.is_empty():
		return {"json": {"pass": false, "reasons": ["no 'scene' given and application/run/main_scene is not set"]}}

	var guard := PathGuard.check_read(scene)
	if guard.has("error"):
		return guard
	var reasons: Array = []
	var main_scene_set := (main_setting == scene)
	if CallArgs.flag(args, "require_main_scene") and not main_scene_set:
		reasons.append("not the project main scene (application/run/main_scene = '%s')" % main_setting)
	if not ResourceLoader.exists(scene):
		return PathGuard.noted({"json": {"pass": false, "main_scene_set": main_scene_set,
			"reasons": ["scene file does not exist: %s" % scene]}}, guard)
	var ps := load(scene) as PackedScene
	if ps == null:
		return PathGuard.noted({"json": {"pass": false, "main_scene_set": main_scene_set,
			"reasons": ["could not load PackedScene: %s" % scene]}}, guard)

	var st := ps.get_state()
	var count := st.get_node_count()
	var types: Dictionary = {}
	for i in count:
		var t := str(st.get_node_type(i))
		if not t.is_empty():
			types[t] = true

	var min_nodes := int(args.get("min_nodes", 1))
	if count < min_nodes:
		reasons.append("scene has %d nodes (need >= %d)" % [count, min_nodes])

	var missing: Array = []
	var require: Variant = args.get("require_types", [])
	if require is Array:
		for r in require:
			if not types.has(str(r)):
				missing.append(str(r))
	if not missing.is_empty():
		reasons.append("missing required node types: %s" % ", ".join(missing))

	return PathGuard.noted({"json": {
		"pass": reasons.is_empty(),
		"scene": scene,
		"main_scene_set": main_scene_set,
		"node_count": count,
		"types_present": types.keys(),
		"missing_types": missing,
		"reasons": reasons,
	}}, guard)


func _compare_screenshots(args: Dictionary) -> Dictionary:
	var baseline := str(args.get("baseline", ""))
	var perr: String = PathGuard.write_path_error(baseline)
	if not perr.is_empty():
		return {"error": "baseline: " + perr}
	var thr: Dictionary = ImageDiff.threshold_of(args)
	if thr.has("error"):
		return {"error": str(thr["error"])}
	var vsel: String = ObserveTools.viewport_arg(args)
	var writing_baseline := CallArgs.flag(args, "save_baseline") or not FileAccess.file_exists(baseline)
	var cmd := {"cmd": "screenshot"}
	if not vsel.is_empty():
		cmd["viewport"] = vsel
	var r: Dictionary = server.bridge.send_command(cmd, 15000)
	if not bool(r.get("ok", false)):
		return {"error": str(r.get("error", "screenshot failed (needs a non-headless play session)"))}
	if not vsel.is_empty() and not r.has("src"):
		return {"error": ObserveTools.PREDATES_VIEWPORT % vsel.left(200)}
	var cur := Image.new()
	if cur.load_png_from_buffer(Marshalls.base64_to_raw(str(r.get("png", r.get("data", ""))))) != OK:
		return {"error": "could not decode screenshot"}
	var notes := frame_notes(r)
	if writing_baseline:
		if cur.save_png(baseline) != OK:
			return {"error": "could not save baseline to %s" % baseline}
		var said := "baseline saved to %s" % baseline
		if r.has("src"):
			said += " (game pixels of %s, %dx%d)" % [ObserveTools.one_line(r["src"]), cur.get_width(), cur.get_height()]
		if notes.has("stale"):
			said += "; " + str(notes["stale"])
		if notes.has("hdr"):
			said += "; HDR frame converted to 8 bits"
		return {"text": said}
	var base := Image.new()
	if base.load(baseline) != OK:
		return {"error": "could not load baseline: %s" % baseline}
	var pct := ImageDiff.diff_pct_64(cur, base)
	var tol := float(args.get("tolerance", 2.0))
	var j := {"diff_pct": pct, "tolerance": tol, "pass": pct <= tol}
	j.merge(notes)
	var out := {"json": j}
	if cur.get_width() != base.get_width() or cur.get_height() != base.get_height():
		j["size_mismatch"] = "baseline %dx%d, frame %dx%d: the changed-pixel counts need equal sizes (save_baseline=true mints a new baseline)" % [base.get_width(), base.get_height(), cur.get_width(), cur.get_height()]
		return out
	var want_picture := CallArgs.flag(args, "diff_image")
	var d: Dictionary = ImageDiff.changed_pixels(cur, base, int(thr["value"]), want_picture)
	var changed := int(d["changed"])
	j["changed"] = changed
	j["changed_pct"] = snappedf(100.0 * float(changed) / float(maxi(1, int(d["total"]))), 0.0001)
	j["max_delta"] = int(d["max_delta"])
	if changed > 0:
		j["bbox"] = d["bbox"]
		if want_picture and d["mask"] is Image:
			var pic: Image = ImageDiff.diff_picture(cur, d["mask"])
			var stored: Dictionary = CapturesScript.store(Marshalls.raw_to_base64(pic.save_png_to_buffer()), "image/png")
			if stored.has("error"):
				j["diff_error"] = str(stored["error"])
			else:
				j["diff"] = str(stored["path"])
				out["resource_links"] = [{"uri": str(stored["uri"]), "name": str(stored["id"]),
					"description": "Diff picture, %d bytes." % int(stored["bytes"]), "mimeType": str(stored["mime"])}]
	return out


## What the game said about a viewport= frame that a compare must not drop, in screenshot viewport='s words: stale when
## the SubViewport was not redrawing (its container hidden, or its update mode Disabled or Once), so "nothing changed"
## may only mean the frame is old, and hdr when a float frame was converted to 8 bits. {} for a window frame.
static func frame_notes(r: Dictionary) -> Dictionary:
	var notes := {}
	if r.has("stale"):
		notes["stale"] = "may be an old frame (%s)" % ObserveTools.one_line(r["stale"])
	if bool(r.get("hdr", false)):
		notes["hdr"] = true
	return notes
