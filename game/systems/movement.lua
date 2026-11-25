-- One movement tick per successful player step; four-way breadth-first pursuit.
local M = {}
local directions = { { 0, -1 }, { 1, 0 }, { 0, 1 }, { -1, 0 } }
local function key(x, y)
	return x .. "," .. y
end
function M.step(enemies, player, floor, blocked, rng)
	blocked = blocked or {}
	local distances = { [key(player.x, player.y)] = 0 }
	local q = { { x = player.x, y = player.y } }
	local cursor = 1
	while q[cursor] do
		local p = q[cursor]
		cursor = cursor + 1
		local distance = distances[key(p.x, p.y)]
		if distance < 6 then
			for _, d in ipairs(directions) do
				local x, y = p.x + d[1], p.y + d[2]
				local k = key(x, y)
				if floor[k] and (not blocked[k] or (x == player.x and y == player.y)) and distances[k] == nil then
					distances[k] = distance + 1
					q[#q + 1] = { x = x, y = y }
				end
			end
		end
	end
	local occupied = {}
	for _, p in ipairs(enemies) do
		occupied[key(p.x, p.y)] = true
	end
	local contact
	for i, p in ipairs(enemies) do
		local candidates = {}
		local best = {}
		local distance = distances[key(p.x, p.y)]
		for _, d in ipairs(directions) do
			local x, y = p.x + d[1], p.y + d[2]
			local k = key(x, y)
			if floor[k] and (not blocked[k] or (x == player.x and y == player.y)) and not occupied[k] then
				local c = { x = x, y = y }
				candidates[#candidates + 1] = c
				if distance and distances[k] and distances[k] < distance then
					best[#best + 1] = c
				end
			end
		end
		local choices = distance and best or candidates
		local dest = #choices > 0 and choices[rng:range(1, #choices)] or p
		if dest.x == player.x and dest.y == player.y then
			contact = contact or i
		else
			occupied[key(p.x, p.y)] = nil
			occupied[key(dest.x, dest.y)] = true
			p.x, p.y = dest.x, dest.y
		end
	end
	return contact
end
return M
