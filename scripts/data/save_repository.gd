extends RefCounted
## Two alternating, checked JSON slots. No executable Resources or scene data.
const Codec = preload("res://scripts/data/save_codec.gd")
var directory: String = "user://profile"
var sequence: int = 0
var active_slot: int = -1
var fault: String = "" # One-shot development injection: open, truncate, readback, after_write.
var last_error: String = ""
var _catalog: RefCounted
var _recovery_required: bool = false

func configure(path: String, catalog: RefCounted) -> void:
	directory = path
	_catalog = catalog

func load_checkpoint() -> Dictionary:
	if not valid_directory(): return {"status":"corrupt","error":"Save path must be under user://."}
	var valid: Array[Dictionary] = []
	var problems: Array[String] = []
	for index: int in 2:
		var path := slot_path(index)
		if not FileAccess.file_exists(path): continue
		var file := FileAccess.open(path,FileAccess.READ)
		if file == null:
			problems.append("Cannot read checkpoint %d." % index)
			continue
		var size_value := file.get_length()
		var content := file.get_as_text() if size_value <= Codec.MAX_BYTES else ""
		file.close()
		var decoded := Codec.new().decode(content,_catalog)
		if decoded.status == "ok":
			decoded.slot = index
			valid.append(decoded)
		else: problems.append("Checkpoint %d: %s" % [index,decoded.error])
	if valid.is_empty():
		_recovery_required = not problems.is_empty()
		return {"status":"corrupt" if _recovery_required else "empty","error":"\n".join(problems)}
	valid.sort_custom(func(a: Dictionary,b: Dictionary): return a.sequence > b.sequence)
	var best: Dictionary = valid[0]
	if valid.size() == 2 and valid[0].sequence == valid[1].sequence:
		problems.append("Conflicting checkpoint sequences.")
	sequence = best.sequence
	active_slot = best.slot
	_recovery_required = not problems.is_empty()
	return {"status":"recovery" if _recovery_required else "ok","session":best.session,"sequence":sequence,"error":"\n".join(problems)}

func allow_recovery() -> bool:
	# Preserve both original byte streams before the player explicitly resumes a fallback.
	for index: int in 2:
		var source := slot_path(index)
		if not FileAccess.file_exists(source): continue
		var digest := FileAccess.get_sha256(source)
		if digest.is_empty(): return false
		var destination := source+"."+digest+".recovery"
		if not FileAccess.file_exists(destination) or FileAccess.get_sha256(destination) != digest:
			if DirAccess.copy_absolute(source,destination) != OK: return false
		if FileAccess.get_sha256(destination) != digest: return false
	_recovery_required = false
	return true

func save(session: RefCounted) -> bool:
	last_error = ""
	if not valid_directory() or _recovery_required:
		last_error = "Resolve checkpoint recovery before saving."
		return false
	if sequence >= 9223372036854775806:
		last_error = "Checkpoint sequence limit reached."
		return false
	if DirAccess.make_dir_recursive_absolute(directory) != OK:
		last_error = "Cannot create the save folder."
		return false
	var next := sequence+1
	var codec := Codec.new()
	var content := codec.encode(session,next)
	if codec.decode(content,_catalog).status != "ok":
		last_error = codec.error
		return false
	var index := 1 if active_slot == 0 else 0
	var path := slot_path(index)
	var injection := fault
	fault = ""
	if injection == "open":
		last_error = "Injected checkpoint open failure."
		return false
	var file := FileAccess.open(path,FileAccess.WRITE)
	if file == null:
		last_error = "Cannot open the next checkpoint (%d)." % FileAccess.get_open_error()
		return false
	file.store_string(content.left(content.length()/2) if injection == "truncate" else content)
	file.flush()
	var code := file.get_error()
	file.close()
	if code != OK:
		last_error = "Checkpoint write failed (%d)." % code
		return false
	if injection in ["readback","after_write"]:
		last_error = "Injected interruption after write; Retry retains this candidate."
		return false
	var checked := Codec.new().decode(FileAccess.get_file_as_string(path),_catalog)
	if checked.status != "ok" or checked.sequence != next:
		last_error = "Checkpoint read-back validation failed."
		return false
	sequence = next
	active_slot = index
	return true

func slot_path(index: int) -> String:
	return directory.path_join("checkpoint_%d.json" % index)

func valid_directory() -> bool:
	return directory.begins_with("user://") and not directory.contains("\\\\") and not directory.trim_prefix("user://").split("/").has("..")
