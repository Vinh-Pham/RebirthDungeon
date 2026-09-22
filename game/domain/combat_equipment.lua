local C = require("game.content.catalog")
local M = {}

---@return table|nil
function M.equipped(p, slot)
	for _, item in ipairs(p.items) do
		if item.slot == slot then
			return item
		end
	end
end

---@param p table Character with town equipment or frozen run equipment.
---@return table
function M.describe(p)
	local main, off = M.equipped(p, "weapon"), M.equipped(p, "hand_left")
	local weapon, other = main and C.items[main.def], off and C.items[off.def]
	return {
		main = main,
		off = off,
		sword = weapon and weapon.weapon_type == "sword" or other and other.weapon_type == "sword" or false,
		axe = weapon and weapon.weapon_type == "axe" or false,
		paired_swords = p.race ~= "Elf"
				and main ~= nil
				and off ~= nil
				and main.id ~= off.id
				and weapon.weapon_type == "sword"
				and not weapon.two_handed
				and other.weapon_type == "sword"
			or false,
		shield = other and other.shield_size or false,
		two_handed = weapon and weapon.two_handed or false,
	}
end

---@return boolean
function M.matches(p, requirement)
	return not requirement or not not M.describe(p)[requirement]
end

---@return boolean, string|nil
function M.valid(p)
	local main, off = M.equipped(p, "weapon"), M.equipped(p, "hand_left")
	if not off then
		return true
	end
	local d = main and C.items[main.def]
	local o = C.items[off.def]
	if d and d.two_handed then
		return false, "Two-handed weapons require a free left hand"
	end
	if o.weapon_type == "sword" and not M.describe(p).paired_swords then
		return false, "Paired swords require two distinct one-handed swords and a Human or Giant"
	end
	return true
end
return M
