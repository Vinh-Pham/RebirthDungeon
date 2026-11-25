local key = require("game.core.grid").key
local M = {}
function M.is_floor(map, x, y)
	local cell = key(x, y)
	return not map.walls[cell] and not map.water[cell]
end
return M
