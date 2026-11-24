local U = require("game.util")
local C = require("game.catalog")
local M =
	{ STARTING = { combat_mastery = { rank = "novice", training = {} }, defense = { rank = "novice", training = {} } } }
function M.catalog()
	return C.skills()
end
function M.rank_data(id, rank)
	for _, r in ipairs((M.catalog()[id] or {}).ranks or {}) do
		if r.rank == rank then
			return r
		end
	end
	return {}
end
function M.effects(world, id)
	local r = M.rank_data(id, ((world.skills or M.STARTING)[id] or {}).rank)
	return r.game_effects or r.effects or {}
end
function M.level_for_experience(x)
	return math.max(1, math.floor((1 + math.sqrt(1 + math.max(0, x or 0) * 0.08)) / 2))
end
function M.available_ap(p)
	return math.max(0, M.level_for_experience(p.experience) - 1 - ((p.world or {}).spent_ap or 0))
end
function M.normalize(v)
	if type(v) ~= "table" then
		return nil
	end
	local n = U.copy(M.STARTING)
	for id, s in pairs(v) do
		if
			type(s) ~= "table"
			or (s.training ~= nil and type(s.training) ~= "table")
			or not M.rank_data(id, s.rank).rank
		then
			return nil
		end
		n[id] = { rank = s.rank, training = {} }
		for _, task in ipairs(M.rank_data(id, s.rank).game_training or M.rank_data(id, s.rank).training or {}) do
			local v = (s.training or {})[task.id]
			if v ~= nil then
				if not U.integer(v, 0) then
					return nil
				end
				n[id].training[task.id] = math.min(v, task.limit)
			end
		end
	end
	return n
end
function M.record(world, event, count)
	local n = U.copy(world.skills or M.STARTING)
	for id, s in pairs(n) do
		local r = M.rank_data(id, s.rank)
		for _, task in ipairs(r.game_training or r.training or {}) do
			if task.id == event then
				s.training[task.id] = math.min(task.limit or 999, (s.training[task.id] or 0) + (count or 1))
			end
		end
	end
	return { skills = n }
end
function M.train(world, events)
	local n = U.copy(world)
	for _, event in ipairs(events) do
		n.skills = M.record(n, event, 1).skills
	end
	return n.skills
end
function M.advance(p, id)
	local skill = M.catalog()[id]
	local s = p.world.skills[id]
	if not skill or not s then
		return { message = "Unknown skill." }
	end
	local r = M.rank_data(id, s.rank)
	if (r.game_training_required or r.training_required or 0) <= 0 then
		return { message = "No further rank is available." }
	end
	local points = 0
	for _, task in ipairs(r.game_training or r.training or {}) do
		points = points + (task.points or 0) * (s.training[task.id] or 0)
	end
	if points + 0.00001 < (r.game_training_required or r.training_required or 0) then
		return { message = "More training required." }
	end
	for i, entry in ipairs(skill.ranks) do
		if entry.rank == s.rank then
			local next = skill.ranks[i + 1]
			if not next or next.rank:find("dan_") then
				break
			end
			local cost = next.ap_cost
			if cost == nil or cost < 0 then
				return { message = "No further rank is available." }
			end
			if M.available_ap(p) < cost then
				return { message = "You need more AP." }
			end
			local states = U.copy(p.world.skills)
			states[id] = { rank = next.rank, training = {} }
			return {
				changes = { skills = states, spent_ap = (p.world.spent_ap or 0) + cost },
				message = "Advanced " .. skill.name .. " to " .. next.rank,
			}
		end
	end
	return { message = "Maximum rank." }
end
function M.learn(p, id)
	local skill = M.catalog()[id]
	if not skill or p.world.skills[id] then
		return { message = "Skill unavailable." }
	end
	if id == "critical_hit" and p.world.skills.combat_mastery.rank == "novice" then
		return { message = "Reach Combat Mastery rank F first." }
	end
	local r = skill.ranks[1]
	local cost = r.ap_cost or 0
	if M.level_for_experience(p.experience) < 2 or M.available_ap(p) < cost or skill.game_available == false then
		return { message = "Requirements not met." }
	end
	local states = U.copy(p.world.skills)
	states[id] = { rank = r.rank, training = {} }
	return { changes = { skills = states, spent_ap = p.world.spent_ap + cost }, message = "Learned " .. skill.name }
