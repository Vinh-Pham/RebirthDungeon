local ROT = require("game.vendor.rot")
local Grid = require("game.core.grid")
local M = {}
function M.compute(map, x, y, radius)
	local visible = {}
	local fov = ROT.FOV.Precise:new(function(_, cx, cy)
		return Grid.contains(map, cx, cy) and not map.walls[Grid.key(cx, cy)]
	end)
	fov:compute(x, y, radius, function(cx, cy, _, amount)
		if Grid.contains(map, cx, cy) then
			visible[Grid.key(cx, cy)] = amount
		end
	end)
	return visible
end
return M
