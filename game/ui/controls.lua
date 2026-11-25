-- Flow input ownership for the retained GUI harness and its editable fields.
local flow = require("game.integrations.flow")
local M = {}
local Controls = {}
Controls.__index = Controls
function M.new()
	local self = setmetatable({ inputs = {} }, Controls)
	flow.ui.mount(self)
	self.ui.tree = flow.ui.cp.Box({ children = {}, layout = { x = 0, y = 0, w = 1280, h = 720 } })
	return self
end
function Controls:new_button(node, callback)
	local position = gui.get_position(node)
	-- All retained controls are direct children of the centered, fitted root.
	position = position + vmath.vector3(640, 360, 0)
	local size = gui.get_size(node)
	local key = tostring(#self.ui.tree.children + 1)
	local element = flow.ui.cp.Button({ key = key, on_click = callback })
	element.layout = { x = position.x - size.x / 2, y = position.y - size.y / 2, w = size.x, h = size.y }
	self.ui.nodes[key] = node
	self.ui.tree.children[#self.ui.tree.children + 1] = element
	return { set_enabled = function(_, enabled) element._visible = enabled end }
end
function Controls:new_input(node, label)
	local input = { is_selected = false, value = "", maximum = 1000, listeners = {} }
	function input:set_max_length(value) self.maximum = value end
	function input:set_text(value)
		self.value = tostring(value):sub(1, self.maximum)
		gui.set_text(label, self.value)
		for _, callback in ipairs(self.listeners) do callback(nil, self.value) end
	end
	function input:select() self.is_selected = true end
	function input:unselect() self.is_selected = false end
	input.on_input_text = { subscribe = function(_, callback) input.listeners[#input.listeners + 1] = callback end }
	self.inputs[#self.inputs + 1] = input
	self:new_button(node, function()
		for _, field in ipairs(self.inputs) do field:unselect() end
		input:select()
	end)
	return input
end
function Controls:on_input(id, action)
	if id == hash("touch") and action.pressed then
		for _, input in ipairs(self.inputs) do input:unselect() end
	end
	for _, input in ipairs(self.inputs) do
		if input.is_selected then
			if id == hash("text") and action.text then input:set_text(input.value .. action.text) return true end
			if (id == hash("backspace") or id == hash("key_backspace")) and (action.pressed or action.repeated) then
				input:set_text(input.value:gsub("[\128-\191]*$", ""):sub(1, -2))
				return true
			end
		end
	end
	if (id == hash("touch") or id == nil) and action.x and action.y then
		return flow.ui.on_input(self, id, action)
	end
	return false
end
function Controls:final()
	self.inputs = {}
	self.ui.tree = nil
	self.ui.nodes = {}
end
return M
