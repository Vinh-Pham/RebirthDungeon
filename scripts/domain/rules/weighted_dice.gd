class_name WeightedDice
extends RefCounted
const Stream = preload("res://scripts/domain/rules/rng_stream.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")

static func weight_total(weights: PackedInt64Array) -> int:
	if weights.size() != 6:
		return -1
	var total: int = 0
	for weight: int in weights:
		if weight < 0 or weight > Limits.WEIGHT_MAX:
			return -1
		total += weight
	return total if total > 0 else -1

static func face_at(weights: PackedInt64Array, sample: int) -> int:
	var total: int = weight_total(weights)
	if total < 1 or sample < 0 or sample >= total:
		return -1
	var cumulative: int = 0
	for i: int in 6:
		cumulative += weights[i]
		if sample < cumulative:
			return i + 1
	return -1

static func roll(weights: PackedInt64Array, rng: Stream) -> Dictionary:
	return reroll(PackedInt32Array([1, 1, 1, 1, 1]), PackedInt32Array([0, 1, 2, 3, 4]), weights, rng)

static func reroll(hand: PackedInt32Array, indices: PackedInt32Array, weights: PackedInt64Array, rng: Stream, kept: Array[bool] = [false, false, false, false, false]) -> Dictionary:
	var total: int = weight_total(weights)
	if total < 1 or rng == null or hand.size() != 5 or kept.size() != 5 or indices.is_empty() or indices.size() > 5:
		return {"ok": false, "error": "invalid weights, hand or subset"}
	for face: int in hand:
		if face < 1 or face > 6:
			return {"ok": false, "error": "invalid face"}
	var ordered := indices.duplicate()
	ordered.sort()
	var previous: int = -1
	for index: int in ordered:
		if index < 0 or index > 4 or index == previous or kept[index]:
			return {"ok": false, "error": "invalid, duplicate or kept index"}
		previous = index
	var before := rng.capture()
	var result := hand.duplicate()
	for index: int in ordered:
		var sample: int = rng.bounded(total)
		if sample < 0:
			rng.restore(before)
			return {"ok": false, "error": "random source exhausted"}
		result[index] = face_at(weights, sample)
	return {"ok": true, "hand": result}
