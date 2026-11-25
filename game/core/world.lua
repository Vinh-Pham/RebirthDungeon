local G = require("game.generation.zones")
local Dungeons = require("game.generation.dungeons")
local R = require("game.core.rng")
local Overworld = require("game.generation.overworld")
local History = require("game.generation.history")
local U = require("game.util")
local Visibility = require("game.rendering.visibility")
local M = {}
local W = {}
W.__index = W
local dirs = { { 0, -1 }, { 1, 0 }, { 0, 1 }, { -1, 0 } }
local k = require("game.core.grid").key
local room_generators = {
	[Dungeons.LEGACY_VERSION] = Dungeons.legacy_rooms,
	[Dungeons.MAZE_VERSION] = Dungeons.maze_rooms,
	[Dungeons.CHAMBER_VERSION] = Dungeons.chamber_rooms,
}
local function link_key(a, b)
	return math.min(a, b) .. ":" .. math.max(a, b)
end
function M.new(profile)
	local self = setmetatable({ profile = profile, world = profile.world, room = 1, rng = R.new(profile.seed) }, W)
	self:load(profile.world.location)
	return self
end
function W:room_cleared(index)
	if self.rooms[1].connections then
		return (self.world.threshold_defeated or {})[tostring(index)] == true
	end
	return index <= (self.world.threshold_cleared or 0)
end
function W:show_room(index, from_east, arrival)
	self.room = math.max(1, math.min(9, index))
	self.map = self.rooms[self.room]
	G.decorate_room(self.map, self.room)
	if self:room_cleared(self.room) then
		self.map.enemies = {}
	end
	self.enemies = self.map.enemies or {}
	self.landmarks = self.map.landmarks or {}
	local spawn = arrival or (from_east and self.map.exit or self.map.entry)
	self.player = { x = spawn.x, y = spawn.y }
	self.enemy_blockers =
		{ [k(self.map.entry.x, self.map.entry.y)] = true, [k(self.map.exit.x, self.map.exit.y)] = true }
	for _, door in ipairs(self.map.doors or {}) do
		self.enemy_blockers[k(door.x, door.y)] = true
	end
	for _, p in ipairs(self.landmarks) do
		self.enemy_blockers[k(p.x, p.y)] = true
	end
	for _, p in ipairs(self.map.chests or {}) do
		self.enemy_blockers[k(p.x, p.y)] = true
	end
	return self.map
end
function W:reveal()
	self.visible = {}
	if self.currentLocation ~= "threshold" then
		return
	end
	self.visible = Visibility.compute(self.map, self.player.x, self.player.y, 9)
	local explored = self.world.threshold_explored or {}
	local index = tostring(self.room)
	local known = explored[index] or {}
	for cell in pairs(self.visible) do
		known[cell] = true
	end
	explored[index] = known
	self.world.threshold_explored = explored
end
function W:load(location)
	self.currentLocation = location or "lantern_rest"
	self.world.location = self.currentLocation
	local legacy = self.world.legacy_layouts or self.profile.legacy_layouts
	if legacy and legacy.layouts then
		legacy = legacy.layouts
	end
	local p = self.world.map_position
	if self.currentLocation == "threshold" then
		local generate = room_generators[self.world.generator_version] or Dungeons.rooms
		self.rooms = U.copy(
			legacy and legacy.threshold or generate(self.profile.seed + (self.world.threshold_run or 0) * 104729)
		)
		local index
		index, p = History.room_checkpoint(self.world, p, self.rooms[1].connections ~= nil)
		self:show_room(index + 1)
	else
		self.map = U.copy(
			legacy and legacy[self.currentLocation] or G.town(self.profile.seed, self.currentLocation)
		)
		self.landmarks = self.map.landmarks or {}
		self.enemies = self.map.enemies or {}
		self.player = { x = self.map.spawn.x, y = self.map.spawn.y }
	end
	if p and p.location == self.currentLocation and p.landmark then
		local approach = self:landmark_spawn(p.landmark)
		if approach then
			self.player = approach
		end
	end
	if p and p.location == self.currentLocation and self:walkable(p.x, p.y) then
		local occupied = false
		for _, e in ipairs(self.enemies) do
			if e.x == p.x and e.y == p.y then
				occupied = true
			end
		end
		if not occupied then
			self.player = { x = p.x, y = p.y }
		end
	end
	self:reveal()
	return self.map
