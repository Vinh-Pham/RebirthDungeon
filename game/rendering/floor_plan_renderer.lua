local Grid = require("game.core.grid")
local M = {}

local function transform(room, x, y)
	return room.layout.x + (room.layout.reverse and room.width - 1 - x or x), room.layout.y + y
end

function M.prepare(rooms)
	if rooms[1].floor_plan then
		return
	end
	local branching = rooms[1].connections ~= nil
	local plan = { width = branching and 142 or 105, height = 96, corridors = {} }
	local slots = { { 0, 1 }, { 1, 1 }, { 2, 1 }, { 1, 0 }, { 3, 1 }, { 3, 2 }, { 3, 0 }, { 2, 2 }, { 1, 2 } }
	for index, room in ipairs(rooms) do
		local row = math.floor((index - 1) / 3)
		local column = (index - 1) % 3
		if row % 2 == 1 then
			column = 2 - column
		end
		if branching then
			column, row = slots[index][1], slots[index][2]
		end
		room.layout = {
			x = 4 + column * 34,
			y = 5 + row * 30,
			reverse = branching and row == 2 or not branching and row % 2 == 1,
		}
	end
	local connections = rooms[1].connections or {}
	if #connections == 0 then
		for index = 1, #rooms - 1 do
			connections[index] =
				{ a = index, b = index + 1, door_a = rooms[index].exit, door_b = rooms[index + 1].entry }
		end
	end
	plan.connections = connections
	for index, connection in ipairs(connections) do
		local a, b = rooms[connection.a], rooms[connection.b]
		local da, db = connection.door_a, connection.door_b
		local x, y = transform(a, da.x, da.y)
		local tx, ty = transform(b, db.x, db.y)
		local function line(nx, ny)
			while x ~= nx or y ~= ny do
				plan.corridors[Grid.key(x, y)] = index
				if x ~= nx then
					x = x + (x < nx and 1 or -1)
				else
					y = y + (y < ny and 1 or -1)
				end
			end
			plan.corridors[Grid.key(x, y)] = index
		end
		if branching and (connection.a == 2 and connection.b == 4 or connection.a == 5 and connection.b == 7) then
			local gap = b.layout.y + b.height + 1
			line(x, gap)
			line(tx, gap)
			line(tx, ty)
		elseif branching and connection.a == 4 and connection.b == 7 then
			local gap = a.layout.x + a.width + 1
			line(gap, y)
			line(gap, 1)
			line(tx, 1)
			line(tx, ty)
		elseif branching and connection.a == 5 and connection.b == 6 then
			local lane = plan.width - 2
			line(lane, y)
			line(lane, ty)
			line(tx, ty)
		elseif not branching and math.floor((connection.a - 1) / 3) ~= math.floor((connection.b - 1) / 3) then
			local lane = a.layout.reverse and 1 or plan.width - 2
			line(lane, y)
			line(lane, ty)
			line(tx, ty)
		else
			local midpoint = math.floor((x + tx) / 2)
			line(midpoint, y)
			line(midpoint, ty)
			line(tx, ty)
		end
	end
	rooms[1].floor_plan = plan
end

local function remembered(world, index, x, y)
	local explored = world.world.threshold_explored or {}
	local room = explored[tostring(index)] or {}
	return room[Grid.key(x, y)]
end

local function visible(world, index, x, y)
	return index == world.room and world.visible and world.visible[Grid.key(x, y)]
end

function M.path_target(world, x, y)
	for index, room in ipairs(world.rooms) do
		local layout = room.layout
		local lx, ly = x - layout.x, y - layout.y
		if layout.reverse then
			lx = room.width - 1 - lx
		end
		if room.floor[Grid.key(lx, ly)] and remembered(world, index, lx, ly) then
			if index == world.room then
				return lx, ly
			end
			for _, door in ipairs(world.map.doors or {}) do
				if door.target == index then
					return door.x, door.y
				end
			end
			if not world.map.doors then
				local door = index > world.room and world.map.exit or world.map.entry
				return door.x, door.y
			end
			return nil
		end
	end
	local corridor = world.rooms[1].floor_plan.corridors[Grid.key(x, y)]
	if corridor then
		local link = world.rooms[1].floor_plan.connections[corridor]
		if not world:link_explored(link.a, link.b) then
			return nil
		end
		local destination = link.a == world.room and link.b or link.b == world.room and link.a
		for _, door in ipairs(world.map.doors or {}) do
			if door.target == destination and remembered(world, world.room, door.x, door.y) then
				return door.x, door.y
			end
		end
	end
	return nil
end

