extends RefCounted
## Physics overlap oracle (v1.16 M5d): which physics bodies of the RUNNING game penetrate each other, and how
## deep. Geometry clipping is the thing a vision model is worst at judging (it flags objects that merely touch,
## and misses a collider buried in a wall: arXiv 2607.25921), and it is exactly what the physics engine can
## answer exactly, so this asks the engine and a picture is at most a filter on top of it.
##
## For each body's enabled shapes it asks the body's own space (PhysicsDirectSpaceState2D/3D) what the shape
## overlaps (intersect_shape), then measures each candidate pair on its own (collide_shape with every other
## candidate excluded): the contact points come back as (point on the query shape, point on the collider)
## pairs, and the distance between the two points of a pair is how far the shapes sink into each other there.
## A pair is reported when its deepest contact is MORE than min_depth. Measured on 4.4.1, 4.6.2 and 4.7 with
## GodotPhysics and Jolt: two boxes sharing a face give depth 0 (touching, not penetrating), a box resting on a
## floor sinks about 0.007 (3D, GodotPhysics) / 0.3 (2D) because the solver lets contacts settle that far, which
## is why the defaults sit above those numbers: a bound below them would flag everything standing on the floor.
##
## What is judged, so a report is a bug and not noise:
##  * a pair the engine would never resolve is left out: both bodies static (level geometry overlaps by design,
##    unless one of them is named in paths/group, which is asking about it), shapes whose layers and masks do not
##    interact (the engine's own rule: either body's mask holds the other's layer), a collision exception
##    (joints add them), a body and its ancestor or descendant;
##  * Areas are never judged (a trigger overlaps by design), nor are disabled shapes, nor 2D one-way shapes;
##  * a body is judged by the engine's own transform for each shape (PhysicsServer body + shape transform), so a
##    shape added in code or a polygon collider is measured where the engine has it.
##
## The work is bounded: at most max_bodies bodies, max_pairs reported (the scan stops there), a query budget and
## a time budget. Anything the scan did not reach is named in `truncated`, and judge() will not call a partial scan
## a pass.
##
## Contract: run() is called GAME-side (in the process whose physics it asks): mcp_runtime.gd's physics_overlap
## command and the headless playtest runner. No editor classes; the pure parts (normalize, contact_depth,
## interacts, judge) are static and unit-tested without a physics server. Full edition only (pack.ps1 trims it).

const GameState := preload("res://addons/beckett/runtime/game_state.gd")

const DEPTH_2D := 0.5
const DEPTH_3D := 0.05
const MAX_PAIRS_DEFAULT := 20
const MAX_PAIRS_CAP := 200
const MAX_BODIES_DEFAULT := 500
const MAX_BODIES_CAP := 2000
const MAX_PATHS := 64
const MAX_PATH_CHARS := 200
const BUDGET_MS := 1500
const MAX_QUERIES := 8000
const WALK_CAP := 100000
const CANDIDATES := 32
const NAME_CAP := 120
const STATIC_MODE := 0
const REPORT_SHOWN := 3



