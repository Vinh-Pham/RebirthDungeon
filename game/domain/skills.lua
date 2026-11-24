local Content = require("game.content.skills")
local U = require("game.domain.util")
local Equipment = require("game.domain.combat_equipment")
local M = {}

---@param p table Character candidate
---@param id string Stable skill ID
---@return boolean learned False means already known; existing progress is untouched.
function M.learn(p, id)
	U.require_ok(p.phase == "town" and not p.run, "Learn skills in town, outside a run")
	local d = Content.definitions[id]
	U.require_ok(d and d.hero and d.ranks, "This skill cannot be learned")
	U.require_ok(not (d.no_giant and p.race == "Giant"), "Giants cannot learn this skill")
	U.require_ok(not (d.no_elf and p.race == "Elf"), "Elves cannot learn this skill")
	if p.skills[id] then
		return false
	end
	p.skills[id] = { rank = 0, training = 0, objectives = {}, legacy_training = 0 }
	return true
end

---@return boolean, string|nil
function M.can_learn(p, id)
	local d = Content.definitions[id]
	if not d or not d.lesson then
		return false, "No introductory lesson available"
	end
	if p.skills[id] then
		return false, "Already learned"
	end
	if p.phase ~= "town" or p.run then
		return false, "Learn skills in town, outside a run"
	end
	if d.no_elf and p.race == "Elf" then
		return false, "Elves cannot learn this skill"
	end
	return true
end

---@return table<string, integer> ranks Independent frozen rank map for a new run.
function M.freeze(p)
	local ranks = {}
	for id, record in pairs(p.skills) do
		ranks[id] = record.rank
	end
	return ranks
end

function M.rank(p, id)
	id = Content.definitions[id] and Content.definitions[id].progression or id
	if p.run and p.run.skill_ranks then
		return p.run.skill_ranks[id]
	end
	return p.skills[id] and p.skills[id].rank
end

function M.record(p, id)
	local rank = M.rank(p, id)
	local d = Content.definitions[id]
	return rank ~= nil and d and d.ranks and d.ranks[rank + 1] or nil
end

---Rules-v1 had aggregate training only and no rank-up commands. Preserve that earned
---amount as explicit legacy credit; no objective completions or new ranks are invented.
function M.migrate(p)
	if p.rules_version ~= 1 then
		return p
	end
	for _, record in pairs(p.skills) do
		record.legacy_training = record.training
		record.objectives = {}
	end
	if p.run then
		p.run.skill_ranks = M.freeze(p)
	end
	p.rules_version = 2
	return p
end

local function qualifies(p, id, objective, outcome)
	if objective.event == "normal_damage" then
		return outcome.skill == "normal" and outcome.damage > 0
	end
	if objective.event == "skill_damage" then
		return outcome.skill == id and outcome.damage > 0
	end
	if objective.event == "guard_use" then
		return outcome.skill == "defense" and outcome.hero_action
	end
	if objective.event == "guard_block" then
		return outcome.guarded and outcome.damage == 0 and not outcome.counter_negated
	end
	if objective.event == "counter_damage" then
		return outcome.counter and outcome.damage > 0
	end
	if objective.event == "critical_damage" then
		return outcome.critical and outcome.damage > 0
	end
	if objective.event == "weapon_damage" then
		return outcome.hero_action
			and outcome.category == "melee"
			and outcome.damage > 0
			and Equipment.matches(p, Content.definitions[id].requires_equipment)
	end
	if objective.event == "shield_block" then
		return outcome.guarded
			and outcome.damage == 0
			and not outcome.counter_negated
			and Equipment.matches(p, "shield")
	end
	if objective.event == "skill_defeat" then
		return outcome.skill == id and (outcome.defeats or 0) > 0
	end
	return false
end

