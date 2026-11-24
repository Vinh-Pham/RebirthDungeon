local M = {}
M.GENDERS = { "Male", "Female", "Nonbinary" }
M.RACES = { "Human", "Elf", "Giant" }
M.MIN_START_AGE = 10
M.MAX_START_AGE = 17
M.MAX_AGE = 25
M.TALENTS = {
	"Close Combat",
	"Magic",
	"Adventure",
	"Archery",
	"Battle Alchemy",
	"Battle Astrology",
	"Carpentry",
	"Chain Slash",
	"Cooking",
	"Fate Astrology",
	"Glyphwrighting",
	"Gunslinger",
	"Holy Arts",
	"Lance Combat",
	"Martial Arts",
	"Medicine",
	"Mercantile",
	"Music",
	"Ninja",
	"Pet Training",
	"Puppetry",
	"Smithing",
	"Tailoring",
	"Transmutation",
}
M.BUILDS = { "Compact", "Balanced", "Broad" }
M.HAIR = {
	"Shorn",
	"Sweep",
	"Crest",
	"Long",
	"Cropped",
	"Side Part",
	"Mohawk",
	"Slicked Back",
	"Bob",
	"Bun",
	"Braids",
	"Ponytail",
}
M.HAIR_TONES = {
	"Ash",
	"Plum",
	"Copper",
	"Gold",
	"Ink",
	"Chestnut",
	"Crimson",
	"Silver",
	"Glacier",
	"Wheat",
}
M.SKIN_TONES = { "Pale", "Sand", "Umber", "Deep" }
M.EYES = { "Steady", "Narrow", "Wide" }
M.EYE_TONES = {
	"Slate",
	"Teal",
	"Violet",
	"Amber",
	"Ice",
	"Steel Blue",
	"Sage",
	"Hazel",
	"Rose",
	"Silver",
}
M.FACES = { "Soft", "Angular", "Square" }
function M.race_index(p)
	return math.max(0, math.min(2, p.race or 0))
end
M.CLOSE_COMBAT = 0
M.ADVENTURE = 2
M.ARCHERY = 3
M.FATE_ASTROLOGY = 9
M.LANCE_COMBAT = 13
M.Race = { HUMAN = 0, ELF = 1, GIANT = 2 }
M.Gender = { MALE = 0, FEMALE = 1, NONBINARY = 2 }
M.TALENT_GROWTH = {
	{ strength = 0.5 },
	{ intelligence = 0.5 },
	{ life = 0.25, stamina = 0.25 },
	{ dexterity = 0.5 },
	{ mana = 0.5, stamina = 0.5 },
	{ strength = 0.25, will = 0.25 },
	{ stamina = 0.5 },
	{ dexterity = 0.25, luck = 0.25 },
	{ stamina = 0.25, dexterity = 0.25 },
	{},
	{ strength = 0.25, intelligence = 0.25 },
	{ stamina = 0.25, strength = 0.25 },
	{ intelligence = 0.5 },
	{ strength = 0.5 },
	{ will = 0.5 },
	{ stamina = 0.25, will = 0.25 },
	{ luck = 0.5 },
	{ life = 0.25, stamina = 0.25 },
	{ strength = 0.25, will = 0.25 },
	{ will = 0.25, luck = 0.25 },
	{ stamina = 0.25, dexterity = 0.25 },
	{ stamina = 0.25, dexterity = 0.25 },
	{ stamina = 0.25, dexterity = 0.25 },
	{ mana = 0.5, stamina = 0.5 },
}
function M.available_talents(race)
	local out = {}
	for i = 0, #M.TALENTS - 1 do
		if i ~= 2 and not (race == 1 and i == 13) and not (race == 2 and i == 3) then
			out[#out + 1] = i
		end
	end
	return out
end
M.RACE_DETAILS = {
	"Versatile delvers with a balance of endurance and resolve.",
	"Quick and perceptive, with an affinity for magic.",
	"Sturdy delvers with greater strength and stamina.",
}
M.TALENT_DETAILS = {
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
}
return M