## The params of a physics_overlap command / a no_overlap assert, checked and filled in:
## {ok: true, paths, group, min_depth: {"2d", "3d"}, min_depth_given, max_pairs, max_bodies, budget_ms}
## or {ok: false, error}. `paths` are node paths (a node that is not a body stands for the bodies below it),
## `group` a group name; with neither, every physics body of the game is checked.
static func normalize(raw: Dictionary) -> Dictionary:
	var paths: Array = []
	var rp: Variant = raw.get("paths", null)
	if rp != null:
		if not (rp is Array):
			return _bad("paths must be an array of node paths, e.g. [\"Player\", \"Enemies\"]")
		if (rp as Array).size() > MAX_PATHS:
			return _bad("at most %d paths (got %d): name a parent node to cover the bodies below it" % [MAX_PATHS, (rp as Array).size()])
		for p in rp:
			if not (p is String) or (p as String).strip_edges().is_empty() or (p as String).length() > MAX_PATH_CHARS:
				return _bad("every entry of paths must be a node path string of at most %d characters" % MAX_PATH_CHARS)
			if (p as String).contains(":"):
				return _bad("every entry of paths must be a node path, and '%s' has a ':' in it, which starts a property path: name the node, and it stands for the bodies below it" % (p as String).strip_edges())
			paths.append((p as String).strip_edges())
	var group := ""
	var rg: Variant = raw.get("group", null)
	if rg != null:
		if not (rg is String) or (rg as String).length() > MAX_PATH_CHARS:
			return _bad("group must be a group name (a string)")
		group = (rg as String).strip_edges()
	var depth := {"2d": DEPTH_2D, "3d": DEPTH_3D}
	var given := false
	var rd: Variant = raw.get("min_depth", null)
	if rd != null:
		var v := _number(rd)
		if is_nan(v) or v < 0.0 or v > 1.0e6:
			return _bad("min_depth must be a number >= 0 (pixels in 2D, meters in 3D); the default is %s (2D) / %s (3D)" % [str(DEPTH_2D), str(DEPTH_3D)])
		depth = {"2d": v, "3d": v}
		given = true
	var max_pairs := _count(raw, "max_pairs", MAX_PAIRS_DEFAULT, 1, MAX_PAIRS_CAP)
	if max_pairs < 0:
		return _bad("max_pairs must be a whole number from 1 to %d" % MAX_PAIRS_CAP)
	var max_bodies := _count(raw, "max_bodies", MAX_BODIES_DEFAULT, 1, MAX_BODIES_CAP)
	if max_bodies < 0:
		return _bad("max_bodies must be a whole number from 1 to %d" % MAX_BODIES_CAP)
	var budget := _count(raw, "budget_ms", BUDGET_MS, 0, 10000)
	if budget < 0:
		return _bad("budget_ms must be a whole number from 0 to 10000")
	return {"ok": true, "paths": paths, "group": group, "min_depth": depth, "min_depth_given": given,
		"max_pairs": max_pairs, "max_bodies": max_bodies, "budget_ms": budget}


## "" when `spec` is a usable no_overlap assert, else why not (playtest op=save refuses a typo early).
static func spec_error(spec: Dictionary) -> String:
	var n := normalize(spec)
	return "" if bool(n.get("ok", false)) else str(n.get("error", "invalid no_overlap assert"))


static func _bad(msg: String) -> Dictionary:
	return {"ok": false, "error": msg}


## A number out of a JSON value (a float, an int, or text that reads as one); NAN when it is none of them.
static func _number(v: Variant) -> float:
	if v is int or v is float:
		return float(v)
	if v is String and (v as String).strip_edges().is_valid_float():
		return (v as String).strip_edges().to_float()
	return NAN


## A whole number in [lo, hi] from raw[key] (the default when absent); -1 when it is there and not one.
static func _count(raw: Dictionary, key: String, default: int, lo: int, hi: int) -> int:
	var v: Variant = raw.get(key, null)
	if v == null:
		return default
	var f := _number(v)
	if is_nan(f) or f != floorf(f) or f < float(lo) or f > float(hi):
		return -1
	return int(f)



## The deepest contact in what collide_shape returned: `points` are consecutive pairs (a point on the query
## shape, then the point on the collider it sinks into), and the distance inside a pair is the penetration
## there. {depth, a, b}: depth 0 and a, b null when there is no contact (touching shapes give none or zero).
static func contact_depth(points: Array) -> Dictionary:
	var depth := 0.0
	var pa: Variant = null
	var pb: Variant = null
	var i := 0
	while i + 1 < points.size():
		var a: Variant = points[i]
		var b: Variant = points[i + 1]
		var delta: Variant = a - b
		var d := float(delta.length())
		if d > depth:
			depth = d
			pa = a
			pb = b
		i += 2
	return {"depth": depth, "a": pa, "b": pb}


## Would the physics engine let two bodies collide? Its own rule: either body's mask holds the other's layer.
static func interacts(layer_a: int, mask_a: int, layer_b: int, mask_b: int) -> bool:
	return (layer_a & mask_b) != 0 or (layer_b & mask_a) != 0


## One key per unordered pair of bodies.
static func pair_key(id_a: int, id_b: int) -> String:
	return "%d:%d" % [mini(id_a, id_b), maxi(id_a, id_b)]


