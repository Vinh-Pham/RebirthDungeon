local U = require("game.util")
local C = require("game.data.catalog")
local M = {
	WIDTH = 8,
	HEIGHT = 7,
	POUCHES = {
		gold_pouch_small = { id = "gold_pouch_small", name = "Small Gold Pouch", capacity = 10000, price = 1760, category = "Bags" },
		gold_pouch_large = { id = "gold_pouch_large", name = "Large Gold Pouch", capacity = 50000, price = 9800, category = "Bags" },
	},
}
local I = {}
I.__index = I
local function catalog()
	local r = {}
	for _, v in ipairs(C.swords()) do
		r[v.id] = v
	end
	for _, cat in ipairs(C.shop().categories or {}) do
		for _, v in ipairs(cat.items or {}) do
			if v.slot and v.slot ~= "" then
				r[v.id] = v
			end
		end
	end
	r.gold_pouch_small = { id = "gold_pouch_small", width = 2, height = 2, capacity = 10000 }
	r.gold_pouch_large = { id = "gold_pouch_large", width = 2, height = 2, capacity = 50000 }
	return r
end
local function occupied(s, defs)
	local cells = {}
	local function add(id, p)
		local d = defs[id]
		if not d or type(p) ~= "table" then
			return false
		end
		if #p ~= 2 then
			return false
		end
		local x, y = p[1], p[2]
		if not U.integer(x, 0, 7) or not U.integer(y, 0, 6) then
			return false
		end
		for xx = x, x + (d.width or 1) - 1 do
			for yy = y, y + (d.height or 1) - 1 do
				local k = xx .. "," .. yy
				if xx > 7 or yy > 6 or cells[k] then
					return false
				end
				cells[k] = id
			end
		end
		return true
	end
	for id, p in pairs(s.placements) do
		if not add(id, p) then
			return nil
		end
	end
	for _, p in ipairs(s.pouches or {}) do
		if not add(p.id, p.cell) then
			return nil
		end
	end
	for id, anchors in pairs(s.stack_positions or {}) do
		if id ~= "gold" and id ~= "cobweb" then
			return nil
		end
		for _, p in ipairs(anchors) do
			if type(p) ~= "table" or #p ~= 2 then
				return nil
			end
			if not U.integer(p[1], 0, 7) or not U.integer(p[2], 0, 6) then
				return nil
			end
			local k = p[1] .. "," .. p[2]
			if cells[k] then
				return nil
			end
			cells[k] = id
		end
	end
	return cells
end
function M.new(value, persist)
	if value ~= nil and type(value) ~= "table" then
		return nil, "Invalid inventory."
	end
	local world = value or {}
	local isworld = world.gear_inventory ~= nil or world.gold ~= nil or world.town_materials ~= nil
	local s = isworld and (world.gear_inventory or {}) or (value or {})
	if type(s) ~= "table" then
		return nil, "Invalid inventory."
	end
	s = U.copy(s)
	for _, field in ipairs({ "placements", "slots", "pouches", "stack_positions" }) do
		if s[field] ~= nil and type(s[field]) ~= "table" then
			return nil, "Invalid inventory field."
		end
	end
	if s.equipped ~= nil and type(s.equipped) ~= "string" then
		return nil, "Invalid equipment."
	end
	s.placements = s.placements or {}
	s.equipped = s.equipped or ""
	s.slots = s.slots or {}
	s.pouches = s.pouches or {}
	s.stack_positions = s.stack_positions or {}
	local self = setmetatable(
		{
			state = s,
			world = U.copy(world),
			defs = catalog(),
			persist = persist,
			stack_counts = { gold = {}, cobweb = {} },
			pouch_counts = {},
		},
		I
	)
	if not occupied(s, self.defs) then
		return nil, "Invalid inventory placement."
	end
	local seen = {}
	for id in pairs(s.placements) do
		seen[id] = true
	end
	if s.equipped ~= "" then
		if seen[s.equipped] or not self.defs[s.equipped] then
			return nil, "Invalid equipment."
		end
		seen[s.equipped] = true
	end
	for slot, id in pairs(s.slots) do
		if
			not ({
				off_hand = true,
				armor = true,
				headgear = true,
				gloves = true,
				shoes = true,
				accessory_1 = true,
				accessory_2 = true,
			})[slot]
		then
			return nil, "Unknown equipment slot."
		end
		if id ~= "" then
			if seen[id] or not self.defs[id] then
				return nil, "Duplicate equipment."
			end
			seen[id] = true
			local required = self.defs[id].slot
			if
				required ~= slot and not (required == "accessory" and (slot == "accessory_1" or slot == "accessory_2"))
			then
				return nil, "Incompatible equipment slot."
			end
		end
	end
	if s.equipped ~= "" and (self.defs[s.equipped].slot or "main_hand") ~= "main_hand" then
		return nil, "Invalid main-hand equipment."
	end
	if world.gear_inventory or world.gold ~= nil then
		self:sync_stacks(world)
	end
	return self
