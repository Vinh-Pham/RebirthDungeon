extends RefCounted

const SOURCE: JSON = preload("res://data/swords.json")
const SHOP_SOURCE: JSON = preload("res://data/blacksmith_shop.json")
const ATLAS = preload("res://assets/art/sword_atlas.png")
const SHOP_ART := "res://assets/art/blacksmith/"
const ICON_SIZE := Vector2i(16, 24)
const ATLAS_COLUMNS := 16
const FAMILIES := {
	"light": "Light Swords",
	"rapier": "Rapiers",
	"heavy": "Heavy Swords",
	"piercing": "Piercing Swords",
}


static func items_by_id() -> Dictionary:
	var items := {}
	for entry: Dictionary in SOURCE.data:
		items[entry["id"]] = entry
	for item: Dictionary in shop_stock().values():
		if not String(item["slot"]).is_empty():
			items[item["id"]] = item
	return items


static func shop_categories() -> Array:
	var categories := []
	for category: Dictionary in SHOP_SOURCE.data["categories"]:
		categories.append({"id": category["id"], "name": category["name"]})
	return categories


static func shop_stock() -> Dictionary:
	var stock := {}
	for category: Dictionary in SHOP_SOURCE.data["categories"]:
		for entry: Dictionary in category["items"]:
			var item := entry.duplicate()
			item["category"] = category["id"]
			item["description"] = equipment_details(item)
			if item.has("stack_key"):
				item["name"] = "%s ×%d" % [item["name"], int(item["quantity"])]
			stock[item["id"]] = item
	return stock


static func equipment_details(item: Dictionary) -> String:
	if item.has("damage_min"):
		return "%s · %s" % [damage_text(item), "Two-handed" if int(item["hands"]) == 2 else "One-handed"]
	if item.has("defense"):
		return "+%d Defense" % int(item["defense"])
	if item.get("stack_key") in ["arrow", "bolt"]:
		return "Ammunition. Stored with your supplies."
	return "Stored with your supplies."


static func icon(item: Dictionary) -> Texture2D:
	if item.get("family") == "shop":
		var path := SHOP_ART + str(item["id"]) + ".png"
		return load(path) as Texture2D if ResourceLoader.exists(path, "Texture2D") else null
	if not item.has("sprite"):
		return null
	var index := int(item["sprite"])
	var column := index % ATLAS_COLUMNS
	@warning_ignore("integer_division")
	var row := index / ATLAS_COLUMNS
	var texture := AtlasTexture.new()
	texture.atlas = ATLAS
	texture.region = Rect2(Vector2i(column, row) * ICON_SIZE, ICON_SIZE)
	texture.filter_clip = true
	return texture


static func is_sword(item: Dictionary) -> bool:
	return not item.is_empty() and item.get("weapon_type", "sword") == "sword"


static func damage_text(item: Dictionary) -> String:
	return "%d-%d damage" % [int(item["damage_min"]), int(item["damage_max"])]


static func tooltip(item: Dictionary) -> String:
	const WRAP_COLUMN := 46
	if item.get("family", "") == "shop":
		return "%s\n%s" % [item["name"], equipment_details(item)]
	var description: String = item["description"]
	if description.length() > WRAP_COLUMN:
		var line_break := description.rfind(" ", WRAP_COLUMN)
		if line_break > 0:
			description = description.substr(0, line_break) + "\n" + description.substr(line_break + 1)
	return "%s\n%s\n\n%s" % [item["name"], damage_text(item), description]
