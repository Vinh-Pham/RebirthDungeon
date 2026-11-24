extends RefCounted

enum Race { HUMAN, ELF, GIANT }
enum Gender { MALE, FEMALE, NONBINARY }

const GENDERS := ["Male", "Female", "Nonbinary"]

const RACES := ["Human", "Elf", "Giant"]
const RACE_DETAILS := [
	"Versatile delvers with a balance of endurance and resolve.",
	"Quick and perceptive, with an affinity for magic.",
	"Sturdy delvers with greater strength and stamina.",
]
const MIN_START_AGE := 10
const MAX_START_AGE := 17
const MAX_AGE := 25

# The first three IDs retain the roles of existing character saves.
const CLOSE_COMBAT := 0
const ADVENTURE := 2
const ARCHERY := 3
const FATE_ASTROLOGY := 9
const LANCE_COMBAT := 13
const TALENTS := [
	"Close Combat", "Magic", "Adventure", "Archery", "Battle Alchemy", "Battle Astrology",
	"Carpentry", "Chain Slash", "Cooking", "Fate Astrology", "Glyphwrighting", "Gunslinger",
	"Holy Arts", "Lance Combat", "Martial Arts", "Medicine", "Mercantile", "Music",
	"Ninja", "Pet Training", "Puppetry", "Smithing", "Tailoring", "Transmutation",
]
const TALENT_DETAILS := [
	"Train in melee weapons, guarding, and heavy strikes.",
	"Study spells and the energies that power them.",
	"Develop the skills to explore, forage, and survive below ground.",
	"Train in precision, timing, and bows.",
	"Turn alchemical reactions into offensive and defensive techniques.",
	"Study combat techniques that draw on the stars.",
	"Gather and work wood into useful tools and equipment.",
	"Train in agile attacks and controlling the range of a fight.",
	"Gather ingredients and prepare restorative meals.",
	"Study divination and the patterns that shape fate.",
	"Study how to inscribe and strengthen magical glyphs.",
	"Train in ranged skirmishing with paired firearms.",
	"Study healing and protective arts.",
	"Train in the reach and force of a lance.",
	"Develop stamina, resolve, and unarmed fighting techniques.",
	"Study remedies and how to prepare them from gathered materials.",
	"Develop the judgment and luck needed for trade.",
	"Study instruments, performance, and the effects of music.",
	"Train in agility and precise strikes.",
	"Study animal care and ways to train companions.",
	"Learn to control constructs with precision.",
	"Work metal into tools, weapons, and armor.",
	"Turn fibers, thread, and cloth into useful gear.",
	"Study alchemical production and the transformation of materials.",
]
# Level-up bonuses from the Talent category. Fate Astrology has no row in that chart.
const TALENT_GROWTH: Array[Dictionary] = [
	{"strength": 0.5}, {"intelligence": 0.5}, {"life": 0.25, "stamina": 0.25},
	{"dexterity": 0.5}, {"mana": 0.5, "stamina": 0.5}, {"strength": 0.25, "will": 0.25},
	{"stamina": 0.5}, {"dexterity": 0.25, "luck": 0.25}, {"stamina": 0.25, "dexterity": 0.25},
	{}, {"strength": 0.25, "intelligence": 0.25}, {"stamina": 0.25, "strength": 0.25},
	{"intelligence": 0.5}, {"strength": 0.5}, {"will": 0.5}, {"stamina": 0.25, "will": 0.25},
	{"luck": 0.5}, {"life": 0.25, "stamina": 0.25}, {"strength": 0.25, "will": 0.25},
	{"will": 0.25, "luck": 0.25}, {"stamina": 0.25, "dexterity": 0.25},
	{"stamina": 0.25, "dexterity": 0.25}, {"stamina": 0.25, "dexterity": 0.25},
	{"mana": 0.5, "stamina": 0.5},
]
const BUILDS := ["Compact", "Balanced", "Broad"]
const HAIR := [
	"Shorn", "Sweep", "Crest", "Long", "Cropped", "Side Part", "Mohawk",
	"Slicked Back", "Bob", "Bun", "Braids", "Ponytail",
]
const HAIR_TONES := [
	"Ash", "Plum", "Copper", "Gold", "Ink", "Chestnut", "Crimson", "Silver", "Glacier", "Wheat"
]
const SKIN_TONES := ["Pale", "Sand", "Umber", "Deep"]
const EYES := ["Steady", "Narrow", "Wide"]
const EYE_TONES := [
	"Slate", "Teal", "Violet", "Amber", "Ice", "Steel Blue", "Sage", "Hazel", "Rose", "Silver"
]
const FACES := ["Soft", "Angular", "Square"]

const ATLAS := "res://assets/art/character_atlas.png"
const EXTRA_HAIR_ATLAS := "res://assets/art/character_hair_extra.png"
const ORIGINAL_HAIR_COUNT := 4
const OUTFIT_COLORS := [Color("#5bbfc5"), Color("#508da0"), Color("#cd683d")]
const HAIR_COLORS := [
	Color("#443846"), Color("#7a3045"), Color("#cd683d"), Color("#fbb954"), Color("#2e222f"),
	Color("#997f73"), Color("#993d41"), Color("#d6dad3"), Color("#5bbfc5"), Color("#f2ec8b")
]
const SKIN_COLORS := [Color("#d6dad3"), Color("#b0a987"), Color("#997f73"), Color("#665964")]
const EYE_COLORS := [
	Color("#28353e"), Color("#407080"), Color("#45293f"), Color("#fbb954"), Color("#5bbfc5"),
	Color("#508da0"), Color("#788a87"), Color("#997f73"), Color("#7a3045"), Color("#d6dad3")
]


static func gender_name(profile: Dictionary) -> String:
	var gender := int(profile.get("gender", -1))
	return GENDERS[gender] if gender >= 0 and gender < GENDERS.size() else "Unspecified"


static func race_index(profile: Dictionary) -> int:
	return clampi(int(profile.get("race", profile.get("lineage", Race.HUMAN))), Race.HUMAN, Race.GIANT)


static func available_talents(race: int) -> Array[int]:
	var talents: Array[int] = []
	for id in TALENTS.size():
		if id == ADVENTURE or (id == ARCHERY and race == Race.GIANT) or (id == LANCE_COMBAT and race == Race.ELF):
			continue
		talents.append(id)
	return talents


static func portrait(profile: Dictionary, two_tone := false) -> Texture2D:
	var atlas := load(ATLAS) as Texture2D
	if atlas == null:
		return null
	var source := atlas.get_image()
	var body := source.get_region(Rect2i(int(profile["body"]) * 16, 0, 16, 24))
	var hair_index := int(profile["hair"])
	var hair_source := source
	var hair_column := 3 + hair_index
	if hair_index >= ORIGINAL_HAIR_COUNT:
		var extra := load(EXTRA_HAIR_ATLAS) as Texture2D
		if extra != null:
			hair_source = extra.get_image()
			hair_column = hair_index - ORIGINAL_HAIR_COUNT
		else:
			hair_column = 3
	var fringe := hair_source.get_region(Rect2i(hair_column * 16, 0, 16, 24))
	var skin: Color = SKIN_COLORS[profile["skin"]]
	var outfit: Color = OUTFIT_COLORS[race_index(profile)]
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