## A vector as a short array of rounded numbers ([x, y] or [x, y, z]); [] for anything else.
static func vec_out(v: Variant) -> Array:
	if v is Vector2:
		return [snappedf((v as Vector2).x, 0.001), snappedf((v as Vector2).y, 0.001)]
	if v is Vector3:
		return [snappedf((v as Vector3).x, 0.001), snappedf((v as Vector3).y, 0.001), snappedf((v as Vector3).z, 0.001)]
	return []


## The unit vector along the deepest contact, for a contact pair (a on the query body, b on the other one):
## it points from the query body toward the other one, so moving the query body by -normal * depth (or the
## other by +normal * depth) separates them. null when there is no contact.
static func contact_normal(a: Variant, b: Variant, depth: float) -> Variant:
	if a == null or b == null or depth <= 0.0:
		return null
	var delta: Variant = a - b
	return delta / depth



## The verdict of a physics_overlap reply, in the words every caller shares (the editor's playtest and the
## headless runner): {status: pass | fail | blocked, detail, pairs}. An error reply is the caller's to judge
## where it knows the channel (the editor); here the ones that mean "nothing was judged" are blocked, anything
## else (a malformed spec) fails loudly.
static func judge(reply: Dictionary) -> Dictionary:
	if not bool(reply.get("ok", false)):
		var err := str(reply.get("error", "physics_overlap failed"))
		for p in ["node not found", "no node matches", "no current scene", "the physics space"]:
			if err.begins_with(p):
				return {"status": "blocked", "detail": "no_overlap: %s" % err.left(200)}
		return {"status": "fail", "detail": "no_overlap: %s" % err.left(200)}
	var pairs: Array = reply.get("pairs", []) if reply.get("pairs", []) is Array else []
	var trunc: Dictionary = reply.get("truncated", {}) if reply.get("truncated", {}) is Dictionary else {}
	var bodies := int(reply.get("bodies", 0))
	var bound := bound_text(reply.get("min_depth", {}))
	if not pairs.is_empty():
		var shown: Array = []
		for i in mini(pairs.size(), REPORT_SHOWN):
			var p: Dictionary = pairs[i]
			shown.append("%s into %s, %s deep" % [str(p.get("a", "?")), str(p.get("b", "?")), str(p.get("depth", "?"))])
		var more := ""
		if pairs.size() > REPORT_SHOWN:
			more = " (+%d more listed)" % (pairs.size() - REPORT_SHOWN)
		if bool(trunc.get("pairs", false)):
			more += " (the scan stopped at max_pairs: there may be more)"
		return {"status": "fail", "pairs": pairs,
			"detail": "no_overlap: %d pair(s) penetrate more than %s: %s%s" % [pairs.size(), bound, "; ".join(PackedStringArray(shown)), more]}
	if not trunc.is_empty() or bodies == 0:
		var why: Array = []
		if int(trunc.get("bodies", 0)) > 0:
			why.append("%d bodies were not reached (raise max_bodies, or name what matters with paths or group)" % int(trunc["bodies"]))
		if bool(trunc.get("time", false)):
			why.append("the time budget ran out")
		if bool(trunc.get("queries", false)):
			why.append("the query budget ran out")
		if bool(trunc.get("walk", false)):
			why.append("the scene is too large to walk")
		if why.is_empty():
			why.append("no physics body was found to check (a body needs an enabled shape, and an Area is not a body)")
		return {"status": "blocked", "pairs": [],
			"detail": "no_overlap: not judged, %s (%d %s checked, none penetrating more than %s so far)" % ["; ".join(PackedStringArray(why)), bodies, "body" if bodies == 1 else "bodies", bound]}
	var skipped: Dictionary = reply.get("skipped", {}) if reply.get("skipped", {}) is Dictionary else {}
	var left := ""
	if not skipped.is_empty():
		var bits: Array = []
		for k in skipped:
			bits.append("%s %s" % [str(skipped[k]), str(k).replace("_", " ")])
		left = " (left out: %s)" % ", ".join(PackedStringArray(bits))
	return {"status": "pass", "pairs": [], "detail": "no_overlap: %d %s checked, no pair penetrates more than %s%s" % [bodies, "body" if bodies == 1 else "bodies", bound, left]}