end
-- Dungeon return prefers left/down/up/right, matching the Godot checkpoint.
-- Moon Gate arrivals prefer directly above the gate, matching gate travel.
function W:landmark_spawn(id)
	local order = id == "gate" and { { 0, -1 }, { -1, 0 }, { 0, 1 }, { 1, 0 } } or { { -1, 0 }, { 0, 1 }, { 0, -1 }, {
		1,
		0,
	} }
	for _, landmark in ipairs(self.landmarks or {}) do
		if landmark.id == id then
			for _, direction in ipairs(order) do
				local x, y = landmark.x + direction[1], landmark.y + direction[2]
				if self:walkable(x, y) then
					local occupied = false
					for _, enemy in ipairs(self.enemies or {}) do
						if enemy.x == x and enemy.y == y then
							occupied = true
						end
					end
					if not occupied then
						return { x = x, y = y }
					end
				end
			end
			return nil
		end
	end
	return nil
end
function W:walkable(x, y)
	if type(x) ~= "number" or type(y) ~= "number" or not self.map.floor[k(x, y)] then
		return false
	end
	for _, p in ipairs(self.map.landmarks or {}) do
		if p.x == x and p.y == y then
			return false
		end
	end
	for _, p in ipairs(self.map.chests or {}) do
		if p.x == x and p.y == y then
			return false
		end
	end
	return true
end
function W:save_position()
	self:reveal()
	self.world.map_position = {
		location = self.currentLocation,
		x = self.player.x,
		y = self.player.y,
		room = self.room - 1,
		run = self.world.threshold_run or 0,
	}
