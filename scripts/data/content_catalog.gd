class_name ContentCatalog
extends RefCounted
## Copy on publication and observation. Callers never receive the internal graph.
const Manifest = preload("res://scripts/data/definitions/catalog_manifest.gd")
const Validator = preload("res://scripts/data/catalog_validator.gd")
var _manifest: Manifest
var _index: Dictionary = {}

func publish(source: Manifest) -> PackedStringArray:
	var errors := Validator.new().validate(source)
	if not errors.is_empty():
		return errors
	var candidate: Manifest = source.duplicate_deep(Resource.DEEP_DUPLICATE_ALL)
	var index: Dictionary = {}
	for group: String in Validator.GROUPS:
		for entry: Resource in candidate.get(group):
			index[entry.id] = entry
	_manifest = candidate
	_index = index
	return PackedStringArray()

func is_ready() -> bool:
	return _manifest != null

func definition(id: String) -> Resource:
	var value: Resource = _index.get(id)
	return value.duplicate_deep(Resource.DEEP_DUPLICATE_ALL) if value != null else null

func versions() -> Dictionary:
	if _manifest == null:
		return {}
	return {"schema": _manifest.schema_version, "content": _manifest.content_version,
		"rules": _manifest.rules_version, "generator": _manifest.generator_version,
		"rng": _manifest.rng_version, "engine": _manifest.engine_build}

func ids() -> PackedStringArray:
	var result := PackedStringArray(_index.keys())
	result.sort()
	return result

func combination(index: int) -> Vector2i:
	var combo := _manifest.combinations[index]
	return Vector2i(combo.numerator, combo.denominator)
