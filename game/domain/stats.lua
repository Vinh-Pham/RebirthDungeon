local C = require("game.content.catalog")
local U = require("game.domain.util")
local I = require("game.domain.inventory")
local Skills = require("game.domain.skills")
local M = {}
function M.profile(p)
	local s = U.copy(C.base)
	for k, v in pairs(C.talents[p.talent].base) do
		s[k] = s[k] + v
	end
	for k, v in pairs(p.growth) do
		s[k] = (s[k] or 0) + v
	end
	local skill_defense, skill_melee = 0, 0
	for id in pairs(p.skills) do
		local rank = Skills.record(p, id)
		local attributes = p.race == "Giant" and rank.giant_attributes or rank.attributes
		for key, value in pairs(attributes) do
			s[key] = s[key] + value
		end
		if rank.defense then
			skill_defense = skill_defense + rank.defense[p.race]
		end
		if rank.melee then
			skill_melee = skill_melee + rank.melee[p.race]
		end
	end
	s.defense = math.floor(s.str * 0.05) + skill_defense
	s.magic_defense = math.floor(s.wil * 0.05)
	s.protection = 0
	s.magic_protection = U.round(s.int * 0.05, 2)
	local armor = I.equipped(p, "body")
	if armor then
		s.defense = s.defense + (C.items[armor.def].defense or 0)
	end
	s.category = "melee"
	s.weapon_power = 0
	local weapon = I.equipped(p, "weapon")
	if weapon then
		local d = C.items[weapon.def]
		s.category = d.category
		s.weapon_power = d.power
		s.weapon_id = weapon.id
	end
	s.melee = math.floor(s.str * 0.1) + skill_melee
	s.ranged = math.floor(s.dex * 0.1)
	s.magic = math.floor(s.int * 0.1)
	s.guns = math.floor((s.str + s.int) * 0.05)
	s.speed = 10 + math.floor(s.dex / 10)
	for _, k in ipairs({ "hp", "mp", "sp", "str", "int", "dex", "wil", "luk" }) do
		s[k] = math.floor(s[k])
	end
	return s
end
function M.current(p)
	return p.run and p.run.baseline or M.profile(p)
end
function M.restore(p)
	local s = M.current(p)
	p.pools = { hp = s.hp, mp = s.mp, sp = s.sp }
end
function M.clamp(p)
	local s = M.current(p)
	for _, k in ipairs({ "hp", "mp", "sp" }) do
		p.pools[k] = U.clamp(p.pools[k], 0, s[k])
	end
end
function M.power(p, category)
	local s = M.current(p)
	category = category or s.category
	local weapon = I.equipped(p, "weapon")
	local power = s.weapon_power
	if weapon and weapon.durability == 0 then
		power = power * 0.5
	end
	return math.max(1, (s[category] or s.melee) + power)
end
return M
