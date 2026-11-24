-- Explicit semantic contract for debug-only Automation Bridge.
local M = {}
function M.attach(options)
	if type(automation_bridge) ~= "table" then
		return false, "Automation Bridge is unavailable in this engine variant"
	end
	assert(type(options) == "table" and type(options.state) == "function", "state callback required")
	M.options = options
	automation_bridge.command("rebirth.state", function()
		return options.state()
	end)
	if options.command then
		automation_bridge.command("rebirth.command", function(data)
			return options.command(data)
		end)
	end
	M.publish()
	return true
end
function M.publish()
	if M.options and type(automation_bridge) == "table" then
		automation_bridge.publish("rebirth.game", M.options.state())
	end
end
return M
