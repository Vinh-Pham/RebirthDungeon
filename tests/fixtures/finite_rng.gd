extends "res://scripts/domain/rules/rng_stream.gd"
## Explicit finite raw uint32 sequence; no wrapping or random fallback.
var values: PackedInt64Array = []
var cursor: int = 0
func next_u32() -> int:
	if cursor >= values.size():
		return -1
	var value: int = values[cursor]
	cursor += 1
	return value
func capture() -> Dictionary:
	return {"cursor": cursor}
func restore(saved: Dictionary) -> bool:
	if saved.size() != 1 or typeof(saved.get("cursor")) != TYPE_INT or saved.cursor < 0 or saved.cursor > values.size():
		return false
	cursor = saved.cursor
	return true
