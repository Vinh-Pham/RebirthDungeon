local richtext = require("richtext.richtext")
local M = {}

function M.line(view, x, y, text, tint)
	-- Escape angle brackets before parsing, including character-provided names.
	local escaped = tostring(text):gsub("<", "&lt;"):gsub(">", "&gt;")
	local words = richtext.create(escaped, "prose", {
		position = vmath.vector3(x, 720 - y, 0),
		color = tint,
		valign = richtext.VALIGN_MIDDLE,
		combine_words = true,
	})
	for _, word in ipairs(words) do
		view.nodes[#view.nodes + 1] = word.node
		view.flow:add_native(word.node)
	end
end

return M
