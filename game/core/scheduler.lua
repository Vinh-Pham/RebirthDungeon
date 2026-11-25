local M = {}

function M.take_step(queue, elapsed, dt)
	elapsed = elapsed + dt
	if elapsed >= 0.12 then
		return table.remove(queue, 1), 0
	end
	return nil, elapsed
end

return M
