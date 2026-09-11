class_name RuleLimits
extends RefCounted
## All factors <= 1e6; products of two factors <= 1e12, below int64.
const VALUE_MAX: int = 1000000
const BASIS_POINTS: int = 10000
const WEIGHT_MAX: int = 1000000
const RANKS := ["F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1"]
const COMBINATIONS := ["none", "pair", "two_pairs", "three_kind", "straight", "full_house", "four_kind", "five_kind"]
const ENGINE: String = "4.7.2.stable.official.ed1daf0bf"
const SCHEMA: int = 1
const RULES: int = 1
const GENERATOR: int = 1
const RNG: int = 1

static func floor_ratio(value: int, numerator: int, denominator: int) -> int:
	if value < 0 or value > VALUE_MAX or numerator < 0 or numerator > VALUE_MAX or denominator < 1 or denominator > VALUE_MAX:
		return -1
	@warning_ignore("integer_division")
	var result: int = (value * numerator) / denominator
	return result

static func valid_decimal(value: Variant) -> bool:
	if not value is String or not value.is_valid_int():
		return false
	# Round-trip rejects whitespace, leading zeroes, overflow and JSON floats.
	return str(value.to_int()) == value
