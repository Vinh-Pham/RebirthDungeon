local C = require("game.content.catalog")
local Cmd = require("game.domain.commands")
local I = require("game.domain.inventory")
local Stats = require("game.domain.stats")
local U = require("game.domain.util")
local M = {}

local function entry(p, label, command, locked)
	command.profile = p.id
	command.revision = p.revision
	local enabled, reason = Cmd.preview_service(p, command)
	return { label = label, command = command, enabled = enabled and not locked, reason = locked or reason or "" }
end

---@return table model Service prices, effects and availability come from domain rules.
function M.model(p, request, locked)
	local service = C.services[request.service]
	assert(service, "Unknown service")
	local quantity = U.integer(request.quantity, 1, 99) and request.quantity or 1
	local model = {
		header = {
			service = request.service,
			name = service.name,
			title = service.title,
			tile = service.tile,
			gold = p.gold,
			carried = I.occupied(p),
			capacity = I.CARRIED_CAPACITY,
			quantity = quantity,
			dialogue = request.dialogue == true,
		},
		rows = {},
		paragraphs = {},
		choices = {},
	}
	if not Cmd.service_available(p, request.service) then
		locked = "Walk closer to the service in town"
	end
	model.header.reason = locked or ""
	if request.dialogue then
		local saved = p.dialogue[request.service]
		if saved then
			model.paragraphs = U.copy(saved.paragraphs)
			for index, label in ipairs(saved.choices) do
				local item = entry(p, label, { type = "dialogue", service = request.service, choice = index }, locked)
				local intent = saved.actions and saved.actions[index]
				if intent and intent ~= "" then
					local command = C.dialogue_actions[request.service] and C.dialogue_actions[request.service][intent]
					local enabled, reason = false, "Unknown dialogue action"
					if command then
						enabled, reason = Cmd.preview_service(p, command)
					end
					item.enabled = item.enabled and enabled
					item.reason = locked or reason or ""
				end
				model.choices[#model.choices + 1] = item
			end
		end
		model.action = entry(
			p,
			"Start conversation again",
			{ type = "dialogue", service = request.service, restart = true },
			locked
		)
		return model
	end
	for _, id in ipairs(service.stock or {}) do
		local item = C.items[id]
		local detail = item.power and ("Power +" .. item.power .. " · Durability " .. item.durability)
			or item.defense and ("Defense +" .. item.defense)
			or item.shield_size and (item.shield_size .. " shield · left hand")
			or ("Restores " .. item.restore .. " " .. item.pool:upper() .. " when used")
		if item.no_giant then
			detail = detail .. " · Humans / Elves equip"
		end
		local action = entry(
			p,
			"Buy " .. quantity .. " · " .. item.price * quantity .. " gold",
			{ type = "buy", service = request.service, def = id, quantity = quantity },
			locked
		)
		model.rows[#model.rows + 1] = { id = id, name = item.name, tile = item.tile, detail = detail, action = action }
	end
	if request.service == "healer" then
		local maximum = Stats.current(p)
		model.header.effect = "Restore HP +"
			.. (maximum.hp - p.pools.hp)
			.. " · MP +"
			.. (maximum.mp - p.pools.mp)
			.. " · SP +"
			.. (maximum.sp - p.pools.sp)
		model.action = entry(p, "Full restoration · " .. service.cost .. " gold", { type = "heal" }, locked)
	elseif request.service == "gate" then
		model.header.effect =
			"Clear the encounters and boss, then spend its key in the treasure room. The goddess statue returns you home."
		model.action = entry(p, "Enter Alby Dungeon", { type = "enter" }, locked)
	elseif request.service == "blacksmith" then
		local weapon = I.equipped(p, "weapon")
		if weapon then
			local cost = (C.items[weapon.def].durability - weapon.durability) * service.repair_per_point
			model.action =
				entry(p, "Repair equipped weapon · " .. cost .. " gold", { type = "repair", item = weapon.id }, locked)
		end
	end
	return model
end

---Bounded row messages stay below Defold's 2 KB message payload limit.
function M.send(p, request, receiver, locked)
	local model = M.model(p, request, locked)
	msg.post(receiver, "service_begin", { token = request.token, header = model.header })
	for _, row in ipairs(model.rows) do
		msg.post(receiver, "service_row", { token = request.token, row = row })
	end
	for _, paragraph in ipairs(model.paragraphs) do
		msg.post(receiver, "service_paragraph", { token = request.token, text = paragraph })
	end
	for _, choice in ipairs(model.choices) do
		msg.post(receiver, "service_choice", { token = request.token, entry = choice })
	end
	if model.action then
		msg.post(receiver, "service_action", { token = request.token, entry = model.action })
	end
	msg.post(receiver, "service_end", { token = request.token })
end

return M
