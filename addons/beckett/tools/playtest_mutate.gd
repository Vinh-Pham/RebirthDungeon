@tool
extends RefCounted

## What playtest op=mutate injects, and how it reads the outcome (v1.16). A suite that passes says the
## game did what it asserts; it does not say the asserts would have caught anything. A mutation check
## answers that: put ONE fault into the game at the start of a fresh replay, run the suite again, and
## see whether it notices. A fault the suite fails on (or goes blocked on) is KILLED; one it still passes
## on SURVIVED, and a survivor is an assertion that cannot fail for that fault. Evaluating the evaluator
## this way is how GameLogicBench (arXiv 2609.21562) found that without the check wrong solutions passed.
##
## Everything here is pure data in, data out, so the unit suite pins it without a game: what a suite
## touches (targets_of), which faults follow from what the game reports (plan), and how a survivor is
## worded (hint_of). The tool (playtest_tools.gd) does the I/O: reading the initial values, applying a
## fault through the bridge, running, restoring. Full-only like the tool; pack.ps1 trims it from Lite.
##
## The faults (kept small on purpose: each one costs a restart and a run):
##   zero / negate   a numeric property set to 0, or to minus itself (a property already at 0 is set to
##                   1 instead, because both of those would change nothing)
##   flip            a bool property inverted
##   disable         a node's process_mode set to disabled: its _process, _physics_process and _input stop
##   disconnect      ONE signal connection the suite's scene declares, cut (no binds, so it can be matched)
## They come from what the suite NAMES (the nodes and properties its asserts, invariants and steps read),
## never from the game's whole state: a fault nothing reads proves nothing about the suite.

const Invariants := preload("res://addons/beckett/runtime/invariants.gd")
const PathGuard := preload("res://addons/beckett/core/path_guard.gd")

const MAX_PROPS := 24
const MAX_NODES := 12
const MAX_READS := 8
const DISABLED := 4
const HINT_MAX := 200
const NODE_MAX := 160
const EXPR_MAX := 2000
const MODE_NAMES := ["inherit", "pausable", "when_paused", "always", "disabled"]
const RESERVED := ["true", "false", "null", "self", "PI", "TAU", "INF", "NAN", "not", "and", "or", "in", "is", "as"]

static var _re_ref: RegEx = null
static var _re_chain: RegEx = null



## The nodes and properties a suite's asserts, invariants and steps name, in the order they first appear:
## {props: [{node, property, reads}], nodes: [{node, reads}]}. `reads` lists the units (asserts[i],
## invariant:<name>, steps[i]: the same ids a run reports) that name it, so a survivor can say which assertion
## looked at the thing that was broken. A node path is whatever the bridge's resolver takes; a property is
## "position" or a sub-property path "position:y" (the bridge's own spelling). Nothing here touches a game.
static func targets_of(doc: Dictionary) -> Dictionary:
	var acc := {"props": [], "nodes": [], "pi": {}, "ni": {}}
	var asserts: Array = doc.get("asserts", []) if doc.get("asserts", []) is Array else []
	for i in asserts.size():
		var a: Variant = asserts[i]
		if not (a is Dictionary):
			continue
		var unit := "asserts[%d]" % i
		match str((a as Dictionary).get("type", "")).to_lower():
			"node_state":
				_note(acc, str((a as Dictionary).get("target", "")), str((a as Dictionary).get("property", "")), unit)
			"expr":
				_note_expr(acc, str((a as Dictionary).get("condition", "")), unit)
	var invs: Array = doc.get("invariants", []) if doc.get("invariants", []) is Array else []
	for i in invs.size():
		if invs[i] is Dictionary:
			var nm := str((invs[i] as Dictionary).get("name", "")).strip_edges()
			if nm.is_empty():
				nm = "inv%d" % (i + 1)
			_note_expr(acc, str((invs[i] as Dictionary).get("expr", "")), "invariant:%s" % nm.left(60))
	var steps: Array = doc.get("steps", []) if doc.get("steps", []) is Array else []
	for k in steps.size():
		if steps[k] is Dictionary:
			_note_step(acc, steps[k] as Dictionary, "steps[%d]" % k)
	return {"props": acc["props"], "nodes": acc["nodes"]}


