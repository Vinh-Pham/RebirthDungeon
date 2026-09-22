local Content = require("game.content.skills")
local Skills = require("game.domain.skills")
local Battle = require("game.domain.battle")
local U = require("game.domain.util")
local M = {}
local PAGE_SIZE = 4

local function active_action(p, id, target_id)
	local d = Content.definitions[id]
	if d.kind == "passive" then
		return false, "Passive: applies automatically when learned"
	end
	if p.phase ~= "battle" then
		return false, "Use during your selection turn in battle"
	end
	local b, actor = p.battle, Battle.active(p)
	if not b.started or not actor.hero then
		return false, "Wait for your initialized selection turn"
	end
	if Skills.rank(p, id) == nil then
		return false, "Skill not learned"
	end
	local ok, reason = Battle.eligible(p, actor, id)
	if not ok then
		return false, reason
	end
	local target
	if d.target == "hostile" then
		for _, enemy in ipairs(b.enemies) do
			if enemy.pools.hp > 0 and (not target or enemy.id == target_id) then
				target = enemy
			end
		end
		if not target then
			return false, "Choose a living hostile target"
		end
	end
	local target_ok, target_reason = Battle.eligible(p, actor, id, target)
	if not target_ok then
		return false, target_reason
	end
	return true,
		"",
		{
			type = "act",
			battle = b.id,
			actor = p.id,
			turn = b.turn,
			skill = id,
			target = target and target.id or p.id,
			revision = p.revision,
			profile = p.id,
		},
		d.target_rule == "all_living_hostiles" and "All living enemies" or target and target.name or p.name
end

