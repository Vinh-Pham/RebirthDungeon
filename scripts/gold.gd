extends RefCounted

const ID := "gold"
const STACK_LIMIT := 1_000
const BANK_LIMIT := 20_000_000
const POUCH_SIZE := Vector2i(2, 2)
const POUCHES := {
	"gold_pouch_small": {"name": "Small Gold Pouch", "capacity": 10_000, "price": 1_760},
	"gold_pouch_large": {"name": "Large Gold Pouch", "capacity": 50_000, "price": 9_800},
}


static func pouch_name(id: String) -> String:
	return POUCHES.get(id, {}).get("name", "")


static func pouch_capacity(id: String) -> int:
	return POUCHES.get(id, {}).get("capacity", 0)


static func format_amount(amount: int) -> String:
	if amount >= 1_000_000:
		return _format_scaled(amount, 1_000_000.0, "m")
	if amount >= 1_000:
		return _format_scaled(amount, 1_000.0, "k")
	return "%dg" % amount


static func _format_scaled(amount: int, scale: float, suffix: String) -> String:
	var scaled := floorf(float(amount) * 100.0 / scale) / 100.0
	return ("%.2f" % scaled).rstrip("0").trim_suffix(".") + suffix
