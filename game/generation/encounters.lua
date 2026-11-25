local U = require("game.util")
local room_spiders = require("game.data.enemies.threshold")
local dungeon_enemies = require("game.data.enemies.dungeon")

local M = {}

function M.spiders(room, enemy_count)
	local enemies = {}
	for i = 1, enemy_count do
		local entry = U.copy(room_spiders[(room + i - 1) % #room_spiders + 1])
		local tier = math.floor(room / 2)
		entry.health = 14 + room * 2
		entry.damage_min, entry.damage_max = 3 + tier, 6 + tier
		entry.defense, entry.protection, entry.experience = room >= 3 and 1 or 0, 0, 14 + room * 2
		if room == 7 then
			entry = {
				name = "Giant Black Spider",
				sprite = 36,
				health = 62,
				damage_min = 8,
				damage_max = 13,
				defense = 2,
				protection = 0,
				experience = 100,
			}
		end
		enemies[i] = entry
	end
	return enemies
end

function M.for_room(map, room)
	local actors = map.enemies or {}
	if not actors[1] or not actors[1].kind then
		return M.spiders(room, #actors)
	end
	local enemies = {}
	for i, actor in ipairs(actors) do
		local definition = assert(dungeon_enemies[actor.kind], "Unknown dungeon enemy kind")
		local entry = U.copy(definition)
		entry.protection = 0
		if not entry.boss then
			entry.health = entry.health + room
			entry.experience = entry.experience + room * 2
		end
		enemies[i] = entry
	end
	return enemies
end

return M
