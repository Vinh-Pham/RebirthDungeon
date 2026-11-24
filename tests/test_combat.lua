return function(t)
	local Combat = require("game.model.combat")
	local function fresh(n)
		local enemies = {}
		for i = 1, n or 1 do
			enemies[i] = { name = "Spider", health = 50, damage_min = 8, damage_max = 8 }
		end
		return Combat.new({ player = { life = 100, stamina = 50, damage_min = 4, damage_max = 4, critical = 0 }, enemies = enemies })
	end
	t.test("independent ATB clocks and command replacement", function()
		local c = fresh()
		c:queue("smash")
		c:queue("attack")
		c:advance(2.5)
		t.eq(c.player_gauge, 0)
		t.eq(c.enemies[1].health, 48)
		t.ok(c.enemies[1].gauge > 0)
	end)
	t.test("items preserve readiness", function()
		local c = fresh()
		c.health = 50
		c.player_gauge = 0.7
		c:use_item("tonic", 20)
		t.eq(c.health, 70)
		t.eq(c.player_gauge, 0.7)
	end)
	t.test("normal attack interrupts prepared Smash", function()
		local c = fresh()
		c.enemies[1].intent = "smash"
		c.enemies[1].gauge = 0.8
		c.player_gauge = 1
		c:act("attack")
		t.eq(c.enemies[1].gauge, 0)
		t.eq(c.enemies[1].intent, "defend")
	end)
	t.test("Smash bypasses guard", function()
		local c = fresh()
		c.player_gauge = 1
		c:act("smash")
		t.eq(c.enemies[1].health, 43)
	end)
	t.test("defend halves incoming normal hit", function()
		local c = fresh()
		c.player_gauge = 1
		c:act("defend")
		c.enemies[1].intent = "attack"
		c.enemies[1].gauge = 1
		c:act_enemy(1)
		t.eq(c.health, 96)
	end)
	t.test("group remains active until all enemies die", function()
		local c = fresh(2)
		c.enemies[1].health = 1
		c.player_gauge = 1
		c:act("smash")
		t.ok(c.active)
		t.ok(not c.won)
		t.eq(c.enemies[2].charge_seconds, 5.15)
	end)
	t.test("snapshot restores full independent state", function()
		local c = fresh(2)
		c:queue("attack")
		local s = c:snapshot()
		c:advance(10)
		c:restore(s)
		t.eq(c:snapshot(), s)
	end)
	t.test("invalid actions cannot mutate state", function()
		local c = fresh()
		local s = c:snapshot()
		t.eq(c:queue("invalid"), false)
		t.eq(c:snapshot(), s)
	end)
	t.test("nine direct melee outcome combinations", function()
		local a = { "attack", "defend", "smash" }
		for _, p in ipairs(a) do
			for _, e in ipairs(a) do
				local r = Combat.resolve(p, e, 4)
				t.ok(r.outgoing >= 0)
				t.ok(r.incoming >= 0)
				if p == "smash" and e == "defend" then
					t.eq(r.outgoing, 7)
				end
				if p == "attack" and e == "smash" then
					t.eq(r.incoming, 0)
				end
			end
		end
	end)
	t.test("large elapsed gaps preserve all readiness boundaries", function()
		local a = fresh()
		local b = fresh()
		a.health = 1000
		b.health = 1000
		a:queue("attack")
		b:queue("attack")
		a:advance(20)
		for i = 1, 200 do
			b:advance(0.1)
		end
		t.eq(a.health, b.health)
		t.eq(a.enemies[1].actions, b.enemies[1].actions)
		t.ok(math.abs(a.enemies[1].gauge - b.enemies[1].gauge) < 1e-8)
	end)
	t.test("exhausted action preserves full state", function()
		local c = fresh()
		c.player_gauge = 1
		c.stamina = 1
		local before = c:snapshot()
		local result = c:act("smash")
		t.eq(result, false)
		t.eq(c:snapshot(), before)
	end)
	t.test("unknown damage stays defensive across repeated clocks", function()
		local c = Combat.new({ player = { life = 100, stamina = 12 }, enemies = { { health = 100, damage_max = 10 } } })
		for i = 1, 4 do
			c:advance_time(100)
			t.eq(c.enemy_gauge, 1)
			c:act_enemy(1)
			t.eq(c.enemies[1].intent, "defend")
		end
		t.eq(c.health, 100)
	end)
	t.test("saved health caps at player maximum", function()
		local c = Combat.new({ player = { life = 100 }, health = 150, enemies = { { health = 1 } } })
		t.eq(c.health, 100)
		local d = Combat.new({ player = { life = 100 }, health = 35, enemies = { { health = 1 } } })
		t.eq(d.health, 35)
	end)
	t.test("group clocks and rollback stay independent", function()
		local c = fresh(2)
		c:advance_time(4.5)
		t.ok(c:enemy_ready(1))
		t.ok(not c:enemy_ready(2))
		c.enemies[2].intent = "attack"
		c.enemies[2].gauge = 1
		local state = c:snapshot()
		local result = c:act_enemy(2)
		t.eq(c.enemies[1].gauge, 1)
		c:restore(state)
		t.eq(c:snapshot(), state)
		t.eq(c:act_enemy(2), result)
	end)
	t.test("Smash preparation can be interrupted without incoming damage", function()
		local c = fresh()
		c.enemies[1].intent = "attack"
		c.player_gauge = 1
		c:act("smash")
		t.eq(c.health, 100)
		t.eq(c.enemies[1].health, 50)
	end)
	t.test("enemy Smash bypasses active guard", function()
		local c = fresh()
		c.player_gauge = 1
		c:act("defend")
		c.enemies[1].intent = "smash"
		c.enemies[1].gauge = 1
		c:act_enemy(1)
		t.eq(c.health, 89)
	end)

	t.test("four enemy Windmill emits group training and individual defeats", function()
		local c = fresh(4)
		for _, e in ipairs(c.enemies) do
			e.health = 1
		end
		c.player_gauge = 1
		local event = c:act("windmill")
		local counts = {}
		for _, id in ipairs(event.training) do
			counts[id] = (counts[id] or 0) + 1
		end
		t.eq(counts.attack_4_or_more_enemies, 1)
		t.eq(counts.defeat_4_or_more_enemies, 1)
		t.eq(counts.defeat_enemy, 4)
		t.eq(counts.windmill_defeat_enemy, 4)
		t.ok(c.won)
	end)
	t.test("learned skill and stamina checks reject before queue mutation", function()
		local c = fresh()
		c.character.learned_skills = { "defense" }
		local before = c:snapshot()
		t.eq(c:queue("smash"), false)
		t.eq(c:snapshot(), before)
		c.stamina = 0
		t.eq(c:queue("attack"), false)
		t.ok(c:queue("defend"))
	end)
	t.test("each event owns training and equipment wear outcome", function()
		local c = fresh()
		c.player_gauge = 1
		local a = c:act("attack")
		t.eq(a.action, "attack")
		t.eq(a.weapon_wear, 25)
		t.eq(a.armor_hit, false)
		c.health = 70
		local item = c:use_item("tonic", 20)
		t.eq(#item.training, 0)
		t.eq(item.weapon_wear, 0)
		t.eq(item.action, "tonic")
		c.enemies[1].intent = "attack"
		c.enemies[1].gauge = 1
		local e = c:act_enemy()
		t.eq(e.armor_hit, true)
		t.eq(e.weapon_wear, 0)
	end)
	t.test("malformed enemy health rejects encounter and malformed damage stays defensive", function()
		for _, n in ipairs({ 0, -1, 0 / 0, math.huge, 1.5 }) do
			local c = Combat.new({ enemies = { { health = n } } })
			t.eq(c.active, false)
		end
		local c = Combat.new({ enemies = { { health = 10, damage_min = 0 / 0, damage_max = math.huge } } })
		t.eq(c.enemies[1].intent, "defend")
	end)
	t.test("injected random source restores through snapshot protocol", function()
		local n = 5
		local rng = {
			float = function()
				n = n + 1
				return 0.2
			end,
			range = function(_, a, b)
				n = n + 1
				return a
			end,
			state = function()
				return n
			end,
			restore = function(_, v)
				n = v
			end,
		}
		local c = Combat.new({
			rng = rng,
			player = { life = 100, stamina = 20, damage_min = 4, damage_max = 8, critical = 5 },
			enemies = { { health = 100, damage_min = 4, damage_max = 6 } },
		})
		c.player_gauge = 1
		local state = c:snapshot()
		local result = c:act("smash")
		local after = n
		c:restore(state)
		t.eq(n, 5)
		t.eq(c:snapshot(), state)
		t.eq(c:act("smash"), result)
		t.eq(n, after)
	end)
	t.test("sword training requires an equipped sword for attacks and group defeats", function()
		for _, weapon in ipairs({ {}, { weapon_type = "axe" }, { weapon_type = "bow" }, { name = "Legacy sword" }, { weapon_type = "sword" } }) do
			for _, action in ipairs({ "attack", "windmill" }) do
				local c = fresh(4)
				c.weapon = weapon
				for _, enemy in ipairs(c.enemies) do
					enemy.health = 1
				end
				c.player_gauge = 1
				local result = c:act(action)
				local counts = {}
				for _, event in ipairs(result.training) do
					counts[event] = (counts[event] or 0) + 1
				end
				local sword = weapon.name ~= nil or weapon.weapon_type == "sword"
				t.eq(counts.attack_an_enemy_with_sword or 0, sword and 1 or 0)
				t.eq(counts.defeat_an_enemy_with_sword or 0, sword and (action == "windmill" and 4 or 1) or 0)
			end
		end
	end)
end
