local lester = require("tests.vendor.lester")
local describe, it, expect = lester.describe, lester.it, lester.expect
local U = require("game.domain.util")
local I = require("game.domain.inventory")
local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local S = require("game.domain.stats")
local B = require("game.domain.battle")
local V = require("game.domain.validate")
local Q = require("game.services.quests")
local Save = require("game.services.save")
local Presenter = require("game.runtime.inventory_presenter")
local Support = require("tests.support")
local ENV = { now = 1789920000, rng_factory = Support.mock_rng }
local sequence = 0

local function fresh(race)
	return Ch.new("profile_01", "Aster", race or "Human", 17, "Close Combat", ENV.now, 42)
end

local function command(p, c)
	sequence = sequence + 1
	c.op = c.op or "inventory_test_" .. sequence
	c.revision = c.revision or p.revision
	return Cmd.execute(p, c, ENV)
end

local function rejected(p, c)
	local before = U.copy(p)
	expect.falsy(pcall(command, p, c))
	expect.truthy(U.equal(p, before))
end

local function battle(p)
	p.position = { x = 14 * 48, y = 15 * 48 }
	p = command(p, { type = "enter" })
	local room = p.run.map.rooms[2]
	p.position = { x = room.x * 48, y = room.y * 48 }
	return command(p, { type = "encounter", room = room.id })
end

local function rewards(p)
	p = battle(p)
	p.phase = "rewards"
	p.battle.outcome = "victory"
	p.pending = {
		id = "reward_fixture",
		origin = "encounter",
		entries = {
			{ id = "gold_fixture", kind = "gold", amount = 12, claimed = false },
			{ id = "silk_fixture", kind = "item", def = "silk", amount = 2, claimed = false },
			{ id = "potion_fixture", kind = "item", def = "hp_potion", amount = 1, claimed = false },
		},
	}
	return p
end

