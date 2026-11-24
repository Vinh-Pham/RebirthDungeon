-- Presentation only: all inventory data and mutations cross the script message boundary.
local M = {}

-- Item grid: 6 columns x 5 rows of cells; equipment: 3x3 slot grid on the left.
local GRID_COLS, GRID_ROWS, CELL = 6, 5, 64
local PITCH_X, PITCH_Y = 72, 70
local GRID_X, GRID_Y = 344, 488
local EQUIP_CELL, EQUIP_PITCH = 58, 66
local DETAIL_X = 775
local HINT = "Tab / Enter: select and act · Escape: clear selection / close"

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
	elseif id == hash("inventory_equipment") then
		self.inventory_incoming.equipment = message.slots
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

-- Compact exact-quantity entry: input field plus Set, laid out to the right of a label.
local function quantity_input(self, view, x, y, field, value, maximum)
	local node = view.box(self, x + 38, y, 76, 32, view.colors.bg)
	local text = view.plain_text(self, x + 38, y, value, 16, view.colors.white, nil, false, true)
	local input = self.druid:new_input(node, text)
	self.inventory_inputs[field] = input
	input:set_max_length(10)
	input:set_text(tostring(value))
	input.on_input_text:subscribe(function(_, entered)
		self[field] = entered
	end)
	view.button(self, x + 116, y, 64, "Set", function()
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

-- Worn gear: nine fixed slots in three rows; empty slots show their label.
local function equipment_section(self, view, equipment)
	local c = view.colors
	view.text(self, 84, 512, "Equipment", 15, c.teal)
	for index, entry in ipairs(equipment) do
		local col, row = (index - 1) % 3, math.floor((index - 1) / 3)
		local x, y = 112 + col * EQUIP_PITCH, 464 - row * EQUIP_PITCH
		if entry.tile ~= "" then
			local selected = entry.id == self.inventory_item
			local node = view.box(self, x, y, EQUIP_CELL, EQUIP_CELL, selected and c.edge or c.bg)
			view.icon(self, x, y + 5, entry.tile, 40)
			local fn = function()
				select_item(self, entry.id)
			end
			self.druid:new_button(node, fn)
			table.insert(self.buttons, { node = node, fn = fn, enabled = true, label = entry.name })
		else
			view.box(self, x, y, EQUIP_CELL, EQUIP_CELL, c.bg)
			view.text(self, x, y + 4, entry.label, 11, c.muted, nil, false, true)
		end
	end
end

-- Carried or stored items as clickable grid cells with a quantity badge.
local function item_grid(self, view, model)
	local c = view.colors
	for index, row in ipairs(model.rows) do
		local col, grid_row = (index - 1) % GRID_COLS, math.floor((index - 1) / GRID_COLS)
		local x, y = GRID_X + col * PITCH_X, GRID_Y - grid_row * PITCH_Y
		local node = view.box(self, x, y, CELL, CELL, row.id == self.inventory_item and c.edge or c.bg)
		view.icon(self, x, y + 6, row.tile, 40)
		if row.quantity > 1 then
			view.text(self, x + 17, y - 20, "×" .. row.quantity, 12, c.white, nil, false, true)
		end
		local fn = function()
			select_item(self, row.id)
		end
		self.druid:new_button(node, fn)
		table.insert(self.buttons, { node = node, fn = fn, enabled = true, label = row.name })
	end
	if #model.rows == 0 then
		view.text(self, GRID_X + (GRID_COLS - 1) * PITCH_X / 2, 340, "No items here yet.", 17, c.muted)
	end
end

-- Bank gold belongs to the left column in bank mode; the item detail owns the right side.
local function bank_gold_section(self, view, model, h)
	local c = view.colors
	view.text(self, 84, 508, "Gold", 15, c.teal)
	view.text(self, 84, 482, "Carried " .. h.gold .. " · Bank " .. h.bank_gold, 13, c.white, 190)
	view.text(self, 84, 452, "Amount", 13, c.muted)
	quantity_input(self, view, 96, 424, "inventory_amount", h.amount, 1000000000)
	for index, entry in ipairs(model.gold_actions) do
		action_button(self, view, 178, 372 - (index - 1) * 48, 180, entry)
	end
	local reasons = disabled_reasons(model.gold_actions)
	if reasons ~= "" then
		view.text(self, 84, 288, reasons, 12, c.sp, 190)
	end
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
		view.button(self, 816, 536, 150, "Carried", function()
			self.inventory_stored = false
			self.inventory_page = 1
			self.inventory_item = nil
			request(self)
		end, true, not h.stored)
		view.button(self, 1030, 536, 220, "Bank " .. h.stored_count .. "/" .. h.bank_capacity, function()
			self.inventory_stored = true
			self.inventory_page = 1
			self.inventory_item = nil
			request(self)
		end, true, h.stored)
	else
		view.text(self, 1080, 536, h.gold .. " gold · Select an item for details", 16, c.muted, nil, false, true)
		if model.equipment then
			equipment_section(self, view, model.equipment)
		end
	end
	item_grid(self, view, model)
	view.button(self, 170, 146, 124, "Previous", function()
		self.inventory_page = h.page - 1
		request(self)
	end, h.page > 1)
	view.text(self, 347, 146, h.page .. " / " .. h.pages, 16, c.muted, nil, false, true)
	view.button(self, 520, 146, 124, "Next", function()
		self.inventory_page = h.page + 1
		request(self)
	end, h.page < h.pages)
	if detail then
		view.text(self, DETAIL_X, 520, detail.name, 23, c.white, nil, true)
		view.text(
			self,
			DETAIL_X,
			494,
			detail.location
				.. (
					detail.durability and " · Durability " .. detail.durability .. "/" .. detail.maximum_durability
					or ""
				),
			14,
			c.teal
		)
		view.text(self, DETAIL_X, 464, detail.description, 15, c.muted, 410)
		view.text(self, DETAIL_X, 398, detail.bonuses, 16, c.white, 410)
		view.text(self, DETAIL_X, 372, detail.prices, 14, c.muted, 410)
		view.text(self, DETAIL_X, 348, detail.restriction, 13, c.muted, 410)
		view.text(self, DETAIL_X, 324, "Quantity", 14, c.teal)
		quantity_input(self, view, 808, 298, "inventory_quantity", detail.quantity, detail.maximum_quantity)
		view.button(self, 992, 298, 56, "−", function()
			self.inventory_quantity = tostring(math.max(1, detail.quantity - 1))
			request(self)
		end, detail.quantity > 1)
		view.button(self, 1064, 298, 56, "+", function()
			self.inventory_quantity = tostring(math.min(detail.maximum_quantity, detail.quantity + 1))
			request(self)
		end, detail.quantity < detail.maximum_quantity)
		view.button(self, 1136, 298, 56, "All", function()
			self.inventory_quantity = tostring(detail.maximum_quantity)
			request(self)
		end)
		for index, entry in ipairs(model.actions) do
			action_button(self, view, 980, 250 - (index - 1) * 42, 400, entry)
		end
	else
		view.text(self, DETAIL_X, 480, "Select an item to inspect it.", 17, c.muted)
	end
	if h.bank then
		bank_gold_section(self, view, model, h)
	end
	-- One bounded status line: input errors, then item action reasons, then the control hint.
	-- Bank gold reasons render in the left gold column instead.
	local status, color
	if self.inventory_input_error then
		status, color = self.inventory_input_error, c.sp
	else
		local reasons = disabled_reasons(model.actions)
		if reasons ~= "" then
			status, color = reasons, c.sp
		end
	end
	view.text(self, DETAIL_X, 134, status or HINT, 12, color or c.muted, 412)
end

return M
