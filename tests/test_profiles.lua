return function(t)
	local P = require("game.model.profile")
	local S = require("game.model.character_skills")
	local Store = require("game.services.storage")
	local Stats = require("game.model.character_stats")
	t.test("profile defaults are independent", function()
		local a = P.new({ name = "A" })
		local b = P.new({ name = "B" })
		a.world.gold = 0
		t.eq(b.world.gold, 24)
		t.eq(b.schema_version, 1)
	end)
	t.test("invalid numeric values and gate registration rejected", function()
		t.ok(not P.validate_world({ gold = 0 / 0 }))
		t.ok(not P.validate_world({ gates = { "spindle_hollow" } }))
		t.ok(not P.new({ name = "Bad", race = 3 }))
	end)
	t.test("failed save retains prior character", function()
		local data = {}
		local fail = false
		local store = Store.new({
			read = function(k)
				return data[k]
			end,
			write = function(k, v)
				if fail then
					return false
				end
				data[k] = v
				return true
			end,
		})
		local p = store:create({ name = "Test" })
		t.ok(p)
		fail = true
		t.ok(not store:update({ gold = 100 }))
		t.eq(store:load_selected().world.gold, 24)
	end)
	t.test("character level thresholds and stat aliases", function()
		t.eq(S.level_for_experience(0), 1)
		t.eq(S.level_for_experience(100), 2)
		local p = P.new({ name = "Human" })
		local s = Stats.calculate(p)
		t.eq(s.life, 115)
		t.eq(s.max_health, s.life)
		t.eq(s.damage_min, 8)
	end)
	t.test("unknown world updates rejected", function()
		local p = P.new({ name = "Test" })
		t.ok(not P.update(p, { unknown = 1 }))
		t.eq(p.world.gold, 24)
	end)
	t.test("cosmetics do not affect stats", function()
		local a = P.new({ name = "A" })
		local b = require("game.util").copy(a)
		b.hair = 11
		b.skin = 3
		t.eq(Stats.calculate(a), Stats.calculate(b))
	end)
	t.test("weapon bonus matches unarmed attributes", function()
		local a = Stats.calculate({})
		local b = Stats.calculate({}, { damage_min = 15, damage_max = 25 })
		t.eq(b.damage_min - a.damage_min, 11)
		t.eq(b.damage_max - a.damage_max, 21)
		t.near(a.critical - b.critical, 10, 0.001)
	end)
	t.test("all skill catalogs include ranks and valid costs", function()
		local n = 0
		for id, skill in pairs(S.catalog()) do
			n = n + 1
			for _, rank in ipairs({ "F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1" }) do
				local r = S.rank_data(id, rank)
				t.ok(r.rank)
				t.ok(r.ap_cost >= 0)
			end
		end
		t.eq(n, 11)
	end)
	t.test("starting skills and school listing", function()
		local p = P.new({ name = "Test" })
		t.eq(#S.entries(p), 2)
		t.eq(#S.entries(p, true), 11)
		t.eq(S.available_ap(p), 0)
		for _, r in ipairs(S.entries(p, true)) do
			t.ok(not r.can_learn)
		end
	end)
	t.test("training caps then resets on novice advance", function()
		local p = P.new({ name = "Test" })
		p.world.skills = S.train(p.world, { "attack", "attack", "attack" })
		t.eq(p.world.skills.combat_mastery.training.attack, 2)
		local r = S.advance(p, "combat_mastery")
		t.ok(r.changes)
		t.eq(r.changes.skills.combat_mastery.rank, "F")
		t.eq(r.changes.skills.combat_mastery.training, {})
	end)
	t.test("school study does not replay", function()
		local p = P.new({ name = "Test" })
		local r = S.study(p.world, "defense")
		t.ok(r.changes)
		p.world.skills = r.changes.skills
		t.ok(not S.study(p.world, "defense").changes)
		t.ok(S.advance(p, "defense").changes)
	end)
	t.test("starting talent and age restrictions", function()
		t.ok(not P.new({ name = "A", age = 18 }))
		t.ok(not P.new({ name = "A", talent = 2 }))
		t.ok(not P.new({ name = "A", race = 1, talent = 13 }))
		t.ok(not P.new({ name = "A", race = 2, talent = 3 }))
		t.ok(P.new({ name = "A", race = 1, talent = 0 }))
	end)
	t.test("treasure and map state invariants", function()
		t.ok(not P.validate_world({ threshold_treasure_claimed = true }))
		t.ok(not P.validate_world({ threshold_treasure_chest = 2 }))
		local w = P.validate_world({ map_position = { location = "threshold", x = 1, y = 1 } })
		t.eq(w.map_position, {})
	end)
	t.test("invalid materials supplies and loot rejected", function()
		t.ok(not P.validate_world({ town_materials = { bad = 1 } }))
		t.ok(not P.validate_world({ pending_loot = { gold = -1 } }))
		t.ok(not P.validate_world({ shop_supplies = { arrow = 0 } }))
		t.ok(not P.validate_world({ bank_gold = 20000001 }))
	end)

	t.test("melee random rolls bounded", function()
		local s = Stats.calculate({}, { damage_min = 3, damage_max = 25 })
		for i = 1, 200 do
			local v = Stats.roll_melee(s)
			t.ok(v >= s.damage_min and v <= s.damage_max)
		end
	end)

	t.test("appearance combinations survive normalization", function()
		for race = 0, 2 do
			for age = 10, 17 do
				for gender = 0, 2 do
					local p = P.new({
						name = "Delver",
						race = race,
						age = age,
						gender = gender,
						hair = 11,
						hair_color = 9,
						skin = 3,
						eyes = 2,
						eye_color = 9,
						face = 2,
					})
					t.ok(p)
					t.eq(P.normalize(p), p)
				end
			end
		end
	end)

	t.test("all talent bonuses grow by configured category", function()
		local D = require("game.model.character_data")
		for talent = 0, 23 do
			local p = { talent = talent, experience = 0 }
			local first = Stats.calculate(p)
			p.experience = 100
			local second = Stats.calculate(p)
			t.ok(second.life >= first.life)
			t.ok(second.stamina >= first.stamina)
			t.eq(second.level, 2)
		end
	end)
	t.test("manifest failure removes unlisted profile", function()
		local d = {}
		local store = Store.new({
			read = function(k)
				return d[k]
			end,
			write = function(k, v)
				if k == "characters" then
					return false
				end
				d[k] = v
				return true
			end,
			remove = function(k)
				d[k] = nil
			end,
		})
		local p = P.new({ name = "Test" })
		t.ok(not store:create(p))
		t.eq(d[p.id], nil)
	end)

	t.test("skill training validation rejects fractional values", function()
		t.ok(not S.normalize({ combat_mastery = { rank = "novice", training = { attack = 0.5 } } }))
		t.ok(not S.normalize({ combat_mastery = { rank = "novice", training = 5 } }))
		local n = S.normalize({ combat_mastery = { rank = "novice", training = { attack = 100 } } })
		t.eq(n.combat_mastery.training.attack, 2)
	end)
	t.test("tree harvest invalid records are discarded", function()
		local w = P.validate_world({
			tree_harvests = { ["lantern_rest:2:3"] = { count = 2, next_at = 100 }, bad = { count = 2, next_at = 100 } },
		})
		t.eq(w.tree_harvests, { ["lantern_rest:2:3"] = { count = 2, next_at = 100 } })
	end)
	local function backend()
		local state = {}
		local flags = {}
		local opts = {
			read = function(key)
				if flags.read == key then
					error("unreadable")
				end
				return state[key]
			end,
			write = function(key, value)
				if flags.write == key then
					return false
				end
				state[key] = require("game.util").copy(value)
				return true
			end,
			remove = function(key)
				if flags.remove then
					error("cannot remove")
				end
				state[key] = nil
				return true
			end,
		}
		return state, flags, opts
	end
	t.test("restart lists and selects recovered character backup", function()
		local data, _, opts = backend()
		local store = Store.new(opts)
		local p = assert(store:create({ name = "Recovered" }))
		assert(store:update({ gold = 70 }))
		local backup = require("game.util").copy(data[p.id .. ".backup"])
		data[p.id] = "corrupt"
		local restarted = Store.new(opts)
		t.eq(#restarted:list(), 1)
		t.ok(restarted:select(p.id))
		t.eq(restarted:load_selected(), backup)
		t.ok(restarted:update({ gold = 99 }))
		t.eq(data[p.id .. ".backup"], backup)
		t.eq(restarted:load_selected().world.gold, 99)
	end)
	t.test("new characters have recoverable initial profile and manifest mirrors", function()
		local data, _, opts = backend()
		local store = Store.new(opts)
		local p = assert(store:create({ name = "Newest" }))
		t.eq(data.characters, data["characters.backup"])
		t.eq(data[p.id], data[p.id .. ".backup"])
		data.characters = false
		data[p.id] = false
		local restarted = Store.new(opts)
		t.eq(#restarted:list(), 1)
		t.ok(restarted:select(p.id))
		t.eq(restarted:load_selected().world.gold, 24)
	end)
	t.test("malformed and unreadable manifests fall back without losing ids", function()
		local data, flags, opts = backend()
		local store = Store.new(opts)
		local first = assert(store:create({ name = "First" }))
		local second = assert(store:create({ name = "Second" }))
		local original = require("game.util").copy(data.characters)
		data.characters = { ids = "malformed" }
		local recovered = Store.new(opts)
		t.eq(#recovered:list(), 2)
		flags.read = "characters"
		t.eq(#Store.new(opts):list(), 2)
		flags.read = nil
		t.ok(recovered:select(second.id))
		t.ok(recovered:update({ gold = 30 }))
		t.eq(data.characters, original)
		t.eq(data["characters.backup"], original)
		t.ok(recovered:select(first.id))
	end)
	t.test("failed new manifest commit preserves existing index and removes orphan", function()
		local data, flags, opts = backend()
		local store = Store.new(opts)
		local p = assert(store:create({ name = "First" }))
		local before = require("game.util").copy(data.characters)
		local n = P.new({ name = "Rejected" })
		flags.write = "characters"
		t.ok(not store:create(n))
		flags.write = nil
		t.eq(data.characters, before)
		t.eq(data["characters.backup"], before)
		t.eq(data[n.id], nil)
		t.eq(data[n.id .. ".backup"], nil)
		t.eq(#Store.new(opts):list(), 1)
		t.ok(Store.new(opts):select(p.id))
	end)

	t.test("corrupt scalar ids and remove exceptions never crash create rollback", function()
		local data, flags, opts = backend()
		local p = P.new({ name = "Existing" })
		data[p.id] = 42
		local ok, result = pcall(function()
			return Store.new(opts):create(p)
		end)
		t.ok(ok)
		t.eq(result, nil)
		data[p.id] = nil
		flags.write = "characters"
		flags.remove = true
		ok, result = pcall(function()
			return Store.new(opts):create(p)
		end)
		t.ok(ok)
		t.eq(result, nil)
	end)
end
