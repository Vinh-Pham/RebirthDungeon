local U = require("game.util")
local C = require("game.catalog")
local M = { ATTACK_WEAR = 25, SMASH_WEAR = 30, ARMOR_WEAR = 25, REPAIR_PRICE = 2 }
M.ARMOR = { id = "riveted_jack", name = "Riveted Jack", defense = 2, max_durability = 15000, armor_class = "light" }
function M.maximum(i)
	if not i or not i.id then
		return 0
	end
	return i.max_durability or ({ light = 10000, rapier = 9000, heavy = 15000, piercing = 12000 })[i.family] or 10000
end
function M.current(w, i)
	return U.clamp((w.equipment_durability or {})[i.id or ""] or M.maximum(i), 0, M.maximum(i))
end
local function protection(w)
	local defs = {}
	for _, c in ipairs(C.shop().categories or {}) do
		for _, i in ipairs(c.items) do
			defs[i.id] = i
		end
	end
	local r = {}
	for _, id in pairs((w.gear_inventory or {}).slots or {}) do
		if defs[id] and defs[id].defense then
			r[#r + 1] = defs[id]
		end
	end
	if not ((w.gear_inventory or {}).slots or {}).armor and w.armor_owned then
		r[1] = M.ARMOR
	end
	return r
end
function M.equipment_defense(w)
	local n = 0
	for _, i in ipairs(protection(w)) do
		if M.current(w, i) > 0 then
			n = n + i.defense
		end
	end
	return n
end
function M.equipped_armor(w)
	local id = ((w.gear_inventory or {}).slots or {}).armor
	if id and id ~= "" then
		for _, cat in ipairs(C.shop().categories or {}) do
			for _, i in ipairs(cat.items) do
				if i.id == id then
					return i
				end
			end
		end
		return {}
	end
	return w.armor_owned and M.ARMOR or {}
end
function M.armor_defense(w)
	local armor = M.equipped_armor(w)
	return M.current(w, armor) > 0 and (armor.defense or 0) or 0
end
function M.usable_weapon(w, i)
	return M.current(w, i) > 0 and i or {}
end
function M.wear(w, weapon, wear, hit)
	local d = U.copy(w.equipment_durability or {})
	if weapon and weapon.id and wear > 0 then
		d[weapon.id] = math.max(0, M.current(w, weapon) - wear)
	end
	if hit then
		for _, i in ipairs(protection(w)) do
			d[i.id] = math.max(0, M.current(w, i) - 25)
		end
	end
	return d
end
function M.repair_cost(w, i, full)
	local n = M.maximum(i) - M.current(w, i)
	return math.ceil((full and n or math.min(1000, n)) / 1000) * 2
end
function M.repair(w, i, full)
	local missing = M.maximum(i) - M.current(w, i)
	local cost = M.repair_cost(w, i, full)
	if missing <= 0 or (w.gold or 0) < cost then
		return {}
	end
	local d = U.copy(w.equipment_durability or {})
	d[i.id] = M.current(w, i) + (full and missing or math.min(1000, missing))
	return { gold = w.gold - cost, equipment_durability = d }
end
return M
