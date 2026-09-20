-- Per-controller display state. Every request to gameplay crosses a Defold message.
local M = {}

local function reset_log(self)
    self.log_anchor=0;self.log_group=nil;self.log_detail_page=1;self.log_identity=nil
end

function M.request(self)
    self.ui_refreshing=true;self.ui_token=(self.ui_token or 0)+1
    msg.post("/bootstrap#session", "ui_request", {token=self.ui_token,target = self.target or "", selected_skill = self.selected_skill or "",
        selected = self.selected or {}, log_record = self.log_identity or "", log_anchor = self.log_anchor or 0, log_group = self.log_group or "", log_detail_page = self.log_detail_page or 1})
end

function M.intent(self, kind, data)
    local message = data or {}
    message.kind = kind
    local p = self.ui.profile
    if p then message.profile = p.id; message.revision = p.revision end
    msg.post("/bootstrap#session", "ui_intent", message)
end

function M.command(self, command)
    if self.ui_pending or self.ui_refreshing then return end
    local p = self.ui.profile
    command.profile = p.id; command.revision = p.revision
    self.ui_pending = true
    msg.post("/bootstrap#session", "ui_command", command)
end

function M.attach(self, data)
    self.ui = data
    data.world_labels = self.world_labels or {}
    data.snapshot = function() return self.ui.profile end
    data.refresh = function() self.dirty = true; M.request(self) end
    data.list = function() M.intent(self, "list") end
    data.set_screen = function(screen) M.intent(self, "screen", {screen = screen}) end
    data.panel = function(panel) M.intent(self, panel and "panel" or "close", {panel = panel}) end
    data.select = function(id) M.intent(self, "select", {id = id}) end
    data.create = function(name, race, age, talent) M.intent(self, "create", {name = name, race = race, age = age, talent = talent}) end
    data.set_setting = function(key, value) M.intent(self, "setting", {key = key, value = value}) end
    data.retry = function() M.intent(self, "retry") end
    data.reload = function() M.intent(self, "reload") end
    data.world_interact = function() M.intent(self, "interact") end
end

function M.on_message(self, id, message)
    if id == hash("ui_begin") then self.ui_sequence = message.token==self.ui_token and message.sequence or -1; self.ui_parts = {}; return true end
    if id == hash("ui_part") then
        if message.sequence == self.ui_sequence then table.insert(self.ui_parts, message.text) end
        return true
    end
    if id == hash("ui_end") then
        if message.sequence == self.ui_sequence then
            local data = json.decode(table.concat(self.ui_parts))
            local previous = self.ui.profile
            if (previous and previous.id) ~= (data.profile and data.profile.id) then
                self.form = nil; self.target = nil; self.selected = {}; self.skills_selected = nil
                self.inventory_item = nil; self.inventory_key = nil; self.skills_key = nil; self.service_key = nil
                self.inventory_page = 1; self.inventory_stored = false; self.inventory_quantity = "1"; self.inventory_amount = "1"
                self.skills_group = "All"; self.skills_page = 1; self.skills_show_source = false; self.service_id = nil
                self.inventory_pending = false; self.skills_pending = false; self.service_pending = false
                self.focus = nil; self.focus_scope = nil; self.focus_by_scope = {}; self.log_page = 1; self.character_details = false
                reset_log(self)
            end
            if (previous and previous.pending and previous.pending.id)~=(data.profile and data.profile.pending and data.profile.pending.id) then self.selected={} end
            local identity=data.profile and data.profile.combat_log.id
            if self.log_identity~=identity then reset_log(self);self.log_identity=identity end
            M.attach(self, data); self.ui_refreshing=false; self.dirty = true
        end
        return true
    end
    if id == hash("ui_result") then self.ui_pending = false; M.request(self); return true end
    if id == hash("world_labels") then self.world_labels = message.labels; self.ui.world_labels = message.labels; return true end
    return false
end

return M
