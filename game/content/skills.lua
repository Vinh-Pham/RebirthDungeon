-- Executable starter registry. Unknown higher ranks and reference-only subjects stay absent.
-- F-rank effects retain the authored adaptations recorded in docs/content-data.md.
local Combat = require("game.content.skills.combat")
local M = {}
M.order = {}
for _, id in ipairs(Combat.order) do
	table.insert(M.order, id)
end
table.insert(M.order, "icebolt")
M.ranks = { "F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1" }
M.definitions = {
	icebolt = {
		name = "Icebolt",
		kind = "attack",
		group = "Magic",
		hero = true,
		category = "magic",
		pool = "mp",
		cost = 1,
		base = 15,
		multiplier = 1,
		hits = 1,
		cooldown = 0,
		target = "hostile",
		tile = "tile_0127",
		description = "One charge strikes one enemy for 15 + magic attack before mitigation. Requires a wand; costs 1 MP.",
		source = "Icebolt F INT/MP snapshot; damage is the project's authored starter adaptation.",
		route = "Magic starter grant, including first rebirth into Magic.",
		ranks = {
			{
				attributes = { int = 1 },
				objectives = {
					{
						id = "damaging_skill",
						event = "skill_damage",
						text = "Deal damage with Icebolt",
						points = 5,
						limit = 20,
					},
				},
			},
		},
	},
	pounce = { name = "Pounce", kind = "attack", pool = "sp", cost = 4, multiplier = 1.25, hits = 1, cooldown = 2 },
	poison_bite = {
		name = "Poison Bite",
		kind = "attack",
		pool = "sp",
		cost = 4,
		multiplier = 1,
		hits = 1,
		cooldown = 2,
		status = "poison",
	},
	armor_break = {
		name = "Armor Break",
		kind = "attack",
		pool = "sp",
		cost = 4,
		multiplier = 1,
		hits = 1,
		cooldown = 2,
		status = "armor_break",
	},
}
for id, definition in pairs(Combat.definitions) do
	M.definitions[id] = definition
end
return M
