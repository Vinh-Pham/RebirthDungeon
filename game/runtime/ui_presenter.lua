local C = require("game.content.catalog")
local U = require("game.domain.util")
local Stats = require("game.domain.stats")
local B = require("game.domain.battle")
local I = require("game.domain.inventory")
local D = require("game.domain.dungeon")
local T = require("game.domain.time")
local Cmd = require("game.domain.commands")
local XP = require("game.content.experience")
local Log = require("game.presentation.combat_log")
local M = {}

local function rebirth(p, now)
	local seconds = math.max(0, p.reborn + T.cooldown(p.cumulative) - now)
	local reason = p.run and "Finish or abandon your dungeon first"
		or seconds > 0 and ("Available in " .. math.ceil(seconds / 3600) .. " hours")
		or "Ready in town"
	return { enabled = p.phase == "town" and not p.run and seconds == 0, seconds = seconds, reason = reason }
end

local function catalog()
	local result = {
		talent_order = C.talent_order,
		talents = {},
		skills = {},
		items = {},
		enemies = {},
		services = C.services,
		service_order = C.service_order,
		quests = C.quests,
		quest_order = C.quest_order,
	}
	for id, d in pairs(C.talents) do
		result.talents[id] = { skill = d.skill }
	end
	for id, d in pairs(C.skills) do
		result.skills[id] = { name = d.name, kind = d.kind }
	end
	for id, d in pairs(C.items) do
		result.items[id] = { name = d.name, tile = d.tile }
	end
	for id, d in pairs(C.enemies) do
		result.enemies[id] = { tile = d.tile, hp = d.hp }
	end
	return result
end

