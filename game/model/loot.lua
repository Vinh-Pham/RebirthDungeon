local U = require("game.util")
local M = {}
function M.combine(a, b)
	local r = U.copy(a or {})
	for k, v in pairs(b or {}) do
		if
			v > 0
			and ({
				gold = true,
				tonic = true,
				fish = true,
				grain = true,
				flour = true,
				fiber = true,
				thread = true,
				cloth = true,
				cobweb = true,
				firewood = true,
			})[k]
		then
			r[k] = math.min(2000000000, (r[k] or 0) + v)
		end
	end
	return r
end
function M.roll(enemies, rng)
	local d = {}
	local function range(a, b)
		if rng.range then
			return rng:range(a, b)
		end
		return math.random(a, b)
	end
	for _, e in ipairs(enemies) do
		if (e.name or ""):lower():find("spider") then
			local n = range(0, 3)
			if n > 0 then
				d.cobweb = (d.cobweb or 0) + n
			end
		end
		if range(0, 2) == 0 then
			d.gold = (d.gold or 0) + range(1, 6)
		end
	end
	return d
end
function M.collect(w, ids, cobcap, goldcap)
	local selected = {}
	for _, id in ipairs(ids) do
		selected[id] = true
	end
	local p = U.copy(w.pending_loot or {})
	local m = U.copy(w.town_materials or {})
	local ch = {}
	for id, n in pairs(p) do
		if selected[id] then
			if id == "gold" then
				local accepted = math.max(0, math.min(n, (goldcap or 2000000000) - (w.gold or 0)))
				if accepted > 0 then
					ch.gold = (w.gold or 0) + accepted
					p[id] = n > accepted and n - accepted or nil
				end
			elseif id == "tonic" then
				if n <= 2000000000 - (w.tonics or 0) then
					ch.tonics = (w.tonics or 0) + n
					p[id] = nil
				end
			elseif m[id] ~= nil then
				local cap = id == "cobweb" and (cobcap or 5544) or 2000000000
				if (m[id] or 0) + n <= cap then
					m[id] = (m[id] or 0) + n
					ch.town_materials = m
					p[id] = nil
				end
			end
		end
	end
	if next(ch) then
		ch.pending_loot = p
	end
	return ch
end
return M
