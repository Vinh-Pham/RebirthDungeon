local M = {}

function M.guard_damage(damage)
	return math.ceil(damage / 2)
end

return M