static func _note_step(acc: Dictionary, step: Dictionary, unit: String) -> void:
	var a: Variant = step.get("assert", null)
	if a is Dictionary:
		if (a as Dictionary).has("condition"):
			_note_expr(acc, str((a as Dictionary).get("condition", "")), unit)
		elif (a as Dictionary).has("node"):
			_note(acc, str((a as Dictionary).get("node", "")), str((a as Dictionary).get("property", "")), unit)
	var w: Variant = step.get("wait", null)
	if w is Dictionary:
		if (w as Dictionary).has("node"):
			_note(acc, str((w as Dictionary).get("node", "")), "", unit)
		elif (w as Dictionary).has("condition"):
			_note_expr(acc, str((w as Dictionary).get("condition", "")), unit)
	var body: Variant = step["inject"] if step.has("inject") else (step if str(step.get("kind", "")) == "inject" else null)
	if body is Dictionary:
		for key in ["set", "call"]:
			var entries: Variant = (body as Dictionary).get(key, [])
			if entries is Array:
				for e in entries:
					if e is Dictionary:
						_note(acc, str((e as Dictionary).get("node", "")), "", unit)
	var sbody: Variant = step["state"] if step.has("state") else (step if str(step.get("kind", "")) == "state" else null)
	if sbody is Dictionary:
		_note(acc, str((sbody as Dictionary).get("node", "")), "", unit)


static func _note_expr(acc: Dictionary, src: String, unit: String) -> void:
	for r in refs_in(src):
		_note(acc, str(r["node"]), str(r["property"]), unit)


static func _note(acc: Dictionary, node: String, prop: String, unit: String) -> void:
	node = node.strip_edges()
	prop = prop.strip_edges()
	if node.is_empty() or node.length() > NODE_MAX or prop.length() > NODE_MAX or _is_bridge_node(node):
		return
	var nodes: Array = acc["nodes"]
	var ni: Dictionary = acc["ni"]
	if node != "." and not ni.has(node):
		ni[node] = nodes.size()
		nodes.append({"node": node, "reads": []})
	if node != ".":
		_add_read((nodes[ni[node]] as Dictionary)["reads"], unit)
	if prop.is_empty():
		return
	var props: Array = acc["props"]
	var pi: Dictionary = acc["pi"]
	var key := node + "\n" + prop
	if not pi.has(key):
		pi[key] = props.size()
		props.append({"node": node, "property": prop, "reads": []})
	_add_read((props[pi[key]] as Dictionary)["reads"], unit)


static func _add_read(reads: Array, unit: String) -> void:
	if not reads.has(unit):
		reads.append(unit)


## Fold the units in `more` into `into` (no unit twice, first-seen order): one node named two ways is one target.
static func add_reads(into: Array, more: Array) -> void:
	for u in more:
		_add_read(into, str(u))


## The bridge's own node is never a target: disabling or rewriting it would cut the line the check runs on. The
## runtime resolves a path segment by segment, so '/root/BeckettRuntime/.', a trailing slash and
## '../BeckettRuntime' all reach it: a path that can leave the scene (an absolute one, or one with '..') is judged
## by EVERY segment. A path inside the scene is judged by its last name only, as before, so a game's own nodes
## under a parent that happens to be called Beckett... stay targets.
static func _is_bridge_node(node: String) -> bool:
	var segs := node.split("/", false)
	var leaves_scene := node.begins_with("/") or segs.has("..")
	for i in segs.size():
		if (leaves_scene or i == segs.size() - 1) and String(segs[i]).strip_edges().to_lower().begins_with("beckett"):
			return true
	return false


## The (node, property) reads in one GDScript expression: get_node('Player').position.y gives
## {node: "Player", property: "position:y"}, and a bare name (the expression's base is the scene root)
## gives {node: ".", property: "score"}. `.method(...)` is a call, not a property. Best effort on text; what
## it cannot read it leaves out, and a name that turns out not to be a property is dropped when the game is
## asked for its value.
static func refs_in(src: String) -> Array:
	var out: Array = []
	if src.is_empty() or src.length() > EXPR_MAX:
		return out
	if _re_ref == null:
		_re_ref = RegEx.create_from_string("get_node(?:_or_null)?\\(\\s*(['\"])([^'\"]*)\\1\\s*\\)((?:\\s*\\.\\s*[A-Za-z_][A-Za-z0-9_]*)*)")
	for m in _re_ref.search_all(src):
		var names: Array = []
		for part in m.get_string(3).split(".", false):
			var nm := String(part).strip_edges()
			if not nm.is_empty():
				names.append(nm)
		if not names.is_empty() and src.substr(m.get_end()).strip_edges().begins_with("("):
			names.pop_back()
		_push_ref(out, m.get_string(2), ":".join(PackedStringArray(names)))
	if _re_chain == null:
		_re_chain = RegEx.create_from_string("^[A-Za-z_][A-Za-z0-9_]*(\\.[A-Za-z_][A-Za-z0-9_]*)*$")
	for operand in Invariants.operands_of(src):
		var s := str(operand)
		if _re_chain.search(s) == null:
			continue
		var parts := s.split(".")
		if RESERVED.has(parts[0]):
			continue
		_push_ref(out, ".", ":".join(parts))
	return out


