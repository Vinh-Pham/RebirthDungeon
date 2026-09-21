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
		target and target.name or p.name
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
		if (id == "normal" or p.skills[id]) and (group == "All" or group == d.group) then
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
			rank = Content.ranks[learned.rank + 1],
			training = learned.training,
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
	local can_advance, advance_reason, ap_cost = Skills.can_advance(p, progression)
	local can_use, use_reason, command, target = active_action(p, id, request.target)
	local cost = "Passive · no action or resource payment"
	if d.kind ~= "passive" then
		local pool, amount = Battle.cost(p, { hero = true }, id)
		local remaining = p.battle and (p.battle.cooldowns[p.id] or {})[id] or 0
		cost = amount .. " " .. pool:upper() .. " once · Cooldown " .. remaining .. "/" .. d.cooldown .. " turns"
	end
	model.detail = {
		id = id,
		name = d.name,
		rank = Content.ranks[learned.rank + 1],
		training = learned.training,
		description = d.description,
		cost = cost,
		bonuses = bonuses(p, rank),
		requirement = d.category
				and ("Requires " .. d.category .. " equipment" .. (d.no_giant and " · Human / Elf only" or ""))
			or "No equipment requirement",
		route = definition.route,
		source = definition.source,
		alias = d.progression ~= nil,
		legacy = learned.legacy_training,
		frozen_rank = Content.ranks[Skills.rank(p, progression) + 1],
		advance = {
			enabled = can_advance and not locked,
			reason = locked or advance_reason or "",
			cost = ap_cost,
			command = {
				type = "advance_skill",
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
