-- Service UI consumes only messages; prices and mutations belong to the session.
local M = {}

-- Shop stock presents as a grid of cells, five per row.
local STOCK_COLS = 5

local function request(self)
	self.service_token = (self.service_token or 0) + 1
	self.service_data = nil
	msg.post("/bootstrap#session", "service_request", {
		token = self.service_token,
		service = self.service_id,
		dialogue = self.service_dialogue,
		quantity = tonumber(self.service_quantity) or 1,
	})
	self.dirty = true
end

local function submit(self, entry)
	if self.service_pending or not entry.enabled then
		return
	end
	self.service_pending = true
	msg.post("/bootstrap#session", "service_command", entry.command)
	self.dirty = true
end

function M.on_message(self, id, message)
	if id == hash("service_result") then
		self.service_pending = false
		if self.service_id then
			request(self)
		end
		return true
	end
	if message.token ~= self.service_token then
		return false
	end
	if id == hash("service_begin") then
		self.service_incoming = { header = message.header, rows = {}, paragraphs = {}, choices = {} }
	elseif id == hash("service_row") then
		table.insert(self.service_incoming.rows, message.row)
	elseif id == hash("service_paragraph") then
		table.insert(self.service_incoming.paragraphs, message.text)
	elseif id == hash("service_choice") then
		table.insert(self.service_incoming.choices, message.entry)
	elseif id == hash("service_action") then
		self.service_incoming.action = message.entry
	elseif id == hash("service_end") then
		self.service_data = self.service_incoming
		self.service_incoming = nil
		self.dirty = true
	else
		return false
	end
	return true
end

local function action_button(self, view, x, y, width, action)
	view.button(self, x, y, width, action.label, function()
		submit(self, action)
	end, action.enabled and not self.service_pending, true)
	if action.reason ~= "" then
		view.text(self, x - width / 2, y - 28, action.reason, 12, view.colors.sp, width)
	end
end

local function disabled_reasons(rows)
	local seen, reasons = {}, {}
	for _, row in ipairs(rows) do
		local reason = row.action.reason
		if reason ~= "" and not seen[reason] then
			seen[reason] = true
			reasons[#reasons + 1] = reason
		end
	end
	return table.concat(reasons, " · ")
end

-- One stock item as a grid cell: icon, name, effect detail and the buy action label.
local function stock_cell(self, view, row, x, y)
	local c = view.colors
	local enabled = row.action.enabled and not self.service_pending
	local node = view.box(self, x, y, 114, 118, enabled and c.panel or c.bg)
	view.icon(self, x, y + 32, row.tile, 46, enabled and nil or vmath.vector4(0.45, 0.5, 0.55, 1))
	view.text(self, x, y + 4, row.name, 12, enabled and c.white or c.muted, nil, false, true)
	view.text(self, x, y - 16, row.detail, 10, c.muted, 110, false, true)
	view.text(self, x, y - 48, row.action.label, 12, enabled and c.teal or c.muted, nil, false, true)
	local fn = function()
		submit(self, row.action)
	end
	self.druid:new_button(node, fn)
	table.insert(self.buttons, { node = node, fn = fn, enabled = row.action.enabled, label = row.action.label })
end

local function stock_grid(self, view, rows)
	for index, row in ipairs(rows) do
		local col, grid_row = (index - 1) % STOCK_COLS, math.floor((index - 1) / STOCK_COLS)
		stock_cell(self, view, row, 150 + col * 122, 430 - grid_row * 126)
	end
	local reasons = disabled_reasons(rows)
	if reasons ~= "" then
		view.text(self, 110, 222, reasons, 12, view.colors.sp, 560)
	end
end

function M.talk(self, view, service, x, y)
	view.button(self, x, y, 145, "Talk", function()
		msg.post("/bootstrap#session", "service_open", { service = service, dialogue = true })
	end)
end

function M.render(self, view, context, service, dialogue)
	local key = context .. ":" .. service .. ":" .. tostring(dialogue)
	if self.service_key ~= key then
		if self.service_id ~= service or self.service_dialogue ~= dialogue then
			self.service_quantity = "1"
			self.service_pending = false
			self.service_input_error = nil
		end
		self.service_id = service
		self.service_dialogue = dialogue
		self.service_key = key
		request(self)
	end
	local model = self.service_data
	if not model then
		view.text(self, 112, 480, "Loading service…", 18, view.colors.muted)
		return
	end
	local h, c = model.header, view.colors
	view.text(
		self,
		112,
		536,
		h.name .. " · " .. h.gold .. " gold · Pack " .. h.carried .. "/" .. h.capacity,
		17,
		c.teal
	)
	if dialogue then
		view.text(self, 120, 473, table.concat(model.paragraphs, "\n\n"), 20, c.white, 1020)
		for index, choice in ipairs(model.choices) do
			action_button(self, view, 640, 341 - (index - 1) * 66, 1030, choice)
		end
		view.button(self, 910, 579, 240, "Back to service", function()
			msg.post("/bootstrap#session", "service_open", { service = service })
		end)
		if #model.choices == 0 then
			action_button(self, view, 390, 212, 540, model.action)
		end
		return
	end
	if #model.rows > 0 then
		view.text(self, 741, 536, "Quantity", 15, c.muted)
		local node = view.box(self, 875, 536, 76, 32, c.bg)
		local label = view.plain_text(self, 875, 536, self.service_quantity, 17, c.white, nil, false, true)
		local input = self.druid:new_input(node, label)
		self.service_input = input
		input:set_max_length(2)
		input:set_text(self.service_quantity)
		input.on_input_text:subscribe(function(_, entered)
			self.service_quantity = entered
		end)
		view.button(self, 989, 536, 120, "Set quantity", function()
			local quantity = tonumber(self.service_quantity)
			if quantity and quantity % 1 == 0 and quantity >= 1 and quantity <= 99 then
				self.service_input_error = nil
				request(self)
			else
				self.service_input_error = "Enter a whole quantity from 1 to 99"
				self.dirty = true
			end
		end)
		table.insert(self.buttons, {
			node = node,
			enabled = true,
			fn = function()
				input:select()
			end,
		})
	end
	if #model.rows > 0 then
		stock_grid(self, view, model.rows)
	end
	if h.effect then
		view.icon(self, 172, 418, h.tile, 90)
		view.text(self, 250, 456, h.effect, 21, c.white, 805)
		if service == "healer" then
			view.text(self, 250, 389, "Defeat recovery is free. Claimed rewards and gold stay yours.", 17, c.muted, 805)
		end
	end
	if model.action then
		action_button(self, view, 496, #model.rows > 0 and 172 or 296, 510, model.action)
	end
	if #model.rows > 0 then
		view.button(
			self,
			961,
			172,
			292,
			service == "blacksmith" and "Sell / repair inventory" or "Sell from inventory",
			function()
				self.shop_inventory = true
				self.dirty = true
			end
		)
	end
	M.talk(self, view, service, #model.rows > 0 and 950 or 174, #model.rows > 0 and 579 or 193)
	if self.service_input_error then
		view.text(self, 710, 503, self.service_input_error, 12, c.sp)
	end
	if h.reason ~= "" then
		view.text(self, 250, 225, h.reason, 16, c.sp)
	end
end

return M