static func _push_ref(out: Array, node: String, prop: String) -> void:
	for r in out:
		if str(r["node"]) == node and str(r["property"]) == prop:
			return
	out.append({"node": node, "property": prop})



## Which faults a property's current value allows: [] when it is neither a number nor a bool. JSON hands
## every number back as a float, so "is it a number" is the type, never "is it an int".
static func operators_for(value: Variant) -> Array:
	if value is bool:
		return ["flip"]
	if value is int or value is float:
		var f := float(value)
		if is_nan(f) or is_inf(f):
			return []
		return ["one"] if f == 0.0 else ["zero", "negate"]
	return []


## The value a fault writes.
static func mutated(operator: String, value: Variant) -> Variant:
	match operator:
		"flip":
			return not bool(value)
		"zero":
			return 0
		"one":
			return 1
		"negate":
			return -float(value)
	return value


## The faults to try, in the order to try them, from what the game said at the start of a fresh scene:
## cands = {props: [{node, property, reads, value}], nodes: [{node, reads, process_mode}],
## connection: {source, signal, target, method} or null}. The order is breadth first: every target's first
## fault, then every target's second, so a small `max` samples the suite instead of exhausting its first
## property; properties come before nodes before the one connection. Each fault carries an `id` that is
## its position in this list, which is what op=mutate's `from` counts.
static func plan(cands: Dictionary) -> Array:
	var groups: Array = []
	for p in cands.get("props", []):
		var g: Array = []
		for op in operators_for((p as Dictionary).get("value")):
			var to: Variant = mutated(str(op), p["value"])
			g.append({"kind": "set", "target": label_of(str(p["node"]), str(p["property"])), "node": str(p["node"]),
				"property": str(p["property"]), "operator": str(op), "from": p["value"], "to": to,
				"change": "%s -> %s" % [fmt(p["value"]), fmt(to)], "reads": (p.get("reads", []) as Array).slice(0, MAX_READS)})
		if not g.is_empty():
			groups.append(g)
	for n in cands.get("nodes", []):
		var mode := int((n as Dictionary).get("process_mode", 0))
		if mode == DISABLED:
			continue
		groups.append([{"kind": "set", "target": str(n["node"]), "node": str(n["node"]), "property": "process_mode",
			"operator": "disable", "from": mode, "to": DISABLED,
			"change": "process_mode %s -> disabled" % str(MODE_NAMES[clampi(mode, 0, 4)]), "reads": (n.get("reads", []) as Array).slice(0, MAX_READS)}])
	var conn: Variant = cands.get("connection", null)
	if conn is Dictionary and not (conn as Dictionary).is_empty():
		var c: Dictionary = conn
		var label := "%s.%s -> %s.%s" % [_node_label(str(c["source"])), str(c["signal"]), _node_label(str(c["target"])), str(c["method"])]
		groups.append([{"kind": "disconnect", "target": label, "node": str(c["source"]), "property": "", "operator": "disconnect",
			"signal": str(c["signal"]), "to_node": str(c["target"]), "method": str(c["method"]),
			"change": "disconnected", "reads": (c.get("reads", []) as Array).slice(0, MAX_READS)}])
	var out: Array = []
	var widest := 0
	for g in groups:
		widest = maxi(widest, (g as Array).size())
	for rank in widest:
		for g in groups:
			if rank < (g as Array).size():
				out.append((g as Array)[rank])
	for i in out.size():
		(out[i] as Dictionary)["id"] = i
	return out


## A node path as a result line names it: the scene root is "." in a path and "root" in prose.
static func _node_label(path: String) -> String:
	return "root" if path == "." else path


## "Player.health", "root.score": a property as a result line names it (a fault, or a name that gave none).
static func label_of(node: String, prop: String) -> String:
	return "%s.%s" % [_node_label(node), prop]


## "3", "-3", "61.2", "true": a value as a result line shows it (a whole float has no ".0").
static func fmt(v: Variant) -> String:
	if v is bool:
		return "true" if v else "false"
	if v is int:
		return str(v)
	if v is float:
		var f: float = v
		if absf(f) < 1.0e15 and f == floorf(f):
			return str(int(f))
		return String.num(f, 4)
	return str(v).left(40)


