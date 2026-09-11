class_name RngStream
extends RefCounted
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
const UINT32_RANGE: int = 4294967296
var _rng := RandomNumberGenerator.new()

func _init(initial_seed: int = 0) -> void:
	_rng.seed = initial_seed

func next_u32() -> int:
	return _rng.randi()

func bounded(bound: int) -> int:
	if bound < 1 or bound > UINT32_RANGE:
		return -1
	var limit: int = UINT32_RANGE - UINT32_RANGE % bound
	while true:
		var sample: int = next_u32()
		if sample < 0 or sample >= UINT32_RANGE:
			return -1
		if sample < limit:
			return sample % bound
	return -1

func capture() -> Dictionary:
	return {"seed": str(_rng.seed), "state": str(_rng.state)}

func restore(saved: Dictionary) -> bool:
	if saved.size() != 2 or not Limits.valid_decimal(saved.get("seed")) or not Limits.valid_decimal(saved.get("state")):
		return false
	_rng.seed = saved.seed.to_int()
	_rng.state = saved.state.to_int()
	return true
