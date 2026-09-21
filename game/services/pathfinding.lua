local D = require("game.domain.dungeon")
local C = require("game.content.catalog")
local M = {}
function M.create(map, run)
	assert(astar, "Native A* extension is required")
	local id = astar.new_map_id()
	-- Four directions, extension's native one-based top-left coordinates.
	astar.setup(map.width, map.height, astar.DIRECTION_FOUR, map.width * map.height, 4, false, false, false, id)
	local cells = {}
	for y = 1, map.height do
		for x = 1, map.width do
			cells[#cells + 1] = D.walkable(map, x, y, run) and 1 or 0
		end
	end
	astar.set_map(cells, id)
	astar.set_costs({ [1] = { 1, 1, 1, 1 } }, id)
	return id
end
function M.solve(id, sx, sy, ex, ey)
	local status, _, _, path = astar.solve(sx, sy, ex, ey, id)
	if status == astar.START_END_SAME then
		return {}
	end
	if status ~= astar.SOLVED then
		return nil
	end
	return path
end
---@return table|nil route
---Choose the shortest reachable cardinal neighbor, in a stable order on ties.
function M.to_service(id, map, sx, sy, service)
	local npc = C.services[service]
	if not npc then
		return nil
	end
	local best
	for _, offset in ipairs({ { 0, -1 }, { -1, 0 }, { 1, 0 }, { 0, 1 } }) do
		local x, y = npc.x + offset[1], npc.y + offset[2]
		if D.walkable(map, x, y) then
			local path = M.solve(id, sx, sy, x, y)
			if path and (not best or #path < #best) then
				best = path
			end
		end
	end
	return best
end
function M.dispose(id)
	if id then
		astar.delete_map(id)
	end
end
return M
