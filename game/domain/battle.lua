local C = require("game.content.catalog")
local U = require("game.domain.util")
local I = require("game.domain.inventory")
local S = require("game.domain.stats")
local R = require("game.services.rng")
local Skills = require("game.domain.skills")
local Log = require("game.domain.combat_log")
local Combat = require("game.domain.combat")
local CombatContent = require("game.content.skills.combat")
local M = {}
function M.actor(p, id)
	if id == p.id then
		return { id = p.id, name = p.name, pools = p.pools, hero = true }
	end
	for _, a in ipairs(p.battle.enemies) do
		if a.id == id then
			return a
		end
	end
end
function M.active(p)
	return p.battle and M.actor(p, p.battle.order[p.battle.cursor])
end
M.event = Log.emit
function M.start(p, room, factory, operation)
	local world = R.open(p.random.world, factory)
	local b = {
		id = U.id(p, "battle"),
		room = room.id,
		enemies = {},
		order = {},
		speeds = {},
		cursor = 1,
		round = 1,
		turn = 1,
		started = false,
		item_used = false,
		operation = operation,
		sequence = 0,
		events = {},
		statuses = {},
		cooldowns = {},
		random = R.seed(world:int(0, 4294967295), world:int(0, 4294967295)),
	}
	local D = require("game.domain.dungeon")
	for i, key in ipairs(D.enemies(room)) do
		local d = C.enemies[key]
		local id = b.id .. "_enemy_" .. i
		b.enemies[i] = {
			id = id,
			def = key,
			name = d.name .. " " .. i,
			pools = { hp = d.hp, mp = 0, sp = 20 },
			last_defend = false,
		}
		b.speeds[id] = d.speed
	end
	b.speeds[p.id] = p.run.baseline.speed
	local groups = {}
	for id, speed in pairs(b.speeds) do
		groups[speed] = groups[speed] or {}
		groups[speed][#groups[speed] + 1] = id
	end
	local speeds = U.keys(groups)
	local random = R.open(b.random, factory)
	for i = #speeds, 1, -1 do
		local g = groups[speeds[i]]
		table.sort(g)
		random:shuffle(g)
		for _, id in ipairs(g) do
			b.order[#b.order + 1] = id
		end
	end
	p.battle = b
	p.phase = "battle"
	p.last_events = {}
	Log.migrate(p)
	M.event(p, "battle_start", "The encounter begins.", { actor = p.id })
end
function M.cost(p, actor, skill)
	if skill == "normal" then
		return "sp", actor.hero and CombatContent.attack_cost(Skills.rank(p, "combat_mastery")) or 2
	end
	local d = C.skills[skill]
	return d.pool, math.ceil(d.cost)
end
function M.eligible(p, actor, skill, target)
	local d = C.skills[skill]
	if not d or d.kind == "passive" then
		return false, "Not an active skill"
	end
	if actor.hero then
		if skill ~= "normal" and Skills.rank(p, skill) == nil then
			return false, "Skill not learned"
		end
		if d.category and S.current(p).category ~= d.category then
			return false, "Requires " .. d.category .. " equipment"
		end
		if d.no_giant and p.race == "Giant" then
			return false, "Giants cannot use bows"
		end
	else
		if skill ~= "normal" and skill ~= "defense" and C.enemies[actor.def].skill ~= skill then
			return false, "Enemy cannot use that skill"
		end
	end
	if ((p.battle.cooldowns[actor.id] or {})[skill] or 0) > 0 then
		return false, "On cooldown"
	end
	local pool, cost = M.cost(p, actor, skill)
	if actor.pools[pool] < cost then
		return false, "Not enough " .. pool:upper()
	end
	if d.target_rule == "single_downed_hostile" then
		local found = false
		for _, enemy in ipairs(p.battle.enemies) do
			if enemy.pools.hp > 0 and (p.battle.statuses[enemy.id] or {}).downed then
				found = true
			end
		end
		if target then
			found = target.pools.hp > 0 and (p.battle.statuses[target.id] or {}).downed ~= nil
		end
		if not found then
			return false, "Target not downed"
		end
	end
	return true
end
function M.can_wait(p, actor)
	for _, skill in ipairs(U.keys(C.skills)) do
		if M.eligible(p, actor, skill) then
			return false
		end
	end
	return true
end
local function status(p, id)
	p.battle.statuses[id] = p.battle.statuses[id] or {}
	return p.battle.statuses[id]
end
function M.ended(p)
	if p.pools.hp <= 0 then
		return "defeat"
	end
	for _, a in ipairs(p.battle.enemies) do
		if a.pools.hp > 0 then
			return nil
		end
	end
	return "victory"
end
function M.begin(p)
	local b = p.battle
	U.require_ok(not b.started, "Turn already initialized")
	local a = M.active(p)
	U.require_ok(a and a.pools.hp > 0, "Actor cannot begin a turn")
	if status(p, a.id).guard then
		M.event(p, "status_end", a.name .. " stops defending", { actor = a.id, target = a.id, status = "guard" })
	end
	status(p, a.id).guard = nil
	if status(p, a.id).counterattack then
		status(p, a.id).counterattack = nil
		M.event(p, "status_end", a.name .. " stops countering", { target = a.id, status = "counterattack" })
	end
	local rank = a.hero and Skills.rank(p, "combat_mastery") or 0
	local amount = a.hero and CombatContent.sp_recovery(rank) or 0.5
	local maximum = a.hero and S.current(p).sp or 20
	local recovered = math.min(maximum - a.pools.sp, amount)
	a.pools.sp = U.round(a.pools.sp + recovered, 4)
	b.started = true
	b.item_used = false
	M.event(
		p,
		"turn_start",
		a.name .. " begins a turn (" .. U.round(recovered, 1) .. " SP recovered)",
		{ actor = a.id, target = a.id, amount = recovered, pool = "sp" }
	)
end
M.preview = Combat.preview
local function finish_owner(p, a, cast)
	local b = p.battle
	local effects = status(p, a.id)
	if effects.poison and effects.poison.applied ~= b.turn then
		local loss = math.min(a.pools.hp, 3)
		a.pools.hp = a.pools.hp - loss
		M.event(p, "periodic", a.name .. " loses " .. loss .. " HP to poison", {
			actor = a.id,
			target = a.id,
			amount = loss,
			actual = loss,
			calculated = 3,
			status = "poison",
			pool = "hp",
		})
		if a.pools.hp <= 0 then
			M.event(p, "defeat", a.name .. " is defeated", { target = a.id })
		end
		if M.ended(p) then
			return
		end
	end
	for _, key in ipairs(U.keys(effects)) do
		local e = effects[key]
		if e.remaining and e.applied ~= b.turn then
			e.remaining = e.remaining - 1
			if e.remaining <= 0 then
				effects[key] = nil
				M.event(p, "status_end", a.name .. " recovers from " .. key, { target = a.id, status = key })
			end
		end
	end
	for target_id, target_effects in pairs(b.statuses) do
		local downed = target_effects.downed
		if downed and downed.source == a.id and downed.applied ~= b.turn then
			target_effects.downed = nil
			M.event(p, "status_end", "The follow-up window closes", { target = target_id, status = "downed" })
		end
	end
	for key, n in pairs(b.cooldowns[a.id] or {}) do
		if key ~= cast then
			b.cooldowns[a.id][key] = math.max(0, n - 1)
		end
	end
end
function M.act(p, command, factory)
	local b = p.battle
	local a = M.active(p)
	U.require_ok(b.started and a and a.id == command.actor and a.pools.hp > 0, "It is not this actor's turn")
	local skill = command.skill
	if skill == "wait" then
		U.require_ok(M.can_wait(p, a), "Wait is only available when no main action is affordable")
		M.event(p, "wait", a.name .. " waits", { actor = a.id })
	else
		local ok, reason = M.eligible(p, a, skill)
		U.require_ok(ok, reason)
		local d = C.skills[skill]
		local target
		if d.kind == "attack" then
			target = M.actor(p, command.target)
			U.require_ok(target and target.pools.hp > 0 and target.hero ~= a.hero, "Choose a living hostile target")
			local target_ok, target_reason = M.eligible(p, a, skill, target)
			U.require_ok(target_ok, target_reason)
		end
		local pool, cost = M.cost(p, a, skill)
		a.pools[pool] = U.round(a.pools[pool] - cost, 4)
		M.event(
			p,
			"action",
			a.name .. " uses " .. d.name .. " (" .. cost .. " " .. pool:upper() .. ")",
			{ actor = a.id, target = target and target.id or a.id, skill = skill, cost = cost, pool = pool }
		)
		if d.kind == "guard" then
			local rank = a.hero and Skills.record(p, "defense")
			status(p, a.id).guard = {
				defense = rank and rank.guard_defense[p.race] or 2,
				protection = rank and rank.guard_protection[p.race] or 5,
			}
			local guard = status(p, a.id).guard
			M.event(p, "status", a.name .. " defends until the next turn", {
				actor = a.id,
				target = a.id,
				status = "guard",
				defense = guard.defense,
				protection = guard.protection,
			})
			if a.hero then
				Skills.train(p, { id = b.id .. ":" .. b.turn, skill = skill, damage = 0, hero_action = true })
			end
		elseif d.kind == "counter" then
			local rank = Skills.record(p, skill)
			status(p, a.id).counterattack =
				{ reactions = 1, enemy_share = rank.enemy_share, self_share = rank.self_share }
			M.event(
				p,
				"status",
				a.name .. " prepares Counterattack",
				{ actor = a.id, target = a.id, status = "counterattack" }
			)
		else
			local targets = { target }
			if d.target_rule == "all_living_hostiles" then
				targets = {}
				for _, enemy in ipairs(b.enemies) do
					if enemy.pools.hp > 0 then
						targets[#targets + 1] = enemy
					end
				end
			end
			local dealt, critical, defeats = 0, false, 0
			for _, victim in ipairs(targets) do
				local damage, crit, defeated = Combat.resolve(p, a, victim, skill, factory)
				dealt, critical, defeats = dealt + damage, critical or crit and damage > 0, defeats + defeated
				if M.ended(p) then
					break
				end
			end
			if a.hero then
				for _, slot in ipairs({ "weapon", "hand_left" }) do
					local weapon = I.equipped(p, slot)
					if weapon and weapon.durability then
						weapon.durability = math.max(0, weapon.durability - 1)
					end
				end
				Skills.train(p, {
					id = b.id .. ":" .. b.turn,
					skill = skill,
					damage = dealt,
					hero_action = true,
					critical = critical,
					defeats = defeats,
					category = d.category or S.current(p).category,
				})
			end
		end
		if d.cooldown > 0 then
			b.cooldowns[a.id] = b.cooldowns[a.id] or {}
			b.cooldowns[a.id][skill] = d.cooldown
		end
	end
	if not a.hero then
		a.last_defend = skill == "defense"
	end
	if not M.ended(p) then
		finish_owner(p, a, skill)
	end
	local outcome = M.ended(p)
	if outcome then
		b.outcome = outcome
		M.event(p, "battle_end", outcome == "victory" and "Victory" or "Defeat", { actor = a.id, outcome = outcome })
		return outcome
	end
	repeat
		b.cursor = b.cursor + 1
		if b.cursor > #b.order then
			b.cursor = 1
			b.round = b.round + 1
		end
	until M.actor(p, b.order[b.cursor]).pools.hp > 0
	b.turn = b.turn + 1
	b.started = false
	b.item_used = false
end
function M.ai(p)
	local a = M.active(p)
	local d = C.enemies[a.def]
	local skill
	if a.pools.hp <= d.hp * 0.25 and not a.last_defend and M.eligible(p, a, "defense") then
		skill = "defense"
	elseif M.eligible(p, a, d.skill) then
		skill = d.skill
	elseif M.eligible(p, a, "normal") then
		skill = "normal"
	elseif M.eligible(p, a, "defense") then
		skill = "defense"
	else
		skill = "wait"
	end
	return { type = "act", actor = a.id, battle = p.battle.id, turn = p.battle.turn, skill = skill, target = p.id }
end
return M
