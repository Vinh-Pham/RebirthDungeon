local V = require("game.ui.view")
local Bridge = require("game.ui.session")
local Inventory = require("game.ui.inventory")
local Services = require("game.ui.services")
local Skills = require("game.ui.skills")
local CombatLog = require("game.ui.combat_log")
local M = {}
local KEYS = {[hash("up")] = "up", [hash("down")] = "down", [hash("left")] = "left", [hash("right")] = "right"}

local function typing(self)
    if self.name_input and self.name_input.is_selected then return true end
    if self.service_input and self.service_input.is_selected then return true end
    for _, input in pairs(self.inventory_inputs or {}) do if input.is_selected then return true end end
    return false
end

local function unselect(self)
    if self.name_input then self.name_input:unselect() end
    if self.service_input then self.service_input:unselect() end
    for _, input in pairs(self.inventory_inputs or {}) do input:unselect() end
end

local function focus(self, direction)
    if #self.buttons == 0 then return end
    local index = self.focus or (direction > 0 and 0 or 1)
    for _ = 1, #self.buttons do
        index = (index - 1 + direction) % #self.buttons + 1
        if self.buttons[index].enabled then self.focus = index; V.focus(self); return end
    end
end

local function scroll(self, direction)
    for _, button in ipairs(self.buttons) do
        if button.label == (direction > 0 and "Next" or "Previous") and button.enabled then button.fn(); return end
    end
    if self.ui.modal == "character" then self.character_details = not self.character_details; self.dirty = true end
    if self.ui.modal == "log" or not self.ui.modal and self.ui.screen == "battle" then CombatLog.scroll(self,direction) end
end

function M.init(self)
    self.root = gui.new_box_node(vmath.vector3(640, 360, 0), vmath.vector3(1280, 720, 0))
    gui.set_color(self.root, vmath.vector4(0, 0, 0, 0)); gui.set_adjust_mode(self.root, gui.ADJUST_FIT)
    self.nodes = {}; self.dirty = true; self.focus_by_scope = {}
    Bridge.attach(self, {settings = {music = .4, effects = .65, hud_scale = 1, reduced_motion = false}})
    msg.post(".", "acquire_input_focus"); Bridge.request(self)
end

function M.update(self, dt)
    if not self.ui.screen then return end
    if self.dirty then self.dirty = false; V.render(self) end
    self.druid:update(dt); V.labels(self)
end

function M.on_input(self, id, action)
    if not self.druid then return end
    local S = self.ui
    if id == hash("shift") then self.shift = not action.released end
    local is_typing = typing(self)
    if is_typing and id == hash("escape") and action.pressed then
        unselect(self)
        return true
    end
    if not is_typing and id == hash("escape") and action.pressed then
        if S.modal and (S.modal == "inventory" or S.modal == "bank" or self.shop_inventory) and Inventory.cancel(self) then return true end
        if S.modal == "skills" and Skills.cancel(self) then return true end
        if self.shop_inventory then self.shop_inventory = false; self.dirty = true; return true end
        if S.modal=="log" and self.log_group then self.log_group=nil;Bridge.request(self);return true end
        if self.character_details then self.character_details = false; self.dirty = true; return true end
    end
    if id == hash("tab") and action.pressed then unselect(self);focus(self, self.shift and -1 or 1); return true end
    if not is_typing and id == hash("enter") and action.pressed and self.focus then
        local button = self.buttons[self.focus]
        if button and button.enabled then button.fn() end
        return true
    end
    if self.druid:on_input(id, action) then return true end
    if is_typing then return true end
    if not id then return end
    if id == hash("escape") and action.pressed then
        if S.error and S.modal~="log" then return true end
        if S.modal then S.panel(nil)
        elseif S.screen == "create" or S.screen == "characters" then S.set_screen(S.screen == "create" and "characters" or "title")
        elseif S.screen == "rebirth" then S.set_screen(S.profile.phase)
        else S.panel("menu") end
        return true
    end
    if (id == hash("scroll_down") or id == hash("scroll_up")) and action.value ~= 0 then scroll(self, id == hash("scroll_down") and 1 or -1); return true end
    if S.modal or S.error or S.read_only or S.busy or self.ui_pending then return true end
    local p = S.profile
    if not p or S.screen ~= p.phase then return end
    for _, shortcut in ipairs({{"inventory", "inventory"}, {"quests", "quests"}, {"map", "map"}}) do
        if id == hash(shortcut[1]) and action.pressed and not action.repeated then
            if shortcut[2] ~= "map" or p.phase == "town" or p.phase == "dungeon" then S.panel(shortcut[2]) end
            return true
        end
    end
    if p.phase ~= "town" and p.phase ~= "dungeon" then return end
    if KEYS[id] then msg.post("/bootstrap#session", "world_key", {key = KEYS[id], held = not action.released}); return true end
    if id == hash("interact") and action.pressed then S.world_interact(); return true end
    if id == hash("touch") and action.pressed then
        local width, height = window.get_size()
        local x, y = require("game.world.coordinates").design(action.screen_x or action.x * width / 1280, action.screen_y or action.y * height / 720, width, height)
        if x >= 0 and x <= 1280 and y > 167 and y < 635 then msg.post("/bootstrap#session", "world_click", {x = x, y = y}) end
        return true
    end
end

function M.on_message(self, id, message, sender)
    if Bridge.on_message(self, id, message) or Inventory.on_message(self, id, message) or Skills.on_message(self, id, message) or Services.on_message(self, id, message) then return end
    if id == hash("focus") then msg.post(".", "acquire_input_focus") end
    if self.druid then self.druid:on_message(id, message, sender) end
end
function M.on_reload(self) Bridge.request(self); self.dirty = true end
function M.final(self)
    msg.post("/bootstrap#session", "ui_unsubscribe")
    if self.druid then self.druid:final() end
    for _, node in ipairs(self.nodes) do gui.cancel_animations(node) end
end

return M
