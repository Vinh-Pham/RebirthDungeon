local D = require("game.domain.dungeon")
local M = {}

---Upgrade old single-choice treasure runs without rerolling any saved rewards.
---@param p table
---@return table
function M.migrate(p)
	p.format_version = 3
	local run = p.run
	if not run then
		return p
	end
	D.add_reward_room(run.map)
	if not run.treasure_version then
		run.treasure_version = 1
		run.keys = run.chests and not run.chosen and 1 or 0
		if run.chests then
			for index, chest in ipairs(run.chests) do
				chest.opened = run.chosen == index
			end
		end
		run.chosen = nil
		if p.phase == "treasure" then
			p.phase = "dungeon"
			local room = run.map.rooms[8]
			p.position = { x = room.x * 48, y = room.y * 48 }
		end
	end
	return p
end
return M
