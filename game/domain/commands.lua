local U = require("game.domain.util")
local C = require("game.content.catalog")
local I = require("game.domain.inventory")
local S = require("game.domain.stats")
local Ch = require("game.domain.character")
local D = require("game.domain.dungeon")
local B = require("game.domain.battle")
local R = require("game.services.rng")
local Q = require("game.services.quests")
local V = require("game.domain.validate")
local Skills = require("game.domain.skills")
local Town = require("game.content.town")
local Log = require("game.domain.combat_log")
local Treasure = require("game.domain.treasure")
local M = {}
local function near(p, x, y)
	return (p.position.x - x * 48) ^ 2 + (p.position.y - y * 48) ^ 2 <= (48 * Town.interaction_radius) ^ 2
end
function M.service_available(p, id)
	local d = C.services[id]
	return p.phase == "town" and not p.run and d and near(p, d.x, d.y)
end
local function service(p, id)
	U.require_ok(M.service_available(p, id), "Walk closer to the service in town")
end
local function evidence(out, c, action, object)
	out[#out + 1] = { id = c.op, action = action, object = object }
end
local function offer(p, items, gold, origin)
	local entries = {}
	if gold > 0 then
		entries[#entries + 1] = { id = U.id(p, "offer"), kind = "gold", amount = gold, claimed = false }
	end
	for _, item in ipairs(items) do
		entries[#entries + 1] =
			{ id = U.id(p, "offer"), kind = "item", def = item.def, amount = item.amount, claimed = false }
	end
	p.pending = { id = U.id(p, "reward"), origin = origin, entries = entries }
	p.phase = "rewards"
end
local function end_run(p, message, now)
	p.run = nil
	p.battle = nil
	p.pending = nil
	p.phase = "town"
	p.position = { x = C.services.healer.x * 48, y = (C.services.healer.y - 1) * 48 }
	Ch.age(p, now)
	S.restore(p)
	p.last_message = message
end
local function outcome(p, result, c, events, env)
	Log.sync(p)
	if result == "defeat" then
		end_run(p, "You awaken at the healer. Claimed rewards and experience are safe.", env.now)
		return
	end
	local room = D.room(p.run.map, p.battle.room)
	p.run.cleared[room.id] = true
	local xp, gold = 0, 0
	for _, enemy in ipairs(p.battle.enemies) do
		local d = C.enemies[enemy.def]
		xp = xp + d.xp
		gold = gold + d.gold
	end
	Ch.xp(p, xp)
	evidence(events, c, "win", "battle")
	if room.kind == "boss" then
		evidence(events, c, "defeat", "boss")
		p.run.chests = {}
		local random = R.open(p.random.reward, env.rng_factory)
		for i = 1, 5 do
			p.run.chests[i] = {
				gold = random:int(55, 105),
				item = ({ "hp_potion", "mp_potion", "sp_potion", "bread", "silk" })[random:int(1, 5)],
				quantity = random:int(2, 4),
				opened = false,
			}
		end
		p.run.keys = p.run.keys + 1
		p.battle = nil
		p.phase = "dungeon"
		p.last_message = "Boss defeated · "
			.. xp
			.. " EXP · Treasure chest key +1. The reward room is beyond the east gate."
		return
	end
	offer(
		p,
		{ { def = "silk", amount = 1 }, { def = "hp_potion", amount = 1 } },
		gold,
		room.kind == "boss" and "boss" or "encounter"
	)
	p.last_message = "Victory · " .. xp .. " EXP earned"
end
local function apply(p, c, env, events)
	if c.type == "checkpoint" then
		U.require_ok(p.phase == "town" or p.phase == "dungeon", "Movement is unavailable")
		local map = p.run and p.run.map or D.town()
		U.require_ok(
			U.finite(c.x)
				and U.finite(c.y)
				and D.walkable(map, math.floor(c.x / 48 + 0.5), math.floor(c.y / 48 + 0.5), p.run),
			"Invalid position"
		)
		p.position = { x = c.x, y = c.y }
	elseif c.type == "age" then
		Ch.age(p, env.now)
	elseif c.type == "enter" then
		service(p, "gate")
		local random = R.open(p.random.world, env.rng_factory)
		local map = D.generate(random)
		p.run = {
			id = U.id(p, "run"),
			map = map,
			cleared = {},
			baseline = S.profile(p),
			skill_ranks = Skills.freeze(p),
			started = env.now,
			supplies_claimed = false,
			treasure_version = 1,
			keys = 0,
		}
		p.position = { x = map.rooms[1].x * 48, y = map.rooms[1].y * 48 }
		p.phase = "dungeon"
		p.last_message = "Alby · clear three encounters to unseal the boss gate"
		evidence(events, c, "enter", "alby")
	elseif c.type == "encounter" then
		U.require_ok(p.phase == "dungeon" and p.run, "No explorable run")
		local room = D.room(p.run.map, c.room)
		U.require_ok(
			room
				and D.enemies(room)
				and not p.run.cleared[room.id]
				and (near(p, room.x, room.y) or D.contains(room, p.position.x / 48, p.position.y / 48)),
			"Move closer to an uncleared encounter"
		)
		U.require_ok(room.kind ~= "boss" or D.boss_open(p.run), "Clear the three required rooms first")
		B.start(p, room, env.rng_factory, c.op)
	elseif c.type == "supplies" then
		local room = p.run and p.run.map.rooms[7]
		U.require_ok(
			p.phase == "dungeon" and room and near(p, room.x, room.y) and not p.run.supplies_claimed,
			"Supplies are unavailable"
		)
		I.add(p, "hp_potion", 2)
		I.add(p, "sp_potion", 2)
		p.run.supplies_claimed = true
		p.last_message = "Found two health and two stamina potions"
	elseif c.type == "begin_turn" or c.type == "act" then
		U.require_ok(
			p.phase == "battle" and p.battle and p.battle.id == c.battle and p.battle.turn == c.turn,
			"Stale battle command"
		)
		p.battle.operation = c.op
		if c.type == "begin_turn" then
			B.begin(p)
		else
			local result = B.act(p, c, env.rng_factory)
			if result then
				outcome(p, result, c, events, env)
			end
		end
	elseif c.type == "use_item" then
		U.require_ok(p.phase == "town" or p.phase == "dungeon" or p.phase == "battle", "Items are unavailable now")
		if p.battle and p.phase == "battle" then
			local b = p.battle
			local a = B.active(p)
			U.require_ok(
				c.battle == b.id and c.turn == b.turn and a.hero and c.actor == p.id and b.started and not b.item_used,
				"Item already used or not your turn"
			)
		end
		local item = I.find(p, c.item)
		local d = item and C.items[item.def]
		U.require_ok(d and d.pool, "Choose a recovery item")
		local maximum = S.current(p)[d.pool]
		U.require_ok(p.pools[d.pool] < maximum, "That resource is already full")
		local amount = math.min(d.restore, maximum - p.pools[d.pool])
		I.remove(p, c.item, 1)
		p.pools[d.pool] = p.pools[d.pool] + amount
		if p.phase == "battle" then
			p.battle.item_used = true
			p.battle.operation = c.op
			B.event(
				p,
				"item",
				"Used " .. d.name .. " · +" .. amount .. " " .. d.pool:upper(),
				{ actor = p.id, target = p.id, item = item.def, amount = amount, pool = d.pool }
			)
		end
		p.last_message = d.name .. " restored " .. amount .. " " .. d.pool:upper()
	elseif c.type == "buy" then
		service(p, c.service)
		local stock = C.services[c.service].stock
		U.require_ok(stock and U.contains(stock, c.def), "Item not sold here")
		local d = C.items[c.def]
		local n = c.quantity or 1
		U.require_ok(U.integer(n, 1, 99), "Choose a whole quantity from 1 to 99")
		U.require_ok(p.gold >= d.price * n, "Not enough gold")
		I.add(p, c.def, n)
		p.gold = p.gold - d.price * n
		p.last_message = "Purchased " .. d.name
	elseif c.type == "sell" then
		service(p, c.service)
		U.require_ok(C.services[c.service].stock, "This service does not buy items")
		local item = I.find(p, c.item)
		U.require_ok(item, "Item not found")
		local price = math.floor(C.items[item.def].price * 0.25)
		local n = c.quantity or 1
		I.remove(p, c.item, n)
		p.gold = p.gold + price * n
	elseif c.type == "heal" then
		service(p, "healer")
		local cost = C.services.healer.cost
		U.require_ok(p.gold >= cost, "Healing costs " .. cost .. " gold")
		local s = S.current(p)
		U.require_ok(p.pools.hp < s.hp or p.pools.mp < s.mp or p.pools.sp < s.sp, "Already fully restored")
		p.gold = p.gold - cost
		S.restore(p)
		p.last_message = "Fully restored"
	elseif c.type == "repair" then
		service(p, "blacksmith")
		local item = I.find(p, c.item)
		local d = item and C.items[item.def]
		U.require_ok(d and d.durability, "Choose a weapon")
		local cost = (d.durability - item.durability) * C.services.blacksmith.repair_per_point
		U.require_ok(cost > 0 and p.gold >= cost, "No repair needed or not enough gold")
		p.gold = p.gold - cost
		item.durability = d.durability
		p.last_message = "Weapon repaired"
	elseif c.type == "equip" then
		I.equip(p, c.item)
		S.clamp(p)
	elseif c.type == "discard_item" then
		U.require_ok(p.phase == "town" or p.phase == "dungeon", "Discard items outside battle and rewards")
		U.require_ok(c.confirm == true, "Confirm discarding these items")
		U.require_ok(c.quantity ~= nil, "Choose an explicit quantity")
		I.remove(p, c.item, c.quantity)
		p.last_message = "Items discarded. No pickup or refund is available."
	elseif c.type == "bank_item" then
		service(p, "bank")
		I.transfer(p, c.item, c.quantity or 1, c.deposit)
	elseif c.type == "bank_gold" then
		service(p, "bank")
		U.require_ok(type(c.deposit) == "boolean", "Choose deposit or withdrawal")
		U.require_ok(U.integer(c.amount, 1, 1000000000), "Choose a positive amount")
		if c.deposit then
			U.require_ok(p.gold >= c.amount, "Not enough carried gold")
			p.gold = p.gold - c.amount
			p.bank.gold = p.bank.gold + c.amount
		else
			U.require_ok(p.bank.gold >= c.amount, "Not enough banked gold")
			p.bank.gold = p.bank.gold - c.amount
			p.gold = p.gold + c.amount
		end
	elseif c.type == "claim" then
		U.require_ok(p.phase == "rewards" and p.pending and c.reward == p.pending.id, "Reward is no longer available")
		U.require_ok(type(c.ids) == "table" and (#c.ids > 0 or c.finish == true), "Select a reward")
		local selection = {}
		for _, id in ipairs(c.ids) do
			U.require_ok(not selection[id], "Duplicate reward selection")
			selection[id] = true
		end
		local found = 0
		-- Saved offer order gives deterministic stack allocation and instance IDs on retry.
		for _, e in ipairs(p.pending.entries) do
			if selection[e.id] then
				found = found + 1
				U.require_ok(not e.claimed and not p.claims[e.id], "Reward already claimed")
				if e.kind == "gold" then
					p.gold = p.gold + e.amount
				else
					I.add(p, e.def, e.amount)
				end
				e.claimed = true
				p.claims[e.id] = true
			end
		end
		U.require_ok(found == #c.ids, "Unknown reward")
		if c.finish == true then
			Log.sync(p)
			local origin = p.pending.origin
			p.pending = nil
			p.battle = nil
			p.phase = "dungeon"
		end
	elseif c.type == "leave_rewards" then
		U.require_ok(p.phase == "rewards" and p.pending, "No rewards to leave")
		local unclaimed = false
		for _, e in ipairs(p.pending.entries) do
			if not e.claimed then
				unclaimed = true
			end
		end
		U.require_ok(not unclaimed or c.confirm == true, "Confirm leaving unclaimed rewards")
		local origin = p.pending.origin
		p.pending = nil
		p.battle = nil
		p.phase = "dungeon"
	elseif c.type == "chest" then
		U.require_ok(
			p.phase == "dungeon" and p.run and p.run.chests and p.run.cleared.room_5,
			"Defeat the dungeon boss first"
		)
		U.require_ok(U.integer(c.index, 1, 5), "Choose one chest")
		local object = D.treasure_objects(p.run.map)[c.index]
		U.require_ok(near(p, object.x, object.y), "Walk closer to the treasure chest")
		local chest = p.run.chests[c.index]
		U.require_ok(not chest.opened, "This treasure chest is already open")
		U.require_ok(p.run.keys > 0, "You need a treasure chest key")
		p.run.keys = p.run.keys - 1
		chest.opened = true
		p.claims[p.run.id .. "_chest_" .. c.index] = true
		offer(p, { { def = chest.item, amount = chest.quantity } }, chest.gold, "chest")
	elseif c.type == "return" then
		U.require_ok(
			p.phase == "dungeon" and p.run and p.run.cleared.room_5 and not p.pending,
			"Defeat the boss and resolve any pending rewards first"
		)
		local statue = D.treasure_objects(p.run.map)[6]
		U.require_ok(near(p, statue.x, statue.y), "Walk closer to the goddess statue")
		U.require_ok(c.confirm == true, "Confirm returning to town")
		evidence(events, c, "return", "town")
		end_run(p, "Alby cleared. The goddess returns you to the dungeon entrance.", env.now)
		p.position = { x = C.services.gate.x * 48, y = (C.services.gate.y - 1) * 48 }
	elseif c.type == "leave_dungeon" then
		U.require_ok(
			p.phase == "dungeon" and p.run and c.run == p.run.id and c.confirm == true,
			"Confirm leaving this dungeon"
		)
		local entrance = p.run.map.rooms[1]
		U.require_ok(near(p, entrance.x, entrance.y), "Walk closer to the dungeon entrance")
		end_run(p, "Left Alby. Claimed rewards and experience are safe.", env.now)
		p.position = { x = C.services.gate.x * 48, y = (C.services.gate.y - 1) * 48 }
	elseif c.type == "abandon" then
		U.require_ok(p.run and c.confirm == true, "Confirm abandoning this run")
		if p.battle and not p.battle.outcome then
			p.battle.operation = c.op
			p.battle.outcome = "abandonment"
			B.event(p, "battle_end", "Battle abandoned", { actor = p.id, outcome = "abandonment" })
			Log.sync(p)
		end
		end_run(p, "Returned to town. Claimed rewards are safe.", env.now)
	elseif c.type == "claim_quest" then
		U.require_ok(p.phase == "town" and not p.run, "Claim quest rewards in town")
		local d = C.quests[c.quest]
		U.require_ok(
			d and p.quest_evidence[c.quest] and not p.quest_claims[c.quest],
			"Quest is not ready or already claimed"
		)
		Q.complete(p, c.quest)
		p.quest_claims[c.quest] = true
		p.gold = p.gold + d.gold
		Ch.xp(p, d.xp)
		p.last_message = d.name .. " completed"
	elseif c.type == "advance_skill" then
		Skills.advance(p, c.skill, c.rank)
		S.clamp(p)
	elseif c.type == "rebirth" then
		Ch.rebirth(p, c.talent, c.age, env.now)
	elseif c.type == "dialogue" then
		service(p, c.service)
		U.require_ok(env.dialogue, "Dialogue runtime unavailable")
		local state, requested = env.dialogue(p.dialogue[c.service], c.choice, c.service, c.restart)
		if requested then
			local action = C.dialogue_actions[c.service] and C.dialogue_actions[c.service][requested]
			U.require_ok(action, "Unknown dialogue action")
			apply(p, action, env, events)
		end
		p.dialogue[c.service] = state
	else
		error("Unknown command", 0)
	end
end
local INVENTORY_COMMANDS = {
	equip = true,
	use_item = true,
	bank_item = true,
	bank_gold = true,
	sell = true,
	repair = true,
	discard_item = true,
	buy = true,
}

---@return boolean, string|nil
---Dry-run the same inventory rules without events, saves, revisions or RNG draws.
function M.preview_inventory(state, command)
	if not INVENTORY_COMMANDS[command.type] then
		return false, "Unknown inventory action"
	end
	local candidate = Log.migrate(U.copy(state))
	candidate.last_events = {}
	local preview = U.copy(command)
	preview.op = preview.op or "inventory_preview"
	local ok, reason = pcall(function()
		apply(candidate, preview, {}, {})
		Log.sync(candidate)
		V.profile(candidate)
	end)
	return ok, not ok and tostring(reason) or nil
end

---@return boolean, string|nil
---Service previews never advance stories, bind quests or consume world RNG.
function M.preview_service(state, command)
	if command.type == "buy" or command.type == "repair" then
		return M.preview_inventory(state, command)
	end
	if command.type == "enter" or command.type == "dialogue" then
		local id = command.type == "enter" and "gate" or command.service
		if not M.service_available(state, id) then
			return false, "Walk closer to the service in town"
		end
		return true
	end
	if command.type ~= "heal" then
		return false, "Unknown service action"
	end
	local candidate = U.copy(state)
	local ok, reason = pcall(function()
		apply(candidate, command, {}, {})
		Log.sync(candidate)
		V.profile(candidate)
	end)
	return ok, not ok and tostring(reason) or nil
end

---@return boolean, string|nil
function M.preview_claim(state, command)
	if command.type ~= "claim" then
		return false, "Unknown reward action"
	end
	if not command.ids or (#command.ids == 0 and command.finish ~= true) then
		return false, "Select an unclaimed reward"
	end
	local candidate = U.copy(state)
	local ok, reason = pcall(function()
		apply(candidate, command, {}, {})
		Log.sync(candidate)
		V.profile(candidate)
	end)
	return ok, not ok and tostring(reason) or nil
end

function M.execute(state, command, env)
	U.require_ok(command.profile == nil or command.profile == state.id, "Character changed; reopen the panel")
	U.require_ok(type(command.op) == "string" and #command.op > 0 and #command.op <= 128, "Operation identity required")
	for _, op in ipairs(state.ledger) do
		if op == command.op then
			return U.copy(state), true
		end
	end
	U.require_ok(command.revision == state.revision, "State changed; try again")
	local candidate = Treasure.migrate(Log.migrate(Skills.migrate(U.copy(state))))
	local previous_batch = candidate.last_events
	candidate.last_events = {}
	local events = {}
	apply(candidate, command, env, events)
	Log.sync(candidate)
	if #candidate.last_events == 0 then
		candidate.last_events = previous_batch
	end
	Q.evaluate(candidate, events)
	candidate.revision = candidate.revision + 1
	candidate.ledger[#candidate.ledger + 1] = command.op
	if #candidate.ledger > 128 then
		table.remove(candidate.ledger, 1)
	end
	V.profile(candidate)
	return candidate, false
end
return M
