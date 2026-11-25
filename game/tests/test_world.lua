return function(t)
	local R = require("game.core.rng")
	local G = require("game.generation.zones")
	local Dungeons = require("game.generation.dungeons")
	local W = require("game.core.world")
	t.test("rotLove shadowcasting sees walls and hides cells behind them", function()
		local Visibility = require("game.rendering.visibility")
		local visible = Visibility.compute({ width = 7, height = 7, walls = { ["3,3"] = true } }, 2, 3, 3)
		t.eq(visible["2,3"], 1)
		t.ok(visible["3,3"])
		t.ok(not visible["4,3"])
		t.ok(visible["1,3"])
	end)
	t.test("seeded rooms repeat and contain eight combat rooms plus treasure", function()
		t.eq(G.rooms(41), G.rooms(41))
		local rooms = G.rooms(41)
		t.eq(#rooms, 9)
		t.eq(#rooms[9].chests, 5)
		t.ok(#rooms[2].enemies >= 2)
	end)
	t.test("seeded chamber plans vary in size and encounters with reachable doors", function()
		local counts, species = {}, {}
		local different = false
		local original = G.rooms(1)
		for seed = 1, 12 do
			local world = W.new({ seed = seed, world = { location = "threshold" } })
			local boss = world.rooms[8]
			t.ok(boss.boss)
			t.eq(boss.enemies[1].kind, "vault_warden")
			for i, room in ipairs(world.rooms) do
				world:show_room(i)
				t.ok(#world:path_to(room.exit.x, room.exit.y) > 0)
				if i < 8 then
					t.ok(room.chamber.w < boss.chamber.w and room.chamber.h < boss.chamber.h)
					counts[#room.enemies] = true
					for _, actor in ipairs(room.enemies) do
						t.ok(world:walkable(actor.x, actor.y))
						species[actor.kind] = true
					end
				end
				different = different or room.chamber.w ~= original[i].chamber.w
			end
		end
		t.ok(different and counts[1] and counts[3])
		t.ok(species.glass_mite and species.shale_stalker and species.coil_sentinel)
	end)
	t.test("maze rooms have connected exits, solid walls and varied dead ends", function()
		local Grid = require("game.core.grid")
		local layouts = {}
		for seed = 1, 12 do
			for index, room in ipairs(require("game.generation.dungeons").maze_rooms(seed)) do
				local blocked = {}
				for _, group in ipairs({ room.landmarks, room.chests }) do
					for _, point in ipairs(group) do
						blocked[Grid.key(point.x, point.y)] = true
					end
				end
				local seen, queue = {}, { room.entry }
				seen[Grid.key(room.entry.x, room.entry.y)] = true
				local cursor, dead_ends = 1, 0
				while queue[cursor] do
					local point = queue[cursor]
					cursor = cursor + 1
					local neighbors = 0
					for _, delta in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
						local x, y = point.x + delta[1], point.y + delta[2]
						local k = Grid.key(x, y)
						if room.floor[k] and not blocked[k] then
							neighbors = neighbors + 1
							if not seen[k] then
								seen[k] = true
								queue[#queue + 1] = { x = x, y = y }
							end
						end
					end
					if neighbors == 1 then
						dead_ends = dead_ends + 1
					end
				end
				t.ok(seen[Grid.key(room.exit.x, room.exit.y)], "exit blocked by room contents")
				t.ok(room.walls[Grid.key(room.exit.x + 1, room.exit.y)])
				t.ok(dead_ends > 3)
				for x = 0, room.width - 1 do
					for y = 0, room.height - 1 do
						local k = Grid.key(x, y)
						t.ok(room.floor[k] ~= room.walls[k], "floor and wall coverage")
					end
				end
				if index == 1 then
					layouts[seed] = room.floor
				end
			end
		end
		local different = false
		for k in pairs(layouts[1]) do
			if not layouts[2][k] then
				different = true
			end
		end
		t.ok(different)
	end)
	t.test("town movement rejects walls and pathfinds", function()
		local w = W.new({ seed = 41, world = { location = "lantern_rest" } })
		t.ok(w:walkable(3, 20))
		t.ok(#w:path_to(20, 20) > 0)
		local x = w.player.x
		t.eq(w:move(2, 0), false)
		t.eq(w.player.x, x)
	end)
	t.test("gates require in person registration", function()
		local w = W.new({ seed = 1, world = { location = "lantern_rest", gates = {} } })
		t.eq(w:register_gate(), false)
		t.eq(w:travel("spindle_hollow"), false)
	end)
	t.test("dungeon advances only after combat", function()
		local w = W.new({ seed = 1, world = { location = "lantern_rest", threshold_cleared = 0 } })
		w:enter_dungeon()
		t.eq(w:cross_door(2), false)
		w:commit_combat_win()
		t.ok(w:cross_door(2))
		t.eq(w.room, 2)
	end)
	t.test("branch passages lead to real rooms and the boss waits for side-room clears", function()
		local w = W.new({ seed = 42, world = { location = "threshold" } })
		w:commit_combat_win()
		t.ok(w:cross_door(2))
		t.eq(#w.map.doors, 3)
		t.ok(w:link_explored(1, 2))
		t.eq(w.world.threshold_explored["4"], nil)
		w:commit_combat_win()
		t.ok(w:cross_door(4))
		t.eq(w.room, 4)
		t.ok(w.world.threshold_explored["4"])
		t.ok(w:cross_door(2))
		t.eq(#w.enemies, 0)
		w:show_room(6)
		w:commit_combat_win()
		t.eq(w:cross_door(8), false)
	end)
	t.test("all original town services exist and fishing spots are distinct", function()
		local m = G.town(713, "lantern_rest")
		local ids = {}
		local fishing = 0
		for _, p in ipairs(m.landmarks) do
			ids[p.id] = true
			if p.id == "fishing" then
				fishing = fishing + 1
			end
		end
		t.eq(fishing, 2)
		for _, id in ipairs({
			"warden",
			"blacksmith",
			"general_shop",
			"school",
			"church",
			"grocery_store",
			"healer",
			"oven",
			"loom",
			"spinning_wheel",
			"fishing",
			"windmill",
			"gate",
			"dungeon",
			"bank",
			"tree",
		}) do
			t.ok(ids[id], id)
		end
	end)
	t.test("generated amenities retain the original object art instead of NPC sprites", function()
		local sprites = { oven = 0, loom = 1, spinning_wheel = 2, windmill = 3, fishing = 4 }
		for _, seed in ipairs({ 1, 42, 713 }) do
			local count = 0
			for _, p in ipairs(G.town(seed, "lantern_rest").landmarks) do
				if sprites[p.id] ~= nil then
					t.eq(p.amenity_sprite, sprites[p.id], p.id .. " seed " .. seed)
					t.eq(p.sprite, nil, p.id .. " must not use the NPC atlas")
					count = count + 1
				end
			end
			t.eq(count, 6)
		end
	end)
	t.test("seven service buildings have open doors and interior floors", function()
		local m = G.town(713, "lantern_rest")
		local n = 0
		for _, p in ipairs(m.landmarks) do
			if p.building then
				n = n + 1
				t.ok(m.floor[p.door.x .. "," .. p.door.y])
				t.ok(m.floor[p.x .. "," .. p.y])
				t.eq(m.walls[p.door.x .. "," .. p.door.y], nil)
			end
		end
		t.eq(n, 7)
	end)
	t.test("town topology varies with seeds", function()
		local a, b = G.town(42), G.town(94)
		local differs = false
		for key in pairs(a.walls) do
			if not b.walls[key] then
				differs = true
			end
		end
		t.ok(differs)
	end)
	t.test("spindle retains original dimensions and residents", function()
		local m = G.town(42, "spindle_hollow")
		t.eq(m.width, 30)
		t.eq(m.height, 11)
		t.eq(m.landmarks[1].name, "Oren")
		t.eq(m.landmarks[2].name, "Brann")
		t.eq(m.landmarks[3].name, "Rill")
		t.eq(m.landmarks[4].name, "Ada")
	end)
	t.test("town amenities are reachable across representative seeds", function()
		for seed = 1, 8 do
			local m = G.town(seed)
			local w = W.new({ seed = seed, world = { location = "lantern_rest" } })
			for _, p in ipairs(m.landmarks) do
				local reachable = false
				for _, d in ipairs({ { 0, -1 }, { 1, 0 }, { 0, 1 }, { -1, 0 } }) do
					if #w:path_to(p.x + d[1], p.y + d[2]) > 0 then
						reachable = true
					end
				end
				t.ok(reachable, p.id .. " seed " .. seed)
			end
		end
	end)
	t.test("enemy pursuit routes around walls", function()
		local move = require("game.systems.movement")
		local floor = {}
		for x = 0, 11 do
			for y = 0, 3 do
				floor[x .. "," .. y] = true
			end
		end
		local enemies = { { x = 3, y = 1 } }
		move.step(enemies, { x = 1, y = 1 }, floor, { ["2,1"] = true, ["3,0"] = true }, R.new(42))
		t.eq(enemies[1], { x = 3, y = 2 })
	end)
	t.test("adjacent enemies report contact without occupying player cell", function()
		local move = require("game.systems.movement")
		local enemies = { { x = 2, y = 1 } }
		t.eq(move.step(enemies, { x = 1, y = 1 }, { ["1,1"] = true, ["2,1"] = true }, {}, R.new(1)), 1)
		t.eq(enemies[1], { x = 2, y = 1 })
	end)
	t.test("distant enemies wander uniquely and deterministically", function()
		local move = require("game.systems.movement")
		local floor = {}
		for x = 0, 11 do
			for y = 0, 3 do
				floor[x .. "," .. y] = true
			end
		end
		local a = { { x = 10, y = 1 }, { x = 10, y = 2 } }
		local b = { { x = 10, y = 1 }, { x = 10, y = 2 } }
		move.step(a, { x = 0, y = 0 }, floor, {}, R.new(42))
		move.step(b, { x = 0, y = 0 }, floor, {}, R.new(42))
		t.eq(a, b)
		t.ok(a[1].x ~= a[2].x or a[1].y ~= a[2].y)
	end)
	t.test("treasure allows one chest per run and preserves pending rewards", function()
		local w = W.new({ seed = 42, world = { location = "threshold", generator_version = Dungeons.CHAMBER_VERSION, threshold_cleared = 8, pending_loot = {} } })
		t.ok(w:open_chest(1))
		t.eq(w.world.pending_loot, { gold = 60, tonic = 3 })
		t.eq(w:open_chest(2), false)
		t.eq(w.world.threshold_treasure_chest, 0)
	end)
	t.test("exported legacy geometry loads without regeneration", function()
		local json = require("game.json")
		local text
		if sys and sys.load_resource then
			text = assert(sys.load_resource("/tests/fixtures/legacy-layouts-42.json"))
		else
			local f = assert(io.open("tests/fixtures/legacy-layouts-42.json"))
			text = f:read("*a")
			f:close()
		end
		local data = json.decode(text)
		local w = W.new({ seed = 42, world = { location = "lantern_rest", legacy_layouts = data.layouts } })
		t.eq(w.map, data.layouts.lantern_rest)
		t.eq(w.map.spawn, { x = 3, y = 12 })
		w:enter_dungeon()
		t.eq(w.map, data.layouts.threshold[1])
		t.eq(w.world.generator_version, Dungeons.LEGACY_VERSION)
		w:commit_combat_win()
		t.ok(require("game.persistence.migrations").validate_world(w.world))
	end)

	t.test("legacy checkpoint keeps its prior layout until a new dungeon run", function()
		local Profile = require("game.persistence.migrations")
		local w = W.new({
			seed = 42,
			world = assert(Profile.validate_world({
				location = "threshold",
				threshold_cleared = 3,
				threshold_run = 2,
				map_position = { location = "threshold", room = 1, run = 2, x = 8, y = 7 },
			})),
		})
		t.eq(w.room, 2)
		t.eq(w.map.height, 15)
		t.eq(#w.enemies, 0)
		t.eq(w.player, { x = 8, y = 7 })
		w:save_position()
		t.eq(w.world.map_position.room, 1)
		t.ok(w:leave_dungeon())
		t.ok(w:enter_dungeon())
		t.eq(w.room, 1)
		t.eq(w.map.height, 27)
	end)
	t.test("stale checkpoint run cannot restore position or room", function()
		local w = W.new({
			seed = 42,
			world = {
				location = "threshold",
				generator_version = Dungeons.CHAMBER_VERSION,
				threshold_cleared = 3,
				threshold_run = 2,
				map_position = { location = "threshold", room = 1, run = 1, x = 8, y = 7 },
			},
		})
		t.eq(w.room, 4)
		t.eq(w.player, w.map.entry)
		t.ok(#w.enemies > 0)
	end)
	t.test("checkpoint cannot enter an uncleared future room", function()
		local w = W.new({
			seed = 42,
			world = {
				location = "threshold",
				generator_version = Dungeons.CHAMBER_VERSION,
				threshold_cleared = 1,
				threshold_run = 0,
				map_position = { location = "threshold", room = 6, run = 0, x = 8, y = 7 },
			},
		})
		t.eq(w.room, 2)
		t.ok(#w.enemies > 0)
	end)
	t.test("checkpoint keeps the player's tile when a regenerated enemy spawns there", function()
		local profile = {
			seed = 42,
			world = { location = "threshold", generator_version = Dungeons.CHAMBER_VERSION, threshold_cleared = 0 },
		}
		local w = W.new(profile)
		local spawn = { x = w.enemies[1].x, y = w.enemies[1].y }
		profile.world.map_position = { location = "threshold", room = 0, run = 0, x = spawn.x, y = spawn.y }
		local restored = W.new(profile)
		t.eq(restored.player, spawn)
		t.eq(#restored.enemies, #w.enemies)
		for _, enemy in ipairs(restored.enemies) do
			t.ok(enemy.x ~= spawn.x or enemy.y ~= spawn.y)
		end
	end)
	t.test("backtracking enters previous room through its eastern door", function()
		local w = W.new({ seed = 42, world = { location = "threshold", generator_version = Dungeons.CHAMBER_VERSION, threshold_cleared = 2 } })
		t.eq(w.room, 3)
		t.ok(w:previous_room())
		t.eq(w.room, 2)
		t.eq(w.player, w.map.exit)
		t.eq(#w.enemies, 0)
		t.eq(w.world.threshold_cleared, 2)
	end)
	t.test("room one exposes four family racks and practice post", function()
		local w = W.new({ seed = 42, world = { location = "threshold", threshold_cleared = 0 } })
		local count = 0
		for _, p in ipairs(w.landmarks) do
			if p.id == "rack" then
				count = count + 1
				t.eq(p.x, 5)
				t.ok(p.family)
			elseif p.id == "practice" then
				t.eq(p.x, 8)
				t.eq(p.y, 4)
			end
			t.ok(w.enemy_blockers[p.x .. "," .. p.y])
			t.eq(w:walkable(p.x, p.y), false)
		end
		t.eq(count, 4)
		w.player = { x = 4, y = 4 }
		t.eq(w:interact().id, "rack")
	end)
	t.test("room entry movement backtracks and persists prior room", function()
		local w = W.new({ seed = 42, world = { location = "threshold", generator_version = Dungeons.CHAMBER_VERSION, threshold_cleared = 2 } })
		w.player = { x = w.map.entry.x + 1, y = w.map.entry.y }
		t.ok(w:move(-1, 0))
		t.eq(w.room, 2)
		t.eq(w.world.map_position.room, 1)
	end)
	t.test("new room arrival rejects a checkpoint on a blocked landmark", function()
		local w = W.new({
			seed = 42,
			world = {
				location = "threshold",
				threshold_cleared = 0,
				threshold_run = 0,
				map_position = { location = "threshold", room = 0, run = 0, x = 8, y = 4 },
			},
		})
		t.eq(w.player, w.map.entry)
	end)
	t.test("rng snapshot restore reproduces next draw", function()
		local r = R.new(9)
		local state = r:state()
		local draw = r:range(1, 100)
		r:restore(state)
		t.eq(r:range(1, 100), draw)
		t.reject(function()
			r:restore(0)
		end)
	end)
	t.test("dungeon landmark checkpoint resumes adjacent to threshold", function()
		for _, town in ipairs({ "lantern_rest", "spindle_hollow" }) do
			local w =
				W.new({ seed = 42, world = { location = town, map_position = { location = town, landmark = "dungeon" } } })
			local door
			for _, p in ipairs(w.landmarks) do
				if p.id == "dungeon" then
					door = p
				end
			end
			t.eq(w.player, { x = door.x - 1, y = door.y })
			t.ok(w:walkable(w.player.x, w.player.y))
		end
	end)
	t.test("gate travel arrives above the registered destination gate", function()
		local w =
			W.new({ seed = 42, world = { location = "lantern_rest", gates = { "lantern_rest", "spindle_hollow" } } })
		t.ok(w:travel("spindle_hollow"))
		t.eq(w.player, { x = 24, y = 7 })
		t.eq(w.player, w:landmark_spawn("gate"))
		t.eq(w.world.map_position.x, 24)
		t.eq(w.world.map_position.y, 7)
	end)
	t.test("landmark spawn skips blocked approaches and rejects missing landmarks", function()
		local w = W.new({ seed = 42, world = { location = "spindle_hollow" } })
		w.map.floor["24,7"] = nil
		t.eq(w:landmark_spawn("gate"), { x = 23, y = 8 })
		t.eq(w:landmark_spawn("missing"), nil)
	end)
end
