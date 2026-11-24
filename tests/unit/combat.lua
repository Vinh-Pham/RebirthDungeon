local lester = require("tests.vendor.lester")
local describe, it, expect = lester.describe, lester.it, lester.expect
local C = require("game.content.catalog")
local Content = require("game.content.skills.combat")
local K = require("game.domain.skills")
local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local B = require("game.domain.battle")
local Combat = require("game.domain.combat")
local S = require("game.domain.stats")
local I = require("game.domain.inventory")
local U = require("game.domain.util")
local V = require("game.domain.validate")
local Save = require("game.services.save")
local Presenter = require("game.runtime.skills_presenter")
local Support = require("tests.support")
local ENV = { now = 1789920000, rng_factory = Support.mock_rng }
local sequence = 0

local function command(p, c)
	sequence = sequence + 1
	c.op, c.revision = c.op or "combat_test_" .. sequence, p.revision
	return Cmd.execute(p, c, ENV)
end
local function fresh(race, talent)
	return Ch.new("profile_01", "Fighter", race or "Human", 17, talent or "Close Combat", ENV.now, 42)
end
local function learn(p, ...)
	for _, id in ipairs({ ... }) do
		p = command(p, { type = "learn_skill", skill = id })
	end
	return p
end
local function equip(p, definition, slot)
	I.add(p, definition, 1)
	return command(p, { type = "equip", item = p.items[#p.items].id, slot = slot })
end
local function encounter(p)
	p.position = { x = 14 * 48, y = 15 * 48 }
	p = command(p, { type = "enter" })
	local room = p.run.map.rooms[2]
	p.position = { x = room.x * 48, y = room.y * 48 }
	p = command(p, { type = "encounter", room = room.id })
	return command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
end
local function action(p, skill, target)
	return {
		type = "act",
		actor = B.active(p).id,
		battle = p.battle.id,
		turn = p.battle.turn,
		skill = skill,
		target = target or p.battle.enemies[1].id,
	}
end
local function next_hero(p)
	while not B.active(p).hero do
		p = command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
		p = command(p, B.ai(p))
	end
	return command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
end
local function damage_events(p)
	local events = {}
	for _, e in ipairs(p.last_events) do
		if e.kind == "damage" then
			events[#events + 1] = e
		end
	end
	return events
end

describe("Combat skills", function()
	it("loads all eleven F-rank skills through the shared registry without duplicating Attack progression", function()
		for _, id in ipairs({
			"combat_mastery",
			"smash",
			"defense",
			"counterattack",
			"windmill",
			"assault_slash",
			"critical_hit",
			"dual_wield_mastery",
			"sword_mastery",
			"axe_mastery",
			"shield_mastery",
		}) do
			expect.equal(C.skills[id], Content.definitions[id])
			expect.equal(#C.skills[id].ranks, 1)
		end
		for rank = 0, 14 do
			expect.equal(Content.attack_cost(rank), U.round(2 + rank / 10, 1))
			expect.equal(Content.sp_recovery(rank), 0.5 + math.floor(rank / 3) * 0.5)
		end
		expect.equal(C.skills.normal.progression, "combat_mastery")
		expect.truthy(K.validate_content())
	end)
	it("learns town lessons through commands and rejects race, duplicate, and in-run learning", function()
		local p = fresh()
		local model = Presenter.model(p, { group = "Combat", skill = "counterattack" })
		expect.truthy(model.detail.advance.enabled)
		expect.equal(model.detail.advance.command.type, "learn_skill")
		p = command(p, model.detail.advance.command)
		expect.equal(p.skills.counterattack.rank, 0)
		expect.falsy(pcall(learn, p, "counterattack"))
		expect.falsy(pcall(learn, fresh("Elf"), "dual_wield_mastery"))
		expect.falsy(pcall(learn, encounter(p), "windmill"))
	end)
	it("Smash uses race damage, costs 4, bypasses guard and skips its casting cooldown boundary", function()
		for _, race in ipairs({ "Human", "Elf", "Giant" }) do
			local p = encounter(fresh(race))
			local t = p.battle.enemies[1]
			local expected = B.preview(p, B.active(p), t, "smash")
			expect.equal(
				expected,
				math.floor(S.power(p, "melee") * (race == "Giant" and 2 or 1.5) - C.enemies[t.def].defense)
			)
			p.battle.statuses[t.id] = { guard = { defense = 1000, protection = 100 } }
			local sp = p.pools.sp
			p = command(p, action(p, "smash"))
			expect.equal(p.pools.sp, sp - 4)
			expect.equal(damage_events(p)[1].actual, math.min(t.pools.hp, expected))
			expect.equal(p.battle.cooldowns[p.id].smash, 1)
			if p.battle.enemies[1].pools.hp > 0 then
				expect.truthy(p.battle.statuses[t.id].downed)
			end
		end
	end)
	it("Windmill pays once, resolves stable targets, trains once and credits each distinct defeat", function()
		local p = encounter(learn(fresh(), "windmill", "critical_hit"))
		local ids = {}
		for _, enemy in ipairs(p.battle.enemies) do
			enemy.pools.hp = 1
			ids[#ids + 1] = enemy.id
		end
		local sp, draws, durability = p.pools.sp, p.battle.random.raw_draw_count, p.items[1].durability
		p = command(p, action(p, "windmill"))
		expect.equal(p.pools.sp, sp - 2)
		expect.equal(p.battle.random.raw_draw_count, draws + #ids)
		expect.equal(p.items[1].durability, durability - 1)
		expect.equal(p.skills.windmill.objectives.damaging_skill, 1)
		expect.equal(p.skills.windmill.objectives.defeat, #ids)
		for index, event in ipairs(damage_events(p)) do
			expect.equal(event.target, ids[index])
		end
		expect.equal(p.battle.outcome, "victory")
		expect.truthy(V.safe(p))
	end)
	it("Counterattack consumes once, negates melee, cannot chain or crit, and survives saving", function()
		local p = encounter(learn(fresh(), "counterattack", "critical_hit"))
		p = command(p, action(p, "counterattack"))
		local backend, store = Support.backend()
		store = Save.new(backend)
		expect.truthy(store:commit(p))
		p = store:load(p.id)
		local hp, draws = p.pools.hp, p.battle.random.raw_draw_count
		p = command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
		local enemy = B.active(p)
		p.battle.statuses[enemy.id] = { counterattack = { reactions = 1, enemy_share = 0.5, self_share = 1 } }
		p = command(p, action(p, "normal", p.id))
		expect.equal(p.pools.hp, hp)
		expect.falsy(p.battle.statuses[p.id].counterattack)
		expect.truthy(p.battle.statuses[enemy.id].counterattack)
		expect.equal(p.battle.random.raw_draw_count, draws)
		expect.equal(p.skills.counterattack.objectives.counter, 1)
		expect.equal(damage_events(p)[1].critical, false)
		expect.equal(damage_events(p)[1].skill, "counterattack")
		expect.equal(p.skills.defense.training, 0)
	end)
	it("expires an unused Counterattack at owner start", function()
		local p = encounter(learn(fresh(), "counterattack"))
		p = command(p, action(p, "counterattack"))
		p.battle.cursor = 1
		p.battle.started = false
		B.begin(p)
		expect.falsy(p.battle.statuses[p.id].counterattack)
	end)
	it("Assault Slash rejects standing targets atomically and permits a saved knockdown follow-up", function()
		local p = encounter(learn(fresh(), "assault_slash"))
		p.battle.enemies[1].def = "white"
		p.battle.enemies[1].pools.hp = 42
		local before = U.copy(p)
		expect.falsy(pcall(command, p, action(p, "assault_slash")))
		expect.truthy(U.equal(before, p))
		local model = Presenter.model(p, { group = "Combat", skill = "assault_slash" })
		expect.equal(model.detail.use.reason, "Target not downed")
		p = command(p, action(p, "smash"))
		p = next_hero(p)
		local target = p.battle.enemies[1]
		expect.truthy(p.battle.statuses[target.id].downed)
		local backend = Support.backend()
		local store = Save.new(backend)
		expect.truthy(store:commit(p))
		p = store:load(p.id)
		p.battle.statuses[target.id].guard = { defense = 1000, protection = 100 }
		p.battle.statuses[target.id].counterattack = { reactions = 1, enemy_share = 0.5, self_share = 1 }
		p = command(p, action(p, "assault_slash"))
		expect.truthy(damage_events(p)[1].actual > 0)
		expect.falsy(p.battle.statuses[target.id].downed)
		expect.equal(p.skills.assault_slash.objectives.damaging_skill, 1)
	end)
	it("Defense consumes one hit, shields absorb after mitigation, and magic ignores it", function()
		local p = encounter(learn(equip(fresh(), "large_shield"), "shield_mastery"))
		local hero, enemy = B.active(p), p.battle.enemies[1]
		enemy.def = "white"
		enemy.pools.hp = 42
		p.battle.statuses[p.id] = { guard = { defense = 0, protection = 0 } }
		local damage, _, absorbed = Combat.damage(p, enemy, hero, "normal", false)
		expect.equal(damage, 0)
		expect.truthy(absorbed > 0)
		Combat.resolve(p, enemy, hero, "normal", ENV.rng_factory)
		expect.falsy(p.battle.statuses[p.id].guard)
		expect.equal(p.skills.shield_mastery.objectives.shield_block, 1)
		expect.truthy(Combat.damage(p, enemy, hero, "normal", false) > 0)
		p.battle.statuses[enemy.id] = { guard = { defense = 1000, protection = 100 } }
		expect.truthy(Combat.damage(p, hero, enemy, "icebolt", false) > 0)
	end)
	it("Windmill bypasses counters but fully blocked damage does not knock down", function()
		local p = encounter(learn(fresh(), "windmill"))
		local enemy = p.battle.enemies[1]
		p.battle.statuses[enemy.id] = {
			counterattack = { reactions = 1, enemy_share = 0.5, self_share = 1 },
			guard = { defense = 1000, protection = 100 },
		}
		p = command(p, action(p, "windmill"))
		expect.falsy(p.battle.statuses[enemy.id].downed)
		expect.truthy(p.battle.statuses[enemy.id].counterattack)
		expect.equal(damage_events(p)[1].actual, 0)
	end)
	it("criticals floor between stages and previews consume nothing", function()
		local p = encounter(learn(fresh(), "critical_hit"))
		local enemy = p.battle.enemies[1]
		p.battle.statuses[enemy.id] = { guard = { defense = 2, protection = 25 } }
		local before = U.copy(p)
		local normal, _, critical = B.preview(p, B.active(p), enemy, "normal")
		local flat = math.floor(S.power(p) - C.enemies[enemy.def].defense - 2)
		expect.equal(normal, math.floor(flat * 0.75))
		expect.equal(critical, math.floor(math.floor(flat * 1.5) * 0.75))
		Presenter.model(p, { skill = "normal" })
		expect.truthy(U.equal(before, p))
	end)
	it("rolls once per target across Double Shot and counts chance zero/one draws", function()
		for _, chance in ipairs({ 0, 1 }) do
			local p = encounter(learn(fresh("Human", "Dual Gun"), "critical_hit"))
			p.run.baseline.critical_chance = chance
			local draws = p.battle.random.raw_draw_count
			p = command(p, action(p, "double_shot"))
			expect.equal(p.battle.random.raw_draw_count, draws + 1)
			for _, event in ipairs(damage_events(p)) do
				expect.equal(event.critical, chance == 1)
			end
		end
	end)
	it("previews both Double Shot hits after the first consumes Defense", function()
		local p = encounter(learn(fresh("Human", "Dual Gun"), "critical_hit"))
		p.run.baseline.critical_chance = 1
		local target = p.battle.enemies[2]
		p.battle.statuses[target.id] = { guard = { defense = 5, protection = 20 } }
		local before = U.copy(p)
		local _, _, _, _, total = B.preview(p, B.active(p), target, "double_shot")
		expect.truthy(U.equal(before, p))
		p = command(p, action(p, "double_shot", target.id))
		local events = damage_events(p)
		expect.equal(#events, 2)
		expect.equal(events[1].calculated + events[2].calculated, total)
		expect.truthy(events[1].calculated < events[2].calculated)
	end)
	it("rejects corrupt passive rows, equipment references and reaction coefficients", function()
		for _, change in ipairs({
			function(defs)
				defs.critical_hit.ranks[1].critical_chance = 0 / 0
			end,
			function(defs)
				defs.shield_mastery.ranks[1].shield.medium.protection = 101
			end,
			function(defs)
				defs.dual_wield_mastery.requires_equipment = "paired_guns"
			end,
			function(defs)
				defs.counterattack.ranks[1].enemy_share = -1
			end,
			function(defs)
				defs.windmill.target_rule = "random_targets"
			end,
		}) do
			local defs = U.copy(C.skills)
			change(defs)
			expect.falsy(pcall(K.validate_content, defs))
		end
	end)

	it("counts sword and dual masteries once and halves only each broken weapon contribution", function()
		local p = learn(fresh(), "sword_mastery", "dual_wield_mastery")
		local single = S.profile(p)
		p = equip(p, "sword", "hand_left")
		local paired = S.profile(p)
		expect.equal(paired.melee, single.melee + 2)
		expect.equal(S.power(p), paired.melee + 12 + 6)
		p.items[1].durability = 0
		expect.equal(S.power(p), paired.melee + 6 + 6)
		p.items[2].durability = 0
		expect.equal(S.power(p), paired.melee + 6 + 3)
		expect.falsy(pcall(equip, p, "guns"))
		expect.falsy(pcall(equip, fresh("Elf"), "sword", "hand_left"))
	end)
	it("gates axe chance on Critical Hit, switches equipment passives and scales shield sizes", function()
		local p = learn(fresh(), "axe_mastery", "sword_mastery", "shield_mastery")
		local sword = S.profile(p)
		p = equip(p, "axe")
		expect.equal(S.profile(p).melee, sword.melee)
		expect.equal(S.profile(p).critical_chance, 0)
		p = learn(p, "critical_hit")
		expect.equal(U.round(S.profile(p).critical_chance, 2), 0.11)
		local base = S.profile(p)
		for _, row in ipairs({ { "small_shield", 0 }, { "medium_shield", 3 }, { "large_shield", 5 } }) do
			p = equip(p, row[1])
			expect.equal(S.profile(p).defense, base.defense + row[2])
			expect.equal(S.profile(p).protection, base.protection + 1)
		end
	end)
	it("two-handed Smash applies the authored multiplier and critical addition only with the passive", function()
		local p = encounter(equip(fresh(), "greatsword"))
		local damage = B.preview(p, B.active(p), p.battle.enemies[1], "smash")
		expect.equal(damage, math.floor(S.power(p) * (1.5 * 1.2) - C.enemies[p.battle.enemies[1].def].defense))
		expect.equal(Combat.critical(p, B.active(p), "smash"), 0)
		p = encounter(learn(equip(fresh(), "greatsword"), "critical_hit"))
		expect.equal(U.round(Combat.critical(p, B.active(p), "smash"), 2), 0.15)
	end)
	it("rolls back an unsuccessful save and retries/restarts without consuming extra crit draws", function()
		local p = encounter(learn(fresh(), "critical_hit", "windmill"))
		local backend = Support.backend()
		local store = Save.new(backend)
		expect.truthy(store:commit(p))
		local c = action(p, "windmill")
		local after = command(p, c)
		backend.mode = "fail"
		expect.falsy(store:commit(after))
		expect.truthy(U.equal(store:load(p.id), p))
		backend.mode = "ok"
		expect.truthy(store:commit(after))
		local restored = store:load(p.id)
		local retry, duplicate = Cmd.execute(restored, c, ENV)
		expect.truthy(duplicate)
		expect.truthy(U.equal(restored, retry))
		expect.equal(restored.battle.random.raw_draw_count, after.battle.random.raw_draw_count)
	end)
end)
