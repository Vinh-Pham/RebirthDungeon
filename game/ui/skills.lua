-- Journal presentation consumes messages only; it never reads or mutates gameplay modules.
local M = {}

local function request(self)
    self.skills_token = (self.skills_token or 0) + 1
    self.skills_data = nil
    msg.post("/bootstrap#session", "skills_request", {token = self.skills_token,
        group = self.skills_group or "All", page = self.skills_page or 1,
        skill = self.skills_selected or "", target = self.target or ""})
    self.dirty = true
end

function M.on_message(self, id, message)
    if id == hash("skills_result") then
        self.skills_pending = false
        request(self)
        return true
    end
    if message.token ~= self.skills_token then return false end
    if id == hash("skills_begin") then
        self.skills_incoming = {header = message.header, rows = {}, objectives = {}}
    elseif id == hash("skills_row") then
        table.insert(self.skills_incoming.rows, message.row)
    elseif id == hash("skills_detail") then
        self.skills_incoming.detail = message
    elseif id == hash("skills_sources") then
        self.skills_incoming.detail.route = message.route
        self.skills_incoming.detail.source = message.source
    elseif id == hash("skills_actions") then
        self.skills_incoming.detail.advance = message.advance
        self.skills_incoming.detail.use = message.use
    elseif id == hash("skills_objective") then
        table.insert(self.skills_incoming.objectives, message.objective)
    elseif id == hash("skills_end") then
        self.skills_data = self.skills_incoming; self.skills_incoming = nil; self.dirty = true
    else return false end
    return true
end

function M.cancel(self)
    if self.skills_show_source then self.skills_show_source=false;self.dirty=true;return true end
    if not self.skills_selected then return false end
    self.skills_selected = nil; self.focus = self.skills_parent_focus; request(self)
    return true
end

local function submit(self, action)
    if not action.enabled or self.skills_pending then return end
    self.skills_pending = true
    msg.post("/bootstrap#session", "skills_command", action.command)
    self.dirty = true
end

local function select_skill(self, id)
    self.skills_parent_focus = self.focus
    self.skills_selected = id
    self.skills_show_source = false
    request(self)
end

function M.render(self, view, context)
    if self.skills_key ~= context then
        self.skills_key = context
        request(self)
    end
    local model = self.skills_data
    if not model then view.text(self, 112, 477, "Loading skills…", 18, view.colors.muted); return end
    local c, h = view.colors, model.header
    for index, group in ipairs({"All", "Life", "Combat", "Magic"}) do
        view.button(self, 167 + (index - 1) * 144, 533, 130, group, function()
            self.skills_group = group; self.skills_page = 1; self.skills_selected = nil; self.skills_show_source = false; request(self)
        end, true, h.group == group)
    end
    view.text(self, 791, 533, h.ap .. " AP · " .. (h.frozen and "Run ranks frozen" or "Town"), 17, c.teal)
    for index, row in ipairs(model.rows) do
        local y = 463 - (index - 1) * 77
        local node = view.box(self, 309, y, 405, 65, row.id == self.skills_selected and c.edge or c.bg)
        view.icon(self, 139, y, row.tile, 38)
        view.text(self, 174, y + 12, row.name .. " · " .. row.rank, 19, c.white, nil, true)
        view.text(self, 174, y - 13, row.training .. " / 100" .. (row.alias and " · Combat Mastery" or row.kind == "passive" and " · Passive" or " · Active"), 14, c.muted)
        local fn = function() select_skill(self, row.id) end
        self.druid:new_button(node, fn)
        table.insert(self.buttons, {node = node, fn = fn, enabled = true, label = row.name})
    end
    if #model.rows == 0 then
        view.text(self, 112, 460, h.group == "Life" and "Life skills are reference-only for now." or "No learned skills in this category.", 17, c.muted, 400)
    end
    view.button(self, 171, 168, 130, "Previous", function() self.skills_page = h.page - 1; request(self) end, h.page > 1)
    view.text(self, 309, 168, h.page .. " / " .. h.pages, 15, c.muted, nil, false, true)
    view.button(self, 449, 168, 130, "Next", function() self.skills_page = h.page + 1; request(self) end, h.page < h.pages)
    local detail = model.detail
    if not detail then
        view.text(self, 556, 468, "Select a learned skill", 24, c.white, nil, true)
        view.text(self, 556, 411, "Inspect effects, exact costs, requirements and training. Attack shares Combat Mastery's progression.", 18, c.muted, 590)
        view.text(self, 556, 298, "Starter skills support F rank. Broad F–1 advancement, books and instructor lessons arrive in milestone 6.", 17, c.muted, 590)
        return
    end
    view.text(self, 555, 481, detail.name .. " · Rank " .. detail.rank .. " · " .. detail.training .. " / 100", 23, c.white, nil, true)
    view.text(self, 555, 438, detail.description, 16, c.muted, 595)
    view.text(self, 555, 390, detail.cost, 15, c.teal)
    view.text(self, 555, 362, detail.requirement, 14, c.muted)
    view.text(self, 555, 333, detail.bonuses, 14, c.white, 595)
    for index, objective in ipairs(model.objectives) do
        view.text(self, 555, 297 - (index - 1) * 23, objective.count .. "/" .. objective.limit .. " · " .. objective.points .. " points · " .. objective.text, 12, c.muted)
    end
    if detail.legacy > 0 then view.text(self, 555, 251, "Preserved training from your previous save: " .. detail.legacy, 12, c.teal) end
    view.button(self, 693, 210, 276, "Advance", function() submit(self, detail.advance) end, detail.advance.enabled and not self.skills_pending, true)
    view.button(self, 1007, 210, 276, "Use skill", function() submit(self, detail.use) end, detail.use.enabled and not self.skills_pending, true)
    view.text(self, 555, 175, detail.advance.reason, 11, c.sp, 285)
    view.text(self, 869, 175, detail.use.enabled and ("Target: " .. detail.use.target) or detail.use.reason, 11, c.sp, 285)
    view.button(self, 714, 579, 160, "Back to list", function() M.cancel(self) end)
    view.button(self, 1057, 579, 180, "Source / learning", function()
        self.skills_show_source = not self.skills_show_source; self.dirty = true
    end)
    if self.skills_show_source then
        view.box(self, 853, 372, 630, 264, c.bg)
        view.text(self, 560, 459, "F-rank content and acquisition", 20, c.teal, nil, true)
        view.text(self, 560, 411, detail.source, 16, c.white, 585)
        view.text(self, 560, 337, detail.route, 16, c.muted, 585)
        view.text(self, 560, 266, "Only authored starter values are executable. Higher source ranks are not installed.", 12, c.muted)
    end
end

return M
