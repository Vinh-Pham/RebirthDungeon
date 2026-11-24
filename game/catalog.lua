local M = {}
local cache = {}
local skills = {
	"combat_mastery",
	"defense",
	"counterattack",
	"critical_hit",
	"dual_wield_mastery",
	"light_armor_mastery",
	"heavy_armor_mastery",
	"sword_mastery",
	"windmill",
	"shield_mastery",
	"smash",
}

function M.load(name)
	if cache[name] then
		return cache[name]
	end
	assert(type(name) == "string" and not name:find("..", 1, true), "Invalid catalog name")
	local text
	if sys and sys.load_resource then
		local err
		text, err = sys.load_resource("/game/data/" .. name .. ".json")
		assert(text, err)
	else
		local file = assert(io.open("game/data/" .. name .. ".json", "rb"))
		text = file:read("*a")
		file:close()
	end
	local decoder = json or require("game.json")
	cache[name] = assert(decoder.decode(text), "Invalid JSON catalog: " .. name)
	return cache[name]
end
function M.skills()
	if cache._skills then
		return cache._skills
	end
	local out = {}
	for _, id in ipairs(skills) do
		out[id] = M.load("skills/" .. id)
	end
	cache._skills = out
	return out
end
function M.swords()
	return M.load("swords")
end
function M.shop()
	return M.load("blacksmith_shop")
end
function M.spiders()
	return M.load("spiders")
end
function M.items()
	if cache._items then
		return cache._items
	end
	local out = {}
	for _, item in ipairs(M.swords()) do
		out[item.id] = item
	end
	for _, category in ipairs(M.shop().categories) do
		for _, item in ipairs(category.items) do
			out[item.id] = item
		end
	end
	cache._items = out
	return out
end
return M