function M.render(view, bounds)
	local world = view.s.world
	local plan = world.rooms[1].floor_plan
	local size = math.max(2, math.floor(math.min(bounds.w / plan.width, bounds.h / plan.height)))
	local left = bounds.x + math.floor((bounds.w - plan.width * size) / 2)
	local top = bounds.y + math.floor((bounds.h - plan.height * size) / 2)
	view.camera_target, view.camera_position, view.camera_map = nil, nil, nil
	local active = world.map.layout
	local exit_x, exit_y = transform(world.map, world.map.exit.x, world.map.exit.y)
	local entry_x, entry_y = transform(world.map, world.map.entry.x, world.map.entry.y)
	view.map_preview = {
		floor_plan = true,
		active_x = active.x,
		active_y = active.y,
		reverse = active.reverse,
		exit_x = exit_x,
		exit_y = exit_y,
		entry_x = entry_x,
		entry_y = entry_y,
	}
	view.map_view = {
		x = left,
		y = top,
		w = plan.width * size,
		h = plan.height * size,
		ox = 0,
		oy = 0,
		tile_width = size,
		tile_height = size,
	}
	local function tile(x, y, tint, w, h)
		return view:box(left + (x + 0.5) * size, top + (y + 0.5) * size, w or size, h or size, tint)
	end
	local cells = {}
	-- Corridors are revealed only after both adjoining rooms have been visited.
	for key, room_index in pairs(plan.corridors) do
		local link = plan.connections[room_index]
		if world:link_explored(link.a, link.b) then
			cells[key] = "floor"
		end
	end
	for index, room in ipairs(world.rooms) do
		for key in pairs(room.floor) do
			local x, y = key:match("^(%-?%d+),(%-?%d+)$")
			x, y = tonumber(x), tonumber(y)
			if remembered(world, index, x, y) then
				local gx, gy = transform(room, x, y)
				cells[Grid.key(gx, gy)] = visible(world, index, x, y) and "muted" or "floor"
			end
		end
	end
	local outline = {}
	for key in pairs(cells) do
		local x, y = key:match("^(%-?%d+),(%-?%d+)$")
		x, y = tonumber(x), tonumber(y)
		for dx = -1, 1 do
			for dy = -1, 1 do
				outline[Grid.key(x + dx, y + dy)] = "border"
			end
		end
	end
	local function strips(cells)
		-- Draw continuous horizontal strips so the full floor plan stays within
		-- Defold's GUI node budget while preserving sharp square edges.
		for y = 0, plan.height - 1 do
			local x = 0
			while x < plan.width do
				local tint = cells[Grid.key(x, y)]
				if tint then
					local start = x
					repeat
						x = x + 1
					until x == plan.width or cells[Grid.key(x, y)] ~= tint
					view:box(left + (start + x) * size / 2, top + (y + 0.5) * size, (x - start) * size, size, tint)
				else
					x = x + 1
				end
			end
		end
	end
	strips(outline)
	strips(cells)
	for index, room in ipairs(world.rooms) do
		local doors = {}
		for _, door in ipairs(room.doors or {}) do
			doors[#doors + 1] = door
		end
		if not room.doors or index == 9 then
			doors[#doors + 1] = room.exit
		end
		for _, door in ipairs(doors) do
			local locked = world:door_locked(door, index)
			local gx, gy = transform(room, door.x, door.y)
			if remembered(world, index, door.x, door.y) then
				tile(gx, gy, locked and "red" or "teal", math.max(3, size - 1), size + 2)
			end
		end
		if index == world.room then
			for _, landmark in ipairs(room.landmarks or {}) do
				local lx, ly = transform(room, landmark.x, landmark.y)
				if visible(world, index, landmark.x, landmark.y) then
					tile(lx, ly, "gold", size - 1, size - 2)
				end
			end
			for _, enemy in ipairs(world.enemies) do
				if visible(world, index, enemy.x, enemy.y) then
					local ex, ey = transform(room, enemy.x, enemy.y)
					tile(ex, ey, "dark", math.max(9, size + 2), math.max(12, size + 4))
					view:art(
						left + (ex + 0.5) * size,
						top + (ey + 0.5) * size,
						math.max(8, size),
						math.max(12, size * 1.5),
						"spider_atlas_" .. tostring(enemy.sprite or 0)
					)
				end
			end
		end
		for chest_index, chest in ipairs(room.chests or {}) do
			if remembered(world, index, chest.x, chest.y) then
				local claimed = world.world.threshold_treasure_claimed
				local chosen = world.world.threshold_treasure_chest == chest_index - 1
				local cx, cy = transform(room, chest.x, chest.y)
				tile(
					cx,
					cy,
					claimed and (chosen and "teal" or "dark") or "gold",
					math.max(4, size - 2),
					math.max(4, size - 2)
				)
			end
		end
	end
	local p = world.player
	local px, py = transform(world.map, p.x, p.y)
	tile(px, py, "dark", math.max(9, size + 2), math.max(12, size + 4))
	view:portrait(left + (px + 0.5) * size, top + (py + 0.5) * size, view.s.profile, math.max(0.5, size / 24))
end
return M
