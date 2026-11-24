local M = {}
local function normalized(v)
	local out = { master = 1, music = 1, effects = 1 }
	if type(v) == "table" then
		for k in pairs(out) do
			local n = v[k]
			if type(n) == "number" and n == n and n ~= math.huge and n ~= -math.huge then
				out[k] = math.max(0, math.min(1, n))
			end
		end
	end
	return out
end
function M.load()
	if not sys then
		return normalized()
	end
	local ok, v = pcall(sys.load, sys.get_save_file("rebirth_dungeon", "audio"))
	return normalized(ok and v or nil)
end
function M.apply(v)
	v = normalized(v)
	if sound then
		sound.set_group_gain(hash("master"), v.master)
		sound.set_group_gain(hash("music"), v.music)
		sound.set_group_gain(hash("effects"), v.effects)
	end
	return v
end
function M.save(v)
	for _, k in ipairs({ "master", "music", "effects" }) do
		if type(v[k]) ~= "number" or v[k] ~= v[k] or v[k] < 0 or v[k] > 1 then
			return false
		end
	end
	if not sys then
		return true
	end
	local ok, result = pcall(sys.save, sys.get_save_file("rebirth_dungeon", "audio"), v)
	return ok and result
end
return M
