extends RefCounted
## Pure indexed dice rules. Sampling is only called on an accepted candidate.
static func classify(hand: PackedInt32Array) -> int:
	if hand.size() != 5:
		return -1
	var counts := [0, 0, 0, 0, 0, 0]
	for face: int in hand:
		if face < 1 or face > 6:
			return -1
		counts[face - 1] += 1
	var sorted := counts.duplicate()
	sorted.sort()
	if sorted[5] == 5: return 7
	if sorted[5] == 4: return 6
	if sorted[5] == 3 and sorted[4] == 2: return 5
	if sorted[5] == 1 and (counts[0] == 0 or counts[5] == 0): return 4
	if sorted[5] == 3: return 3
	if sorted[5] == 2 and sorted[4] == 2: return 2
	if sorted[5] == 2: return 1
	return 0

static func face_at(weights: PackedInt64Array, offset: int) -> int:
	if weights.size() != 6 or offset < 0:
		return -1
	var total: int = 0
	for weight: int in weights:
		if weight < 0 or weight > 1000000: return -1
		total += weight
	if offset >= total: return -1
	for i: int in 6:
		if offset < weights[i]: return i + 1
		offset -= weights[i]
	return -1

static func sample(weights: PackedInt64Array, rng: RefCounted) -> int:
	var total: int = 0
	for weight: int in weights: total += weight
	return face_at(weights, rng.bounded(total))

static func valid_subset(indices: Array, kept: Array[bool]) -> bool:
	if indices.is_empty() or indices.size() > 5: return false
	var seen := {}
	for index: Variant in indices:
		if typeof(index) != TYPE_INT or index < 0 or index > 4 or seen.has(index) or kept[index]:
			return false
		seen[index] = true
	return true
