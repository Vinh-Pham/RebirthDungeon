local ink = require("ink.story")
local U = require("game.domain.util")
local C = require("game.content.catalog")
local M = { VERSION = 2 }

local function action(tags)
	for _, tag in ipairs(tags or {}) do
		local id = tag:match("^action:(%w+)$")
		if id then
			return id
		end
	end
end

---@return table continuation, string|nil requested_action
---Restore never invokes bindings. Only an explicit choice returns an allowlisted intent.
---Version-one stories retain their original source until the player starts a new conversation.
function M.advance(saved, choice, service, restart)
	service = service or "gate"
	assert(C.services[service], "Unknown storyteller")
	assert(not saved or saved.version == 1 or saved.version == M.VERSION, "Unsupported story version")
	assert(not saved or saved.version == 1 or saved.service == service, "Story belongs to another service")
	if restart then
		assert(not choice, "Restart before choosing a topic")
		saved = nil
	end
	local version = saved and saved.version or M.VERSION
	local path = version == 1 and "/assets/dialogue/town.json" or "/assets/dialogue/services/" .. service .. ".json"
	local source = assert(sys.load_resource(path))
	if source:sub(1, 3) == "\239\187\191" then
		source = source:sub(4)
	end
	local story = ink.create(source)
	local paragraphs, choices
	if saved then
		paragraphs, choices = story.restore(saved.state, false)
	else
		paragraphs, choices = story.continue()
	end
	local requested
	if choice then
		assert(U.integer(choice, 1, #choices), "This dialogue choice is no longer available")
		requested = action(choices[choice].tags)
		paragraphs, choices = story.continue(choice)
	end
	local text, options, actions = {}, {}, {}
	for _, paragraph in ipairs(paragraphs or {}) do
		text[#text + 1] = paragraph.text
	end
	for index, entry in ipairs(choices or {}) do
		options[index] = entry.text
		actions[index] = action(entry.tags) or ""
	end
	local result = { version = version, state = U.copy(story.get_state()), paragraphs = text, choices = options }
	if version == M.VERSION then
		result.service = service
		result.actions = actions
	end
	return result, requested
end

return M
