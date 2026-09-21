-- Presentation only: all inventory data and mutations cross the script message boundary.
local M = {}

local function request(self)
	self.inventory_token = (self.inventory_token or 0) + 1
	self.inventory_data = nil
	self.inventory_confirmation = nil
	msg.post("/bootstrap#session", "inventory_request", {
		token = self.inventory_token,
		service = self.inventory_service or "",
		stored = self.inventory_stored or false,
		page = self.inventory_page or 1,
		item = self.inventory_item or "",
		quantity = tonumber(self.inventory_quantity) or 1,
		amount = tonumber(self.inventory_amount) or 1,
	})
	self.dirty = true
end

local function submit(self, entry)
	if self.inventory_pending or not entry.enabled then
		return
	end
	self.inventory_pending = true
	self.inventory_confirmation = nil
	msg.post("/bootstrap#session", "inventory_command", entry.command)
	self.dirty = true
end

function M.on_message(self, id, message)
	if id == hash("inventory_result") then
		self.inventory_pending = false
		request(self)
		return true
	end
	if message.token ~= self.inventory_token then
		return false
	end
	if id == hash("inventory_begin") then
		self.inventory_incoming = { header = message.header, rows = {}, actions = {}, gold_actions = {} }
	elseif id == hash("inventory_row") then
		table.insert(self.inventory_incoming.rows, message.row)
	elseif id == hash("inventory_detail") then
		self.inventory_incoming.detail = message.detail
	elseif id == hash("inventory_action") then
		table.insert(self.inventory_incoming.actions, message.entry)
	elseif id == hash("inventory_gold_action") then
		table.insert(self.inventory_incoming.gold_actions, message.entry)
	elseif id == hash("inventory_end") then
		self.inventory_data = self.inventory_incoming
		self.inventory_incoming = nil
		self.dirty = true
	else
		return false
	end
	return true
end

function M.cancel(self)
	if self.inventory_confirmation then
		self.inventory_confirmation = nil
		self.dirty = true
		return true
	end
	if self.inventory_item then
		self.inventory_item = nil
		request(self)
		return true
	end
	return false
end

local function select_item(self, id)
	self.inventory_item = id
	self.inventory_quantity = "1"
	request(self)
end

local function quantity_input(self, view, x, y, field, value, maximum)
	local node = view.box(self, x, y, 92, 32, view.colors.bg)
	local text = view.plain_text(self, x, y, value, 16, view.colors.white, nil, false, true)
	local input = self.druid:new_input(node, text)
	self.inventory_inputs[field] = input
	input:set_max_length(10)
	input:set_text(tostring(value))
	input.on_input_text:subscribe(function(_, entered)
		self[field] = entered
	end)
	view.button(self, x + 92, y, 76, "Set", function()
		local number = tonumber(self[field] or value)
		if number and number % 1 == 0 and number >= 1 and number <= maximum then
			self.inventory_input_error = nil
			request(self)
		else
			self.inventory_input_error = "Enter a whole amount from 1 to " .. maximum
			self.dirty = true
		end
	end)
	-- Register text entry in the same Tab/Enter path as the Druid buttons.
	table.insert(self.buttons, {
		node = node,
		enabled = true,
		fn = function()
			input:select()
		end,
	})
end

local function action_button(self, view, x, y, width, entry)
	view.button(self, x, y, width, entry.label, function()
		if entry.command.type == "discard_item" then
			self.inventory_confirmation = entry
			self.dirty = true
		else
			submit(self, entry)
		end
	end, entry.enabled and not self.inventory_pending, true)
end

