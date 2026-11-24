extends RefCounted
## runtime_call expr= on a node, or with inputs, game side (1.17): which node is self, and the names the expression
## binds. The game's `eval_at` command asks this; its plain `eval` runs on the scene root with no inputs, as before 1.17.
##
## Full edition only: pack.ps1 trims this file from Lite, and mcp_runtime loads it by path when eval_at arrives (the
## physics_overlap pattern), so the free edition carries no code that aims an expression. self is the node the command
## names, by path or by a selector (class / name / text, narrowed with nth and under), resolved fresh the way every
## command resolves one, and else the scene root; Beckett's own runtime is off limits here as it is to a call. inputs =
## {name: value} binds names the expression reads, so a value is never spliced into its text (the editor has checked
## each name). 4.2+ floor: Expression.parse's input names are a 4.0 API.

const Internals := preload("res://addons/beckett/core/internals.gd")


## {base, names, values} for one eval_at command, or {error}. `rt` is the game's runtime node (mcp_runtime.gd): its
## resolver and its miss message are the ones every command uses.
static func scope(rt, msg: Dictionary) -> Dictionary:
	var base: Node = rt._root()
	for k in ["path", "class", "name", "text"]:
		if not str(msg.get(k, "")).is_empty():
			base = rt._resolve_target(msg)
			if base == null:
				return {"error": rt._not_found(msg)}
			var off: String = Internals.runtime_refusal(base)
			if not off.is_empty():
				return {"error": off}
			break
	var names := PackedStringArray()
	var values: Array = []
	var inputs: Variant = msg.get("inputs", {})
	if inputs is Dictionary:
		for k in inputs:
			names.append(str(k))
			values.append(inputs[k])
	return {"base": base if base != null else rt, "names": names, "values": values}
