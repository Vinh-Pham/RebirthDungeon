local R = require("game.core.rng")
local M = { VERSION = "defold-v1" }
local key = require("game.core.grid").key
function M.decorate_room(room, index)
	room.landmarks = room.landmarks or {}
	room.chests = room.chests or {}
	room.enemies = room.enemies or {}
	if index == 1 then
		local has = false
		for _, p in ipairs(room.landmarks) do
			if p.id == "rack" then
				has = true
			end
		end
		if not has then
			for i, family in ipairs({ "light", "rapier", "heavy", "piercing" }) do
				room.landmarks[#room.landmarks + 1] = {
					id = "rack",
					family = family,
					name = family .. " weapon rack",
					label = "Weapon Rack",
					x = 5,
					y = 2 + i * 2,
					cell = { x = 5, y = 2 + i * 2 },
				}
			end
			room.landmarks[#room.landmarks + 1] = {
				id = "practice",
				name = "Practice Post",
				label = "Practice Post",
				x = 8,
				y = 4,
				cell = { x = 8, y = 4 },
			}
		end
	end
	return room
end
function M.rooms(seed)
	local r = R.new(seed)
	local rooms = {}
	for i = 0, 8 do
		local top, bottom, left, right = r:range(2, 4), r:range(10, 12), r:range(3, 5), r:range(25, 27)
		if i == 7 then
			top, bottom, left, right = 2, 12, 3, 27
		end
		local m = {
			width = 31,
			height = 15,
			floor = {},
			walls = {},
			landmarks = {},
			enemies = {},
			chests = {},
			entry = { x = 2, y = r:range(5, 9) },
			exit = { x = 28, y = r:range(5, 9) },
		}
		local function floor(x, y)
			m.floor[key(x, y)] = true
		end
		for x = left, right do
			for y = top, bottom do
				floor(x, y)
			end
		end
		for x = 2, left do
			floor(x, m.entry.y)
		end
		for x = right, 28 do
			floor(x, m.exit.y)
		end
		if i == 0 then
			for x = 4, 9 do
				for y = 4, 10 do
					floor(x, y)
				end
			end
		end
		for x = left + 1, right - 1 do
			if r:float() < 0.35 then
				floor(x, top - 1)
			end
			if r:float() < 0.35 then
				floor(x, bottom + 1)
			end
		end
		if i < 8 then
			local n = (i == 0 or i == 7) and 1 or r:range(1, 3)
			if i == 1 then
				n = r:range(2, 3)
			end
			local used = {}
			while #m.enemies < n do
				local x, y = r:range(15, 22), r:range(top + 1, bottom - 1)
				if not used[key(x, y)] then
					used[key(x, y)] = true
					m.enemies[#m.enemies + 1] =
						{ x = x, y = y, id = "spider_" .. (#m.enemies + 1), name = "Cave Spider" }
				end
			end
		else
			for j = 0, 4 do
				m.chests[#m.chests + 1] = { x = 8 + j * 4, y = 7, id = "chest_" .. j }
			end
		end
		m.spawn = m.entry
		M.decorate_room(m, i + 1)
		rooms[#rooms + 1] = m
	end
	return rooms
end
return M