local function disabled_reasons(actions)
	local seen, reasons = {}, {}
	for _, entry in ipairs(actions) do
		if entry.reason ~= "" and not seen[entry.reason] then
			seen[entry.reason] = true
			reasons[#reasons + 1] = entry.reason
		end
	end
	return table.concat(reasons, " · ")
end

function M.render(self, view, context, service)
	self.inventory_inputs = {}
	local key = context .. ":" .. (service or "")
	if self.inventory_key ~= key then
		if self.inventory_service ~= service then
			self.inventory_page = 1
			self.inventory_item = nil
			self.inventory_stored = false
		end
		self.inventory_key = key
		self.inventory_service = service
		request(self)
	end
	local model = self.inventory_data
	if not model then
		view.text(self, 115, 470, "Loading inventory…", 19, view.colors.muted)
		return
	end
	local h, detail = model.header, model.detail
	local c = view.colors
	if self.inventory_confirmation then
		view.text(self, 130, 465, "Discard " .. detail.quantity .. " × " .. detail.name .. "?", 25, c.white)
		view.text(
			self,
			130,
			407,
			"These items are removed permanently. There is no ground pickup or refund.",
			18,
			c.muted
		)
		view.button(self, 345, 294, 350, "Confirm discard", function()
			submit(self, self.inventory_confirmation)
		end, not self.inventory_pending, true)
		view.button(self, 760, 294, 350, "Keep items", function()
			self.inventory_confirmation = nil
			self.dirty = true
		end)
		return
	end
	view.text(self, 108, 536, "Pack " .. h.carried .. "/" .. h.capacity .. " · Equipped " .. h.equipped, 16, c.teal)
	if h.bank then
		view.button(self, 724, 536, 150, "Carried", function()
			self.inventory_stored = false
			self.inventory_page = 1
			self.inventory_item = nil
			request(self)
		end, true, not h.stored)
		view.button(self, 919, 536, 220, "Bank " .. h.stored_count .. "/" .. h.bank_capacity, function()
			self.inventory_stored = true
			self.inventory_page = 1
			self.inventory_item = nil
			request(self)
		end, true, h.stored)
	else
		view.text(self, 650, 536, h.gold .. " gold · Select an item for details", 16, c.muted)
	end
	for index, row in ipairs(model.rows) do
		local y = 483 - (index - 1) * 53
		local node = view.box(self, 344, y, 472, 47, row.id == self.inventory_item and c.edge or c.bg)
		view.icon(self, 138, y, row.tile, 34)
		view.text(self, 168, y + 9, row.name, 17, c.white)
		local summary = row.summary
			.. (row.durability and " · Durability " .. row.durability .. "/" .. row.maximum or "")
		view.text(self, 168, y - 12, summary, 13, c.muted)
		local fn = function()
			select_item(self, row.id)
		end
		self.druid:new_button(node, fn)
		table.insert(self.buttons, { node = node, fn = fn, enabled = true, label = row.name })
	end
	if #model.rows == 0 then
		view.text(self, 124, 467, "No items here yet.", 19, c.muted)
	end
	view.button(self, 170, 166, 124, "Previous", function()
		self.inventory_page = h.page - 1
		request(self)
	end, h.page > 1)
	view.text(self, 347, 166, h.page .. " / " .. h.pages, 16, c.muted, nil, false, true)
	view.button(self, 520, 166, 124, "Next", function()
		self.inventory_page = h.page + 1
		request(self)
	end, h.page < h.pages)
	if detail then
		view.text(self, 636, 489, detail.name, 23, c.white, nil, true)
		view.text(
			self,
			636,
			459,
			detail.location
				.. (
					detail.durability and " · Durability " .. detail.durability .. "/" .. detail.maximum_durability
					or ""
				),
			14,
			c.teal
		)
		view.text(self, 636, 426, detail.description, 15, c.muted, 525)
		view.text(self, 636, 388, detail.bonuses, 16, c.white)
		view.text(self, 636, 362, detail.prices, 14, c.muted)
		view.text(self, 636, 337, detail.restriction, 13, c.muted)
		view.text(self, 636, 306, "Quantity", 14, c.teal)
		quantity_input(self, view, 771, 306, "inventory_quantity", detail.quantity, detail.maximum_quantity)
		view.button(self, 953, 306, 75, "−", function()
			self.inventory_quantity = tostring(math.max(1, detail.quantity - 1))
			request(self)
		end, detail.quantity > 1)
		view.button(self, 1036, 306, 75, "+", function()
			self.inventory_quantity = tostring(math.min(detail.maximum_quantity, detail.quantity + 1))
			request(self)
		end, detail.quantity < detail.maximum_quantity)
		view.button(self, 1119, 306, 75, "All", function()
			self.inventory_quantity = tostring(detail.maximum_quantity)
			request(self)
		end)
		for index, entry in ipairs(model.actions) do
			local width = #model.actions == 3 and 162 or #model.actions == 2 and 250 or 520
			local x = 636 + width / 2 + (index - 1) * (width + 12)
			action_button(self, view, x, 252, width, entry)
		end
		view.text(self, 636, 211, disabled_reasons(model.actions), 12, c.sp, 520)
	else
		view.text(self, 636, 467, "Select an item to inspect it.", 19, c.muted)
	end
	if h.bank then
		view.text(self, 636, 199, "Gold: carried " .. h.gold .. " · bank " .. h.bank_gold, 14, c.teal)
		quantity_input(self, view, 682, 166, "inventory_amount", h.amount, 1000000000)
		for index, entry in ipairs(model.gold_actions) do
			action_button(self, view, 903 + (index - 1) * 174, 166, 158, entry)
		end
		view.text(self, 636, 128, disabled_reasons(model.gold_actions), 12, c.sp, 520)
	else
		view.text(self, 636, 172, "Tab / Enter: select and act · Escape: clear selection / close", 13, c.muted)
	end
	if self.inventory_input_error then
		view.text(self, 636, 131, self.inventory_input_error, 13, c.sp)
	end
end

return M
