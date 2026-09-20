-- Service UI consumes only messages; prices and mutations belong to the session.
local M = {}

local function request(self)
    self.service_token = (self.service_token or 0) + 1
    self.service_data = nil
    msg.post("/bootstrap#session", "service_request", {token = self.service_token,
        service = self.service_id, dialogue = self.service_dialogue, quantity = tonumber(self.service_quantity) or 1})
    self.dirty = true
end

local function submit(self, entry)
    if self.service_pending or not entry.enabled then return end
    self.service_pending = true
    msg.post("/bootstrap#session", "service_command", entry.command)
    self.dirty = true
end

function M.on_message(self, id, message)
    if id == hash("service_result") then
        self.service_pending = false
        if self.service_id then request(self) end
        return true
    end
    if message.token ~= self.service_token then return false end
    if id == hash("service_begin") then self.service_incoming = {header = message.header, rows = {}, paragraphs = {}, choices = {}}
    elseif id == hash("service_row") then table.insert(self.service_incoming.rows, message.row)
    elseif id == hash("service_paragraph") then table.insert(self.service_incoming.paragraphs, message.text)
    elseif id == hash("service_choice") then table.insert(self.service_incoming.choices, message.entry)
    elseif id == hash("service_action") then self.service_incoming.action = message.entry
    elseif id == hash("service_end") then self.service_data = self.service_incoming; self.service_incoming = nil; self.dirty = true
    else return false end
    return true
end

local function action_button(self, view, x, y, width, action)
    view.button(self, x, y, width, action.label, function() submit(self, action) end, action.enabled and not self.service_pending, true)
    if action.reason ~= "" then view.text(self, x - width / 2, y - 28, action.reason, 12, view.colors.sp, width) end
end

function M.talk(self, view, service, x, y)
    view.button(self, x, y, 145, "Talk", function()
        msg.post("/bootstrap#session", "service_open", {service = service, dialogue = true})
    end)
end

function M.render(self, view, context, service, dialogue)
    local key = context .. ":" .. service .. ":" .. tostring(dialogue)
    if self.service_key ~= key then
        if self.service_id ~= service or self.service_dialogue ~= dialogue then
            self.service_quantity = "1"; self.service_pending = false; self.service_input_error = nil
        end
        self.service_id = service; self.service_dialogue = dialogue; self.service_key = key
        request(self)
    end
    local model = self.service_data
    if not model then view.text(self, 112, 480, "Loading service…", 18, view.colors.muted); return end
    local h, c = model.header, view.colors
    view.text(self, 112, 536, h.name .. " · " .. h.gold .. " gold · Pack " .. h.carried .. "/" .. h.capacity, 17, c.teal)
    if dialogue then
        view.text(self, 120, 473, table.concat(model.paragraphs, "\n\n"), 20, c.white, 1020)
        for index, choice in ipairs(model.choices) do action_button(self, view, 640, 341 - (index - 1) * 66, 1030, choice) end
        view.button(self, 910, 579, 240, "Back to service", function()
            msg.post("/bootstrap#session", "service_open", {service = service})
        end)
        if #model.choices == 0 then action_button(self, view, 390, 212, 540, model.action) end
        return
    end
    if #model.rows > 0 then
        view.text(self, 741, 536, "Quantity", 15, c.muted)
        local node = view.box(self, 875, 536, 76, 32, c.bg)
        local label = view.text(self, 875, 536, self.service_quantity, 17, c.white, nil, false, true)
        local input = self.druid:new_input(node, label); self.service_input = input
        input:set_max_length(2); input:set_text(self.service_quantity)
        input.on_input_text:subscribe(function(_, entered) self.service_quantity = entered end)
        view.button(self, 989, 536, 120, "Set quantity", function()
            local quantity = tonumber(self.service_quantity)
            if quantity and quantity % 1 == 0 and quantity >= 1 and quantity <= 99 then
                self.service_input_error = nil; request(self)
            else self.service_input_error = "Enter a whole quantity from 1 to 99"; self.dirty = true end
        end)
        table.insert(self.buttons, {node = node, enabled = true, fn = function() input:select() end})
    end
    for index, row in ipairs(model.rows) do
        local y = 468 - (index - 1) * 71
        view.icon(self, 150, y, row.tile, 42)
        view.text(self, 192, y + 9, row.name, 20, c.white)
        view.text(self, 192, y - 15, row.detail, 13, c.muted)
        action_button(self, view, 947, y, 320, row.action)
    end
    if h.effect then
        view.icon(self, 172, 418, h.tile, 90)
        view.text(self, 250, 456, h.effect, 21, c.white, 805)
        if service == "healer" then view.text(self, 250, 389, "Defeat recovery is free. Claimed rewards and gold stay yours.", 17, c.muted, 805) end
    end
    if model.action then action_button(self, view, 496, #model.rows > 0 and 172 or 296, 510, model.action) end
    if #model.rows > 0 then
        view.button(self, 961, 172, 292, service == "blacksmith" and "Sell / repair inventory" or "Sell from inventory", function()
            self.shop_inventory = true; self.dirty = true
        end)
    end
    M.talk(self, view, service, #model.rows > 0 and 950 or 174, #model.rows > 0 and 579 or 193)
    if self.service_input_error then view.text(self, 710, 503, self.service_input_error, 12, c.sp) end
    if h.reason ~= "" then view.text(self, 250, 225, h.reason, 16, c.sp) end
end

return M