---@param p table Copied candidate. Call once with the resolved whole action, not per hit.
---@param outcome table Authoritative action ID, skill, damage, hero_action/guarded flags.
function M.train(p, outcome)
	U.require_ok(type(outcome.id) == "string" and #outcome.id > 0, "Training requires a resolved action identity")
	for id, learned in pairs(p.skills) do
		local rank = M.record(p, id)
		if rank and learned.last_training_action ~= outcome.id then
			for _, objective in ipairs(rank.objectives) do
				local count = learned.objectives[objective.id] or 0
				if
					count < objective.limit
					and qualifies(p, id, objective, outcome)
					and (
						outcome.hero_action
						or objective.event == "guard_block"
						or objective.event == "shield_block"
						or objective.event == "counter_damage"
					)
				then
					local credits =
						math.min(objective.limit - count, objective.event == "skill_defeat" and outcome.defeats or 1)
					learned.objectives[objective.id] = count + credits
					learned.training = math.min(100, learned.training + objective.points * credits)
				end
			end
			learned.last_training_action = outcome.id
		end
	end
end

---@return boolean, string|nil, integer|nil
function M.can_advance(p, id)
	local learned = p.skills[id]
	if not learned then
		return false, "Learn the skill first"
	end
	if learned.rank == #Content.ranks - 1 then
		return false, "Rank 1 is the maximum"
	end
	if p.phase ~= "town" or p.run then
		return false, "Advance in town, outside a run"
	end
	local next_rank = Content.definitions[id].ranks[learned.rank + 2]
	if not next_rank then
		return false, "Higher ranks are not available in this release"
	end
	if learned.training < 100 then
		return false, "Earn 100 training points first"
	end
	local cost = next_rank.ap[p.race]
	if p.ap < cost then
		return false, "Not enough AP", cost
	end
	return true, nil, cost
end

function M.advance(p, id, expected_rank)
	local ok, reason, cost = M.can_advance(p, id)
	U.require_ok(ok, reason)
	U.require_ok(p.skills[id].rank == expected_rank, "Skill rank changed; try again")
	p.ap = p.ap - cost
	p.skills[id] = { rank = expected_rank + 1, training = 0, objectives = {}, legacy_training = 0 }
end

---Validate authored starter data before character data or battle resolution uses it.
function M.validate_content(definitions)
	local defs = definitions or Content.definitions
	for id, d in pairs(defs) do
		U.require_ok(type(id) == "string" and type(d.name) == "string", "Invalid skill identity")
		U.require_ok(
			d.kind == "attack" or d.kind == "guard" or d.kind == "counter" or d.kind == "passive",
			"Unsupported skill effect"
		)
		if d.kind ~= "passive" then
			U.require_ok((d.pool == "sp" or d.pool == "mp") and U.finite(d.cost) and d.cost >= 0, "Invalid skill cost")
			U.require_ok(U.integer(d.cooldown, 0, 1000), "Invalid skill cooldown")
		end
		U.require_ok(
			d.category == nil or U.contains({ "melee", "ranged", "magic", "guns" }, d.category),
			"Invalid equipment category"
		)
		U.require_ok(d.status == nil or d.status == "poison" or d.status == "armor_break", "Unsupported status effect")
		U.require_ok(
			d.target_rule == nil or U.contains({ "all_living_hostiles", "single_downed_hostile" }, d.target_rule),
			"Unsupported target rule"
		)
		U.require_ok(
			d.requires_equipment == nil
				or U.contains({ "sword", "axe", "shield", "paired_swords" }, d.requires_equipment),
			"Unsupported equipment requirement"
		)
		for _, key in ipairs({ "bypass_guard", "bypass_counter", "knockdown" }) do
			U.require_ok(d[key] == nil or type(d[key]) == "boolean" and d.kind == "attack", "Invalid attack flag")
		end
		for _, key in ipairs({ "two_handed_multiplier", "two_handed_critical" }) do
			U.require_ok(
				d[key] == nil
					or d.kind == "attack"
						and U.finite(d[key])
						and d[key] > 0
						and d[key] <= (key == "two_handed_critical" and 1 or 10),
				"Invalid two-handed effect"
			)
		end
		if d.giant_multiplier then
			U.require_ok(U.finite(d.giant_multiplier) and d.giant_multiplier > 0, "Invalid racial multiplier")
		end
		if d.kind == "attack" then
			U.require_ok(
				U.finite(d.multiplier) and d.multiplier > 0 and U.integer(d.hits, 1, 5),
				"Invalid attack effect"
			)
			U.require_ok(d.base == nil or U.finite(d.base) and d.base >= 0, "Invalid base damage")
		end
		if d.shield_absorption then
			U.require_ok(d.kind == "guard", "Shield absorption requires a guard")
			for _, size in ipairs({ "small", "medium", "large" }) do
				local value = d.shield_absorption[size]
				U.require_ok(U.finite(value) and value >= 0 and value <= 1, "Invalid shield absorption")
			end
		end
		if d.progression then
			U.require_ok(defs[d.progression] and defs[d.progression].hero, "Missing progression skill")
		end
		if d.hero then
			U.require_ok(d.group == "Combat" or d.group == "Magic" or d.group == "Life", "Invalid skill category")
			U.require_ok(type(d.ranks) == "table" and #d.ranks >= 1 and #d.ranks <= 15, "Missing skill rank records")
			for index, rank in ipairs(d.ranks) do
				if d.kind == "counter" then
					U.require_ok(rank.enemy_share == 0.5 and rank.self_share == 1, "Invalid counter shares")
				end
				for _, key in ipairs({ "weapon_melee", "critical_chance", "critical_bonus", "critical_add" }) do
					U.require_ok(
						rank[key] == nil
							or U.finite(rank[key])
								and rank[key] >= 0
								and rank[key] <= (key == "weapon_melee" and 1000 or 1),
						"Invalid passive effect"
					)
				end
				if rank.shield then
					U.require_ok(d.requires_equipment == "shield", "Missing shield requirement")
					for _, size in ipairs({ "small", "medium", "large" }) do
						local row = rank.shield[size]
						U.require_ok(
							row
								and U.finite(row.defense)
								and row.defense >= 0
								and U.finite(row.protection)
								and row.protection >= 0
								and row.protection <= 100,
							"Invalid shield row"
						)
					end
				end
				U.require_ok(type(rank.attributes) == "table", "Missing cumulative skill attributes")
				for key, value in pairs(rank.giant_attributes or {}) do
					U.require_ok(
						U.contains({ "hp", "mp", "sp", "str", "int", "dex", "wil", "luk" }, key)
							and U.finite(value)
							and value >= 0,
						"Invalid racial attribute"
					)
				end
				for key, value in pairs(rank.attributes) do
					U.require_ok(
						U.contains({ "hp", "mp", "sp", "str", "int", "dex", "wil", "luk" }, key)
							and U.finite(value)
							and value >= 0,
						"Invalid skill attribute"
					)
				end
				for _, key in ipairs({ "defense", "melee", "guard_defense", "guard_protection" }) do
					if rank[key] then
						for _, race in ipairs({ "Human", "Elf", "Giant" }) do
							U.require_ok(
								U.finite(rank[key][race]) and rank[key][race] >= 0,
								"Invalid racial skill effect"
							)
						end
					end
				end
				local total, seen = 0, {}
				for _, objective in ipairs(rank.objectives) do
					U.require_ok(
						type(objective.id) == "string" and not seen[objective.id],
						"Duplicate training objective"
					)
					U.require_ok(
						U.contains({
							"normal_damage",
							"skill_damage",
							"guard_use",
							"guard_block",
							"counter_damage",
							"critical_damage",
							"weapon_damage",
							"shield_block",
							"skill_defeat",
						}, objective.event),
						"Unsupported training objective"
					)
					U.require_ok(
						U.finite(objective.points)
							and objective.points > 0
							and objective.points <= 100
							and U.integer(objective.limit, 1, 10000),
						"Invalid training objective"
					)
					U.require_ok(
						objective.event ~= "skill_damage" or d.kind == "attack",
						"Unreachable damage objective"
					)
					U.require_ok(
						(objective.event ~= "guard_use" and objective.event ~= "guard_block") or d.kind == "guard",
						"Unreachable guard objective"
					)
					seen[objective.id] = true
					total = total + objective.points * objective.limit
				end
				U.require_ok(index == 15 or total >= 100, "Unreachable training rank")
				if index > 1 then
					for _, race in ipairs({ "Human", "Elf", "Giant" }) do
						U.require_ok(rank.ap and U.integer(rank.ap[race], 0, 1000000), "Missing next-rank AP cost")
					end
				end
			end
		end
	end
	return true
end

function M.validate_profile(p)
	for id, learned in pairs(p.skills) do
		local d = Content.definitions[id]
		U.require_ok(d and d.hero and U.integer(learned.rank, 0, #d.ranks - 1), "Invalid learned skill/rank")
		U.require_ok(
			not (d.no_giant and p.race == "Giant") and not (d.no_elf and p.race == "Elf"),
			"Invalid racial skill"
		)
		U.require_ok(
			U.finite(learned.training) and learned.training >= 0 and learned.training <= 100,
			"Invalid skill training"
		)
		if p.rules_version == 2 then
			U.require_ok(
				type(learned.objectives) == "table"
					and U.finite(learned.legacy_training)
					and learned.legacy_training >= 0
					and learned.legacy_training <= 100,
				"Invalid training record"
			)
			local total, known = learned.legacy_training, {}
			for _, objective in ipairs(d.ranks[learned.rank + 1].objectives) do
				known[objective.id] = true
				local count = learned.objectives[objective.id] or 0
				U.require_ok(U.integer(count, 0, objective.limit), "Training objective overflow")
				total = total + count * objective.points
			end
			for key in pairs(learned.objectives) do
				U.require_ok(known[key], "Unknown training objective")
			end
			U.require_ok(learned.training == math.min(100, total), "Training total does not match objectives")
			U.require_ok(
				learned.last_training_action == nil or type(learned.last_training_action) == "string",
				"Invalid training action"
			)
		end
	end
	if p.run and p.rules_version == 2 then
		U.require_ok(type(p.run.skill_ranks) == "table", "Missing frozen skill ranks")
		for id, rank in pairs(p.run.skill_ranks) do
			U.require_ok(p.skills[id] and p.skills[id].rank == rank, "Frozen rank differs from owned rank")
		end
		for id in pairs(p.skills) do
			U.require_ok(p.run.skill_ranks[id] ~= nil, "Missing frozen skill")
		end
	end
	return true
end

M.validate_content()
return M
