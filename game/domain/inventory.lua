local U = require("game.domain.util")
local C = require("game.content.catalog")
local M = { CARRIED_CAPACITY = 30, BANK_CAPACITY = 60 }

---@param p table Character candidate, never the committed envelope.
---@param bank boolean|nil
---@return integer
function M.occupied(p, bank)
	local count = 0
	for _, item in ipairs(bank and p.bank.items or p.items) do
		if not item.slot then
			count = count + 1
		end
	end
	return count
end

function M.find(p, id, bank)
	for i, item in ipairs(bank and p.bank.items or p.items) do
		if item.id == id then
			return item, i
		end
	end
end

local function check_capacity(p, definition, quantity, bank)
	local d = C.items[definition]
	U.require_ok(d and U.integer(quantity, 1, 9999), "Invalid item grant")
	local remaining = quantity
	for _, item in ipairs(bank and p.bank.items or p.items) do
		if item.def == definition and not item.slot and d.stack > 1 then
			remaining = remaining - math.min(remaining, d.stack - item.quantity)
		end
	end
	local limit = bank and M.BANK_CAPACITY or M.CARRIED_CAPACITY
	U.require_ok(
		M.occupied(p, bank) + math.ceil(remaining / d.stack) <= limit,
		bank and "The bank is full" or "Your inventory is full"
	)
end

---@param p table Copied character candidate. Capacity is checked before any mutation.
function M.add(p, definition, quantity, bank)
	check_capacity(p, definition, quantity, bank)
	local d = C.items[definition]
	local list = bank and p.bank.items or p.items
	local remaining = quantity
	for _, item in ipairs(list) do
		if item.def == definition and not item.slot and d.stack > 1 then
			local amount = math.min(remaining, d.stack - item.quantity)
			item.quantity = item.quantity + amount
			remaining = remaining - amount
		end
	end
	while remaining > 0 do
		local amount = math.min(remaining, d.stack)
		local item = { id = U.id(p, "item"), def = definition, quantity = amount }
		if d.durability then
			item.durability = d.durability
		end
		list[#list + 1] = item
		remaining = remaining - amount
	end
end

function M.remove(p, id, quantity, bank)
	local item, index = M.find(p, id, bank)
	U.require_ok(item and not item.slot, "Select an unequipped item")
	U.require_ok(U.integer(quantity, 1, item.quantity), "Invalid quantity")
	item.quantity = item.quantity - quantity
	if item.quantity == 0 then
		table.remove(bank and p.bank.items or p.items, index)
	end
end

function M.equipped(p, slot)
	for _, item in ipairs(p.items) do
		if item.slot == slot then
			return item
		end
	end
end

function M.equip(p, id)
	U.require_ok(p.phase == "town" and not p.run, "Change equipment in town")
	local item = M.find(p, id)
	U.require_ok(item, "Item not found")
	local d = C.items[item.def]
	U.require_ok(d.slot, "This item cannot be equipped")
	U.require_ok(not (d.no_giant and p.race == "Giant"), "Giants cannot equip bows")
	if item.slot then
		U.require_ok(M.occupied(p) < M.CARRIED_CAPACITY, "Your inventory is full")
		item.slot = nil
	else
		-- The selected carried item vacates exactly one slot for the displaced item.
		local old = M.equipped(p, d.slot)
		if old then
			old.slot = nil
		end
		item.slot = d.slot
	end
end

function M.transfer(p, id, quantity, to_bank)
	U.require_ok(p.phase == "town" and not p.run, "Visit the bank in town")
	U.require_ok(type(to_bank) == "boolean", "Choose deposit or withdrawal")
	local item, index = M.find(p, id, not to_bank)
	U.require_ok(item and not item.slot, "Select an unequipped item")
	U.require_ok(U.integer(quantity, 1, item.quantity), "Invalid quantity")
	check_capacity(p, item.def, quantity, to_bank)
	local source = to_bank and p.items or p.bank.items
	local target = to_bank and p.bank.items or p.items
	local d = C.items[item.def]
	local remaining = quantity
	for _, stored in ipairs(target) do
		if not stored.slot and stored.def == item.def and d.stack > 1 then
			local amount = math.min(remaining, d.stack - stored.quantity)
			stored.quantity = stored.quantity + amount
			remaining = remaining - amount
		end
	end
	if quantity == item.quantity then
		table.remove(source, index)
		if remaining > 0 then
			-- Whole moves retain identity and durability, including partially merged stacks.
			item.quantity = remaining
			target[#target + 1] = item
		end
	else
		item.quantity = item.quantity - quantity
		if remaining > 0 then
			target[#target + 1] = { id = U.id(p, "item"), def = item.def, quantity = remaining }
		end
	end
end

return M
