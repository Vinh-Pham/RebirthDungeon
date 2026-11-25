local R = require("game.core.rng")
local M = { VERSION = "defold-v1" }
local key = require("game.core.grid").key
local ROT = require("game.vendor.rot")
local Biomes = require("game.generation.biomes")
local Dungeons = require("game.generation.dungeons")
M.rooms = Dungeons.rooms
M.decorate_room = Dungeons.decorate_room
local function reachable(m, blocked, spawn)
	local seen = { [key(spawn.x, spawn.y)] = true }
	local q = { spawn }
	local n = 1
	while q[n] do
		local p = q[n]
		n = n + 1
		for _, d in ipairs({ { 0, -1 }, { 1, 0 }, { 0, 1 }, { -1, 0 } }) do
			local x, y = p.x + d[1], p.y + d[2]
			local k = key(x, y)
			if x >= 0 and y >= 0 and x < m.width and y < m.height and not blocked[k] and not seen[k] then
				seen[k] = true
				q[#q + 1] = { x = x, y = y }
			end
		end
	end
	return seen, q
end
local function add_trees(m, seed, count)
	local blocked, reserved = {}, {}
	for k in pairs(m.walls) do
		blocked[k] = true
	end
	for k in pairs(m.water) do
		blocked[k] = true
	end
	for k in pairs(m.roads) do
		reserved[k] = true
	end
	for _, p in ipairs(m.landmarks) do
		blocked[key(p.x, p.y)] = true
		for x = p.x - 1, p.x + 1 do
			for y = p.y - 1, p.y + 1 do
				reserved[key(x, y)] = true
			end
		end
		if p.building then
			local b = p.building
			for x = b.x - 1, b.x + b.width do
				for y = b.y - 1, b.y + b.height do
					reserved[key(x, y)] = true
				end
			end
		end
		if p.door then
			for x = p.door.x - 1, p.door.x + 1 do
				for y = p.door.y - 1, p.door.y + 1 do
					reserved[key(x, y)] = true
				end
			end
		end
		if m.width == 30 and p.sprite and p.sprite < 9 then
			for x = p.x - 2, p.x + 2 do
				for y = 2, 6 do
					reserved[key(x, y)] = true
				end
			end
		end
	end
	local _, cells = reachable(m, blocked, m.spawn)
	local candidates = {}
	for _, p in ipairs(cells) do
		if not reserved[key(p.x, p.y)] and (p.x - m.spawn.x) ^ 2 + (p.y - m.spawn.y) ^ 2 > 4 then
			candidates[#candidates + 1] = p
		end
	end
	local rng = R.new(seed)
	for i = #candidates, 2, -1 do
		local j = rng:range(1, i)
		candidates[i], candidates[j] = candidates[j], candidates[i]
	end
	local added = 0
	for _, p in ipairs(candidates) do
		if added >= count then
			break
		end
		local k = key(p.x, p.y)
		if not reserved[k] then
			blocked[k] = true
			local _, after = reachable(m, blocked, m.spawn)
			if #after == #cells - added - 1 then
				added = added + 1
				m.landmarks[#m.landmarks + 1] =
					{ id = "tree", name = "Tree", label = "Tree", x = p.x, y = p.y, cell = { x = p.x, y = p.y } }
				for x = p.x - 2, p.x + 2 do
					for y = p.y - 2, p.y + 2 do
						reserved[key(x, y)] = true
					end
				end
			else
				blocked[k] = nil
			end
		end
	end
end
function M.town(seed, id)
	local r = R.new(seed)
	local spindle = id == "spindle_hollow"
	local m = {
		width = spindle and 30 or 68,
		height = spindle and 11 or 42,
		floor = {},
		walls = {},
		water = {},
		roads = {},
		landmarks = {},
		enemies = {},
		spawn = spindle and { x = 4, y = 7 } or { x = 3, y = 12 },
	}
	local function add(id, name, label, x, y, sprite)
		local p = { id = id, name = name, label = label, x = x, y = y, sprite = sprite, cell = { x = x, y = y } }
		m.landmarks[#m.landmarks + 1] = p
		return p
	end
	if spindle then
		add("warden", "Oren", "Watchkeeper", 5, 4, 5)
		add("blacksmith", "Brann", "Blacksmith", 10, 4, 6)
		add("general_shop", "Rill", "Provisioner", 15, 4, 7)
		add("healer", "Ada", "Healer's House", 20, 4, 8)
		add("gate", "Moon Gate", "Moon Gate", 24, 8, 9)
		add("bank", "Ledger Keeper", "Bank", 15, 8)
		add("dungeon", "Threshold", "Threshold", 26, 5)
		for i = 1, 4 do
			local p = m.landmarks[i]
			for x = p.x - 2, p.x + 2 do
				m.walls[key(x, 1)] = true
				if x ~= p.x then
					m.walls[key(x, 5)] = true
				end
			end
			for y = 2, 4 do
				m.walls[key(p.x - 2, y)] = true
				m.walls[key(p.x + 2, y)] = true
			end
		end
	else
		local ids = { "warden", "blacksmith", "general_shop", "school", "church", "grocery_store", "healer" }
		local names = { "Nera", "Venn", "Tamsin", "Elian", "Maelin", "Corin", "Sera" }
		local labels = { "Warden", "Blacksmith", "General Shop", "School", "Church", "Grocery Store", "Healer's House" }
		for i, v in ipairs(ids) do
			add(v, names[i], labels[i], 0, 0, i <= 3 and i or (i == 7 and 4 or nil))
		end
		local services = {}
		for i = 1, 7 do
			services[i] = m.landmarks[i]
		end
		for i = 7, 3, -1 do
			local j = r:range(2, i)
			services[i], services[j] = services[j], services[i]
		end
		for i, p in ipairs(services) do
			local ix = i - 1
			local x, y = 5 + (ix % 4) * 15, 4
			if ix >= 4 then
				x, y = 5 + (ix - 4) * 14, 28
			end
			x = x + r:range(0, 1)
			y = y + r:range(0, 2)
			local w, h = r:range(9, 11), r:range(7, 9)
			local dx, dy = x + math.floor(w / 2), y + h - 1
			p.building = { x = x, y = y, width = w, height = h }
			p.door = { x = dx, y = dy }
			p.x, p.y = dx, y + 3
			p.cell = { x = p.x, y = p.y }
			for xx = x, x + w - 1 do
				m.walls[key(xx, y)] = true
				m.walls[key(xx, y + h - 1)] = true
			end
			for yy = y, y + h - 1 do
				m.walls[key(x, yy)] = true
				m.walls[key(x + w - 1, yy)] = true
			end
			m.walls[key(dx, dy)] = nil
			for yy = dy, ix < 4 and 20 or 39 do
				for xx = dx - 1, dx + 1 do
					if not m.walls[key(xx, yy)] then
						m.roads[key(xx, yy)] = true
					end
				end
			end
		end
		for x = 1, 66 do
			for y = 18, 22 do
				m.roads[key(x, y)] = true
			end
			for y = 39, 40 do
				m.roads[key(x, y)] = true
			end
		end
		for y = 1, 40 do
			for x = 1, 3 do
				m.roads[key(x, y)] = true
			end
			for x = 63, 65 do
				m.roads[key(x, y)] = true
			end
		end
		local pool = r:range(49, 52)
		for x = pool, pool + 8 do
			for y = 31, 37 do
				m.water[key(x, y)] = true
			end
		end
		local xs = { 24, 30, 36 }
		for i = 3, 2, -1 do
			local j = r:range(1, i)
			xs[i], xs[j] = xs[j], xs[i]
		end
		-- These indices belong to town_amenities, not the town NPC atlas.
		add("oven", "Cooking Oven", "Cooking Oven", xs[1], r:range(24, 25)).amenity_sprite = 0
		add("loom", "Loom", "Loom", xs[2], r:range(24, 25)).amenity_sprite = 1
		add("spinning_wheel", "Spinning Wheel", "Spinning Wheel", xs[3], r:range(24, 25)).amenity_sprite = 2
		add("fishing", "Fishing Spot", "Fishing Spot", pool + 1, 30).amenity_sprite = 4
		add("fishing", "Fishing Spot", "Fishing Spot", pool + 7, 30).amenity_sprite = 4
		add("windmill", "Windmill", "Windmill", 58, r:range(24, 26)).amenity_sprite = 3
		add("gate", "Moon Gate", "Moon Gate", 8, 23, 9)
		add("dungeon", "Threshold", "Threshold", 66, 20)
		add("bank", "Ledger Keeper", "Bank", 12, 20)
	end
	-- ROT uses one-based cells. Keep serialized map coordinates zero-based.
	ROT.Map.Arena:new(m.width, m.height):create(function(x, y, value)
		if value == 1 then
			m.walls[key(x - 1, y - 1)] = true
		end
	end)
	for x = 0, m.width - 1 do
		for y = 0, m.height - 1 do
			local k = key(x, y)
			if Biomes.is_floor(m, x, y) then
				m.floor[k] = true
			end
		end
	end
	add_trees(m, seed, spindle and 5 or 12)
	return m
end
M.reachable = reachable
return M