local function battle(p, projected, request, locked)
	local b, actor, hero = p.battle, B.active(p), B.actor(p, p.id)
	local view = {
		id = b.id,
		sequence = b.sequence,
		round = b.round,
		turn = b.turn,
		order = b.order,
		speeds = b.speeds,
		started = b.started,
		item_used = b.item_used,
		enemies = b.enemies,
		actors = {},
		active = actor,
		events = { b.events[#b.events] },
		actions = {},
		can_wait = B.can_wait(p, hero),
	}
	local target
	for _, enemy in ipairs(b.enemies) do
		if enemy.pools.hp > 0 and (not target or enemy.id == request.target) then
			target = enemy
		end
	end
	view.target = target and target.id
	for _, id in ipairs(b.order) do
		view.actors[id] = B.actor(p, id)
	end
	for _, skill in ipairs({ "normal", C.talents[p.talent].skill, "defense", "wait" }) do
		local eligible, reason, pool, cost = false, "Wait for your turn", "sp", 0
		if skill == "wait" then
			eligible = view.can_wait
		else
			eligible, reason = B.eligible(p, hero, skill, target)
			pool, cost = B.cost(p, hero, skill)
		end
		local cooldown = (b.cooldowns[p.id] or {})[skill] or 0
		if cooldown > 0 then
			reason = "Cooldown: " .. cooldown .. " turn(s)"
		end
		if not b.started or not actor.hero then
			eligible = false
			reason = "Wait for your turn"
		end
		local damage, hits, critical
		if skill ~= "wait" and skill ~= "defense" and target then
			local first, first_critical
			first, hits, first_critical, damage, critical = B.preview(p, hero, target, skill)
		end
		view.actions[skill] = {
			enabled = eligible and not locked,
			reason = locked or (not eligible and reason) or "",
			pool = pool,
			cost = cost,
			damage = damage,
			critical = critical,
			hits = hits,
			cooldown = cooldown,
			command = {
				type = "act",
				actor = p.id,
				battle = b.id,
				turn = b.turn,
				skill = skill,
				target = target and target.id or p.id,
				profile = p.id,
				revision = p.revision,
			},
		}
	end
	projected.battle = view
end

local function rewards(p, request, locked)
	local selected, all = {}, {}
	for _, offer in ipairs(p.pending.entries) do
		if not offer.claimed then
			all[#all + 1] = offer.id
			if not request.selected or request.selected[offer.id] ~= false then
				selected[#selected + 1] = offer.id
			end
		end
	end
	local result = { entries = p.pending.entries, id = p.pending.id, unclaimed = #all }
	for key, ids in pairs({ all = all, selected = selected }) do
		local command =
			{ type = "claim", reward = p.pending.id, ids = ids, finish = true, profile = p.id, revision = p.revision }
		local enabled, reason = Cmd.preview_claim(p, command)
		result[key] = { command = command, enabled = enabled and not locked, reason = locked or reason or "" }
	end
	return result
end

---@return table model Plain bounded display data; excludes saves, RNG and hidden treasure offers.
function M.model(p, state, request, now)
	request = request or {}
	local locked = state.read_only and "Save storage is read-only"
		or state.error and "Resolve the save failure first"
		or state.busy and "Saving…"
		or nil
	local model = {
		screen = state.screen,
		modal = state.modal,
		dialogue_service = state.dialogue_service,
		read_only = state.read_only,
		error = state.error,
		notice = state.notice,
		busy = state.busy,
		settings = U.copy(state.settings),
		catalog = catalog(),
		profiles = {},
		recovery_errors = {},
		epoch = state.epoch,
	}
	for _, error in ipairs(state.recovery_errors or {}) do
		model.recovery_errors[#model.recovery_errors + 1] = error.id .. ": " .. error.error
	end
	for _, profile in ipairs(state.profiles or {}) do
		model.profiles[#model.profiles + 1] = {
			id = profile.id,
			name = profile.name,
			race = profile.race,
			level = profile.level,
			phase = profile.phase,
			age = profile.age,
			talent = profile.talent,
			rebirth = rebirth(profile, now),
		}
	end
	if not p then
		return model
	end
	local out = {}
	for _, key in ipairs({
		"id",
		"name",
		"race",
		"age",
		"talent",
		"level",
		"cumulative",
		"ap",
		"life",
		"gold",
		"xp",
		"revision",
		"phase",
		"last_message",
		"pools",
		"quest_evidence",
		"quest_claims",
		"last_events",
	}) do
		out[key] = U.copy(p[key])
	end
	out.stats = U.copy(Stats.current(p))
	out.pack = I.occupied(p)
	out.capacity = I.CARRIED_CAPACITY
	out.xp_next = p.level == 200 and 0 or XP[p.level]
	out.rebirth = rebirth(p, now)
	out.combat_log = Log.model(p.combat_log and p.combat_log.record, request)
	out.skills = {}
	for id in pairs(p.skills) do
		out.skills[id] = true
	end
	if p.run then
		out.run = {
			id = p.run.id,
			keys = p.run.keys or 0,
			boss_defeated = p.run.cleared.room_5 == true,
			treasure_room = D.contains(p.run.map.rooms[8], p.position.x / 48, p.position.y / 48),
		}
	end
	if p.phase == "battle" or p.phase == "rewards" and p.battle then
		battle(p, out, request, locked)
	end
	if p.pending then
		out.pending = rewards(p, request, locked)
	end
	out.sources = {
		"Base attributes + talent + earned growth + learned skill bonuses.",
		"Defense includes STR, Defense skill and equipped armor; magic defense derives from WIL.",
		"Attack power adds the equipped weapon. At zero durability its contribution is halved.",
		p.run and "This expedition uses the attributes and equipment frozen at entry."
			or "Town statistics use your current equipment and learned skills.",
		"Changing maxima never heals. Use supplies or Elara's restoration service.",
		"Weekly aging: Saturday noon, America/Los_Angeles.",
	}
	if state.modal == "map" then
		local map = p.run and p.run.map or D.town()
		model.map = { width = map.width, height = map.height, cells = {}, points = {}, position = p.position }
		for y = 1, map.height do
			for x = 1, map.width do
				if D.walkable(map, x, y, p.run) then
					model.map.cells[#model.map.cells + 1] = { x = x, y = y }
				end
			end
		end
		if p.run then
			for _, room in ipairs(map.rooms) do
				model.map.points[#model.map.points + 1] =
					{ x = room.x, y = room.y, name = room.kind, cleared = p.run.cleared[room.id] }
			end
		else
			for _, id in ipairs(C.service_order) do
				local npc = C.services[id]
				model.map.points[#model.map.points + 1] = { x = npc.x, y = npc.y, name = npc.title, service = id }
			end
		end
	end
	model.profile = out
	return model
end

---Serialize a display projection in bounded messages (no save snapshot crosses the GUI boundary).
function M.send(p, state, request, receiver, sequence)
	local encoded = json.encode(M.model(p, state, request, os.time()))
	msg.post(receiver, "ui_begin", { sequence = sequence, token = request.token })
	for first = 1, #encoded, 1200 do
		msg.post(receiver, "ui_part", { sequence = sequence, text = encoded:sub(first, first + 1199) })
	end
	msg.post(receiver, "ui_end", { sequence = sequence })
end

return M
