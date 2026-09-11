class_name RngStreams
extends RefCounted
const Stream = preload("res://scripts/domain/rules/rng_stream.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
const NAMES := ["generation", "combat", "ai", "loot"]
var _streams: Dictionary = {}
var _root_seed: int = 0

func _init(root_seed: int = 0) -> void:
	_root_seed = root_seed
	for stream_name: String in NAMES:
		_streams[stream_name] = Stream.new(derive_seed(root_seed, stream_name))

static func derive_seed(root_seed: int, stream_name: String) -> int:
	# SHA-256 UTF-8 prefix + newline + signed decimal seed + newline + name.
	# First eight bytes, big-endian, highest bit cleared. No trailing newline.
	var digest: PackedByteArray = ("rebirth-rng-v1\n%d\n%s" % [root_seed, stream_name]).sha256_buffer()
	var value: int = digest[0] & 127
	for i: int in range(1, 8):
		value = (value << 8) | digest[i]
	return value

func stream(stream_name: String) -> Stream:
	return _streams.get(stream_name)

func capture() -> Dictionary:
	var entries: Dictionary = {}
	for stream_name: String in NAMES:
		entries[stream_name] = _streams[stream_name].capture()
	return {"engine": Limits.ENGINE, "rng": str(Limits.RNG), "root_seed": str(_root_seed), "streams": entries}

func restore(saved: Dictionary) -> bool:
	if saved.size() != 4 or typeof(saved.get("engine")) != TYPE_STRING or typeof(saved.get("rng")) != TYPE_STRING:
		return false
	if saved.engine != Limits.ENGINE or saved.rng != str(Limits.RNG):
		return false
	if not Limits.valid_decimal(saved.get("root_seed")) or not saved.get("streams") is Dictionary:
		return false
	if saved.streams.size() != NAMES.size():
		return false
	var candidate: Dictionary = {}
	for stream_name: String in NAMES:
		var entry: Variant = saved.streams.get(stream_name)
		if not entry is Dictionary:
			return false
		var restored := Stream.new()
		if not restored.restore(entry) or entry.seed.to_int() != derive_seed(saved.root_seed.to_int(), stream_name):
			return false
		candidate[stream_name] = restored
	_root_seed = saved.root_seed.to_int()
	_streams = candidate
	return true