describe("Inventory contract", function()
	it("fills compatible stacks first at 30 slots without rearranging equipment", function()
		local p = fresh()
		I.add(p, "hp_potion", 98)
		I.add(p, "armor", 29)
		expect.equal(I.occupied(p), 30)
		I.add(p, "hp_potion", 1)
		expect.equal(p.items[2].quantity, 99)
		local before = U.copy(p)
		expect.falsy(pcall(I.add, p, "hp_potion", 1))
		expect.truthy(U.equal(p, before))
		expect.equal(p.items[1].slot, "weapon")
	end)

	it("retains stable IDs and durability through whole bank round trips", function()
		local p = fresh()
		I.add(p, "sword", 1)
		local id = p.items[2].id
		p.items[2].durability = 7
		p.position = { x = 8 * 48, y = 6 * 48 }
		p = command(p, { type = "bank_item", item = id, quantity = 1, deposit = true })
		expect.equal(p.bank.items[1].id, id)
		expect.equal(p.bank.items[1].durability, 7)
		p = command(p, { type = "bank_item", item = id, quantity = 1, deposit = false })
		expect.equal(I.find(p, id).durability, 7)
		I.add(p, "silk", 17)
		id = p.items[3].id
		I.transfer(p, id, 17, true)
		expect.equal(p.bank.items[1].id, id)
		I.transfer(p, id, 17, false)
		expect.equal(I.find(p, id).quantity, 17)
	end)

	it("splits only the requested quantity and merges before allocating a new stack", function()
		local p = fresh()
		I.add(p, "silk", 98, true)
		I.add(p, "silk", 10)
		local id = p.items[2].id
		I.transfer(p, id, 5, true)
		expect.equal(I.find(p, id).quantity, 5)
		expect.equal(p.bank.items[1].quantity, 99)
		expect.equal(p.bank.items[2].quantity, 4)
		expect.truthy(p.bank.items[2].id ~= id)
		I.transfer(p, id, 5, true)
		expect.falsy(I.find(p, id))
		expect.equal(p.bank.items[2].quantity, 9)
		expect.truthy(V.safe(p))
	end)

	it("rejects entire deposits and withdrawals when destination stacks cannot fit", function()
		local p = fresh()
		I.add(p, "silk", 98, true)
		I.add(p, "armor", 59, true)
		I.add(p, "silk", 2)
		local before = U.copy(p)
		expect.falsy(pcall(I.transfer, p, p.items[2].id, 2, true))
		expect.truthy(U.equal(p, before))
		I.transfer(p, p.items[2].id, 1, true)
		expect.equal(#p.bank.items, 60)
		expect.equal(p.bank.items[1].quantity, 99)
		I.add(p, "armor", 29)
		before = U.copy(p)
		expect.falsy(pcall(I.transfer, p, p.bank.items[2].id, 1, false))
		expect.truthy(U.equal(p, before))
	end)

	it("permits a full-pack exchange but rejects unequipping without a free slot", function()
		local p = fresh()
		local first = p.items[1].id
		I.add(p, "bow", 1)
		local second = p.items[2].id
		I.add(p, "armor", 29)
		p = command(p, { type = "equip", item = second })
		expect.equal(I.equipped(p, "weapon").id, second)
		expect.falsy(I.find(p, first).slot)
		expect.equal(I.occupied(p), 30)
		rejected(p, { type = "equip", item = second })
	end)

	it("allows Giants to buy and own bows but never equip them", function()
		local p = fresh("Giant")
		p.position = { x = 19 * 48, y = 6 * 48 }
		p = command(p, { type = "buy", service = "blacksmith", def = "bow" })
		expect.equal(p.gold, 60)
		rejected(p, { type = "equip", item = p.items[2].id })
		for _, race in ipairs({ "Human", "Elf" }) do
			p = fresh(race)
			I.add(p, "bow", 1)
			p = command(p, { type = "equip", item = p.items[2].id })
			expect.equal(I.equipped(p, "weapon").def, "bow")
		end
	end)

	it("sells exact eligible quantities for floored per-unit prices", function()
		local p = fresh()
		I.add(p, "bread", 3)
		local id = p.items[2].id
		p.position = { x = 19 * 48, y = 11 * 48 }
		p = command(p, { type = "sell", service = "grocery", item = id, quantity = 2 })
		expect.equal(p.gold, 102)
		expect.equal(I.find(p, id).quantity, 1)
		rejected(p, { type = "sell", service = "grocery", item = p.items[1].id })
		rejected(p, { type = "sell", service = "grocery", item = id, quantity = 2 })
		rejected(p, { type = "sell", service = "grocery", item = id, quantity = 0 })
	end)

	it("does not spend gold on an overflowing multi-item purchase", function()
		local p = fresh()
		I.add(p, "hp_potion", 98)
		I.add(p, "armor", 29)
		p.position = { x = 14 * 48, y = 4 * 48 }
		rejected(p, { type = "buy", service = "shop", def = "hp_potion", quantity = 2 })
		p = command(p, { type = "buy", service = "shop", def = "hp_potion", quantity = 1 })
		expect.equal(p.gold, 90)
		expect.equal(p.items[2].quantity, 99)
	end)

	it("moves exact character-specific gold and requires a direction", function()
		local p = fresh()
		local other = fresh()
		other.id = "profile_02"
		p.position = { x = 8 * 48, y = 6 * 48 }
		p = command(p, { type = "bank_gold", amount = 37, deposit = true })
		expect.equal(p.gold, 63)
		expect.equal(p.bank.gold, 37)
		p = command(p, { type = "bank_gold", amount = 12, deposit = false })
		expect.equal(p.gold, 75)
		expect.equal(p.bank.gold, 25)
		rejected(p, { type = "bank_gold", amount = 26, deposit = false })
		rejected(p, { type = "bank_gold", amount = 1.5, deposit = true })
		rejected(p, { type = "bank_gold", amount = 1 })
		expect.equal(other.gold, 100)
		expect.equal(other.bank.gold, 0)
	end)

	it("repairs carried or equipped weapons at one gold per missing point", function()
		local p = fresh()
		I.add(p, "wand", 1)
		p.items[1].durability = 0
		p.items[2].durability = 13
		p.position = { x = 19 * 48, y = 6 * 48 }
		p = command(p, { type = "repair", item = p.items[1].id })
		p = command(p, { type = "repair", item = p.items[2].id })
		expect.equal(p.gold, 73)
		expect.equal(p.items[1].durability, 20)
		expect.equal(p.items[2].durability, 20)
		rejected(p, { type = "repair", item = p.items[1].id })
	end)

	it("spends one durability per committed attack and keeps unarmed attacks legal", function()
		local p = battle(fresh())
		p = command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
		p.items[1].durability = 1
		local full = S.power(p)
		local c = {
			type = "act",
			actor = p.id,
			battle = p.battle.id,
			turn = p.battle.turn,
			skill = "normal",
			target = p.battle.enemies[1].id,
		}
		p = command(p, c)
		expect.equal(p.items[1].durability, 0)
		expect.equal(S.power(p), full - 6)
		local retry, duplicate = Cmd.execute(p, c, ENV)
		expect.truthy(duplicate)
		expect.truthy(U.equal(retry, p))
		p = fresh()
		I.equip(p, p.items[1].id)
		p = battle(p)
		p = command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
		expect.truthy(B.eligible(p, B.active(p), "normal"))
		expect.equal(S.power(p), S.current(p).melee)
	end)

	it("rejects full-resource, stale and enemy-turn consumable use without spending", function()
		local p = fresh()
		I.add(p, "hp_potion", 5)
		local id = p.items[2].id
		rejected(p, { type = "use_item", item = id })
		p = battle(p)
		p.pools.hp = 10
		local c = { type = "use_item", item = id, battle = p.battle.id, turn = p.battle.turn, actor = p.id }
		rejected(p, c)
		p = command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
		c.revision = p.revision
		p = command(p, c)
		expect.equal(p.items[2].quantity, 4)
		rejected(p, { type = "use_item", item = id, battle = p.battle.id, turn = p.battle.turn, actor = p.id })
		p = command(p, { type = "act", skill = "defense", actor = p.id, battle = p.battle.id, turn = p.battle.turn })
		p = command(p, { type = "begin_turn", battle = p.battle.id, turn = p.battle.turn })
		rejected(p, { type = "use_item", item = id, battle = p.battle.id, turn = p.battle.turn, actor = p.id })
		rejected(p, { type = "equip", item = p.items[1].id })
		rejected(p, { type = "discard_item", item = id, quantity = 1, confirm = true })
	end)

	it("claims selected entries in offer order and leaves overflow offers available", function()
		local p = rewards(fresh())
		I.add(p, "armor", 29)
		rejected(
			p,
			{ type = "claim", reward = p.pending.id, ids = { "gold_fixture", "silk_fixture", "potion_fixture" } }
		)
		p = command(p, { type = "claim", reward = p.pending.id, ids = { "silk_fixture" } })
		expect.truthy(p.pending.entries[2].claimed)
		expect.falsy(p.pending.entries[1].claimed)
		expect.falsy(p.pending.entries[3].claimed)
		rejected(p, { type = "use_item", item = p.items[1].id })
		rejected(p, { type = "leave_rewards" })
		local a = rewards(fresh())
		local b = U.copy(a)
		a = command(a, { type = "claim", reward = a.pending.id, ids = { "potion_fixture", "silk_fixture" } })
		b = command(b, { type = "claim", reward = b.pending.id, ids = { "silk_fixture", "potion_fixture" } })
		expect.truthy(U.equal(a.items, b.items))
		rejected(a, { type = "claim", reward = a.pending.id, ids = { "gold_fixture", "unknown" } })
		rejected(a, { type = "claim", reward = a.pending.id, ids = { "gold_fixture", "gold_fixture" } })
	end)

	it("requires explicit discard quantity and confirmation, preserving items on failed writes", function()
		local p = fresh()
		I.add(p, "silk", 8)
		local id = p.items[2].id
		rejected(p, { type = "discard_item", item = id, quantity = 3 })
		rejected(p, { type = "discard_item", item = id, confirm = true })
		rejected(p, { type = "discard_item", item = p.items[1].id, quantity = 1, confirm = true })
		local backend = Support.backend()
		local store = Save.new(backend)
		p.revision = 1
		expect.truthy(store:commit(p))
		local before = U.copy(p)
		local candidate = command(p, { type = "discard_item", item = id, quantity = 3, confirm = true })
		backend.mode = "fail"
		expect.falsy(store:commit(candidate))
		expect.truthy(U.equal(store:load(p.id), before))
		expect.truthy(U.equal(p, before))
		backend.mode = "ok"
		expect.truthy(store:commit(candidate))
		expect.equal(I.find(store:load(p.id), id).quantity, 5)
		expect.truthy(store:commit(candidate))
		expect.equal(I.find(store:load(p.id), id).quantity, 5)
	end)

	it("keeps reward claims, gold and items together across a failed write and retry", function()
		local p = rewards(fresh())
		p.revision = 4
		local backend = Support.backend()
		local store = Save.new(backend)
		expect.truthy(store:commit(p))
		local c = { type = "claim", reward = p.pending.id, ids = { "gold_fixture", "silk_fixture" }, finish = true }
		local candidate = command(p, c)
		backend.mode = "fail"
		expect.falsy(store:commit(candidate))
		expect.truthy(U.equal(store:load(p.id), p))
		backend.mode = "ok"
		expect.truthy(store:commit(candidate))
		local reloaded = store:load(p.id)
		expect.equal(reloaded.gold, 112)
		expect.truthy(reloaded.claims.silk_fixture)
		expect.equal(reloaded.phase, "dungeon")
		expect.falsy(reloaded.pending)
		expect.falsy(reloaded.claims.potion_fixture)
		local retry, duplicate = Cmd.execute(reloaded, c, ENV)
		expect.truthy(duplicate)
		expect.truthy(U.equal(retry, reloaded))
	end)

	it("rejects duplicated ownership, sparse lists and invalid frozen equipment", function()
		local p = fresh()
		p.bank.items[1] = U.copy(p.items[1])
		p.bank.items[1].slot = nil
		expect.falsy(V.safe(p))
		p = fresh()
		p.items[20] = p.items[1]
		expect.falsy(V.safe(p))
		p = fresh()
		I.add(p, "silk", 1)
		p.items[2].durability = 20
		expect.falsy(V.safe(p))
		p = battle(fresh())
		p.run.baseline.weapon_id = "missing"
		expect.falsy(V.safe(p))
	end)

	it("previews exact commands without mutating character, quest binding or RNG", function()
		local p = fresh()
		I.add(p, "hp_potion", 2)
		local before = U.copy(p)
		local binding = Q.bound_state()
		local model = Presenter.model(p, { item = p.items[2].id, quantity = 2 })
		expect.falsy(model.actions[1].enabled)
		expect.equal(model.actions[1].reason, "That resource is already full")
		expect.equal(model.detail.quantity, 2)
		expect.truthy(U.equal(before, p))
		expect.equal(Q.bound_state(), binding)
		p = fresh("Giant")
		I.add(p, "bow", 1)
		model = Presenter.model(p, { item = p.items[2].id })
		expect.falsy(model.actions[1].enabled)
		expect.equal(model.actions[1].reason, "Giants cannot equip bows")
		model = Presenter.model(p, { item = p.items[1].id }, "Resolve the save failure first")
		expect.falsy(model.actions[1].enabled)
		expect.equal(model.actions[1].reason, "Resolve the save failure first")
	end)

	it("presents all 60 bank slots in bounded pages with exact gold controls", function()
		local p = fresh()
		I.add(p, "armor", 60, true)
		p.position = { x = 8 * 48, y = 6 * 48 }
		local model = Presenter.model(p, { service = "bank", stored = true, page = 10, amount = 37 })
		expect.equal(#model.rows, 6)
		expect.equal(model.header.pages, 10)
		expect.equal(model.rows[6].id, p.bank.items[60].id)
		expect.equal(model.gold_actions[1].command.amount, 37)
		expect.truthy(model.gold_actions[1].enabled)
		expect.falsy(model.gold_actions[2].enabled)
	end)
end)
