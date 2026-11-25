local ink = require("ink.story")

local M = {}
local ARRIVAL = "game/data/dialogue/arrival.json"

local function read_arrival()
	if sys and sys.load_resource then
		return assert(sys.load_resource("/" .. ARRIVAL))
	end
	local file = assert(io.open(ARRIVAL, "rb"))
	local source = file:read("*a")
	file:close()
	return source
end

function M.arrival()
	local source = read_arrival():gsub("^\239\187\191", "")
	-- This story uses no randomness. Keep the Ink constructor from reseeding
	-- Lua's shared RNG, and use the same JSON document in host and Defold tests.
	local environment = getfenv(ink.create)
	setfenv(ink.create, setmetatable({
		json = json or require("game.json"),
		math = setmetatable({ randomseed = function() end }, { __index = math }),
	}, { __index = environment }))
	local ok, story = pcall(ink.create, source)
	setfenv(ink.create, environment)
	assert(ok, story)
	local paragraphs = story.continue()
	local lines = {}
	for _, paragraph in ipairs(paragraphs) do
		lines[#lines + 1] = paragraph.text
	end
	return table.concat(lines, "\n")
end

return M
