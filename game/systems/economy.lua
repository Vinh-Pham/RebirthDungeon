local U = require("game.util")
local C = require("game.data.catalog")
local M = {}
local function result(ch, msg)
	return { changes = ch, message = msg }
end
function M.perform(action, w, maxhp)
	local m = U.copy(w.town_materials or {})
	local ch = {}
	local recipes = { mill = { "grain", "flour" }, spin = { "fiber", "thread" }, weave = { "thread", "cloth" } }
	local msg
	if action == "fish" then
		m.fish = (m.fish or 0) + 1
		msg = "You catch a cave fish."
	elseif action == "buy_grain" or action == "buy_fiber" then
		local k = action == "buy_grain" and "grain" or "fiber"
		local price = k == "grain" and 2 or 3
		if (w.gold or 0) < price then
			return result({}, "You need more gold.")
		end
		m[k] = (m[k] or 0) + 1
		ch.gold = w.gold - price
		msg = "Bought " .. k .. "."
	elseif recipes[action] then
		local r = recipes[action]
		if (m[r[1]] or 0) < 1 then
			return result({}, "You need " .. r[1] .. " first.")
		end
		m[r[1]] = m[r[1]] - 1
		m[r[2]] = (m[r[2]] or 0) + 1
		msg = "Made one " .. r[2] .. "."
	elseif action == "bake" or action == "cook_fish" then
		local k = action == "bake" and "flour" or "fish"
		if (m[k] or 0) < 1 then
			return result({}, "You need " .. k .. " first.")
		end
		if (w.health or -1) < 0 or w.health >= maxhp then
			return result({}, "Life is already full.")
		end
		m[k] = m[k] - 1
		ch.health = math.min(maxhp, w.health + 15)
		msg = "You prepare a meal."
	elseif action == "sell_cloth" then
		if (m.cloth or 0) < 1 then
			return result({}, "You have no cloth to sell.")
		end
		m.cloth = m.cloth - 1
		ch.gold = w.gold + 4
		msg = "Sold one cloth for 4 gold."
	else
		return result({}, "This activity is unavailable.")
	end
	for _, v in pairs(m) do
		if v > 2000000000 then
			return result({}, "You cannot carry more materials.")
		end
	end
	if ch.gold and ch.gold > 2000000000 then
		return result({}, "You cannot carry more gold.")
	end
	ch.town_materials = m
	return result(ch, msg)
end
function M.use_item(id, w, h, maxhp)
	if id ~= "tonic" then
		return result({}, "This item cannot be used.")
	end
	if (w.tonics or 0) < 1 then
		return result({}, "You have no Healing Tonics.")
	end
	if h < 0 or h >= maxhp then
		return result({}, "Life is already full.")
	end
	return result({ health = math.min(maxhp, h + 30), tonics = w.tonics - 1 }, "Healing Tonic restored Life.")
end
function M.bank(w, amount, deposit)
	if not U.integer(amount, 1, 2000000000) then
		return result({}, "Invalid amount.")
	end
	local g, b = w.gold or 0, w.bank_gold or 0
	if deposit then
		if amount > g or b + amount > 20000000 then
			return result({}, "Cannot deposit that amount.")
		end
		g = g - amount
		b = b + amount
	else
		if amount > b then
			return result({}, "Not enough bank gold.")
		end
		local inv = require("game.systems.inventory").new(w)
		if g + amount > inv:capacity("gold") then
			return result({}, "There is not enough room for that gold in your bag.")
		end
		g = g + amount
		b = b - amount
	end
	return result({ gold = g, bank_gold = b }, "Gold transferred.")
end
function M.shop_buy(profile, id)
	local w = profile.world or profile
	for _, cat in ipairs(C.shop().categories or {}) do
		for _, i in ipairs(cat.items or {}) do
			if i.id == id then
				local price = i.price or 0
				if w.gold < price then
					return result({}, "You need more gold.")
				end
				local ch = { gold = w.gold - price }
				if i.stack_key then
					local s = U.copy(w.shop_supplies or {})
					s[i.stack_key] = (s[i.stack_key] or 0) + (i.quantity or 1)
					ch.shop_supplies = s
				else
					local candidate = U.copy(w)
					candidate.gold = w.gold - price
					local inv, why = require("game.systems.inventory").new(candidate)
					if not inv then
						return result({}, why)
					end
					local ok, err = inv:take(id)
					if not ok then
						return result({}, err)
					end
					ch.gear_inventory = inv:serialize()
				end
				return result(ch, "Purchased " .. i.name .. ".")
			end
		end
	end
	return result({}, "Unknown shop item.")
end
return M
