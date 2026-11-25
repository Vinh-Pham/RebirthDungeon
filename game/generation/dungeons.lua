local R = require("game.core.rng")
local ROT = require("game.vendor.rot")
local M =
	{ VERSION = "defold-v4", CHAMBER_VERSION = "defold-v3", MAZE_VERSION = "defold-v2", LEGACY_VERSION = "defold-v1" }
local Roster = require("game.data.enemies.dungeon")
local key = require("game.core.grid").key
local introductory_monsters = { "glass_mite", "cinder_crawler" }
local chamber_monsters = { "glass_mite", "cinder_crawler", "shale_stalker", "coil_sentinel" }
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
function M.legacy_rooms(seed)
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

function M.maze_rooms(seed)
	local r = R.new(seed)
	local rooms = {}
	for i = 0, 8 do
		local top, bottom = r:range(2, 4), r:range(10, 12)
		if i == 7 then
			top, bottom = 2, 12
		end
		local m = {
			width = 31,
			height = 27,
			floor = {},
			walls = {},
			landmarks = {},
			enemies = {},
			chests = {},
			entry = { x = 2, y = r:range(3, 23) },
			exit = { x = 28, y = r:range(3, 23) },
		}
		if rooms[#rooms] then
			m.entry.y = rooms[#rooms].exit.y
		end
		local function floor(x, y)
			m.floor[key(x, y)] = true
		end
		local maze = ROT.Map.IceyMaze:new(27, 27, 0)
		maze:setRNG({
			random = function()
				return r:float()
			end,
		})
		maze:create(function(x, y, value)
			if value == 0 then
				floor(x + 1, y - 1)
			end
		end)
		-- Every odd interior coordinate is a maze vertex. Join authored
		-- interaction cells to the closest vertex so content stays reachable.
		local function connect(x, y)
			local vertex_x = math.max(3, math.min(27, x - (1 - x % 2)))
			local vertex_y = math.max(1, math.min(23, y - (1 - y % 2)))
			for cx = math.min(x, vertex_x), math.max(x, vertex_x) do
				floor(cx, y)
			end
			for cy = math.min(y, vertex_y), math.max(y, vertex_y) do
				floor(vertex_x, cy)
			end
		end
		connect(m.entry.x, m.entry.y)
		connect(m.exit.x, m.exit.y)
		if i == 0 then
			for x = 4, 9 do
				for y = 4, 10 do
					floor(x, y)
				end
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
		for _, group in ipairs({ m.landmarks, m.enemies, m.chests }) do
			for _, point in ipairs(group) do
				connect(point.x, point.y)
			end
		end
		-- Give solid interactables an approach from every side so a rack or
		-- chest cannot seal the maze's only corridor.
		for _, group in ipairs({ m.landmarks, m.chests }) do
			for _, point in ipairs(group) do
				for x = point.x - 1, point.x + 1 do
					for y = point.y - 1, point.y + 1 do
						connect(x, y)
					end
				end
			end
		end
		for x = 0, m.width - 1 do
			for y = 0, m.height - 1 do
				local k = key(x, y)
				if not m.floor[k] then
					m.walls[k] = true
				end
			end
		end
		rooms[#rooms + 1] = m
	end
	return rooms
end
-- Each chamber is generated by rotLove Arena and joined to terminal doors
-- by bent corridors. Room-local coordinates keep saved movement independent
-- of the overview's floor-plan arrangement.
function M.chamber_rooms(seed)
	local rng = R.new(seed)
	local rooms = {}
	for index = 1, 9 do
		local boss = index == 8
		local source = {
			getUniformInt = function(_, low, high)
				return rng:range(low, high)
			end,
			random = function()
				return rng:float()
			end,
		}
		local feature = ROT.Map.Room:createRandomCenter(15, 13, {
			roomWidth = boss and { 22, 22 } or { 12, 17 },
			roomHeight = boss and { 19, 19 } or { 8, 13 },
		}, source)
		local width = feature:getRight() - feature:getLeft() + 1
		local height = feature:getBottom() - feature:getTop() + 1
		local left = math.max(4, math.min(27 - width, feature:getLeft()))
		local top = math.max(3, math.min(24 - height, feature:getTop()))
		feature = ROT.Map.Room:new(left, top, left + width - 1, top + height - 1)
		local room = {
			width = 31,
			height = 27,
			floor = {},
			walls = {},
			landmarks = {},
			enemies = {},
			chests = {},
			boss = boss,
			chamber = { x = left, y = top, w = width, h = height },
			entry = { x = 2, y = rng:range(4, 22) },
			exit = { x = 28, y = rng:range(4, 22) },
		}
		if rooms[index - 1] then
			room.entry.y = rooms[index - 1].exit.y
		end
		local function carve(x, y)
			room.floor[key(x, y)] = true
		end
		feature:create(function(x, y, value)
			if value == 0 then
				carve(x, y)
			end
		end)
		local center_y = top + math.floor(height / 2)
		for _, connection in ipairs({
			{ door = room.entry, bend = left - 1, finish = left },
			{ door = room.exit, bend = left + width, finish = left + width - 1 },
		}) do
			ROT.Map.Corridor:new(connection.door.x, connection.door.y, connection.bend, connection.door.y):create(carve)
			ROT.Map.Corridor:new(connection.bend, connection.door.y, connection.bend, center_y):create(carve)
			carve(connection.finish, center_y)
		end
		M.decorate_room(room, index)
		if index < 9 then
			local count = boss and 1 or rng:range(1, index == 1 and 2 or 4)
			local used = {}
			for _, landmark in ipairs(room.landmarks) do
				used[key(landmark.x, landmark.y)] = true
			end
			local kinds = index == 1 and introductory_monsters or chamber_monsters
			while #room.enemies < count do
				local x = rng:range(left + 2, left + width - 3)
				local y = rng:range(top + 1, top + height - 2)
				if not used[key(x, y)] then
					used[key(x, y)] = true
					local kind = boss and "vault_warden" or kinds[rng:range(1, #kinds)]
					room.enemies[#room.enemies + 1] = {
						x = x,
						y = y,
						id = "spider_" .. (#room.enemies + 1),
						kind = kind,
						name = Roster[kind].name,
						sprite = Roster[kind].sprite,
						boss = boss,
					}
				end
			end
		else
			for n = 0, 4 do
				room.chests[#room.chests + 1] = { x = left + 1 + n * 2, y = center_y, id = "chest_" .. n }
			end
		end
		room.spawn = room.entry
		if index == 1 then
			for x = 4, math.max(9, left) do
				for y = 3, math.max(11, center_y) do
					carve(x, y)
				end
			end
		end
		for x = 0, room.width - 1 do
			for y = 0, room.height - 1 do
				if not room.floor[key(x, y)] then
					room.walls[key(x, y)] = true
				end
			end
		end
		rooms[index] = room
	end
	return rooms
end
function M.rooms(seed)
	local rooms = M.chamber_rooms(seed)
	local links = { { 1, 2 }, { 2, 3 }, { 3, 5 }, { 5, 6 }, { 6, 8 }, { 8, 9 }, { 2, 4 }, { 5, 7 }, { 4, 7 } }
	for _, room in ipairs(rooms) do
		room.doors = {}
	end
	local function carve(room, x, y)
		room.floor[key(x, y)] = true
		room.walls[key(x, y)] = nil
	end
	local function branch(room, side)
		local chamber = room.chamber
		local x = chamber.x + math.floor(chamber.w / 2)
		local y = side == "north" and 1 or 25
		local cy = chamber.y + math.floor(chamber.h / 2)
		ROT.Map.Corridor:new(x, y, x, cy):create(function(cx, yy)
			carve(room, cx, yy)
		end)
		return { x = x, y = y }
	end
	local function add(a, b, pa, pb)
		local da = { x = pa.x, y = pa.y, target = b, arrival = { x = pb.x, y = pb.y }, id = "door_" .. b }
		local db = { x = pb.x, y = pb.y, target = a, arrival = { x = pa.x, y = pa.y }, id = "door_" .. a }
		rooms[a].doors[#rooms[a].doors + 1] = da
		rooms[b].doors[#rooms[b].doors + 1] = db
		return da, db
	end
	local connections = {}
	for i, link in ipairs(links) do
		local a, b = link[1], link[2]
		local pa, pb
		if i <= 6 then
			pa, pb = rooms[a].exit, rooms[b].entry
		elseif i == 7 then
			pa, pb = branch(rooms[a], "north"), rooms[b].entry
		elseif i == 8 then
			pa, pb = branch(rooms[a], "north"), rooms[b].entry
		else
			pa, pb = rooms[a].exit, branch(rooms[b], "north")
		end
		local da, db = add(a, b, pa, pb)
		connections[#connections + 1] = { a = a, b = b, door_a = da, door_b = db }
	end
	rooms[1].connections = connections
	return rooms
end
return M
