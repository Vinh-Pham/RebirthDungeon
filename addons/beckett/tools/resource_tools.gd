@tool
extends RefCounted
class_name BeckettResourceTools

## Resource creation + assignment (P0). Reflection's set_property can't load/assign a
## resource from a path or mint an inline sub-resource — these close that gap so the agent
## can wire a Texture2D onto a Sprite2D, a Shape2D onto a CollisionShape2D, etc.

const Reflect := preload("res://addons/beckett/core/reflection.gd")
const PersistGuard := preload("res://addons/beckett/core/persist_guard.gd")
const PathGuard := preload("res://addons/beckett/core/path_guard.gd")
const Internals := preload("res://addons/beckett/core/internals.gd")


var server


func _register(registry) -> void:
	registry.register({
		"name": "create_resource",
		"description": "Create a Resource of the given class and save it to a res:// path (.tres). Optional 'properties' dict sets initial values.",
		"destructive": true,
		"input_schema": {"type": "object", "properties": {
			"class": {"type": "string"},
			"path": {"type": "string", "description": "res:// path ending in .tres/.res"},
			"properties": {"type": "object"},
		}, "required": ["class", "path"]},
		"handler": Callable(self, "_create_resource"),
	})
	registry.register({
		"name": "set_resource",
		"description": "Assign a resource to a node's property (undoable). Use 'resource' (res:// path to load) OR 'class' (mint a new inline sub-resource of that class). e.g. set Sprite2D.texture from a path, or a fresh RectangleShape2D on CollisionShape2D.shape.",
		"input_schema": {"type": "object", "properties": {
			"target": {"type": "string"},
			"property": {"type": "string"},
			"resource": {"type": "string", "description": "res:// path of an existing resource"},
			"class": {"type": "string", "description": "class to instantiate as a new inline sub-resource"},
		}, "required": ["target", "property"]},
		"handler": Callable(self, "_set_resource"),
	})


func _create_resource(args: Dictionary) -> Dictionary:
	var cls := str(args.get("class", ""))
	if not ClassDB.class_exists(cls) or not ClassDB.can_instantiate(cls):
		return {"error": "Cannot instantiate class: %s" % cls}
	var obj: Variant = ClassDB.instantiate(cls)
	if not (obj is Resource):
		return {"error": "%s is not a Resource" % cls}
	var res: Resource = obj
	var props: Variant = args.get("properties", {})
	var outside: Dictionary = {}
	if props is Dictionary:
		for k in props:
			var key := str(k)
			var fit := Reflect.value_for_property(res, key, props[k])
			if fit.has("error"):
				return _not_saved(key, fit)
			var before: Variant = res.get(key)
			res.set(key, fit["value"])
			var back := Reflect.readback(res, key, before, fit["value"])
			if back.has("error"):
				return _not_saved(key, back)
			if fit.has("note"):
				outside = fit
	var path := str(args.get("path", ""))
	if not path.begins_with("res://"):
		return {"error": "path must start with res://"}
	var perr: String = PathGuard.write_path_error(path)
	if not perr.is_empty():
		return {"error": "%s: %s" % [path, perr]}
	var err := ResourceSaver.save(res, path)
	if err != OK:
		return {"error": "save failed: %s" % error_string(err)}
	if Engine.is_editor_hint():
		EditorInterface.get_resource_filesystem().update_file(path)
	return PathGuard.noted({"text": "created %s -> %s" % [cls, path]}, outside)


## A property create_resource could not set: the reason, under the key it came in, said before anything is saved.
func _not_saved(key: String, why: Dictionary) -> Dictionary:
	var out := {"error": "properties.%s: %s. The resource was not saved." % [key, str(why["error"])]}
	if why.has("suggestion"):
		out["suggestion"] = why["suggestion"]
	return out


func _set_resource(args: Dictionary) -> Dictionary:
	var target := str(args.get("target", ""))
	var obj := Reflect.resolve(target)
	if obj == null:
		return {"error": Reflect.miss(target)}
	var prop := str(args.get("property", ""))
	if not Reflect.has_property(obj, prop):
		return {"error": "%s has no property '%s'" % [obj.get_class(), prop],
			"suggestion": "Call describe_object target=%s (or describe_class) to see valid properties." % target}
	var value: Resource = null
	var guard: Dictionary = {}
	if args.has("resource"):
		var rp := str(args["resource"])
		guard = PathGuard.check_read(rp)
		if guard.has("error"):
			return guard
		if Internals.is_beckett_path(rp):
			return {"error": Internals.file_text(rp)}
		if not ResourceLoader.exists(rp):
			return {"error": "No resource at: %s" % rp}
		value = ResourceLoader.load(rp)
		if value == null:
			return {"error": "Could not load %s" % rp}
		if Internals.is_beckett_path(value.resource_path):
			return {"error": Internals.file_text(rp)}
	elif args.has("class"):
		var cls := str(args["class"])
		if not ClassDB.class_exists(cls) or not ClassDB.can_instantiate(cls):
			return {"error": "Cannot instantiate class: %s" % cls}
		var inst: Variant = ClassDB.instantiate(cls)
		if not (inst is Resource):
			return {"error": "%s is not a Resource" % cls}
		value = inst
	else:
		return {"error": "Provide 'resource' (path) or 'class' (inline)."}
	var home: Dictionary = PersistGuard.resource_home(obj as Resource, Reflect.open_scene_file()) if obj is Resource else {}
	var ur: EditorUndoRedoManager = server.get_undo_redo()
	if ur != null:
		ur.create_action("MCP set_resource %s" % prop)
		ur.add_do_property(obj, prop, value)
		ur.add_undo_property(obj, prop, obj.get(prop))
		ur.commit_action()
	else:
		obj.set(prop, value)
	var reply := {"text": "assigned %s to %s.%s" % [value.get_class(), target, prop]}
	if obj is Resource and Reflect.is_stored(obj, prop):
		var note := PersistGuard.file_note(home, false)
		if not note.is_empty():
			reply["text"] = "%s. %s" % [str(reply["text"]), note]
	if obj is Node:
		return PathGuard.noted(PersistGuard.attach(reply, PersistGuard.verdict(EditorInterface.get_edited_scene_root(), obj as Node, PersistGuard.SET)), guard)
	return PathGuard.noted(reply, guard)