local function bonuses(p, rank)
	local entries = {}
	local attributes = p.race == "Giant" and rank.giant_attributes or rank.attributes
	for _, key in ipairs(U.keys(attributes)) do
		entries[#entries + 1] = key:upper() .. " +" .. attributes[key]
	end
	if rank.defense then
		entries[#entries + 1] = "Defense +" .. rank.defense[p.race]
	end
	if rank.melee then
		entries[#entries + 1] = "Melee only +" .. rank.melee[p.race]
	end
	if rank.guard_defense then
		entries[#entries + 1] = "Guard +"
			.. rank.guard_defense[p.race]
			.. " Defense / +"
			.. rank.guard_protection[p.race]
			.. "% Protection"
	end
	return #entries > 0 and table.concat(entries, " · ") or "No passive attribute bonus"
end

---@return table Read-only skill journal model; no learning or training occurs here.
function M.model(p, request, locked)
	local group = U.contains({ "All", "Life", "Combat", "Magic" }, request.group) and request.group or "All"
	local ids = {}
	for _, id in ipairs(Content.order) do
		local d = Content.definitions[id]
		if (id == "normal" or p.skills[id] or d.lesson) and (group == "All" or group == d.group) then
			ids[#ids + 1] = id
		end
	end
	local pages = math.max(1, math.ceil(#ids / PAGE_SIZE))
	local page = U.integer(request.page, 1, pages) and request.page or 1
	local model = {
		header = {
			profile = p.id,
			group = group,
			page = page,
			pages = pages,
			ap = p.ap,
			revision = p.revision,
			frozen = p.run ~= nil,
		},
		rows = {},
		objectives = {},
	}
	for index = (page - 1) * PAGE_SIZE + 1, math.min(#ids, page * PAGE_SIZE) do
		local id = ids[index]
		local d = Content.definitions[id]
		local learned = p.skills[d.progression or id]
		model.rows[#model.rows + 1] = {
			id = id,
			name = d.name,
			tile = d.tile,
			rank = learned and Content.ranks[learned.rank + 1] or "Unlearned",
			training = learned and learned.training or 0,
			kind = d.kind,
			alias = d.progression ~= nil,
		}
	end
	local id = request.skill
	if not U.contains(ids, id) then
		return model
	end
	local d = Content.definitions[id]
	local progression = d.progression or id
	local definition = Content.definitions[progression]
	local learned, rank = p.skills[progression], Skills.record(p, progression)
	local owned = learned ~= nil
	local can_advance, advance_reason, ap_cost
	if owned then
		can_advance, advance_reason, ap_cost = Skills.can_advance(p, progression)
	else
		can_advance, advance_reason = Skills.can_learn(p, progression)
		learned, rank = { rank = 0, training = 0, legacy_training = 0, objectives = {} }, definition.ranks[1]
	end
	local can_use, use_reason, command, target = active_action(p, id, request.target)
	local cost = "Passive · no action or resource payment"
	if d.kind ~= "passive" then
		local pool, amount = Battle.cost(p, { hero = true }, id)
		local remaining = p.battle and (p.battle.cooldowns[p.id] or {})[id] or 0
		cost = amount .. " " .. pool:upper() .. " once · Cooldown " .. remaining .. "/" .. d.cooldown .. " turns"
	end
	if can_use and d.kind == "attack" then
		local previews = {}
		for _, enemy in ipairs(p.battle.enemies) do
			if enemy.pools.hp > 0 and (d.target_rule == "all_living_hostiles" or enemy.id == command.target) then
				local _, _, _, normal, critical = Battle.preview(p, Battle.actor(p, p.id), enemy, id)
				previews[#previews + 1] = normal .. "/" .. critical
			end
		end
		cost = cost .. " · Normal/crit: " .. table.concat(previews, ", ")
	end
	model.detail = {
		id = id,
		name = d.name,
		rank = owned and Content.ranks[learned.rank + 1] or "Unlearned",
		training = learned.training,
		description = d.description,
		cost = cost,
		bonuses = bonuses(p, rank),
		requirement = d.requires_equipment and ("Requires " .. d.requires_equipment:gsub("_", " "))
			or d.category and ("Requires " .. d.category .. " equipment" .. (d.no_giant and " · Human / Elf only" or ""))
			or "No equipment requirement",
		route = definition.route,
		source = definition.source,
		alias = d.progression ~= nil,
		legacy = learned.legacy_training,
		frozen_rank = owned and Content.ranks[Skills.rank(p, progression) + 1] or "Unlearned",
		advance = {
			label = owned and "Advance" or "Learn F · Free",
			enabled = can_advance and not locked,
			reason = locked or advance_reason or "",
			cost = ap_cost,
			command = {
				type = owned and "advance_skill" or "learn_skill",
				skill = progression,
				rank = learned.rank,
				revision = p.revision,
				profile = p.id,
			},
		},
		use = { enabled = can_use and not locked, reason = locked or use_reason, command = command, target = target },
	}
	for _, objective in ipairs(rank.objectives) do
		model.objectives[#model.objectives + 1] = {
			text = objective.text,
			points = objective.points,
			count = learned.objectives[objective.id] or 0,
			limit = objective.limit,
		}
	end
	return model
end

function M.send(p, request, receiver, locked)
	local model = M.model(p, request, locked)
	msg.post(receiver, "skills_begin", { token = request.token, header = model.header })
	for _, row in ipairs(model.rows) do
		msg.post(receiver, "skills_row", { token = request.token, row = row })
	end
	if model.detail then
		local detail = model.detail
		-- Keep each message comfortably below the engine's 2 KB payload limit.
		msg.post(receiver, "skills_detail", {
			token = request.token,
			id = detail.id,
			name = detail.name,
			rank = detail.rank,
			training = detail.training,
			description = detail.description,
			cost = detail.cost,
			bonuses = detail.bonuses,
			requirement = detail.requirement,
			alias = detail.alias,
			legacy = detail.legacy,
			frozen_rank = detail.frozen_rank,
		})
		msg.post(receiver, "skills_sources", { token = request.token, route = detail.route, source = detail.source })
		msg.post(receiver, "skills_actions", { token = request.token, advance = detail.advance, use = detail.use })
	end
	for _, objective in ipairs(model.objectives) do
		msg.post(receiver, "skills_objective", { token = request.token, objective = objective })
	end
	msg.post(receiver, "skills_end", { token = request.token })
end

return M
