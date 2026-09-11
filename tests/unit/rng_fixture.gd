extends RefCounted
const Streams = preload("res://scripts/domain/rules/rng_streams.gd")
const Stream = preload("res://scripts/domain/rules/rng_stream.gd")
const Dice = preload("res://scripts/domain/rules/weighted_dice.gd")
const Finite = preload("res://tests/fixtures/finite_rng.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
var _failures: PackedStringArray = []
var _checks: int = 0

func _check(condition: bool, label: String) -> void:
	_checks += 1
	if not condition: _failures.append(label)

func run() -> PackedStringArray:
	var seeds := {"generation": 1644594861472981957, "combat": 4806387787755698538,
		"ai": 5826539257092294154, "loot": 3946820937723495532}
	for name: String in seeds:
		_check(Streams.derive_seed(42, name) == seeds[name], "SHA-256 seed golden: " + name)
	var streams := Streams.new(42)
	var untouched := Streams.new(42)
	for name: String in ["generation", "ai", "loot"]:
		for draw: int in 13: streams.stream(name).bounded(100)
	for draw: int in 32:
		_check(streams.stream("combat").next_u32() == untouched.stream("combat").next_u32(), "Stream independence")
	var saved := streams.capture()
	var restored := Streams.new(99)
	_check(restored.restore(saved), "RNG restore accepted")
	_check(restored.capture() == saved, "Restore must not draw")
	for name: String in Streams.NAMES:
		for draw: int in 64:
			_check(streams.stream(name).next_u32() == restored.stream(name).next_u32(), "Exact continuation: " + name)
	var serialized: Dictionary = JSON.parse_string(JSON.stringify(saved))
	_check(restored.restore(serialized), "Decimal-string seed/state JSON round-trip")
	_check(restored.capture() == saved, "JSON round-trip preserves exact state")
	var invalids: Array[Dictionary] = []
	var bad: Dictionary = saved.duplicate(true)
	bad.engine = "other"; invalids.append(bad)
	bad = saved.duplicate(true); bad.engine = 7; invalids.append(bad)
	bad = saved.duplicate(true); bad.streams.loot = null; invalids.append(bad)
	bad = saved.duplicate(true); bad.streams = []; invalids.append(bad)
	bad = saved.duplicate(true); bad.root_seed = null; invalids.append(bad)
	bad = saved.duplicate(true); bad.rng = 2; invalids.append(bad)
	bad = saved.duplicate(true); bad.rng = 1.0; invalids.append(bad)
	bad = saved.duplicate(true); bad.streams.erase("loot"); invalids.append(bad)
	bad = saved.duplicate(true); bad.streams["cosmetic"] = {}; invalids.append(bad)
	bad = saved.duplicate(true); bad.streams.loot.state = "9223372036854775808"; invalids.append(bad)
	bad = saved.duplicate(true); bad.streams.loot.state = 12; invalids.append(bad)
	bad = saved.duplicate(true); bad.streams.loot.seed = "0"; invalids.append(bad)
	bad = saved.duplicate(true); bad.root_seed = "042"; invalids.append(bad)
	for invalid: Dictionary in invalids:
		var before := restored.capture()
		_check(not restored.restore(invalid) and restored.capture() == before, "Invalid restore must be atomic")
	_check(Limits.valid_decimal("-9223372036854775808") and Limits.valid_decimal("9223372036854775807"), "Signed int64 extremes")
	_check(not Limits.valid_decimal("-9223372036854775809"), "Negative int64 overflow")
	var finite := Finite.new()
	finite.values = PackedInt64Array([4294967295, 5])
	_check(finite.bounded(6) == 5 and finite.cursor == 2, "Reject uint32 tail instead of biased modulo")
	var before := finite.capture()
	_check(finite.bounded(0) == -1 and finite.capture() == before, "Invalid bound draws nothing")
	var weights := PackedInt64Array([0, 2, 0, 1, 0, 3])
	for sample: int in 6:
		_check(Dice.face_at(weights, sample) == [2, 2, 4, 6, 6, 6][sample], "Cumulative boundary and zero-weight face")
	_check(Dice.face_at(weights, 6) == -1 and Dice.face_at(weights, -1) == -1, "Outside cumulative range")
	var hand := PackedInt32Array([6, 6, 6, 6, 6])
	finite = Finite.new()
	finite.values = PackedInt64Array([0, 1, 2, 3, 4])
	var result := Dice.reroll(hand, PackedInt32Array([4, 0, 2]), PackedInt64Array([1, 1, 1, 1, 1, 1]), finite)
	_check(result.ok and result.hand == PackedInt32Array([1, 6, 2, 6, 3]), "Reroll indices sorted before sampling")
	_check(hand == PackedInt32Array([6, 6, 6, 6, 6]), "Input hand remains unchanged")
	before = finite.capture()
	for indices: PackedInt32Array in [PackedInt32Array([]), PackedInt32Array([0, 0]), PackedInt32Array([-1]), PackedInt32Array([5])]:
		result = Dice.reroll(hand, indices, weights, finite)
		_check(not result.ok and finite.capture() == before, "Invalid subset consumes no RNG")
	result = Dice.reroll(hand, PackedInt32Array([0]), weights, finite, [true, false, false, false, false])
	_check(not result.ok and finite.capture() == before, "Kept index rejected before draw")
	for invalid: PackedInt64Array in [PackedInt64Array([1]), PackedInt64Array([0, 0, 0, 0, 0, 0]), PackedInt64Array([-1, 1, 1, 1, 1, 1]), PackedInt64Array([9223372036854775807, 1, 1, 1, 1, 1])]:
		result = Dice.roll(invalid, finite)
		_check(not result.ok and finite.capture() == before, "Invalid weights consume no RNG")
	finite = Finite.new()
	finite.values = PackedInt64Array([0, 1])
	result = Dice.roll(weights, finite)
	_check(not result.ok and finite.cursor == 0, "Finite exhaustion rolls back the entire batch")
	var fair := PackedInt64Array([1, 1, 1, 1, 1, 1])
	var seeded := Stream.new(123)
	before = seeded.capture()
	var first := Dice.roll(fair, seeded)
	seeded.restore(before)
	_check(Dice.roll(fair, seeded) == first, "Weighted roll restores exactly")
	print("RNG_FIXTURE: %s (%d checks)" % ["PASS" if _failures.is_empty() else "FAIL", _checks])
	return _failures
