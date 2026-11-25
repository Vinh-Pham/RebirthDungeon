local U = require("game.util")
local M = {}

local function result(ch, msg)
	return { changes = ch, message = msg }
end

function M.tree_status(w, key, now)
	local st = (w.tree_harvests or {})[key] or {}
	local count = st.count or 5
	local next_at = st.next_at or 0
	if count < 5 and now >= next_at then
		local intervals = 1 + math.floor((now - next_at) / 300)
		count = math.min(5, count + intervals)
		next_at = next_at + intervals * 300
	end
	if count == 5 then
		next_at = 0
	end
	return { count = count, next_at = next_at, seconds_until_next = math.max(0, next_at - now) }
end
function M.harvest(w, key, now)
	now = now or os.time()
	local st = M.tree_status(w, key, now)
	if st.count <= 0 then
		return result({}, "This tree is regrowing.")
	end
	local m = U.copy(w.town_materials or {})
	if (m.firewood or 0) >= 2000000000 then
		return result({}, "You cannot carry more firewood.")
	end
	m.firewood = (m.firewood or 0) + 1
	local trees = U.copy(w.tree_harvests or {})
	trees[key] = { count = st.count - 1, next_at = st.next_at == 0 and now + 300 or st.next_at }
	return result({ town_materials = m, tree_harvests = trees }, "Collected 1 Firewood.")
end
return M
