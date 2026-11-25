local catalog = require("game.data.mutations.catalog")
local M = {}

-- Apply authored additive effects to a candidate anatomy projection.
function M.apply(stats, ids)
	for _, id in ipairs(ids) do
		local mutation = catalog[id]
		if mutation then
			for stat, modifier in pairs(mutation.stats) do
				stats[stat] = stats[stat] + modifier
			end
		end
	end
	return stats
end

return M
