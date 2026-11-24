extends RefCounted

const LINEAGES := ["Dawnborn", "Veilkin", "Forgeborn"]
const LINEAGE_DETAILS := [
	"Descendants of the surface caravans that kept the old trade routes alive.",
	"Raised in the twilight vaults among relics that still whisper.",
	"Descendants of the artisans who kept the deep engines running."
]
const TALENTS := ["Vanguard", "Aetherist", "Delver"]
const TALENT_DETAILS := [
	"Studies guarding, heavy strikes, and close-quarters combat.",
	"Studies strange energies, recovery, and machine lore.",
	"Studies scouting, salvage, and survival below ground."
]
const BUILDS := ["Compact", "Balanced", "Broad"]
const HAIR := ["Shorn", "Sweep", "Crest", "Long"]
const HAIR_TONES := ["Ash", "Plum", "Copper", "Gold"]
const SKIN_TONES := ["Pale", "Sand", "Umber", "Deep"]
const EYES := ["Steady", "Narrow", "Wide"]
const EYE_TONES := ["Slate", "Teal", "Violet", "Amber"]
const FACES := ["Soft", "Angular", "Square"]

const ATLAS := "res://assets/art/character_atlas.png"
const OUTFIT_COLORS := [Color("#5bbfc5"), Color("#508da0"), Color("#cd683d")]
const HAIR_COLORS := [Color("#443846"), Color("#7a3045"), Color("#cd683d"), Color("#fbb954")]
const SKIN_COLORS := [Color("#d6dad3"), Color("#b0a987"), Color("#997f73"), Color("#665964")]
const EYE_COLORS := [Color("#28353e"), Color("#407080"), Color("#45293f"), Color("#fbb954")]


static func portrait(profile: Dictionary, two_tone := false) -> Texture2D:
	var atlas := load(ATLAS) as Texture2D
	if atlas == null:
		return null
	var source := atlas.get_image()
	var body := source.get_region(Rect2i(int(profile["body"]) * 16, 0, 16, 24))
	var fringe := source.get_region(Rect2i((3 + int(profile["hair"])) * 16, 0, 16, 24))
	var skin: Color = SKIN_COLORS[profile["skin"]]
	var outfit: Color = OUTFIT_COLORS[profile["lineage"]]
	var hair: Color = HAIR_COLORS[profile["hair_color"]]
	var eyes: Color = EYE_COLORS[profile["eye_color"]]
	if two_tone:
		skin = outfit
		hair = Color("#28353e")
		eyes = hair

	for x in range(16):
		for y in range(24):
			var base := body.get_pixel(x, y)
			if base.is_equal_approx(Color("#5bbfc5")):
				body.set_pixel(x, y, outfit)
			elif base.is_equal_approx(Color("#b0a987")):
				body.set_pixel(x, y, skin)

	match int(profile["face"]):
		1:
			body.set_pixel(6, 7, Color("#28353e"))
			body.set_pixel(9, 7, Color("#28353e"))
		2:
			body.set_pixel(5, 7, skin)
			body.set_pixel(10, 7, skin)

	var eye_height := 5 if int(profile["eyes"]) == 1 else 6
	body.set_pixel(7, eye_height, eyes)
	body.set_pixel(9, eye_height, eyes)
	if int(profile["eyes"]) == 2:
		body.set_pixel(7, 5, eyes)
		body.set_pixel(9, 5, eyes)

	for x in range(16):
		for y in range(24):
			if fringe.get_pixel(x, y).a > 0.5:
				body.set_pixel(x, y, hair)
	return ImageTexture.create_from_image(body)
