local S = require("game.model.character_skills")
local D = require("game.model.character_data")
local E = require("game.model.equipment")
local C = require("game.catalog")
local M = {}
function M.calculate(p, w)
	w = w or {}
	if w.id then
		w = E.usable_weapon(p.world or {}, w)
	end
	local level = S.level_for_experience(p.experience or 0)
	local g = level - 1
	local a = math.max(10, math.min(25, p.age or 17)) - 17
	local s = {
		life = 100 + g * 5 + a * 2,
		mana = 35 + g * 3,
		stamina = 40 + g * 3 + a,
		strength = 18 + g + a * 0.5,
		intelligence = 18 + g,
		dexterity = 18 + g,
		will = 18 + g + a * 0.5,
		luck = 16 + g * 0.5,
		level = level,
		ability_points = S.available_ap(p),
		total_experience = p.experience or 0,
	}
	s.experience = s.total_experience - 50 * level * (level - 1)
	s.next_level_experience = level * 100
	local rb = ({
		{ life = 5, will = 3 },
		{ mana = 10, intelligence = 4, dexterity = 2 },
		{
			life = 10,
			strength = 4,
			stamina = 5,
		},
	})[(p.race or p.lineage or 0) + 1] or {}
	local tb = ({
		{ life = 10, strength = 4, will = 2 },
		{ mana = 15, intelligence = 6 },
		{
			stamina = 10,
			dexterity = 4,
			luck = 4,
		},
	})[(p.talent or 0) + 1] or {}
	for k, v in pairs(rb) do
		s[k] = s[k] + v
	end
	for k, v in pairs(tb) do
		s[k] = s[k] + v
	end
	local growth = D.TALENT_GROWTH[(p.talent or 0) + 1] or {}
	if (p.talent or 0) > 2 then
		for k, v in pairs(growth) do
			s[k] = s[k] + v * 8
		end
		if p.talent == 9 then
			s.dexterity = s.dexterity + 4
			s.will = s.will + 4
		end
	end
	for k, v in pairs(growth) do
		s[k] = s[k] + v * g
	end
	s.skill_effects = {}
	s.learned_skills = {}
	for id in pairs((p.world or {}).skills or S.STARTING) do
		s.skill_effects[id] = S.effects(p.world or {}, id)
		s.learned_skills[#s.learned_skills + 1] = id
	end
	table.sort(s.learned_skills)
	local m = s.skill_effects.combat_mastery or {}
	local d = s.skill_effects.defense or {}
	s.life = s.life + (m.additional_hp_total or 0) + (d.additional_hp_total or 0)
	s.strength = s.strength + (m.additional_strength_human_total or 0)
	local effects = s.skill_effects
	local sm = effects.smash or {}
	local wm = effects.windmill or {}
	local ct = effects.counterattack or {}
	local sw = effects.sword_mastery or {}
	local cr = effects.critical_hit or {}
	s.strength = s.strength + (wm.additional_str_total or 0) + (sm.additional_str_and_will_total or 0)
	s.dexterity = s.dexterity
		+ (m.additional_dexterity_human_total or 0)
		+ (ct.additional_dexterity_total or 0)
		+ (sw.additional_dex_total or 0)
	s.will = s.will
		+ (cr.additional_will_total or 0)
		+ (wm.additional_will_total or 0)
		+ (sm.additional_str_and_will_total or 0)
	for _, k in ipairs({ "life", "mana", "stamina" }) do
		s[k] = math.min(2500, math.floor(s[k]))
	end
	for _, k in ipairs({ "strength", "intelligence", "dexterity", "will", "luck" }) do
		s[k] = math.min(1500, s[k])
	end
	local str = math.max(0, s.strength - 10)
	s.damage_min = (w.damage_min or 4) + math.floor(str / 3) + (m.additional_min_damage_human_total or 0)
	s.damage_max = (w.damage_max or 4) + math.floor(str / 2.5) + (m.additional_max_damage_human_total or 0)
	s.balance = math.min(80, 30 + 8.728944 * math.log((s.dexterity + 9.814582) / 20.34565) / math.log(2))
	s.defense = math.floor(str / 10) + (d.additional_base_defense_human_total or 0)
	s.defense = s.defense + E.equipment_defense(p.world or {})
	local armor = {}
	local armorid = (((p.world or {}).gear_inventory or {}).slots or {}).armor
	for _, category in ipairs(C.shop().categories or {}) do
		for _, item in ipairs(category.items) do
			if item.id == armorid then
				armor = item
			end
		end
	end
	if not armorid and (p.world or {}).armor_owned then
		armor = E.ARMOR
	end
	local la = {}
	if armor.armor_class == "light" and E.current(p.world or {}, armor) > 0 then
		la = effects.light_armor_mastery or {}
		s.light_armor_equipped = true
	else
		s.light_armor_equipped = false
	end
	s.defense = s.defense + (la.additional_defense or 0)
	s.protection = la.additional_protection or 0
	s.critical = math.max(0, (s.will - 10) / 10 + (s.luck - 10) / 5 + 10)
	s.critical_multiplier = 1.5
	if next(w) then
		s.balance = math.min(80, s.balance + 5)
		if (w.weapon_type or "sword") == "sword" then
			s.damage_min = s.damage_min + (sw.additional_min_damage or 0)
			s.damage_max = s.damage_max + (sw.additional_max_damage or 0)
			s.balance = math.min(80, s.balance + (sw.additional_sword_balance or 0))
		end
		s.critical = math.max(0, s.critical - 10)
	end
	s.critical_multiplier = 1 + (cr.additional_damage or 50) / 100
	s.balance = math.min(80, s.balance + (m.additional_melee_balance_total or 0))
	local intelligence = math.max(0, s.intelligence - 10)
	local will = math.max(0, s.will - 10)
	local dex = math.max(0, s.dexterity - 10)
	s.magic_attack = intelligence / 5
	s.magic_defense = math.floor(will / 10) + (la.additional_magic_defense or 0)
	s.magic_protection = math.floor(intelligence / 20) + (la.additional_magic_protection or 0)
	s.magic_balance = math.min(100, intelligence / 4 + 30)
	s.armor_pierce = math.floor(dex / 15)
	s.injury_min = (dex + will) / 20
	s.injury_max = dex / 10 + will / 5
	s.max_health = s.life
	s.health = s.life
	s.max_stamina = s.stamina
	return s
end
M.snapshot = M.calculate
function M.roll_melee(s, rng)
	if s.damage_max <= s.damage_min then
		return s.damage_min
	end
	local median = s.damage_min + (s.damage_max - s.damage_min) * s.balance / 100
	local spread = math.max(median - s.damage_min, s.damage_max - median) / 2
	local value
	if rng and rng.randfn then
		value = rng:randfn(median, spread)
	else
		local random = function()
			if rng and rng.random then
				return rng:random()
			end
			return math.random()
		end
		value = median + spread * math.sqrt(-2 * math.log(math.max(1e-12, random()))) * math.cos(2 * math.pi * random())
	end
	return math.max(s.damage_min, math.min(s.damage_max, math.floor(value + 0.5)))
end
return M
