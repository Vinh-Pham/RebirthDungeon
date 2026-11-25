local M = {}
function M.choose(can_attack, actions)
	if not can_attack then
		return "defend"
	end
	return ({ "defend", "attack", "smash" })[(actions or 0) % 3 + 1]
end
return M
