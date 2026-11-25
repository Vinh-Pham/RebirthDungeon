local M = {}
function M.room_checkpoint(world, checkpoint)
	local index = math.min(8, world.threshold_cleared or 0)
	if checkpoint
		and checkpoint.location == "threshold"
		and checkpoint.run == (world.threshold_run or 0)
		and type(checkpoint.room) == "number"
		and checkpoint.room % 1 == 0
		and checkpoint.room >= 0
		and checkpoint.room <= index
	then
		index = checkpoint.room
	end
	local valid = checkpoint and checkpoint.location == "threshold"
		and checkpoint.run == (world.threshold_run or 0) and checkpoint.room == index
	return index, valid and checkpoint or nil
end
function M.visit(world, location)
	world.visited = world.visited or {}
	for _, visited in ipairs(world.visited) do
		if visited == location then
			return
		end
	end
	world.visited[#world.visited + 1] = location
end
return M