## "0.5 (2D) / 0.05 (3D)", or one number when both dimensions use the same bound.
static func bound_text(depth: Variant) -> String:
	if not (depth is Dictionary):
		return "the bound"
	var d: Dictionary = depth
	if not d.has("2d") or not d.has("3d"):
		return "the bound"
	if is_equal_approx(float(d["2d"]), float(d["3d"])):
		return str(snappedf(float(d["2d"]), 0.0001))
	return "%s (2D) / %s (3D)" % [str(snappedf(float(d["2d"]), 0.0001)), str(snappedf(float(d["3d"]), 0.0001))]



## Check the bodies of the running game. `tree` is the game's SceneTree, `scene_root` the node the reply's
## names are relative to, `resolver` (optional) the caller's own path resolver (the runtime's); without one a
## path is looked up from the scene root and then by name. Returns the reply described at the top, or
## {ok: false, error}.
static func run(tree: SceneTree, scene_root: Node, params: Dictionary, resolver: Callable = Callable()) -> Dictionary:
	var spec := normalize(params)
	if not bool(spec.get("ok", false)):
		return {"ok": false, "error": str(spec.get("error", "invalid params"))}
	if tree == null:
		return {"ok": false, "error": "no scene tree"}
	var named: Dictionary = {}
	var subjects: Array = []
	var seen: Dictionary = {}
	var walk := {"n": 0, "capped": false}
	var paths: Array = spec["paths"]
	var group := str(spec["group"])
	if not paths.is_empty() or not group.is_empty():
		for p in paths:
			var node: Node = _resolve(tree, scene_root, str(p), resolver)
			if node == null:
				return {"ok": false, "error": "node not found: %s" % str(p).left(NAME_CAP)}
			_collect(node, subjects, seen, walk, named)
		if not group.is_empty():
			var members := tree.get_nodes_in_group(group)
			if members.is_empty():
				return {"ok": false, "error": "no node matches group '%s'" % group.left(NAME_CAP)}
			for m in members:
				if m is Node:
					_collect(m, subjects, seen, walk, named)
	else:
		_collect(tree.root, subjects, seen, walk, null)
	var ctx := {
		"scene_root": scene_root, "min_depth": spec["min_depth"], "named": named,
		"max_pairs": int(spec["max_pairs"]), "pairs": {}, "done": {}, "skip_keys": {}, "stop": "", "queries": 0,
		"deadline": Time.get_ticks_msec() + int(spec["budget_ms"]), "skipped": {}, "inaccessible": false,
	}
	var checked := 0
	var cut_bodies := 0
	for i in subjects.size():
		if i >= int(spec["max_bodies"]):
			cut_bodies = subjects.size() - i
			break
		if str(ctx["stop"]) != "":
			break
		var b: Node = subjects[i]
		if not is_instance_valid(b) or not b.is_inside_tree():
			continue
		var local_done: Dictionary = {}
		ctx["local_done"] = local_done
		var finished := false
		if b is CollisionObject3D:
			finished = _scan_3d(b as CollisionObject3D, ctx)
		elif b is CollisionObject2D:
			finished = _scan_2d(b as CollisionObject2D, ctx)
		else:
			continue
		if bool(ctx["inaccessible"]):
			return {"ok": false, "error": "the physics space is not accessible right now (physics runs on a separate thread, or this was asked from inside a physics step)"}
		for k in local_done:
			(ctx["done"] as Dictionary)[k] = true
		if finished:
			checked += 1
	var trunc := {}
	if cut_bodies > 0:
		trunc["bodies"] = cut_bodies
	if str(ctx["stop"]) != "":
		trunc[str(ctx["stop"])] = true
	if bool(walk["capped"]):
		trunc["walk"] = true
	var listed := _listed(ctx)
	var out := {"ok": true, "bodies": checked, "pairs": listed, "pair_count": listed.size(), "queries": int(ctx["queries"]),
		"min_depth": spec["min_depth"]}
	if not trunc.is_empty():
		out["truncated"] = trunc
	if not (ctx["skipped"] as Dictionary).is_empty():
		out["skipped"] = ctx["skipped"]
	return out


