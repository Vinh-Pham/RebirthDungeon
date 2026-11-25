local M = {}

function M.append(log, message)
	if log[#log] == message then
		return
	end
	log[#log + 1] = message
	if #log > 160 then
		table.remove(log, 1)
	end
end

return M
