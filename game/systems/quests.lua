local M = {}
function M.accept(world)
	if world.quest ~= 0 then
		return nil, "Quest already accepted."
	end
	return { quest = 1 }, "Carry the signal to Spindle Hollow."
end
function M.cross(world)
	if world.quest == 1 then
		return { quest = 2 }
	end
	return {}
end
function M.reward(world)
	if world.location ~= "spindle_hollow" or world.quest ~= 2 then
		return nil, "No reward available."
	end
	return { quest = 3, gold = math.min(2000000000, (world.gold or 0) + 32) }, "Oren rewards you with 32 gold."
end
return M
