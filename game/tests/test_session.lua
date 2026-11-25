return function(t)
	local U = require("game.util")
	local Session = require("game.core.session")
	local Storage = require("game.persistence.save")
	local function fresh()
		local memory, control = {}, { fail = false }
		local store = Storage.new({
			read = function(k)
				return U.copy(memory[k])
			end,
			write = function(k, v)
				if control.fail then
					return false
				end
				memory[k] = U.copy(v)
				return true
			end,
			remove = function(k)
				memory[k] = nil
				return true
			end,
		})
		local s = Session.new({
			store = store,
			clock = function()
				return 1000
			end,
		})
		s.forms.seed = 42
		s:dispatch("set_name", { name = "Signal Keeper" })
		assert(s:dispatch("create"))
		s:dispatch("arrive")
		s:dispatch("arrive")
		return s, control, store
	end
	local function approach(s, id)
		s.panel = nil
		for _, p in ipairs(s.world.landmarks) do
			if p.id == id then
				for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
					local x, y = p.x + d[1], p.y + d[2]
					if s.world:walkable(x, y) then
						local path = s.world:path_to(x, y)
						if #path > 0 or s.world.player.x == x and s.world.player.y == y then
							for _, cell in ipairs(path) do
								assert(s:move(cell.x - s.world.player.x, cell.y - s.world.player.y))
							end
							return p
						end
					end
				end
			end
		end
		error("No reachable service " .. id)
	end
	local function enter(s)
		approach(s, "dungeon")
		t.ok(s:dispatch("enter_dungeon"))
		t.eq(s.profile.world.location, "threshold")
		return s
	end
	local function fight(s)
		enter(s)
		t.ok(s:start_combat())
		return s.combat
	end
	t.test("session creates and switches independent saved characters", function()
		local s, _, store = fresh()
		local first = s.profile.id
		t.eq(s.screen, "world")
		t.ok(s:commit({ gold = 40 }))
		s:dispatch("new_character")
		s:dispatch("set_name", { name = "Second Keeper" })
		t.ok(s:dispatch("create"))
		local second = s.profile.id
		t.ok(first ~= second)
		t.eq(s.profile.world.gold, 24)
		t.ok(s:dispatch("select_character", { id = first }))
		t.eq(s.profile.world.gold, 40)
		t.eq(#store:list(), 2)
	end)
	t.test("session modal consumes movement without saving a step", function()
		local s = fresh()
		local p = U.copy(s.world.player)
		s:dispatch("inventory")
		t.eq(s:dispatch("move", { dx = 1, dy = 0 }), false)
		t.eq(s.world.player, p)
		s:dispatch("close")
		t.eq(s.panel, nil)
	end)
	t.test("session services and lessons require physical proximity", function()
		local s = fresh()
		local profile = U.copy(s.profile)
		for _, id in ipairs({ "starter_sword", "buy_tonic", "heal", "quest_accept", "school" }) do
			t.eq(s:dispatch(id), false)
		end
		t.eq(s:dispatch("study_skill", { id = "combat_mastery" }), false)
		t.eq(s.profile, profile)
		approach(s, "school")
		t.ok(s:dispatch("school"))
		t.eq(s.panel, "skills")
	end)
	t.test("session combat queue replacement and tonic retain gauge", function()
		local s = fresh()
		s:commit({ tonics = 1 })
		local c = fight(s)
		c.health = math.max(1, c.max_health - 10)
		c.player_gauge = 0.4
		t.ok(s:dispatch("attack"))
		t.ok(s:dispatch("defend"))
		t.eq(c.queued_action, "defend")
		t.ok(s:dispatch("tonic"))
		t.eq(c.player_gauge, 0.4)
		t.eq(s.profile.world.tonics, 0)
		s:update(1.5)
		t.eq(c.player_gauge, 0)
	end)
	t.test("session failed combat save restores encounter and character state", function()
		local s, control = fresh()
		local c = fight(s)
		c.player_gauge = 1
		local state = c:snapshot()
		local profile = U.copy(s.profile)
		control.fail = true
		t.eq(s:dispatch("attack"), false)
		t.eq(c:snapshot(), state)
		t.eq(s.profile, profile)
		control.fail = false
		t.ok(s:dispatch("attack"))
	end)
	t.test("session victory grants progression rewards exactly once", function()
		local s = fresh()
		local c = fight(s)
		for _, e in ipairs(c.enemies) do
			e.health = 1
		end
		local xp = s.profile.experience
		c.character.learned_skills = nil
		c.player_gauge = 1
		t.ok(s:dispatch("windmill"))
		t.ok(s.profile.experience > xp)
		t.eq(s.profile.world.threshold_cleared, 1)
		local earned = s.profile.experience
		t.eq(s:dispatch("attack"), false)
		t.eq(s.profile.experience, earned)
	end)
	t.test("session defeat resets run and returns to originating town", function()
		local s = fresh()
		local c = fight(s)
		local run = s.profile.world.threshold_run
		c.health = 1
		c.enemies[1].intent = "smash"
		c.enemies[1].gauge = 1
		s:update(0.001)
		t.eq(s.profile.world.location, "lantern_rest")
		t.eq(s.profile.world.threshold_run, run + 1)
		t.eq(s.profile.world.threshold_cleared, 0)
		t.eq(s.profile.world.health, -1)
		t.eq(s.profile.world.pending_loot, {})
	end)
	t.test("session Moon Gate registration is in person and travel works away from gates", function()
		local s = fresh()
		t.eq(s:dispatch("gate_register"), false)
		approach(s, "gate")
		t.ok(s:dispatch("gate_register"))
		t.eq(s.profile.world.gates, { "lantern_rest" })
		enter(s)
		t.ok(s:dispatch("gate_travel", { town = "lantern_rest" }))
		t.eq(s.profile.world.location, "lantern_rest")
		t.eq(s:dispatch("gate_travel", { town = "spindle_hollow" }), false)
	end)
	t.test("session starter equipment and rejected equipment save are transactional", function()
		local s, control = fresh()
		approach(s, "blacksmith")
		t.ok(s:dispatch("starter_sword"))
		t.eq(s.inventory:serialize().equipped, "ashen_arcblade")
		local profile = U.copy(s.profile)
		control.fail = true
		t.eq(s:dispatch("unequip", { slot = "main_hand" }), false)
		t.eq(s.profile, profile)
		control.fail = false
		t.ok(s:dispatch("unequip", { slot = "main_hand" }))
	end)
	t.test("session position and pending loot restore after character reload", function()
		local s = fresh()
		approach(s, "gate")
		local p = U.copy(s.world.player)
		t.ok(s:commit({ pending_loot = { gold = 3, cobweb = 1 } }))
		local id = s.profile.id
		t.ok(s:dispatch("load", { id = id }))
		t.eq(s.world.player, p)
		t.eq(s.panel, "loot")
		t.eq(s.profile.world.pending_loot, { gold = 3, cobweb = 1 })
		t.ok(s:dispatch("take_loot"))
		t.eq(s.profile.world.pending_loot, {})
		t.eq(s.profile.world.gold, 27)
	end)
	t.test("session town dungeon victory loot save journey", function()
		local s = fresh()
		approach(s, "warden")
		t.ok(s:dispatch("quest_accept"))
		approach(s, "blacksmith")
		t.ok(s:dispatch("starter_sword"))
		local c = fight(s)
		for _, e in ipairs(c.enemies) do
			e.health = 1
		end
		for _ = 1, #c.enemies do
			c.player_gauge = 1
			t.ok(s:dispatch("attack"))
		end
		t.eq(s.profile.world.threshold_cleared, 1)
		if next(s.profile.world.pending_loot) then
			t.ok(s:dispatch("take_loot"))
		end
		s:dispatch("close")
		t.ok(s:dispatch("leave_dungeon"))
		local id = s.profile.id
		t.ok(s:dispatch("load", { id = id }))
		t.eq(s.profile.world.location, "lantern_rest")
		t.eq(s.profile.world.quest, 1)
		t.ok(s.profile.experience > 0)
		t.eq(s.inventory:serialize().equipped, "ashen_arcblade")
	end)
	t.test("session failed victory save cannot award XP loot or room progress", function()
		local s, control = fresh()
		local c = fight(s)
		for _, e in ipairs(c.enemies) do
			e.health = 1
		end
		c.player_gauge = 1
		local before = c:snapshot()
		local profile = U.copy(s.profile)
		control.fail = true
		t.eq(s:dispatch("attack"), false)
		t.eq(c:snapshot(), before)
		t.eq(s.profile, profile)
		t.eq(s.world.world.threshold_cleared, 0)
		control.fail = false
		for _ = 1, #c.enemies do
			c.player_gauge = 1
			t.ok(s:dispatch("attack"))
		end
		t.ok(s.profile.experience > profile.experience)
	end)
	t.test("session failed gate registration restores world as well as profile", function()
		local s, control = fresh()
		approach(s, "gate")
		local before = U.copy(s.profile)
		control.fail = true
		t.eq(s:dispatch("gate_register"), false)
		t.eq(s.profile, before)
		t.eq(s.world.world.gates, before.world.gates)
	end)
	t.test("session gate registrations never leak to another character", function()
		local s = fresh()
		approach(s, "gate")
		t.ok(s:dispatch("gate_register"))
		local first = s.profile.id
		s:dispatch("new_character")
		s:dispatch("set_name", { name = "Gate Stranger" })
		t.ok(s:dispatch("create"))
		t.eq(s.profile.world.gates, {})
		t.eq(s:dispatch("gate_travel", { town = "lantern_rest" }), false)
		t.ok(s:dispatch("load", { id = first }))
		t.eq(s.profile.world.gates, { "lantern_rest" })
	end)

	t.test("session failed exploration save cannot advance enemy world turn", function()
		local s, control = fresh()
		enter(s)
		local enemies = U.copy(s.world.enemies)
		local rng = s.world.rng:state()
		local player = U.copy(s.world.player)
		local profile = U.copy(s.profile)
		local chosen
		for _, d in ipairs({ { 1, 0 }, { 0, -1 }, { 0, 1 }, { -1, 0 } }) do
			if s.world:walkable(player.x + d[1], player.y + d[2]) then
				chosen = d
				break
			end
		end
		t.ok(chosen)
		control.fail = true
		t.eq(s:move(chosen[1], chosen[2]), false)
		t.eq(s.world.player, player)
		t.eq(s.profile, profile)
		t.eq(s.world.enemies, enemies)
		t.eq(s.world.rng:state(), rng)
	end)
end
