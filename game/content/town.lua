-- One authored exterior; art and collision share the same cell classification.
local M = { width = 28, height = 19, interaction_radius = 3, tile_size = 48 }

---@return string region, boolean walkable
function M.cell(x, y)
	if x <= 1 or x >= M.width or y <= 1 or y >= M.height then
		return "outskirts", false
	end
	if x == 12 then
		if y >= 8 and y <= 10 then
			return "bridge", true
		end
		return "stream", false
	end
	if (x >= 5 and x <= 9 or x >= 18 and x <= 22) and (y >= 12 and y <= 14 or y >= 3 and y <= 5) then
		return "house", false
	end
	if x >= 13 and x <= 16 and y >= 7 and y <= 11 then
		return "square", true
	end
	if
		y >= 8 and y <= 10
		or x >= 13 and x <= 15 and y >= 4 and y <= 17
		or (x == 8 or x == 19) and y >= 6 and y <= 11
	then
		return "road", true
	end
	return "grass", true
end

---@return string animation, table|nil tint
function M.visual(x, y)
	local region = M.cell(x, y)
	if region == "outskirts" then
		return "town_tile_0005"
	end
	if region == "stream" then
		return "tile_0049", { 0.32, 0.58, 0.82, 1 }
	end
	if region == "bridge" then
		return "town_tile_0025", { 0.78, 0.68, 0.55, 1 }
	end
	if region == "square" then
		return "town_tile_0077"
	end
	if region == "road" then
		return "town_tile_0025"
	end
	if region == "house" then
		local left = x < 12 and 5 or 18
		local bottom = y < 8 and 3 or 12
		local edge = x == left and 0 or x == left + 4 and 2 or 1
		if y == bottom then
			return "town_tile_" .. string.format("%04d", x == left + 2 and 85 or 73)
		end
		return "town_tile_" .. string.format("%04d", (y == bottom + 2 and 52 or 64) + edge)
	end
	return "town_tile_" .. string.format("%04d", (x * 7 + y * 3) % 13 == 0 and 2 or 0)
end

return M