end
function W:path_to(x, y)
	if not self:walkable(x, y) then
		return {}
	end
	local q = { { x = self.player.x, y = self.player.y } }
	local prev = { [k(self.player.x, self.player.y)] = false }
	local n = 1
	while q[n] do
		local p = q[n]
		n = n + 1
		if p.x == x and p.y == y then
			local path = {}
			while prev[k(p.x, p.y)] do
				table.insert(path, 1, p)
				p = prev[k(p.x, p.y)]
			end
			return path
		end
		for _, d in ipairs(dirs) do
			local xx, yy = p.x + d[1], p.y + d[2]
			local key = k(xx, yy)
			if self:walkable(xx, yy) and prev[key] == nil then
				prev[key] = p
				q[#q + 1] = { x = xx, y = yy }
			end
		end
	end
	return {}
end
function W:move(dx, dy)
	if math.abs(dx) + math.abs(dy) ~= 1 then
		return false, "Move one tile."
	end
	local x, y = self.player.x + dx, self.player.y + dy
	if not self:walkable(x, y) then
		return false, "The way is blocked."
	end
	for _, e in ipairs(self.enemies) do
		if e.x == x and e.y == y then
			return false, "encounter", e
		end
	end
	if self.currentLocation == "threshold" then
		if self.map.doors then
			for _, door in ipairs(self.map.doors) do
				if x == door.x and y == door.y then
					return self:cross_door(door.target)
				end
			end
		elseif x == self.map.entry.x and y == self.map.entry.y and self.room > 1 then
			return self:previous_room()
		end
		if (not self.map.doors or self.room == 9) and x == self.map.exit.x and y == self.map.exit.y then
			return self:advance_room()
		end
	end
	self.player = { x = x, y = y }
	self:save_position()
	if self.currentLocation == "threshold" then
		local contact = require("game.systems.movement").step(
			self.enemies,
			self.player,
			self.map.floor,
			self.enemy_blockers or {},
			self.rng
		)
		if contact then
			return true, "encounter", self.enemies[contact]
		end
	end
	return true
end
function W:interact()
	for _, p in ipairs(self.landmarks or {}) do
		if math.abs(p.x - self.player.x) + math.abs(p.y - self.player.y) <= 1 then
			return p
		end
	end
	if self.currentLocation == "threshold" then
		for _, p in ipairs(self.map.chests) do
			if math.abs(p.x - self.player.x) + math.abs(p.y - self.player.y) <= 1 then
				return p
			end
		end
		for _, door in ipairs(self.map.doors or {}) do
			if math.abs(door.x - self.player.x) + math.abs(door.y - self.player.y) <= 1 then
				return { id = "passage", target = door.target, label = self:door_locked(door) and "Locked door" or "Passage" }
			end
		end
		if (not self.map.doors or self.room == 9)
			and math.abs(self.map.exit.x - self.player.x) + math.abs(self.map.exit.y - self.player.y) <= 1 then
			return { id = "exit", label = self:exit_locked() and "Locked door" or "Exit" }
		end
		if (not self.map.doors or self.room == 1)
			and math.abs(self.map.entry.x - self.player.x) + math.abs(self.map.entry.y - self.player.y) <= 1 then
			return { id = "entry" }
		end
	end
	return nil, "Nothing nearby."
end
function W:register_gate()
	local nearby = self:interact()
	if not nearby or nearby.id ~= "gate" then
		return false, "Visit the gate in person."
	end
	self.world.gates = self.world.gates or {}
	for _, id in ipairs(self.world.gates) do
		if id == self.currentLocation then
			return true
		end
	end
	self.world.gates[#self.world.gates + 1] = self.currentLocation
	return true
end
function W:travel(town)
	local gates = {}
	for _, id in ipairs(self.world.gates or {}) do
		gates[id] = true
	end
	if not gates[self.currentLocation] or not gates[town] then
		return false, "Register both Moon Gates first."
	end
	self.world.map_position = { location = town, landmark = "gate" }
	self:load(town)
	self:save_position()
	return true
end
function W:enter_dungeon()
	self.world.dungeon_from = self.currentLocation
	self.world.map_position = {}
	local layouts = self.world.legacy_layouts or self.profile.legacy_layouts
	local legacy = layouts and (layouts.layouts or layouts).threshold
	local version = legacy and Dungeons.LEGACY_VERSION or Dungeons.VERSION
	if (self.world.threshold_cleared or 0) == 0 and self.world.generator_version ~= version then
		self.world.generator_version = version
		self.world.threshold_defeated, self.world.threshold_explored, self.world.threshold_links = {}, {}, {}
	end
	self:load("threshold")
	return true
end
function W:reset_run()
	self.world.threshold_cleared = 0
	self.world.threshold_defeated, self.world.threshold_explored, self.world.threshold_links = {}, {}, {}
	self.world.threshold_treasure_claimed = false
	self.world.threshold_treasure_chest = -1
	self.world.threshold_run = math.min(2000000000, (self.world.threshold_run or 0) + 1)
	self.world.generator_version = Dungeons.VERSION
	self.world.pending_loot = {}
	if self.world.legacy_layouts then
		self.world.legacy_layouts.threshold = nil
	end
end
function W:leave_dungeon()
	self:reset_run()
	self.world.map_position = {}
	self:load(Overworld.return_destination(self.world))
	return true
end
function W:cleared_room_changes()
	if self.room >= 9 or self:room_cleared(self.room) then
		return nil
	end
	if not self.map.doors then
		return { threshold_cleared = self.room }
	end
	local defeated = U.copy(self.world.threshold_defeated or {})
	defeated[tostring(self.room)] = true
	return { threshold_defeated = defeated, threshold_cleared = (self.world.threshold_cleared or 0) + 1 }
end
function W:commit_combat_win()
	for field, value in pairs(self:cleared_room_changes() or {}) do
		self.world[field] = value
	end
	self.map.enemies = {}
	self.enemies = self.map.enemies
	return true
end
function W:previous_room()
	if self.currentLocation ~= "threshold" then
		return false, "Not in the dungeon."
	end
	if self.room <= 1 then
		return self:leave_dungeon()
	end
	if self.map.doors then
		return false, "Use a passage to return."
	end
	self:remember_link(self.room - 1)
	self:show_room(self.room - 1, true)
	self:save_position()
	return true
end
function W:exit_locked()
	return self.currentLocation == "threshold" and #self.enemies > 0
end
function W:link_explored(a, b)
	return (self.world.threshold_links or {})[link_key(a, b)] == true
end
function W:remember_link(target)
	local links = self.world.threshold_links or {}
	links[link_key(self.room, target)] = true
	self.world.threshold_links = links
end
function W:door_locked(door, source)
	source = source or self.room
	if not door.target then
		return source < 9 and not self:room_cleared(source)
	end
	if door.target == 8 then
		for room = 1, 7 do
			if not self:room_cleared(room) then
				return true, "Clear the remaining chambers before entering the boss room."
			end
		end
	end
	if door.target == 9 and not self:room_cleared(8) then
		return true, "Defeat all enemies first."
	end
	if source < 9 and not self:room_cleared(source) and not self:link_explored(source, door.target) then
		return true, "Defeat all enemies first."
	end
	return false
end
function W:cross_door(target, nearby)
	if self.currentLocation == "threshold" then
		for _, door in ipairs(self.map.doors or {}) do
			if door.target == target and (not nearby or math.abs(door.x - self.player.x) + math.abs(door.y - self.player.y) <= 1) then
				local locked, message = self:door_locked(door)
				if locked then
					return false, message
				end
				self:remember_link(target)
				self:show_room(target, false, door.arrival)
				self:save_position()
				return true
			end
		end
	end
	return false, "Move next to a passage first."
end
function W:advance_room()
	if self.currentLocation ~= "threshold" then
		return false, "Not in the dungeon."
	end
	if self.map.doors and self.room < 9 then
		return false, "Use a passage to continue."
	end
	if self:exit_locked() then
		return false, "Defeat all enemies first."
	end
	if self.room >= 9 then
		if (self.world.threshold_cleared or 0) < 8 then
			return false, "Defeat all enemies first."
		end
		if next(self.world.pending_loot or {}) then
			return false, "Collect or leave the treasure before exiting."
		end
		local dest = Overworld.destination(self.world.dungeon_from)
		if self.world.quest == 1 then
			self.world.quest = 2
		end
		self.world.threshold_completions = math.min(2000000000, (self.world.threshold_completions or 0) + 1)
		self:reset_run()
		self.world.map_position = {}
		self:load(dest)
		History.visit(self.world, dest)
		return true, "The Threshold is complete."
	end
	self:remember_link(self.room + 1)
	self:show_room(self.room + 1)
	self:save_position()
	return true
end
function W:open_chest(index)
	if self.currentLocation ~= "threshold" or self.room ~= 9 or (self.world.threshold_cleared or 0) < 8 then
		return false, "The treasure chamber is sealed."
	end
	if self.world.threshold_treasure_claimed then
		return false, "You can open only one chest per run."
	end
	if next(self.world.pending_loot or {}) then
		return false, "Collect pending loot first."
	end
	if type(index) ~= "number" or index < 1 or index > 5 or index % 1 ~= 0 then
		return false, "Invalid chest."
	end
	local rewards = {
		{ gold = 60, tonic = 3 },
		{ gold = 45, cobweb = 6 },
		{ gold = 50, cloth = 4 },
		{ gold = 70, fish = 8 },
		{
			gold = 85,
			fiber = 5,
		},
	}
	self.world.threshold_treasure_claimed = true
	self.world.threshold_treasure_chest = index - 1
	self.world.pending_loot = rewards[index]
	return true
end
M.generation = G
return M
