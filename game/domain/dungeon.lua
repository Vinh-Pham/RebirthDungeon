local M = { TILE = 48 }
function M.index(map, x, y)
	return (y - 1) * map.width + x
end
local function floor(map, x, y)
	return x >= 1 and y >= 1 and x <= map.width and y <= map.height and map.tiles[M.index(map, x, y)] == 1
end
local function carve(map, x, y)
	map.tiles[M.index(map, x, y)] = 1
end

---Door cells come from actual room/corridor boundaries, including every lane.
function M.build_gates(map)
	local gates = {}
	for _, room in ipairs(map.rooms) do
		if M.enemies(room) then
			for _, side in ipairs({ "west", "east", "south", "north" }) do
				local vertical = side == "west" or side == "east"
				local first, last = vertical and room.y1 or room.x1, vertical and room.y2 or room.x2
				for coordinate = first, last do
					local x = vertical and (side == "west" and room.x1 or room.x2) or coordinate
					local y = vertical and coordinate or (side == "south" and room.y1 or room.y2)
					local dx = side == "west" and -1 or side == "east" and 1 or 0
					local dy = side == "south" and -1 or side == "north" and 1 or 0
					if floor(map, x, y) and floor(map, x + dx, y + dy) then
						gates[#gates + 1] = {
							room = room.id,
							x = x,
							y = y,
							side = side,
							forward = (room.required and side ~= "west") or (room.kind == "boss" and side == "east"),
							boss = room.kind == "boss" and side == "west",
						}
					end
				end
			end
		end
	end
	return gates
end

---Legacy layouts derive the same gates without regenerating rooms or encounters.
function M.gates(map)
	return map.gates or M.build_gates(map)
end
function M.gate_open(run, gate, battle)
	if battle and battle.room == gate.room and not battle.outcome then
		return false
	end
	if gate.boss and not M.boss_open(run) then
		return false
	end
	return not gate.forward or run.cleared[gate.room] == true
end
function M.gate_at(map, x, y)
	for _, gate in ipairs(M.gates(map)) do
		if gate.x == x and gate.y == y then
			return gate
		end
	end
end
function M.walkable(map, x, y, run, battle)
	if not floor(map, x, y) then
		return false
	end
	if run then
		local gate = M.gate_at(map, x, y)
		if gate and not M.gate_open(run, gate, battle) then
			return false
		end
	end
	return true
end
function M.contains(room, x, y)
	return x >= room.x1 and x <= room.x2 and y >= room.y1 and y <= room.y2
end
function M.gate_state(run)
	local state = ""
	for _, room in ipairs(run.map.rooms) do
		state = state .. (run.cleared[room.id] and "1" or "0")
	end
	return state
end
function M.boss_open(run)
	for _, r in ipairs(run.map.rooms) do
		if r.required and not run.cleared[r.id] then
			return false
		end
	end
	return true
end
---Append the reward chamber without changing saved rooms or consuming RNG.
function M.add_reward_room(map)
	if map.rooms[8] then
		return
	end
	local old_width = map.width
	local tiles = map.tiles
	map.width = 101
	map.tiles = {}
	for y = 1, map.height do
		for x = 1, map.width do
			map.tiles[M.index(map, x, y)] = x <= old_width and tiles[(y - 1) * old_width + x] or 0
		end
	end
	local room =
		{ id = "room_8", kind = "treasure", x = 94, y = 21, x1 = 89, x2 = 99, y1 = 16, y2 = 26, required = false }
	map.rooms[8] = room
	for y = room.y1, room.y2 do
		for x = room.x1, room.x2 do
			carve(map, x, y)
		end
	end
	local boss = map.rooms[5]
	for x = boss.x, room.x do
		for dy = -1, 1 do
			carve(map, x, boss.y + dy)
		end
	end
	map.gates = M.build_gates(map)
end

---@return table Five chest locations and a goddess statue, all inside the saved chamber.
function M.treasure_objects(map)
	local room = map.rooms[8]
	local objects = {}
	for index = 1, 5 do
		objects[index] = { kind = "chest", index = index, x = room.x - 6 + index * 2, y = room.y + 2 }
	end
	objects[6] = { kind = "goddess", x = room.x, y = room.y - 2 }
	return objects
end

function M.generate(random)
	local map = { width = 83, height = 43, tiles = {}, rooms = {} }
	for i = 1, map.width * map.height do
		map.tiles[i] = 0
	end
	local centers = { { 7, 21 }, { 24, 21 }, { 41, 21 }, { 58, 21 }, { 76, 21 }, { 24, 7 }, { 41, 35 } }
	local kinds = { "entrance", "contact", "chest", "switch", "boss", "optional", "supplies" }
	for i, c in ipairs(centers) do
		local hx = random:int(4, 5)
		local hy = random:int(4, 5)
		local r = {
			id = "room_" .. i,
			x = c[1],
			y = c[2],
			x1 = c[1] - hx,
			x2 = c[1] + hx,
			y1 = c[2] - hy,
			y2 = c[2] + hy,
			kind = kinds[i],
			required = i >= 2 and i <= 4,
		}
		map.rooms[i] = r
		for y = r.y1, r.y2 do
			for x = r.x1, r.x2 do
				carve(map, x, y)
			end
		end
	end
	local edges = { { 1, 2 }, { 2, 3 }, { 3, 4 }, { 4, 5 }, { 2, 6 }, { 3, 7 } }
	for _, edge in ipairs(edges) do
		local a, b = map.rooms[edge[1]], map.rooms[edge[2]]
		for x = math.min(a.x, b.x), math.max(a.x, b.x) do
			for dy = -1, 1 do
				carve(map, x, a.y + dy)
			end
		end
		for y = math.min(a.y, b.y), math.max(a.y, b.y) do
			for dx = -1, 1 do
				carve(map, b.x + dx, y)
			end
		end
	end
	M.add_reward_room(map)
	return map
end
function M.enemies(room)
	local groups = {
		contact = { "small", "white" },
		chest = { "white", "white" },
		switch = { "red", "white" },
		optional = { "red", "red" },
		boss = { "giant", "white", "white" },
	}
	return groups[room.kind]
end
function M.room(map, id)
	for _, r in ipairs(map.rooms) do
		if r.id == id then
			return r
		end
	end
end
function M.town()
	local town = require("game.content.town")
	local map = { width = town.width, height = town.height, tiles = {} }
	for y = 1, map.height do
		for x = 1, map.width do
			local _, walkable = town.cell(x, y)
			map.tiles[(y - 1) * map.width + x] = walkable and 1 or 0
		end
	end
	return map
end
function M.reachable(map)
	local start = map.rooms[1]
	local queue = { { start.x, start.y } }
	local seen = { [M.index(map, start.x, start.y)] = true }
	local head = 1
	while head <= #queue do
		local c = queue[head]
		head = head + 1
		for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
			local x, y = c[1] + d[1], c[2] + d[2]
			local i = M.index(map, x, y)
			if M.walkable(map, x, y) and not seen[i] then
				seen[i] = true
				queue[#queue + 1] = { x, y }
			end
		end
	end
	for _, r in ipairs(map.rooms) do
		if not seen[M.index(map, r.x, r.y)] then
			return false
		end
	end
	return true
end
return M
