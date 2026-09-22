local U = require("game.domain.util")
local C = require("game.content.catalog")
local R = require("game.services.rng")
local D = require("game.domain.dungeon")
local S = require("game.domain.stats")
local I = require("game.domain.inventory")
local Skills = require("game.domain.skills")
local M = {}
local function check(ok, message)
	if not ok then
		error("Invalid save: " .. message, 0)
	end
end
function M.profile(p)
	check(type(p) == "table" and U.plain(p), "only bounded plain data is supported")
	check(
		(p.format_version == 1 or p.format_version == 2 or p.format_version == 3)
			and (p.rules_version == 1 or p.rules_version == 2)
			and p.content_version == C.VERSION,
		"unsupported format/rules/content"
	)
	check(type(p.id) == "string" and p.id:match("^profile_%d%d$"), "profile identity")
	check(
		type(p.name) == "string" and #p.name >= 2 and #p.name <= 24 and p.name:match("^[A-Za-z][A-Za-z0-9 '%-]*$"),
		"name"
	)
	check(
		U.contains({ "Human", "Elf", "Giant" }, p.race)
			and C.talents[p.talent]
			and not (p.race == "Giant" and p.talent == "Archery"),
		"race/talent"
	)
	check(
		U.integer(p.age, 10, 10000) and U.integer(p.level, 1, 200) and U.integer(p.cumulative, p.level, 100000000),
		"progression"
	)
	for _, k in ipairs({ "ap", "gold", "xp", "next_id", "revision", "generation" }) do
		check(U.integer(p[k], 0, 1000000000), k)
	end
	check(U.integer(p.life, 1, 1000000000), "life")
	check(type(p.last_events) == "table" and #p.last_events <= 64, "recent events")
	for _, e in ipairs(p.last_events) do
		check(
			type(e.id) == "string"
				and type(e.battle) == "string"
				and U.integer(e.sequence, 1, 10000000)
				and type(e.text) == "string",
			"recent event"
		)
	end
	check(U.finite(p.created) and U.finite(p.reborn) and U.integer(p.age_boundary, 13000, 90000), "clock")
	check(type(p.growth) == "table" and type(p.skills) == "table" and type(p.pools) == "table", "stat data")
	for k, v in pairs(p.growth) do
		check(C.base[k] and U.finite(v) and v >= 0 and v <= 1000000, "growth")
	end
	Skills.validate_profile(p)
	check(p.skills.combat_mastery and p.skills.defense, "starter skills")
	local ids = {}
	local slots = {}
	for _, location in ipairs({ "items", "bank" }) do
		local list = location == "items" and p.items or p.bank and p.bank.items
		check(type(list) == "table" and U.count(list) == #list, "inventory must be a dense list")
		local carried = 0
		for _, item in ipairs(list) do
			local d = C.items[item.def]
			check(d and type(item.id) == "string" and #item.id > 0 and not ids[item.id], "duplicate/unknown item")
			ids[item.id] = true
			check(U.integer(item.quantity, 1, d.stack), "quantity")
			if d.durability then
				check(U.integer(item.durability, 0, d.durability), "durability")
			else
				check(item.durability == nil, "unexpected durability")
			end
			if item.slot then
				check(
					location == "items"
						and (d.slot == item.slot or item.slot == "hand_left" and d.weapon_type == "sword" and not d.two_handed)
						and not slots[item.slot]
						and not (d.no_giant and p.race == "Giant"),
					"equipment"
				)
				slots[item.slot] = true
			else
				carried = carried + 1
			end
		end
		check(carried <= (location == "items" and I.CARRIED_CAPACITY or I.BANK_CAPACITY), "inventory capacity")
	end
	check(require("game.domain.combat_equipment").valid(p), "incompatible hands")
	check(U.integer(p.bank.gold, 0, 1000000000), "bank gold")
	check(type(p.random) == "table" and R.valid(p.random.world) and R.valid(p.random.reward), "RNG")
	check(type(p.ledger) == "table" and #p.ledger <= 128 and type(p.claims) == "table", "operation ledger")
	check(
		type(p.quests) == "table" and type(p.quests.current) == "table" and type(p.quests.completed) == "table",
		"quest state"
	)
	check(
		type(p.quest_evidence) == "table" and type(p.quest_claims) == "table" and type(p.dialogue) == "table",
		"progression records"
	)
	check(U.contains({ "town", "dungeon", "battle", "rewards", "treasure" }, p.phase), "phase")
	check(type(p.position) == "table" and U.finite(p.position.x) and U.finite(p.position.y), "position")
	check((p.phase == "town") == (p.run == nil), "run ownership")
	if p.phase == "town" then
		check(
			D.walkable(D.town(), math.floor(p.position.x / 48 + 0.5), math.floor(p.position.y / 48 + 0.5)),
			"town position"
		)
	end
	if p.run then
		local run = p.run
		local map = run.map
		local weapon = I.equipped(p, "weapon")
		local off = I.equipped(p, "hand_left")
		check(run.baseline.offhand_id == (off and off.id), "frozen off-hand ownership")
		check(run.baseline and run.baseline.weapon_id == (weapon and weapon.id), "frozen weapon ownership")
		check(
			run.baseline and run.baseline.category == (weapon and C.items[weapon.def].category or "melee"),
			"frozen weapon category"
		)
		check(
			run.baseline and run.baseline.weapon_power == (weapon and C.items[weapon.def].power or 0),
			"frozen weapon contribution"
		)
		for _, key in ipairs({ "critical_chance", "critical_bonus", "shield_absorption" }) do
			local value = run.baseline[key]
			check(value == nil or U.finite(value) and value >= 0 and value <= 1, "frozen combat modifier")
		end
		check(
			run.baseline.offhand_power == nil
				or U.finite(run.baseline.offhand_power) and run.baseline.offhand_power >= 0,
			"frozen off-hand power"
		)
		check(run.baseline.two_handed == nil or type(run.baseline.two_handed) == "boolean", "frozen weapon class")
		check(type(run.id) == "string" and type(run.cleared) == "table" and type(run.baseline) == "table", "run state")
		for _, key in ipairs({
			"hp",
			"mp",
			"sp",
			"str",
			"int",
			"dex",
			"wil",
			"luk",
			"defense",
			"magic_defense",
			"protection",
			"magic_protection",
			"speed",
			"weapon_power",
			"melee",
			"ranged",
			"magic",
			"guns",
		}) do
			check(
				U.finite(run.baseline[key]) and run.baseline[key] >= 0 and run.baseline[key] <= 10000000,
				"frozen baseline"
			)
		end
		check(
			map
				and map.height == 43
				and ((map.width == 83 and #map.rooms == 7) or (map.width == 101 and #map.rooms == 8))
				and #map.tiles == map.width * map.height,
			"layout"
		)
		for _, v in ipairs(map.tiles) do
			check(v == 0 or v == 1, "occupancy")
		end
		local required = 0
		local kinds = { "entrance", "contact", "chest", "switch", "boss", "optional", "supplies", "treasure" }
		for index, room in ipairs(map.rooms) do
			check(
				room.id == "room_" .. index
					and room.kind == kinds[index]
					and room.required == (index >= 2 and index <= 4),
				"room identity"
			)
			check(U.integer(room.x, 1, map.width) and U.integer(room.y, 1, map.height), "room")
			check(
				U.integer(room.x1, 1, room.x)
					and U.integer(room.x2, room.x, map.width)
					and U.integer(room.y1, 1, room.y)
					and U.integer(room.y2, room.y, map.height),
				"room bounds"
			)
			check(D.walkable(map, room.x, room.y), "room spawn")
			if room.required then
				required = required + 1
			end
		end
		check(required == 3, "required encounters")
		-- Older saves may stand on a newly closed gate; world loading moves them inward.
		check(
			D.walkable(
				map,
				math.floor(p.position.x / 48 + 0.5),
				math.floor(p.position.y / 48 + 0.5),
				map.gates and run or nil
			),
			"run position"
		)
		if map.gates then
			check(U.equal(map.gates, D.build_gates(map)), "gate geometry")
		end
		for id, v in pairs(run.cleared) do
			check(v == true and D.room(map, id), "clear flag")
		end
		if run.treasure_version then
			check(
				run.treasure_version == 1 and #map.rooms == 8 and U.integer(run.keys, 0, 1000000),
				"treasure key state"
			)
		end
		if run.chests then
			check(#run.chests == 5, "chest offers")
			for _, chest in ipairs(run.chests) do
				check(
					U.integer(chest.gold, 0, 1000000) and C.items[chest.item] and U.integer(chest.quantity, 1, 99),
					"chest contents"
				)
			end
			if run.treasure_version then
				check(run.cleared.room_5 == true, "treasure without boss victory")
				for _, chest in ipairs(run.chests) do
					check(type(chest.opened) == "boolean", "opened chest")
				end
			end
			if run.chosen then
				check(U.integer(run.chosen, 1, 5), "chest selection")
			end
		end
	end
	local stats = S.current(p)
	for _, pool in ipairs({ "hp", "mp", "sp" }) do
		check(
			U.finite(stats[pool]) and U.finite(p.pools[pool]) and p.pools[pool] >= 0 and p.pools[pool] <= stats[pool],
			"resource bounds"
		)
	end
	if p.battle then
		local b = p.battle
		check(p.run and type(b.id) == "string" and R.valid(b.random) and D.room(p.run.map, b.room), "battle reference")
		check(
			U.integer(b.cursor, 1, #b.order) and U.integer(b.turn, 1, 1000000) and U.integer(b.round, 1, 1000000),
			"turn cursor"
		)
		check(
			type(b.started) == "boolean"
				and type(b.item_used) == "boolean"
				and type(b.statuses) == "table"
				and type(b.cooldowns) == "table",
			"turn flags"
		)
		local actors = { [p.id] = true }
		local order = {}
		for _, a in ipairs(b.enemies) do
			local d = C.enemies[a.def]
			check(d and not actors[a.id], "enemy")
			actors[a.id] = true
			check(
				U.finite(a.pools.hp)
					and a.pools.hp >= 0
					and a.pools.hp <= d.hp
					and U.finite(a.pools.sp)
					and a.pools.sp >= 0
					and a.pools.sp <= 20,
				"enemy pools"
			)
		end
		for _, id in ipairs(b.order) do
			check(actors[id] and not order[id] and U.finite(b.speeds[id]), "queue membership")
			order[id] = true
		end
		check(U.count(actors) == #b.order, "missing actor")
		for actor, effects in pairs(b.statuses) do
			check(actors[actor] and type(effects) == "table", "status owner")
			for kind, effect in pairs(effects) do
				check(type(effect) == "table", "status record")
				if kind == "guard" then
					check(
						U.finite(effect.defense)
							and effect.defense >= 0
							and effect.defense <= 1000
							and U.finite(effect.protection)
							and effect.protection >= 0
							and effect.protection <= 100,
						"guard"
					)
				elseif kind == "counterattack" then
					check(
						effect.reactions == 1 and effect.enemy_share == 0.5 and effect.self_share == 1,
						"counter reaction"
					)
				elseif kind == "downed" then
					check(actors[effect.source] and U.integer(effect.applied, 1, b.turn), "downed boundary")
				else
					check(
						(kind == "poison" or kind == "armor_break")
							and U.integer(effect.remaining, 1, 3)
							and U.integer(effect.applied, 1, b.turn),
						"timed status"
					)
				end
			end
		end
		for actor, cooldowns in pairs(b.cooldowns) do
			check(actors[actor] and type(cooldowns) == "table", "cooldown owner")
			for skill, remaining in pairs(cooldowns) do
				check(C.skills[skill] and U.integer(remaining, 0, C.skills[skill].cooldown or 0), "cooldown")
			end
		end
		check(type(b.events) == "table" and #b.events <= 200, "event bound")
		check(U.integer(b.sequence, 0, 10000000), "event sequence")
		local last = 0
		for _, event in ipairs(b.events) do
			check(
				type(event.id) == "string"
					and event.battle == b.id
					and type(event.text) == "string"
					and U.integer(event.sequence, last + 1, b.sequence),
				"ordered event"
			)
			check(U.integer(event.turn, 1, b.turn) and U.integer(event.round, 1, b.round), "event boundary")
			last = event.sequence
		end
	end
	check(p.phase ~= "battle" or p.battle and not p.battle.outcome, "active battle")
	check(p.phase ~= "rewards" or type(p.pending) == "table", "reward workflow")
	if p.pending then
		check(
			p.phase == "rewards"
				and type(p.pending.id) == "string"
				and U.contains({ "encounter", "boss", "chest" }, p.pending.origin),
			"reward identity"
		)
		check(
			type(p.pending.entries) == "table" and #p.pending.entries > 0 and #p.pending.entries <= 30,
			"reward entries"
		)
		local seen = {}
		for _, entry in ipairs(p.pending.entries) do
			check(
				type(entry.id) == "string" and not seen[entry.id] and type(entry.claimed) == "boolean",
				"reward entry identity"
			)
			seen[entry.id] = true
			check(
				U.integer(entry.amount, 1, 1000000)
					and (entry.kind == "gold" or entry.kind == "item" and C.items[entry.def]),
				"reward contents"
			)
			check((p.claims[entry.id] == true) == entry.claimed, "reward claim marker")
		end
	end
	for service, state in pairs(p.dialogue) do
		check(
			C.services[service]
				and (state.version == 1 or state.version == 2 and state.service == service and type(state.actions) == "table")
				and type(state.state) == "table"
				and type(state.paragraphs) == "table"
				and type(state.choices) == "table",
			"dialogue state"
		)
	end
	require("game.domain.combat_log").validate(p)
	return true
end
function M.safe(p)
	return pcall(M.profile, p)
end
return M
