package.path = "./?.lua;./.tools/deps/event/?.lua;./.tools/deps/quest/?.lua;" .. package.path
-- Only the documented host context/clock of Event/Quest is stubbed. Their real Lua code runs.
sys = {
	get_config_string = function(_, default)
		return default
	end,
}
socket = {
	gettime = function()
		return 0
	end,
}
event_context_manager = {
	get = function()
		return nil
	end,
	set = function() end,
	log_error = function(e)
		error(e)
	end,
}
local lester = require("tests.vendor.lester")
require("tests.unit.domain")
require("tests.unit.inventory")
require("tests.unit.skills")
require("tests.unit.towns")
require("tests.unit.ui")
require("tests.unit.combat_log")
lester.report()
lester.exit()
