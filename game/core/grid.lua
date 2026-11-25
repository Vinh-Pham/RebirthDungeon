local M = {}
function M.key(x, y)
	return x .. "," .. y
end
function M.contains(map, x, y)
	return x >= 0 and y >= 0 and x < map.width and y < map.height
end
return M
