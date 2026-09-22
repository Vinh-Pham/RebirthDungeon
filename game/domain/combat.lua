local C = require("game.content.catalog")
local S = require("game.domain.stats")
local U = require("game.domain.util")
local R = require("game.services.rng")
local Skills = require("game.domain.skills")
local Log = require("game.domain.combat_log")
local M = {}

local function category(p, actor, definition)
	return actor.hero and (definition.category or S.current(p).category) or "melee"
end

local function power(p, actor, damage_category)
	return actor.hero and S.power(p, damage_category) or C.enemies[actor.def].attack
end

function M.status(p, id)
	p.battle.statuses[id] = p.battle.statuses[id] or {}
	return p.battle.statuses[id]
end

local function counters(p, actor, target, definition)
	local effects = p.battle.statuses[target.id] or {}
	return effects.counterattack
		and not definition.bypass_counter
		and definition.hits == 1
		and category(p, actor, definition) == "melee"
end

---@return number chance, number bonus
function M.critical(p, actor, skill)
	if not actor.hero then
		return 0, 0
	end
	local s, d = S.current(p), C.skills[skill]
	local bonus = s.critical_bonus or 0
	if bonus == 0 then
		return 0, 0
	end
	local extra = d.two_handed_critical and s.two_handed and d.two_handed_critical or 0
	return U.clamp((s.critical_chance or 0) + extra, 0, 1), bonus
end

---@return number damage, integer hits, number absorbed, boolean guarded
---Pure pipeline: flat defense -> critical -> protection -> shield. No RNG or writes.
function M.damage(p, actor, target, skill, critical, raw_override, reaction)
	local d = C.skills[skill]
	local damage_category = category(p, actor, d)
	local hits = d.hits or 1
	if not reaction and counters(p, actor, target, d) then
		return 0, hits, 0, false
	end
	local multiplier = actor.hero and p.race == "Giant" and d.giant_multiplier or d.multiplier or 1
	if actor.hero and d.two_handed_multiplier and S.current(p).two_handed then
		multiplier = multiplier * d.two_handed_multiplier
	end
	local raw = raw_override or ((d.base or 0) + power(p, actor, damage_category)) * multiplier
	local defense, protection, absorption = 0, 0, 0
	if target.hero then
		local s = S.current(p)
		defense = damage_category == "magic" and s.magic_defense or s.defense
		protection = damage_category == "magic" and s.magic_protection or s.protection
	else
		defense = C.enemies[target.def].defense
	end
	local effects = p.battle.statuses[target.id] or {}
	local guarded = effects.guard ~= nil and not d.bypass_guard and damage_category ~= "magic" and not reaction
	if guarded then
		defense = defense + effects.guard.defense
		protection = protection + effects.guard.protection
		absorption = target.hero and (S.current(p).shield_absorption or 0) or 0
	end
	if effects.armor_break then
		defense = math.max(0, defense - 4)
	end
	local amount = math.floor(math.max(0, raw / hits - defense))
	local _, bonus = M.critical(p, actor, skill)
	if critical then
		amount = math.floor(amount * (1 + bonus))
	end
	amount = math.floor(amount * (1 - U.clamp(protection, 0, 100) / 100))
	local final = math.floor(amount * (1 - absorption))
	return final, hits, amount - final, guarded
end

---@return number normal, integer hits, number critical, number normal_total, number critical_total
function M.preview(p, actor, target, skill)
	local normal, hits, _, guarded = M.damage(p, actor, target, skill, false)
	local critical = M.damage(p, actor, target, skill, true)
	local normal_total, critical_total = normal * hits, critical * hits
	if guarded and hits > 1 then
		-- Defense is consumed by the first hit. Later hits use the same crit decision.
		normal_total = normal + M.damage(p, actor, target, skill, false, nil, true) * (hits - 1)
		critical_total = critical + M.damage(p, actor, target, skill, true, nil, true) * (hits - 1)
	end
	return normal, hits, critical, normal_total, critical_total
end

local function deal(p, actor, target, skill, damage, absorbed, critical, hit, hits)
	local loss = math.min(target.pools.hp, damage)
	target.pools.hp = target.pools.hp - loss
	Log.emit(p, "damage", target.name .. " takes " .. loss .. " damage" .. (critical and " · Critical" or ""), {
		actor = actor.id,
		target = target.id,
		skill = skill,
		amount = loss,
		actual = loss,
		calculated = damage + absorbed,
		absorbed = absorbed,
		critical = critical,
		hit = hit,
		hits = hits,
	})
	if target.pools.hp <= 0 then
		Log.emit(p, "defeat", target.name .. " is defeated", { target = target.id })
	end
	return loss
end

local function down(p, actor, target)
	M.status(p, target.id).downed = { source = actor.id, applied = p.battle.turn }
	Log.emit(p, "status", target.name .. " is downed until the attacker's next turn ends", {
		actor = actor.id,
		target = target.id,
		status = "downed",
	})
end

---@return number dealt, boolean critical, integer defeats
function M.resolve(p, actor, target, skill, factory)
	local d = C.skills[skill]
	if counters(p, actor, target, d) then
		local effects = M.status(p, target.id)
		local reaction = effects.counterattack
		effects.counterattack = nil
		Log.emit(
			p,
			"status_end",
			target.name .. " counters the attack",
			{ actor = target.id, target = target.id, status = "counterattack" }
		)
		local raw = power(p, actor, "melee") * reaction.enemy_share + power(p, target, "melee") * reaction.self_share
		local damage, _, absorbed = M.damage(p, target, actor, "normal", false, raw, true)
		local loss = deal(p, target, actor, "counterattack", damage, absorbed, false, 1, 1)
		if loss > 0 and actor.pools.hp > 0 then
			down(p, target, actor)
		end
		if target.hero then
			Skills.train(p, {
				id = p.battle.id .. ":" .. p.battle.turn,
				skill = "counterattack",
				damage = loss,
				counter = true,
				counter_negated = true,
				hero_action = false,
			})
		end
		return 0, false, 0
	end
	local chance = M.critical(p, actor, skill)
	-- Exactly one counted number sample per eligible target, including chance 0/1.
	local critical = false
	local _, bonus = M.critical(p, actor, skill)
	if bonus > 0 then
		critical = R.open(p.battle.random, factory):raw() / 4294967296 < chance
	end
	local dealt = 0
	for hit = 1, d.hits do
		if target.pools.hp <= 0 then
			break
		end
		local damage, _, absorbed, blocked = M.damage(p, actor, target, skill, critical)
		dealt = dealt + deal(p, actor, target, skill, damage, absorbed, critical, hit, d.hits)
		if blocked then
			M.status(p, target.id).guard = nil
			Log.emit(p, "status_end", target.name .. " consumes Defense", { target = target.id, status = "guard" })
			if target.hero then
				Skills.train(p, {
					id = p.battle.id .. ":" .. p.battle.turn .. ":guard",
					skill = skill,
					damage = damage,
					hero_action = false,
					guarded = true,
				})
			end
		end
	end
	if target.pools.hp > 0 then
		if d.knockdown and dealt > 0 then
			down(p, actor, target)
		end
		if d.status then
			local remaining = d.status == "poison" and 3 or 2
			M.status(p, target.id)[d.status] = { remaining = remaining, applied = p.battle.turn }
			Log.emit(
				p,
				"status",
				target.name .. " is affected by " .. d.status,
				{ actor = actor.id, target = target.id, status = d.status, remaining = remaining }
			)
		end
	end
	return dealt, critical, target.pools.hp <= 0 and 1 or 0
end
return M
