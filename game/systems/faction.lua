local disposition = require("game.data.factions.disposition")
local M = {}

function M.is_hostile_zone(location)
	return disposition[location] == "hostile"
end

return M
