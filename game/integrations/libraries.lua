local M = {}
local modules = {
	tiny_ecs = "game.lib.tiny",
	jumper = "game.lib.jumper.pathfinder",
	luaunit = "game.lib.luaunit",
	state_machine = "game.lib.statemachine",
	rotlove = "game.lib.rot",
	flow = "flow.flow",
	event = "event.event",
	monarch = "monarch.monarch",
	orthographic = "orthographic.camera",
	richtext = "richtext.richtext",
	input = "in.mapper",
	gooey = "gooey.gooey",
	narrator = "narrator.narrator",
	ink = "ink.story",
	behavior_tree = "def_behavior_tree.behavior_tree",
	deftest = "deftest.deftest",
}
local loaders = {
	tiny_ecs = function()
		return require("game.lib.tiny")
	end,
	jumper = function()
		return require("game.lib.jumper.pathfinder")
	end,
	luaunit = function()
		return require("game.lib.luaunit")
	end,
	state_machine = function()
		return require("game.lib.statemachine")
	end,
	rotlove = function()
		return require("game.lib.rot")
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
	orthographic = function()
		return require("orthographic.camera")
	end,
	richtext = function()
		return require("richtext.richtext")
	end,
	input = function()
		return require("in.mapper")
	end,
	gooey = function()
		return require("gooey.gooey")
	end,
	narrator = function()
		return require("narrator.narrator")
	end,
	ink = function()
		return require("ink.story")
	end,
	behavior_tree = function()
		return require("def_behavior_tree.behavior_tree")
	end,
	deftest = function()
		return require("deftest.deftest")
	end,
}
-- Literal dependencies keep Bob's static resource scanner aware of dynamic upstream loaders.
local function bundle_algorithm_modules()
	require("game.lib.jumper.core.assert")
	require("game.lib.jumper.core.bheap")
	require("game.lib.jumper.core.heuristics")
	require("game.lib.jumper.core.node")
	require("game.lib.jumper.core.path")
	require("game.lib.jumper.core.utils")
	require("game.lib.jumper.grid")
	require("game.lib.jumper.pathfinder")
	require("game.lib.jumper.search.astar")
	require("game.lib.jumper.search.bfs")
	require("game.lib.jumper.search.dfs")
	require("game.lib.jumper.search.dijkstra")
	require("game.lib.jumper.search.jps")
	require("game.lib.jumper.search.thetastar")
	require("game.lib.rot.class")
	require("game.lib.rot.fov.precise")
	require("game.lib.rot.fov")
	require("game.lib.rot.map.arena")
	require("game.lib.rot.map")
	require("game.lib.rot.rng")
end
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
