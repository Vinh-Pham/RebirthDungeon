local M = {}
local modules = {
	decore = "decore.decore",
	rotlove = "game.vendor.rot",
	flow = "flow.flow",
	event = "event.event",
	monarch = "monarch.monarch",
	richtext = "richtext.richtext",
	ink = "ink.story",
	deftest = "deftest.deftest",
}
local loaders = {
	decore = function()
		return require("decore.decore")
	end,
	rotlove = function()
		return require("game.vendor.rot")
	end,
	flow = function()
		return require("game.integrations.flow")
	end,
	event = function()
		return require("event.event")
	end,
	monarch = function()
		return require("monarch.monarch")
	end,
	richtext = function()
		return require("richtext.richtext")
	end,
	ink = function()
		return require("ink.story")
	end,
	deftest = function()
		return require("deftest.deftest")
	end,
}
function M.available()
	return modules
end
function M.check()
	local results = {}
	for name, loader in pairs(loaders) do
		local ok, value = pcall(loader)
		results[name] = { available = ok, module = modules[name], error = not ok and tostring(value) or nil }
	end
	results.automation_bridge = { available = type(automation_bridge) == "table", kind = "debug native extension" }
	results.asefold = { available = true, kind = "Aseprite authoring tool" }
	results.das = { available = true, kind = "Defold editor scripts" }
	return results
end
function M.primary()
	return { ui = "flow", navigation = "monarch", models = "project", tests = "deftest" }
end
return M
