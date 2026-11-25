local M = {}
function M.destination(origin)
	return origin == "lantern_rest" and "spindle_hollow" or "lantern_rest"
end
function M.return_destination(world)
	return world.dungeon_from or "lantern_rest"
end
return M