end
function M.study(world, id)
	local states = U.copy(world.skills)
	local s = states[id]
	if not s then
		return { message = "Unknown skill." }
	end
	for _, task in ipairs(M.rank_data(id, s.rank).game_training or M.rank_data(id, s.rank).training or {}) do
		if task.id == "study_skill" and (s.training.study_skill or 0) < task.limit then
			s.training.study_skill = task.limit
			return { changes = { skills = states }, message = "Lesson complete." }
		end
	end
	return { message = "No lesson available." }
end
local labels = {
	["additional_hp_total"] = "Life",
	["additional_strength_human_total"] = "Strength",
	["additional_dexterity_human_total"] = "Dexterity",
	["additional_dexterity_total"] = "Dexterity",
	["additional_dex_total"] = "Dexterity",
	["additional_will_total"] = "Will",
	["additional_str_total"] = "Strength",
	["additional_str_and_will_total"] = "Strength and Will",
	["additional_min_damage_human_total"] = "Minimum damage",
	["additional_max_damage_human_total"] = "Maximum damage",
	["additional_min_damage"] = "Minimum sword damage",
	["additional_max_damage"] = "Maximum sword damage",
	["additional_melee_balance_total"] = "Melee balance %",
	["additional_sword_balance"] = "Sword balance %",
	["additional_damage"] = "Bonus critical damage %",
	["additional_base_defense_human_total"] = "Passive defense",
	["defense_bonus_human_elf"] = "Guard defense",
	["protection_bonus_human_elf"] = "Guard protection %",
	["damage_human_elf"] = "Damage %",
	["human_giant_damage"] = "Damage %",
	["damage_from_self_human_elf"] = "Own damage %",
	["damage_from_opponent_human_giant"] = "Enemy damage %",
	["additional_defense"] = "Defense",
	["additional_protection"] = "Protection %",
	["additional_magic_defense"] = "Magic defense",
	["additional_magic_protection"] = "Magic protection",
	["stamina_use"] = "Stamina cost",
}
local function display_effects(world, id)
	local out = {}
	for k, v in pairs(M.effects(world, id)) do
		if labels[k] and type(v) == "number" and v ~= 0 then
			out[labels[k]] = v
		end
	end
	if id == "defense" then
		out["Stamina cost"] = nil
	end
	return out
end
function M.entries(p, in_school)
	local rows = {}
	local states = p.world.skills or M.STARTING
	local ids = {
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
	for _, id in ipairs(ids) do
		local skill = M.catalog()[id]
		local state = states[id]
		if skill and (state or in_school) then
			local r = M.rank_data(id, state and state.rank)
			local next_rank = {}
			for i, v in ipairs(skill.ranks) do
				if v.rank == r.rank then
					local following = skill.ranks[i + 1]
					if following and not following.rank:find("dan_") then
						next_rank = following
					end
				end
			end
			local tasks, points, study = {}, 0, false
			for _, task in ipairs(r.game_training or r.training or {}) do
				local count = state and (state.training[task.id] or 0) or 0
				tasks[#tasks + 1] =
					{ description = task.description, target = task.limit, count = count, points = task.points }
				points = points + count * task.points
				if task.id == "study_skill" and count < task.limit then
					study = true
				end
			end
			local threshold = r.game_training_required or r.training_required or 0
			local cost = next_rank.ap_cost or -1
			local lc = skill.ranks[1].ap_cost or -1
			local locked = ""
			if skill.game_available == false then
				locked = skill.game_note or "Unavailable"
			elseif M.level_for_experience(p.experience) < 2 then
				locked = "New skills are available at level 2."
			elseif id == "critical_hit" and states.combat_mastery.rank == "novice" then
				locked = "Reach Combat Mastery rank F first."
			elseif lc < 0 or M.available_ap(p) < lc then
				locked = "You need more AP to learn this skill."
			end
			rows[#rows + 1] = {
				id = id,
				name = skill.name,
				kind = skill.kind,
				description = skill.description,
				learned = state ~= nil,
				rank = r.rank == "novice" and "Novice" or r.rank or "",
				training = tasks,
				training_points = points,
				training_required = threshold,
				next_rank = next_rank.rank or "",
				ap_cost = math.max(0, cost),
				can_advance = cost >= 0
					and threshold > 0
					and points + 0.00001 >= threshold
					and M.available_ap(p) >= cost,
				can_learn = in_school and not state and locked == "",
				locked_reason = skill.game_note or locked,
				learn_cost = math.max(0, lc),
				can_study = in_school and study,
				effects = display_effects(p.world, id),
			}
		end
	end
	return rows
end
return M
