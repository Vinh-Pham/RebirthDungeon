local C = require("game.content.catalog")
local I = require("game.domain.inventory")
local Cmd = require("game.domain.commands")
local U = require("game.domain.util")
local M = {}
-- The panel presents a 6x5 grid of carried or stored items per page.
local GRID_COLS, GRID_ROWS = 6, 5
local PAGE_SIZE = GRID_COLS * GRID_ROWS
-- Weapon, left hand and body are supported; remaining slots are placeholders.
local EQUIPMENT_LAYOUT = {
	{ slot = "accessory_1", label = "Acc" },
	{ slot = "head", label = "Head" },
	{ slot = "accessory_2", label = "Acc" },
	{ slot = "weapon", label = "Hand R" },
	{ slot = "body", label = "Body" },
	{ slot = "hand_left", label = "Hand L" },
	{ slot = "gloves", label = "Gloves" },
	{ slot = "boots", label = "Boots" },
	{ slot = "robe", label = "Robe" },
}

local function action(p, actions, label, command, locked)
	command.profile = p.id
	command.revision = p.revision
	local enabled, reason = Cmd.preview_inventory(p, command)
	actions[#actions + 1] =
		{ label = label, command = command, enabled = enabled and not locked, reason = locked or reason or "" }
end

---@return table model Read-only presentation data; commands use the same guards as previews.
function M.model(p, request, locked)
	local bank = request.service == "bank"
	local stored = bank and request.stored == true
	local source = stored and p.bank.items or p.items
	-- Equipped items are presented in the equipment slots, the grid lists carried items only.
	local carried = {}
	for _, item in ipairs(source) do
		if not item.slot then
			carried[#carried + 1] = item
		end
	end
	local pages = math.max(1, math.ceil(#carried / PAGE_SIZE))
	local page = U.integer(request.page, 1, pages) and request.page or 1
	local model = {
		header = {
			profile = p.id,
			revision = p.revision,
			page = page,
			pages = pages,
			carried = I.occupied(p),
			capacity = I.CARRIED_CAPACITY,
			equipped = #p.items - I.occupied(p),
			stored_count = #p.bank.items,
			bank_capacity = I.BANK_CAPACITY,
			gold = p.gold,
			bank_gold = p.bank.gold,
			bank = bank,
			stored = stored,
		},
		rows = {},
		actions = {},
		gold_actions = {},
	}
	if not bank then
		model.equipment = {}
		for index, entry in ipairs(EQUIPMENT_LAYOUT) do
			local item = I.equipped(p, entry.slot)
			local d = item and C.items[item.def]
			model.equipment[index] = {
				slot = entry.slot,
				label = entry.label,
				id = item and item.id or "",
				name = d and d.name or "",
				tile = d and d.tile or "",
			}
		end
	end
	for index = (page - 1) * PAGE_SIZE + 1, math.min(#carried, page * PAGE_SIZE) do
		local item = carried[index]
		local d = C.items[item.def]
		model.rows[#model.rows + 1] = {
			id = item.id,
			name = d.name,
			tile = d.tile,
			summary = "Quantity " .. item.quantity,
			quantity = item.quantity,
			durability = item.durability,
			maximum = d.durability,
		}
	end
	if bank then
		local amount = U.integer(request.amount, 1, 1000000000) and request.amount or 1
		model.header.amount = amount
		action(p, model.gold_actions, "Deposit", { type = "bank_gold", amount = amount, deposit = true }, locked)
		action(p, model.gold_actions, "Withdraw", { type = "bank_gold", amount = amount, deposit = false }, locked)
	end
	local item = request.item and I.find(p, request.item, stored)
	if not item then
		return model
	end
	local d = C.items[item.def]
	local quantity = U.integer(request.quantity, 1, item.quantity) and request.quantity or 1
	local bonuses = d.power
			and ("Weapon contribution +" .. (item.durability == 0 and d.power * 0.5 or d.power) .. (item.durability == 0 and " (broken: half power)" or ""))
		or d.defense and ("Defense +" .. d.defense)
		or d.pool and ("Restores " .. d.restore .. " " .. d.pool:upper())
		or "Crafting material"
	model.detail = {
		id = item.id,
		name = d.name,
		tile = d.tile,
		description = d.description,
		quantity = quantity,
		maximum_quantity = item.quantity,
		durability = item.durability,
		maximum_durability = d.durability,
		bonuses = bonuses,
		prices = "Buy " .. d.price .. " gold · Sell " .. math.floor(d.price * 0.25) .. " gold / unit",
		location = stored and "Bank" or item.slot and "Equipped · " .. item.slot or "Carried",
		restriction = d.no_giant and "Humans and Elves only · Giants may own this bow"
			or d.slot and "Equip in town, outside a run"
			or "",
		slot = d.slot or "",
	}
	if bank then
		action(
			p,
			model.actions,
			stored and "Withdraw" or "Deposit",
			{ type = "bank_item", item = item.id, quantity = quantity, deposit = not stored },
			locked
		)
	else
		if d.pool then
			local cmd = { type = "use_item", item = item.id }
			if p.phase == "battle" then
				cmd.battle = p.battle.id
				cmd.turn = p.battle.turn
				cmd.actor = p.id
			end
			action(p, model.actions, "Use one", cmd, locked)
		elseif d.slot then
			action(p, model.actions, item.slot and "Unequip" or "Equip", { type = "equip", item = item.id }, locked)
			if not item.slot and d.weapon_type == "sword" and not d.two_handed then
				action(
					p,
					model.actions,
					"Equip left hand",
					{ type = "equip", item = item.id, slot = "hand_left" },
					locked
				)
			end
		end
		local service = C.services[request.service]
		if service and service.stock then
			action(
				p,
				model.actions,
				"Sell " .. quantity .. " · " .. math.floor(d.price * 0.25) * quantity .. " gold",
				{ type = "sell", service = request.service, item = item.id, quantity = quantity },
				locked
			)
		end
		if request.service == "blacksmith" and d.durability then
			action(
				p,
				model.actions,
				"Repair · " .. ((d.durability - item.durability) * C.services.blacksmith.repair_per_point) .. " gold",
				{ type = "repair", item = item.id },
				locked
			)
		end
		if not request.service or request.service == "" then
			action(
				p,
				model.actions,
				"Discard " .. quantity,
				{ type = "discard_item", item = item.id, quantity = quantity, confirm = true },
				locked
			)
		end
	end
	return model
end

---Send bounded messages: the full bank never travels in a single 2 KB message.
function M.send(p, request, receiver, locked)
	local model = M.model(p, request, locked)
	msg.post(receiver, "inventory_begin", { token = request.token, header = model.header })
	if model.equipment then
		msg.post(receiver, "inventory_equipment", { token = request.token, slots = model.equipment })
	end
	for _, row in ipairs(model.rows) do
		msg.post(receiver, "inventory_row", { token = request.token, row = row })
	end
	if model.detail then
		msg.post(receiver, "inventory_detail", { token = request.token, detail = model.detail })
	end
	for _, entry in ipairs(model.actions) do
		msg.post(receiver, "inventory_action", { token = request.token, entry = entry })
	end
	for _, entry in ipairs(model.gold_actions) do
		msg.post(receiver, "inventory_gold_action", { token = request.token, entry = entry })
	end
	msg.post(receiver, "inventory_end", { token = request.token })
end

return M
