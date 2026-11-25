local flow = require("game.integrations.flow")

local M = {}
local Menu = {}
Menu.__index = Menu

local ROW_HEIGHT = 30
local BORDER = 2
local MAX_ROWS = 8

function M.new(key, options, value, anchor, viewport_height)
	local index = 1
	for i, option in ipairs(options) do
		if option.value == value then
			index = i
			break
		end
	end
	local height = math.min(MAX_ROWS, #options) * ROW_HEIGHT
	local menu_height = height + 2 * BORDER
	local below = anchor.y + anchor.h
	local top = below + menu_height <= viewport_height and below or anchor.y - menu_height
	local self = setmetatable({
		key = key,
		options = options,
		value = value,
		index = index,
		x = anchor.x,
		y = top,
		width = anchor.w,
		height = menu_height,
		scroll = flow.ui.cp.Scroll({
			key = key .. "_scroll",
			style = { height = height, padding_right = 12 },
			_virtual_height = #options * ROW_HEIGHT,
			_bounce = false,
			_momentum = false,
		}),
	}, Menu)
	self:move(0)
	return self
end

function Menu:move(delta)
	self.index = math.max(1, math.min(#self.options, self.index + delta))
	local top = (self.index - 1) * ROW_HEIGHT
	local offset = self.scroll._scroll_y
	self.scroll._scroll_y = math.max(top + ROW_HEIGHT - self.scroll.style.height, math.min(top, offset))
end

function Menu:contains(x, y)
	return x >= self.x and x < self.x + self.width and y >= self.y and y < self.y + self.height
end

function Menu:render(scene, colors, choose)
	local children = {}
	for i, option in ipairs(self.options) do
		local key = self.key .. "_option_" .. option.value
		children[i] = scene:button(key, {
			style = { height = ROW_HEIGHT, padding_left = 8, justify_content = "center" },
			color = i == self.index and colors.focus or colors.background,
			on_click = function()
				choose(option.value)
			end,
			children = {
				flow.ui.cp.Text({
					key = key .. "_label",
					text = option.label,
					font = "ui",
					color = option.value == self.value and colors.selected or colors.text,
					style = { height = ROW_HEIGHT },
				}),
			},
		})
	end
	self.scroll.color = colors.background
	self.scroll.children = children
	scene:place(
		flow.ui.cp.Box({
			key = self.key,
			style = { width = self.width, height = self.height, padding = BORDER },
			color = colors.border,
			children = { self.scroll },
		}),
		self.x,
		self.y,
		self.width,
		self.height
	)
end

return M