## The pairs found, deepest first (names break ties so two runs list the same order), each with `a` before `b`
## by name and the normal pointing from a toward b.
static func _listed(ctx: Dictionary) -> Array:
	var recs: Array = (ctx["pairs"] as Dictionary).values()
	for r in recs:
		var rd: Dictionary = r
		if str(rd["a"]) > str(rd["b"]):
			var t: Variant = rd["a"]
			rd["a"] = rd["b"]
			rd["b"] = t
			if rd.get("normal", null) is Array:
				var flipped: Array = []
				for x in (rd["normal"] as Array):
					flipped.append(-float(x) if float(x) != 0.0 else 0.0)
				rd["normal"] = flipped
		rd["_k"] = "%016.4f|%s|%s" % [1.0e9 - float(rd["depth"]), str(rd["a"]), str(rd["b"])]
	recs.sort_custom(func(x, y): return str(x["_k"]) < str(y["_k"]))
	for r in recs:
		(r as Dictionary).erase("_k")
	return recs


static func _resolve(tree: SceneTree, scene_root: Node, path: String, resolver: Callable) -> Node:
	if resolver.is_valid():
		var r: Variant = resolver.call(path)
		return r as Node if r is Node else null
	var n: Node = null
	if scene_root != null:
		n = scene_root.get_node_or_null(NodePath(path))
		if n == null:
			n = scene_root.find_child(path, true, false)
	if n == null and path.begins_with("/root"):
		n = tree.root.get_node_or_null(NodePath(path))
	return n


static func _is_body(n: Node) -> bool:
	return (n is CollisionObject2D and not (n is Area2D)) or (n is CollisionObject3D and not (n is Area3D))


## Every physics body at or below `start`, in tree order, appended to `out` once. With `named` (a scan scoped by
## paths or group) each body found is also remembered there: a static pair a named body is part of is judged.
static func _collect(start: Node, out: Array, seen: Dictionary, walk: Dictionary, named: Variant) -> void:
	var stack: Array = [start]
	while not stack.is_empty():
		var n: Node = stack.pop_back()
		walk["n"] = int(walk["n"]) + 1
		if int(walk["n"]) > WALK_CAP:
			walk["capped"] = true
			return
		if _is_body(n):
			if named is Dictionary:
				(named as Dictionary)[n.get_instance_id()] = true
			if not seen.has(n.get_instance_id()):
				seen[n.get_instance_id()] = true
				out.append(n)
		var kids := n.get_children()
		for i in range(kids.size() - 1, -1, -1):
			stack.append(kids[i])


static func _skip(ctx: Dictionary, why: String) -> void:
	var sk: Dictionary = ctx["skipped"]
	sk[why] = int(sk.get(why, 0)) + 1


## A pair left out, counted once however many shapes or bodies saw it.
static func _skip_pair(ctx: Dictionary, why: String, key: String) -> void:
	var seen: Dictionary = ctx["skip_keys"]
	if not seen.has(why + key):
		seen[why + key] = true
		_skip(ctx, why)


## True once the scan has used up its time or its query budget (and says which on ctx.stop).
static func _spent(ctx: Dictionary) -> bool:
	if str(ctx["stop"]) != "":
		return true
	if Time.get_ticks_msec() >= int(ctx["deadline"]):
		ctx["stop"] = "time"
		return true
	if int(ctx["queries"]) >= MAX_QUERIES:
		ctx["stop"] = "queries"
		return true
	return false


## What a physics body RID is to the engine: [mode, layer, mask]. Asked of the server, so a body that is no
## node (a tile map's, a grid map's) answers too.
static func _server_info(is_3d: bool, rid: RID) -> Array:
	if is_3d:
		return [int(PhysicsServer3D.body_get_mode(rid)), int(PhysicsServer3D.body_get_collision_layer(rid)), int(PhysicsServer3D.body_get_collision_mask(rid))]
	return [int(PhysicsServer2D.body_get_mode(rid)), int(PhysicsServer2D.body_get_collision_layer(rid)), int(PhysicsServer2D.body_get_collision_mask(rid))]


## An exception between two body nodes (add_collision_exception_with, and what a joint adds), either way round.
static func _has_exception(a: Node, b: Variant) -> bool:
	if a is PhysicsBody3D and b is PhysicsBody3D:
		return (a as PhysicsBody3D).get_collision_exceptions().has(b) or (b as PhysicsBody3D).get_collision_exceptions().has(a)
	if a is PhysicsBody2D and b is PhysicsBody2D:
		return (a as PhysicsBody2D).get_collision_exceptions().has(b) or (b as PhysicsBody2D).get_collision_exceptions().has(a)
	return false


