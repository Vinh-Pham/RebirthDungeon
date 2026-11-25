local flow = require("game.integrations.flow")

local M = {}
local Scene = {}
Scene.__index = Scene

function M.new()
	local width, height = flow.ui.get_size()
	local self = setmetatable({
		root = flow.ui.cp.Box({ key = "root", color = "transparent" }),
		width = width,
		height = height,
	}, Scene)
	flow.ui.mount(self)
	return self
end

function Scene:begin()
	self.root.children = {}
	self.order = {}
	self.anchors = {}
	self.previous_buttons = self.buttons or {}
	self.buttons = {}
end

function Scene:button(key, props)
	-- Keep the pressed element alive when the camera or game state redraws the HUD.
	local button = self.previous_buttons[key] or flow.ui.cp.Button({ key = key })
	for name, value in pairs(props) do
		button[name] = value
	end
	self.buttons[key] = button
	return button
end

function Scene:place(element, x, y, w, h)
	-- Each fixed region is a Flow overlay, with its own flex layout inside.
	local anchor = flow.ui.cp.Box({
		key = element.key .. "_anchor",
		_is_overlay = true,
		color = "transparent",
		style = { padding_left = x, padding_top = y, padding_right = self.width - x - w, padding_bottom = self.height - y - h },
		children = { element },
	})
	self.root.children[#self.root.children + 1] = anchor
	self.anchors[#self.anchors + 1] = anchor
	self.order[#self.order + 1] = element
end

function Scene:add_native(node)
	self.order[#self.order + 1] = node
end

local function order_element(nodes, element, previous)
	local node = nodes[element.key]
	if previous then
		gui.move_above(node, previous)
	end
	-- Flow parents scroll content to its stencil node. Ordering those children
	-- against the flat scene would move them out of their clipping hierarchy.
	if element.type == "scroll" then
		return node
	end
	for _, child in ipairs(element.children or {}) do
		node = order_element(nodes, child, node)
	end
	return node
end

function Scene:render()
	flow.ui.render(self, self.root)
	for _, anchor in ipairs(self.anchors) do
		-- Input should hit only the placed region, including its Flow children.
		anchor.layout = anchor.children[1].layout
	end
	local nodes = self.ui.nodes
	local previous = nodes[self.root.key]
	for _, element in ipairs(self.order) do
		if type(element) == "table" then
			previous = order_element(nodes, element, previous)
		else
			gui.move_above(element, previous)
			previous = element
		end
	end
end

local TOUCH = hash("touch")
local WHEEL = { [hash("mouse_wheel_up")] = hash("scroll_up"), [hash("mouse_wheel_down")] = hash("scroll_down") }
function Scene:on_input(id, action)
	local wheel = WHEEL[id]
	if wheel and not (action.pressed or action.repeated) then
		return false
	end
	if (id == TOUCH or id == nil or wheel) and action.x and action.y then
		return flow.ui.on_input(self, wheel or id, action)
	end
	return false
end

function Scene:final()
	for _, node in pairs(self.ui.nodes) do
		gui.delete_node(node)
	end
end

M.Text = flow.ui.cp.Text
M.Box = flow.ui.cp.Box
return M
