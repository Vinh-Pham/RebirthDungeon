return function(t)
	local I = require("game.systems.inventory")
	local E = require("game.systems.equipment")
	local Economy = require("game.systems.economy")
	local Environment = require("game.systems.environment")
	local Loot = require("game.systems.loot")
	t.test("inventory rollback on failed persistence", function()
		local i = assert(I.new({}, function()
			return false
		end))
		local ok = i:take("ashen_arcblade")
		t.ok(not ok)
		t.eq(i:serialize().placements, {})
	end)
	t.test("inventory rejects overlap and restores equipment", function()
		local i = assert(I.new({}))
		t.ok(i:take("ashen_arcblade"))
		t.ok(i:equip("ashen_arcblade"))
		t.eq(i:serialize().equipped, "ashen_arcblade")
		t.ok(i:unequip())
		t.ok(not i:move("ashen_arcblade", 8, 0))
	end)
	t.test("durability repair cost and breakage", function()
		local i = { id = "x", max_durability = 10000 }
		local w = { gold = 20, equipment_durability = { x = 8999 } }
		t.eq(E.repair_cost(w, i, true), 4)
		t.eq(E.repair(w, i, true).equipment_durability.x, 10000)
	end)
	t.test("bank and item actions retain unrelated state", function()
		local w = { gold = 20, bank_gold = 0, tonics = 1, health = 10 }
		t.eq(Economy.bank(w, 5, true).changes.gold, 15)
		t.eq(w.gold, 20)
		t.eq(Economy.use_item("tonic", w, 10, 50).changes.health, 40)
	end)
	t.test("loot overflow stays pending", function()
		local c = Loot.collect({ gold = 999, pending_loot = { gold = 8 }, town_materials = {} }, { "gold" }, 5544, 1000)
		t.eq(c.gold, 1000)
		t.eq(c.pending_loot.gold, 7)
	end)
	t.test("gold boundaries preserve stack anchors", function()
		local i = assert(I.new({ gold = 1001, town_materials = {} }))
		local a = i:stack_items()
		t.eq(#a, 2)
		t.eq(a[1].count, 1000)
		t.eq(a[2].count, 1)
		t.ok(a[1].cell[1] ~= a[2].cell[1])
		t.ok(i:move_item(a[1].cell, { 4, 3 }))
		local w = { gold = 1001, town_materials = {}, gear_inventory = i:serialize() }
		local j = assert(I.new(w))
		t.eq(j:stack_items()[1].cell, { 4, 3 })
	end)
	t.test("pouch purchase fills and survives serialization", function()
		local i = assert(I.new({ gold = 15000, town_materials = {} }))
		t.ok(i:purchase_pouch("gold_pouch_small", 1760))
		t.eq(i.world.gold, 13240)
		t.eq(i:capacity("gold"), 62000)
		local sum, pouch = 0, 0
		for _, v in ipairs(i:stack_items()) do
			sum = sum + v.count
			if v.id == "gold_pouch_small" then
				pouch = pouch + 1
				t.eq(v.count, 10000)
			end
		end
		t.eq(sum, 13240)
		t.eq(pouch, 1)
		local w = { gold = 13240, town_materials = {}, gear_inventory = i:serialize() }
		local j = assert(I.new(w))
		t.eq(j:serialize(), i:serialize())
	end)
	t.test("failed pouch purchase never debits gold", function()
		local w = { gold = 100, town_materials = {} }
		local i = assert(I.new(w))
		local before = i:serialize()
		t.ok(not i:purchase_pouch("gold_pouch_small", 1760))
		t.eq(i:serialize(), before)
		t.eq(i.world.gold, 100)
	end)
	t.test("full gold grid blocks equipment and withdrawals", function()
		local w = { gold = 56000, bank_gold = 1000, town_materials = {} }
		local i = assert(I.new(w))
		t.eq(#i:stack_items(), 56)
		t.ok(not i:take("ashen_arcblade"))
		t.eq(Economy.bank(w, 1, false).changes, {})
		local ch = Economy.bank(w, 1000, true).changes
		t.eq(ch.gold, 55000)
		t.eq(ch.bank_gold, 2000)
	end)
	t.test("cobweb stack quantities and capacity", function()
		local i = assert(I.new({ gold = 0, town_materials = { cobweb = 100 } }))
		local a = i:stack_items()
		t.eq(#a, 2)
		t.eq(a[1].count, 99)
		t.eq(a[2].count, 1)
		t.eq(i:capacity("gold"), 54000)
	end)
	t.test("fractional and overlapping legacy gear rejected", function()
		local i = I.new({ placements = { ashen_arcblade = { 0.5, 0 } }, equipped = "" })
		t.eq(i, nil)
		local defs = require("game.data.catalog").swords()
		local other = defs[2].id
		local placements = { ashen_arcblade = { 0, 0 } }
		placements[other] = { 0, 0 }
		t.eq(I.new({ placements = placements, equipped = "" }), nil)
	end)
	t.test("equipped gear cannot duplicate bag ownership", function()
		t.eq(I.new({ placements = { ashen_arcblade = { 0, 0 } }, equipped = "ashen_arcblade" }), nil)
	end)
	t.test("bank validates maximum and negative transfers", function()
		local w = { gold = 200, bank_gold = 20000000, town_materials = {} }
		t.eq(Economy.bank(w, 1, true).changes, {})
		t.eq(Economy.bank(w, 0, false).changes, {})
		t.eq(Economy.bank(w, -1, true).changes, {})
	end)
	t.test("firewood exhausts five pieces and regrows off map", function()
		local w = { town_materials = { firewood = 0 }, tree_harvests = {} }
		for n = 1, 5 do
			local r = Environment.harvest(w, "lantern_rest:4:5", 100)
			w.town_materials = r.changes.town_materials
			w.tree_harvests = r.changes.tree_harvests
		end
		t.eq(w.town_materials.firewood, 5)
		t.eq(Environment.harvest(w, "lantern_rest:4:5", 100).changes, {})
		t.eq(Environment.tree_status(w, "lantern_rest:4:5", 400).count, 1)
		t.eq(Environment.tree_status(w, "lantern_rest:4:5", 1600).count, 5)
	end)
	t.test("crafting conserves ingredients and heals bounded life", function()
		local w =
			{ gold = 10, health = 9, town_materials = { grain = 1, flour = 0, fish = 1, fiber = 0, thread = 0, cloth = 0 } }
		local r = Economy.perform("mill", w, 10)
		t.eq(r.changes.town_materials.grain, 0)
		t.eq(r.changes.town_materials.flour, 1)
		t.eq(w.town_materials.grain, 1)
		t.eq(Economy.perform("cook_fish", w, 10).changes.health, 10)
		t.eq(Economy.perform("spin", w, 10).changes, {})
	end)
	t.test("unknown loot is excluded while pending balances are conserved", function()
		t.eq(Loot.combine({ gold = 3 }, { alien = 2, gold = 4 }), { gold = 7 })
		t.eq(
			Loot.collect({ gold = 1000, pending_loot = { gold = 4 }, town_materials = {} }, { "gold" }, 5544, 1000),
			{}
		)
	end)
	t.test("integer precision wear and legacy armor defense", function()
		local sword = { id = "test_sword", family = "light" }
		local w = { gold = 10, armor_owned = true }
		local wear = E.wear(w, sword, 25, true)
		t.eq(wear.test_sword, 9975)
		t.eq(wear.riveted_jack, 14975)
		t.eq(w.equipment_durability, nil)
		w.equipment_durability = { test_sword = 0, riveted_jack = 0 }
		t.eq(E.usable_weapon(w, sword), {})
		t.eq(E.armor_defense(w), 0)
		t.eq(E.repair(w, sword, false).gold, 8)
		t.eq(E.repair(w, sword, true), {})
	end)
	t.test("firewood fractional intervals remain and different trees independent", function()
		local w = { town_materials = {}, tree_harvests = {} }
		local function harvest(now)
			local ch = Environment.harvest(w, "tree", now).changes
			w.town_materials = ch.town_materials
			w.tree_harvests = ch.tree_harvests
		end
		harvest(1000)
		harvest(1100)
		t.eq(Environment.tree_status(w, "tree", 1299).count, 3)
		harvest(1350)
		t.eq(w.tree_harvests.tree, { count = 3, next_at = 1600 })
		t.eq(Environment.tree_status(w, "tree", 1600).count, 4)
		t.eq(Environment.tree_status(w, "other", 1350).count, 5)
	end)
	t.test("supply packs stack and charge per pack", function()
		local w = { gold = 32000, shop_supplies = {}, town_materials = {} }
		local a = Economy.shop_buy(w, "arrow_20").changes
		w.gold = a.gold
		w.shop_supplies = a.shop_supplies
		local b = Economy.shop_buy(w, "arrow_100").changes
		t.eq(b.shop_supplies.arrow, 120)
		t.eq(b.gold, 31910)
	end)
	t.test("failed shop purchase preserves world and equipment", function()
		local w = { gold = 0, shop_supplies = {}, town_materials = {} }
		local before = require("game.util").copy(w)
		local id
		for _, c in ipairs(require("game.data.catalog").shop().categories) do
			for _, i in ipairs(c.items) do
				if i.slot == "main_hand" then
					id = i.id
					break
				end
			end
		end
		t.ok(id ~= nil)
		t.eq(Economy.shop_buy(w, id).changes, {})
		t.eq(w, before)
	end)
	t.test("shop equipment cannot be purchased twice", function()
		local w = { gold = 32000, shop_supplies = {}, town_materials = {} }
		local id
		for _, c in ipairs(require("game.data.catalog").shop().categories) do
			for _, i in ipairs(c.items) do
				if i.slot == "armor" then
					id = i.id
					break
				end
			end
		end
		local a = Economy.shop_buy(w, id).changes
		w.gold = a.gold
		w.gear_inventory = a.gear_inventory
		t.eq(Economy.shop_buy(w, id).changes, {})
	end)
	t.test("two-handed weapon moves shield into bag transactionally", function()
		local defs = require("game.data.catalog").swords()
		local heavy
		for _, v in ipairs(defs) do
			if v.hands == 2 then
				heavy = v.id
				break
			end
		end
		local shield
		for _, c in ipairs(require("game.data.catalog").shop().categories) do
			for _, v in ipairs(c.items) do
				if v.slot == "off_hand" then
					shield = v.id
					break
				end
			end
		end
		if not heavy or not shield then
			return
		end
		local i = assert(I.new({}))
		t.ok(i:take(shield))
		t.ok(i:equip(shield, "off_hand"))
		t.ok(i:take(heavy))
		t.ok(i:equip(heavy))
		t.eq(i:serialize().slots.off_hand, nil)
		t.ok(i:serialize().placements[shield] ~= nil)
		t.ok(not i:equip(shield, "off_hand"))
	end)
	t.test("pouch save failure preserves gold anchors and pouches", function()
		local i = assert(I.new({ gold = 15000, town_materials = {} }, function()
			return false
		end))
		local before = i:serialize()
		t.ok(not i:purchase_pouch("gold_pouch_small", 1760))
		t.eq(i.world.gold, 15000)
		t.eq(i:serialize(), before)
	end)
	t.test("unknown slot and equipped duplicate rejected", function()
		t.eq(I.new({ placements = {}, equipped = "", slots = { mystery = "ashen_arcblade" } }), nil)
	end)
	t.test("normalized gear respects world stack balances", function()
		local gear = { placements = {}, equipped = "" }
		local normalized = assert(I.normalize(gear, { gold = 2001, town_materials = { cobweb = 100 } }))
		t.eq(#normalized.stack_positions.gold, 3)
		t.eq(#normalized.stack_positions.cobweb, 2)
	end)
	t.test("tonic overflow stays pending while other loot can be collected", function()
		local Loot = require("game.systems.loot")
		local world = { tonics = 1999999999, gold = 0, pending_loot = { tonic = 2, gold = 1 } }
		local changes = Loot.collect(world, { "tonic", "gold" })
		t.eq(changes.tonics, nil)
		t.eq(changes.gold, 1)
		t.eq(changes.pending_loot.tonic, 2)
		t.eq(world.pending_loot.tonic, 2)
		world.pending_loot.tonic = 1
		changes = Loot.collect(world, { "tonic" })
		t.eq(changes.tonics, 2000000000)
		t.eq(changes.pending_loot.tonic, nil)
	end)
end