## Why a candidate pair is not measured, "" when it is: the engine never resolves it, or it is not a clip.
static func _left_out(ctx: Dictionary, node_a: Node, node_b: Variant, id_a: int, id_b: int, info_a: Array, info_b: Array) -> String:
	if node_b is Node and (node_a.is_ancestor_of(node_b as Node) or (node_b as Node).is_ancestor_of(node_a)):
		return "family_pairs"
	if not interacts(int(info_a[1]), int(info_a[2]), int(info_b[1]), int(info_b[2])):
		return "layer_pairs"
	if _has_exception(node_a, node_b):
		return "exception_pairs"
	if int(info_a[0]) == STATIC_MODE and int(info_b[0]) == STATIC_MODE:
		var named: Dictionary = ctx["named"]
		if not (named.has(id_a) or named.has(id_b)):
			return "static_pairs"
	return ""


## Put one measured pair in the result, keeping the deepest reading when a pair is seen twice (from its other
## body, or through another shape). `at` is the middle of the deepest contact, so it does not depend on which
## body was asked first.
static func _record(ctx: Dictionary, name_a: String, name_b: String, key: String, depth: float, cd: Dictionary, space: String) -> void:
	var pairs: Dictionary = ctx["pairs"]
	var have: Variant = pairs.get(key, null)
	if have != null and float((have as Dictionary)["depth"]) >= depth:
		return
	var rec := {"a": name_a, "b": name_b, "depth": snappedf(depth, 0.0001), "space": space}
	var nrm: Variant = contact_normal(cd["a"], cd["b"], depth)
	if nrm != null:
		rec["normal"] = vec_out(nrm)
	var mid: Variant = (cd["a"] + cd["b"]) * 0.5
	rec["at"] = vec_out(mid)
	pairs[key] = rec
	if pairs.size() >= int(ctx["max_pairs"]):
		ctx["stop"] = "pairs"


static func _name_of(node: Variant, ctx: Dictionary, rid: RID) -> String:
	if node is Node:
		return GameState.path_of(node as Node, ctx["scene_root"] as Node).left(NAME_CAP)
	return "<physics body %d>" % rid.get_id()


## The candidates one shape's query found (`cands`: RID of the other body -> instance id of its node, 0 when it
## has none), each judged and, when it is a pair worth measuring, measured on its own: every OTHER candidate is
## excluded from a collide_shape of the same shape, so the contact points belong to this pair alone. `space`
## and `q` are the 2D or 3D direct space state and query parameters (the calls are the same in both).
static func _measure(ctx: Dictionary, body: Node, rid: RID, space: Variant, q: Variant, cands: Dictionary, is_3d: bool) -> void:
	var id_a := body.get_instance_id()
	var info_a := _server_info(is_3d, rid)
	var min_depth := float((ctx["min_depth"] as Dictionary)["3d" if is_3d else "2d"])
	var all_rids: Array = cands.keys()
	for crid in all_rids:
		var oid_b: int = int(cands[crid])
		var node_b: Object = instance_from_id(oid_b) if oid_b != 0 else null
		var id_b: int = oid_b if oid_b != 0 else (crid as RID).get_id()
		var key := pair_key(id_a, id_b)
		if (ctx["done"] as Dictionary).has(key):
			continue
		var why := _left_out(ctx, body, node_b, id_a, id_b, info_a, _server_info(is_3d, crid))
		if not why.is_empty():
			_skip_pair(ctx, why, key)
			continue
		var ex: Array = [rid]
		for other in all_rids:
			if other != crid:
				ex.append(other)
		q.exclude = ex
		ctx["queries"] = int(ctx["queries"]) + 1
		var cd := contact_depth(space.collide_shape(q, CANDIDATES))
		(ctx["local_done"] as Dictionary)[key] = true
		if float(cd["depth"]) <= min_depth:
			continue
		_record(ctx, _name_of(body, ctx, rid), _name_of(node_b, ctx, crid), key, float(cd["depth"]), cd, "3d" if is_3d else "2d")
		if str(ctx["stop"]) != "":
			return