## One line saying what no assertion noticed (a survivor), naming the assertions that read it when there are any.
static func hint_of(m: Dictionary) -> String:
	var what := ""
	match str(m.get("operator", "")):
		"disable":
			what = "%s being disabled" % str(m.get("target", ""))
		"disconnect":
			what = "%s being cut" % str(m.get("target", ""))
		_:
			what = "%s = %s" % [str(m.get("target", "")), fmt(m.get("to"))]
	var reads: Array = m.get("reads", []) if m.get("reads", []) is Array else []
	var s := "no assertion notices %s" % what
	if not reads.is_empty():
		s += " (read by %s%s)" % [", ".join(PackedStringArray(reads.slice(0, 3))), ", ..." if reads.size() > 3 else ""]
	return s.left(HINT_MAX)


## What one faulted run says about the suite: "killed" (it failed or went blocked), "survived" (it still
## passed), or "inconclusive" (the run produced no judgement at all: it errored before one assert ran, so it
## says nothing about the suite and must not count as a kill).
static func outcome_of(run: Dictionary) -> String:
	var units: Array = run.get("units", []) if run.get("units", []) is Array else []
	if units.is_empty():
		return "inconclusive"
	return "survived" if str(run.get("verdict", "")) == "pass" else "killed"


## killed / judged, as a fraction; null when nothing was judged (a ratio of nothing is no score).
static func score_of(killed: int, survived: int) -> Variant:
	var judged := killed + survived
	if judged <= 0:
		return null
	return snappedf(float(killed) / float(judged), 0.0001)


## "asserts[1]: Player.x = 59 (expected 60)": the unit of a run that did not pass and caught the fault. One
## that READS the faulted value (`prefer`: the units that name it) is the better answer than a unit that merely
## failed first (a fault that stops a node from moving fails every assert about where it ended up, and a run
## that is a frame off fails the position assert whatever was faulted), so a preferred failing unit wins, else
## the first failing one. "" when every unit passed or skipped.
static func first_problem(units: Array, prefer: Array = []) -> String:
	var first := ""
	for u in units:
		if u is Dictionary and ["fail", "blocked"].has(str((u as Dictionary).get("status", ""))):
			var line := ("%s: %s" % [str((u as Dictionary).get("id", "")), str((u as Dictionary).get("detail", ""))]).left(160)
			if prefer.has(str((u as Dictionary).get("id", ""))):
				return line
			if first.is_empty():
				first = line
	return first



## One signal connection the suite's scene declares, as {source, signal, target, method, reads}, or {}.
## Read from the scene FILE (the editor loads the same file the game does), top-level connections only, and
## only ones with no binds: a bound callable cannot be matched by (target, method) at runtime. A connection
## that touches a node the suite names (`nodes` is targets_of(doc)["nodes"]) is preferred, because cutting it
## is likelier to matter, and carries the units that name that node; else the first one is used.
## A name with a quote or a backslash is left out: it ends up inside an expression the game evaluates.
static func connection_of(scene_path: String, nodes: Array) -> Dictionary:
	if scene_path.is_empty() or PathGuard.check_read(scene_path).has("error") or not ResourceLoader.exists(scene_path):
		return {}
	var ps := ResourceLoader.load(scene_path, "PackedScene") as PackedScene
	if ps == null:
		return {}
	var st := ps.get_state()
	var first := {}
	for i in mini(st.get_connection_count(), 128):
		if not st.get_connection_binds(i).is_empty():
			continue
		var c := {"source": str(st.get_connection_source(i)), "signal": str(st.get_connection_signal(i)),
			"target": str(st.get_connection_target(i)), "method": str(st.get_connection_method(i)), "reads": []}
		var clean := true
		for k in ["source", "signal", "target", "method"]:
			var t: String = c[k]
			if t.is_empty() or t.contains("'") or t.contains("\\") or t.contains("\n"):
				clean = false
		if not clean:
			continue
		if first.is_empty():
			first = c
		for n in nodes:
			var nn := str((n as Dictionary)["node"])
			if nn == str(c["source"]) or nn == str(c["target"]) or str(c["source"]).ends_with("/" + nn) or str(c["target"]).ends_with("/" + nn):
				c["reads"] = ((n as Dictionary)["reads"] as Array).duplicate()
				return c
	return first


## The two expressions the game evaluates to cut and to check a connection. Both are read-only apart from
## the disconnect itself, which is compared with null so its result is true: eval re-evaluates a falsy result
## to report what it read, and that would run a disconnect twice.
static func connected_expr(c: Dictionary) -> String:
	return "get_node('%s').is_connected('%s', Callable(get_node('%s'), '%s'))" % [str(c["source"]), str(c["signal"]), str(c["target"]), str(c["method"])]


static func disconnect_expr(c: Dictionary) -> String:
	return "get_node('%s').disconnect('%s', Callable(get_node('%s'), '%s')) == null" % [str(c["source"]), str(c["signal"]), str(c["target"]), str(c["method"])]
