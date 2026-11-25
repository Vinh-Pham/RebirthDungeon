return function(t)
	local Session = require("game.core.session")
	local Storage = require("game.persistence.save")
	local U = require("game.util")
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
		s:dispatch("set_name", { name = "Threshold Witness" })
		assert(s:dispatch("create"))
		s:dispatch("arrive")
		s:dispatch("arrive")
		return s, control
	end
	local function close(s)
		if s.panel then
			s:dispatch("close")
		end
	end
	local function walk(s, x, y)
		close(s)
		local limit = 500
		while s.world.player.x ~= x or s.world.player.y ~= y do
			limit = limit - 1
			assert(limit > 0, "Path failed to converge")
			assert(not (s.combat and s.combat.active), "Unexpected combat while walking clear route")
			local p = s.world:path_to(x, y)
			assert(p[1], "No path to " .. x .. "," .. y)
			local oldroom = s.world.room
			assert(s:dispatch("move", { dx = p[1].x - s.world.player.x, dy = p[1].y - s.world.player.y }), s.message)
			if s.world.room ~= oldroom then
				return
			end
		end
	end
	local function approach(s, place)
		if type(place) == "string" then
			local id = place
			place = nil
			for _, p in ipairs(s.world.landmarks) do
				if p.id == id then
					place = p
					break
				end
			end
			assert(place, "Missing service " .. id)
		end
		for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
			local x, y = place.x + d[1], place.y + d[2]
			if
				s.world:walkable(x, y) and (
					#s.world:path_to(x, y) > 0 or s.world.player.x == x and s.world.player.y == y
				)
			then
				walk(s, x, y)
				return
			end
		end
		error("Cannot approach service")
	end
	local function prepare(s)
		approach(s, "warden")
		assert(s:dispatch("quest_accept"))
		approach(s, "blacksmith")
		assert(s:dispatch("starter_sword"))
		assert(s:dispatch("armor"))
		approach(s, "general_shop")
		assert(s:dispatch("buy_tonic"))
		assert(s:dispatch("buy_tonic"))
		approach(s, "gate")
		assert(s:dispatch("gate_register"))
		approach(s, "dungeon")
		assert(s:dispatch("enter_dungeon"))
	end
	local function combat(s)
		local limit = 4000
		while s.combat and s.combat.active do
			limit = limit - 1
			assert(limit > 0, "Combat timed out")
			local c = s.combat
			if c.health < c.max_health * 0.45 and s.profile.world.tonics > 0 then
				assert(s:dispatch("tonic"))
			end
			local target
			for i, e in ipairs(c.enemies) do
				if e.health > 0 then
					target = i
					break
				end
			end
			if target then
				s:dispatch("target", { index = target })
			end
			if c.stamina >= c:stamina_cost("attack") then
				s:dispatch("attack")
			else
				s:dispatch("defend")
			end
			s:update(0.05)
			assert(s.profile.world.location == "threshold", "The delver was defeated")
		end
		if next(s.profile.world.pending_loot) then
			assert(s:dispatch("take_loot"))
		end
		close(s)
	end
	local function engage(s)
		local limit = 200
		while not (s.combat and s.combat.active) do
			limit = limit - 1
			assert(limit > 0, "Could not reach enemy")
			local e = s.world.enemies[1]
			assert(e, "Room has no enemies")
			local p = s.world:path_to(e.x, e.y)
			assert(p[1], "No route toward enemy")
			s:dispatch("move", { dx = p[1].x - s.world.player.x, dy = p[1].y - s.world.player.y })
		end
	end
	t.test("complete eight-room natural combat treasure quest gate save journey", function()
		local s, control = fresh()
		prepare(s)
		for room = 1, 8 do
			t.eq(s.world.room, room)
			engage(s)
			combat(s)
			t.eq(s.profile.world.threshold_cleared, room)
			t.eq(#s.world.enemies, 0)
			if room == 1 then
				local id = s.profile.id
				local saved = U.copy(s.world.player)
				t.ok(s:dispatch("load", { id = id }))
				t.eq(s.world.room, 1)
				t.eq(s.world.player, saved)
				t.eq(#s.world.enemies, 0)
				local exit = s.world.map.exit
				approach(s, exit)
				local profile = U.copy(s.profile)
				local position = U.copy(s.world.player)
				control.fail = true
				t.eq(s:dispatch("move", { dx = exit.x - s.world.player.x, dy = exit.y - s.world.player.y }), false)
				t.eq(s.world.room, 1)
				t.eq(s.profile, profile)
				t.eq(s.world.player, position)
				t.eq(#s.world.enemies, 0)
				control.fail = false
			end
			local old = room
			walk(s, s.world.map.exit.x, s.world.map.exit.y)
			t.eq(s.world.room, old + 1)
		end
		t.eq(s.world.room, 9)
		local chest = s.world.map.chests[1]
		approach(s, chest)
		t.ok(s:dispatch("chest", { index = 1 }))
		t.eq(s.profile.world.pending_loot, { gold = 60, tonic = 3 })
		t.eq(s:dispatch("chest", { index = 1 }), false)
		t.ok(s:dispatch("take_loot"))
		close(s)
		approach(s, s.world.map.exit)
		t.ok(s:dispatch("interact"))
		t.eq(s.profile.world.location, "spindle_hollow")
		approach(s, "warden")
		t.ok(s:dispatch("quest_reward"))
		local xp = s.profile.experience
		local gold = s.profile.world.gold
		t.eq(s:dispatch("quest_reward"), false)
		t.eq(s.profile.world.gold, gold)
		t.eq(s.profile.experience, xp)
		approach(s, "gate")
		t.ok(s:dispatch("gate_register"))
		t.ok(s:dispatch("gate_travel", { town = "lantern_rest" }))
		local id = s.profile.id
		t.ok(s:dispatch("load", { id = id }))
		t.eq(s.profile.world.location, "lantern_rest")
		t.eq(s.profile.world.quest, 3)
		t.eq(s.profile.world.gates, { "lantern_rest", "spindle_hollow" })
		t.ok(s.profile.experience > 0)
		t.eq(s.inventory:serialize().equipped, "ashen_arcblade")
		t.ok(s.profile.world.armor_owned)
		t.ok(s.profile.world.skills.combat_mastery)
		t.eq(s.profile.world.pending_loot, {})
	end)
end