## One 3D body: each enabled shape it has, asked of its space. true when every shape was asked, false when the
## scan ran out of budget (or hit the pair cap) part way.
static func _scan_3d(body: CollisionObject3D, ctx: Dictionary) -> bool:
	var world: World3D = body.get_world_3d()
	var space: PhysicsDirectSpaceState3D = world.direct_space_state if world != null else null
	if space == null:
		ctx["inaccessible"] = true
		return false
	var rid := body.get_rid()
	var body_xf: Transform3D = PhysicsServer3D.body_get_state(rid, PhysicsServer3D.BODY_STATE_TRANSFORM)
	for oid in body.get_shape_owners():
		if body.is_shape_owner_disabled(oid):
			_skip(ctx, "disabled_shapes")
			continue
		for si in body.shape_owner_get_shape_count(oid):
			if _spent(ctx):
				return false
			var shape: Shape3D = body.shape_owner_get_shape(oid, si)
			if shape == null:
				continue
			if shape is ConcavePolygonShape3D or shape is HeightMapShape3D or shape is WorldBoundaryShape3D or shape is SeparationRayShape3D:
				_skip(ctx, "unqueryable_shapes")
				continue
			var q := PhysicsShapeQueryParameters3D.new()
			q.shape = shape
			q.transform = body_xf * PhysicsServer3D.body_get_shape_transform(rid, body.shape_owner_get_shape_index(oid, si))
			q.collide_with_areas = false
			q.exclude = [rid]
			ctx["queries"] = int(ctx["queries"]) + 1
			var cands: Dictionary = {}
			for h in space.intersect_shape(q, CANDIDATES):
				if not cands.has(h["rid"]):
					cands[h["rid"]] = int(h["collider_id"])
			_measure(ctx, body, rid, space, q, cands, true)
			if str(ctx["stop"]) != "":
				return false
	return true


static func _scan_2d(body: CollisionObject2D, ctx: Dictionary) -> bool:
	var world: World2D = body.get_world_2d()
	var space: PhysicsDirectSpaceState2D = world.direct_space_state if world != null else null
	if space == null:
		ctx["inaccessible"] = true
		return false
	var rid := body.get_rid()
	var body_xf: Transform2D = PhysicsServer2D.body_get_state(rid, PhysicsServer2D.BODY_STATE_TRANSFORM)
	for oid in body.get_shape_owners():
		if body.is_shape_owner_disabled(oid):
			_skip(ctx, "disabled_shapes")
			continue
		if body.is_shape_owner_one_way_collision_enabled(oid):
			_skip(ctx, "one_way_shapes")
			continue
		for si in body.shape_owner_get_shape_count(oid):
			if _spent(ctx):
				return false
			var shape: Shape2D = body.shape_owner_get_shape(oid, si)
			if shape == null:
				continue
			if shape is ConcavePolygonShape2D or shape is WorldBoundaryShape2D or shape is SeparationRayShape2D:
				_skip(ctx, "unqueryable_shapes")
				continue
			var q := PhysicsShapeQueryParameters2D.new()
			q.shape = shape
			q.transform = body_xf * PhysicsServer2D.body_get_shape_transform(rid, body.shape_owner_get_shape_index(oid, si))
			q.collide_with_areas = false
			q.exclude = [rid]
			ctx["queries"] = int(ctx["queries"]) + 1
			var cands: Dictionary = {}
			for h in space.intersect_shape(q, CANDIDATES):
				var hit: Object = instance_from_id(int(h["collider_id"])) if int(h["collider_id"]) != 0 else null
				if hit is CollisionObject2D:
					var owner_id: int = (hit as CollisionObject2D).shape_find_owner(int(h["shape"]))
					if owner_id >= 0 and (hit as CollisionObject2D).is_shape_owner_one_way_collision_enabled(owner_id):
						_skip(ctx, "one_way_shapes")
						continue
				if not cands.has(h["rid"]):
					cands[h["rid"]] = int(h["collider_id"])
			_measure(ctx, body, rid, space, q, cands, false)
			if str(ctx["stop"]) != "":
				return false
	return true
