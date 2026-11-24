extends RefCounted

const SOURCE: JSON = preload("res://data/swords.json")
const ATLAS = preload("res://assets/art/sword_atlas.png")
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
	return items


static func icon(item: Dictionary) -> Texture2D:
	var index := int(item["sprite"])
	var column := index % ATLAS_COLUMNS
	@warning_ignore("integer_division")
	var row := index / ATLAS_COLUMNS
	var texture := AtlasTexture.new()
	texture.atlas = ATLAS
	texture.region = Rect2(Vector2i(column, row) * ICON_SIZE, ICON_SIZE)
	texture.filter_clip = true
	return texture


static func damage_text(item: Dictionary) -> String:
	return "%d-%d damage" % [int(item["damage_min"]), int(item["damage_max"])]


static func tooltip(item: Dictionary) -> String:
	const WRAP_COLUMN := 46
	var description: String = item["description"]
	if description.length() > WRAP_COLUMN:
		var line_break := description.rfind(" ", WRAP_COLUMN)
		if line_break > 0:
			description = description.substr(0, line_break) + "\n" + description.substr(line_break + 1)
	return "%s\n%s\n\n%s" % [item["name"], damage_text(item), description]