end
function I:serialize()
	return U.copy(self.state)
end
function I:items()
	local a = {}
	for id, p in pairs(self.state.placements) do
		local d = U.copy(self.defs[id])
		d.cell = U.copy(p)
		a[#a + 1] = d
	end
	table.sort(a, function(x, y)
		return x.id < y.id
	end)
	return a
end
function I:_commit(s)
	if not occupied(s, self.defs) then
		return false, "No room in the satchel."
	end
	if self.persist and not self.persist(U.copy(s)) then
		return false, "Could not save inventory."
	end
	self.state = s
	return true
end
function I:_place(s, id, x, y)
	if x ~= nil then
		s.placements[id] = { x, y }
		return occupied(s, self.defs) ~= nil
	end
	for yy = 0, 6 do
		for xx = 0, 7 do
			s.placements[id] = { xx, yy }
			if occupied(s, self.defs) then
				return true
			end
		end
	end
	s.placements[id] = nil
	return false
end
function I:take(id)
	if id == "gold_pouch_small" or id == "gold_pouch_large" then
		return false, "Purchase pouches from the bank."
	end
	if not self.defs[id] then
		return false, "Unknown item."
	end
	if self.state.placements[id] or self.state.equipped == id then
		return false, "Already owned."
	end
	for _, v in pairs(self.state.slots) do
		if v == id then
			return false, "Already owned."
		end
	end
	local s = self:serialize()
	if not self:_place(s, id) then
		return false, "No room in the satchel."
	end
	return self:_commit(s)
end
function I:move(id, x, y)
	local s = self:serialize()
	if not s.placements[id] then
		return false, "Item not in satchel."
	end
	s.placements[id] = nil
	if not self:_place(s, id, x, y) then
		return false, "Invalid destination."
	end
	return self:_commit(s)
end
function I:equip(id, slot)
	local d = self.defs[id]
	if not d or not self.state.placements[id] then
		return false, "Item not in satchel."
	end
	slot = slot or d.slot or "main_hand"
	if slot == "" then
		slot = "main_hand"
	end
	if slot == "accessory" then
		slot = "accessory_1"
	end
	local expected = d.slot
	if
		expected
		and expected ~= ""
		and expected ~= slot
		and not (expected == "accessory" and (slot == "accessory_1" or slot == "accessory_2"))
	then
		return false, "Incompatible equipment slot."
	end
	if not expected and slot ~= "main_hand" then
		return false, "Incompatible equipment slot."
	end
	if slot == "off_hand" and self.defs[self.state.equipped] and self.defs[self.state.equipped].hands == 2 then
		return false, "A two-handed weapon occupies your off hand."
	end
	local s = self:serialize()
	s.placements[id] = nil
	local old = slot == "main_hand" and s.equipped or s.slots[slot]
	if slot == "main_hand" then
		s.equipped = id
	else
		s.slots[slot] = id
	end
	if old and old ~= "" and not self:_place(s, old) then
		return false, "No room for replaced equipment."
	end
	if slot == "main_hand" and d.hands == 2 and s.slots.off_hand and s.slots.off_hand ~= "" then
		local off = s.slots.off_hand
		s.slots.off_hand = nil
		if not self:_place(s, off) then
			return false, "Make room for your off-hand item first."
		end
	end
	return self:_commit(s)
end
function I:unequip(slot)
	slot = slot or "main_hand"
	local s = self:serialize()
	local id = slot == "main_hand" and s.equipped or s.slots[slot]
	if not id or id == "" then
		return false, "Empty slot."
	end
	if slot == "main_hand" then
		s.equipped = ""
	else
		s.slots[slot] = nil
	end
	if not self:_place(s, id) then
		return false, "No room."
	end
	return self:_commit(s)
end
function I:remove(id)
	local s = self:serialize()
	if s.equipped == id then
		s.equipped = ""
	elseif s.placements[id] then
		s.placements[id] = nil
	else
		local found = false
		for slot, v in pairs(s.slots) do
			if v == id then
				s.slots[slot] = nil
				found = true
			end
		end
		if not found then
			return false, "Not owned."
		end
	end
	return self:_commit(s)
end
function I:capacity(id)
	local cells = occupied(self.state, self.defs) or {}
	local used = 0
	for _, v in pairs(cells) do
		if v ~= "gold" and v ~= "cobweb" then
			used = used + 1
		end
	end
	local pouch = 0
	for _, v in ipairs(self.state.pouches) do
		pouch = pouch + (self.defs[v.id].capacity or 0)
	end
	local cobweb = (self.world.town_materials or {}).cobweb or 0
	local gold = self.world.gold or 0
	if id == "gold" then
		return pouch + math.max(0, 56 - used - math.ceil(cobweb / 99)) * 1000
	end
	return math.max(0, 56 - used - math.ceil(math.max(0, gold - pouch) / 1000)) * 99
end
function I:sync_stacks(world)
	self.world = U.copy(world)
	local s = self.state
	local remaining = { gold = world.gold or 0, cobweb = (world.town_materials or {}).cobweb or 0 }
	self.pouch_counts = {}
	for n, p in ipairs(s.pouches) do
		local cap = self.defs[p.id].capacity
		self.pouch_counts[n] = math.min(cap, remaining.gold)
		remaining.gold = remaining.gold - self.pouch_counts[n]
	end
	local anchors = s.stack_positions
	s.stack_positions = { gold = {}, cobweb = {} }
	local cells = occupied(s, self.defs)
	local free = 0
	for _ in pairs(cells) do
		free = free + 1
	end
	free = 56 - free
	self.stack_counts = { gold = {}, cobweb = {} }
	local loose_limit = math.max(0, free - math.ceil(remaining.cobweb / 99)) * 1000
	local desired = math.min(remaining.gold, loose_limit)
	local overflow = remaining.gold - desired
	remaining.gold = desired
	local function place(id, p)
		local k = p[1] .. "," .. p[2]
		if remaining[id] <= 0 or cells[k] then
			return
		end
		local out = s.stack_positions[id]
		out[#out + 1] = U.copy(p)
		cells[k] = id
		local count = math.min(id == "gold" and 1000 or 99, remaining[id])
		self.stack_counts[id][#out] = count
		remaining[id] = remaining[id] - count
	end
	-- Preserve existing loose-gold cells before allocating new cobwebs, while
	-- shrinking them enough to reserve the cells required by the cobweb balance.
	for _, p in ipairs(anchors.gold or {}) do
		place("gold", p)
	end
	for _, p in ipairs(anchors.cobweb or {}) do
		place("cobweb", p)
	end
	for _, id in ipairs({ "cobweb", "gold" }) do
		for y = 0, 6 do
			for x = 0, 7 do
				place(id, { x, y })
			end
		end
	end
	remaining.gold = remaining.gold + overflow
	return remaining
end
function I:stack_items()
	local out = {}
	for _, id in ipairs({ "gold", "cobweb" }) do
		for n, p in ipairs(self.state.stack_positions[id] or {}) do
			out[#out + 1] = {
				id = id,
				cell = U.copy(p),
				count = (self.stack_counts[id] or {})[n],
				capacity = id == "gold" and 1000 or 99,
			}
		end
	end
	for n, p in ipairs(self.state.pouches) do
		out[#out + 1] =
			{ id = p.id, cell = U.copy(p.cell), count = self.pouch_counts[n], capacity = self.defs[p.id].capacity }
	end
	return out
end
function I:move_item(from, to)
	local s = self:serialize()
	for id, p in pairs(s.placements) do
		if p[1] == from[1] and p[2] == from[2] then
			return self:move(id, to[1], to[2])
		end
	end
	for _, p in ipairs(s.pouches) do
		if p.cell[1] == from[1] and p.cell[2] == from[2] then
			p.cell = U.copy(to)
			return self:_commit(s)
		end
	end
	for _, anchors in pairs(s.stack_positions) do
		for n, p in ipairs(anchors) do
			if p[1] == from[1] and p[2] == from[2] then
				anchors[n] = U.copy(to)
				return self:_commit(s)
			end
		end
	end
	return false, "No item at that cell."
end
function I:purchase_pouch(id, price)
	local prices = { gold_pouch_small = 1760, gold_pouch_large = 9800 }
	if prices[id] ~= price then
		return false, "Unknown gold pouch."
	end
	if (self.world.gold or 0) < price then
		return false, "You need more gold."
	end
	local w = U.copy(self.world)
	w.gold = w.gold - price
	local next = assert(M.new(w))
	next.state = self:serialize()
	next:sync_stacks(w)
	local placed = false
	for y = 0, 6 do
		for x = 0, 7 do
			if not placed then
				next.state.pouches[#next.state.pouches + 1] = { id = id, cell = { x, y } }
				if occupied(next.state, self.defs) then
					placed = true
				else
					table.remove(next.state.pouches)
				end
			end
		end
	end
	if not placed then
		return false, "Make a free 2×2 space in your bag."
	end
	next:sync_stacks(w)
	if self.persist and not self.persist(next:serialize(), { gold = w.gold }) then
		return false, "Could not save inventory."
	end
	self.state = next.state
	self.world = w
	self.stack_counts = next.stack_counts
	self.pouch_counts = next.pouch_counts
	return true, { gold = w.gold, gear_inventory = self:serialize() }
end
function M.normalize(value, world)
	local input = value
	if world then
		input = U.copy(world)
		input.gear_inventory = value
	end
	local i, e = M.new(input)
	return i and i:serialize() or nil, e
end
M.import = M.normalize
return M
